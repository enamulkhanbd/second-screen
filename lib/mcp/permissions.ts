import type { Organization, UserProfile, UserRole } from "@/types/tenant";

/**
 * Determines whether the signed-in user may view the MCP "Analytics & Usage" tab
 * for the active workspace. Strictly limited to workspace owners.
 */
export function canViewMcpAnalytics(params: {
  currentOrg?: Pick<Organization, "id" | "ownerUid"> | null;
  currentUser?: Pick<UserProfile, "uid"> | null;
  userRole: UserRole | string;
}): boolean {
  const { currentOrg, currentUser, userRole } = params;
  if (!currentOrg) return false;
  if (currentUser?.uid && currentOrg.ownerUid === currentUser.uid) {
    return true;
  }
  return userRole === "owner";
}
