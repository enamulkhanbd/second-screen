import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  loadMetadataIndexWithEtag,
  uploadMetadataIndex,
  updateMetadataIndex,
  MetadataConflictError,
  listProjectAssetKeys,
  getPublicUrl,
  deriveAssetType,
} from "@/lib/r2";
import { ProjectAsset } from "@/types/tenant";
import { authorizeProjectRequest } from "@/utils/auth";
import { cacheDel, cacheGetJson, cacheSetJson } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

function withoutInlineSvg(assets: ProjectAsset[]) {
  return assets.map((asset) => ({ ...asset, svg: undefined }));
}

function normalizeFolderIds(assets: ProjectAsset[]): ProjectAsset[] {
  return assets.map(({ collectionId, ...asset }) => ({
    ...asset,
    folderId: asset.folderId || collectionId,
  }));
}

async function fetchAssetMetadata(
  orgId: string,
  projectId: string
): Promise<{ assets: ProjectAsset[]; etag?: string }> {
  const { items, etag } = await loadMetadataIndexWithEtag(orgId, projectId);
  let metadata = items;
  let resolvedEtag = etag;

  // Auto-recovery: Only when the metadata index object does not exist yet (!etag)
  // and objects exist in R2, reconstruct it and write conditionally with If-None-Match: "*"
  if (metadata.length === 0 && !etag) {
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
          type: cleanName.includes("Fill") ? "fill" : cleanName.includes("Outline") ? "outline" : undefined,
          category: undefined,
          assetType: deriveAssetType(contentType, filename),
          url: getPublicUrl(key),
          contentType,
          updatedAt: now,
          source: namePart.startsWith("git_") ? ("git" as const) : ("upload" as const),
        };
      });

      // Save reconstructed index only if no concurrent writer created metadata.json first
      try {
        await uploadMetadataIndex(orgId, projectId, metadata, { ifNoneMatch: "*" });
      } catch (err: any) {
        const status = err?.$metadata?.httpStatusCode;
        if (status === 412 || status === 409 || err?.name === "PreconditionFailed") {
          const reloaded = await loadMetadataIndexWithEtag(orgId, projectId);
          metadata = reloaded.items;
          resolvedEtag = reloaded.etag;
        } else {
          throw err;
        }
      }
    }
  }

  return { assets: normalizeFolderIds(metadata), etag: resolvedEtag };
}

/**
 * GET /api/assets/list?orgId={orgId}&projectId={projectId}
 * Supports optional filtering (q, folderId, assetType), pagination (limit, offset),
 * and HTTP ETag / 304 conditional responses backed by R2 + Redis.
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

    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const folderId = searchParams.get("folderId");
    const assetType = searchParams.get("assetType");
    const isUnfiltered = !limitParam && !offsetParam && !q && !folderId && !assetType;

    const etagCacheKey = `assets:etag:${orgId}:${projectId}`;
    const ifNoneMatch = req.headers.get("if-none-match");
    if (isUnfiltered && ifNoneMatch) {
      const cached = await cacheGetJson<{ etag: string }>(etagCacheKey);
      if (cached?.etag && cached.etag === ifNoneMatch) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: cached.etag,
            "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
          },
        });
      }
    }

    const { assets: metadata, etag } = await fetchAssetMetadata(orgId, projectId);
    const httpEtag = etag ? (etag.startsWith('"') || etag.startsWith("W/") ? etag : `"${etag}"`) : undefined;
    if (httpEtag) {
      await cacheSetJson(etagCacheKey, { etag: httpEtag }, 60);
      if (isUnfiltered && ifNoneMatch && ifNoneMatch === httpEtag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: httpEtag,
            "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
          },
        });
      }
    }

    let filtered = metadata;
    if (folderId) {
      filtered = filtered.filter((a) => (a.folderId || "") === folderId);
    }
    if (assetType && assetType !== "all") {
      filtered = filtered.filter((a) => a.assetType === assetType);
    }
    if (q) {
      filtered = filtered.filter((a) =>
        (a.title || a.name || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q) ||
        (a.type || "").toLowerCase().includes(q)
      );
    }

    const hasPagination = limitParam !== null || offsetParam !== null;
    const parsedLimit = limitParam !== null
      ? Math.min(500, Math.max(1, Number.parseInt(limitParam, 10) || 60))
      : filtered.length;
    const parsedOffset = offsetParam !== null
      ? Math.max(0, Number.parseInt(offsetParam, 10) || 0)
      : 0;
    const pageItems = hasPagination
      ? filtered.slice(parsedOffset, parsedOffset + parsedLimit)
      : filtered;

    return NextResponse.json(
      {
        success: true,
        action: "list",
        totalAssets: metadata.length,
        ...(hasPagination
          ? {
              pagination: {
                limit: parsedLimit,
                offset: parsedOffset,
                totalFiltered: filtered.length,
                hasMore: parsedOffset + pageItems.length < filtered.length,
                nextOffset:
                  parsedOffset + pageItems.length < filtered.length
                    ? parsedOffset + pageItems.length
                    : null,
              },
            }
          : {}),
        assets: withoutInlineSvg(pageItems),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
          ...(httpEtag ? { ETag: httpEtag } : {}),
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

    const requiredPermission = action === "list" ? "read" : "write";
    const access = await authorizeProjectRequest(req, orgId, projectId, requiredPermission);
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

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
      const updatedMetadata = normalizeFolderIds(
        await updateMetadataIndex(orgId, projectId, (current) =>
          current.map((asset) => {
            if (idSet.has(asset.id)) {
              return {
                ...asset,
                folderId: targetFolderId || undefined,
                updatedAt: now,
              };
            }
            return asset;
          })
        )
      );

      await cacheDel(`assets:etag:${orgId}:${projectId}`);

      return NextResponse.json({
        success: true,
        action: "move-folder",
        movedCount: assetIds.length,
        totalAssets: updatedMetadata.length,
        assets: withoutInlineSvg(updatedMetadata),
      });
    }

    if (action === "update-metadata" && Array.isArray(updates) && updates.length > 0) {
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      const now = new Date().toISOString();

      const updatedMetadata = normalizeFolderIds(
        await updateMetadataIndex(orgId, projectId, (current) =>
          current.map((asset) => {
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
                ...(update.description !== undefined && { description: update.description }),
                ...(update.dimensions !== undefined && { dimensions: update.dimensions }),
                ...(update.colorSpace !== undefined && { colorSpace: update.colorSpace }),
                ...(update.format !== undefined && { format: update.format }),
                ...(update.customMetadata !== undefined && { customMetadata: update.customMetadata }),
                ...(update.version !== undefined && { version: update.version }),
                ...(update.history !== undefined && { history: update.history }),
                ...(update.uploadedBy !== undefined && { uploadedBy: update.uploadedBy }),
                ...(update.createdAt !== undefined && { createdAt: update.createdAt }),
                updatedAt: now,
              };
            }
            return asset;
          })
        )
      );

      await cacheDel(`assets:etag:${orgId}:${projectId}`);

      return NextResponse.json({
        success: true,
        action: "update-metadata",
        updatedCount: updates.length,
        totalAssets: updatedMetadata.length,
        assets: withoutInlineSvg(updatedMetadata),
      });
    }

    // Default: list all assets
    const { assets: metadata } = await fetchAssetMetadata(orgId, projectId);
    return NextResponse.json(
      {
        success: true,
        action: "list",
        totalAssets: metadata.length,
        assets: withoutInlineSvg(metadata),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    if (err instanceof MetadataConflictError || err?.statusCode === 409) {
      return NextResponse.json(
        { success: false, code: "metadata_conflict", error: err.message || "Asset index is busy, please retry." },
        { status: 409 }
      );
    }
    console.error("R2 list/metadata error (POST):", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load asset metadata from R2." },
      { status: 500 }
    );
  }
}
