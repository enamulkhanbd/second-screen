import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/auth", () => ({
  resolveTrustedRequestOrigins: vi.fn((req: NextRequest) => [req.nextUrl.origin]),
  authenticateRequest: vi.fn(async () => ({ isValid: false, error: "Unauthorized" })),
}));

import { DELETE, GET, POST } from "../route";
import { authenticateRequest } from "@/utils/auth";
import { __resetMcpObservabilityForTests, getMcpProjectAnalytics } from "@/lib/mcp/observability";

const mockedAuthenticateRequest = vi.mocked(authenticateRequest);

afterEach(() => {
  __resetMcpObservabilityForTests();
  mockedAuthenticateRequest.mockReset();
  mockedAuthenticateRequest.mockResolvedValue({ isValid: false, error: "Unauthorized" });
});

describe("MCP HTTP route", () => {
  it("rejects unauthenticated POST requests before parsing or dispatching", async () => {
    const response = await POST(new NextRequest("https://app.example.com/api/v1/mcp", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.message).toBe("Unauthorized.");
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
  });

  it("rejects non-project credentials before dispatching MCP requests", async () => {
    mockedAuthenticateRequest.mockResolvedValue({
      isValid: true,
      record: { uid: "user-1", credentialType: undefined } as any,
    });
    const response = await POST(new NextRequest("https://app.example.com/api/v1/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-boundary" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(-32003);
    expect(response.headers.get("X-Request-Id")).toBe("req-boundary");
  });

  it("rejects JSON-RPC batches before MCP dispatch", async () => {
    mockedAuthenticateRequest.mockResolvedValue({
      isValid: true,
      record: { uid: "user-1", credentialType: "mcp_project", keyHash: "hash-1" } as any,
    });
    const response = await POST(new NextRequest("https://app.example.com/api/v1/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([{ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }]),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("batch");
  });

  it("rejects oversized bodies without relying on content-length", async () => {
    mockedAuthenticateRequest.mockResolvedValue({
      isValid: true,
      record: { uid: "user-1", credentialType: "mcp_project", keyHash: "hash-2" } as any,
    });
    const response = await POST(new NextRequest("https://app.example.com/api/v1/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {}, padding: "x".repeat(140 * 1024) }),
    }));

    expect(response.status).toBe(413);
  });

  it("does not expose stateful GET or DELETE behavior", async () => {
    const getResponse = await GET(new NextRequest("https://app.example.com/api/v1/mcp"));
    const deleteResponse = await DELETE(new NextRequest("https://app.example.com/api/v1/mcp", { method: "DELETE" }));

    expect(getResponse.status).toBe(405);
    expect(deleteResponse.status).toBe(405);
  });

  it("captures specific errorClass, errorMessage, and responseBytes on 400 and 406 rejections", async () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      mockedAuthenticateRequest.mockResolvedValue({
        isValid: true,
        record: {
          id: "key-telemetry-1",
          uid: "user-1",
          name: "Test Token",
          keyPrefix: "sec_pat_test",
          keyHash: "hash-telemetry",
          credentialType: "mcp_project",
          orgId: "org-telemetry",
          projectId: "proj-telemetry",
        } as any,
      });

      const invalidJsonRes = await POST(new NextRequest("https://app.example.com/api/v1/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json",
      }));
      expect(invalidJsonRes.status).toBe(400);

      const missingAcceptRes = await POST(new NextRequest("https://app.example.com/api/v1/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } },
        }),
      }));
      expect(missingAcceptRes.status).toBe(406);

      const analytics = await getMcpProjectAnalytics("org-telemetry", "proj-telemetry", "24h");
      expect(analytics.recentEvents).toHaveLength(2);
      const byMethod = Object.fromEntries(analytics.recentEvents.map((e) => [e.rpcMethod, e]));
      expect(byMethod.invalid_json.errorClass).toBe("INVALID_JSON");
      expect(byMethod.invalid_json.errorMessage).toContain("valid JSON");
      expect(byMethod.invalid_json.responseBytes).toBeGreaterThan(0);

      expect(byMethod.initialize.errorClass).toBe("NOT_ACCEPTABLE");
      expect(byMethod.initialize.errorMessage).toContain("application/json and text/event-stream");
      expect(byMethod.initialize.responseBytes).toBe(142);
    } finally {
      if (prevUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      if (prevRole !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevRole;
    }
  });
});
