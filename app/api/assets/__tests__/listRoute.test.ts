import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuthorize = vi.fn();
const mockLoadMetadataWithEtag = vi.fn();

vi.mock("@/utils/auth", () => ({
  authorizeProjectRequest: (...args: any[]) => mockAuthorize(...args),
}));

vi.mock("@/lib/r2", () => ({
  isR2Configured: true,
  loadMetadataIndexWithEtag: (...args: any[]) => mockLoadMetadataWithEtag(...args),
  uploadMetadataIndex: vi.fn(),
  updateMetadataIndex: vi.fn(),
  MetadataConflictError: class extends Error {},
  listProjectAssetKeys: vi.fn(async () => []),
  getPublicUrl: (k: string) => `https://cdn.example.com/${k}`,
  deriveAssetType: () => "icon",
}));

import { GET } from "../list/route";

describe("GET /api/assets/list pagination, filtering, and ETag/304", () => {
  const sampleAssets = [
    { id: "1", name: "arrow-left", title: "Arrow Left", assetType: "icon", folderId: "nav", url: "https://cdn/1.svg", contentType: "image/svg+xml", updatedAt: "2026-01-01" },
    { id: "2", name: "arrow-right", title: "Arrow Right", assetType: "icon", folderId: "nav", url: "https://cdn/2.svg", contentType: "image/svg+xml", updatedAt: "2026-01-01" },
    { id: "3", name: "hero-banner", title: "Hero Banner", assetType: "image", folderId: "marketing", url: "https://cdn/3.png", contentType: "image/png", updatedAt: "2026-01-01" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorize.mockResolvedValue({ authorized: true, role: "editor" });
    mockLoadMetadataWithEtag.mockResolvedValue({
      items: sampleAssets,
      etag: '"r2-etag-abc"',
    });
  });

  it("returns 304 Not Modified when If-None-Match matches the R2 ETag", async () => {
    const req = new NextRequest("https://app.example.com/api/assets/list?orgId=org_1&projectId=proj_1", {
      headers: { "if-none-match": '"r2-etag-abc"' },
    });
    const res = await GET(req);
    expect(res.status).toBe(304);
    expect(res.headers.get("etag")).toBe('"r2-etag-abc"');
  });

  it("paginates and filters assets when limit/offset/q/folderId are specified", async () => {
    const req = new NextRequest(
      "https://app.example.com/api/assets/list?orgId=org_1&projectId=proj_1&folderId=nav&q=arrow&limit=1&offset=1"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.totalAssets).toBe(3);
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0].id).toBe("2");
    expect(body.pagination).toEqual({
      limit: 1,
      offset: 1,
      totalFiltered: 2,
      hasMore: false,
      nextOffset: null,
    });
  });

  it("keeps full-list backwards compatibility when pagination params are omitted", async () => {
    const req = new NextRequest("https://app.example.com/api/assets/list?orgId=org_1&projectId=proj_1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.assets).toHaveLength(3);
    expect(body.pagination).toBeUndefined();
    expect(res.headers.get("etag")).toBe('"r2-etag-abc"');
  });
});
