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

async function fetchAssetMetadata(orgId: string, projectId: string): Promise<ProjectAsset[]> {
  const { items, etag } = await loadMetadataIndexWithEtag(orgId, projectId);
  let metadata = items;

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
        } else {
          throw err;
        }
      }
    }
  }

  return normalizeFolderIds(metadata);
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

    const access = await authorizeProjectRequest(req, orgId, projectId, "read");
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const metadata = await fetchAssetMetadata(orgId, projectId);

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

      return NextResponse.json({
        success: true,
        action: "update-metadata",
        updatedCount: updates.length,
        totalAssets: updatedMetadata.length,
        assets: withoutInlineSvg(updatedMetadata),
      });
    }

    // Default: list all assets
    const metadata = await fetchAssetMetadata(orgId, projectId);
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
