import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type McpMetric = {
  requestId: string;
  status: number;
  durationMs: number;
  rateLimitConfigured?: boolean;
  errorClass?: string;
};

export type McpOutcome =
  | "success"
  | "tool_error"
  | "rate_limited"
  | "client_error"
  | "server_error";

export type McpAnalyticsRange = "24h" | "7d" | "30d";

export type McpUsageEventRecord = {
  id: string;
  orgId: string;
  projectId: string;
  credentialId?: string;
  keyPrefix?: string;
  keyName?: string;
  rpcMethod: string;
  toolName?: string;
  clientName?: string;
  statusCode: number;
  outcome: McpOutcome;
  errorClass?: string;
  errorMessage?: string;
  durationMs: number;
  responseBytes: number;
  createdAt: string;
};

export type McpAnalyticsSummary = {
  totalRequests: number;
  toolCalls: number;
  successCount: number;
  toolErrorCount: number;
  rateLimitedCount: number;
  clientErrorCount: number;
  serverErrorCount: number;
  errorCount: number;
  successRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  totalResponseBytes: number;
  activeKeysCount: number;
};

export type McpTimelineBucket = {
  bucketStart: string;
  total: number;
  success: number;
  errors: number;
  rateLimited: number;
  avgDurationMs: number;
};

export type McpToolMetric = {
  toolName: string;
  calls: number;
  errors: number;
  errorRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  lastCalledAt: string;
};

export type McpKeyMetric = {
  credentialId: string;
  keyPrefix: string;
  keyName: string;
  calls: number;
  errors: number;
  rateLimited: number;
  lastUsedAt: string;
};

export type McpCountMetric = {
  name: string;
  count: number;
};

export type McpRecentEvent = {
  id: string;
  createdAt: string;
  rpcMethod: string;
  toolName?: string | null;
  clientName?: string | null;
  keyPrefix?: string | null;
  keyName?: string | null;
  outcome: McpOutcome;
  statusCode: number;
  errorClass?: string | null;
  errorMessage?: string | null;
  durationMs: number;
  responseBytes: number;
};

export type McpAnalyticsHealth = {
  sharedRateLimiterConfigured: boolean;
  rateLimitPerMinute: number;
  writeEnabled: boolean;
};

export type McpAnalyticsResponse = {
  available: boolean;
  setupRequired?: boolean;
  source: "supabase" | "memory";
  range: McpAnalyticsRange;
  summary: McpAnalyticsSummary;
  timeline: McpTimelineBucket[];
  byTool: McpToolMetric[];
  byKey: McpKeyMetric[];
  byMethod: Array<{ method: string; count: number }>;
  clients: McpCountMetric[];
  recentEvents: McpRecentEvent[];
  health: McpAnalyticsHealth;
};

const MAX_IN_MEMORY_EVENTS = 1000;
const LAST_USED_THROTTLE_MS = 60_000;
const PERSIST_WAIT_CAP_MS = 150;
const DEFAULT_RATE_LIMIT = 120;

const inMemoryEvents: McpUsageEventRecord[] = [];
const lastUsedTouchCache = new Map<string, number>();

export function recordMcpMetric(metric: McpMetric) {
  if (process.env.MCP_OBSERVABILITY !== "true") return;
  console.info(JSON.stringify({
    event: "mcp_request",
    ...metric,
  }));
}

export function rangeToHours(range: McpAnalyticsRange): number {
  if (range === "24h") return 24;
  if (range === "30d") return 24 * 30;
  return 24 * 7;
}

export function parseAnalyticsRange(value: string | null): McpAnalyticsRange {
  if (value === "24h" || value === "7d" || value === "30d") return value;
  return "7d";
}

function sanitizeLabel(value: unknown, maxLen = 80): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

/**
 * Extracts safe JSON-RPC method, tool name, and client name from an MCP POST body
 * without persisting token payloads or sensitive request arguments.
 */
export function extractMcpRequestInfo(body: unknown): {
  rpcMethod: string;
  toolName?: string;
  clientName?: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { rpcMethod: "invalid_request" };
  }
  const obj = body as Record<string, unknown>;
  const rpcMethod = sanitizeLabel(obj.method) || "unknown";
  const params = obj.params && typeof obj.params === "object" && !Array.isArray(obj.params)
    ? (obj.params as Record<string, unknown>)
    : undefined;

  const toolName = rpcMethod === "tools/call" ? sanitizeLabel(params?.name) : undefined;
  const clientInfo = params?.clientInfo && typeof params.clientInfo === "object" && !Array.isArray(params.clientInfo)
    ? (params.clientInfo as Record<string, unknown>)
    : undefined;
  const clientName = rpcMethod === "initialize" ? sanitizeLabel(clientInfo?.name) : undefined;

  return { rpcMethod, toolName, clientName };
}

function classifyToolErrorText(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("not found")) return "NOT_FOUND";
  if (lower.includes("exceeds") || lower.includes("limit")) return "LIMIT_EXCEEDED";
  if (lower.includes("forbidden") || lower.includes("unauthorized")) return "FORBIDDEN";
  if (lower.includes("unavailable") || lower.includes("timed out")) return "UPSTREAM_UNAVAILABLE";
  if (lower.includes("invalid") || lower.includes("unknown") || lower.includes("required")) return "INVALID_ARGUMENT";
  return "TOOL_ERROR";
}

type ParsedJsonRpcBody = {
  error?: { code?: number; message?: unknown; data?: unknown };
  result?: { isError?: boolean; content?: Array<{ text?: unknown }> };
};

export function sanitizeMcpErrorMessage(value: unknown, maxLen = 240): string | undefined {
  if (typeof value !== "string") return undefined;
  const redacted = value
    .replace(/\s+/g, " ")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .replace(/sec_pat_[A-Za-z0-9_]+/g, "sec_pat_***")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "***")
    .trim();
  if (!redacted) return undefined;
  if (redacted.length <= maxLen) return redacted;
  return `${redacted.slice(0, maxLen - 3)}...`;
}

function tryParseJsonRpcBody(
  contentType: string | null,
  responseBuffer?: ArrayBuffer | null,
): ParsedJsonRpcBody | null {
  if (!responseBuffer || !contentType?.toLowerCase().includes("application/json")) {
    return null;
  }
  try {
    const text = new TextDecoder().decode(responseBuffer);
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as ParsedJsonRpcBody) : null;
  } catch {
    return null;
  }
}

function classifyHttpErrorClass(statusCode: number, message?: string, rpcCode?: number): string {
  const lower = (message || "").toLowerCase();
  if (statusCode === 429) return "RATE_LIMITED";
  if (statusCode === 413) return "PAYLOAD_TOO_LARGE";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 406 || lower.includes("not acceptable")) return "NOT_ACCEPTABLE";
  if (statusCode === 415 || lower.includes("unsupported media type")) return "UNSUPPORTED_MEDIA_TYPE";
  if (lower.includes("unsupported protocol version")) return "UNSUPPORTED_PROTOCOL_VERSION";
  if (lower.includes("invalid origin")) return "INVALID_ORIGIN";
  if (lower.includes("invalid host")) return "INVALID_HOST";
  if (lower.includes("mcp-session-id")) return "MISSING_SESSION_ID";
  if (lower.includes("already initialized") || lower.includes("not initialized")) return "INVALID_SESSION_STATE";
  if (statusCode === 403) return "FORBIDDEN";
  if (lower.includes("invalid json-rpc") || rpcCode === -32700) return "INVALID_JSONRPC";
  if (rpcCode === -32601 || lower.includes("method not found")) return "METHOD_NOT_FOUND";
  if (rpcCode === -32602 || lower.includes("invalid params")) return "INVALID_PARAMS";
  if (rpcCode === -32600) return "INVALID_REQUEST";
  if (statusCode >= 500) return "SERVER_ERROR";
  return "CLIENT_ERROR";
}

/**
 * Extracts a sanitized, secret-free error message from an MCP JSON HTTP or JSON-RPC response body.
 */
export function extractMcpErrorMessage(
  contentType: string | null,
  responseBuffer?: ArrayBuffer | null,
): string | undefined {
  const parsed = tryParseJsonRpcBody(contentType, responseBuffer);
  if (!parsed) return undefined;

  if (parsed.error) {
    const baseMsg = sanitizeMcpErrorMessage(parsed.error.message);
    if (baseMsg === "Parse error" && typeof parsed.error.data === "string") {
      return sanitizeMcpErrorMessage(`${baseMsg}: ${parsed.error.data}`);
    }
    return baseMsg;
  }

  if (parsed.result?.isError) {
    return sanitizeMcpErrorMessage(parsed.result.content?.[0]?.text);
  }

  return undefined;
}

/**
 * Classifies an MCP HTTP/JSON-RPC response into an outcome bucket, catching
 * SDK-wrapped tool errors (`result.isError: true`) that still return HTTP 200.
 */
export function classifyMcpOutcome(
  statusCode: number,
  contentType: string | null,
  responseBuffer?: ArrayBuffer | null,
): { outcome: McpOutcome; errorClass?: string } {
  const parsed = tryParseJsonRpcBody(contentType, responseBuffer);
  const rpcErrorMessage = typeof parsed?.error?.message === "string" ? parsed.error.message : undefined;
  const rpcErrorCode = parsed?.error?.code;

  if (statusCode === 429) {
    return { outcome: "rate_limited", errorClass: "RATE_LIMITED" };
  }
  if (statusCode >= 500) {
    return {
      outcome: "server_error",
      errorClass: classifyHttpErrorClass(statusCode, rpcErrorMessage, rpcErrorCode),
    };
  }
  if (statusCode >= 400) {
    return {
      outcome: "client_error",
      errorClass: classifyHttpErrorClass(statusCode, rpcErrorMessage, rpcErrorCode),
    };
  }

  if (parsed?.error) {
    return {
      outcome: rpcErrorCode === -32603 || rpcErrorCode === -32000 ? "server_error" : "client_error",
      errorClass: rpcErrorCode !== undefined ? `JSONRPC_${rpcErrorCode}` : "JSONRPC_ERROR",
    };
  }
  if (parsed?.result?.isError) {
    const firstText = typeof parsed.result.content?.[0]?.text === "string" ? parsed.result.content[0].text : "";
    return {
      outcome: "tool_error",
      errorClass: classifyToolErrorText(firstText),
    };
  }

  return { outcome: "success" };
}

function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function tryVercelWaitUntil(promise: Promise<unknown>): boolean {
  try {
    const symbol = Symbol.for("@vercel/request-context");
    const ctx = (globalThis as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } }>)[symbol];
    const waitUntil = ctx?.get?.()?.waitUntil;
    if (typeof waitUntil === "function") {
      waitUntil(promise);
      return true;
    }
  } catch {
    // Ignore when not running inside Vercel request context.
  }
  return false;
}

function pushInMemoryEvent(event: McpUsageEventRecord) {
  inMemoryEvents.push(event);
  if (inMemoryEvents.length > MAX_IN_MEMORY_EVENTS) {
    inMemoryEvents.splice(0, inMemoryEvents.length - MAX_IN_MEMORY_EVENTS);
  }
}

async function persistUsageToSupabase(
  event: McpUsageEventRecord,
  shouldTouchLastUsed: boolean,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const eventsQuery = admin.from("mcp_usage_events");
    const tasks: Array<PromiseLike<unknown>> = [];

    if (eventsQuery && typeof (eventsQuery as { insert?: unknown }).insert === "function") {
      const baseRow = {
        id: event.id,
        org_id: event.orgId,
        project_id: event.projectId,
        credential_id: event.credentialId || null,
        key_prefix: event.keyPrefix || null,
        key_name: event.keyName || null,
        rpc_method: event.rpcMethod,
        tool_name: event.toolName || null,
        client_name: event.clientName || null,
        status_code: event.statusCode,
        outcome: event.outcome,
        error_class: event.errorClass || null,
        duration_ms: Math.max(0, Math.round(event.durationMs)),
        response_bytes: Math.max(0, Math.round(event.responseBytes)),
        created_at: event.createdAt,
      };
      const sanitizedErrorMessage = sanitizeMcpErrorMessage(event.errorMessage) || null;
      tasks.push(
        (async () => {
          const res = (await eventsQuery.insert({
            ...baseRow,
            error_message: sanitizedErrorMessage,
          })) as { error?: { code?: string; message?: string } | null } | undefined;
          const err = res?.error;
          if (
            err &&
            (err.code === "42703" ||
              err.code === "PGRST204" ||
              (err.message || "").includes("error_message"))
          ) {
            // Fall back cleanly if the database has not applied the error_message column migration yet.
            await eventsQuery.insert(baseRow);
          }
        })(),
      );
    }

    if (shouldTouchLastUsed && event.credentialId) {
      const keysQuery = admin.from("api_keys");
      if (keysQuery && typeof (keysQuery as { update?: unknown }).update === "function") {
        tasks.push(
          keysQuery
            .update({ last_used_at: event.createdAt })
            .eq("id", event.credentialId),
        );
      }
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }
  } catch {
    // Telemetry persistence must never fail or reject MCP responses.
  }
}

/**
 * Records a project-scoped MCP usage event non-blockingly and updates
 * `api_keys.last_used_at` (throttled per credential to 60s).
 */
export async function recordMcpUsageEvent(
  input: Omit<McpUsageEventRecord, "id" | "createdAt"> & { id?: string; createdAt?: string },
): Promise<void> {
  const createdAt = input.createdAt || new Date().toISOString();
  const event: McpUsageEventRecord = {
    ...input,
    id: input.id || `evt_${crypto.randomUUID()}`,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    responseBytes: Math.max(0, Math.round(input.responseBytes)),
    createdAt,
  };

  if (!isSupabaseAdminConfigured()) {
    pushInMemoryEvent(event);
    return;
  }

  let shouldTouchLastUsed = false;
  if (event.credentialId) {
    const nowMs = Date.now();
    const prev = lastUsedTouchCache.get(event.credentialId) ?? 0;
    if (nowMs - prev >= LAST_USED_THROTTLE_MS) {
      lastUsedTouchCache.set(event.credentialId, nowMs);
      shouldTouchLastUsed = true;
    }
  }

  const persistPromise = persistUsageToSupabase(event, shouldTouchLastUsed);
  if (tryVercelWaitUntil(persistPromise)) {
    return;
  }

  await Promise.race([
    persistPromise,
    new Promise<void>((resolve) => setTimeout(resolve, PERSIST_WAIT_CAP_MS)),
  ]);
}

function computePercentile(sortedAscending: number[], percentile: number): number {
  if (sortedAscending.length === 0) return 0;
  const index = Math.ceil(percentile * sortedAscending.length) - 1;
  const clamped = Math.max(0, Math.min(sortedAscending.length - 1, index));
  return Math.round(sortedAscending[clamped]);
}

function truncateUtcBucket(dateMs: number, bucketKind: "hour" | "day"): number {
  const d = new Date(dateMs);
  if (bucketKind === "hour") {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), 0, 0, 0);
  }
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}

/**
 * Pure TypeScript aggregator used for the in-memory telemetry store and unit tests.
 */
export function aggregateMcpUsageEvents(
  events: McpUsageEventRecord[],
  range: McpAnalyticsRange,
  nowMs = Date.now(),
): Omit<McpAnalyticsResponse, "available" | "setupRequired" | "source" | "health"> {
  const hours = rangeToHours(range);
  const sinceMs = nowMs - hours * 3600_000;
  const filtered = events
    .filter((evt) => {
      const ts = Date.parse(evt.createdAt);
      return Number.isFinite(ts) && ts >= sinceMs && ts <= nowMs + 60_000;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const durations: number[] = [];
  let toolCalls = 0;
  let successCount = 0;
  let toolErrorCount = 0;
  let rateLimitedCount = 0;
  let clientErrorCount = 0;
  let serverErrorCount = 0;
  let totalDuration = 0;
  let totalResponseBytes = 0;
  const activeKeys = new Set<string>();

  const bucketKind: "hour" | "day" = hours <= 48 ? "hour" : "day";
  const stepMs = bucketKind === "hour" ? 3600_000 : 86400_000;
  const firstBucketMs = truncateUtcBucket(sinceMs, bucketKind);
  const lastBucketMs = truncateUtcBucket(nowMs, bucketKind);
  const bucketMap = new Map<number, {
    total: number;
    success: number;
    errors: number;
    rateLimited: number;
    durationSum: number;
  }>();
  for (let t = firstBucketMs; t <= lastBucketMs; t += stepMs) {
    bucketMap.set(t, { total: 0, success: 0, errors: 0, rateLimited: 0, durationSum: 0 });
  }

  const toolMap = new Map<string, {
    calls: number;
    errors: number;
    durations: number[];
    durationSum: number;
    lastCalledAt: string;
  }>();
  const keyMap = new Map<string, {
    credentialId: string;
    keyPrefix: string;
    keyName: string;
    calls: number;
    errors: number;
    rateLimited: number;
    lastUsedAt: string;
  }>();
  const methodMap = new Map<string, number>();
  const clientMap = new Map<string, number>();

  for (const evt of filtered) {
    durations.push(evt.durationMs);
    totalDuration += evt.durationMs;
    totalResponseBytes += evt.responseBytes;
    if (evt.rpcMethod === "tools/call") toolCalls += 1;

    if (evt.outcome === "success") successCount += 1;
    else if (evt.outcome === "tool_error") toolErrorCount += 1;
    else if (evt.outcome === "rate_limited") rateLimitedCount += 1;
    else if (evt.outcome === "client_error") clientErrorCount += 1;
    else if (evt.outcome === "server_error") serverErrorCount += 1;

    const keyId = evt.credentialId || evt.keyPrefix;
    if (keyId) {
      activeKeys.add(keyId);
      const existingKey = keyMap.get(keyId);
      if (!existingKey) {
        keyMap.set(keyId, {
          credentialId: keyId,
          keyPrefix: evt.keyPrefix || "unknown",
          keyName: evt.keyName || "MCP Key",
          calls: 1,
          errors: evt.outcome === "success" ? 0 : 1,
          rateLimited: evt.outcome === "rate_limited" ? 1 : 0,
          lastUsedAt: evt.createdAt,
        });
      } else {
        existingKey.calls += 1;
        if (evt.outcome !== "success") existingKey.errors += 1;
        if (evt.outcome === "rate_limited") existingKey.rateLimited += 1;
      }
    }

    const bucketMs = truncateUtcBucket(Date.parse(evt.createdAt), bucketKind);
    const bucket = bucketMap.get(bucketMs);
    if (bucket) {
      bucket.total += 1;
      bucket.durationSum += evt.durationMs;
      if (evt.outcome === "success") bucket.success += 1;
      else if (evt.outcome === "rate_limited") bucket.rateLimited += 1;
      else bucket.errors += 1;
    }

    if (evt.toolName) {
      const existingTool = toolMap.get(evt.toolName);
      if (!existingTool) {
        toolMap.set(evt.toolName, {
          calls: 1,
          errors: evt.outcome === "success" ? 0 : 1,
          durations: [evt.durationMs],
          durationSum: evt.durationMs,
          lastCalledAt: evt.createdAt,
        });
      } else {
        existingTool.calls += 1;
        if (evt.outcome !== "success") existingTool.errors += 1;
        existingTool.durations.push(evt.durationMs);
        existingTool.durationSum += evt.durationMs;
      }
    }

    methodMap.set(evt.rpcMethod, (methodMap.get(evt.rpcMethod) || 0) + 1);
    if (evt.clientName) {
      clientMap.set(evt.clientName, (clientMap.get(evt.clientName) || 0) + 1);
    }
  }

  durations.sort((a, b) => a - b);
  const totalRequests = filtered.length;
  const errorCount = totalRequests - successCount;

  const timeline: McpTimelineBucket[] = Array.from(bucketMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, b]) => ({
      bucketStart: new Date(ts).toISOString(),
      total: b.total,
      success: b.success,
      errors: b.errors,
      rateLimited: b.rateLimited,
      avgDurationMs: b.total > 0 ? Math.round(b.durationSum / b.total) : 0,
    }));

  const byTool: McpToolMetric[] = Array.from(toolMap.entries())
    .map(([toolName, t]) => {
      const sorted = [...t.durations].sort((a, b) => a - b);
      return {
        toolName,
        calls: t.calls,
        errors: t.errors,
        errorRate: t.calls > 0 ? Math.round((t.errors / t.calls) * 1000) / 10 : 0,
        avgDurationMs: Math.round(t.durationSum / t.calls),
        p95DurationMs: computePercentile(sorted, 0.95),
        lastCalledAt: t.lastCalledAt,
      };
    })
    .sort((a, b) => b.calls - a.calls || a.toolName.localeCompare(b.toolName));

  const byKey = Array.from(keyMap.values()).sort((a, b) => b.calls - a.calls);
  const byMethod = Array.from(methodMap.entries())
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);
  const clients = Array.from(clientMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const recentEvents: McpRecentEvent[] = filtered.slice(0, 50).map((evt) => ({
    id: evt.id,
    createdAt: evt.createdAt,
    rpcMethod: evt.rpcMethod,
    toolName: evt.toolName || null,
    clientName: evt.clientName || null,
    keyPrefix: evt.keyPrefix || null,
    keyName: evt.keyName || null,
    outcome: evt.outcome,
    statusCode: evt.statusCode,
    errorClass: evt.errorClass || null,
    errorMessage: evt.errorMessage || null,
    durationMs: evt.durationMs,
    responseBytes: evt.responseBytes,
  }));

  return {
    range,
    summary: {
      totalRequests,
      toolCalls,
      successCount,
      toolErrorCount,
      rateLimitedCount,
      clientErrorCount,
      serverErrorCount,
      errorCount,
      successRate: totalRequests > 0 ? Math.round((successCount / totalRequests) * 1000) / 10 : 100,
      avgDurationMs: totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0,
      p95DurationMs: computePercentile(durations, 0.95),
      totalResponseBytes,
      activeKeysCount: activeKeys.size,
    },
    timeline,
    byTool,
    byKey,
    byMethod,
    clients,
    recentEvents,
  };
}

export function getMcpHealthSnapshot(): McpAnalyticsHealth {
  return {
    sharedRateLimiterConfigured: Boolean(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
    ),
    rateLimitPerMinute: Number(process.env.MCP_RATE_LIMIT_PER_MINUTE || DEFAULT_RATE_LIMIT) || DEFAULT_RATE_LIMIT,
    writeEnabled: false,
  };
}

function emptySummary(): McpAnalyticsSummary {
  return {
    totalRequests: 0,
    toolCalls: 0,
    successCount: 0,
    toolErrorCount: 0,
    rateLimitedCount: 0,
    clientErrorCount: 0,
    serverErrorCount: 0,
    errorCount: 0,
    successRate: 100,
    avgDurationMs: 0,
    p95DurationMs: 0,
    totalResponseBytes: 0,
    activeKeysCount: 0,
  };
}

function isMissingAnalyticsSchemaError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "42883" || error.code === "PGRST202") return true;
  const msg = (error.message || "").toLowerCase();
  return msg.includes("get_mcp_project_analytics") || msg.includes("mcp_usage_events");
}

export async function getMcpProjectAnalytics(
  orgId: string,
  projectId: string,
  range: McpAnalyticsRange,
): Promise<McpAnalyticsResponse> {
  const health = getMcpHealthSnapshot();

  if (!isSupabaseAdminConfigured()) {
    const projectEvents = inMemoryEvents.filter(
      (evt) => evt.orgId === orgId && evt.projectId === projectId,
    );
    return {
      available: true,
      source: "memory",
      health,
      ...aggregateMcpUsageEvents(projectEvents, range),
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_mcp_project_analytics", {
    p_org_id: orgId,
    p_project_id: projectId,
    p_hours: rangeToHours(range),
  });

  if (error) {
    if (isMissingAnalyticsSchemaError(error)) {
      return {
        available: false,
        setupRequired: true,
        source: "supabase",
        range,
        summary: emptySummary(),
        timeline: [],
        byTool: [],
        byKey: [],
        byMethod: [],
        clients: [],
        recentEvents: [],
        health,
      };
    }
    throw new Error(error.message || "Could not load MCP analytics.");
  }

  const payload = (data && typeof data === "object" ? data : {}) as Record<string, any>;
  const rawSummary = (payload.summary && typeof payload.summary === "object" ? payload.summary : {}) as Record<string, any>;
  const totalRequests = Number(rawSummary.totalRequests || 0);
  const successCount = Number(rawSummary.successCount || 0);
  const errorCount = Math.max(0, totalRequests - successCount);

  const byTool: McpToolMetric[] = Array.isArray(payload.byTool)
    ? payload.byTool.map((item: any) => {
        const calls = Number(item.calls || 0);
        const errors = Number(item.errors || 0);
        return {
          toolName: String(item.toolName || ""),
          calls,
          errors,
          errorRate: calls > 0 ? Math.round((errors / calls) * 1000) / 10 : 0,
          avgDurationMs: Number(item.avgDurationMs || 0),
          p95DurationMs: Number(item.p95DurationMs || 0),
          lastCalledAt: String(item.lastCalledAt || ""),
        };
      })
    : [];

  return {
    available: true,
    source: "supabase",
    range,
    summary: {
      totalRequests,
      toolCalls: Number(rawSummary.toolCalls || 0),
      successCount,
      toolErrorCount: Number(rawSummary.toolErrorCount || 0),
      rateLimitedCount: Number(rawSummary.rateLimitedCount || 0),
      clientErrorCount: Number(rawSummary.clientErrorCount || 0),
      serverErrorCount: Number(rawSummary.serverErrorCount || 0),
      errorCount,
      successRate: totalRequests > 0 ? Math.round((successCount / totalRequests) * 1000) / 10 : 100,
      avgDurationMs: Number(rawSummary.avgDurationMs || 0),
      p95DurationMs: Number(rawSummary.p95DurationMs || 0),
      totalResponseBytes: Number(rawSummary.totalResponseBytes || 0),
      activeKeysCount: Number(rawSummary.activeKeysCount || 0),
    },
    timeline: Array.isArray(payload.timeline) ? payload.timeline : [],
    byTool,
    byKey: Array.isArray(payload.byKey) ? payload.byKey : [],
    byMethod: Array.isArray(payload.byMethod) ? payload.byMethod : [],
    clients: Array.isArray(payload.clients) ? payload.clients : [],
    recentEvents: Array.isArray(payload.recentEvents) ? payload.recentEvents : [],
    health,
  };
}

export function __resetMcpObservabilityForTests(): void {
  inMemoryEvents.length = 0;
  lastUsedTouchCache.clear();
}
