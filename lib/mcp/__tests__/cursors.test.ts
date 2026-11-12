import { describe, expect, it } from "vitest";
import { createMcpCursor, parseMcpCursor } from "../cursors";

const requestId = "req_test";

 describe("MCP cursors", () => {
  it("round-trips an opaque cursor for the same revision and scope", () => {
    const cursor = createMcpCursor({
      revision: "rev_1",
      sortKey: "color.brand.500",
      scope: "project:tokens",
    });

    expect(cursor).not.toContain("color.brand.500");
    expect(parseMcpCursor(cursor, { revision: "rev_1", scope: "project:tokens" }, requestId)).toEqual({
      version: 1,
      revision: "rev_1",
      sortKey: "color.brand.500",
      scope: "project:tokens",
    });
  });

  it("rejects a cursor from another revision or scope", () => {
    const cursor = createMcpCursor({ revision: "rev_1", sortKey: "a", scope: "project:tokens" });

    expect(() => parseMcpCursor(cursor, { revision: "rev_2", scope: "project:tokens" }, requestId)).toThrow(
      "cursor is invalid or expired",
    );
    expect(() => parseMcpCursor(cursor, { revision: "rev_1", scope: "project:themes" }, requestId)).toThrow(
      "cursor is invalid or expired",
    );
  });

  it("returns undefined when no cursor is provided", () => {
    expect(parseMcpCursor(undefined, { revision: "rev_1", scope: "project:tokens" }, requestId)).toBeUndefined();
  });
});
