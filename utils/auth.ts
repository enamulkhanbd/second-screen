import { NextRequest } from "next/server";
import { validateApiKey } from "@/utils/patAuth";
import { getStoredApiKeys } from "@/utils/cloudStorage";

/**
 * Helper to authenticate request using Authorization: Bearer sec_pat_...
 */
export function authenticateRequest(
  req: NextRequest,
  requiredScope?: "read:tokens" | "write:tokens"
) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  const storedKeys = getStoredApiKeys();
  return validateApiKey(token, storedKeys, requiredScope);
}
