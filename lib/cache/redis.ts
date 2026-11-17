import { Redis } from "@upstash/redis";

const KEY_PREFIX = "ss:v1:";
const MAX_CACHE_VALUE_BYTES = 200 * 1024; // 200 KB guard to protect Upstash free-tier quotas
const REDIS_OP_TIMEOUT_MS = 450;

let redisClient: Redis | null | undefined;

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Returns a shared Upstash REST Redis client, or null when unconfigured (e.g. local dev/tests).
 */
export function getRedisClient(): Redis | null {
  if (process.env.NODE_ENV === "test" && process.env.ENABLE_REDIS_IN_TESTS !== "true") {
    return null;
  }
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

function prefixKey(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`;
}

async function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), REDIS_OP_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Reads a JSON value from Upstash Redis. Fails open (returns null) on timeout or error.
 */
export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client || !key) return null;

  const value = await withTimeout<T | string | null>(
    client.get<T>(prefixKey(key)),
    null
  );
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

/**
 * Writes a JSON value to Upstash Redis with a TTL in seconds.
 * Skips oversized payloads (> 200 KB) to preserve free-tier bandwidth/storage.
 */
export async function cacheSetJson<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<boolean> {
  const client = getRedisClient();
  if (!client || !key || ttlSeconds <= 0) return false;

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return false;
  }

  if (Buffer.byteLength(serialized, "utf8") > MAX_CACHE_VALUE_BYTES) {
    return false;
  }

  const res = await withTimeout<unknown>(
    client.set(prefixKey(key), serialized, { ex: Math.max(1, Math.floor(ttlSeconds)) }),
    null
  );
  return res !== null;
}

/**
 * Deletes one or more cache keys. Fails open on error.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  const client = getRedisClient();
  const valid = keys.filter(Boolean).map(prefixKey);
  if (!client || valid.length === 0) return;

  await withTimeout<unknown>(client.del(...valid), 0);
}

/**
 * Resets cached client singleton (for tests).
 */
export function __resetRedisClientForTests(): void {
  redisClient = undefined;
}
