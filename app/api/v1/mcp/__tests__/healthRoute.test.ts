import { describe, expect, it } from "vitest";
import { GET } from "../health/route";
import { MCP_TOOL_NAMES } from "@/lib/mcp/server";

describe("MCP health surface", () => {
  it("reports the read-only capability contract", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.transport).toBe("streamable-http");
    expect(body.capabilities.writeEnabled).toBe(false);
    expect(body.capabilities.tools).toEqual(MCP_TOOL_NAMES);
    expect(body.capabilities.resources).toEqual([]);
    expect(body.capabilities.prompts).toEqual([]);
  });
});
