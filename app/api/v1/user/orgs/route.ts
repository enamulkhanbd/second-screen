import { NextRequest } from "next/server";
import { authenticateRequest } from "@/utils/auth";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { getUserOrganizations, getOrgProjects, getOrganization } from "@/services/organizationService";

export async function OPTIONS() {
  return handleOptionsCors();
}

/**
 * GET /api/v1/user/orgs
 * Returns user's accessible organizations and their projects (for Figma Plugin dropdowns)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, "read:tokens");

    if (!auth.isValid || !auth.record) {
      return jsonWithCors({ success: false, error: auth.error || "Unauthorized" }, { status: 401 });
    }

    const record = auth.record;
    const uid = record.uid || "usr_default";
    const userEmail = record.userEmail;
    let orgs = await getUserOrganizations(uid, userEmail);

    // If PAT has bound org/project metadata and it's not yet in the list, ensure it's included
    if (record.orgId && !orgs.some((o) => o.id === record.orgId)) {
      let orgName = record.orgName;
      if (!orgName) {
        try {
          const boundOrg = await getOrganization(record.orgId);
          if (boundOrg?.name) orgName = boundOrg.name;
        } catch {}
      }
      const resolvedOrgName = orgName || "Organization";
      const boundOrgId = record.orgId;
      orgs = [
        {
          id: boundOrgId,
          name: resolvedOrgName,
          slug: resolvedOrgName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          ownerUid: uid,
          members: [{ uid, email: userEmail || "", displayName: "Member", role: "owner", joinedAt: new Date().toISOString() }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...orgs,
      ];
    }

    // Fetch projects for each org
    const orgsWithProjects = await Promise.all(
      orgs.map(async (org) => {
        let projects = await getOrgProjects(org.id);
        if (projects.length === 0 && record.projectId && record.orgId === org.id) {
          const projName = record.projectName || "Project";
          projects = [
            {
              id: record.projectId,
              orgId: org.id,
              name: projName,
              slug: projName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
              description: "Design tokens project",
              rawTokens: {},
              themeGroups: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
        }
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: org.members?.find((m) => m.uid === uid)?.role || "owner",
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
          })),
        };
      })
    );

    return jsonWithCors({
      success: true,
      orgs: orgsWithProjects,
      organizations: orgsWithProjects,
    });
  } catch (err: any) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}
