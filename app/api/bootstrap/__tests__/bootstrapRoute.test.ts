import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockGetOrgs = vi.fn();
const mockGetProjects = vi.fn();

vi.mock("@/utils/auth", () => ({
  authenticateRequest: (...args: any[]) => mockAuth(...args),
}));

vi.mock("@/services/organizationService", () => ({
  getUserOrganizations: (...args: any[]) => mockGetOrgs(...args),
  getOrgProjectSummaries: (...args: any[]) => mockGetProjects(...args),
}));

import { GET } from "../route";

describe("GET /api/bootstrap same-origin tenant loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated callers with 401", async () => {
    mockAuth.mockResolvedValue({ isValid: false, error: "Unauthorized" });
    const res = await GET(new NextRequest("https://app.example.com/api/bootstrap"));
    expect(res.status).toBe(401);
  });

  it("returns organizations and projects for the requested orgSlug in a single call", async () => {
    mockAuth.mockResolvedValue({
      isValid: true,
      record: { uid: "u1", userEmail: "u1@example.com" },
    });
    mockGetOrgs.mockResolvedValue([
      { id: "org_1", name: "One", slug: "one" },
      { id: "org_2", name: "Pds", slug: "pds" },
    ]);
    mockGetProjects.mockResolvedValue([{ id: "proj_web", name: "Web", slug: "web" }]);

    const res = await GET(new NextRequest("https://app.example.com/api/bootstrap?orgSlug=pds"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.activeOrgId).toBe("org_2");
    expect(body.orgs).toHaveLength(2);
    expect(body.projects).toHaveLength(1);
    expect(mockGetProjects).toHaveBeenCalledWith("org_2");
  });
});
