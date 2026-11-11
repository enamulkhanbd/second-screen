export const MCP_SURFACE_VERSION = "1.0" as const;

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
  | "INVALID_ARGUMENT"
  | "CURSOR_INVALID"
  | "LIMIT_EXCEEDED"
  | "UPSTREAM_UNAVAILABLE"
  | "NOT_IMPLEMENTED";

export type McpDomainError = {
  code: McpDomainErrorCode;
  message: string;
  requestId: string;
};
