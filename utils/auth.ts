import crypto from "crypto";
import { NextRequest } from "next/server";
import { ApiKeyRecord, validateApiKey } from "@/utils/patAuth";
import { findApiKeyByHash, getStoredApiKeysLegacy } from "@/utils/cloudStorage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export function hasTrustedMutationOrigin(req: NextRequest): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return true;
  return req.headers.get("origin") === req.nextUrl.origin;
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
  permission: "read" | "write"
): Promise<
  | { authorized: true; record: ApiKeyRecord; role: string }
  | { authorized: false; status: number; error: string }
> {
  const auth = await authenticateRequest(req, permission === "read" ? "read:tokens" : "write:tokens");
  if (!auth.isValid || !auth.record) {
    return { authorized: false, status: 401, error: auth.error || "Unauthorized" };
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
    const admin = createAdminClient();
    const [{ data: project }, { data: organization }] = await Promise.all([
      admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle(),
      admin.from("organizations").select("owner_uid").eq("id", orgId).maybeSingle(),
    ]);

    if (!project || !organization) {
      return { authorized: false, status: 404, error: "Project not found." };
    }

    let role = organization.owner_uid === auth.record.uid ? "owner" : "";
    if (!role) {
      const { data: membership } = await admin
        .from("organization_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", auth.record.uid)
        .maybeSingle();
      role = membership?.role || "";
    }

    if (!role) {
      return { authorized: false, status: 403, error: "You are not a member of this organization." };
    }
    if (permission === "write" && !["owner", "admin", "editor"].includes(role)) {
      return { authorized: false, status: 403, error: "Your organization role cannot modify this project." };
    }

    return { authorized: true, record: auth.record, role };
  } catch {
    return { authorized: false, status: 503, error: "Project authorization is unavailable." };
  }
}
