import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  deleteAssets as r2DeleteAssets,
  loadMetadataIndex,
  updateMetadataIndex,
  MetadataConflictError,
  buildAssetKey,
  extensionFromContentType,
} from "@/lib/r2";
import { authorizeProjectRequest } from "@/utils/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/assets/delete
 *
 * Deletes one or more assets from R2 and updates the project metadata index
 * using conditional ETag writes to prevent concurrent lost updates.
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

    const access = await authorizeProjectRequest(req, orgId, projectId, "write");
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
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

    // Update metadata index conditionally — remove deleted assets without clobbering concurrent edits
    const deleteSet = new Set(assetIds);
    const updatedMetadata = await updateMetadataIndex(orgId, projectId, (items) =>
      items.filter((a) => !deleteSet.has(a.id))
    );

    return NextResponse.json({
      success: true,
      deleted: assetIds.length,
      remainingAssets: updatedMetadata.length,
    });
  } catch (err: any) {
    if (err instanceof MetadataConflictError || err?.statusCode === 409) {
      return NextResponse.json(
        { success: false, code: "metadata_conflict", error: err.message || "Asset index is busy, please retry." },
        { status: 409 }
      );
    }
    console.error("R2 delete error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete assets from R2." },
      { status: 500 }
    );
  }
}
