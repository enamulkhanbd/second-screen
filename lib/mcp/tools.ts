import Color from "colorjs.io";
import { z } from "zod";
import { countTokensInDocument, flattenAndResolveTokens, compareTokenNames } from "@/utils/transformTokens";
import { getCategoryForType } from "@/utils/themeHelpers";
import type { ApiKeyRecord } from "@/utils/patAuth";
import { createMcpCursor, createRevision, parseMcpCursor } from "./cursors";
import { McpError } from "./errors";
import { listMcpWorkspaces, resolveMcpProject, type McpResolvedProject } from "./context";
import type { McpResponseMeta } from "./types";
import type { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const SERVER_VERSION = "0.1.0";
const MAX_RESULT_ITEMS = 100;
const MAX_EXPORT_ITEMS = 500;

type ToolDeps = {
  req: NextRequest;
  record: ApiKeyRecord;
  requestId: string;
};

function meta(deps: ToolDeps, project?: McpResolvedProject, revision?: string, truncated = false): McpResponseMeta {
  return {
    requestId: deps.requestId,
    serverVersion: SERVER_VERSION,
    surfaceVersion: "1.0",
    orgId: project?.auth.orgId,
    projectId: project?.auth.projectId,
    branchId: project?.auth.branchId,
    revision,
    truncated,
  };
}

function result(data: unknown, responseMeta: McpResponseMeta) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ data, meta: responseMeta }) }],
  };
}

function requireString(value: string | undefined, label: string, requestId: string): string {
  if (!value || value.trim().length === 0) throw new McpError("INVALID_ARGUMENT", `${label} is required.`, requestId);
  return value.trim();
}

function revisionFor(project: McpResolvedProject): string {
  return createRevision(`${project.project.updatedAt}:${project.auth.branchRevision}:${Object.keys(project.project.rawTokens).length}`);
}

function resolveTokens(project: McpResolvedProject) {
  return flattenAndResolveTokens(project.project.rawTokens, undefined, undefined, { sort: false })
    .sort((a, b) => compareTokenNames(a.id, b.id));
}

function parseColor(value: string, requestId: string): Color {
  try {
    return new Color(requireString(value, "Color", requestId));
  } catch {
    throw new McpError("INVALID_ARGUMENT", "Colors must be valid CSS colors.", requestId);
  }
}

function contrastRatio(foreground: Color, background: Color): number {
  const fg = foreground.to("srgb").coords.map((channel) => Math.min(1, Math.max(0, channel)));
  const bg = background.to("srgb").coords.map((channel) => Math.min(1, Math.max(0, channel)));
  const luminance = (rgb: number[]) => rgb.reduce((sum, channel, index) => {
    const linear = channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
  const light = Math.max(luminance(fg), luminance(bg));
  const dark = Math.min(luminance(fg), luminance(bg));
  return (light + 0.05) / (dark + 0.05);
}

export function registerMcpTools(server: McpServer, deps: ToolDeps) {
  server.registerTool("list_workspaces", {
    title: "List workspaces",
    description: "List workspaces and projects visible to the authenticated user.",
    inputSchema: {},
  }, async () => result(
    await listMcpWorkspaces(deps.record, deps.requestId),
    meta(deps),
  ));

  const projectShape = {
    orgId: z.string().optional().describe("Workspace ID; omitted for project-bound MCP credentials."),
    projectId: z.string().optional().describe("Project ID; omitted for project-bound MCP credentials."),
  };

  server.registerTool("get_project_overview", {
    title: "Get project overview",
    description: "Return bounded project metadata, active branch, themes, and token counts.",
    inputSchema: projectShape,
  }, async ({ orgId, projectId }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId);
    const revision = revisionFor(project);
    return result({
      id: project.project.id,
      name: project.project.name,
      slug: project.project.slug,
      description: project.project.description || null,
      activeBranch: project.project.activeBranch,
      branchCount: project.project.branches.length,
      themeGroupCount: project.project.themeGroups.length,
      tokenCount: countTokensInDocument(project.project.rawTokens),
      updatedAt: project.project.updatedAt,
      archived: Boolean(project.project.isArchived),
    }, meta(deps, project, revision));
  });

  server.registerTool("search_tokens", {
    title: "Search tokens",
    description: "Search project design tokens by path, value, description, or type.",
    inputSchema: {
      ...projectShape,
      query: z.string().min(1).max(200),
      type: z.string().max(50).optional(),
      limit: z.number().int().min(1).max(MAX_RESULT_ITEMS).optional(),
      cursor: z.string().max(1000).optional(),
    },
  }, async ({ orgId, projectId, query, type, limit = 25, cursor }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId);
    const revision = revisionFor(project);
    const scope = `tokens:${project.auth.orgId}:${project.auth.projectId}:${query.toLowerCase()}:${type || ""}`;
    const parsedCursor = parseMcpCursor(cursor, { revision, scope }, deps.requestId);
    const needle = query.trim().toLowerCase();
    const normalizedType = type?.trim().toLowerCase();
    const matches = resolveTokens(project).filter((token) => {
      const searchable = `${token.id} ${token.name} ${token.rawValue} ${token.resolvedValue} ${token.description || ""}`.toLowerCase();
      const typeMatches = !normalizedType || token.type.toLowerCase() === normalizedType || getCategoryForType(token.type) === normalizedType;
      return typeMatches && searchable.includes(needle);
    });
    const after = parsedCursor?.sortKey;
    const start = after ? Math.max(0, matches.findIndex((item) => item.id === after) + 1) : 0;
    const page = matches.slice(start, start + limit);
    const hasMore = start + limit < matches.length;
    const items = page.map((token) => ({
      id: token.id,
      name: token.name,
      setName: token.setName,
      type: token.type,
      category: getCategoryForType(token.type),
      rawValue: token.rawValue,
      resolvedValue: token.resolvedValue,
      resolvedHex: token.resolvedHex,
      description: token.description || null,
      isAlias: token.isAlias,
    }));
    return result({
      items,
      hasMore,
      nextCursor: hasMore && page.length > 0 ? createMcpCursor({ revision, sortKey: page[page.length - 1].id, scope }) : undefined,
      snapshotRevision: revision,
    }, meta(deps, project, revision, hasMore));
  });

  server.registerTool("get_token_details", {
    title: "Get token details",
    description: "Return one token's raw and resolved values, alias metadata, and description.",
    inputSchema: {
      ...projectShape,
      tokenPath: z.string().min(1).max(500),
    },
  }, async ({ orgId, projectId, tokenPath }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId);
    const token = resolveTokens(project).find((candidate) => candidate.id === tokenPath || candidate.name === tokenPath || candidate.id.endsWith(`.${tokenPath}`));
    if (!token) throw new McpError("TOKEN_NOT_FOUND", "Token not found.", deps.requestId, 404);
    return result({
      id: token.id,
      name: token.name,
      path: token.path,
      setName: token.setName,
      type: token.type,
      category: getCategoryForType(token.type),
      rawValue: token.rawValue,
      resolvedValue: token.resolvedValue,
      resolvedHex: token.resolvedHex,
      description: token.description || null,
      isAlias: token.isAlias,
      aliasTarget: token.aliasTarget || null,
      deprecation: token.deprecated ? {
        message: token.deprecatedMessage || null,
        replacement: token.deprecatedReplacement || null,
        severity: token.deprecatedSeverity || null,
        removeAfter: token.deprecatedRemoveAfter || null,
      } : null,
    }, meta(deps, project, revisionFor(project)));
  });

  server.registerTool("check_color_contrast", {
    title: "Check color contrast",
    description: "Calculate WCAG contrast ratio for two CSS colors without changing project data.",
    inputSchema: {
      foreground: z.string().min(1).max(100),
      background: z.string().min(1).max(100),
      level: z.enum(["AA", "AAA"]).optional().default("AA"),
      size: z.enum(["normal", "large"]).optional().default("normal"),
    },
  }, async ({ foreground, background, level = "AA", size = "normal" }) => {
    const ratio = contrastRatio(parseColor(foreground, deps.requestId), parseColor(background, deps.requestId));
    const threshold = level === "AAA" ? (size === "large" ? 4.5 : 7) : (size === "large" ? 3 : 4.5);
    return result({
      foreground,
      background,
      ratio: Number(ratio.toFixed(3)),
      level,
      size,
      threshold,
      passes: ratio >= threshold,
    }, meta(deps));
  });

  server.registerTool("export_tokens_code", {
    title: "Export token code",
    description: "Export a bounded read-only token snapshot as CSS, SCSS, or JSON.",
    inputSchema: {
      ...projectShape,
      format: z.enum(["css", "scss", "json"]).optional().default("css"),
      limit: z.number().int().min(1).max(MAX_EXPORT_ITEMS).optional(),
    },
  }, async ({ orgId, projectId, format = "css", limit = MAX_EXPORT_ITEMS }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId);
    const all = resolveTokens(project);
    const tokens = all.slice(0, limit);
    const entries = tokens.map((token) => [token.name.replace(/[^a-zA-Z0-9_-]+/g, "-"), token.resolvedValue] as const);
    let code: string;
    if (format === "json") {
      code = JSON.stringify(Object.fromEntries(entries), null, 2);
    } else {
      if (format === "scss") {
        code = entries.map(([name, value]) => `$${name}: ${value};`).join("\n");
      } else {
        const lines = entries.map(([name, value]) => `  --${name}: ${value};`);
        code = `:root {\n${lines.join("\n")}\n}`;
      }
    }
    return result({
      format,
      language: format === "json" ? "json" : "css",
      code,
      count: tokens.length,
      totalCount: all.length,
      truncated: tokens.length < all.length,
      snapshotRevision: revisionFor(project),
    }, meta(deps, project, revisionFor(project), tokens.length < all.length));
  });
}
