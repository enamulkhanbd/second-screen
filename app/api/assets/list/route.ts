import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  loadMetadataIndex,
  uploadMetadataIndex,
  listProjectAssetKeys,
  getPublicUrl,
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
