import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/auth", () => ({
  authenticateRequest: vi.fn(async () => ({ isValid: false, error: "Unauthorized" })),
}));

import { DELETE, GET, POST } from "../route";

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
  });

  it("does not expose stateful GET or DELETE behavior", async () => {
    const getResponse = await GET(new NextRequest("https://app.example.com/api/v1/mcp"));
    const deleteResponse = await DELETE(new NextRequest("https://app.example.com/api/v1/mcp", { method: "DELETE" }));

    expect(getResponse.status).toBe(405);
    expect(deleteResponse.status).toBe(405);
  });
});
