import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeProjectRequest } from "@/utils/auth";
import { getPublicUrl, isR2Configured, loadAssetRawContent } from "@/lib/r2";

export const dynamic = "force-dynamic";

function parseScopedAssetKey(input: string): { key: string; orgId: string; projectId: string } | null {
  let key: string;
  try {
    key = decodeURIComponent(input).replace(/^\/+/, "");
  } catch {
    return null;
  }

  const parts = key.split("/");
  if (parts.length !== 3) return null;
  const [orgId, projectId, filename] = parts;
  if (!orgId || !projectId || !filename || filename === "metadata.json" || filename === "config.json") return null;
  if (parts.some((part) => !/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?$/.test(part))) return null;
  if (filename.split(".").length !== 2) return null;

  return { key, orgId, projectId };
}

/**
 * GET /api/assets/content?url={cdnUrl}
 * Same-origin proxy for authenticated project asset content.
 * The legacy key parameter is accepted only when it is a canonical scoped asset key.
 */
export async function GET(req: NextRequest) {
  const requestId = `asset_${crypto.randomUUID()}`;
  const { searchParams } = new URL(req.url);
  const keyParam = searchParams.get("key");
  const urlParam = searchParams.get("url");

  let rawKey = keyParam;
  if (!rawKey && urlParam) {
    try {
      const parsed = new URL(urlParam);
      const expectedOrigin = new URL(getPublicUrl(parsed.pathname.replace(/^\/+/, ""))).origin;
      if (parsed.origin !== expectedOrigin) {
        return NextResponse.json({ success: false, error: "Unsupported asset URL.", requestId }, { status: 400 });
      }
      rawKey = parsed.pathname.replace(/^\/+/, "");
    } catch {
      return NextResponse.json({ success: false, error: "Invalid asset URL.", requestId }, { status: 400 });
    }
  }

  if (!rawKey) {
    return NextResponse.json({ success: false, error: "Missing asset URL.", requestId }, { status: 400 });
  }

  const scoped = parseScopedAssetKey(rawKey);
  if (!scoped) {
    return NextResponse.json({ success: false, error: "Invalid asset reference.", requestId }, { status: 400 });
  }

  const authorization = await authorizeProjectRequest(req, scoped.orgId, scoped.projectId, "read");
  if (!authorization.authorized) {
    return NextResponse.json(
      { success: false, error: authorization.error, requestId },
      { status: authorization.status },
    );
  }

  try {
    if (!isR2Configured) {
      return NextResponse.json({ success: false, error: "Asset storage is unavailable.", requestId }, { status: 503 });
    }

    const asset = await loadAssetRawContent(scoped.key);
    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found.", requestId }, { status: 404 });
    }

    return new NextResponse(asset.data as any, {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "private, max-age=300",
        "X-Request-Id": requestId,
      },
    });
  } catch {
    console.error("Asset content request failed", { requestId, orgId: scoped.orgId, projectId: scoped.projectId });
    return NextResponse.json(
      { success: false, error: "Could not load asset content.", requestId },
      { status: 500 },
    );
  }
}
