import { NextRequest } from "next/server";
import { validateApiKey } from "@/utils/patAuth";
import { getStoredApiKeys } from "@/utils/cloudStorage";

/**
 * Helper to authenticate request dynamically using Authorization: Bearer sec_pat_...
 */
export async function authenticateRequest(
  req: NextRequest,
  requiredScope?: "read:tokens" | "write:tokens"
) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  const storedKeys = await getStoredApiKeys();
  return validateApiKey(token, storedKeys, requiredScope);
}
