import crypto from "crypto";

export type ApiKeyCredentialType = "personal" | "mcp_project";

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string; // e.g. "sec_pat_live_ab12...3f8a"
  keyHash: string; // SHA-256 hash
  scopes: Array<"read:tokens" | "write:tokens" | "manage:releases">;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string; // ISO string or null for never
  uid?: string;
  userEmail?: string;
  orgId?: string;
  projectId?: string;
  orgName?: string;
  projectName?: string;
  credentialType?: ApiKeyCredentialType;
}

/**
 * Generates a secure random Personal Access Token
 */
export function generateApiKey(
  name: string,
  scopes: Array<"read:tokens" | "write:tokens" | "manage:releases"> = ["read:tokens", "write:tokens"],
  expiresInDays?: number,
  metadata?: {
    uid?: string;
    userEmail?: string;
    orgId?: string;
    projectId?: string;
    orgName?: string;
    projectName?: string;
    credentialType?: ApiKeyCredentialType;
  }
): { plaintextKey: string; record: ApiKeyRecord } {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const plaintextKey = `sec_pat_live_${randomBytes}`;
  const keyHash = crypto.createHash("sha256").update(plaintextKey).digest("hex");
  const keyPrefix = `${plaintextKey.slice(0, 16)}...${plaintextKey.slice(-4)}`;

  const now = new Date();
  let expiresAt: string | undefined = undefined;
  if (expiresInDays && expiresInDays > 0) {
    const exp = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
    expiresAt = exp.toISOString();
  }

  const record: ApiKeyRecord = {
    id: `pat-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    name: name.trim() || "Default Figma Plugin Key",
    keyPrefix,
    keyHash,
    scopes,
    createdAt: now.toISOString(),
    expiresAt,
    ...(metadata || {}),
    credentialType: metadata?.credentialType || "personal",
  };

  return { plaintextKey, record };
}

/**
 * Validates a Bearer token against stored key records
 */
export function validateApiKey(
  providedKey: string,
  storedRecords: ApiKeyRecord[],
  requiredScope?: "read:tokens" | "write:tokens" | "manage:releases"
): { isValid: boolean; record?: ApiKeyRecord; error?: string } {
  if (!providedKey || !providedKey.startsWith("sec_pat_")) {
    return { isValid: false, error: "Invalid token format. Must start with 'sec_pat_'" };
  }

  const providedHash = crypto.createHash("sha256").update(providedKey).digest("hex");
  const matched = storedRecords.find((r) => r.keyHash === providedHash);

  if (!matched) {
    return { isValid: false, error: "Unauthorized: Invalid or revoked API key" };
  }

  if (matched.expiresAt && new Date(matched.expiresAt).getTime() < Date.now()) {
    return { isValid: false, error: "Unauthorized: API key has expired" };
  }

  if (requiredScope && !matched.scopes.includes(requiredScope)) {
    return { isValid: false, error: `Forbidden: Key lacks '${requiredScope}' permission` };
  }

  return { isValid: true, record: matched };
}
