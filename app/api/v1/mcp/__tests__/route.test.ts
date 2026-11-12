import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/auth", () => ({
  authenticateRequest: vi.fn(async () => ({ isValid: false, error: "Unauthorized" })),
}));

import { DELETE, GET, POST } from "../route";
import { authenticateRequest } from "@/utils/auth";

const mockedAuthenticateRequest = vi.mocked(authenticateRequest);

afterEach(() => {
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
});
