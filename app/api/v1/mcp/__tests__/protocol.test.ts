import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/auth", () => ({
  authenticateRequest: vi.fn(async () => ({
    isValid: true,
    record: {
      id: "key-1",
      name: "MCP test key",
      keyPrefix: "sec_pat_test",
      keyHash: "hash-1",
      scopes: ["read:tokens"],
      uid: "user-1",
      credentialType: "mcp_project",
      orgId: "org-1",
      projectId: "project-1",
      createdAt: new Date().toISOString(),
    },
  })),
}));

import { POST } from "../route";

describe("MCP protocol", () => {
  it("answers initialize through the real Streamable HTTP transport", async () => {
    const response = await POST(new NextRequest("https://app.example.com/api/v1/mcp", {
      method: "POST",
      headers: {
        authorization: "Bearer sec_pat_test",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        origin: "https://app.example.com",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe(1);
    expect(body.result.serverInfo.name).toBe("second-screen-mcp");
    expect(body.result.capabilities.tools).toBeDefined();
  });
});
