import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NextRequest } from "next/server";
import type { ApiKeyRecord } from "@/utils/patAuth";
import { registerMcpTools } from "./tools";

export const MCP_TOOL_NAMES = [
  "list_workspaces",
  "get_project_overview",
  "list_token_sets",
  "get_themes_matrix",
  "search_tokens",
  "get_token_details",
  "get_token_usage",
  "validate_tokens",
  "list_branches",
  "inspect_figma_variables",
  "search_project_assets",
  "get_documentation_pages",
  "check_color_contrast",
  "export_tokens_code",
] as const;

export const MCP_SERVER_VERSION = "0.1.0";

export function createMcpServer(req: NextRequest, record: ApiKeyRecord, requestId: string) {
  const server = new McpServer({
    name: "second-screen-mcp",
    version: MCP_SERVER_VERSION,
  });

  registerMcpTools(server, { req, record, requestId });
  return server;
}
