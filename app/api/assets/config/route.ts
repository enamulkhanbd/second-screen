import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  loadAssetConfig,
  uploadAssetConfig,
} from "@/lib/r2";
import { authorizeProjectRequest } from "@/utils/auth";
import { getProject } from "@/services/organizationService";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/assets/config?orgId={orgId}&projectId={projectId}
 * Loads a project's asset configuration (Git sync & Figma sync settings) from Cloudflare R2.
 */
export async function GET(req: NextRequest) {
  if (!isR2Configured) {
    return NextResponse.json(
      { success: false, error: "R2 storage is not configured." },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const projectId = searchParams.get("projectId");

    if (!orgId || !projectId) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameters: orgId, projectId." },
        { status: 400 }
      );
    }

    const access = await authorizeProjectRequest(req, orgId, projectId, "read");
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const config = await loadAssetConfig(orgId, projectId);
    const project = await getProject(orgId, projectId);
    const configWithProtectedIntegrations = {
      ...(config || {}),
      assetGitConfig: project?.assetGitConfig || config?.assetGitConfig || null,
      assetFigmaConfig: project?.assetFigmaConfig || config?.assetFigmaConfig || null,
    };
    const safeConfig = access.role === "viewer"
      ? {
          ...configWithProtectedIntegrations,
          assetGitConfig: configWithProtectedIntegrations.assetGitConfig
            ? { ...configWithProtectedIntegrations.assetGitConfig, pat: "" }
            : null,
          assetFigmaConfig: configWithProtectedIntegrations.assetFigmaConfig
            ? { ...configWithProtectedIntegrations.assetFigmaConfig, pat: "" }
            : null,
        }
      : configWithProtectedIntegrations;
    return NextResponse.json({
      success: true,
      config: safeConfig || {
        assetGitConfig: null,
        assetFigmaConfig: null,
        folders: [],
      },
    });
  } catch (err: any) {
    console.error("[R2 Config API Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load asset configuration from R2." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets/config
 * Updates a project's asset configuration in Cloudflare R2.
 * Body: { orgId, projectId, assetGitConfig?, assetFigmaConfig?, assetsCount?, folders? }
 */
export async function POST(req: NextRequest) {
  if (!isR2Configured) {
    return NextResponse.json(
      { success: false, error: "R2 storage is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { orgId, projectId, assetGitConfig, assetFigmaConfig, assetsCount, folders } = body;

    if (!orgId || !projectId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: orgId, projectId." },
        { status: 400 }
      );
    }

    const access = await authorizeProjectRequest(req, orgId, projectId, "write");
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    // Load existing config to merge partial updates
    const existing = await loadAssetConfig(orgId, projectId);
    const project = await getProject(orgId, projectId);

    const merged = {
      ...(existing || {}),
      ...(assetsCount !== undefined ? { assetsCount } : {}),
      ...(folders !== undefined ? { folders } : {}),
      updatedAt: new Date().toISOString(),
    };

    const integration = createAdminClient();
    const { error: integrationError } = await integration.from("project_integrations").upsert(
      {
        project_id: projectId,
        org_id: orgId,
        asset_git_config: assetGitConfig !== undefined
          ? assetGitConfig || {}
          : project?.assetGitConfig || existing?.assetGitConfig || {},
        asset_figma_config: assetFigmaConfig !== undefined
          ? assetFigmaConfig || {}
          : project?.assetFigmaConfig || existing?.assetFigmaConfig || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    );
    if (integrationError) throw integrationError;

    await uploadAssetConfig(orgId, projectId, merged);

    return NextResponse.json({
      success: true,
      config: merged,
    });
  } catch (err: any) {
    console.error("[R2 Config API Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save asset configuration to R2." },
      { status: 500 }
    );
  }
}
