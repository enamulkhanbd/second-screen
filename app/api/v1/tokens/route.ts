import { NextRequest } from "next/server";
import { authenticateRequest } from "@/utils/auth";
import { flattenAndResolveTokens } from "@/utils/transformTokens";
import { extractThemeGroups } from "@/utils/themeHelpers";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { getOrgProjects, saveProjectTokens, saveProjectFigmaVariables } from "@/services/organizationService";

export const dynamic = "force-dynamic";

/**
 * OPTIONS /api/v1/tokens
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return handleOptionsCors();
}

/**
 * GET /api/v1/tokens
 * Fetch design tokens & themes dynamically from Firestore
 */
export async function GET(req: NextRequest) {
  try {
    const clientHeader = req.headers.get("x-internal-client");
    const secFetchSite = req.headers.get("sec-fetch-site");
    const isInternal =
      clientHeader === "tokens-platform" ||
      clientHeader === "second-screen" ||
      secFetchSite === "same-origin";

    const auth: { isValid: boolean; record?: any; error?: string } = !isInternal
      ? await authenticateRequest(req, "read:tokens")
      : { isValid: true, record: { name: "Tokens Platform Web App" } };

    if (!auth.isValid) {
      return jsonWithCors({ success: false, error: auth.error }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const orgId = searchParams.get("orgId") || auth.record?.orgId;
    const projectId = searchParams.get("projectId") || auth.record?.projectId;

    let targetDoc: Record<string, any> = {};
    let figmaVariables: Record<string, any> = {};
    let figmaUpdatedAt: string | null = null;

    // Fetch directly from the target project in Firestore
    if (orgId && projectId) {
      try {
        const projects = await getOrgProjects(orgId);
        const proj = projects.find((p) => p.id === projectId);
        if (proj) {
          if (proj.rawTokens && Object.keys(proj.rawTokens).length > 0) {
            targetDoc = proj.rawTokens;
          }
          if (proj.figmaVariables) {
            figmaVariables = proj.figmaVariables;
            figmaUpdatedAt = proj.figmaUpdatedAt || null;
          }
        }
      } catch (err) {
        console.warn("Error fetching project tokens:", err);
      }
    }

    const resolvedTokens = flattenAndResolveTokens(targetDoc, "ALL");
    const themeGroups = extractThemeGroups(targetDoc);

    const themesKey = targetDoc["$themes.json"] ? "$themes.json" : "$themes";
    const themes = targetDoc[themesKey] || [];

    const metaKey = targetDoc["$metadata.json"] ? "$metadata.json" : "$metadata";
    const metadata = targetDoc[metaKey] || {};

    return jsonWithCors({
      success: true,
      authenticatedAs: auth.record?.name,
      orgId: orgId || undefined,
      projectId: projectId || undefined,
      version: "1.0.0",
      rawTokens: targetDoc,
      figmaVariables,
      figmaUpdatedAt,
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
 * Push token updates directly to Firestore dynamically
 */
export async function POST(req: NextRequest) {
  try {
    const clientHeader = req.headers.get("x-internal-client");
    const secFetchSite = req.headers.get("sec-fetch-site");
    const isInternal =
      clientHeader === "tokens-platform" ||
      clientHeader === "second-screen" ||
      secFetchSite === "same-origin";

    const auth: { isValid: boolean; record?: any; error?: string } = !isInternal
      ? await authenticateRequest(req, "write:tokens")
      : { isValid: true, record: { name: "Tokens Platform Web App" } };

    if (!auth.isValid) {
      return jsonWithCors({ success: false, error: auth.error }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const orgId = searchParams.get("orgId") || auth.record?.orgId;
    const projectId = searchParams.get("projectId") || auth.record?.projectId;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonWithCors(
        { success: false, error: "Invalid tokens payload. Must be a valid JSON object." },
        { status: 400 }
      );
    }

    const rawDoc = body.rawTokens || body;
    const isFromFigma =
      body.source === "figma_plugin" ||
      Boolean(body.isFigmaPlugin) ||
      (auth.record?.name && auth.record.name.toLowerCase().includes("figma"));

    let currentDoc: Record<string, any> = {};

    if (orgId && projectId) {
      try {
        const projects = await getOrgProjects(orgId);
        const proj = projects.find((p) => p.id === projectId);
        if (proj && proj.rawTokens) {
          currentDoc = proj.rawTokens;
        }
      } catch {}
    }
    
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

    if (orgId && projectId) {
      try {
        await saveProjectTokens(orgId, projectId, mergedDoc);
        if (isFromFigma) {
          await saveProjectFigmaVariables(orgId, projectId, rawDoc, body.meta);
        }
      } catch (err) {
        console.warn("Error saving project tokens:", err);
      }
    }

    const resolved = flattenAndResolveTokens(mergedDoc, "ALL");

    return jsonWithCors({
      success: true,
      message: isFromFigma
        ? "Figma Variables synced successfully to Tokens Platform."
        : "Tokens updated successfully in Tokens Platform Cloud.",
      tokenCount: resolved.length,
      timestamp: new Date().toISOString(),
      updatedBy: auth.record?.name,
    });
  } catch (err: any) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}
