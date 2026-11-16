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
import { DELETE as deletePatRoute, POST as postPatRoute } from "../pat/route";
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

describe("MCP credential creation across roles (including viewer)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __clearInMemoryApiKeysForTests();
    delete process.env.MCP_WRITE_ENABLED;
  });

  function mockMembershipDb(options: {
    ownerUid?: string;
    memberByUserId?: Array<{ role: string }>;
    memberByEmail?: Array<{ role: string; user_id: string }>;
    onBackfill?: (payload: any) => void;
    onKeyUpsert?: (payload: any) => void;
  }) {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: "proj_1", org_id: "org_1", name: "Design System" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "organizations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: "org_1", name: "Acme", owner_uid: options.ownerUid || "owner_1" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "organization_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: async () => ({
                  data: options.memberByUserId ?? [],
                  error: null,
                }),
              }),
              ilike: () => ({
                limit: async () => ({
                  data: options.memberByEmail ?? [],
                  error: null,
                }),
              }),
            }),
          }),
          update: (payload: any) => {
            options.onBackfill?.(payload);
            return {
              eq: () => ({
                ilike: async () => ({ error: null }),
              }),
            };
          },
        };
      }
      if (table === "api_keys") {
        return {
          upsert: async (payload: any) => {
            options.onKeyUpsert?.(payload);
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
  }

  it("allows viewer role to create a project-bound MCP token", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "viewer_1",
          email: "viewer@example.com",
          email_confirmed_at: "2026-11-01T00:00:00.000Z",
        },
      },
      error: null,
    });
    const upserted: any[] = [];
    mockMembershipDb({
      memberByUserId: [{ role: "viewer" }],
      onKeyUpsert: (payload) => upserted.push(payload),
    });

    const req = new NextRequest("https://app.example.com/api/v1/auth/pat", {
      method: "POST",
      headers: {
        origin: "https://app.example.com",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Viewer Cursor Key",
        scopes: ["read:tokens"],
        expiresInDays: 90,
        credentialType: "mcp_project",
        orgId: "org_1",
        projectId: "proj_1",
      }),
    });

    const res = await postPatRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.token).toMatch(/^sec_pat_live_/);
    expect(body.record.credentialType).toBe("mcp_project");
    expect(body.record.scopes).toEqual(["read:tokens"]);
    expect(upserted).toHaveLength(1);
    expect(upserted[0].user_id).toBe("viewer_1");
  });

  it("resolves viewer membership by verified email and backfills stale user_id", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "viewer_new_uid",
          email: "viewer@example.com",
          email_confirmed_at: "2026-11-01T00:00:00.000Z",
        },
      },
      error: null,
    });
    const backfills: any[] = [];
    mockMembershipDb({
      memberByUserId: [],
      memberByEmail: [{ role: "viewer", user_id: "pending_or_old_uid" }],
      onBackfill: (payload) => backfills.push(payload),
    });

    const req = new NextRequest("http://app.example.com/api/v1/auth/pat", {
      method: "POST",
      headers: {
        origin: "https://app.example.com",
        "x-forwarded-proto": "https",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Viewer Email Matched Key",
        scopes: ["read:tokens"],
        credentialType: "mcp_project",
        orgId: "org_1",
        projectId: "proj_1",
      }),
    });

    const res = await postPatRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(backfills).toEqual([{ user_id: "viewer_new_uid" }]);
  });

  it("forbids viewer from minting write:tokens on mcp_project when MCP writes are open, while allowing editor", async () => {
    process.env.MCP_WRITE_ENABLED = "true";

    mockGetUser.mockResolvedValue({
      data: { user: { id: "viewer_1", email: "viewer@example.com" } },
      error: null,
    });
    mockMembershipDb({ memberByUserId: [{ role: "viewer" }] });

    const viewerWriteRes = await postPatRoute(new NextRequest("https://app.example.com/api/v1/auth/pat", {
      method: "POST",
      headers: { origin: "https://app.example.com", "content-type": "application/json" },
      body: JSON.stringify({
        name: "Viewer Write Attempt",
        scopes: ["read:tokens", "write:tokens"],
        credentialType: "mcp_project",
        orgId: "org_1",
        projectId: "proj_1",
      }),
    }));
    expect(viewerWriteRes.status).toBe(403);

    mockGetUser.mockResolvedValue({
      data: { user: { id: "editor_1", email: "editor@example.com" } },
      error: null,
    });
    mockMembershipDb({ memberByUserId: [{ role: "editor" }] });

    const editorWriteRes = await postPatRoute(new NextRequest("https://app.example.com/api/v1/auth/pat", {
      method: "POST",
      headers: { origin: "https://app.example.com", "content-type": "application/json" },
      body: JSON.stringify({
        name: "Editor Write Key",
        scopes: ["read:tokens", "write:tokens"],
        credentialType: "mcp_project",
        orgId: "org_1",
        projectId: "proj_1",
      }),
    }));
    const editorBody = await editorWriteRes.json();
    expect(editorWriteRes.status).toBe(200);
    expect(editorBody.record.scopes).toEqual(["read:tokens", "write:tokens"]);
  });
});

