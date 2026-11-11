import { describe, expect, it } from "vitest";
import { generateApiKey, validateApiKey } from "../patAuth";

describe("API-key credential metadata", () => {
  it("creates a project-bound MCP credential record", () => {
    const { plaintextKey, record } = generateApiKey(
      "MCP project key",
      ["read:tokens"],
      90,
      {
        uid: "user-1",
        userEmail: "user@example.com",
        orgId: "org-1",
        projectId: "project-1",
        orgName: "Workspace",
        projectName: "Design System",
        credentialType: "mcp_project",
      },
    );

    expect(record.credentialType).toBe("mcp_project");
    expect(record.orgId).toBe("org-1");
    expect(record.projectId).toBe("project-1");
    expect(record.scopes).toEqual(["read:tokens"]);
    expect(validateApiKey(plaintextKey, [record], "read:tokens").isValid).toBe(true);
    expect(validateApiKey(plaintextKey, [record], "write:tokens").isValid).toBe(false);
  });
});
