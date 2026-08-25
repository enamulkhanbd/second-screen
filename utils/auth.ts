import { NextRequest } from "next/server";
import { validateApiKey } from "@/utils/patAuth";
import { getStoredApiKeys } from "@/utils/cloudStorage";

/**
 * Helper to authenticate request dynamically using Authorization: Bearer sec_pat_...
 * Also allows internal web app requests with x-internal-client: tokens-platform header.
 */
export async function authenticateRequest(
  req: NextRequest,
  requiredScope?: "read:tokens" | "write:tokens"
) {
  // Allow internal web app client requests from Tokens Platform UI
  const isInternal = req.headers.get("x-internal-client") === "tokens-platform";
  if (isInternal) {
    return {
      isValid: true,
      record: {
        id: "internal-client",
        name: "Tokens Platform Web App",
        keyPrefix: "internal-web-client",
        keyHash: "internal",
        scopes: ["read:tokens" as const, "write:tokens" as const, "manage:releases" as const],
        createdAt: new Date().toISOString(),
      },
    };
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  const storedKeys = await getStoredApiKeys();
  return validateApiKey(token, storedKeys, requiredScope);
}
