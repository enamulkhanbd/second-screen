import { NextRequest } from "next/server";
import { authenticateRequest } from "@/utils/auth";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { getUserOrganizations, getOrgProjectSummaries } from "@/services/organizationService";

export const dynamic = "force-dynamic";

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
    const uid = record.uid;
    if (!uid) {
      return jsonWithCors({ success: false, error: "This credential is not bound to a verified user." }, { status: 403 });
    }
    const userEmail = record.userEmail;
    let orgs = await getUserOrganizations(uid, userEmail);
    if (record.orgId && !orgs.some((org) => org.id === record.orgId)) {
      return jsonWithCors({ success: false, error: "This credential no longer has access to its organization." }, { status: 403 });
    }

    // Fetch projects for each org
    const orgsWithProjects = await Promise.all(
      orgs.map(async (org) => {
        let projects = await getOrgProjectSummaries(org.id);
        if (record.projectId && record.orgId === org.id) {
          projects = projects.filter((project) => project.id === record.projectId);
        }
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: org.ownerUid === uid ? "owner" : org.members?.find((m) => m.uid === uid)?.role || "viewer",
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
