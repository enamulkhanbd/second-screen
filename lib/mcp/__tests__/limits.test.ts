import { beforeEach, describe, expect, it } from "vitest";
import { consumeMcpRateLimit, __resetMcpRateLimitsForTests } from "../limits";

beforeEach(() => __resetMcpRateLimitsForTests());

describe("MCP rate limits", () => {
  it("allows up to the configured limit and then returns Retry-After", () => {
    expect(consumeMcpRateLimit("credential:project", { limit: 2, windowMs: 60_000, now: 1_000 })).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(consumeMcpRateLimit("credential:project", { limit: 2, windowMs: 60_000, now: 1_001 })).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(consumeMcpRateLimit("credential:project", { limit: 2, windowMs: 60_000, now: 1_002 })).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    });
  });

  it("isolates keys and resets an expired window", () => {
    expect(consumeMcpRateLimit("one", { limit: 1, windowMs: 100, now: 1_000 }).allowed).toBe(true);
    expect(consumeMcpRateLimit("two", { limit: 1, windowMs: 100, now: 1_001 }).allowed).toBe(true);
    expect(consumeMcpRateLimit("one", { limit: 1, windowMs: 100, now: 1_100 }).allowed).toBe(true);
  });
});
