import { describe, expect, it, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

import { applyTokenWrite, previewTokenWrite } from "../write";

const record: any = {
  id: "credential-1",
  uid: "user-1",
  userEmail: "user1@example.com",
  credentialType: "mcp_project",
  orgId: "org-1",
  projectId: "project-1",
};

const request = new NextRequest("https://app.example.com/api/v1/mcp", { method: "POST" });

function setupWriteDb(options: { role: "owner" | "admin" | "editor" | "viewer" }) {
  const projectRow = {
    id: "project-1",
    org_id: "org-1",
    name: "Design System",
    slug: "design-system",
    description: null,
    raw_tokens: {},
    theme_groups: [],
    enabled_schemas: [],
    compiler_config: {},
    figma_variables: {},
    extra_data: {},
    documentation: null,
    branches: [
      { id: "br-main", name: "main", title: "Main", isDefault: true, rawTokens: {}, themeGroups: [] },
      { id: "br-feat", name: "feature/test", title: "Test", isDefault: false, rawTokens: {}, themeGroups: [] },
    ],
    active_branch: "main",
    updated_at: "2026-11-16T00:00:00.000Z",
  };

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "projects") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: projectRow, error: null }),
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
              data: {
                id: "org-1",
                name: "Acme",
                slug: "acme",
                owner_uid: options.role === "owner" ? "user-1" : "other-owner",
              },
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
                data: options.role === "owner" ? [] : [{ role: options.role }],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === "mcp_write_branch_revisions") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { revision: 1 }, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === "mcp_write_confirmations" || table === "mcp_write_audit_events") {
      return {
        insert: async () => ({ error: null }),
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });
}

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.MCP_WRITE_ENABLED;
  delete process.env.MCP_WRITE_CANARY_CREDENTIAL_IDS;
});

describe("MCP write safety gate", () => {
  it("rejects preview before any database access when writes are disabled", async () => {
    await expect(previewTokenWrite(request, record, {
      branchName: "feature/test",
      proposedTokens: {},
    }, "req-1")).rejects.toMatchObject({ code: "WRITE_DISABLED", status: 501 });
  });

  it("rejects apply unless the credential is explicitly canary-authorized", async () => {
    process.env.MCP_WRITE_ENABLED = "true";
    await expect(applyTokenWrite(request, record, {
      branchName: "feature/test",
      proposedTokens: {},
      baseRevision: 0,
      confirmationToken: "x".repeat(32),
      idempotencyKey: "idempotency-key-0001",
    }, "req-2")).rejects.toMatchObject({ code: "WRITE_DISABLED", status: 501 });
  });

  it("blocks viewer role from previewing or applying MCP writes even when writes are enabled", async () => {
    process.env.MCP_WRITE_ENABLED = "true";
    process.env.MCP_WRITE_CANARY_CREDENTIAL_IDS = "credential-1";
    setupWriteDb({ role: "viewer" });

    await expect(previewTokenWrite(request, record, {
      branchName: "feature/test",
      proposedTokens: {},
    }, "req-viewer-preview")).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });

    await expect(applyTokenWrite(request, record, {
      branchName: "feature/test",
      proposedTokens: {},
      baseRevision: 1,
      confirmationToken: "x".repeat(32),
      idempotencyKey: "idempotency-key-0002",
    }, "req-viewer-apply")).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("allows editor and owner roles to preview writes when writes are enabled", async () => {
    process.env.MCP_WRITE_ENABLED = "true";
    process.env.MCP_WRITE_CANARY_CREDENTIAL_IDS = "credential-1";

    for (const role of ["editor", "owner"] as const) {
      setupWriteDb({ role });
      const preview = await previewTokenWrite(request, record, {
        branchName: "feature/test",
        proposedTokens: {
          core: { brand: { $type: "color", $value: "#3b82f6" } },
        },
      }, `req-${role}`);
      expect(preview.branchName).toBe("feature/test");
      expect(preview.baseRevision).toBe(1);
      expect(preview.confirmationToken.length).toBeGreaterThanOrEqual(32);
    }
  });
});
