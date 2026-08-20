import { NextRequest } from "next/server";
import { authenticateRequest } from "@/utils/auth";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { getUserOrganizations, getOrgProjects } from "@/services/organizationService";

export async function OPTIONS() {
  return handleOptionsCors();
}

/**
 * GET /api/v1/user/orgs
 * Returns user's accessible organizations and their projects (for Figma Plugin dropdowns)
 */
export async function GET(req: NextRequest) {
  try {
    const isInternal = req.headers.get("x-internal-client") === "second-screen";
    const auth: { isValid: boolean; record?: any; error?: string } = !isInternal
      ? authenticateRequest(req, "read:tokens")
      : { isValid: true, record: { uid: "usr_internal", name: "Internal" } };

    if (!auth.isValid) {
      return jsonWithCors({ success: false, error: auth.error || "Unauthorized" }, { status: 401 });
    }

    const uid = auth.record?.uid || "usr_default";
    const orgs = await getUserOrganizations(uid);

    // Fetch projects for each org
    const orgsWithProjects = await Promise.all(
      orgs.map(async (org) => {
        const projects = await getOrgProjects(org.id);
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
      organizations: orgsWithProjects,
    });
  } catch (err: any) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}
