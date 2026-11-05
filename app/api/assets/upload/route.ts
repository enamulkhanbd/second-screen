import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  uploadAsset,
  updateMetadataIndex,
  MetadataConflictError,
  detectContentType,
  extensionFromContentType,
  deriveAssetType,
} from "@/lib/r2";
import { ProjectAsset } from "@/types/tenant";
import { authorizeProjectRequest } from "@/utils/auth";
import { mapLimit } from "@/utils/pool";

export const dynamic = "force-dynamic";

const ASSET_UPLOAD_CONCURRENCY = 6;
const MAX_UPLOAD_ASSETS = 500;
const MAX_UPLOAD_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/assets/upload
 *
 * Uploads one or more assets to R2 with bounded concurrency and updates the project
 * metadata index using optimistic concurrency (ETag conditional writes + retry).
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

    if (assets.length > MAX_UPLOAD_ASSETS) {
      return NextResponse.json(
        {
          success: false,
          code: "payload_too_large",
          error: `Batch exceeds maximum of ${MAX_UPLOAD_ASSETS} assets per request. Split the upload or use presigned URLs (/api/assets/presigned-url).`,
        },
        { status: 413 }
      );
    }

    let estimatedBytes = 0;
    for (const asset of assets) {
      if (typeof asset?.content === "string") {
        estimatedBytes += Buffer.byteLength(asset.content, "utf-8");
      }
    }
    if (estimatedBytes > MAX_UPLOAD_TOTAL_BYTES) {
      return NextResponse.json(
        {
          success: false,
          code: "payload_too_large",
          error: `Total upload payload exceeds ${Math.round(MAX_UPLOAD_TOTAL_BYTES / (1024 * 1024))} MB limit. Use /api/assets/presigned-url for large binaries.`,
        },
        { status: 413 }
      );
    }

    const now = new Date().toISOString();

    const settled = await mapLimit(assets, ASSET_UPLOAD_CONCURRENCY, async (asset): Promise<ProjectAsset> => {
      const assetId =
        asset.id ||
        `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const contentType = asset.contentType || detectContentType(asset.name || "asset.svg");
      const extension = extensionFromContentType(contentType);

      // If no content is provided (e.g. metadata-only update), preserve the existing asset file in R2
      if (!asset.content) {
        const folderId = asset.folderId || asset.collectionId || topFolderId || undefined;
        return {
          id: assetId,
          name: asset.name,
          title: asset.title || asset.name,
          type: asset.type,
          tag: asset.tag,
          category: asset.category && asset.category !== "general" ? asset.category : undefined,
          folderId,
          assetType: asset.assetType,
          url: asset.url,
          contentType: asset.contentType,
          size: asset.size,
          description: asset.description,
          dimensions: asset.dimensions,
          colorSpace: asset.colorSpace,
          format: asset.format,
          customMetadata: asset.customMetadata,
          version: asset.version,
          history: asset.history,
          uploadedBy: asset.uploadedBy,
          createdAt: asset.createdAt,
          path: asset.path,
          updatedAt: now,
          source: asset.source || "upload",
          figmaNodeId: asset.figmaNodeId,
          figmaUrl: asset.figmaUrl,
          figmaSourceId: asset.figmaSourceId,
          figmaSourceName: asset.figmaSourceName,
        };
      }

      // Determine if content is base64-encoded or raw text (SVG)
      let bodyContent: Buffer;
      if (contentType === "image/svg+xml" && !isBase64(asset.content)) {
        bodyContent = Buffer.from(asset.content, "utf-8");
      } else {
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

      const targetFolderId = asset.folderId || asset.collectionId || topFolderId || undefined;
      const inferredType = asset.assetType || deriveAssetType(result.contentType, asset.name || "");
      const isSvg = (contentType || "").includes("svg") || (result.contentType || "").includes("svg");
      const rawSvg = isSvg && typeof asset.content === "string" && asset.content.includes("<svg") ? asset.content : undefined;

      return {
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
        description: asset.description,
        dimensions: asset.dimensions,
        colorSpace: asset.colorSpace,
        format: asset.format || contentType.split("/").pop()?.toUpperCase(),
        customMetadata: asset.customMetadata,
        version: asset.version || 1,
        history: asset.history,
        uploadedBy: asset.uploadedBy,
        createdAt: asset.createdAt || now,
        svg: rawSvg,
        path: asset.path,
        updatedAt: now,
        source: asset.source || "upload",
        figmaNodeId: asset.figmaNodeId,
        figmaUrl: asset.figmaUrl,
        figmaSourceId: asset.figmaSourceId,
        figmaSourceName: asset.figmaSourceName,
      };
    });

    const firstRejection = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (firstRejection) {
      throw firstRejection.reason;
    }

    const uploadedAssets: ProjectAsset[] = settled
      .filter((r): r is PromiseFulfilledResult<ProjectAsset> => r.status === "fulfilled")
      .map((r) => r.value);

    // Conditionally update the metadata index with retry on ETag conflict (M3 / R6)
    const updatedMetadata = await updateMetadataIndex(orgId, projectId, (currentMetadata) => {
      if (replaceAll) {
        return uploadedAssets;
      }
      const newIds = new Set(uploadedAssets.map((a) => a.id));
      const filtered = currentMetadata.filter((a) => !newIds.has(a.id));
      return [...uploadedAssets, ...filtered];
    });

    return NextResponse.json({
      success: true,
      uploaded: uploadedAssets.length,
      totalAssets: updatedMetadata.length,
      assets: uploadedAssets,
    });
  } catch (err: any) {
    if (err instanceof MetadataConflictError || err?.statusCode === 409) {
      return NextResponse.json(
        { success: false, code: "metadata_conflict", error: err.message || "Asset index is busy, please retry." },
        { status: 409 }
      );
    }
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
