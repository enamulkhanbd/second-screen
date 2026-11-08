import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

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

import { roleMayGrant, inviterMayGrant } from "@/lib/invitations";
import { POST as acceptInvitationPOST } from "../[token]/accept/route";

function makeSameOriginRequest(url: string, body?: Record<string, any>): NextRequest {
  const parsed = new URL(url);
  return new NextRequest(url, {
    method: "POST",
    headers: {
      origin: parsed.origin,
      "content-type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("H1 / R2 & R8 — Invitation RLS policy inventory & server-side authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converges on the exact six hardened policies on public.invitations across all SQL migrations (R8)", () => {
    const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const activePolicies = new Set<string>();
    let hasInsertGuardTrigger = false;

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

      const dropRegex =
        /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ON\s+(?:public\.)?invitations\b/gi;
      let match: RegExpExecArray | null;
      while ((match = dropRegex.exec(sql)) !== null) {
        activePolicies.delete(match[1]);
      }

      const createRegex =
        /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?invitations\b/gi;
      while ((match = createRegex.exec(sql)) !== null) {
        activePolicies.add(match[1]);
      }

      if (/CREATE\s+TRIGGER\s+invitations_insert_guard\b/i.test(sql)) {
        hasInsertGuardTrigger = true;
      }
    }

    expect(Array.from(activePolicies).sort()).toEqual(
      [
        "Admins can create invitations",
        "Admins can delete invitations",
        "Admins can update invitations",
        "Editors can revoke pending invitations",
        "Invitees and admins can view invitations",
        "Invitees can accept their invitation",
      ].sort()
    );
    expect(hasInsertGuardTrigger).toBe(true);
  });

  it("enforces roleMayGrant hierarchy (viewer denied, editor -> editor/viewer, admin -> non-owner, owner -> all)", () => {
    expect(roleMayGrant("viewer", "viewer")).toBe(false);
    expect(roleMayGrant("viewer", "editor")).toBe(false);
    expect(roleMayGrant("editor", "viewer")).toBe(true);
    expect(roleMayGrant("editor", "editor")).toBe(true);
    expect(roleMayGrant("editor", "admin")).toBe(false);
    expect(roleMayGrant("editor", "owner")).toBe(false);
    expect(roleMayGrant("admin", "viewer")).toBe(true);
    expect(roleMayGrant("admin", "editor")).toBe(true);
    expect(roleMayGrant("admin", "admin")).toBe(true);
    expect(roleMayGrant("admin", "owner")).toBe(false);
    expect(roleMayGrant("owner", "admin")).toBe(true);
    expect(roleMayGrant("owner", "owner")).toBe(true);
  });

  it("rejects acceptance with 403 and revokes invitation when an editor invited an admin (H1)", async () => {
    const futureIso = new Date(Date.now() + 86400_000).toISOString();
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "uid_invitee",
          email: "invitee@example.com",
          email_confirmed_at: new Date().toISOString(),
        },
      },
    });

    const updateStatusCalls: any[] = [];
    const insertMemberCalls: any[] = [];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "invitations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "inv_escalated",
                  org_id: "org_1",
                  org_name: "Acme",
                  email: "invitee@example.com",
                  role: "admin",
                  inviter_uid: "uid_editor",
                  inviter_email: "editor@example.com",
                  inviter_name: "Editor",
                  token: "tok_secret_123",
                  status: "pending",
                  created_at: new Date().toISOString(),
                  expires_at: futureIso,
                },
              }),
            }),
          }),
          update: (payload: any) => {
            updateStatusCalls.push(payload);
            return {
              eq: () => ({
                eq: async () => ({ data: [{ id: "inv_escalated" }], error: null }),
              }),
            };
          },
        };
      }

      if (table === "organizations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: "org_1", slug: "acme", owner_uid: "uid_owner" },
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
                maybeSingle: async () => ({
                  data: { role: "editor" }, // inviter is only an editor!
                  error: null,
                }),
              }),
            }),
          }),
          insert: (payload: any) => {
            insertMemberCalls.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const req = makeSameOriginRequest("https://app.example.com/api/invitations/tok_secret_123/accept");
    const res = await acceptInvitationPOST(req, { params: { token: "tok_secret_123" } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe("inviter_not_authorized");
    expect(updateStatusCalls).toEqual([{ status: "revoked" }]);
    expect(insertMemberCalls).toHaveLength(0);
  });

  it("returns 409 and does not insert membership when pending->accepted update affects 0 rows (A4)", async () => {
    const futureIso = new Date(Date.now() + 86400_000).toISOString();
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "uid_invitee",
          email: "invitee@example.com",
          email_confirmed_at: new Date().toISOString(),
        },
      },
    });

    const insertMemberCalls: any[] = [];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "invitations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "inv_race",
                  org_id: "org_1",
                  org_name: "Acme",
                  email: "invitee@example.com",
                  role: "editor",
                  inviter_uid: "uid_owner",
                  inviter_email: "owner@example.com",
                  inviter_name: "Owner",
                  token: "tok_race_123",
                  status: "pending",
                  created_at: new Date().toISOString(),
                  expires_at: futureIso,
                },
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: async () => ({ data: [], error: null }), // 0 rows updated (already accepted concurrently)
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
                data: { id: "org_1", slug: "acme", owner_uid: "uid_owner" },
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
              ilike: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
          insert: (payload: any) => {
            insertMemberCalls.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const req = makeSameOriginRequest("https://app.example.com/api/invitations/tok_race_123/accept");
    const res = await acceptInvitationPOST(req, { params: { token: "tok_race_123" } });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe("already_accepted");
    expect(insertMemberCalls).toHaveLength(0);
  });

  it("creates exactly one membership when inviter is authorized and invitation is pending", async () => {
    const futureIso = new Date(Date.now() + 86400_000).toISOString();
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "uid_invitee",
          email: "invitee@example.com",
          email_confirmed_at: new Date().toISOString(),
          user_metadata: { full_name: "Invitee User" },
        },
      },
    });

    const insertMemberCalls: any[] = [];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "invitations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "inv_ok",
                  org_id: "org_1",
                  org_name: "Acme",
                  email: "invitee@example.com",
                  role: "admin",
                  inviter_uid: "uid_owner",
                  inviter_email: "owner@example.com",
                  inviter_name: "Owner",
                  token: "tok_ok_123",
                  status: "pending",
                  created_at: new Date().toISOString(),
                  expires_at: futureIso,
                },
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: async () => ({ data: [{ id: "inv_ok" }], error: null }),
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
                data: { id: "org_1", slug: "acme", owner_uid: "uid_owner" },
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
              ilike: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
          insert: (payload: any) => {
            insertMemberCalls.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const req = makeSameOriginRequest("https://app.example.com/api/invitations/tok_ok_123/accept");
    const res = await acceptInvitationPOST(req, { params: { token: "tok_ok_123" } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, orgId: "org_1", orgSlug: "acme" });
    expect(insertMemberCalls).toHaveLength(1);
    expect(insertMemberCalls[0].role).toBe("admin");
  });
});

