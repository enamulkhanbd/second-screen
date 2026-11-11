import { describe, expect, it, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { getTrustedCorsHeaders } from "../cors";

afterEach(() => {
  delete process.env.SECOND_SCREEN_TRUSTED_ORIGINS;
});

describe("trusted CORS", () => {
  it("allows the request origin when it is explicitly configured", () => {
    process.env.SECOND_SCREEN_TRUSTED_ORIGINS = "https://app.example.com, https://staging.example.com";
    const req = new NextRequest("https://app.example.com/api/v1/auth/pat", {
      headers: { origin: "https://app.example.com" },
    });

    expect(getTrustedCorsHeaders(req)["Access-Control-Allow-Origin"]).toBe("https://app.example.com");
  });

  it("does not return wildcard or credential access for an unknown origin", () => {
    process.env.SECOND_SCREEN_TRUSTED_ORIGINS = "https://app.example.com";
    const req = new NextRequest("https://app.example.com/api/v1/auth/pat", {
      headers: { origin: "https://evil.example.com" },
    });
    const headers = getTrustedCorsHeaders(req);

    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
  });
});
