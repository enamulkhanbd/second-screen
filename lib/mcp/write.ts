import crypto from "crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import type { ApiKeyRecord } from "@/utils/patAuth";
import type { RawTokensDocument } from "@/types/tokens";
import { extractThemeGroups } from "@/utils/themeHelpers";
import { computeTokensDiff } from "@/utils/tokenDiff";
import { createAdminClient } from "@/lib/supabase/admin";
import { McpError } from "./errors";
import { resolveMcpProject } from "./context";

const MAX_PATCH_BYTES = 65_536;
const MAX_CHANGED_TOKENS = 500;
const CONFIRMATION_TTL_MS = 10 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export const TokenWritePreviewInput = z.object({
  orgId: z.string().optional(),
  projectId: z.string().optional(),
  branchName: z.string().min(1).max(120),
  proposedTokens: z.record(z.unknown()),
});

export const TokenWriteApplyInput = TokenWritePreviewInput.extend({
  baseRevision: z.number().int().nonnegative(),
  confirmationToken: z.string().min(32).max(256),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9._:-]{16,120}$/),
});

export type TokenWritePreview = z.infer<typeof TokenWritePreviewInput>;
export type TokenWriteApply = z.infer<typeof TokenWriteApplyInput>;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function tokenDigest(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function assertWriteEnabled(record: ApiKeyRecord, requestId: string) {
  if (!record.uid) {
    throw new McpError("FORBIDDEN", "This credential is not bound to a verified user.", requestId, 403);
  }
  const canary = new Set((process.env.MCP_WRITE_CANARY_CREDENTIAL_IDS || "").split(",").map((value) => value.trim()).filter(Boolean));
  if (process.env.MCP_WRITE_ENABLED !== "true" || !canary.has(record.id)) {
    throw new McpError("WRITE_DISABLED", "MCP write capabilities are not enabled for this credential.", requestId, 501);
  }
}

function requireWriteBranch(project: Awaited<ReturnType<typeof resolveMcpProject>>, branchName: string, requestId: string) {
  const branch = project.project.branches.find((candidate: any) => candidate?.name === branchName);
  if (!branch) throw new McpError("PROJECT_NOT_FOUND", "Branch not found.", requestId, 404);
  if (branch.isDefault === true || branchName === "main") {
    throw new McpError("FORBIDDEN", "The default branch is protected from MCP writes.", requestId, 403);
  }
  return branch;
}

function parseRpcError(message: string, requestId: string): never {
  const map: Record<string, { code: any; status: number; message: string }> = {
    PROJECT_NOT_FOUND: { code: "PROJECT_NOT_FOUND", status: 404, message: "Project not found." },
    BRANCH_NOT_FOUND: { code: "PROJECT_NOT_FOUND", status: 404, message: "Branch not found." },
    PROTECTED_BRANCH: { code: "FORBIDDEN", status: 403, message: "The default branch is protected from MCP writes." },
    STALE_REVISION: { code: "CONFLICT", status: 409, message: "The branch changed after preview; create a new preview." },
    INVALID_CONFIRMATION: { code: "CONFIRMATION_INVALID", status: 403, message: "The confirmation is invalid, expired, or already used." },
  };
  const matched = map[message];
  if (matched) throw new McpError(matched.code, matched.message, requestId, matched.status);
  throw new McpError("UPSTREAM_UNAVAILABLE", "The write transaction could not be completed.", requestId, 503);
}

export async function previewTokenWrite(
  req: NextRequest,
  record: ApiKeyRecord,
  input: TokenWritePreview,
  requestId: string,
) {
  assertWriteEnabled(record, requestId);
  const parsed = TokenWritePreviewInput.parse(input);
  const project = await resolveMcpProject(req, record, parsed.orgId, parsed.projectId, requestId, "write");
  const branch = requireWriteBranch(project, parsed.branchName, requestId);
  const currentTokens = (branch.rawTokens || {}) as RawTokensDocument;
  const proposedTokens = parsed.proposedTokens as RawTokensDocument;
  const serialized = stableJson(proposedTokens);
  if (Buffer.byteLength(serialized, "utf8") > MAX_PATCH_BYTES) {
    throw new McpError("LIMIT_EXCEEDED", "The proposed token document is too large.", requestId, 413);
  }

  const diff = computeTokensDiff(currentTokens, proposedTokens);
  const changedCount = diff.totalAdded + diff.totalModified + diff.totalDeleted;
  if (changedCount > MAX_CHANGED_TOKENS) {
    throw new McpError("LIMIT_EXCEEDED", "The proposed token change exceeds the allowed token count.", requestId, 413);
  }

  const admin = createAdminClient();
  const { data: revisionRow, error: revisionError } = await admin
    .from("mcp_write_branch_revisions")
    .select("revision")
    .eq("project_id", project.auth.projectId)
    .eq("branch_name", parsed.branchName)
    .maybeSingle();
  if (revisionError) throw new McpError("UPSTREAM_UNAVAILABLE", "Write revision data is temporarily unavailable.", requestId, 503);
  const baseRevision = Number(revisionRow?.revision || 0);
  const patchDigest = digest({ branchName: parsed.branchName, baseRevision, proposedTokens });
  const confirmationToken = crypto.randomBytes(32).toString("base64url");
  const confirmationId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();
  const { error: confirmationError } = await admin.from("mcp_write_confirmations").insert({
    id: confirmationId,
    credential_id: record.id,
    org_id: project.auth.orgId,
    project_id: project.auth.projectId,
    branch_name: parsed.branchName,
    base_revision: baseRevision,
    patch_digest: patchDigest,
    token_digest: tokenDigest(confirmationToken),
    expires_at: expiresAt,
  });
  if (confirmationError) throw new McpError("UPSTREAM_UNAVAILABLE", "Could not create a write confirmation.", requestId, 503);

  const { error: auditError } = await admin.from("mcp_write_audit_events").insert({
    id: crypto.randomUUID(),
    event_type: "preview_created",
    credential_id: record.id,
    actor_uid: record.uid,
    org_id: project.auth.orgId,
    project_id: project.auth.projectId,
    branch_name: parsed.branchName,
    base_revision: baseRevision,
    patch_digest: patchDigest,
    changed_count: changedCount,
    result_status: "preview_created",
  });
  if (auditError) throw new McpError("UPSTREAM_UNAVAILABLE", "Could not record the write preview.", requestId, 503);

  return {
    branchName: parsed.branchName,
    baseRevision,
    expiresAt,
    confirmationToken,
    patchDigest,
    changedCount,
    diff: {
      added: diff.totalAdded,
      modified: diff.totalModified,
      deleted: diff.totalDeleted,
    },
    warnings: [],
  };
}

export async function applyTokenWrite(
  req: NextRequest,
  record: ApiKeyRecord,
  input: TokenWriteApply,
  requestId: string,
) {
  assertWriteEnabled(record, requestId);
  const parsed = TokenWriteApplyInput.parse(input);
  const project = await resolveMcpProject(req, record, parsed.orgId, parsed.projectId, requestId, "write");
  requireWriteBranch(project, parsed.branchName, requestId);
  const proposedTokens = parsed.proposedTokens as RawTokensDocument;
  if (Buffer.byteLength(stableJson(proposedTokens), "utf8") > MAX_PATCH_BYTES) {
    throw new McpError("LIMIT_EXCEEDED", "The proposed token document is too large.", requestId, 413);
  }
  const patchDigest = digest({ branchName: parsed.branchName, baseRevision: parsed.baseRevision, proposedTokens });
  const requestDigest = digest({
    projectId: project.auth.projectId,
    branchName: parsed.branchName,
    baseRevision: parsed.baseRevision,
    proposedTokens,
    confirmationTokenDigest: tokenDigest(parsed.confirmationToken),
  });
  const idempotencyKeyDigest = digest(parsed.idempotencyKey);
  const auditId = crypto.randomUUID();
  const admin = createAdminClient();
  const branch = requireWriteBranch(project, parsed.branchName, requestId);
  const diff = computeTokensDiff((branch.rawTokens || {}) as RawTokensDocument, proposedTokens);
  const changedCount = diff.totalAdded + diff.totalModified + diff.totalDeleted;
  if (changedCount > MAX_CHANGED_TOKENS) {
    throw new McpError("LIMIT_EXCEEDED", "The proposed token change exceeds the allowed token count.", requestId, 413);
  }
  const { data: confirmation, error: confirmationLookupError } = await admin
    .from("mcp_write_confirmations")
    .select("id")
    .eq("token_digest", tokenDigest(parsed.confirmationToken))
    .maybeSingle();
  if (confirmationLookupError) throw new McpError("UPSTREAM_UNAVAILABLE", "Write confirmation data is temporarily unavailable.", requestId, 503);
  if (!confirmation) throw new McpError("CONFIRMATION_INVALID", "The confirmation is invalid, expired, or already used.", requestId, 403);
  const { data, error } = await admin.rpc("mcp_apply_token_write", {
    p_audit_id: auditId,
    p_credential_id: record.id,
    p_actor_uid: record.uid,
    p_org_id: project.auth.orgId,
    p_project_id: project.auth.projectId,
    p_branch_name: parsed.branchName,
    p_base_revision: parsed.baseRevision,
    p_confirmation_id: confirmation.id,
    p_patch_digest: patchDigest,
    p_idempotency_key_digest: idempotencyKeyDigest,
    p_request_digest: requestDigest,
    p_next_tokens: proposedTokens,
    p_next_theme_groups: extractThemeGroups(proposedTokens),
    p_changed_count: changedCount,
    p_idempotency_expires_at: new Date(Date.now() + IDEMPOTENCY_TTL_MS).toISOString(),
    p_confirmation_expires_at: new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString(),
  });
  if (error) parseRpcError(error.message, requestId);
  return data;
}
