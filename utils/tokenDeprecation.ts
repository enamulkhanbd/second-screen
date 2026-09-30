export type DeprecationSeverity = "warning" | "error";

export interface TokenDeprecation {
  severity: DeprecationSeverity;
  message?: string;
  replacementToken?: string;
  /** ISO date (YYYY-MM-DD) or release version (e.g. "v2.0.11"). */
  removeAfter?: string;
}

const asText = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

const asSeverity = (v: unknown): DeprecationSeverity =>
  typeof v === "string" && v.trim().toLowerCase() === "error" ? "error" : "warning";

/**
 * Reads deprecation from a raw token node. Supports the DTCG object form
 * (`$deprecated: { severity, message, replacementToken, removeAfter }`), the
 * boolean/string form, and the legacy flat `$deprecatedMessage` style fields.
 */
export function readDeprecation(node: any, studioExt: any = {}): TokenDeprecation | undefined {
  const raw = node?.$deprecated ?? node?.deprecated ?? studioExt?.deprecated;
  if (!raw) return undefined;

  const obj = typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  return {
    severity: asSeverity(obj.severity ?? node?.$deprecatedSeverity ?? studioExt?.deprecatedSeverity),
    message:
      asText(obj.message) ??
      asText(typeof raw === "string" ? raw : undefined) ??
      asText(node?.$deprecatedMessage ?? studioExt?.deprecatedMessage),
    replacementToken: asText(
      obj.replacementToken ?? node?.$replacementToken ?? studioExt?.replacementToken
    ),
    removeAfter: asText(
      obj.removeAfter ?? node?.$deprecatedRemoveAfter ?? studioExt?.deprecatedRemoveAfter
    ),
  };
}

/** Builds the DTCG `$deprecated` object to store on a token. */
export function buildDeprecationNode(input: {
  severity?: string;
  message?: string;
  replacementToken?: string;
  removeAfter?: string;
}): Record<string, string> {
  const node: Record<string, string> = { severity: asSeverity(input.severity) };
  const message = asText(input.message);
  const replacementToken = asText(input.replacementToken);
  const removeAfter = asText(input.removeAfter);
  if (message) node.message = message;
  if (replacementToken) node.replacementToken = replacementToken;
  if (removeAfter) node.removeAfter = removeAfter;
  return node;
}

const parseVersion = (v: string): number[] | null => {
  const m = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : null;
};

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * True once the removal deadline has passed: a date is overdue after that day,
 * a version is overdue once `currentVersion` is newer than it.
 */
export function isDeprecationOverdue(
  removeAfter: string | undefined,
  opts: { today?: Date; currentVersion?: string } = {}
): boolean {
  const target = asText(removeAfter);
  if (!target) return false;

  if (/^\d{4}-\d{2}-\d{2}/.test(target)) {
    return isoDay(opts.today ?? new Date()) > target.slice(0, 10);
  }

  const targetVer = parseVersion(target);
  const currentVer = opts.currentVersion ? parseVersion(opts.currentVersion) : null;
  if (!targetVer || !currentVer) return false;

  for (let i = 0; i < 3; i++) {
    if (currentVer[i] !== targetVer[i]) return currentVer[i] > targetVer[i];
  }
  return false;
}
