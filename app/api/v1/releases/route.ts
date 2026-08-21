import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/utils/patAuth";
import { getStoredApiKeys, getStoredTokens } from "@/utils/cloudStorage";
import { flattenAndResolveTokens } from "@/utils/transformTokens";
import { compileCssVariables, compileStyleDictionary } from "@/utils/releaseCompiler";
import { extractThemeGroups } from "@/utils/themeHelpers";
import { SAMPLE_TOKENS_DATA } from "@/data/sampleTokens";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/releases
 * Fetch compiled release packages and assets (requires Bearer token with read:tokens scope)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const storedKeys = getStoredApiKeys();
    const auth = validateApiKey(token, storedKeys, "read:tokens");

    if (!auth.isValid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const storedDoc = getStoredTokens() || SAMPLE_TOKENS_DATA;
    const resolved = flattenAndResolveTokens(storedDoc, "ALL");
    const themeGroups = extractThemeGroups(storedDoc);

    const cssVars = compileCssVariables(resolved, themeGroups);
    const styleDict = compileStyleDictionary(resolved, themeGroups);

    return NextResponse.json({
      success: true,
      authenticatedAs: auth.record?.name,
      latestRelease: {
        version: "v1.0.0",
        tokenCount: resolved.length,
        themesCount: themeGroups.reduce((acc, g) => acc + g.options.length, 0),
        cssVariables: cssVars,
        styleDictionary: styleDict,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
