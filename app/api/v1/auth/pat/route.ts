import { NextRequest } from "next/server";
import { generateApiKey } from "@/utils/patAuth";
import { listApiKeysForUser, saveApiKey, deleteApiKey } from "@/utils/cloudStorage";
import { jsonWithTrustedCors, handleTrustedOptionsCors } from "@/utils/cors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasTrustedMutationOrigin } from "@/utils/auth";
import type { ApiKeyCredentialType } from "@/utils/patAuth";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return handleTrustedOptionsCors(req);
}

async function getAuthenticatedUser(req: NextRequest) {
  if (!hasTrustedMutationOrigin(req)) return null;
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
}

async function verifyProjectBinding(userId: string, orgId: string, projectId: string) {
  const admin = createAdminClient();
  const [{ data: project, error: projectError }, { data: organization, error: orgError }] = await Promise.all([
    admin.from("projects").select("id, org_id, name").eq("id", projectId).eq("org_id", orgId).maybeSingle(),
    admin.from("organizations").select("id, name, owner_uid").eq("id", orgId).maybeSingle(),
  ]);

  if (projectError || orgError || !project || !organization) {
    return { ok: false as const, status: 404, error: "Workspace or project not found." };
  }

  if (organization.owner_uid !== userId) {
    const { data: membership, error: membershipError } = await admin
      .from("organization_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError || !membership) {
      return { ok: false as const, status: 403, error: "You are not a member of this workspace." };
    }
  }

  return { ok: true as const, orgName: organization.name, projectName: project.name };
}

/**
 * GET /api/v1/auth/pat
 * List all active API keys for the signed-in user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonWithTrustedCors(req, { success: false, error: "Unauthorized" }, { status: 401 });

    const keys = await listApiKeysForUser(user.id);
    return jsonWithTrustedCors(req, {
      success: true,
      keys: keys.map(({ keyHash, ...safe }) => safe),
    });
  } catch {
    return jsonWithTrustedCors(req, { success: false, error: "Could not load API keys." }, { status: 500 });
  }
}

/**
 * POST /api/v1/auth/pat
 * Dynamically generate and save a new Personal Access Token (PAT).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonWithTrustedCors(req, { success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { name, scopes, expiresInDays, credentialType = "personal", orgId, projectId } = body;
    if (credentialType !== "personal" && credentialType !== "mcp_project") {
      return jsonWithTrustedCors(req, { success: false, error: "Unsupported credential type." }, { status: 400 });
    }
    const safeCredentialType: ApiKeyCredentialType = credentialType;
    let binding: { orgName: string; projectName: string } | undefined;

    if (safeCredentialType === "mcp_project") {
      if (typeof orgId !== "string" || typeof projectId !== "string" || !orgId || !projectId) {
        return jsonWithTrustedCors(
          req,
          { success: false, error: "MCP credentials require a workspace and project binding." },
          { status: 400 },
        );
      }
      const verified = await verifyProjectBinding(user.id, orgId, projectId);
      if (!verified.ok) {
        return jsonWithTrustedCors(req, { success: false, error: verified.error }, { status: verified.status });
      }
      binding = { orgName: verified.orgName, projectName: verified.projectName };
    }

    const allowedScopes = ["read:tokens", "write:tokens"] as const;
    const safeScopes: (typeof allowedScopes)[number][] = Array.isArray(scopes)
      ? scopes.filter((scope): scope is (typeof allowedScopes)[number] => allowedScopes.includes(scope))
      : safeCredentialType === "mcp_project" ? ["read:tokens"] : ["read:tokens", "write:tokens"];
    if (safeScopes.length === 0) {
      return jsonWithTrustedCors(req, { success: false, error: "At least one valid permission scope is required." }, { status: 400 });
    }

    const normalizedScopes = safeCredentialType === "mcp_project"
      ? safeScopes.filter((scope) => scope === "read:tokens")
      : safeScopes;
    if (normalizedScopes.length === 0) {
      return jsonWithTrustedCors(req, { success: false, error: "MCP credentials are read-only until the write release is enabled." }, { status: 400 });
    }

    const { plaintextKey, record } = generateApiKey(
      name || "Figma Plugin Key",
      normalizedScopes,
      expiresInDays ? Number.parseInt(String(expiresInDays), 10) : undefined,
      {
        uid: user.id,
        userEmail: user.email || undefined,
        credentialType: safeCredentialType,
        ...(safeCredentialType === "mcp_project" ? { orgId, projectId, ...binding } : {}),
      },
    );

    await saveApiKey(record);

    return jsonWithTrustedCors(req, {
      success: true,
      message: "Personal Access Token generated successfully. Store it safely; it will not be shown again.",
      token: plaintextKey,
      record: {
        id: record.id,
        name: record.name,
        keyPrefix: record.keyPrefix,
        scopes: record.scopes,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        credentialType: record.credentialType,
        orgId: record.orgId,
        projectId: record.projectId,
        orgName: record.orgName,
        projectName: record.projectName,
      },
    });
  } catch {
    return jsonWithTrustedCors(req, { success: false, error: "Could not create the API key." }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/auth/pat?id=...
 * Revoke an API key.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonWithTrustedCors(req, { success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonWithTrustedCors(req, { success: false, error: "Missing key ID" }, { status: 400 });
    }

    const deleted = await deleteApiKey(id, user.id);
    if (!deleted) {
      return jsonWithTrustedCors(req, { success: false, error: "API key not found." }, { status: 404 });
    }

    return jsonWithTrustedCors(req, {
      success: true,
      message: `API key ${id} revoked successfully.`,
    });
  } catch {
    return jsonWithTrustedCors(
      req,
      { success: false, error: "Could not revoke the API key. Please try again." },
      { status: 500 },
    );
  }
}
