import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: class MockRedis {
    get = mockGet;
    set = mockSet;
    del = mockDel;
  },
}));

import {
  __resetRedisClientForTests,
  cacheDel,
  cacheGetJson,
  cacheSetJson,
  getRedisClient,
} from "../redis";

describe("lib/cache/redis free-tier safe cache wrapper", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    __resetRedisClientForTests();
    process.env = {
      ...origEnv,
      NODE_ENV: "test",
      ENABLE_REDIS_IN_TESTS: "true",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    };
  });

  afterEach(() => {
    process.env = { ...origEnv };
    __resetRedisClientForTests();
  });

  it("disables Redis client by default during NODE_ENV=test unless explicitly enabled", () => {
    delete process.env.ENABLE_REDIS_IN_TESTS;
    __resetRedisClientForTests();
    expect(getRedisClient()).toBeNull();
  });

  it("reads and writes JSON payloads with key prefix and TTL", async () => {
    mockSet.mockResolvedValue("OK");
    mockGet.mockResolvedValue(JSON.stringify({ role: "editor" }));

    const ok = await cacheSetJson("auth:role:1", { role: "editor" }, 60);
    expect(ok).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      "ss:v1:auth:role:1",
      JSON.stringify({ role: "editor" }),
      { ex: 60 }
    );

    const val = await cacheGetJson<{ role: string }>("auth:role:1");
    expect(val).toEqual({ role: "editor" });
    expect(mockGet).toHaveBeenCalledWith("ss:v1:auth:role:1");
  });

  it("skips payloads exceeding the 200 KB free-tier guard", async () => {
    const oversized = { data: "x".repeat(210 * 1024) };
    const ok = await cacheSetJson("big:key", oversized, 60);
    expect(ok).toBe(false);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("fails open when Redis operations reject", async () => {
    mockGet.mockRejectedValue(new Error("Upstash network down"));
    mockDel.mockRejectedValue(new Error("Upstash network down"));

    await expect(cacheGetJson("missing")).resolves.toBeNull();
    await expect(cacheDel("missing")).resolves.toBeUndefined();
  });
});
