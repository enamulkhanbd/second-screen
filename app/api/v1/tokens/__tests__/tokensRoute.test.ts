import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuthenticateRequest = vi.fn();
const mockAuthorizeProjectRequest = vi.fn();
const mockGetProject = vi.fn();
const mockSaveProjectTokensAndBranches = vi.fn();
const mockSaveProjectFigmaVariables = vi.fn();

vi.mock("@/utils/auth", () => ({
  authenticateRequest: (...args: any[]) => mockAuthenticateRequest(...args),
  authorizeProjectRequest: (...args: any[]) => mockAuthorizeProjectRequest(...args),
}));

vi.mock("@/services/organizationService", () => ({
  getProject: (...args: any[]) => mockGetProject(...args),
  getUserOrganizations: vi.fn(async () => []),
  getOrgProjectSummaries: vi.fn(async () => []),
  saveProjectTokensAndBranches: (...args: any[]) => mockSaveProjectTokensAndBranches(...args),
  saveProjectFigmaVariables: (...args: any[]) => mockSaveProjectFigmaVariables(...args),
  ensureProjectDefaultBranch: (proj: any) =>
    proj.branches && proj.branches.length > 0
      ? proj.branches
      : [
          {
            id: `branch_main_${proj.id}`,
            name: "main",
            title: "Main",
            isDefault: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            createdBy: { name: "Test", email: "test@example.com" },
            rawTokens: proj.rawTokens || {},
            themeGroups: [],
            commits: [],
            comments: [],
          },
        ],
}));

import { POST as tokensPostRoute } from "../route";

function makePushRequest(body: Record<string, any>) {
  return new NextRequest(
    "https://app.example.com/api/v1/tokens?orgId=org_1&projectId=proj_1&branch=main",
    {
      method: "POST",
      headers: {
        authorization: "Bearer sec_pat_live_test",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
}

describe("M2 / A1 / R4 — POST /api/v1/tokens fail-closed read and atomic write verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateRequest.mockResolvedValue({
      isValid: true,
      record: {
        id: "pat-1",
        name: "CLI Key",
        uid: "user_1",
        orgId: "org_1",
        projectId: "proj_1",
        scopes: ["read:tokens", "write:tokens"],
      },
    });
    mockAuthorizeProjectRequest.mockResolvedValue({
      authorized: true,
      role: "editor",
      record: { id: "pat-1", name: "CLI Key", uid: "user_1" },
    });
  });

  it("returns 503 project_unavailable and performs NO write when getProject throws (A1)", async () => {
    mockGetProject.mockRejectedValue(new Error("Supabase connection timeout"));

    const res = await tokensPostRoute(
      makePushRequest({
        rawTokens: {
          core: { primary: { $value: "#ff0000", $type: "color" } },
        },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.code).toBe("project_unavailable");
    expect(mockSaveProjectTokensAndBranches).not.toHaveBeenCalled();
  });

  it("returns 404 project_not_found and performs NO write when getProject returns null (A1)", async () => {
    mockGetProject.mockResolvedValue(null);

    const res = await tokensPostRoute(
      makePushRequest({
        rawTokens: {
          core: { primary: { $value: "#ff0000", $type: "color" } },
        },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.code).toBe("project_not_found");
    expect(mockSaveProjectTokensAndBranches).not.toHaveBeenCalled();
  });

  it("returns 500 persist_failed and never reports success when database update fails (M2)", async () => {
    mockGetProject.mockResolvedValue({
      id: "proj_1",
      orgId: "org_1",
      activeBranch: "main",
      rawTokens: {
        core: { primary: { $value: "#000000", $type: "color" } },
      },
      branches: [],
    });
    mockSaveProjectTokensAndBranches.mockRejectedValue(new Error("Project not found or not updated"));

    const res = await tokensPostRoute(
      makePushRequest({
        rawTokens: {
          core: { primary: { $value: "#ffffff", $type: "color" } },
        },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.code).toBe("persist_failed");
    expect(mockSaveProjectTokensAndBranches).toHaveBeenCalledTimes(1);
  });

  it("performs no write when incoming tokens produce zero changes on an existing token set", async () => {
    const existingDoc = {
      core: { primary: { $value: "#112233", $type: "color" } },
    };
    mockGetProject.mockResolvedValue({
      id: "proj_1",
      orgId: "org_1",
      activeBranch: "main",
      rawTokens: existingDoc,
      branches: [],
    });

    const res = await tokensPostRoute(makePushRequest({ rawTokens: existingDoc }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.hasChanges).toBe(false);
    expect(mockSaveProjectTokensAndBranches).not.toHaveBeenCalled();
  });

  it("executes exactly one atomic saveProjectTokensAndBranches update on happy path", async () => {
    mockGetProject.mockResolvedValue({
      id: "proj_1",
      orgId: "org_1",
      activeBranch: "main",
      rawTokens: {
        core: { primary: { $value: "#112233", $type: "color" } },
      },
      branches: [],
    });
    mockSaveProjectTokensAndBranches.mockResolvedValue(undefined);

    const res = await tokensPostRoute(
      makePushRequest({
        rawTokens: {
          core: { primary: { $value: "#445566", $type: "color" } },
        },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.changedCount).toBe(1);
    expect(mockSaveProjectTokensAndBranches).toHaveBeenCalledTimes(1);
  });
});

