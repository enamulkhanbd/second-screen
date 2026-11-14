import type { NextRequest } from "next/server";
import type { ApiKeyRecord } from "@/utils/patAuth";
import { authorizeProjectRequest } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { McpError } from "./errors";
import type { McpProjectContext } from "./types";

export type McpProjectData = {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description?: string | null;
  rawTokens: Record<string, any>;
  themeGroups: any[];
  figmaVariables: Record<string, any>;
  figmaMeta: Record<string, any>;
  documentation: Record<string, any> | null;
  branches: any[];
  activeBranch?: string | null;
  updatedAt: string;
  isArchived?: boolean | null;
};

export type McpResolvedProject = {
  auth: McpProjectContext;
  project: McpProjectData;
  organization: { id: string; name: string; slug: string };
};

function requireTarget(
  record: ApiKeyRecord,
  orgId?: string,
  projectId?: string,
  requestId = "unknown",
): { orgId: string; projectId: string } {
  if (record.credentialType === "mcp_project") {
    if (!record.orgId || !record.projectId) {
      throw new McpError("FORBIDDEN", "This credential has no immutable project binding.", requestId, 403);
    }
    return { orgId: record.orgId, projectId: record.projectId };
  }

  if (!orgId || !projectId) {
    throw new McpError("INVALID_ARGUMENT", "orgId and projectId are required for this credential.", requestId);
  }
  return { orgId, projectId };
}

export async function resolveMcpProject(
  req: NextRequest,
  record: ApiKeyRecord,
  orgId?: string,
  projectId?: string,
  requestId = "unknown",
  permission: "read" | "write" = "read",
): Promise<McpResolvedProject> {
  if (!record.uid) {
    throw new McpError("FORBIDDEN", "This credential is not bound to a verified user.", requestId, 403);
  }
  const target = requireTarget(record, orgId, projectId, requestId);
  const authorization = await authorizeProjectRequest(req, target.orgId, target.projectId, permission, record);
  if (!authorization.authorized) {
    const code = authorization.status === 404 ? "PROJECT_NOT_FOUND" : authorization.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN";
    throw new McpError(code, authorization.error, requestId, authorization.status);
  }

  const admin = createAdminClient();
  const [{ data: project, error: projectError }, { data: organization, error: orgError }] = await Promise.all([
    admin
      .from("projects")
      .select("id, org_id, name, slug, description, raw_tokens, theme_groups, figma_variables, extra_data, documentation, branches, active_branch, updated_at")
      .eq("id", target.projectId)
      .eq("org_id", target.orgId)
      .maybeSingle(),
    admin.from("organizations").select("id, name, slug").eq("id", target.orgId).maybeSingle(),
  ]);

  if (projectError || orgError) {
    throw new McpError("UPSTREAM_UNAVAILABLE", "Project data is temporarily unavailable.", requestId, 503);
  }
  if (!project || !organization) {
    throw new McpError("PROJECT_NOT_FOUND", "Project not found.", requestId, 404);
  }

  const branches = Array.isArray(project.branches) ? project.branches : [];
  const activeBranch = project.active_branch || branches.find((branch: any) => branch?.isDefault)?.name || "main";
  const branch = branches.find((candidate: any) => candidate?.name === activeBranch);
  const branchRevision = String(branch?.updatedAt || branch?.updated_at || project.updated_at || "unknown");

  return {
    auth: {
      credentialId: record.id,
      uid: record.uid,
      orgId: target.orgId,
      projectId: target.projectId,
      role: authorization.role,
      branchId: branch?.id,
      branchRevision,
    },
    project: {
      id: project.id,
      orgId: project.org_id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      rawTokens: project.raw_tokens || {},
      themeGroups: Array.isArray(project.theme_groups) ? project.theme_groups : [],
      figmaVariables: project.figma_variables || {},
      figmaMeta: project.extra_data?.figmaMeta || {},
      documentation: project.documentation || null,
      branches,
      activeBranch,
      updatedAt: project.updated_at,
      isArchived: Boolean(project.extra_data?.isArchived),
    },
    organization,
  };
}

export async function listMcpWorkspaces(record: ApiKeyRecord, requestId = "unknown") {
  const admin = createAdminClient();
  const owned = await admin.from("organizations").select("id, name, slug, owner_uid, updated_at").eq("owner_uid", record.uid);
  if (owned.error) throw new McpError("UPSTREAM_UNAVAILABLE", "Workspace data is temporarily unavailable.", requestId, 503);

  const memberRows = await admin.from("organization_members").select("org_id").eq("user_id", record.uid);
  if (memberRows.error) throw new McpError("UPSTREAM_UNAVAILABLE", "Workspace data is temporarily unavailable.", requestId, 503);

  const ids = Array.from(new Set([
    ...(owned.data || []).map((org: any) => org.id),
    ...(memberRows.data || []).map((row: any) => row.org_id),
  ]));
  const organizations = ids.length > 0
    ? await admin.from("organizations").select("id, name, slug, owner_uid, updated_at").in("id", ids)
    : { data: [], error: null };
  if (organizations.error) throw new McpError("UPSTREAM_UNAVAILABLE", "Workspace data is temporarily unavailable.", requestId, 503);

  const projects = ids.length > 0
    ? await admin.from("projects").select("id, org_id, name, slug, updated_at").in("org_id", ids)
    : { data: [], error: null };
  if (projects.error) throw new McpError("UPSTREAM_UNAVAILABLE", "Workspace data is temporarily unavailable.", requestId, 503);

  const projectsByOrg = new Map<string, any[]>();
  for (const project of projects.data || []) {
    const list = projectsByOrg.get(project.org_id) || [];
    list.push({
      id: project.id,
      name: project.name,
      slug: project.slug,
      updatedAt: project.updated_at,
      isArchived: false,
    });
    projectsByOrg.set(project.org_id, list);
  }

  const visible = (organizations.data || []).map((org: any) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    updatedAt: org.updated_at,
    projects: projectsByOrg.get(org.id) || [],
  }));

  if (record.credentialType === "mcp_project") {
    if (!record.orgId || !record.projectId) {
      throw new McpError("FORBIDDEN", "This credential has no immutable project binding.", requestId, 403);
    }
    return visible
      .filter((workspace) => workspace.id === record.orgId)
      .map((workspace) => ({
        ...workspace,
        projects: workspace.projects.filter((project) => project.id === record.projectId),
      }));
  }

  return visible;
}
