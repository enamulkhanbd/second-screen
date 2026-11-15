export const MCP_SURFACE_VERSION = "1.0" as const;

export const MCP_KNOWN_TOOL_NAMES = [
  "list_workspaces",
  "get_project_overview",
  "list_token_sets",
  "get_themes_matrix",
  "search_tokens",
  "get_token_details",
  "get_token_usage",
  "validate_tokens",
  "list_branches",
  "compare_branches",
  "get_project_schemas",
  "compare_token_themes",
  "inspect_figma_variables",
  "search_project_assets",
  "get_documentation_pages",
  "check_color_contrast",
  "export_tokens_code",
] as const;

export type McpCredentialType = "personal" | "mcp_project";

export type McpTokenValue =
  | { kind: "scalar"; value: string | number | boolean | null }
  | { kind: "composite"; value: Record<string, unknown> | unknown[] };

export type McpProjectContext = {
  credentialId: string;
  uid: string;
  orgId: string;
  projectId: string;
  role: string;
  branchId?: string;
  branchRevision?: string;
};

export type McpResponseMeta = {
  requestId: string;
  serverVersion: string;
  surfaceVersion: typeof MCP_SURFACE_VERSION;
  orgId?: string;
  projectId?: string;
  branchId?: string;
  revision?: string;
  truncated: boolean;
};

export type McpPage<T> = {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  snapshotRevision: string;
};

export type McpToolResult<T> = {
  data: T;
  meta: McpResponseMeta;
};

export type McpDomainErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PROJECT_NOT_FOUND"
  | "TOKEN_NOT_FOUND"
  | "AMBIGUOUS_TOKEN"
  | "INVALID_ARGUMENT"
  | "CURSOR_INVALID"
  | "LIMIT_EXCEEDED"
  | "CONFLICT"
  | "CONFIRMATION_INVALID"
  | "WRITE_DISABLED"
  | "UPSTREAM_UNAVAILABLE"
  | "NOT_IMPLEMENTED";

export type McpDomainError = {
  code: McpDomainErrorCode;
  message: string;
  requestId: string;
};
