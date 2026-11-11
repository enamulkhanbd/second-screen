import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  configured: boolean;
  unavailable?: boolean;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let sharedLimiter: Ratelimit | null | undefined;

function localLimit(
  key: string,
  options: { limit: number; windowMs: number; now?: number },
): RateLimitDecision {
  const now = options.now ?? Date.now();
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : existing;

  if (bucket.count >= options.limit) {
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      configured: false,
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - bucket.count),
    retryAfterSeconds: 0,
    configured: false,
  };
}

function getSharedLimiter(limit: number): Ratelimit | null {
  if (sharedLimiter !== undefined) return sharedLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    sharedLimiter = null;
    return null;
  }

  sharedLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, "1 m"),
    prefix: "second-screen:mcp",
    analytics: false,
  });
  return sharedLimiter;
}

export async function consumeMcpRateLimitAsync(
  key: string,
  options: { limit: number; windowMs: number; now?: number },
): Promise<RateLimitDecision> {
  const limiter = getSharedLimiter(options.limit);
  if (!limiter) {
    if (process.env.MCP_REQUIRE_SHARED_LIMITER === "true") {
      return { allowed: false, remaining: 0, retryAfterSeconds: 5, configured: false, unavailable: true };
    }
    return localLimit(key, options);
  }

  try {
    const result = await limiter.limit(key);
    return {
      allowed: result.success,
      remaining: Math.max(0, result.remaining),
      retryAfterSeconds: result.success ? 0 : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      configured: true,
    };
  } catch {
    if (process.env.MCP_REQUIRE_SHARED_LIMITER === "true") {
      return { allowed: false, remaining: 0, retryAfterSeconds: 5, configured: true, unavailable: true };
    }
    return localLimit(key, options);
  }
}

export function consumeMcpRateLimit(
  key: string,
  options: { limit: number; windowMs: number; now?: number },
): RateLimitDecision {
  return localLimit(key, options);
}

export function __resetMcpRateLimitsForTests() {
  buckets.clear();
  sharedLimiter = undefined;
}
