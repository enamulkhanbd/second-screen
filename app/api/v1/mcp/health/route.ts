import { NextResponse } from "next/server";
import { MCP_SERVER_VERSION, MCP_TOOL_NAMES } from "@/lib/mcp/server";
import { MCP_SURFACE_VERSION } from "@/lib/mcp/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const sharedLimiterConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
  const trustedOriginsConfigured = Boolean(process.env.SECOND_SCREEN_TRUSTED_ORIGINS);
  return NextResponse.json({
    status: "ok",
    server: "second-screen-mcp",
    serverVersion: MCP_SERVER_VERSION,
    surfaceVersion: MCP_SURFACE_VERSION,
    transport: "streamable-http",
    mode: "stateless-json",
    productionReadiness: {
      sharedRateLimiterConfigured: sharedLimiterConfigured,
      trustedOriginsConfigured,
      writeCapabilitiesEnabled: false,
    },
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
