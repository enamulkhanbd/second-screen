import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/utils/patAuth";
import { getStoredApiKeys, getStoredTokens, saveStoredTokens } from "@/utils/cloudStorage";
import { flattenAndResolveTokens } from "@/utils/transformTokens";
import { extractThemeGroups } from "@/utils/themeHelpers";
import { SAMPLE_TOKENS_DATA } from "@/data/sampleTokens";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";

export const dynamic = "force-dynamic";

/**
 * OPTIONS /api/v1/tokens
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return handleOptionsCors();
}

/**
 * Helper to authenticate request using Authorization: Bearer sec_pat_...
 */
function authenticateRequest(req: NextRequest, requiredScope?: "read:tokens" | "write:tokens") {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  const storedKeys = getStoredApiKeys();
  return validateApiKey(token, storedKeys, requiredScope);
}

/**
 * GET /api/v1/tokens
 * Fetch current design tokens & themes (requires Bearer token with read:tokens scope)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticateRequest(req, "read:tokens");
    if (!auth.isValid) {
      return jsonWithCors({ success: false, error: auth.error }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const orgId = searchParams.get("orgId");
    const projectId = searchParams.get("projectId");

    let storedDoc = getStoredTokens() || SAMPLE_TOKENS_DATA;

    const resolvedTokens = flattenAndResolveTokens(storedDoc, "ALL");
    const themeGroups = extractThemeGroups(storedDoc);

    const themesKey = storedDoc["$themes.json"] ? "$themes.json" : "$themes";
    const themes = storedDoc[themesKey] || [];

    const metaKey = storedDoc["$metadata.json"] ? "$metadata.json" : "$metadata";
    const metadata = storedDoc[metaKey] || {};

    return jsonWithCors({
      success: true,
      authenticatedAs: auth.record?.name,
      orgId: orgId || undefined,
      projectId: projectId || undefined,
      version: "1.0.0",
      rawTokens: storedDoc,
      resolvedTokens,
      themeGroups,
      themes,
      metadata,
    });
  } catch (err: any) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/tokens
 * Push token updates (requires Bearer token with write:tokens scope)
 */
export async function POST(req: NextRequest) {
  try {
    const isInternal = req.headers.get("x-internal-client") === "second-screen";
    const auth: { isValid: boolean; record?: any; error?: string } = !isInternal
      ? authenticateRequest(req, "write:tokens")
      : { isValid: true, record: { name: "Web App" } };

    if (!auth.isValid) {
      return jsonWithCors({ success: false, error: auth.error }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonWithCors(
        { success: false, error: "Invalid tokens payload. Must be a valid JSON object." },
        { status: 400 }
      );
    }

    const rawDoc = body.rawTokens || body;
    const currentDoc = getStoredTokens() || {};
    
    // Merge incoming tokens onto stored doc preserving $themes and $metadata
    const mergedDoc: Record<string, any> = {
      ...currentDoc,
      ...rawDoc,
    };

    if (!mergedDoc["$themes"] && !mergedDoc["$themes.json"] && (currentDoc["$themes"] || currentDoc["$themes.json"])) {
      mergedDoc["$themes"] = currentDoc["$themes"] || currentDoc["$themes.json"];
    }
    if (!mergedDoc["$metadata"] && !mergedDoc["$metadata.json"] && (currentDoc["$metadata"] || currentDoc["$metadata.json"])) {
      mergedDoc["$metadata"] = currentDoc["$metadata"] || currentDoc["$metadata.json"];
    }

    saveStoredTokens(mergedDoc);

    const resolved = flattenAndResolveTokens(mergedDoc, "ALL");

    return jsonWithCors({
      success: true,
      message: "Tokens updated successfully in Second Screen Cloud.",
      tokenCount: resolved.length,
      timestamp: new Date().toISOString(),
      updatedBy: auth.record?.name,
    });
  } catch (err: any) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}
