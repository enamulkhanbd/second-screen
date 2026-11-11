export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function consumeMcpRateLimit(
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
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - bucket.count),
    retryAfterSeconds: 0,
  };
}

export function __resetMcpRateLimitsForTests() {
  buckets.clear();
}
