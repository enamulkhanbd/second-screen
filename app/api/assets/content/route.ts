import { NextRequest, NextResponse } from "next/server";
import { getPublicUrl, isR2Configured, loadAssetRawContent } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * GET /api/assets/content?url={cdnUrl}&key={r2Key}
 * Same-origin proxy endpoint for fetching raw SVG/asset content.
 * Guarantees zero CORS failures and bypasses browser opaque image cache collisions.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyParam = searchParams.get("key");
  const urlParam = searchParams.get("url");

  let key = keyParam;
  if (!key && urlParam) {
    try {
      const parsed = new URL(urlParam);
      const expectedOrigin = new URL(getPublicUrl(parsed.pathname.replace(/^\/+/, ""))).origin;
      if (parsed.origin !== expectedOrigin) {
        return NextResponse.json({ success: false, error: "Unsupported asset URL." }, { status: 400 });
      }
      key = parsed.pathname.replace(/^\/+/, "");
    } catch {
      return NextResponse.json({ success: false, error: "Invalid asset URL." }, { status: 400 });
    }
  }

  if (!key) {
    return NextResponse.json({ success: false, error: "Missing key or url parameter." }, { status: 400 });
  }

  try {
    if (isR2Configured) {
      const asset = await loadAssetRawContent(key);
      if (asset) {
        return new NextResponse(asset.data as any, {
          headers: {
            "Content-Type": asset.contentType,
            "Cache-Control": "public, max-age=86400, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    return NextResponse.json({ success: false, error: "Asset not found." }, { status: 404 });
  } catch (err: any) {
    console.error("[Asset Content API Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load asset content." },
      { status: 500 }
    );
  }
}
