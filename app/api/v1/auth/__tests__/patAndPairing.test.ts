import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {},
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

import { generateApiKey } from "@/utils/patAuth";
import {
  deleteApiKey,
  findApiKeyByHash,
  saveApiKey,
  __clearInMemoryApiKeysForTests,
} from "@/utils/cloudStorage";
import { authenticateRequest } from "@/utils/auth";
import { DELETE as deletePatRoute } from "../pat/route";
import { POST as pairPostRoute, GET as pairGetRoute } from "../pair/route";
import {
  MAX_PAIRING_MAP_SIZE,
  PAIRING_RATE_LIMIT_PER_MIN,
  prunePairingSessions,
  __getPairingSessionsForTests,
  __resetPairingStateForTests,
} from "../pair/pairingStore";

describe("M1 / A5 / P2 — API key revocation and indexed key_hash lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __clearInMemoryApiKeysForTests();
  });

  it("returns 500 when Supabase delete fails and keeps key active (M1)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user_1", email: "user1@example.com" } },
      error: null,
    });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "api_keys") {
        return {
          delete: () => ({
            eq: () => ({
              eq: () => ({
                select: async () => ({
                  data: null,
                  error: { message: "db connection lost" },
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const req = new NextRequest("https://app.example.com/api/v1/auth/pat?id=pat-123", {
      method: "DELETE",
      headers: { origin: "https://app.example.com" },
    });
    const res = await deletePatRoute(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });

  it("returns 404 when a non-owner attempts to revoke a key", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user_attacker", email: "other@example.com" } },
      error: null,
    });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "api_keys") {
        return {
          delete: () => ({
            eq: () => ({
              eq: () => ({
                select: async () => ({
                  data: [], // 0 rows matched (id, ownerUid)
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const req = new NextRequest("https://app.example.com/api/v1/auth/pat?id=pat-victim", {
      method: "DELETE",
      headers: { origin: "https://app.example.com" },
    });
    const res = await deletePatRoute(req);
    expect(res.status).toBe(404);
  });

  it("queries api_keys by key_hash (never select(*)) and immediately rejects keys revoked on another instance (P2 / A5)", async () => {
    const { plaintextKey, record } = generateApiKey("CI Token", ["read:tokens"], undefined, {
      uid: "user_1",
      userEmail: "user1@example.com",
    });

    const dbKeysByHash = new Map<string, any>();
    dbKeysByHash.set(record.keyHash, {
      id: record.id,
      name: record.name,
      key_prefix: record.keyPrefix,
      key_hash: record.keyHash,
      scopes: record.scopes,
      created_at: record.createdAt,
      expires_at: null,
      user_id: record.uid,
      user_email: record.userEmail,
    });

    const selectColumnsSeen: string[] = [];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "api_keys") {
        return {
          upsert: async () => ({ error: null }),
          select: (cols: string) => {
            selectColumnsSeen.push(cols);
            return {
              eq: (col: string, val: string) => {
                expect(col).toBe("key_hash");
                return {
                  maybeSingle: async () => ({
                    data: dbKeysByHash.get(val) ?? null,
                    error: null,
                  }),
                };
              },
            };
          },
          delete: () => ({
            eq: (_col1: string, idVal: string) => ({
              eq: (_col2: string, ownerVal: string) => ({
                select: async () => {
                  const found = Array.from(dbKeysByHash.values()).find(
                    (r) => r.id === idVal && r.user_id === ownerVal
                  );
                  if (!found) return { data: [], error: null };
                  dbKeysByHash.delete(found.key_hash);
                  return { data: [{ id: idVal }], error: null };
                },
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    // Save on instance A (which previously would have cached in inMemoryApiKeys)
    await saveApiKey(record);

    // Validate on instance B
    const req1 = new NextRequest("https://app.example.com/api/v1/tokens", {
      headers: { authorization: `Bearer ${plaintextKey}` },
    });
    const auth1 = await authenticateRequest(req1, "read:tokens");
    expect(auth1.isValid).toBe(true);
    expect(selectColumnsSeen.every((c) => c !== "*")).toBe(true);

    // Revoke via DB (simulating revocation on another instance)
    const deleted = await deleteApiKey(record.id, "user_1");
    expect(deleted).toBe(true);

    // Next request on any instance must immediately fail
    const auth2 = await authenticateRequest(req1, "read:tokens");
    expect(auth2.isValid).toBe(false);
    expect(await findApiKeyByHash(record.keyHash)).toBeNull();
  });
});

describe("P3 / A6 — Pairing session origin, map pruning, rate limiting, and PAT scrubbing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetPairingStateForTests();
    mockAdminFrom.mockImplementation(() => ({
      upsert: async () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
      delete: () => ({ eq: async () => ({ error: null }) }),
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }));
  });

  it("builds connectUrl from the request origin instead of a hardcoded production domain (A6)", async () => {
    const req = new NextRequest("https://staging-preview.example.org/api/v1/auth/pair", {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.1" },
    });

    const res = await pairPostRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.connectUrl).toBe(`https://staging-preview.example.org/connect?code=${body.code}`);
  });

  it("enforces per-IP rate limiting on POST /api/v1/auth/pair with 429 and Retry-After (P3)", async () => {
    const makeReq = () =>
      new NextRequest("https://app.example.com/api/v1/auth/pair", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.42" },
      });

    for (let i = 0; i < PAIRING_RATE_LIMIT_PER_MIN; i++) {
      const okRes = await pairPostRoute(makeReq());
      expect(okRes.status).toBe(200);
    }

    const throttledRes = await pairPostRoute(makeReq());
    const body = await throttledRes.json();

    expect(throttledRes.status).toBe(429);
    expect(body.code).toBe("rate_limited");
    expect(Number(throttledRes.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("prunes expired sessions and caps pairingSessions map at MAX_PAIRING_MAP_SIZE", () => {
    const map = __getPairingSessionsForTests();
    const now = Date.now();

    // Add 5 expired entries
    for (let i = 0; i < 5; i++) {
      map.set(`EXP-${i}`, {
        code: `EXP-${i}`,
        status: "pending",
        createdAt: now - 20_000,
        expiresAt: now - 1_000,
      });
    }

    // Add MAX_PAIRING_MAP_SIZE + 20 valid entries
    for (let i = 0; i < MAX_PAIRING_MAP_SIZE + 20; i++) {
      map.set(`VALID-${i}`, {
        code: `VALID-${i}`,
        status: "pending",
        createdAt: now + i,
        expiresAt: now + 600_000,
      });
    }

    prunePairingSessions(now);
    expect(map.has("EXP-0")).toBe(false);
    expect(map.size).toBeLessThan(MAX_PAIRING_MAP_SIZE);
  });

  it("scrubs plaintext PAT immediately after the first GET that returns an approved session (A6)", async () => {
    const map = __getPairingSessionsForTests();
    const now = Date.now();
    map.set("ABCD-2345", {
      code: "ABCD-2345",
      status: "approved",
      createdAt: now,
      expiresAt: now + 600_000,
      pat: "sec_pat_live_secret123",
      orgId: "org_1",
      projectId: "proj_1",
    });

    const updateCalls: any[] = [];
    mockAdminFrom.mockImplementation(() => ({
      update: (payload: any) => {
        updateCalls.push(payload);
        return { eq: async () => ({ error: null }) };
      },
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }));

    const getReq = new NextRequest("https://app.example.com/api/v1/auth/pair?code=ABCD-2345");
    const res1 = await pairGetRoute(getReq);
    const body1 = await res1.json();

    expect(body1.status).toBe("approved");
    expect(body1.pat).toBe("sec_pat_live_secret123");
    expect(map.get("ABCD-2345")?.pat).toBeUndefined();
    expect(updateCalls).toEqual([{ pat: null }]);
  });
});

