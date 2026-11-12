import crypto from "crypto";
import { McpError } from "./errors";

export type McpCursorPayload = {
  version: 1;
  revision: string;
  sortKey: string;
  scope: string;
};

function encode(value: McpCursorPayload): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decode(value: string): McpCursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<McpCursorPayload>;
    if (
      parsed.version !== 1 ||
      typeof parsed.revision !== "string" ||
      typeof parsed.sortKey !== "string" ||
      typeof parsed.scope !== "string"
    ) {
      return null;
    }
    return parsed as McpCursorPayload;
  } catch {
    return null;
  }
}

export function createMcpCursor(input: Omit<McpCursorPayload, "version">): string {
  return encode({ version: 1, ...input });
}

export function parseMcpCursor(
  value: string | undefined,
  expected: { revision: string; scope: string },
  requestId: string,
): McpCursorPayload | undefined {
  if (!value) return undefined;
  const parsed = decode(value);
  if (!parsed || parsed.scope !== expected.scope || parsed.revision !== expected.revision) {
    throw new McpError("CURSOR_INVALID", "The cursor is invalid or expired.", requestId, 400);
  }
  return parsed;
}

export function createRevision(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24);
}
