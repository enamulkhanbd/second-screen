import { NextResponse } from "next/server";
import { MCP_SERVER_VERSION, MCP_TOOL_NAMES } from "@/lib/mcp/server";
import { MCP_SURFACE_VERSION } from "@/lib/mcp/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    server: "second-screen-mcp",
    serverVersion: MCP_SERVER_VERSION,
    surfaceVersion: MCP_SURFACE_VERSION,
    transport: "streamable-http",
    mode: "stateless-json",
    capabilities: {
      tools: MCP_TOOL_NAMES,
      resources: [],
      prompts: [],
      writeEnabled: false,
    },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
