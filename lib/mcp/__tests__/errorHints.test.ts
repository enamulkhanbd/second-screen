import { describe, expect, it } from "vitest";
import { describeMcpError } from "../errorHints";

describe("MCP analytics error hints", () => {
  it("uses stored error messages verbatim when available", () => {
    const diagnosis = describeMcpError({
      rpcMethod: "initialize",
      statusCode: 406,
      outcome: "client_error",
      errorClass: "NOT_ACCEPTABLE",
      errorMessage: "Not Acceptable: Client must accept both application/json and text/event-stream",
      responseBytes: 142,
    });

    expect(diagnosis.isHistoricalInferred).toBe(false);
    expect(diagnosis.detail).toBe(
      "Not Acceptable: Client must accept both application/json and text/event-stream",
    );
    expect(diagnosis.fix).toContain("Accept: application/json, text/event-stream");
  });

  it("infers clear diagnoses for historical events logged before error_message existed", () => {
    const discoverDiagnosis = describeMcpError({
      rpcMethod: "server/discover",
      statusCode: 400,
      outcome: "client_error",
      errorClass: "CLIENT_ERROR",
      errorMessage: null,
      responseBytes: 198,
    });
    expect(discoverDiagnosis.isHistoricalInferred).toBe(true);
    expect(discoverDiagnosis.title).toContain("MCP-Protocol-Version");
    expect(discoverDiagnosis.detail).toContain("server/discover");

    const invalidJsonDiagnosis = describeMcpError({
      rpcMethod: "invalid_json",
      statusCode: 400,
      outcome: "client_error",
      errorClass: "INVALID_JSON",
      errorMessage: null,
      responseBytes: 0,
    });
    expect(invalidJsonDiagnosis.isHistoricalInferred).toBe(true);
    expect(invalidJsonDiagnosis.title).toContain("Invalid JSON");
  });

  it("provides targeted hints for tool errors", () => {
    const toolDiagnosis = describeMcpError({
      rpcMethod: "tools/call",
      toolName: "preview_token_write",
      statusCode: 200,
      outcome: "tool_error",
      errorClass: "FORBIDDEN",
      errorMessage: "Writes are forbidden for role 'viewer'.",
      responseBytes: 120,
    });

    expect(toolDiagnosis.isHistoricalInferred).toBe(false);
    expect(toolDiagnosis.detail).toBe("Writes are forbidden for role 'viewer'.");
    expect(toolDiagnosis.title).toContain("Permission denied");
  });
});
