import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NextRequest } from "next/server";
import type { ApiKeyRecord } from "@/utils/patAuth";
import { MCP_KNOWN_TOOL_NAMES } from "./types";
import { registerMcpTools } from "./tools";

export const MCP_TOOL_NAMES = MCP_KNOWN_TOOL_NAMES;

export const MCP_SERVER_NAME = "Tokens Platform";
export const MCP_SERVER_VERSION = "0.1.0";

export function createMcpServer(req: NextRequest, record: ApiKeyRecord, requestId: string) {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  registerMcpTools(server, { req, record, requestId });
  return server;
}
