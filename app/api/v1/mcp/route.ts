import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateRequest } from "@/utils/auth";
import { getTrustedCorsHeaders, handleTrustedOptionsCors } from "@/utils/cors";
import { consumeMcpRateLimitAsync } from "@/lib/mcp/limits";
import { createMcpServer } from "@/lib/mcp/server";
import { toSafeMcpError } from "@/lib/mcp/errors";
import {
  classifyMcpOutcome,
  extractMcpRequestInfo,
  recordMcpMetric,
  recordMcpUsageEvent,
  type McpOutcome,
} from "@/lib/mcp/observability";
import type { ApiKeyRecord } from "@/utils/patAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_RESPONSE_BYTES = 512 * 1024;
const MCP_TIMEOUT_MS = 15_000;
const DEFAULT_RATE_LIMIT = 120;

function requestId(req: NextRequest) {
  return req.headers.get("x-request-id")?.slice(0, 100) || `mcp_${crypto.randomUUID()}`;
}

function errorResponse(
  req: NextRequest,
  id: string | number | null,
  status: number,
  message: string,
  code = -32000,
  requestIdValue?: string,
  authenticate = false,
) {
  const headers = new Headers(getTrustedCorsHeaders(req));
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Request-Id", requestIdValue || requestId(req));
  if (authenticate) headers.set("WWW-Authenticate", "Bearer");
  return NextResponse.json({ jsonrpc: "2.0", error: { code, message }, id }, { status, headers });
}

function withRequestHeaders(response: Response, req: NextRequest, id: string) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(getTrustedCorsHeaders(req))) headers.set(key, value);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Request-Id", id);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("MCP request timed out.")), timeoutMs);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function emitTelemetry(params: {
  requestId: string;
  startedAt: number;
  record: ApiKeyRecord;
  status: number;
  outcome: McpOutcome;
  rpcMethod: string;
  toolName?: string;
  clientName?: string;
  errorClass?: string;
  responseBytes?: number;
  rateLimitConfigured?: boolean;
}) {
  const durationMs = Date.now() - params.startedAt;
  recordMcpMetric({
    requestId: params.requestId,
    status: params.status,
    durationMs,
    rateLimitConfigured: params.rateLimitConfigured,
    errorClass: params.errorClass,
  });

  if (!params.record.orgId || !params.record.projectId) return;

  await recordMcpUsageEvent({
    id: params.requestId,
    orgId: params.record.orgId,
    projectId: params.record.projectId,
    credentialId: params.record.id,
    keyPrefix: params.record.keyPrefix,
    keyName: params.record.name,
    rpcMethod: params.rpcMethod,
    toolName: params.toolName,
    clientName: params.clientName,
    statusCode: params.status,
    outcome: params.outcome,
    errorClass: params.errorClass,
    durationMs,
    responseBytes: params.responseBytes ?? 0,
  });
}

export async function OPTIONS(req: NextRequest) {
  return handleTrustedOptionsCors(req);
}

export async function GET(req: NextRequest) {
  return errorResponse(req, null, 405, "MCP uses POST for stateless JSON requests.", -32000, requestId(req));
}

export async function DELETE(req: NextRequest) {
  return errorResponse(req, null, 405, "Stateless MCP sessions cannot be deleted.", -32000, requestId(req));
}

export async function POST(req: NextRequest) {
  const id = requestId(req);
  const startedAt = Date.now();
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return errorResponse(req, null, 413, "MCP request body exceeds the maximum size.", -32600, id);
  }

  const auth = await authenticateRequest(req, "read:tokens");
  if (!auth.isValid || !auth.record) {
    return errorResponse(req, null, 401, "Unauthorized.", -32001, id, true);
  }
  if (auth.record.credentialType !== "mcp_project") {
    return errorResponse(req, null, 403, "MCP requires a project-bound read-only credential.", -32003, id);
  }

  const rateLimit = await consumeMcpRateLimitAsync(
    `credential:${auth.record.keyHash || auth.record.uid}`,
    { limit: Number(process.env.MCP_RATE_LIMIT_PER_MINUTE || DEFAULT_RATE_LIMIT), windowMs: 60_000 },
  );
  if (rateLimit.unavailable) {
    await emitTelemetry({
      requestId: id,
      startedAt,
      record: auth.record,
      status: 503,
      outcome: "server_error",
      rpcMethod: "rate_limit_unavailable",
      errorClass: "RATE_LIMIT_UNAVAILABLE",
      rateLimitConfigured: rateLimit.configured,
    });
    return errorResponse(req, null, 503, "MCP rate limiting is temporarily unavailable.", -32030, id);
  }
  if (!rateLimit.allowed) {
    const response = errorResponse(req, null, 429, "MCP rate limit exceeded.", -32029, id);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    response.headers.set("X-RateLimit-Remaining", "0");
    await emitTelemetry({
      requestId: id,
      startedAt,
      record: auth.record,
      status: 429,
      outcome: "rate_limited",
      rpcMethod: "rate_limited",
      errorClass: "RATE_LIMITED",
      rateLimitConfigured: rateLimit.configured,
    });
    return response;
  }

  let body: unknown;
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      await emitTelemetry({
        requestId: id,
        startedAt,
        record: auth.record,
        status: 413,
        outcome: "client_error",
        rpcMethod: "payload_too_large",
        errorClass: "PAYLOAD_TOO_LARGE",
        rateLimitConfigured: rateLimit.configured,
      });
      return errorResponse(req, null, 413, "MCP request body exceeds the maximum size.", -32600, id);
    }
    body = JSON.parse(rawBody);
  } catch {
    await emitTelemetry({
      requestId: id,
      startedAt,
      record: auth.record,
      status: 400,
      outcome: "client_error",
      rpcMethod: "invalid_json",
      errorClass: "INVALID_JSON",
      rateLimitConfigured: rateLimit.configured,
    });
    return errorResponse(req, null, 400, "MCP request body must be valid JSON.", -32600, id);
  }
  if (Array.isArray(body)) {
    await emitTelemetry({
      requestId: id,
      startedAt,
      record: auth.record,
      status: 400,
      outcome: "client_error",
      rpcMethod: "batch_rejected",
      errorClass: "BATCH_NOT_SUPPORTED",
      rateLimitConfigured: rateLimit.configured,
    });
    return errorResponse(req, null, 400, "JSON-RPC batch requests are not supported.", -32600, id);
  }

  const requestInfo = extractMcpRequestInfo(body);

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
    const response = await withTimeout(transport.handleRequest(req, { parsedBody: body }), MCP_TIMEOUT_MS);
    const responseBody = await response.arrayBuffer();
    await server.close();
    if (responseBody.byteLength > MAX_RESPONSE_BYTES) {
      await emitTelemetry({
        requestId: id,
        startedAt,
        record: auth.record,
        status: 413,
        outcome: "client_error",
        rpcMethod: requestInfo.rpcMethod,
        toolName: requestInfo.toolName,
        clientName: requestInfo.clientName,
        errorClass: "RESPONSE_TOO_LARGE",
        responseBytes: responseBody.byteLength,
        rateLimitConfigured: rateLimit.configured,
      });
      return errorResponse(req, null, 413, "MCP response exceeds the maximum size.", -32000, id);
    }
    const decorated = withRequestHeaders(new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }), req, id);
    decorated.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    const classified = classifyMcpOutcome(
      decorated.status,
      response.headers.get("content-type"),
      responseBody,
    );
    await emitTelemetry({
      requestId: id,
      startedAt,
      record: auth.record,
      status: decorated.status,
      outcome: classified.outcome,
      rpcMethod: requestInfo.rpcMethod,
      toolName: requestInfo.toolName,
      clientName: requestInfo.clientName,
      errorClass: classified.errorClass,
      responseBytes: responseBody.byteLength,
      rateLimitConfigured: rateLimit.configured,
    });
    return decorated;
  } catch (error) {
    const safe = toSafeMcpError(error, id);
    await emitTelemetry({
      requestId: id,
      startedAt,
      record: auth.record,
      status: safe.status,
      outcome: safe.status >= 500 ? "server_error" : "client_error",
      rpcMethod: requestInfo.rpcMethod,
      toolName: requestInfo.toolName,
      clientName: requestInfo.clientName,
      errorClass: safe.code,
      rateLimitConfigured: rateLimit.configured,
    });
    return errorResponse(req, null, safe.status, safe.message, -32000, id);
  }
}
