import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/auth", () => ({
  authorizeProjectRequest: vi.fn(async () => ({
    authorized: false,
    status: 401,
    error: "Unauthorized",
  })),
}));

vi.mock("@/lib/mcp/observability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/mcp/observability")>("@/lib/mcp/observability");
  return {
    ...actual,
    getMcpProjectAnalytics: vi.fn(async (_orgId: string, _projectId: string, range: "24h" | "7d" | "30d") => ({
      available: true,
      source: "supabase" as const,
      range,
      summary: {
        totalRequests: 12,
        toolCalls: 10,
        successCount: 11,
        toolErrorCount: 1,
        rateLimitedCount: 0,
        clientErrorCount: 0,
        serverErrorCount: 0,
        errorCount: 1,
        successRate: 91.7,
        avgDurationMs: 42,
        p95DurationMs: 110,
        totalResponseBytes: 8400,
        activeKeysCount: 1,
      },
      timeline: [],
      byTool: [],
      byKey: [],
      byMethod: [],
      clients: [],
      recentEvents: [],
      health: {
        sharedRateLimiterConfigured: false,
        rateLimitPerMinute: 120,
        writeEnabled: false,
      },
    })),
  };
});

import { GET } from "../analytics/route";
import { authorizeProjectRequest } from "@/utils/auth";
import { getMcpProjectAnalytics } from "@/lib/mcp/observability";

const mockedAuthorize = vi.mocked(authorizeProjectRequest);
const mockedGetAnalytics = vi.mocked(getMcpProjectAnalytics);

afterEach(() => {
  mockedAuthorize.mockReset();
  mockedAuthorize.mockResolvedValue({
    authorized: false,
    status: 401,
    error: "Unauthorized",
  });
});

describe("MCP analytics route", () => {
  it("requires orgId and projectId query params", async () => {
    const res = await GET(new NextRequest("https://app.example.com/api/v1/mcp/analytics"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("orgId and projectId");
  });

  it("enforces project authorization before reading analytics", async () => {
    mockedAuthorize.mockResolvedValue({
      authorized: false,
      status: 403,
      error: "You are not a member of this organization.",
    });

    const res = await GET(
      new NextRequest("https://app.example.com/api/v1/mcp/analytics?orgId=org-1&projectId=proj-1"),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain("not a member");
    expect(mockedGetAnalytics).not.toHaveBeenCalled();
  });

  it("returns project-scoped analytics with no-store caching for authorized members", async () => {
    mockedAuthorize.mockResolvedValue({
      authorized: true,
      role: "viewer",
      record: { uid: "user-1" } as any,
    });

    const res = await GET(
      new NextRequest("https://app.example.com/api/v1/mcp/analytics?orgId=org-1&projectId=proj-1&range=24h"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(mockedAuthorize).toHaveBeenCalledWith(expect.anything(), "org-1", "proj-1", "read");
    expect(mockedGetAnalytics).toHaveBeenCalledWith("org-1", "proj-1", "24h");
    expect(body.summary.totalRequests).toBe(12);
    expect(body.range).toBe("24h");
  });
});
