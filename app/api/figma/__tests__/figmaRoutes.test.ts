import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuthenticateRequest = vi.fn();

vi.mock("@/utils/auth", () => ({
  authenticateRequest: (...args: any[]) => mockAuthenticateRequest(...args),
}));

import { POST as fetchAssetsPOST } from "../fetch-assets/route";
import { POST as fetchVariablesPOST } from "../fetch-variables/route";

describe("P1 / R5 — Figma routes bounded concurrency, 429 retry, and timeout handling", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateRequest.mockResolvedValue({
      isValid: true,
      record: { id: "pat-1", uid: "user_1", scopes: ["read:tokens"] },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 504 timeout when Figma variables API aborts/times out", async () => {
    global.fetch = vi.fn(async () => {
      const err: any = new Error("The operation was aborted due to timeout");
      err.name = "TimeoutError";
      throw err;
    }) as any;

    const req = new NextRequest("https://app.example.com/api/figma/fetch-variables", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileKey: "abc123", pat: "figd_test" }),
    });

    const res = await fetchVariablesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(504);
    expect(body.code).toBe("timeout");
  });

  it("honours 429 Retry-After once and returns structured partial results on asset failures", async () => {
    let imageCallCount = 0;

    global.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("/v1/files/file123")) {
        return new Response(
          JSON.stringify({
            name: "Design System",
            document: {
              id: "0:0",
              type: "DOCUMENT",
              children: [
                { id: "1:1", name: "Icon / Check", type: "COMPONENT" },
                { id: "1:2", name: "Icon / Close", type: "COMPONENT" },
              ],
            },
          }),
          { status: 200 }
        );
      }

      if (u.includes("/v1/images/file123")) {
        imageCallCount++;
        if (imageCallCount === 1) {
          return new Response("Rate limited", {
            status: 429,
            headers: { "Retry-After": "0.1" },
          });
        }
        return new Response(
          JSON.stringify({
            images: {
              "1:1": "https://figma-cdn.example.com/1-1.svg",
              "1:2": null,
            },
          }),
          { status: 200 }
        );
      }

      if (u.includes("figma-cdn.example.com/1-1.svg")) {
        return new Response('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>', {
          status: 200,
        });
      }

      return new Response("Not found", { status: 404 });
    }) as any;

    const req = new NextRequest("https://app.example.com/api/figma/fetch-assets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileKey: "file123", pat: "figd_test" }),
    });

    const res = await fetchAssetsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(imageCallCount).toBe(2);
    expect(body.success).toBe(true);
    expect(body.assets).toHaveLength(1);
    expect(body.failed).toEqual([{ id: "1:2", reason: "missing_render_url" }]);
    expect(body.truncated).toBe(false);
    expect(body.timedOut).toBe(false);
  });
});

