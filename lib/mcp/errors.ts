import type { McpDomainError, McpDomainErrorCode } from "./types";

export class McpError extends Error {
  readonly code: McpDomainErrorCode;
  readonly status: number;
  readonly requestId: string;

  constructor(
    code: McpDomainErrorCode,
    message: string,
    requestId: string,
    status = 400,
  ) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }

  toDomainError(): McpDomainError {
    return {
      code: this.code,
      message: this.message,
      requestId: this.requestId,
    };
  }
}

export function toSafeMcpError(error: unknown, requestId: string): McpError {
  if (error instanceof McpError) return error;

  console.error("MCP request failed", { requestId });
  return new McpError(
    "UPSTREAM_UNAVAILABLE",
    "The MCP service could not complete the request.",
    requestId,
    503,
  );
}
