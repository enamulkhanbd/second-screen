import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  uploadAsset,
  uploadMetadataIndex,
  loadMetadataIndex,
  detectContentType,
  extensionFromContentType,
  deriveAssetType,
} from "@/lib/r2";
import { ProjectAsset } from "@/types/tenant";
import { authorizeProjectRequest } from "@/utils/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/assets/upload
 *
 * Uploads one or more assets to R2 and updates the project metadata index.
 *
 * Request body (JSON):
 * {
 *   orgId: string;
 *   projectId: string;
 *   assets: Array<{
 *     id?: string;          // Optional — auto-generated if not provided
 *     name: string;         // File stem (e.g. "arrow-right")
 *     title?: string;
 *     type?: string;        // Icon type/variant (e.g. "outline", "solid")
 *     tag?: string;
 *     category?: string;
 *     content: string;      // Base64-encoded file content OR raw SVG string
 *     contentType?: string; // MIME type (defaults to "image/svg+xml")
 *     source?: "upload" | "git" | "figma";
 *     figmaNodeId?: string;
 *     figmaUrl?: string;
 *     figmaSourceId?: string;
 *     figmaSourceName?: string;
 *   }>;
 *   // Optional: if true, replace the entire metadata index (used by sync operations)
 *   replaceAll?: boolean;
 * }
 */
export async function POST(req: NextRequest) {
  if (!isR2Configured) {
    return NextResponse.json(
      { success: false, error: "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { orgId, projectId, assets, replaceAll, folderId: topFolderId } = body;

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

    if (!Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { success: false, error: "No assets provided." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const uploadedAssets: ProjectAsset[] = [];

    // Upload assets to R2 in parallel batches of 25 for maximum performance
    const BATCH_SIZE = 25;
    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      const batch = assets.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (asset) => {
          const assetId =
            asset.id ||
            `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          const contentType = asset.contentType || detectContentType(asset.name || "asset.svg");
          const extension = extensionFromContentType(contentType);

          // If no content is provided (e.g. metadata-only update), preserve the existing asset file in R2
          if (!asset.content) {
            uploadedAssets.push({
              id: assetId,
              name: asset.name,
              title: asset.title || asset.name,
              type: asset.type,
              tag: asset.tag,
              category: asset.category && asset.category !== "general" ? asset.category : undefined,
              folderId: asset.folderId || topFolderId || undefined,
              assetType: asset.assetType,
              url: asset.url,
              contentType: asset.contentType,
              size: asset.size,
              path: asset.path,
              updatedAt: now,
              source: asset.source || "upload",
              figmaNodeId: asset.figmaNodeId,
              figmaUrl: asset.figmaUrl,
              figmaSourceId: asset.figmaSourceId,
              figmaSourceName: asset.figmaSourceName,
            });
            return;
          }

          // Determine if content is base64-encoded or raw text (SVG)
          let bodyContent: Buffer;
          if (contentType === "image/svg+xml" && !isBase64(asset.content)) {
            // Raw SVG string
            bodyContent = Buffer.from(asset.content, "utf-8");
          } else {
            // Base64-encoded binary (images, videos, documents)
            bodyContent = Buffer.from(asset.content, "base64");
          }

          const result = await uploadAsset(
            orgId,
            projectId,
            assetId,
            bodyContent,
            contentType,
            extension
          );

          const targetFolderId = asset.folderId || topFolderId || undefined;
          const inferredType = asset.assetType || deriveAssetType(result.contentType, asset.name || "");
          const isSvg = (contentType || "").includes("svg") || (result.contentType || "").includes("svg");
          const rawSvg = isSvg && typeof asset.content === "string" && asset.content.includes("<svg") ? asset.content : undefined;

          uploadedAssets.push({
            id: assetId,
            name: asset.name,
            title: asset.title || asset.name,
            type: asset.type,
            tag: asset.tag,
            category: asset.category && asset.category !== "general" ? asset.category : undefined,
            folderId: targetFolderId,
            assetType: inferredType,
            url: result.url,
            contentType: result.contentType,
            size: result.size,
            svg: rawSvg,
            path: asset.path,
            updatedAt: now,
            source: asset.source || "upload",
            figmaNodeId: asset.figmaNodeId,
            figmaUrl: asset.figmaUrl,
            figmaSourceId: asset.figmaSourceId,
            figmaSourceName: asset.figmaSourceName,
          });
        })
      );
    }

    // Update the metadata index
    let currentMetadata = replaceAll ? [] : await loadMetadataIndex(orgId, projectId);

    if (replaceAll) {
      // Replace entire index with uploaded assets
      currentMetadata = uploadedAssets;
    } else {
      // Merge: add new assets to the beginning (most recent first)
      // Remove existing assets with the same ID to avoid duplicates
      const newIds = new Set(uploadedAssets.map((a) => a.id));
      const filtered = currentMetadata.filter((a) => !newIds.has(a.id));
      currentMetadata = [...uploadedAssets, ...filtered];
    }

    await uploadMetadataIndex(orgId, projectId, currentMetadata);

    return NextResponse.json({
      success: true,
      uploaded: uploadedAssets.length,
      totalAssets: currentMetadata.length,
      assets: uploadedAssets,
    });
  } catch (err: any) {
    console.error("R2 upload error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to upload assets to R2." },
      { status: 500 }
    );
  }
}

/**
 * Checks if a string looks like base64-encoded content.
 */
function isBase64(str: string): boolean {
  if (!str || str.length < 20) return false;
  // Check if it starts with common SVG patterns — if so, it's raw SVG
  if (str.trimStart().startsWith("<")) return false;
  // Basic base64 pattern check
  return /^[A-Za-z0-9+/=\r\n]+$/.test(str.substring(0, 100));
}
