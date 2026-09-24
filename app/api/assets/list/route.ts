import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  loadMetadataIndex,
  uploadMetadataIndex,
  listProjectAssetKeys,
  getPublicUrl,
  deriveAssetType,
} from "@/lib/r2";
import { ProjectAsset } from "@/types/tenant";

export const dynamic = "force-dynamic";

async function fetchAssetMetadata(orgId: string, projectId: string): Promise<ProjectAsset[]> {
  let metadata = await loadMetadataIndex(orgId, projectId);

  // Auto-recovery: If metadata index is empty but objects exist in R2, reconstruct it
  if (metadata.length === 0) {
    const keys = await listProjectAssetKeys(orgId, projectId);
    if (keys.length > 0) {
      const now = new Date().toISOString();
      metadata = keys.map((key) => {
        const filename = key.split("/").pop() || "";
        const namePart = filename.replace(/\.[^.]+$/, "");
        const cleanName = namePart.replace(/^git__assets_icons_svg_/, "").replace(/_svg$/, "");
        const formattedTitle = cleanName
          .replace(/^Icon/, "")
          .replace(/([A-Z])/g, " $1")
          .trim();

        const ext = filename.split(".").pop()?.toLowerCase() || "svg";
        const contentType = ext === "svg" ? "image/svg+xml" : `image/${ext}`;

        return {
          id: namePart,
          name: cleanName,
          title: formattedTitle || cleanName,
          type: cleanName.includes("Fill") ? "fill" : cleanName.includes("Outline") ? "outline" : "general",
          category: "general",
          assetType: deriveAssetType(contentType, filename),
          url: getPublicUrl(key),
          contentType,
          updatedAt: now,
          source: namePart.startsWith("git_") ? ("git" as const) : ("upload" as const),
        };
      });

      // Save reconstructed index to R2 so future reads are instantaneous
      await uploadMetadataIndex(orgId, projectId, metadata);
    }
  }

  return metadata;
}

/**
 * GET /api/assets/list?orgId={orgId}&projectId={projectId}
 * Returns the asset metadata index for a project from Cloudflare R2.
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

    const metadata = await fetchAssetMetadata(orgId, projectId);

    return NextResponse.json(
      {
        success: true,
        action: "list",
        totalAssets: metadata.length,
        assets: metadata,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    console.error("R2 list error (GET):", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load asset metadata from R2." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets/list
 * Returns or updates the asset metadata index for a project from R2.
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
    const { orgId, projectId, action = "list", updates } = body;

    if (!orgId || !projectId) {
      return NextResponse.json(
        { success: false, error: "Missing orgId or projectId." },
        { status: 400 }
      );
    }

    let metadata = await fetchAssetMetadata(orgId, projectId);

    if (action === "move-folder") {
      const { assetIds, targetFolderId } = body;
      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "No assetIds provided for move-folder action." },
          { status: 400 }
        );
      }

      const idSet = new Set(assetIds);
      const now = new Date().toISOString();
      const updatedMetadata = metadata.map((asset) => {
        if (idSet.has(asset.id)) {
          return {
            ...asset,
            folderId: targetFolderId || undefined,
            updatedAt: now,
          };
        }
        return asset;
      });

      await uploadMetadataIndex(orgId, projectId, updatedMetadata);

      return NextResponse.json({
        success: true,
        action: "move-folder",
        movedCount: assetIds.length,
        totalAssets: updatedMetadata.length,
        assets: updatedMetadata,
      });
    }

    if (action === "update-metadata" && Array.isArray(updates) && updates.length > 0) {
      // Apply metadata updates without re-uploading files
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      const now = new Date().toISOString();

      const updatedMetadata = metadata.map((asset) => {
        const update = updateMap.get(asset.id);
        if (update) {
          return {
            ...asset,
            ...(update.title !== undefined && { title: update.title }),
            ...(update.type !== undefined && { type: update.type }),
            ...(update.tag !== undefined && { tag: update.tag }),
            ...(update.category !== undefined && { category: update.category }),
            ...(update.name !== undefined && { name: update.name }),
            ...(update.folderId !== undefined && { folderId: update.folderId || undefined }),
            ...(update.assetType !== undefined && { assetType: update.assetType }),
            updatedAt: now,
          };
        }
        return asset;
      });

      await uploadMetadataIndex(orgId, projectId, updatedMetadata);

      return NextResponse.json({
        success: true,
        action: "update-metadata",
        updatedCount: updates.length,
        totalAssets: updatedMetadata.length,
        assets: updatedMetadata,
      });
    }

    // Default: list all assets
    return NextResponse.json(
      {
        success: true,
        action: "list",
        totalAssets: metadata.length,
        assets: metadata,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    console.error("R2 list/metadata error (POST):", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load asset metadata from R2." },
      { status: 500 }
    );
  }
}
