import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuthorize = vi.fn();
const mockUploadSnapshot = vi.fn();
const mockLoadSnapshot = vi.fn();
const mockUpdateCalls: Array<Record<string, any>> = [];
let mockExistingRow: any = null;
let mockFailColumnsOnce = false;

vi.mock("@/utils/auth", () => ({
  authorizeProjectRequest: (...args: any[]) => mockAuthorize(...args),
}));

vi.mock("@/lib/r2", () => ({
  isR2Configured: true,
}));

vi.mock("@/lib/r2Snapshots", async () => {
  const actual = await vi.importActual<typeof import("@/lib/r2Snapshots")>("@/lib/r2Snapshots");
  return {
    ...actual,
    uploadProjectSnapshot: (...args: any[]) => mockUploadSnapshot(...args),
    loadProjectSnapshot: (...args: any[]) => mockLoadSnapshot(...args),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: mockExistingRow, error: null }),
          }),
        }),
      }),
      update: (payload: Record<string, any>) => ({
        eq: () => ({
          eq: () => ({
            select: async () => {
              mockUpdateCalls.push(payload);
              if (mockFailColumnsOnce && "storage_mode" in payload) {
                mockFailColumnsOnce = false;
                return { data: null, error: { code: "42703", message: 'column "storage_mode" does not exist' } };
              }
              return { data: [{ id: "proj_1" }], error: null };
            },
          }),
        }),
      }),
    }),
  }),
}));

import { GET, POST } from "../snapshot/route";

describe("POST / GET /api/projects/snapshot R2 offloading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCalls.length = 0;
    mockFailColumnsOnce = false;
    mockAuthorize.mockResolvedValue({ authorized: true, role: "editor" });
    mockExistingRow = {
      extra_data: {},
      raw_tokens: {},
      theme_groups: [],
      branches: [],
    };
  });

  it("keeps small (<100 KB) payloads inline in Postgres", async () => {
    const req = new NextRequest("https://app.example.com/api/projects/snapshot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: "org_1",
        projectId: "proj_1",
        rawTokens: { core: { primary: { $value: "#112233", $type: "color" } } },
        branches: [],
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.storageMode).toBe("inline");
    expect(mockUploadSnapshot).not.toHaveBeenCalled();
  });

  it("offloads >=100 KB payloads to R2 and falls back gracefully if new columns are not migrated yet", async () => {
    mockFailColumnsOnce = true;
    mockUploadSnapshot.mockResolvedValue({
      key: "orgs/org_1/projects/proj_1/snapshots/abc.json.gz",
      hash: "abc",
      rawBytes: 130000,
      gzipBytes: 12000,
    });

    const largeSet: Record<string, any> = {};
    for (let i = 0; i < 1800; i++) {
      largeSet[`token-${i}`] = { $value: "#112233", $type: "color" };
    }

    const req = new NextRequest("https://app.example.com/api/projects/snapshot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: "org_1",
        projectId: "proj_1",
        rawTokens: { core: largeSet },
        branches: [
          {
            id: "b1",
            name: "main",
            title: "Main",
            isDefault: true,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
            createdBy: { name: "Dev", email: "dev@example.com" },
            rawTokens: { core: largeSet },
            themeGroups: [],
            commits: [],
            comments: [],
          },
        ],
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.storageMode).toBe("r2");
    expect(body.gzipBytes).toBe(12000);
    expect(mockUploadSnapshot).toHaveBeenCalledTimes(1);
    expect(mockUpdateCalls).toHaveLength(2);
    expect(mockUpdateCalls[1].raw_tokens).toEqual({});
    expect(mockUpdateCalls[1].branches[0].rawTokens).toEqual({});
    expect(mockUpdateCalls[1].extra_data.r2Snapshot.key).toBe("orgs/org_1/projects/proj_1/snapshots/abc.json.gz");
  });

  it("hydrates R2-offloaded snapshots on GET", async () => {
    mockExistingRow = {
      storage_mode: "r2",
      snapshot_r2_key: "orgs/org_1/projects/proj_1/snapshots/abc.json.gz",
      snapshot_hash: "abc",
      extra_data: { r2Snapshot: { storageMode: "r2", key: "orgs/org_1/projects/proj_1/snapshots/abc.json.gz" } },
      theme_groups: [],
      branches: [],
    };
    mockLoadSnapshot.mockResolvedValue({
      rawTokens: { core: { primary: { $value: "#ff0000", $type: "color" } } },
      themeGroups: [],
      branches: [],
    });

    const req = new NextRequest("https://app.example.com/api/projects/snapshot?orgId=org_1&projectId=proj_1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.storageMode).toBe("r2");
    expect(body.rawTokens.core.primary.$value).toBe("#ff0000");
  });
});
