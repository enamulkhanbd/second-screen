import crypto from "crypto";
import { NextRequest } from "next/server";
import { ApiKeyRecord, validateApiKey } from "@/utils/patAuth";
import { findApiKeyByHash, getStoredApiKeysLegacy } from "@/utils/cloudStorage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cacheGetJson, cacheSetJson } from "@/lib/cache/redis";

export function canRoleWrite(role: string): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export function resolveTrustedRequestOrigins(req: NextRequest): string[] {
  const origins = new Set<string>([req.nextUrl.origin]);
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if ((forwardedProto === "http" || forwardedProto === "https") && req.nextUrl.host) {
    origins.add(`${forwardedProto}://${req.nextUrl.host}`);
  }
  const configured = (process.env.SECOND_SCREEN_TRUSTED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of configured) {
    origins.add(origin);
  }
  return Array.from(origins);
}

export function hasTrustedMutationOrigin(req: NextRequest): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return resolveTrustedRequestOrigins(req).includes(origin);
}

export async function resolveOrganizationRole(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  ownerUid: string,
  userId: string,
  options?: { userEmail?: string; emailVerified?: boolean }
): Promise<string> {
  if (ownerUid === userId) return "owner";

  const { data: userRows, error: userErr } = await admin
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .limit(1);

  if (!userErr && Array.isArray(userRows) && userRows[0]?.role) {
    return userRows[0].role;
  }

  const normalizedEmail = options?.userEmail?.trim().toLowerCase();
  if (normalizedEmail && options?.emailVerified !== false) {
    const { data: emailRows, error: emailErr } = await admin
      .from("organization_members")
      .select("role, user_id")
      .eq("org_id", orgId)
      .ilike("email", normalizedEmail)
      .limit(1);

    const matched = !emailErr && Array.isArray(emailRows) ? emailRows[0] : null;
    if (matched?.role) {
      if (matched.user_id !== userId) {
        try {
          await admin
            .from("organization_members")
            .update({ user_id: userId })
            .eq("org_id", orgId)
            .ilike("email", normalizedEmail);
        } catch {
          // Best-effort backfill; unique constraints or partial mocks must not fail authorization.
        }
      }
      return matched.role;
    }
  }

  return "";
}

/**
 * Authenticate either a bearer PAT or the current Supabase cookie session.
 */
export async function authenticateRequest(
  req: NextRequest,
  requiredScope?: "read:tokens" | "write:tokens" | "manage:releases"
): Promise<ReturnType<typeof validateApiKey>> {
  const authorization = req.headers.get("authorization");
  if (authorization?.match(/^Bearer\s+/i)) {
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token || !token.startsWith("sec_pat_")) {
      return validateApiKey(token, [], requiredScope);
    }

    let candidateRecords: ApiKeyRecord[] = [];
    if (process.env.API_KEY_LOOKUP === "legacy") {
      candidateRecords = await getStoredApiKeysLegacy();
    } else {
      const hash = crypto.createHash("sha256").update(token).digest("hex");
      const matched = await findApiKeyByHash(hash);
      if (matched) candidateRecords = [matched];
    }

    const result = validateApiKey(token, candidateRecords, requiredScope);
    if (result.isValid && !result.record?.uid) {
      return { isValid: false, error: "This API key must be reissued with an authenticated owner." };
    }
    return result;
  }

  if (!hasTrustedMutationOrigin(req)) {
    return { isValid: false, error: "Cross-origin session request rejected." };
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      const record: ApiKeyRecord = {
        id: `session-${user.id}`,
        name: user.email || "Signed-in user",
        keyPrefix: "session",
        keyHash: "",
        scopes: ["read:tokens", "write:tokens", "manage:releases"],
        uid: user.id,
        userEmail: user.email,
        emailVerified: user.email_confirmed_at !== null,
        createdAt: new Date().toISOString(),
      };
      return {
        isValid: true,
        record,
      };
    }
  } catch {
    // Continue to the standard unauthorized response below.
  }

  return {
    isValid: false,
    error: "Unauthorized. Sign in or provide a valid Bearer Personal Access Token.",
  };
}

export async function authorizeProjectRequest(
  req: NextRequest,
  orgId: string,
  projectId: string,
  permission: "read" | "write",
  preAuthRecord?: ApiKeyRecord
): Promise<
  | { authorized: true; record: ApiKeyRecord; role: string }
  | { authorized: false; status: number; error: string }
> {
  const auth = preAuthRecord
    ? { isValid: true, record: preAuthRecord, error: undefined }
    : await authenticateRequest(req, permission === "read" ? "read:tokens" : "write:tokens");
  if (!auth.isValid || !auth.record) {
    return { authorized: false, status: 401, error: auth.error || "Unauthorized" };
  }

  if (
    auth.record.credentialType === "mcp_project" &&
    (!auth.record.orgId || !auth.record.projectId)
  ) {
    return { authorized: false, status: 403, error: "This MCP credential has no immutable project binding." };
  }

  if (
    (auth.record.orgId && auth.record.orgId !== orgId) ||
    (auth.record.projectId && auth.record.projectId !== projectId)
  ) {
    return { authorized: false, status: 403, error: "This credential is not authorized for the requested project." };
  }

  if (!auth.record.uid) {
    return { authorized: false, status: 403, error: "This credential is not bound to a verified user." };
  }

  try {
    const roleCacheKey = `auth:proj_role:${orgId}:${projectId}:${auth.record.uid}`;
    const cachedAuthz = await cacheGetJson<{ role: string }>(roleCacheKey);
    if (cachedAuthz && cachedAuthz.role) {
      if (permission === "write" && !canRoleWrite(cachedAuthz.role)) {
        return { authorized: false, status: 403, error: "Your organization role cannot modify this project." };
      }
      return { authorized: true, record: auth.record, role: cachedAuthz.role };
    }

    const admin = createAdminClient();
    const [{ data: project }, { data: organization }] = await Promise.all([
      admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle(),
      admin.from("organizations").select("owner_uid").eq("id", orgId).maybeSingle(),
    ]);

    if (!project || !organization) {
      return { authorized: false, status: 404, error: "Project not found." };
    }

    const role = await resolveOrganizationRole(
      admin,
      orgId,
      organization.owner_uid,
      auth.record.uid,
      {
        userEmail: auth.record.userEmail,
        emailVerified: auth.record.emailVerified ?? true,
      }
    );

    if (!role) {
      return { authorized: false, status: 403, error: "You are not a member of this organization." };
    }
    await cacheSetJson(roleCacheKey, { role }, 60);
    if (permission === "write" && !canRoleWrite(role)) {
      return { authorized: false, status: 403, error: "Your organization role cannot modify this project." };
    }

    return { authorized: true, record: auth.record, role };
  } catch {
    return { authorized: false, status: 503, error: "Project authorization is unavailable." };
  }
}
