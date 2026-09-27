import { NextRequest, NextResponse } from "next/server";
import {
  isR2Configured,
  buildAssetKey,
  detectContentType,
  getUploadPresignedUrl,
} from "@/lib/r2";
import { authorizeProjectRequest } from "@/utils/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/assets/presigned-url
 * ================================
 * Generates a presigned PUT URL for direct client-side upload to Cloudflare R2.
 * This bypasses the Next.js server for binary data, ideal for large assets (images, videos, docs).
 *
 * Request body:
 * {
 *   orgId: string;
 *   projectId: string;
 *   assetId: string;
 *   filename: string;
 *   contentType?: string;
 *   expiresIn?: number; // seconds, default 3600
 * }
 */
export async function POST(req: NextRequest) {
  try {
    if (!isR2Configured) {
      return NextResponse.json(
        {
          error: "R2 storage is not configured",
          code: "R2_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { orgId, projectId, assetId, filename, contentType, expiresIn } = body;

    if (!orgId || !projectId || !assetId || !filename) {
      return NextResponse.json(
        { error: "Missing required fields: orgId, projectId, assetId, filename" },
        { status: 400 }
      );
    }

    const access = await authorizeProjectRequest(req, orgId, projectId, "write");
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const ext = filename.split(".").pop()?.toLowerCase() || "bin";
    const mimeType = contentType || detectContentType(filename);
    const key = buildAssetKey(orgId, projectId, assetId, ext);

    const result = await getUploadPresignedUrl(
      key,
      mimeType,
      expiresIn || 3600
    );

    return NextResponse.json({
      presignedUrl: result.presignedUrl,
      key: result.key,
      publicUrl: result.publicUrl,
      contentType: mimeType,
      expiresIn: expiresIn || 3600,
    });
  } catch (err: any) {
    console.error("[R2 Presigned URL API Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate presigned upload URL" },
      { status: 500 }
    );
  }
}
