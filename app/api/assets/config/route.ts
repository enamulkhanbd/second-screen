import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  loadAssetConfig,
  uploadAssetConfig,
} from "@/lib/r2";

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

    const config = await loadAssetConfig(orgId, projectId);
    return NextResponse.json({
      success: true,
      config: config || {
        assetGitConfig: null,
        assetFigmaConfig: null,
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
 * Body: { orgId, projectId, assetGitConfig?, assetFigmaConfig?, assetsCount? }
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
    const { orgId, projectId, assetGitConfig, assetFigmaConfig, assetsCount } = body;

    if (!orgId || !projectId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: orgId, projectId." },
        { status: 400 }
      );
    }

    // Load existing config to merge partial updates
    const existing = await loadAssetConfig(orgId, projectId);

    const merged = {
      ...(existing || {}),
      ...(assetGitConfig !== undefined ? { assetGitConfig } : {}),
      ...(assetFigmaConfig !== undefined ? { assetFigmaConfig } : {}),
      ...(assetsCount !== undefined ? { assetsCount } : {}),
      updatedAt: new Date().toISOString(),
    };

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
