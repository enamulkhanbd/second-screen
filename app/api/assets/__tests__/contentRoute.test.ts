import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/auth", () => ({
  authorizeProjectRequest: vi.fn(),
}));
vi.mock("@/lib/r2", () => ({
  getPublicUrl: (key: string) => `https://cdn.example.com/${key}`,
  isR2Configured: true,
  loadAssetRawContent: vi.fn(),
}));

import { GET } from "../content/route";

describe("asset content key scope", () => {
  it("rejects traversal, metadata, and malformed keys before loading R2", async () => {
    for (const key of [
      "../other-project/asset.svg",
      "org_1/project_1/metadata.json",
      "org_1/project_1/asset.svg/extra",
      "org_1/project_1/asset",
    ]) {
      const response = await GET(new NextRequest(`https://app.example.com/api/assets/content?key=${encodeURIComponent(key)}`));
      expect(response.status).toBe(400);
    }
  });
});
