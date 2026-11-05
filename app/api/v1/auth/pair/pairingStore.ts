import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export interface PairingSession {
  code: string;
  status: "pending" | "approved" | "expired";
  createdAt: number;
  expiresAt: number;
  serverUrl?: string;
  pat?: string;
  orgId?: string;
  projectId?: string;
  orgName?: string;
  projectName?: string;
}

export const MAX_PAIRING_MAP_SIZE = 1000;
export const PAIRING_RATE_LIMIT_PER_MIN = 10;
export const PAIRING_RATE_LIMIT_PER_HOUR = 60;
const APPROVED_RETENTION_MS = 5 * 60 * 1000; // 5 minutes
const EXPIRED_DB_RETENTION_MS = 60 * 60 * 1000; // 1 hour

export const PAIRING_SELECT_COLUMNS =
  "code,status,created_at,expires_at,server_url,pat,org_id,project_id,org_name,project_name";

// In-memory runtime cache (bounded)
export const pairingSessions = new Map<string, PairingSession>();

// Per-IP sliding window timestamps (ms) for POST rate limiting
const pairingRateBuckets = new Map<string, number[]>();

export function getDbClient() {
  return createAdminClient();
}

export function getRequestOrigin(req: NextRequest): string {
  if (req?.nextUrl?.origin && req.nextUrl.origin !== "null") {
    return req.nextUrl.origin.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "local";
}

export function checkPairingRateLimit(
  ip: string,
  now: number = Date.now()
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  if (process.env.PAIRING_RATE_LIMIT === "off") {
    return { allowed: true };
  }

  const key = ip || "local";
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneMinAgo = now - 60 * 1000;

  const existing = (pairingRateBuckets.get(key) || []).filter((ts) => ts > oneHourAgo);

  if (existing.length >= PAIRING_RATE_LIMIT_PER_HOUR) {
    const oldestInHour = existing[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInHour + 60 * 60 * 1000 - now) / 1000));
    pairingRateBuckets.set(key, existing);
    return { allowed: false, retryAfterSeconds };
  }

  const inLastMinute = existing.filter((ts) => ts > oneMinAgo);
  if (inLastMinute.length >= PAIRING_RATE_LIMIT_PER_MIN) {
    const oldestInMin = inLastMinute[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInMin + 60 * 1000 - now) / 1000));
    pairingRateBuckets.set(key, existing);
    return { allowed: false, retryAfterSeconds };
  }

  existing.push(now);
  pairingRateBuckets.set(key, existing);

  if (pairingRateBuckets.size > MAX_PAIRING_MAP_SIZE) {
    for (const [k, timestamps] of Array.from(pairingRateBuckets.entries())) {
      const active = timestamps.filter((t) => t > oneHourAgo);
      if (active.length === 0) {
        pairingRateBuckets.delete(k);
      } else {
        pairingRateBuckets.set(k, active);
      }
    }
  }

  return { allowed: true };
}

/**
 * Prunes expired sessions, stale approved sessions (> 5 min), and enforces
 * MAX_PAIRING_MAP_SIZE (oldest-first eviction).
 */
export function prunePairingSessions(now: number = Date.now()): number {
  let removed = 0;

  for (const [code, session] of Array.from(pairingSessions.entries())) {
    const isExpired = session.expiresAt < now;
    const isStaleApproved =
      session.status === "approved" && now - session.createdAt > APPROVED_RETENTION_MS;
    if (isExpired || isStaleApproved) {
      pairingSessions.delete(code);
      removed++;
    }
  }

  if (pairingSessions.size >= MAX_PAIRING_MAP_SIZE) {
    const sortedByAge = Array.from(pairingSessions.entries()).sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    );
    const excess = pairingSessions.size - MAX_PAIRING_MAP_SIZE + 1;
    for (let i = 0; i < excess && i < sortedByAge.length; i++) {
      pairingSessions.delete(sortedByAge[i][0]);
      removed++;
    }
  }

  return removed;
}

/**
 * Cleans up expired and stale approved pairing sessions in Supabase and in memory.
 */
export async function cleanupPairingSessionsStorage(now: number = Date.now()): Promise<{
  memoryPruned: number;
  dbDeleted: number;
}> {
  const memoryPruned = prunePairingSessions(now);
  let dbDeleted = 0;

  if (isSupabaseConfigured) {
    try {
      const client = getDbClient();
      const expiredCutoff = now - EXPIRED_DB_RETENTION_MS;
      const approvedCutoff = now - APPROVED_RETENTION_MS;

      const [{ data: expRows }, { data: appRows }] = await Promise.all([
        client
          .from("pairing_sessions")
          .delete()
          .lt("expires_at", expiredCutoff)
          .select("code"),
        client
          .from("pairing_sessions")
          .delete()
          .eq("status", "approved")
          .lt("created_at", approvedCutoff)
          .select("code"),
      ]);
      dbDeleted = (expRows?.length ?? 0) + (appRows?.length ?? 0);
    } catch (e) {
      console.warn("Supabase pairing session cleanup error:", e);
    }
  }

  return { memoryPruned, dbDeleted };
}

export function __getPairingSessionsForTests(): Map<string, PairingSession> {
  return pairingSessions;
}

export function __resetPairingStateForTests(): void {
  pairingSessions.clear();
  pairingRateBuckets.clear();
}

