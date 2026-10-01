import { NextRequest } from "next/server";
import { authenticateRequest, authorizeProjectRequest } from "@/utils/auth";
import { flattenAndResolveTokens } from "@/utils/transformTokens";
import { compileCssVariables, compileStyleDictionary } from "@/utils/releaseCompiler";
import { extractThemeGroups } from "@/utils/themeHelpers";
import { getOrgProjects } from "@/services/organizationService";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptionsCors();
}

/**
 * GET /api/v1/releases
 * Dynamically compiles release packages and assets for a project.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, "read:tokens");

    if (!auth.isValid) {
      return jsonWithCors({ success: false, error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || auth.record?.orgId;
    const projectId = searchParams.get("projectId") || auth.record?.projectId;
    if (!orgId || !projectId) {
      return jsonWithCors({ success: false, error: "Both orgId and projectId are required." }, { status: 400 });
    }
    const access = await authorizeProjectRequest(req, orgId, projectId, "read");
    if (!access.authorized) {
      return jsonWithCors({ success: false, error: access.error }, { status: access.status });
    }

    let targetDoc: Record<string, any> = { global: {} };

    if (orgId && projectId) {
      try {
        const projects = await getOrgProjects(orgId);
        const proj = projects.find((p) => p.id === projectId);
        if (proj && proj.rawTokens) {
          targetDoc = proj.rawTokens;
        }
      } catch (err) {
        console.warn("Error fetching release tokens:", err);
      }
    }

    const resolved = flattenAndResolveTokens(targetDoc, "ALL");
    const themeGroups = extractThemeGroups(targetDoc);

    const cssVars = compileCssVariables(resolved, themeGroups);
    const styleDict = compileStyleDictionary(resolved, themeGroups);

    return jsonWithCors({
      success: true,
      authenticatedAs: auth.record?.name,
      orgId,
      projectId,
      latestRelease: {
        version: "v1.0.0",
        tokenCount: resolved.length,
        themesCount: themeGroups.reduce((acc, g) => acc + g.options.length, 0),
        cssVariables: cssVars,
        styleDictionary: styleDict,
      },
    });
  } catch (err: any) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}
