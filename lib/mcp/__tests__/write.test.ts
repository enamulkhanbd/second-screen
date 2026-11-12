import { describe, expect, it, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { applyTokenWrite, previewTokenWrite } from "../write";

const record: any = {
  id: "credential-1",
  uid: "user-1",
  credentialType: "mcp_project",
  orgId: "org-1",
  projectId: "project-1",
};

const request = new NextRequest("https://app.example.com/api/v1/mcp", { method: "POST" });

afterEach(() => {
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
});
