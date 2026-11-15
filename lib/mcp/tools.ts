import Color from "colorjs.io";
import { z } from "zod";
import { countTokensInDocument, flattenAndResolveTokens, compareTokenNames, buildTokenDependencyGraph } from "@/utils/transformTokens";
import { getActiveThemeSets, getCategoryForType, getValidTokenSetNames } from "@/utils/themeHelpers";
import { loadMetadataIndex } from "@/lib/r2";
import {
  compileStyleDictionary,
  compileReactTs,
  compileTailwindConfig,
  compileFlutterDart,
} from "@/utils/releaseCompiler";
import { computeTokensDiff } from "@/utils/tokenDiff";
import { SCHEMA_CATALOG } from "@/data/schemaCatalog";
import type { CompilerConfig } from "@/types/tokens";
import type { ProjectAsset } from "@/types/tenant";
import type { ApiKeyRecord } from "@/utils/patAuth";
import { createMcpCursor, createRevision, parseMcpCursor } from "./cursors";
import { McpError } from "./errors";
import {
  listMcpWorkspaces,
  resolveMcpProject,
  getBranchTokensAndThemes,
  type McpResolvedProject,
} from "./context";
import type { McpResponseMeta } from "./types";
import type { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const SERVER_VERSION = "0.1.0";
const MAX_RESULT_ITEMS = 100;
const MAX_EXPORT_ITEMS = 500;
const MAX_PAGE_ITEMS = 100;
const MAX_RESPONSE_BYTES = 512 * 1024;

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
  const text = JSON.stringify({ data, meta: responseMeta });
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > MAX_RESPONSE_BYTES) {
    throw new McpError(
      "LIMIT_EXCEEDED",
      `Response is ${byteLength} bytes; the maximum supported response is ${MAX_RESPONSE_BYTES} bytes. Narrow the query or reduce the requested limit.`,
      responseMeta.requestId,
      413,
    );
  }
  return { content: [{ type: "text" as const, text }] };
}

function requireString(value: string | undefined, label: string, requestId: string): string {
  if (!value || value.trim().length === 0) throw new McpError("INVALID_ARGUMENT", `${label} is required.`, requestId);
  return value.trim();
}

function revisionFor(project: McpResolvedProject): string {
  return createRevision(`${project.project.updatedAt}:${project.auth.branchRevision}:${Object.keys(project.project.rawTokens).length}`);
}

function resolveThemeOptionIds(project: McpResolvedProject, requested: Record<string, string> | undefined, requestId: string) {
  const selected: Record<string, string> = {};
  for (const group of project.project.themeGroups) {
    const optionId = requested?.[group.id] || group.options?.[0]?.id;
    if (!optionId) continue;
    if (!group.options?.some((option: any) => option.id === optionId)) {
      throw new McpError("INVALID_ARGUMENT", `Unknown theme option '${optionId}' for group '${group.id}'.`, requestId);
    }
    selected[group.id] = optionId;
  }
  return selected;
}

function themeSelectionKey(themeOptionIds?: Record<string, string>) {
  return JSON.stringify(Object.entries(themeOptionIds || {}).sort(([a], [b]) => a.localeCompare(b)));
}

function exportSafeTokens(tokens: any[]) {
  const counts = new Map<string, number>();
  tokens.forEach((token) => counts.set(token.name, (counts.get(token.name) || 0) + 1));
  return tokens.map((token) => (counts.get(token.name) || 0) < 2
    ? token
    : { ...token, name: `${token.setName}.${token.name}` });
}

function safeCommit(commit: any) {
  if (!commit || typeof commit !== "object") return null;
  const sha = typeof commit.sha === "string" ? commit.sha : typeof commit.hash === "string" ? commit.hash : undefined;
  return {
    sha: sha ? sha.slice(0, 12) : null,
    message: typeof commit.message === "string" ? commit.message.slice(0, 500) : null,
    timestamp: commit.timestamp || commit.date || commit.createdAt || null,
    authorName: typeof commit.authorName === "string" ? commit.authorName.slice(0, 120) : null,
  };
}

function safeAsset(asset: ProjectAsset, includeSvg: boolean) {
  return {
    id: asset.id,
    name: asset.name,
    title: asset.title || null,
    type: asset.type || null,
    assetType: asset.assetType || null,
    tag: asset.tag || null,
    category: asset.category || null,
    description: asset.description || null,
    url: asset.url || null,
    contentType: asset.contentType || null,
    size: typeof asset.size === "number" ? asset.size : null,
    dimensions: asset.dimensions || null,
    colorSpace: asset.colorSpace || null,
    format: asset.format || null,
    version: asset.version || null,
    duration: asset.duration || null,
    createdAt: asset.createdAt || null,
    updatedAt: asset.updatedAt || null,
    source: asset.source,
    ...(includeSvg && asset.svg ? { svg: asset.svg.slice(0, 50_000), svgTruncated: asset.svg.length > 50_000 } : {}),
  };
}

function safeDocBlock(block: any) {
  if (!block || typeof block !== "object") return null;
  return {
    id: typeof block.id === "string" ? block.id : null,
    type: typeof block.type === "string" ? block.type : null,
    content: typeof block.content === "string" ? block.content.slice(0, 20_000) : null,
    settings: block.settings && typeof block.settings === "object" ? {
      level: block.settings.level,
      calloutVariant: block.settings.calloutVariant,
      doText: typeof block.settings.doText === "string" ? block.settings.doText.slice(0, 10_000) : undefined,
      dontText: typeof block.settings.dontText === "string" ? block.settings.dontText.slice(0, 10_000) : undefined,
      collection: block.settings.collection,
      selectedModes: Array.isArray(block.settings.selectedModes) ? block.settings.selectedModes.slice(0, 20) : undefined,
      filterType: block.settings.filterType,
      filterQuery: block.settings.filterQuery,
      filterCondition: block.settings.filterCondition,
      sortField: block.settings.sortField,
      sortOrder: block.settings.sortOrder,
      showSearchBox: block.settings.showSearchBox,
      tokenSetName: block.settings.tokenSetName,
    } : undefined,
  };
}

function resolveTokens(project: McpResolvedProject, themeOptionIds?: Record<string, string>, requestId = "unknown") {
  const selected = resolveThemeOptionIds(project, themeOptionIds, requestId);
  const themeConfig = getActiveThemeSets(project.project.themeGroups, selected, project.project.rawTokens);
  const tokens = flattenAndResolveTokens(project.project.rawTokens, undefined, themeConfig, { sort: false });
  const scoped = tokens.filter((token) => !themeConfig.inactiveSets.has(token.setName));
  return scoped
    .sort((a, b) => compareTokenNames(a.id, b.id));
}

function tokenIndex(tokens: any[]) {
  const index = new Map<string, any[]>();
  const add = (key: string, token: any) => {
    const normalized = key.toLowerCase();
    const items = index.get(normalized) || [];
    if (!items.some((item) => item.id === token.id)) items.push(token);
    index.set(normalized, items);
  };
  for (const token of tokens) {
    add(token.id, token);
    add(token.name, token);
    add(`${token.setName}.${token.name}`, token);
  }
  return index;
}

function uniqueToken(tokens: any[], tokenPath: string, requestId: string) {
  const needle = tokenPath.trim().toLowerCase();
  const index = tokenIndex(tokens);
  const candidates = index.get(needle) || tokens.filter((token) => token.id.toLowerCase().endsWith(`.${needle}`));
  if (candidates.length === 0) throw new McpError("TOKEN_NOT_FOUND", "Token not found.", requestId, 404);
  if (candidates.length > 1) {
    throw new McpError("AMBIGUOUS_TOKEN", `Token reference is ambiguous: ${candidates.map((candidate) => candidate.id).join(", ")}.`, requestId);
  }
  return candidates[0];
}

function tokenSetEntries(project: McpResolvedProject) {
  return getValidTokenSetNames(project.project.rawTokens).map((name) => ({
    name,
    tokenCount: countTokensInDocument(project.project.rawTokens[name] || {}),
  }));
}

function flattenDocument(document: Record<string, any>) {
  return flattenAndResolveTokens(document || {}, undefined, undefined, { sort: false })
    .sort((a, b) => compareTokenNames(a.id, b.id));
}

function validateTokenDocument(project: McpResolvedProject, themeOptionIds?: Record<string, string>, requestId = "unknown") {
  const tokens = resolveTokens(project, themeOptionIds, requestId);
  const index = tokenIndex(tokens);
  const missingTypes: string[] = [];
  const deprecated: string[] = [];
  const missingAliases: Array<{ id: string; target: string }> = [];
  const graph = new Map<string, string>();
  for (const token of tokens) {
    if (!token.type || token.type === "other") missingTypes.push(token.id);
    if (token.deprecated) deprecated.push(token.id);
    if (token.isAlias && token.aliasTarget) {
      const aliasTarget = token.aliasTarget.trim();
      const candidates = index.get(aliasTarget.toLowerCase()) || tokens.filter((candidate) => candidate.id.toLowerCase().endsWith(`.${aliasTarget.toLowerCase()}`));
      if (candidates.length >= 1) {
        graph.set(token.id, candidates[0].id);
      } else {
        missingAliases.push({ id: token.id, target: token.aliasTarget });
      }
    }
  }
  const cyclic: string[] = [];
  for (const start of Array.from(graph.keys())) {
    const seen = new Set<string>();
    let current: string | undefined = start;
    while (current && graph.has(current)) {
      if (seen.has(current)) { cyclic.push(start); break; }
      seen.add(current);
      current = graph.get(current);
    }
  }
  return {
    valid: missingTypes.length === 0 && missingAliases.length === 0 && cyclic.length === 0,
    tokenCount: tokens.length,
    missingTypes: missingTypes.slice(0, MAX_RESULT_ITEMS),
    missingAliases: missingAliases.slice(0, MAX_RESULT_ITEMS),
    cyclicAliases: Array.from(new Set(cyclic)).slice(0, MAX_RESULT_ITEMS),
    deprecatedTokens: deprecated.slice(0, MAX_RESULT_ITEMS),
    truncated: missingTypes.length > MAX_RESULT_ITEMS || missingAliases.length > MAX_RESULT_ITEMS || cyclic.length > MAX_RESULT_ITEMS,
  };
}

function tokenReferences(token: any): string[] {
  const values = [token.rawValue, token.modify?.color, token.modify?.value]
    .filter((value): value is string => typeof value === "string");
  const references = new Set<string>();
  for (const value of values) {
    const aliases = /\{([^{}":,]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = aliases.exec(value)) !== null) references.add(match[1].trim());
    const paths = /[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+/g;
    while ((match = paths.exec(value)) !== null) {
      if (!match[0].startsWith("Math.") && match[0] !== "roundTo") references.add(match[0]);
    }
  }
  return Array.from(references);
}

function findTokenReference(tokens: any[], reference: string) {
  const needle = reference.toLowerCase().replace(/^\{?|\}?$/g, "");
  const candidates = tokenIndex(tokens).get(needle) || tokens.filter((candidate) => candidate.id.toLowerCase().endsWith(`.${needle}`));
  return candidates.length === 1 ? candidates[0] : undefined;
}

function tokenUsage(project: McpResolvedProject, tokenPath: string, requestId: string, themeOptionIds?: Record<string, string>) {
  const tokens = resolveTokens(project, themeOptionIds, requestId);
  const token = uniqueToken(tokens, tokenPath, requestId);

  const dependencyItems = tokenReferences(token)
    .map((reference) => ({ reference, token: findTokenReference(tokens, reference) }))
    .filter((item) => item.token)
    .map((item) => ({
      id: item.token.id,
      name: item.token.name,
      setName: item.token.setName,
      type: item.token.type,
      resolvedValue: item.token.resolvedValue,
    }));

  const dependencyGraph = buildTokenDependencyGraph(tokens);
  const keys = [token.id, token.name, `${token.setName}.${token.name}`].map((key) => key.toLowerCase());
  const dependentIds = new Set<string>();
  for (const key of keys) for (const id of Array.from(dependencyGraph.get(key) || [])) dependentIds.add(id);
  const dependentItems = Array.from(dependentIds).map((id) => tokens.find((candidate) => candidate.id === id)).filter(Boolean).map((dependent: any) => ({
    id: dependent.id,
    name: dependent.name,
    setName: dependent.setName,
    type: dependent.type,
    resolvedValue: dependent.resolvedValue,
  }));

  return {
    token: { id: token.id, name: token.name, setName: token.setName, type: token.type, resolvedValue: token.resolvedValue },
    dependencies: dependencyItems,
    dependents: dependentItems,
    dependencyCount: dependencyItems.length,
    dependentCount: dependentItems.length,
  };
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

type TokenFilterOptions = {
  query?: string;
  type?: string;
  setName?: string;
  pathPrefix?: string;
  deprecatedOnly?: boolean;
};

function filterTokens(tokens: any[], options: TokenFilterOptions) {
  const needle = options.query?.trim().toLowerCase() || "";
  const normalizedType = options.type?.trim().toLowerCase() || "";
  const normalizedSet = options.setName?.trim().toLowerCase() || "";
  const normalizedPrefix = options.pathPrefix?.trim().toLowerCase() || "";
  return tokens.filter((token) => {
    const searchable = `${token.id} ${token.name} ${token.rawValue} ${token.resolvedValue} ${token.description || ""}`.toLowerCase();
    const queryMatches = !needle || searchable.includes(needle);
    const typeMatches = !normalizedType || token.type.toLowerCase() === normalizedType || getCategoryForType(token.type) === normalizedType;
    const setMatches = !normalizedSet || token.setName.toLowerCase() === normalizedSet;
    const prefixMatches = !normalizedPrefix || token.name.toLowerCase().startsWith(normalizedPrefix) || token.id.toLowerCase().startsWith(normalizedPrefix);
    const deprecatedMatches = !options.deprecatedOnly || Boolean(token.deprecated);
    return queryMatches && typeMatches && setMatches && prefixMatches && deprecatedMatches;
  });
}

type ThemeModeMap = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  byId: Map<string, any>;
  byName: Map<string, any>;
};

function collectThemeModeMaps(
  project: McpResolvedProject,
  requestId: string,
  baseThemeOptionIds?: Record<string, string>,
): ThemeModeMap[] {
  const maps: ThemeModeMap[] = [];
  for (const group of project.project.themeGroups) {
    for (const option of group.options || []) {
      const resolved = resolveTokens(project, { ...(baseThemeOptionIds || {}), [group.id]: option.id }, requestId);
      const byId = new Map<string, any>();
      const byName = new Map<string, any>();
      for (const token of resolved) {
        byId.set(token.id, token);
        const key = token.name.toLowerCase();
        if (!byName.has(key)) byName.set(key, token);
      }
      maps.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        byId,
        byName,
      });
    }
  }
  return maps;
}

function findModeTokenMatch(mode: ThemeModeMap, token: any) {
  return mode.byId.get(token.id) || mode.byName.get(token.name.toLowerCase());
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
    branchName: z.string().min(1).max(120).optional().describe("Optional branch name to inspect; defaults to the project's active branch."),
    themeOptionIds: z.record(z.string()).optional().describe("Optional map of theme group IDs to selected option IDs; defaults to the first option in each group."),
  };

  server.registerTool("get_project_overview", {
    title: "Get project overview",
    description: "Return bounded project metadata, active branch, themes, and token counts.",
    inputSchema: projectShape,
  }, async ({ orgId, projectId, branchName }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId, "read", branchName);
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

  server.registerTool("list_token_sets", {
    title: "List token sets",
    description: "List token sets and bounded token counts for the selected project.",
    inputSchema: projectShape,
  }, async ({ orgId, projectId, branchName }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId, "read", branchName);
    const items = tokenSetEntries(project);
    return result({ items, total: items.length }, meta(deps, project, revisionFor(project)));
  });

  server.registerTool("get_themes_matrix", {
    title: "Get themes matrix",
    description: "Return theme groups, modes, and token-set activation state.",
    inputSchema: projectShape,
  }, async ({ orgId, projectId, branchName }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId, "read", branchName);
    const groups = project.project.themeGroups.map((group: any) => ({
      id: group.id,
      name: group.name,
      color: group.color || null,
      options: (group.options || []).map((option: any) => ({
        id: option.id,
        name: option.name,
        group: option.group || null,
        selectedTokenSets: option.selectedTokenSets || {},
        figmaCollectionId: option.figmaCollectionId || null,
        figmaModeId: option.figmaModeId || null,
      })),
    }));
    return result({ groups, tokenSets: tokenSetEntries(project) }, meta(deps, project, revisionFor(project)));
  });

  server.registerTool("search_tokens", {
    title: "Search tokens",
    description: "Search or browse project design tokens by path, value, description, token set, path prefix, deprecation, or type.",
    inputSchema: {
      ...projectShape,
      query: z.string().max(200).optional(),
      type: z.string().max(50).optional(),
      setName: z.string().max(120).optional(),
      pathPrefix: z.string().max(200).optional(),
      deprecatedOnly: z.boolean().optional(),
      limit: z.number().int().min(1).max(MAX_RESULT_ITEMS).optional(),
      cursor: z.string().max(1000).optional(),
    },
  }, async ({ orgId, projectId, branchName, themeOptionIds, query, type, setName, pathPrefix, deprecatedOnly, limit = 25, cursor }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId, "read", branchName);
    const revision = revisionFor(project);
    const normalizedQuery = query?.trim().toLowerCase() || "";
    const normalizedType = type?.trim().toLowerCase() || "";
    const normalizedSet = setName?.trim().toLowerCase() || "";
    const normalizedPrefix = pathPrefix?.trim().toLowerCase() || "";
    const scope = `tokens:${project.auth.orgId}:${project.auth.projectId}:${branchName?.trim() || ""}:${normalizedQuery}:${normalizedType}:${normalizedSet}:${normalizedPrefix}:${Boolean(deprecatedOnly)}:${themeSelectionKey(themeOptionIds)}`;
    const parsedCursor = parseMcpCursor(cursor, { revision, scope }, deps.requestId);
    const matches = filterTokens(resolveTokens(project, themeOptionIds, deps.requestId), {
      query,
      type,
      setName,
      pathPrefix,
      deprecatedOnly,
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
    description: "Return one token's raw and resolved values across themes, alias metadata, and description.",
    inputSchema: {
      ...projectShape,
      tokenPath: z.string().min(1).max(500),
    },
  }, async ({ orgId, projectId, branchName, themeOptionIds, tokenPath }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId, "read", branchName);
    const token = uniqueToken(resolveTokens(project, themeOptionIds, deps.requestId), tokenPath, deps.requestId);
    const valuesByThemeOption = collectThemeModeMaps(project, deps.requestId, themeOptionIds)
      .map((mode) => {
        const match = findModeTokenMatch(mode, token);
        if (!match) return null;
        return {
          groupId: mode.groupId,
          groupName: mode.groupName,
          optionId: mode.optionId,
          optionName: mode.optionName,
          setName: match.setName,
          rawValue: match.rawValue,
          resolvedValue: match.resolvedValue,
          resolvedHex: match.resolvedHex || null,
        };
      })
      .filter(Boolean);
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
      valuesByThemeOption,
      deprecation: token.deprecated ? {
        message: token.deprecatedMessage || null,
        replacement: token.deprecatedReplacement || null,
        severity: token.deprecatedSeverity || null,
        removeAfter: token.deprecatedRemoveAfter || null,
      } : null,
    }, meta(deps, project, revisionFor(project)));
  });

  server.registerTool("get_token_usage", {
    title: "Get token usage",
    description: "Show a token's direct dependencies and reverse dependents across the selected project.",
    inputSchema: {
      ...projectShape,
      tokenPath: z.string().min(1).max(500),
    },
  }, async ({ orgId, projectId, branchName, themeOptionIds, tokenPath }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId, "read", branchName);
    return result(tokenUsage(project, tokenPath, deps.requestId, themeOptionIds), meta(deps, project, revisionFor(project)));
  });

  server.registerTool("validate_tokens", {
    title: "Validate tokens",
    description: "Check token types, aliases, cycles, and deprecated-token usage without modifying project data.",
    inputSchema: projectShape,
  }, async ({ orgId, projectId, branchName, themeOptionIds }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId, "read", branchName);
    return result(validateTokenDocument(project, themeOptionIds, deps.requestId), meta(deps, project, revisionFor(project)));
  });

  server.registerTool("list_branches", {
    title: "List branches",
    description: "List native project branches, default/active status, and recent commit metadata.",
    inputSchema: {
      ...projectShape,
      limit: z.number().int().min(1).max(50).optional().default(20),
    },
  }, async ({ orgId, projectId, limit = 20 }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId);
    const items = project.project.branches.slice(0, limit).map((branch: any) => ({
      name: branch.name,
      title: branch.title || branch.name,
      isDefault: Boolean(branch.isDefault),
      isActive: branch.name === project.project.activeBranch,
      updatedAt: branch.updatedAt || branch.updated_at || null,
      commits: Array.isArray(branch.commits) ? branch.commits.slice(0, 10).map(safeCommit).filter(Boolean) : [],
    }));
    return result({ items, hasMore: project.project.branches.length > items.length }, meta(deps, project, revisionFor(project), project.project.branches.length > items.length));
  });

  server.registerTool("compare_branches", {
    title: "Compare branches",
    description: "Compare token differences between a base branch and a head branch without modifying project data.",
    inputSchema: {
      orgId: projectShape.orgId,
      projectId: projectShape.projectId,
      baseBranch: z.string().min(1).max(120).optional().describe("Base branch name; defaults to the project's active or default branch."),
      headBranch: z.string().min(1).max(120).describe("Target branch name to compare against baseBranch."),
      setName: z.string().max(120).optional(),
      changeType: z.enum(["added", "modified", "deleted"]).optional(),
      limit: z.number().int().min(1).max(MAX_RESULT_ITEMS).optional().default(50),
    },
  }, async ({ orgId, projectId, baseBranch, headBranch, setName, changeType, limit = 50 }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId);
    const base = getBranchTokensAndThemes(project, baseBranch, deps.requestId);
    const head = getBranchTokensAndThemes(project, headBranch, deps.requestId);
    const diff = computeTokensDiff(base.rawTokens, head.rawTokens);
    const normalizedSet = setName?.trim().toLowerCase();
    const filteredFiles = diff.files.filter((file) => !normalizedSet || file.setName.toLowerCase() === normalizedSet);
    const allItems = filteredFiles
      .flatMap((file) => file.tokens)
      .filter((token) => !changeType || token.changeType === changeType);
    const items = allItems.slice(0, limit).map((token) => ({
      key: token.key,
      name: token.name,
      setName: token.setName,
      type: token.type,
      changeType: token.changeType,
      oldValue: token.oldValue ?? null,
      newValue: token.newValue ?? null,
      oldDescription: token.oldDescription || null,
      newDescription: token.newDescription || null,
    }));
    const sets = filteredFiles.map((file) => ({
      setName: file.setName,
      fileName: file.fileName,
      changeType: file.changeType,
      addedCount: file.addedCount,
      modifiedCount: file.modifiedCount,
      deletedCount: file.deletedCount,
    }));
    const truncated = items.length < allItems.length;
    return result({
      baseBranch: base.branchName,
      headBranch: head.branchName,
      hasChanges: diff.hasChanges,
      totalAdded: diff.totalAdded,
      totalModified: diff.totalModified,
      totalDeleted: diff.totalDeleted,
      sets,
      items,
      totalMatchedItems: allItems.length,
      truncated,
    }, meta(deps, project, revisionFor(project), truncated));
  });

  server.registerTool("get_project_schemas", {
    title: "Get project schemas",
    description: "List DTCG token type, color space, and function schemas enabled for the selected project.",
    inputSchema: {
      orgId: projectShape.orgId,
      projectId: projectShape.projectId,
      category: z.enum(["core", "color-spaces", "functions"]).optional(),
      enabledOnly: z.boolean().optional().default(true),
      query: z.string().max(100).optional(),
    },
  }, async ({ orgId, projectId, category, enabledOnly = true, query }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId);
    const enabledSet = project.project.enabledSchemas.length > 0
      ? new Set(project.project.enabledSchemas)
      : new Set(SCHEMA_CATALOG.filter((item) => item.isCoreDefault).map((item) => item.id));
    const needle = query?.trim().toLowerCase() || "";
    const origin = deps.req.nextUrl.origin;
    const items = SCHEMA_CATALOG
      .filter((item) => {
        if (enabledOnly && !enabledSet.has(item.id)) return false;
        if (category && item.category !== category) return false;
        if (needle) {
          const searchable = `${item.id} ${item.name} ${item.description}`.toLowerCase();
          if (!searchable.includes(needle)) return false;
        }
        return true;
      })
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        typeTag: item.typeTag,
        description: item.description,
        schemaUrl: `${origin}${item.schemaUrl}`,
        enabled: enabledSet.has(item.id),
        isCoreDefault: Boolean(item.isCoreDefault),
        version: item.version || null,
        dtcgCompliant: Boolean(item.dtcgCompliant),
      }));
    return result({
      items,
      total: items.length,
      enabledCount: enabledSet.size,
    }, meta(deps, project, revisionFor(project)));
  });

  server.registerTool("compare_token_themes", {
    title: "Compare token themes",
    description: "Compare resolved token values side-by-side across all configured theme groups and modes.",
    inputSchema: {
      orgId: projectShape.orgId,
      projectId: projectShape.projectId,
      branchName: projectShape.branchName,
      query: z.string().max(200).optional(),
      setName: z.string().max(120).optional(),
      type: z.string().max(50).optional(),
      limit: z.number().int().min(1).max(50).optional().default(25),
    },
  }, async ({ orgId, projectId, branchName, query, setName, type, limit = 25 }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId, "read", branchName);
    const revision = revisionFor(project);
    const matches = filterTokens(resolveTokens(project, undefined, deps.requestId), {
      query,
      setName,
      type,
    });
    const modeMaps = collectThemeModeMaps(project, deps.requestId);
    const page = matches.slice(0, limit);
    const items = page.map((token) => {
      const modes: Record<string, {
        groupName: string;
        optionName: string;
        setName: string;
        rawValue: string;
        resolvedValue: string;
        resolvedHex: string | null;
      }> = {};
      for (const mode of modeMaps) {
        const match = findModeTokenMatch(mode, token);
        if (match) {
          modes[`${mode.groupId}:${mode.optionId}`] = {
            groupName: mode.groupName,
            optionName: mode.optionName,
            setName: match.setName,
            rawValue: match.rawValue,
            resolvedValue: match.resolvedValue,
            resolvedHex: match.resolvedHex || null,
          };
        }
      }
      return {
        id: token.id,
        name: token.name,
        setName: token.setName,
        type: token.type,
        category: getCategoryForType(token.type),
        modes,
      };
    });
    const truncated = items.length < matches.length;
    return result({
      items,
      total: matches.length,
      truncated,
    }, meta(deps, project, revision, truncated));
  });

  server.registerTool("inspect_figma_variables", {
    title: "Inspect Figma variables",
    description: "Inspect synchronized Figma variable collections, modes, values, and sync metadata.",
    inputSchema: {
      ...projectShape,
      query: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(MAX_RESULT_ITEMS).optional().default(100),
    },
  }, async ({ orgId, projectId, query, limit = 100 }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId);
    const all = flattenDocument(project.project.figmaVariables);
    const needle = query?.trim().toLowerCase();
    const variables = all.filter((item) => !needle || `${item.id} ${item.name} ${item.rawValue} ${item.resolvedValue}`.toLowerCase().includes(needle))
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        name: item.name,
        collection: item.setName,
        type: item.type,
        rawValue: item.rawValue,
        resolvedValue: item.resolvedValue,
        isAlias: item.isAlias,
        aliasTarget: item.aliasTarget || null,
        figmaVariableKey: item.figmaVariableKey || null,
      }));
    return result({
      variables,
      total: all.length,
      metadata: project.project.figmaMeta,
      updatedAt: project.project.figmaMeta?.figmaUpdatedAt || null,
      truncated: variables.length < all.length,
    }, meta(deps, project, revisionFor(project), variables.length < all.length));
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
    description: "Export a bounded read-only token snapshot as CSS, SCSS, JSON, TypeScript, Tailwind, or Flutter.",
    inputSchema: {
      ...projectShape,
      format: z.enum(["css", "scss", "json", "typescript", "tailwind", "flutter"]).optional().default("css"),
      limit: z.number().int().min(1).max(MAX_EXPORT_ITEMS).optional(),
    },
  }, async ({ orgId, projectId, branchName, themeOptionIds, format = "css", limit = MAX_EXPORT_ITEMS }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId, "read", branchName);
    const all = resolveTokens(project, themeOptionIds, deps.requestId);
    const tokens = exportSafeTokens(all.slice(0, limit));
    const compilerConfig = project.project.compilerConfig as Partial<CompilerConfig>;
    let code: string;
    let language: string;
    if (format === "typescript") {
      code = compileReactTs(tokens, compilerConfig);
      language = "typescript";
    } else if (format === "tailwind") {
      code = compileTailwindConfig(tokens, compilerConfig);
      language = "javascript";
    } else if (format === "flutter") {
      code = compileFlutterDart(tokens, compilerConfig);
      language = "dart";
    } else {
      const compiled = compileStyleDictionary(tokens, project.project.themeGroups, compilerConfig);
      code = format === "json" ? compiled.tokensJson : format === "scss" ? compiled.scss : compiled.css;
      language = format;
    }
    return result({
      format,
      language,
      code,
      count: tokens.length,
      totalCount: all.length,
      truncated: tokens.length < all.length,
      snapshotRevision: revisionFor(project),
    }, meta(deps, project, revisionFor(project), tokens.length < all.length));
  });

  server.registerTool("search_project_assets", {
    title: "Search project assets",
    description: "Search authorized project asset metadata in R2; optionally include bounded inline SVG markup.",
    inputSchema: {
      ...projectShape,
      query: z.string().max(200).optional(),
      assetType: z.string().max(50).optional(),
      includeSvg: z.boolean().optional().default(false),
      limit: z.number().int().min(1).max(MAX_RESULT_ITEMS).optional().default(50),
    },
  }, async ({ orgId, projectId, query, assetType, includeSvg = false, limit = 50 }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId);
    let assets: ProjectAsset[];
    try {
      assets = await loadMetadataIndex(project.auth.orgId, project.auth.projectId);
    } catch {
      throw new McpError("UPSTREAM_UNAVAILABLE", "Project asset metadata is temporarily unavailable.", deps.requestId, 503);
    }
    const needle = query?.trim().toLowerCase();
    const filtered = assets.filter((asset) => {
      const searchable = `${asset.id} ${asset.name} ${asset.title || ""} ${asset.path || ""} ${asset.description || ""} ${asset.tag || ""}`.toLowerCase();
      return (!needle || searchable.includes(needle)) && (!assetType || asset.assetType === assetType || asset.type === assetType);
    });
    const items = filtered.slice(0, limit).map((asset) => safeAsset(asset, includeSvg));
    return result({ items, total: filtered.length, hasMore: filtered.length > items.length }, meta(deps, project, revisionFor(project), filtered.length > items.length));
  });

  server.registerTool("get_documentation_pages", {
    title: "Get documentation pages",
    description: "List project documentation pages and bounded block content for the selected project.",
    inputSchema: {
      ...projectShape,
      slug: z.string().max(200).optional(),
      includeUnpublished: z.boolean().optional().default(true),
      limit: z.number().int().min(1).max(MAX_PAGE_ITEMS).optional().default(MAX_PAGE_ITEMS),
    },
  }, async ({ orgId, projectId, slug, includeUnpublished = true, limit = MAX_PAGE_ITEMS }) => {
    const project = await resolveMcpProject(deps.req, deps.record, orgId, projectId, deps.requestId);
    const documentation = project.project.documentation || {};
    const pages = Array.isArray(documentation.pages) ? documentation.pages : [];
    const selected = pages.filter((page: any) => (!slug || page.slug === slug || page.id === slug) && (includeUnpublished || page.isPublished))
      .slice(0, limit)
      .map((page: any) => ({
        id: page.id,
        slug: page.slug,
        title: page.title,
        description: page.description || null,
        folderId: page.folderId || null,
        order: page.order,
        layout: page.layout,
        isPublished: Boolean(page.isPublished),
        updatedAt: page.updatedAt || null,
        blocks: Array.isArray(page.blocks) ? page.blocks.slice(0, 100).map(safeDocBlock).filter(Boolean) : [],
      }));
    return result({
      folders: Array.isArray(documentation.folders) ? documentation.folders : [],
      pages: selected,
      total: pages.length,
      hasMore: pages.length > selected.length,
      isPublishedGlobally: Boolean(documentation.isPublishedGlobally),
      publishedUrlSlug: documentation.publishedUrlSlug || null,
    }, meta(deps, project, revisionFor(project), pages.length > selected.length));
  });
}
