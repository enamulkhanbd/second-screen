import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authorizeProjectRequest } from "@/utils/auth";
import { flattenAndResolveTokens } from "@/utils/transformTokens";
import { extractThemeGroups, getThemesArray, getMetadataObject } from "@/utils/themeHelpers";
import { jsonWithCors, handleOptionsCors, corsHeaders } from "@/utils/cors";
import {
  getOrgProjectSummaries,
  getProject,
  getUserOrganizations,
  saveProjectFigmaVariables,
  saveProjectTokensAndBranches,
  ensureProjectDefaultBranch,
} from "@/services/organizationService";
import { BranchCommit, ProjectBranch } from "@/types/tokens";
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
 * Fetch design tokens & themes dynamically from Supabase
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
    const requestedBranch = searchParams.get("branch");

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
    if (!orgId || !projectId) {
      return jsonWithCors({ success: false, error: "Both orgId and projectId are required." }, { status: 400 });
    }
    const access = await authorizeProjectRequest(req, orgId, projectId, "read", auth.record);
    if (!access.authorized) {
      return jsonWithCors({ success: false, error: access.error }, { status: access.status });
    }

    let targetDoc: Record<string, any> = {};
    let figmaVariables: Record<string, any> = {};
    let figmaUpdatedAt: string | null = null;
    let currentBranchName = requestedBranch || "main";
    let availableBranches: { name: string; title: string; isDefault?: boolean }[] = [];

    // Fetch only the target project to avoid loading every project and token set.
    let proj;
    try {
      proj = await getProject(orgId, projectId);
    } catch (err) {
      console.warn("Error fetching project tokens:", err);
      return jsonWithCors(
        { success: false, code: "project_unavailable", error: "Could not load project tokens." },
        { status: 503 }
      );
    }

    if (!proj) {
      return jsonWithCors(
        { success: false, code: "project_not_found", error: "Project not found." },
        { status: 404 }
      );
    }

    const gitBranch = proj.gitConfig?.branch || proj.activeBranch || "main";
    currentBranchName = requestedBranch || gitBranch;

    if (availableBranches.length === 0 && proj.branches && proj.branches.length > 0) {
      availableBranches = proj.branches.map((b) => ({
        name: b.name,
        title: b.title,
        isDefault: b.isDefault,
      }));
      const branchObj =
        proj.branches.find((b) => b.name === (requestedBranch || proj.activeBranch || "main")) ||
        proj.branches[0];
      if (branchObj) {
        currentBranchName = branchObj.name;
        if (branchObj.rawTokens && Object.keys(branchObj.rawTokens).length > 0) {
          targetDoc = branchObj.rawTokens;
        }
      }
    }

    if (availableBranches.length === 0) {
      availableBranches = [{ name: gitBranch, title: gitBranch, isDefault: true }];
    }

    const etag = `W/"${projectId}:${proj.updatedAt || "0"}:${currentBranchName}"`;
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ...corsHeaders,
          ETag: etag,
        },
      });
    }

    if (Object.keys(targetDoc).length === 0 && proj.rawTokens && Object.keys(proj.rawTokens).length > 0) {
      targetDoc = proj.rawTokens;
    }

    if (proj.figmaVariables) {
      figmaVariables = proj.figmaVariables;
      figmaUpdatedAt = proj.figmaUpdatedAt || null;
    }

    const resolvedTokens = flattenAndResolveTokens(targetDoc, "ALL");
    const themeGroups = extractThemeGroups(targetDoc);

    const themes = getThemesArray(targetDoc);
    const metadata = getMetadataObject(targetDoc) || {};

    return jsonWithCors(
      {
        success: true,
        authenticatedAs: auth.record.name,
        orgId: orgId || undefined,
        projectId: projectId || undefined,
        branch: currentBranchName,
        availableBranches: availableBranches.length > 0 ? availableBranches : undefined,
        version: "1.0.0",
        rawTokens: targetDoc,
        figmaVariables,
        figmaUpdatedAt,
        resolvedTokens,
        themeGroups,
        themes,
        metadata,
      },
      {
        headers: {
          ETag: etag,
        },
      }
    );
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

    let orgId = requestedOrgId || tokenOrgId;
    let projectId = requestedProjId || tokenProjId;

    // Fallback: If orgId or projectId is missing, resolve from user's accessible organizations
    if ((!orgId || !projectId) && auth.record.uid) {
      try {
        const userOrgs = await getUserOrganizations(auth.record.uid, auth.record.userEmail);
        if (userOrgs.length > 0) {
          const firstOrg = userOrgs.find((o: any) => o.id === orgId) || userOrgs[0];
          orgId = firstOrg.id;
          const projs = await getOrgProjectSummaries(firstOrg.id);
          if (projs.length > 0) {
            const firstProj = projs.find((p: any) => p.id === projectId) || projs[0];
            projectId = firstProj.id;
          }
        }
      } catch (resolveErr) {
        console.warn("Could not auto-resolve org/project in POST /api/v1/tokens:", resolveErr);
      }
    }

    if (!orgId || !projectId) {
      return jsonWithCors(
        {
          success: false,
          error: "Missing required 'orgId' and 'projectId' parameters. Please specify which workspace to push to.",
        },
        { status: 400 }
      );
    }

    const access = await authorizeProjectRequest(req, orgId, projectId, "write", auth.record);
    if (!access.authorized) {
      return jsonWithCors({ success: false, error: access.error }, { status: access.status });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonWithCors(
        { success: false, error: "Invalid tokens payload. Must be a valid JSON object." },
        { status: 400 }
      );
    }

    const requestedBranch = searchParams.get("branch") || body.branch;
    const rawDoc = body.rawTokens || body;
    const isFromFigma =
      body.source === "figma_plugin" ||
      Boolean(body.isFigmaPlugin) ||
      (auth.record.name && auth.record.name.toLowerCase().includes("figma"));

    // Fail closed if getProject fails or returns null (A1 / R4)
    let targetProject: any = null;
    try {
      targetProject = await getProject(orgId, projectId);
    } catch (readErr) {
      console.error("Failed reading project before token push:", readErr);
      return jsonWithCors(
        {
          success: false,
          code: "project_unavailable",
          error: "Project is temporarily unavailable. Token push was aborted to prevent overwriting existing tokens.",
        },
        { status: 503 }
      );
    }

    if (!targetProject) {
      return jsonWithCors(
        {
          success: false,
          code: "project_not_found",
          error: "Project not found.",
        },
        { status: 404 }
      );
    }

    const projectBranches: ProjectBranch[] = ensureProjectDefaultBranch(targetProject);
    const targetBranchName = requestedBranch || targetProject.activeBranch || "main";
    const branchObj =
      projectBranches.find((b) => b.name === targetBranchName) ||
      projectBranches[0];

    let currentDoc: Record<string, any> = {};
    if (branchObj && branchObj.rawTokens && Object.keys(branchObj.rawTokens).length > 0) {
      currentDoc = branchObj.rawTokens;
    } else if (targetProject.rawTokens) {
      currentDoc = targetProject.rawTokens;
    }

    // Merge incoming tokens onto stored doc preserving $themes and $metadata
    const mergedDoc: Record<string, any> = {
      ...currentDoc,
      ...rawDoc,
    };

    const incomingHasThemes = Boolean(
      mergedDoc["$themes"] || mergedDoc["$themes.json"] || mergedDoc["$theme"] || mergedDoc["$theme.json"]
    );
    if (!incomingHasThemes) {
      const existingThemes =
        currentDoc["$themes"] || currentDoc["$themes.json"] || currentDoc["$theme"] || currentDoc["$theme.json"];
      if (existingThemes) mergedDoc["$themes"] = existingThemes;
    }
    const incomingHasMeta = Boolean(mergedDoc["$metadata"] || mergedDoc["$metadata.json"]);
    if (!incomingHasMeta) {
      const existingMeta = currentDoc["$metadata"] || currentDoc["$metadata.json"];
      if (existingMeta) mergedDoc["$metadata"] = existingMeta;
    }

    // Compute exact token delta between current Cloud tokens and incoming tokens
    const diff = computeTokensDiff(currentDoc, mergedDoc);
    const allChangedTokens = diff.files.flatMap((f) => f.tokens);
    const totalChanges = diff.totalAdded + diff.totalModified + diff.totalDeleted;
    const hasExistingTokens = Object.keys(currentDoc).filter((k) => !k.startsWith("$")).length > 0;

    let figmaVariablesSaved: boolean | undefined = undefined;
    if (isFromFigma && rawDoc && Object.keys(rawDoc).length > 0) {
      try {
        await saveProjectFigmaVariables(orgId, projectId, rawDoc, body.meta);
        figmaVariablesSaved = true;
      } catch (figmaErr) {
        console.warn("Error saving Figma variables snapshot:", figmaErr);
        figmaVariablesSaved = false;
      }
    }

    // Save tokens only if changes exist or during initial import
    if (diff.hasChanges || !hasExistingTokens) {
      let branch = projectBranches.find((b) => b.name === targetBranchName);
      if (!branch) {
        const newBranch: ProjectBranch = {
          id: `branch_${targetBranchName}_${Date.now()}`,
          name: targetBranchName,
          title: targetBranchName,
          isDefault: targetBranchName === "main",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: { name: auth.record.name, email: "api@tokens-platform.local" },
          rawTokens: mergedDoc,
          themeGroups: targetProject?.themeGroups || [],
          commits: [],
          comments: [],
        };
        projectBranches.push(newBranch);
        branch = newBranch;
      } else {
        branch.rawTokens = mergedDoc;
        branch.updatedAt = new Date().toISOString();
      }

      const commit: BranchCommit = {
        id: "commit_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        sha: Math.random().toString(36).substring(2, 9),
        message:
          body.commitMessage ||
          (isFromFigma
            ? "Sync tokens from Figma Plugin"
            : `Update ${totalChanges || Object.keys(rawDoc).length} tokens via API`),
        timestamp: new Date().toISOString(),
        author: {
          name: auth.record.name || "API User",
          email: "api@tokens-platform.local",
        },
        totalAdded: diff.totalAdded,
        totalModified: diff.totalModified,
        totalDeleted: diff.totalDeleted,
        changes: allChangedTokens.slice(0, 30).map((t) => ({
          id: `chg_${Math.random().toString(36).substring(2, 9)}`,
          category: "tokens",
          action: t.changeType,
          key: t.key,
          label: t.name || t.key,
          oldValue: typeof t.oldValue === "string" ? t.oldValue : JSON.stringify(t.oldValue),
          newValue: typeof t.newValue === "string" ? t.newValue : JSON.stringify(t.newValue),
          timestamp: new Date().toISOString(),
        })),
      };

      branch.commits = [commit, ...(branch.commits || [])];

      try {
        const shouldUpdateRootTokens = targetBranchName === "main" || projectBranches.length === 0;
        await saveProjectTokensAndBranches(
          orgId,
          projectId,
          shouldUpdateRootTokens ? mergedDoc : undefined,
          shouldUpdateRootTokens ? extractThemeGroups(mergedDoc) : undefined,
          projectBranches,
          targetBranchName
        );
      } catch (persistErr: any) {
        console.error("Error persisting project tokens:", persistErr);
        return jsonWithCors(
          {
            success: false,
            code: "persist_failed",
            error: "Failed to persist tokens to the database. Please retry.",
            ...(figmaVariablesSaved !== undefined ? { figmaVariablesSaved } : {}),
          },
          { status: 500 }
        );
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

    let message = `Cloud tokens are already in sync on branch "${targetBranchName}". 0 changes detected.`;
    if (!hasExistingTokens) {
      message = `Initial import: Published all ${resolved.length} tokens to branch "${targetBranchName}".`;
    } else if (totalChanges === 1) {
      const sample = changedSamples[0];
      const detail = sample ? ` (${sample.setName}/${sample.key})` : "";
      message = `Published 1 changed token${detail} to branch "${targetBranchName}".`;
    } else if (totalChanges > 1) {
      message = `Published ${totalChanges} changed tokens (${diff.totalModified} modified, ${diff.totalAdded} added) to branch "${targetBranchName}".`;
    }

    return jsonWithCors({
      success: true,
      message,
      branch: targetBranchName,
      hasChanges: diff.hasChanges || !hasExistingTokens,
      changedCount: hasExistingTokens ? totalChanges : resolved.length,
      totalTokens: resolved.length,
      ...(figmaVariablesSaved !== undefined ? { figmaVariablesSaved } : {}),
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
