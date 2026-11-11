import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateRequest } from "@/utils/auth";
import { getTrustedCorsHeaders, handleTrustedOptionsCors } from "@/utils/cors";
import { consumeMcpRateLimit } from "@/lib/mcp/limits";
import { createMcpServer } from "@/lib/mcp/server";
import { toSafeMcpError } from "@/lib/mcp/errors";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 128 * 1024;
const DEFAULT_RATE_LIMIT = 120;

function requestId(req: NextRequest) {
  return req.headers.get("x-request-id")?.slice(0, 100) || `mcp_${crypto.randomUUID()}`;
}

function errorResponse(req: NextRequest, id: string | number | null, status: number, message: string, code = -32000) {
  const headers = new Headers(getTrustedCorsHeaders(req));
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Request-Id", requestId(req));
  return NextResponse.json({ jsonrpc: "2.0", error: { code, message }, id }, { status, headers });
}

function withRequestHeaders(response: Response, req: NextRequest, id: string) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(getTrustedCorsHeaders(req))) headers.set(key, value);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Request-Id", id);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function OPTIONS(req: NextRequest) {
  return handleTrustedOptionsCors(req);
}

export async function GET(req: NextRequest) {
  return errorResponse(req, null, 405, "MCP uses POST for stateless JSON requests.", -32000);
}

export async function DELETE(req: NextRequest) {
  return errorResponse(req, null, 405, "Stateless MCP sessions cannot be deleted.", -32000);
}

export async function POST(req: NextRequest) {
  const id = requestId(req);
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return errorResponse(req, null, 413, "MCP request body exceeds the maximum size.", -32600);
  }

  const auth = await authenticateRequest(req, "read:tokens");
  if (!auth.isValid || !auth.record) {
    return errorResponse(req, null, 401, "Unauthorized.", -32001);
  }

  const rateLimit = consumeMcpRateLimit(
    `${auth.record.keyHash || auth.record.uid}:${req.headers.get("x-forwarded-for") || "direct"}`,
    { limit: Number(process.env.MCP_RATE_LIMIT_PER_MINUTE || DEFAULT_RATE_LIMIT), windowMs: 60_000 },
  );
  if (!rateLimit.allowed) {
    const response = errorResponse(req, null, 429, "MCP rate limit exceeded.", -32029);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    response.headers.set("X-RateLimit-Remaining", "0");
    return response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(req, null, 400, "MCP request body must be valid JSON.", -32600);
  }

  try {
    const server = createMcpServer(req, auth.record, id);
    const allowedOrigins = process.env.SECOND_SCREEN_TRUSTED_ORIGINS
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) || [req.nextUrl.origin];
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: MAX_REQUEST_BYTES,
      enableDnsRebindingProtection: true,
      allowedOrigins,
    });
    await server.connect(transport);
    const response = await transport.handleRequest(req, { parsedBody: body });
    await server.close();
    const decorated = withRequestHeaders(response, req, id);
    decorated.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    return decorated;
  } catch (error) {
    const safe = toSafeMcpError(error, id);
    return errorResponse(req, null, safe.status, safe.message, -32000);
  }
}
