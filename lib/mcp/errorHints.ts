export interface McpErrorHintInput {
  rpcMethod: string;
  toolName?: string | null;
  statusCode: number;
  outcome: string;
  errorClass?: string | null;
  errorMessage?: string | null;
  responseBytes?: number;
}

export interface McpErrorDiagnosis {
  title: string;
  detail: string;
  fix: string;
  isHistoricalInferred: boolean;
}

/**
 * Produces a concise human-readable explanation and remediation hint for any
 * failed MCP usage event, preferring stored server error messages when available
 * and falling back to deterministic inference for older rows recorded prior
 * to error_message logging.
 */
export function describeMcpError(event: McpErrorHintInput): McpErrorDiagnosis {
  const storedMessage = typeof event.errorMessage === "string" ? event.errorMessage.trim() : "";
  const isHistoricalInferred = storedMessage.length === 0;
  const code = (event.errorClass || "").toUpperCase();
  const status = event.statusCode;

  const withMessage = (title: string, inferredDetail: string, fix: string): McpErrorDiagnosis => ({
    title,
    detail: storedMessage || inferredDetail,
    fix,
    isHistoricalInferred,
  });

  if (code === "INVALID_JSON") {
    return withMessage(
      "Invalid JSON request body",
      "The POST body could not be parsed as JSON (empty body or syntax error).",
      "Send a valid UTF-8 JSON-RPC 2.0 object. On Windows PowerShell, quote/escape JSON carefully or use Invoke-RestMethod.",
    );
  }

  if (code === "BATCH_NOT_SUPPORTED") {
    return withMessage(
      "JSON-RPC batch array rejected",
      "Top-level JSON arrays are disabled on this stateless MCP endpoint.",
      "Send one JSON-RPC object {...} per HTTP POST request instead of an array [...].",
    );
  }

  if (code === "NOT_ACCEPTABLE" || status === 406) {
    return withMessage(
      "Missing Accept header (406 Not Acceptable)",
      "The Streamable HTTP transport requires clients to advertise support for both application/json and text/event-stream.",
      "Include header Accept: application/json, text/event-stream alongside Content-Type: application/json.",
    );
  }

  if (code === "UNSUPPORTED_MEDIA_TYPE" || status === 415) {
    return withMessage(
      "Unsupported Content-Type (415)",
      "POST requests to /api/v1/mcp must declare Content-Type: application/json.",
      "Set header Content-Type: application/json.",
    );
  }

  if (
    code === "UNSUPPORTED_PROTOCOL_VERSION" ||
    (status === 400 && code === "CLIENT_ERROR" && event.responseBytes === 198)
  ) {
    const inferredProbeNote =
      event.rpcMethod === "server/discover"
        ? "Client sent an unnegotiated pre-handshake server/discover probe with an unsupported MCP-Protocol-Version header (supported: 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05, 2024-10-07). If an initialize 200 OK followed right after, your client connected normally."
        : "Client sent an unsupported MCP-Protocol-Version header (supported: 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05, 2024-10-07).";
    return withMessage(
      "Unsupported MCP-Protocol-Version header",
      inferredProbeNote,
      "Use protocolVersion '2025-03-26' or '2025-11-25' in initialize, or omit MCP-Protocol-Version on unnegotiated probes.",
    );
  }

  if (code === "INVALID_JSONRPC" || code === "JSONRPC_-32700") {
    return withMessage(
      "Invalid JSON-RPC 2.0 message",
      "Payload was valid JSON but did not match the JSON-RPC 2.0 request or notification schema.",
      'Include {"jsonrpc":"2.0","id":1,"method":"..."} for requests (or omit "id" only for notifications).',
    );
  }

  if (code === "METHOD_NOT_FOUND" || code === "JSONRPC_-32601") {
    return withMessage(
      "Unknown JSON-RPC method",
      `Method '${event.rpcMethod}' is not registered on this MCP server.`,
      "Call standard MCP lifecycle methods (initialize, tools/list, tools/call) with tools listed by tools/list.",
    );
  }

  if (code === "INVALID_PARAMS" || code === "JSONRPC_-32602") {
    return withMessage(
      "Invalid JSON-RPC parameters",
      "Arguments failed JSON-RPC parameter validation.",
      "Check the tool inputSchema returned by tools/list and verify required parameter names and types.",
    );
  }

  if (code === "PAYLOAD_TOO_LARGE" || code === "RESPONSE_TOO_LARGE" || status === 413) {
    return withMessage(
      code === "RESPONSE_TOO_LARGE" ? "Response exceeded 512 KB cap" : "Request body exceeded 128 KB cap",
      "The MCP endpoint enforces a 128 KB request limit and a 512 KB response payload cap.",
      "Narrow searches or exports using query, set, type, limit/offset pagination, or compact: true.",
    );
  }

  if (code === "RATE_LIMITED" || status === 429) {
    return withMessage(
      "Rate limit exceeded (429)",
      "This project MCP token exceeded its per-minute request allowance.",
      "Wait for the Retry-After window (up to 60s) or batch/cache reads on the client.",
    );
  }

  if (code === "INVALID_ORIGIN" || code === "INVALID_HOST") {
    return withMessage(
      "Origin or Host blocked by security check",
      "Streamable HTTP DNS rebinding protection rejected an untrusted Origin or Host header.",
      "Send requests to the app's canonical URL without mismatched browser Origin headers.",
    );
  }

  if (code === "UNAUTHORIZED" || status === 401) {
    return withMessage(
      "Unauthorized MCP token (401)",
      "The Bearer token was missing, invalid, expired, or revoked.",
      "Create a fresh Project MCP Token in Setup & Keys and update your client config.",
    );
  }

  if (code === "FORBIDDEN" || status === 403) {
    return withMessage(
      event.outcome === "tool_error" ? "Permission denied by role guard" : "Forbidden credential or role (403)",
      "This action requires a project-bound MCP credential and sufficient workspace role permissions (owner/admin/editor for writes).",
      "Ensure the token is a project-bound mcp_project credential and verify your workspace role in Workspace Settings.",
    );
  }

  if (event.outcome === "tool_error") {
    if (code === "NOT_FOUND") {
      return withMessage(
        "Requested token, branch, or asset not found",
        "The MCP tool could not find the requested resource in this project.",
        "Verify branch names via list_branches or token paths via search_tokens.",
      );
    }
    if (code === "INVALID_ARGUMENT") {
      return withMessage(
        "Invalid MCP tool argument",
        "Tool input failed argument validation or safety rules (such as writing to a protected default branch).",
        "Review tool parameters via tools/list and verify non-default branch targets for write calls.",
      );
    }
    if (code === "LIMIT_EXCEEDED") {
      return withMessage(
        "Tool response size or count limit exceeded",
        "The tool output exceeded the maximum allowed items or response byte budget.",
        "Pass smaller limit/offset values, filter by set or query, or set compact: true.",
      );
    }
    if (code === "UPSTREAM_UNAVAILABLE") {
      return withMessage(
        "Upstream backend unavailable",
        "The tool could not reach a backend store (Supabase or R2) within the timeout budget.",
        "Retry shortly and use the Request ID below to inspect deployment logs if it persists.",
      );
    }
    return withMessage(
      "MCP tool returned an error",
      "Tool execution failed cleanly and returned an error result to the AI client.",
      "Check the error detail and re-run with corrected arguments.",
    );
  }

  if (code === "RATE_LIMIT_UNAVAILABLE" || event.outcome === "server_error" || status >= 500) {
    return withMessage(
      "Server or dependency failure",
      "The MCP endpoint timed out (15s limit) or encountered an upstream backend failure.",
      "Retry with narrower arguments and check deployment logs using the Request ID below.",
    );
  }

  return withMessage(
    `HTTP ${status} (${code || event.outcome})`,
    "The request was rejected by the MCP HTTP endpoint.",
    "Check Bearer authorization, headers (Content-Type & Accept), and inspect the raw response with curl -i.",
  );
}
