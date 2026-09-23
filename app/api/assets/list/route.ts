import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  loadMetadataIndex,
  uploadMetadataIndex,
} from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * POST /api/assets/list
 *
 * Returns the asset metadata index for a project from R2.
 * Also supports updating asset metadata (without re-uploading files).
 *
 * Request body (JSON):
 * {
 *   orgId: string;
 *   projectId: string;
 *   action?: "list" | "update-metadata";
 *
 *   // For "update-metadata" action only:
 *   updates?: Array<{
 *     id: string;
 *     title?: string;
 *     type?: string;
 *     tag?: string;
 *     category?: string;
 *     name?: string;
 *   }>;
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
    const { orgId, projectId, action = "list", updates } = body;

    if (!orgId || !projectId) {
      return NextResponse.json(
        { success: false, error: "Missing orgId or projectId." },
        { status: 400 }
      );
    }

    // Load metadata index from R2
    const metadata = await loadMetadataIndex(orgId, projectId);

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
    return NextResponse.json({
      success: true,
      action: "list",
      totalAssets: metadata.length,
      assets: metadata,
    });
  } catch (err: any) {
    console.error("R2 list/metadata error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load asset metadata from R2." },
      { status: 500 }
    );
  }
}
