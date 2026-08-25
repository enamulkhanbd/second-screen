import { NextRequest } from "next/server";
import { authenticateRequest } from "@/utils/auth";
import { flattenAndResolveTokens } from "@/utils/transformTokens";
import { extractThemeGroups } from "@/utils/themeHelpers";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { getOrgProjects, saveProjectTokens, saveProjectFigmaVariables } from "@/services/organizationService";
import { computeTokensDiff } from "@/utils/tokenDiff";

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
    const auth = await authenticateRequest(req, "read:tokens");

    if (!auth.isValid || !auth.record) {
      return jsonWithCors(
        {
          success: false,
          error: auth.error || "Unauthorized. A valid Bearer Personal Access Token (PAT) is required.",
        },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const requestedOrgId = searchParams.get("orgId");
    const requestedProjId = searchParams.get("projectId");

    // Tenant Isolation: If the API key is bound to a specific org/project, enforce it
    const tokenOrgId = auth.record.orgId;
    const tokenProjId = auth.record.projectId;

    if (tokenOrgId && requestedOrgId && tokenOrgId !== requestedOrgId) {
      return jsonWithCors(
        { success: false, error: "Forbidden: API key is not authorized for the requested organization." },
        { status: 403 }
      );
    }

    if (tokenProjId && requestedProjId && tokenProjId !== requestedProjId) {
      return jsonWithCors(
        { success: false, error: "Forbidden: API key is not authorized for the requested project." },
        { status: 403 }
      );
    }

    const orgId = requestedOrgId || tokenOrgId;
    const projectId = requestedProjId || tokenProjId;

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
      authenticatedAs: auth.record.name,
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
 * Smart Delta Push: Calculates token-level diffs and only updates changed/new tokens
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, "write:tokens");

    if (!auth.isValid || !auth.record) {
      return jsonWithCors(
        {
          success: false,
          error: auth.error || "Unauthorized. A valid Bearer Personal Access Token (PAT) with write:tokens scope is required.",
        },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const requestedOrgId = searchParams.get("orgId");
    const requestedProjId = searchParams.get("projectId");

    // Tenant Isolation: If the API key is bound to a specific org/project, enforce it
    const tokenOrgId = auth.record.orgId;
    const tokenProjId = auth.record.projectId;

    if (tokenOrgId && requestedOrgId && tokenOrgId !== requestedOrgId) {
      return jsonWithCors(
        { success: false, error: "Forbidden: API key is not authorized for the requested organization." },
        { status: 403 }
      );
    }

    if (tokenProjId && requestedProjId && tokenProjId !== requestedProjId) {
      return jsonWithCors(
        { success: false, error: "Forbidden: API key is not authorized for the requested project." },
        { status: 403 }
      );
    }

    const orgId = requestedOrgId || tokenOrgId;
    const projectId = requestedProjId || tokenProjId;

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
      (auth.record.name && auth.record.name.toLowerCase().includes("figma"));

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

    // Compute exact token delta between current Cloud tokens and incoming tokens
    const diff = computeTokensDiff(currentDoc, mergedDoc);
    const allChangedTokens = diff.files.flatMap((f) => f.tokens);
    const totalChanges = diff.totalAdded + diff.totalModified + diff.totalDeleted;
    const hasExistingTokens = Object.keys(currentDoc).filter((k) => !k.startsWith("$")).length > 0;

    if (orgId && projectId) {
      try {
        // Save only if changes exist or during initial import
        if (diff.hasChanges || !hasExistingTokens) {
          await saveProjectTokens(orgId, projectId, mergedDoc);
          if (isFromFigma) {
            await saveProjectFigmaVariables(orgId, projectId, rawDoc, body.meta);
          }
        }
      } catch (err) {
        console.warn("Error saving project tokens:", err);
      }
    }

    const resolved = flattenAndResolveTokens(mergedDoc, "ALL");

    // Format top changed token samples for response and plugin feedback
    const changedSamples = allChangedTokens.slice(0, 15).map((t) => ({
      key: t.key,
      name: t.name,
      setName: t.setName,
      changeType: t.changeType,
      oldValue: t.oldValue,
      newValue: t.newValue,
    }));

    let message = "Cloud tokens are already in sync. 0 changes detected.";
    if (!hasExistingTokens) {
      message = `Initial import: Published all ${resolved.length} tokens to Cloud.`;
    } else if (totalChanges === 1) {
      const sample = changedSamples[0];
      const detail = sample ? ` (${sample.setName}/${sample.key})` : "";
      message = `Published 1 changed token${detail} to Cloud.`;
    } else if (totalChanges > 1) {
      message = `Published ${totalChanges} changed tokens (${diff.totalModified} modified, ${diff.totalAdded} added) to Cloud.`;
    }

    return jsonWithCors({
      success: true,
      message,
      hasChanges: diff.hasChanges || !hasExistingTokens,
      changedCount: hasExistingTokens ? totalChanges : resolved.length,
      totalTokens: resolved.length,
      diffSummary: {
        added: diff.totalAdded,
        modified: diff.totalModified,
        deleted: diff.totalDeleted,
        changedTokens: changedSamples,
      },
      timestamp: new Date().toISOString(),
      updatedBy: auth.record.name,
    });
  } catch (err: any) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}
