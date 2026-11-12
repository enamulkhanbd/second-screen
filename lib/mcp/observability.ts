export type McpMetric = {
  requestId: string;
  status: number;
  durationMs: number;
  rateLimitConfigured?: boolean;
  errorClass?: string;
};

export function recordMcpMetric(metric: McpMetric) {
  if (process.env.MCP_OBSERVABILITY !== "true") return;
  console.info(JSON.stringify({
    event: "mcp_request",
    ...metric,
  }));
}
