import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  deleteAsset as r2DeleteAsset,
  deleteAssets as r2DeleteAssets,
  loadMetadataIndex,
  uploadMetadataIndex,
  buildAssetKey,
  extensionFromContentType,
} from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * POST /api/assets/delete
 *
 * Deletes one or more assets from R2 and updates the project metadata index.
 *
 * Request body (JSON):
 * {
 *   orgId: string;
 *   projectId: string;
 *   assetIds: string[];        // Array of asset IDs to delete
 * }
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
    const { orgId, projectId, assetIds } = body;

    if (!orgId || !projectId) {
      return NextResponse.json(
        { success: false, error: "Missing orgId or projectId." },
        { status: 400 }
      );
    }

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No asset IDs provided." },
        { status: 400 }
      );
    }

    // Load current metadata to find file extensions for each asset
    const currentMetadata = await loadMetadataIndex(orgId, projectId);
    const metadataMap = new Map(currentMetadata.map((a) => [a.id, a]));

    // Build R2 keys for deletion
    const keysToDelete: string[] = [];
    for (const id of assetIds) {
      const meta = metadataMap.get(id);
      const ext = meta?.contentType
        ? extensionFromContentType(meta.contentType)
        : "svg";
      keysToDelete.push(buildAssetKey(orgId, projectId, id, ext));
    }

    // Delete from R2
    await r2DeleteAssets(keysToDelete);

    // Update metadata index — remove deleted assets
    const deleteSet = new Set(assetIds);
    const updatedMetadata = currentMetadata.filter((a) => !deleteSet.has(a.id));
    await uploadMetadataIndex(orgId, projectId, updatedMetadata);

    return NextResponse.json({
      success: true,
      deleted: assetIds.length,
      remainingAssets: updatedMetadata.length,
    });
  } catch (err: any) {
    console.error("R2 delete error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete assets from R2." },
      { status: 500 }
    );
  }
}
