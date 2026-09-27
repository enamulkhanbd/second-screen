import { NextRequest } from "next/server";
import { authenticateRequest } from "@/utils/auth";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { getProject } from "@/services/organizationService";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptionsCors();
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, "read:tokens");
    if (!auth.isValid || !auth.record) {
      return jsonWithCors(
        { success: false, error: auth.error || "Unauthorized." },
        { status: 401 }
      );
    }

    const params = req.nextUrl.searchParams;
    const orgId = params.get("orgId") || auth.record.orgId;
    const projectId = params.get("projectId") || auth.record.projectId;
    if (!orgId || !projectId) {
      return jsonWithCors(
        { success: false, error: "Both orgId and projectId are required." },
        { status: 400 }
      );
    }

    if (auth.record.orgId && auth.record.orgId !== orgId) {
      return jsonWithCors({ success: false, error: "Forbidden." }, { status: 403 });
    }
    if (auth.record.projectId && auth.record.projectId !== projectId) {
      return jsonWithCors({ success: false, error: "Forbidden." }, { status: 403 });
    }

    const project = await getProject(orgId, projectId);
    if (!project) {
      return jsonWithCors({ success: false, error: "Project not found." }, { status: 404 });
    }

    const credentials = project.gitConfig;
    const defaultBranch = credentials?.branch || project.activeBranch || "main";
    const fallbackBranches = project.branches?.length
      ? project.branches.map((branch) => branch.name)
      : [defaultBranch];

    if (!credentials?.owner || !credentials.repo || !credentials.pat) {
      return jsonWithCors({ success: true, branches: fallbackBranches });
    }

    let url = "";
    let headers: HeadersInit = {};

    if (credentials.provider === "github") {
      url = `https://api.github.com/repos/${encodeURIComponent(credentials.owner)}/${encodeURIComponent(
        credentials.repo
      )}/branches?per_page=100`;
      headers = {
        Authorization: `Bearer ${credentials.pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TokensPlatform-Cloud/1.0",
      };
    } else if (credentials.provider === "azure") {
      const organization = encodeURIComponent(credentials.owner);
      const projectName = encodeURIComponent(credentials.project || credentials.owner);
      const repository = encodeURIComponent(credentials.repo);
      url = `https://dev.azure.com/${organization}/${projectName}/_apis/git/repositories/${repository}/refs?filter=heads/&api-version=7.0`;
      headers = {
        Authorization: `Basic ${Buffer.from(`:${credentials.pat}`).toString("base64")}`,
        Accept: "application/json",
      };
    } else if (credentials.provider === "gitlab") {
      const remoteProject = encodeURIComponent(`${credentials.owner}/${credentials.repo}`);
      url = `https://gitlab.com/api/v4/projects/${remoteProject}/repository/branches?per_page=100`;
      headers = { "PRIVATE-TOKEN": credentials.pat };
    }

    if (!url) {
      return jsonWithCors({ success: true, branches: fallbackBranches });
    }

    const response = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!response.ok) {
      return jsonWithCors({ success: true, branches: fallbackBranches });
    }

    const data = await response.json();
    const branches = credentials.provider === "azure"
      ? (Array.isArray(data.value) ? data.value : []).map((ref: { name: string }) =>
          ref.name.replace(/^refs\/heads\//i, "")
        )
      : (Array.isArray(data) ? data : []).map((branch: { name: string }) => branch.name);

    return jsonWithCors({
      success: true,
      branches: branches.length > 0 ? branches : fallbackBranches,
    });
  } catch (err: any) {
    return jsonWithCors(
      { success: false, error: err.message || "Failed to load branches." },
      { status: 500 }
    );
  }
}