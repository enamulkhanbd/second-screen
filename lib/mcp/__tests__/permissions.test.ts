import { describe, expect, it } from "vitest";
import { canViewMcpAnalytics } from "../permissions";

describe("canViewMcpAnalytics", () => {
  const org = { id: "org-1", ownerUid: "owner-uid-1" };

  it("allows workspace owner by ownerUid or resolved owner role", () => {
    expect(
      canViewMcpAnalytics({
        currentOrg: org,
        currentUser: { uid: "owner-uid-1" },
        userRole: "owner",
      }),
    ).toBe(true);

    expect(
      canViewMcpAnalytics({
        currentOrg: org,
        currentUser: { uid: "co-owner-uid" },
        userRole: "owner",
      }),
    ).toBe(true);
  });

  it("denies admin, editor, and viewer roles from seeing Analytics & Usage", () => {
    for (const userRole of ["admin", "editor", "viewer"] as const) {
      expect(
        canViewMcpAnalytics({
          currentOrg: org,
          currentUser: { uid: `${userRole}-uid` },
          userRole,
        }),
      ).toBe(false);
    }
  });

  it("denies access when no workspace is selected even if fallback role is admin", () => {
    expect(
      canViewMcpAnalytics({
        currentOrg: null,
        currentUser: null,
        userRole: "admin",
      }),
    ).toBe(false);
  });
});
