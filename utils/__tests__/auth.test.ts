import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAdminFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("@/utils/cloudStorage", () => ({
  findApiKeyByHash: vi.fn(async () => null),
  getStoredApiKeysLegacy: vi.fn(async () => []),
}));

import {
  authorizeProjectRequest,
  canRoleWrite,
  hasTrustedMutationOrigin,
  resolveOrganizationRole,
} from "../auth";

describe("auth role and origin helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SECOND_SCREEN_TRUSTED_ORIGINS;
  });

  it("enforces write permission strictly for owner, admin, and editor (never viewer)", () => {
    expect(canRoleWrite("owner")).toBe(true);
    expect(canRoleWrite("admin")).toBe(true);
    expect(canRoleWrite("editor")).toBe(true);
    expect(canRoleWrite("viewer")).toBe(false);
    expect(canRoleWrite("")).toBe(false);
  });

  it("allows trusted forwarded-proto origins and configured SECOND_SCREEN_TRUSTED_ORIGINS", () => {
    const proxiedReq = new NextRequest("http://app.example.com/api/v1/auth/pat", {
      method: "POST",
      headers: {
        origin: "https://app.example.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(hasTrustedMutationOrigin(proxiedReq)).toBe(true);

    const untrustedReq = new NextRequest("https://app.example.com/api/v1/auth/pat", {
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    });
    expect(hasTrustedMutationOrigin(untrustedReq)).toBe(false);
  });

  it("authorizes viewer for read requests and rejects viewer for write requests", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: "proj-1" }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "organizations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { owner_uid: "owner-1" }, error: null }),
            }),
          }),
        };
      }
      if (table === "organization_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: async () => ({ data: [{ role: "viewer" }], error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const viewerRecord: any = {
      id: "mcp-key-1",
      uid: "viewer-1",
      userEmail: "viewer@example.com",
      credentialType: "mcp_project",
      orgId: "org-1",
      projectId: "proj-1",
      scopes: ["read:tokens"],
    };

    const req = new NextRequest("https://app.example.com/api/v1/mcp", { method: "POST" });
    const readAccess = await authorizeProjectRequest(req, "org-1", "proj-1", "read", viewerRecord);
    expect(readAccess).toMatchObject({ authorized: true, role: "viewer" });

    const writeAccess = await authorizeProjectRequest(req, "org-1", "proj-1", "write", viewerRecord);
    expect(writeAccess).toMatchObject({
      authorized: false,
      status: 403,
      error: "Your organization role cannot modify this project.",
    });
  });

  it("falls back to verified email when organization_members.user_id is stale", async () => {
    const updates: any[] = [];
    const fakeAdmin: any = {
      from: (table: string) => {
        if (table === "organization_members") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: async () => ({ data: [], error: null }),
                }),
                ilike: () => ({
                  limit: async () => ({ data: [{ role: "viewer", user_id: "old-uid" }], error: null }),
                }),
              }),
            }),
            update: (payload: any) => {
              updates.push(payload);
              return {
                eq: () => ({
                  ilike: async () => ({ error: null }),
                }),
              };
            },
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    const role = await resolveOrganizationRole(fakeAdmin, "org-1", "owner-1", "viewer-uid", {
      userEmail: "viewer@example.com",
      emailVerified: true,
    });
    expect(role).toBe("viewer");
    expect(updates).toEqual([{ user_id: "viewer-uid" }]);
  });
});
