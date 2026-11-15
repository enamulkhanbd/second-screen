import { afterEach, describe, expect, it } from "vitest";
import {
  __resetMcpObservabilityForTests,
  aggregateMcpUsageEvents,
  classifyMcpOutcome,
  extractMcpRequestInfo,
  getMcpProjectAnalytics,
  recordMcpUsageEvent,
  type McpUsageEventRecord,
} from "../observability";

afterEach(() => {
  __resetMcpObservabilityForTests();
});

describe("MCP observability", () => {
  it("extracts safe RPC method, tool name, and client name without capturing arguments", () => {
    expect(
      extractMcpRequestInfo({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "search_tokens", arguments: { query: "secret-query" } },
      }),
    ).toEqual({
      rpcMethod: "tools/call",
      toolName: "search_tokens",
      clientName: undefined,
    });

    expect(
      extractMcpRequestInfo({
        jsonrpc: "2.0",
        id: 2,
        method: "initialize",
        params: { clientInfo: { name: "antigravity", version: "2.0" } },
      }),
    ).toEqual({
      rpcMethod: "initialize",
      toolName: undefined,
      clientName: "antigravity",
    });

    expect(extractMcpRequestInfo(null)).toEqual({ rpcMethod: "invalid_request" });
  });

  it("classifies HTTP errors, JSON-RPC errors, and SDK tool errors accurately", () => {
    const encoder = new TextEncoder();

    expect(classifyMcpOutcome(429, "application/json", null)).toEqual({
      outcome: "rate_limited",
      errorClass: "RATE_LIMITED",
    });

    expect(classifyMcpOutcome(413, "application/json", null)).toEqual({
      outcome: "client_error",
      errorClass: "PAYLOAD_TOO_LARGE",
    });

    const toolErrBuf = encoder.encode(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: {
        isError: true,
        content: [{ type: "text", text: "MCP error -32603: Token not found for path 'missing'" }],
      },
    })).buffer;
    expect(classifyMcpOutcome(200, "application/json", toolErrBuf)).toEqual({
      outcome: "tool_error",
      errorClass: "NOT_FOUND",
    });

    const rpcErrBuf = encoder.encode(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32602, message: "Invalid params" },
    })).buffer;
    expect(classifyMcpOutcome(200, "application/json", rpcErrBuf)).toEqual({
      outcome: "client_error",
      errorClass: "JSONRPC_-32602",
    });

    const okBuf = encoder.encode(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { isError: false, content: [{ type: "text", text: "{}" }] },
    })).buffer;
    expect(classifyMcpOutcome(200, "application/json", okBuf)).toEqual({
      outcome: "success",
    });
  });

  it("aggregates summary KPIs, P95 latency, timeline buckets, and per-tool/key metrics", () => {
    const now = Date.parse("2026-11-15T12:00:00.000Z");
    const events: McpUsageEventRecord[] = [
      {
        id: "e1",
        orgId: "org-1",
        projectId: "proj-1",
        credentialId: "key-1",
        keyPrefix: "sec_pat_1",
        keyName: "Cursor Key",
        rpcMethod: "initialize",
        clientName: "cursor",
        statusCode: 200,
        outcome: "success",
        durationMs: 10,
        responseBytes: 300,
        createdAt: "2026-11-15T10:15:00.000Z",
      },
      {
        id: "e2",
        orgId: "org-1",
        projectId: "proj-1",
        credentialId: "key-1",
        keyPrefix: "sec_pat_1",
        keyName: "Cursor Key",
        rpcMethod: "tools/call",
        toolName: "search_tokens",
        statusCode: 200,
        outcome: "success",
        durationMs: 50,
        responseBytes: 1200,
        createdAt: "2026-11-15T11:10:00.000Z",
      },
      {
        id: "e3",
        orgId: "org-1",
        projectId: "proj-1",
        credentialId: "key-1",
        keyPrefix: "sec_pat_1",
        keyName: "Cursor Key",
        rpcMethod: "tools/call",
        toolName: "search_tokens",
        statusCode: 200,
        outcome: "tool_error",
        errorClass: "INVALID_ARGUMENT",
        durationMs: 200,
        responseBytes: 250,
        createdAt: "2026-11-15T11:20:00.000Z",
      },
      {
        id: "e4",
        orgId: "org-1",
        projectId: "proj-1",
        credentialId: "key-2",
        keyPrefix: "sec_pat_2",
        keyName: "CI Check",
        rpcMethod: "rate_limited",
        statusCode: 429,
        outcome: "rate_limited",
        errorClass: "RATE_LIMITED",
        durationMs: 4,
        responseBytes: 90,
        createdAt: "2026-11-15T11:30:00.000Z",
      },
    ];

    const result = aggregateMcpUsageEvents(events, "24h", now);
    expect(result.summary.totalRequests).toBe(4);
    expect(result.summary.toolCalls).toBe(2);
    expect(result.summary.successCount).toBe(2);
    expect(result.summary.toolErrorCount).toBe(1);
    expect(result.summary.rateLimitedCount).toBe(1);
    expect(result.summary.errorCount).toBe(2);
    expect(result.summary.successRate).toBe(50);
    expect(result.summary.avgDurationMs).toBe(66);
    expect(result.summary.p95DurationMs).toBe(200);
    expect(result.summary.activeKeysCount).toBe(2);
    expect(result.summary.totalResponseBytes).toBe(1840);

    expect(result.timeline.length).toBeGreaterThanOrEqual(24);
    expect(result.byTool).toHaveLength(1);
    expect(result.byTool[0]).toMatchObject({
      toolName: "search_tokens",
      calls: 2,
      errors: 1,
      errorRate: 50,
      avgDurationMs: 125,
      p95DurationMs: 200,
    });
    expect(result.byKey).toHaveLength(2);
    expect(result.clients).toEqual([{ name: "cursor", count: 1 }]);
    expect(result.recentEvents[0].id).toBe("e4");
  });

  it("isolates recorded events per organization and project in memory fallback mode", async () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      await recordMcpUsageEvent({
        orgId: "org-a",
        projectId: "proj-a",
        credentialId: "key-a",
        keyPrefix: "sec_pat_a",
        keyName: "A",
        rpcMethod: "tools/call",
        toolName: "get_project_overview",
        statusCode: 200,
        outcome: "success",
        durationMs: 32,
        responseBytes: 512,
      });

      await recordMcpUsageEvent({
        orgId: "org-b",
        projectId: "proj-b",
        credentialId: "key-b",
        keyPrefix: "sec_pat_b",
        keyName: "B",
        rpcMethod: "tools/call",
        toolName: "validate_tokens",
        statusCode: 200,
        outcome: "success",
        durationMs: 45,
        responseBytes: 640,
      });

      const analyticsA = await getMcpProjectAnalytics("org-a", "proj-a", "7d");
      expect(analyticsA.source).toBe("memory");
      expect(analyticsA.summary.totalRequests).toBe(1);
      expect(analyticsA.byTool.map((t) => t.toolName)).toEqual(["get_project_overview"]);
    } finally {
      if (prevUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      if (prevRole !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevRole;
    }
  });
});
