import {
  RawTokensDocument,
  RawTokenLeaf,
  FlattenedToken,
  TokenType,
  ThemeResolutionConfig,
} from "@/types/tokens";
import { extractColorModifier, applyColorModifier, ColorModifier } from "./colorModifier";
import Color from "colorjs.io";

// Check if a leaf is a token node (has 'value' or '$value')
export function isTokenLeaf(node: any): node is RawTokenLeaf {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;
  return "value" in node || "$value" in node;
}

/**
 * Recursively counts the total number of design token leaves in a RawTokensDocument.
 */
export function countTokensInDocument(rawDoc?: RawTokensDocument | null): number {
  if (!rawDoc || typeof rawDoc !== "object") return 0;
  let count = 0;
  const sets = Object.keys(rawDoc).filter((k) => !k.startsWith("$"));
  for (const setName of sets) {
    const setTree = rawDoc[setName];
    if (!setTree || typeof setTree !== "object") continue;
    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (isTokenLeaf(node)) {
        count++;
        return;
      }
      for (const key of Object.keys(node)) {
        if (!key.startsWith("$")) {
          walk(node[key]);
        }
      }
    };
    walk(setTree);
  }
  return count;
}

// Extract the raw value string or object from a token leaf
export function getLeafValue(leaf: RawTokenLeaf): string {
  let val = leaf.value !== undefined ? leaf.value : leaf.$value;
  while (typeof val === "object" && val !== null && ("value" in val || "$value" in val)) {
    val = (val as any).value !== undefined ? (val as any).value : (val as any).$value;
  }
  if (typeof val === "object" && val !== null) {
    return JSON.stringify(val);
  }
  return String(val ?? "");
}

// Extract the token type from a token leaf
export function getLeafType(leaf: RawTokenLeaf, parentGroupOrPath?: string | string[]): TokenType {
  const rawType = leaf.type !== undefined ? leaf.type : leaf.$type;
  const type = typeof rawType === "string" ? rawType.trim() : (rawType ? String(rawType).trim() : "");
  if (type) {
    const t = type.toLowerCase();
    if (t === "color" || t === "colors") return "color";
    if (t === "spacing" || t === "space") return "spacing";
    if (t === "sizing" || t === "size" || t === "dimension" || t === "dimensions") return "sizing";
    if (t === "borderradius" || t === "radius" || t === "radii") return "borderRadius";
    if (t === "borderwidth" || t === "border") return "borderWidth";
    if (t === "opacity") return "opacity";
    if (t === "boxshadow" || t === "shadow") return "boxShadow";
    if (t === "typography") return "typography";
    if (t === "fontfamilies" || t === "fontweights" || t === "fontsizes" || t === "lineheights" || t === "letterspacing") return "typography";
    return t as TokenType;
  }

  // Check if value is a composite typography object
  const val = leaf.value !== undefined ? leaf.value : leaf.$value;
  if (typeof val === "object" && val !== null) {
    if ("fontFamily" in val || "fontSize" in val || "fontWeight" in val || "lineHeight" in val) {
      return "typography";
    }
    if ("blur" in val || "spread" in val) {
      return "boxShadow";
    }
  }

  // Infer type from group / path naming heuristics
  const fullPathStr = Array.isArray(parentGroupOrPath)
    ? parentGroupOrPath.map((p) => String(p || "")).join(".").toLowerCase()
    : String(parentGroupOrPath || "").toLowerCase();

  if (fullPathStr) {
    if (fullPathStr.includes("color") || fullPathStr.includes("bg") || fullPathStr.includes("text") || fullPathStr.includes("border") || fullPathStr.includes("icon") || fullPathStr.includes("palette") || fullPathStr.includes("fill") || fullPathStr.includes("stroke") || fullPathStr.includes("brand")) return "color";
    if (fullPathStr.includes("spacing") || fullPathStr.includes("gap") || fullPathStr.includes("padding") || fullPathStr.includes("margin") || fullPathStr.includes("space")) return "spacing";
    if (fullPathStr.includes("radius") || fullPathStr.includes("round") || fullPathStr.includes("radii")) return "borderRadius";
    if (fullPathStr.includes("font") || fullPathStr.includes("typography") || fullPathStr.includes("body") || fullPathStr.includes("heading") || fullPathStr.includes("title") || fullPathStr.includes("lineheight") || fullPathStr.includes("letterspacing") || fullPathStr.includes("caption")) return "typography";
    if (fullPathStr.includes("size") || fullPathStr.includes("dimension") || fullPathStr.includes("width") || fullPathStr.includes("height") || fullPathStr.includes("sizing")) return "sizing";
    if (fullPathStr.includes("opacity")) return "opacity";
    if (fullPathStr.includes("shadow") || fullPathStr.includes("elevation")) return "boxShadow";
  }

  return "other";
}

/**
 * Helper to compare path segments prioritizing alphabetical letters (A-Z) before digits (0-9).
 * Within the same character class, applies natural numeric collation.
 */
function compareSegmentAZ09(aSeg: string, bSeg: string): number {
  if (aSeg === bSeg) return 0;
  const matchA = aSeg.match(/[a-zA-Z0-9]/);
  const matchB = bSeg.match(/[a-zA-Z0-9]/);

  if (matchA && matchB) {
    const isLetterA = /[a-zA-Z]/.test(matchA[0]);
    const isDigitA = /[0-9]/.test(matchA[0]);
    const isLetterB = /[a-zA-Z]/.test(matchB[0]);
    const isDigitB = /[0-9]/.test(matchB[0]);

    if (isLetterA && isDigitB) return -1;
    if (isDigitA && isLetterB) return 1;
  }

  return aSeg.localeCompare(bSeg, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Natural comparator for dot-separated token keys and paths adhering to A-Z, 0-9 collation.
 * Letters (A-Z) appear before digits (0-9) per segment, while numeric tokens (e.g. 50 vs 100) sort naturally.
 */
export function compareTokenNames(a: string, b: string, dir: "asc" | "desc" = "asc"): number {
  if (a === b) return 0;
  if (!a) return dir === "asc" ? -1 : 1;
  if (!b) return dir === "asc" ? 1 : -1;

  const aParts = String(a).split(/[./\\]/);
  const bParts = String(b).split(/[./\\]/);
  const minLen = Math.min(aParts.length, bParts.length);

  for (let i = 0; i < minLen; i++) {
    const aSeg = aParts[i];
    const bSeg = bParts[i];
    if (aSeg !== bSeg) {
      const cmp = compareSegmentAZ09(aSeg, bSeg);
      if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
    }
  }

  const lenDiff = aParts.length - bParts.length;
  return dir === "asc" ? lenDiff : -lenDiff;
}

/**
 * Legacy wrapper maintaining backward compatibility.
 */
export function naturalCompareTokenKeys(a: string, b: string): number {
  return compareTokenNames(a, b, "asc");
}

export interface ParsedSortableValue {
  isNumeric: boolean;
  num: number;
  unit: string;
  text: string;
}

/**
 * Parses any resolved/raw token value into a sortable structure.
 * Correctly extracts dimension values (e.g. 4px, 1.5rem, 50%) to allow numerical magnitude sorting.
 */
export interface ParsedSortableValue {
  isNumeric: boolean;
  num: number;
  unit: string;
  text: string;
  isColor: boolean;
}

function isColorString(val: string): boolean {
  if (!val || typeof val !== "string") return false;
  const s = val.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) || /^(rgba?|hsla?|oklch|lch|color)\(/i.test(s);
}

function getColorLuminance(val: string): number | null {
  try {
    const c = new Color(val.trim());
    return c.to("oklch").l;
  } catch {
    return null;
  }
}

/**
 * Parses any resolved/raw token value into a sortable structure.
 * Correctly extracts dimension values (e.g. 4px, 1.5rem, 50%) to allow numerical magnitude sorting,
 * and detects color values for perceptual lightness comparison.
 */
export function parseSortableValue(val: any): ParsedSortableValue {
  if (val === null || val === undefined) {
    return { isNumeric: false, num: 0, unit: "", text: "", isColor: false };
  }
  if (typeof val === "number") {
    return { isNumeric: true, num: val, unit: "", text: String(val), isColor: false };
  }
  const str = String(typeof val === "object" ? JSON.stringify(val) : val).trim();
  const match = str.match(/^([+-]?(?:\d*\.)?\d+)([a-zA-Z%]*)$/);
  if (match) {
    return { isNumeric: true, num: parseFloat(match[1]), unit: match[2] || "", text: str, isColor: false };
  }
  const isCol = isColorString(str);
  return { isNumeric: false, num: 0, unit: "", text: str, isColor: isCol };
}

/**
 * Compares two resolved token values.
 * - Dimension/numeric values (0px, 1px, 2px, 4px, 16px, 999px) sort by their numeric magnitude.
 * - Text/color values sort with alphabetical A-Z, 0-9 collation.
 */
export function compareResolvedValues(valA: any, valB: any, dir: "asc" | "desc" = "asc"): number {
  const pA = parseSortableValue(valA);
  const pB = parseSortableValue(valB);

  if (pA.isNumeric && pB.isNumeric) {
    if (pA.num !== pB.num) {
      return dir === "desc" ? pB.num - pA.num : pA.num - pB.num;
    }
    const unitCmp = (pA.unit || "").localeCompare(pB.unit || "");
    if (unitCmp !== 0) return dir === "desc" ? -unitCmp : unitCmp;
  } else if (pA.isNumeric && !pB.isNumeric) {
    // Numbers sort after textual/color values in A-Z, 0-9 collation
    return dir === "desc" ? -1 : 1;
  } else if (!pA.isNumeric && pB.isNumeric) {
    return dir === "desc" ? 1 : -1;
  } else if (pA.isColor && pB.isColor) {
    // Compare colors by perceptual lightness (lightest to darkest in asc)
    const lumA = getColorLuminance(pA.text);
    const lumB = getColorLuminance(pB.text);
    if (lumA !== null && lumB !== null && Math.abs(lumA - lumB) > 0.001) {
      return dir === "asc" ? lumB - lumA : lumA - lumB;
    }
    const cmp = compareSegmentAZ09(pA.text, pB.text);
    if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
  } else {
    // Both non-numeric
    const cmp = compareSegmentAZ09(pA.text, pB.text);
    if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
  }

  return 0;
}

/**
 * Universal token comparator supporting 'name' and 'resolved' fields with direction.
 */
export function compareTokens<T extends { name: string; resolvedValue?: any; rawValue?: any }>(
  a: T,
  b: T,
  field: "name" | "resolved" = "resolved",
  dir: "asc" | "desc" = "asc"
): number {
  if (field === "resolved") {
    // Check if both tokens belong to the same parent family and end with numeric scale/shade (e.g. primary.50 vs primary.500)
    const matchA = a.name.match(/^(.*)\.(\d+)$/);
    const matchB = b.name.match(/^(.*)\.(\d+)$/);
    if (matchA && matchB && matchA[1] === matchB[1]) {
      const numA = parseInt(matchA[2], 10);
      const numB = parseInt(matchB[2], 10);
      return dir === "asc" ? numA - numB : numB - numA;
    }

    const valA = a.resolvedValue !== undefined && a.resolvedValue !== null ? a.resolvedValue : a.rawValue;
    const valB = b.resolvedValue !== undefined && b.resolvedValue !== null ? b.resolvedValue : b.rawValue;
    const cmp = compareResolvedValues(valA, valB, dir);
    if (cmp !== 0) return cmp;
    // Secondary deterministic sort by name
    return compareTokenNames(a.name, b.name, dir);
  }

  return compareTokenNames(a.name, b.name, dir);
}

// Helper to look up a path in a nested object
function getNestedValue(obj: any, path: string[]): any {
  let current = obj;
  for (const segment of path) {
    if (current === undefined || current === null || typeof current !== "object") {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

export type TokenLookupIndex = Map<string, { leaf: RawTokenLeaf; setName: string }>;

/**
 * Builds a fast flat index of all tokens across all sets for O(1) alias resolution.
 */
export function buildTokenLookupIndex(
  allTokens: RawTokensDocument,
  themeConfig?: ThemeResolutionConfig
): TokenLookupIndex {
  const index: TokenLookupIndex = new Map();
  if (!allTokens || typeof allTokens !== "object") return index;

  const allSetNames = Object.keys(allTokens).filter(
    (k) => !k.startsWith("$") && allTokens[k] && typeof allTokens[k] === "object"
  );

  let orderedSetNames: string[] = allSetNames;

  if (themeConfig?.activeSetsOrder && themeConfig.activeSetsOrder.length > 0) {
    const activeOrder = themeConfig.activeSetsOrder;
    const activeSetLookup = new Set(activeOrder);
    const inactiveSetLookup = themeConfig.inactiveSets || new Set<string>();

    // 1. Inactive sets first (lowest priority fallback)
    const inactiveList = allSetNames.filter(
      (s) => inactiveSetLookup.has(s) && !activeSetLookup.has(s)
    );
    // 2. Unspecified sets (neither active nor inactive)
    const unspecifiedList = allSetNames.filter(
      (s) => !activeSetLookup.has(s) && !inactiveSetLookup.has(s)
    );
    // 3. Active sets in order (from lowest tier to highest tier override)
    const activeList = activeOrder.filter(
      (s) => allTokens[s] && typeof allTokens[s] === "object"
    );

    orderedSetNames = [...inactiveList, ...unspecifiedList, ...activeList];
  }

  for (const setName of orderedSetNames) {
    const setTree = allTokens[setName];
    if (!setTree || typeof setTree !== "object") continue;

    const normSet = setName.replace(/[/\\]/g, ".");
    const walk = (node: any, currentPath: string[]) => {
      if (!node || typeof node !== "object") return;
      if (isTokenLeaf(node)) {
        const dotPath = currentPath.join(".");
        const entry = { leaf: node, setName };

        // 1. Direct path within set: e.g. "color.blue.500"
        index.set(dotPath, entry);
        index.set(dotPath.toLowerCase(), entry);

        // 2. Qualified with set name: e.g. "core.color.blue.500"
        index.set(`${setName}.${dotPath}`, entry);
        index.set(`${setName}.${dotPath}`.toLowerCase(), entry);
        if (normSet !== setName) {
          index.set(`${normSet}.${dotPath}`, entry);
          index.set(`${normSet}.${dotPath}`.toLowerCase(), entry);
        }

        // 3. Category omitted: e.g. if dotPath is "color.blue.500", also index "blue.500"
        if (currentPath.length > 1) {
          const stripped = currentPath.slice(1).join(".");
          index.set(stripped, entry);
          index.set(stripped.toLowerCase(), entry);
        }
        return;
      }

      for (const [key, child] of Object.entries(node)) {
        if (!key.startsWith("$")) {
          walk(child, [...currentPath, key]);
        }
      }
    };

    walk(setTree, []);
  }

  return index;
}

const hexColorCache = new Map<string, string>();

/**
 * Fast cached color converter to prevent redundant colorjs.io instantiations
 */
export function toHexFast(colorStr: string): string | undefined {
  if (!colorStr || typeof colorStr !== "string") return undefined;
  const s = colorStr.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) {
    return s;
  }
  const cached = hexColorCache.get(s);
  if (cached !== undefined) return cached || undefined;

  try {
    const col = new Color(s);
    const hex = col.to("srgb").toString({ format: "hex" });
    if (hexColorCache.size < 5000) {
      hexColorCache.set(s, hex);
    }
    return hex;
  } catch {
    if (hexColorCache.size < 5000) {
      hexColorCache.set(s, "");
    }
    return undefined;
  }
}

/**
 * Resolves a token alias string like "{colors.blue.500}", "{foundation.color.blue.100}", or composite objects
 */
export function resolveTokenAlias(
  aliasValue: any,
  allTokens: RawTokensDocument,
  currentSet?: string,
  visited: Set<string> = new Set(),
  lookupIndex?: TokenLookupIndex,
  depth: number = 0
): string {
  if (aliasValue === null || aliasValue === undefined) return "";
  if (depth > 30) return String(aliasValue);

  // Handle composite object values (e.g. typography) or leaf objects
  if (typeof aliasValue === "object" && aliasValue !== null) {
    if ("value" in aliasValue || "$value" in aliasValue) {
      const inner = aliasValue.value !== undefined ? aliasValue.value : aliasValue.$value;
      return resolveTokenAlias(inner, allTokens, currentSet, visited, lookupIndex, depth + 1);
    }
    const resolvedObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(aliasValue)) {
      resolvedObj[k] = resolveTokenAlias(v, allTokens, currentSet, visited, lookupIndex, depth + 1);
    }
    return JSON.stringify(resolvedObj);
  }

  // If it's a JSON stringified composite object
  if (typeof aliasValue === "string" && aliasValue.trim().startsWith("{") && aliasValue.trim().endsWith("}") && aliasValue.includes(":")) {
    try {
      const parsed = JSON.parse(aliasValue);
      if (typeof parsed === "object" && parsed !== null) {
        if ("value" in parsed || "$value" in parsed) {
          const inner = parsed.value !== undefined ? parsed.value : parsed.$value;
          return resolveTokenAlias(inner, allTokens, currentSet, visited, lookupIndex, depth + 1);
        }
        const resolvedObj: Record<string, any> = {};
        for (const [k, v] of Object.entries(parsed)) {
          resolvedObj[k] = resolveTokenAlias(v, allTokens, currentSet, visited, lookupIndex, depth + 1);
        }
        return JSON.stringify(resolvedObj);
      }
    } catch {
      // Not JSON, continue regular alias resolution
    }
  }

  const aliasString = String(aliasValue);

  // Match {path.to.token}
  const aliasRegex = /\{([^}]+)\}/g;

  let hasAliases = false;
  const replaced = aliasString.replace(aliasRegex, (match, pathString) => {
    hasAliases = true;
    const cleanPath = pathString.trim().replace(/^[./\s]+|[./\s]+$/g, "");

    if (visited.has(cleanPath)) {
      return match; // Circular reference guard
    }
    const newVisited = new Set(visited);
    newVisited.add(cleanPath);

    // 0. Instant O(1) index lookup if index provided
    if (lookupIndex) {
      const direct = lookupIndex.get(cleanPath) || lookupIndex.get(cleanPath.toLowerCase());
      if (direct?.leaf && isTokenLeaf(direct.leaf)) {
        const rawVal = getLeafValue(direct.leaf);
        return resolveTokenAlias(rawVal, allTokens, direct.setName || currentSet, newVisited, lookupIndex, depth + 1);
      }
      if (currentSet) {
        const withSet = lookupIndex.get(`${currentSet}.${cleanPath}`) || lookupIndex.get(`${currentSet}.${cleanPath}`.toLowerCase());
        if (withSet?.leaf && isTokenLeaf(withSet.leaf)) {
          const rawVal = getLeafValue(withSet.leaf);
          return resolveTokenAlias(rawVal, allTokens, withSet.setName || currentSet, newVisited, lookupIndex, depth + 1);
        }
      }
    }

    const pathSegments = cleanPath.split(/[./\\]/).filter(Boolean);
    if (pathSegments.length === 0) return match;

    // 1. Try finding within current set first
    let foundLeaf: any = undefined;

    if (currentSet && allTokens[currentSet]) {
      const candidate = getNestedValue(allTokens[currentSet], pathSegments);
      if (isTokenLeaf(candidate)) {
        foundLeaf = candidate;
      }
    }

    // 2. Direct path lookup in root allTokens
    if (!foundLeaf) {
      const candidate = getNestedValue(allTokens, pathSegments);
      if (isTokenLeaf(candidate)) {
        foundLeaf = candidate;
      }
    }

    // 3. Search each set in allTokens directly
    if (!foundLeaf) {
      for (const setName of Object.keys(allTokens)) {
        if (setName === currentSet || setName.startsWith("$")) continue;
        const candidate = getNestedValue(allTokens[setName], pathSegments);
        if (isTokenLeaf(candidate)) {
          foundLeaf = candidate;
          break;
        }
      }
    }

    // 4. Flexible cross-layer alias resolution (handles {foundation.color.blue.100}, {foundation/color.blue.100}, {color.blue.100})
    if (!foundLeaf) {
      for (const [setName, setTree] of Object.entries(allTokens)) {
        if (setName.startsWith("$") || !setTree || typeof setTree !== "object") continue;

        // A. If path starts with set name or folder (e.g. path is "foundation.color.blue.100", setName is "foundation/color")
        const normSet = setName.toLowerCase().replace(/\.json$/i, "").replace(/[/\\]/g, ".");
        const setSegs = normSet.split(".").filter(Boolean);

        if (pathSegments.length > setSegs.length) {
          const prefixMatch = setSegs.every((seg, idx) => pathSegments[idx].toLowerCase() === seg);
          if (prefixMatch) {
            const subSegments = pathSegments.slice(setSegs.length);
            const subCandidate = getNestedValue(setTree, subSegments);
            if (isTokenLeaf(subCandidate)) {
              foundLeaf = subCandidate;
              break;
            }
          }
        }

        // B. If path has a category prefix that might or might not exist in setTree root
        if (pathSegments.length > 1) {
          const strippedFirst = pathSegments.slice(1);
          const candidate2 = getNestedValue(setTree, strippedFirst);
          if (isTokenLeaf(candidate2)) {
            foundLeaf = candidate2;
            break;
          }
        }

        // C. Prepend category / parent if omitted in path
        for (const rootKey of ["color", "colors", "spacing", "sizing", "borderRadius", "typography", "shadow", "boxShadow"]) {
          const candidate3 = getNestedValue(setTree, [rootKey, ...pathSegments]);
          if (isTokenLeaf(candidate3)) {
            foundLeaf = candidate3;
            break;
          }
        }
        if (foundLeaf) break;
      }
    }

    if (foundLeaf) {
      const rawVal = getLeafValue(foundLeaf);
      const baseResolved = resolveTokenAlias(rawVal, allTokens, currentSet, newVisited, lookupIndex, depth + 1);
      const modifier = extractColorModifier(foundLeaf);
      if (modifier) {
        let resolvedMixColor: string | undefined = undefined;
        if (modifier.color && typeof modifier.color === "string" && modifier.color.includes("{")) {
          resolvedMixColor = resolveTokenAlias(modifier.color, allTokens, currentSet, newVisited, lookupIndex, depth + 1);
        }
        let resolvedModValue = modifier.value;
        if (typeof resolvedModValue === "string" && resolvedModValue.includes("{")) {
          resolvedModValue = resolveTokenAlias(resolvedModValue, allTokens, currentSet, newVisited, lookupIndex, depth + 1);
        }
        const modToApply: ColorModifier = {
          ...modifier,
          value: resolvedModValue,
        };
        const modResult = applyColorModifier(baseResolved, modToApply, resolvedMixColor);
        return modResult.resolvedValue;
      }
      return baseResolved;
    }

    return match;
  });

  return evaluateTokenMath(replaced, allTokens, currentSet, visited, lookupIndex, depth + 1);
}

/**
/**
 * Safe mathematical expression evaluator without `new Function` or `eval`.
 * Parses and computes arithmetic expressions, percentage transforms, and rounding functions safely.
 */
function safeEvalArithmetic(expr: string): number | null {
  let pos = 0;
  const input = expr.trim();

  function peek(): string {
    while (pos < input.length && /\s/.test(input[pos])) pos++;
    return pos < input.length ? input[pos] : "";
  }

  function consume(char?: string): string {
    while (pos < input.length && /\s/.test(input[pos])) pos++;
    if (pos >= input.length) return "";
    const c = input[pos];
    if (char && c !== char) return "";
    pos++;
    return c;
  }

  function parseNumberOrFunction(): number | null {
    while (pos < input.length && /\s/.test(input[pos])) pos++;
    if (pos >= input.length) return null;

    // Unary plus/minus
    if (input[pos] === "+") {
      pos++;
      return parseNumberOrFunction();
    }
    if (input[pos] === "-") {
      pos++;
      const val = parseNumberOrFunction();
      return val !== null ? -val : null;
    }

    // Parentheses
    if (input[pos] === "(") {
      pos++;
      const val = parseExpression();
      if (consume(")") !== ")") return null;
      return val;
    }

    // Function calls (roundTo, Math.round, round, floor, ceil, etc.)
    const funcMatch = input.slice(pos).match(/^(?:Math\.)?(roundTo|round|floor|ceil|abs|min|max)\s*\(/i);
    if (funcMatch) {
      const funcName = funcMatch[1].toLowerCase();
      pos += funcMatch[0].length; // moved past '('
      const args: number[] = [];
      while (pos < input.length) {
        const arg = parseExpression();
        if (arg === null) return null;
        args.push(arg);
        const next = peek();
        if (next === ",") {
          pos++;
        } else if (next === ")") {
          pos++;
          break;
        } else {
          return null;
        }
      }

      if (funcName === "roundto") {
        const val = args[0] ?? 0;
        const step = args[1] ?? 1;
        if (step === 0) return Math.round(val);
        return Math.round(val / step) * step;
      }
      if (funcName === "round") {
        const val = args[0] ?? 0;
        const step = args[1] ?? 1;
        if (args.length > 1 && step !== 0) return Math.round(val / step) * step;
        return Math.round(val);
      }
      if (funcName === "floor") return Math.floor(args[0] ?? 0);
      if (funcName === "ceil") return Math.ceil(args[0] ?? 0);
      if (funcName === "abs") return Math.abs(args[0] ?? 0);
      if (funcName === "min") return Math.min(...args);
      if (funcName === "max") return Math.max(...args);
      return null;
    }

    // Number literal (supports optional units %, px, rem, em)
    const numMatch = input.slice(pos).match(/^([0-9]+(?:\.[0-9]+)?)(%|px|rem|em)?/i);
    if (numMatch) {
      pos += numMatch[0].length;
      let num = parseFloat(numMatch[1]);
      if (numMatch[2] === "%") {
        num = num / 100;
      }
      return num;
    }

    return null;
  }

  function parseFactor(): number | null {
    return parseNumberOrFunction();
  }

  function parseTerm(): number | null {
    let left = parseFactor();
    if (left === null) return null;

    while (pos < input.length) {
      const op = peek();
      if (op === "*" || op === "/") {
        pos++;
        const right = parseFactor();
        if (right === null) return null;
        if (op === "*") {
          left = left * right;
        } else {
          if (right === 0) return null;
          left = left / right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  function parseExpression(): number | null {
    let left = parseTerm();
    if (left === null) return null;

    while (pos < input.length) {
      const op = peek();
      if (op === "+" || op === "-") {
        pos++;
        const right = parseTerm();
        if (right === null) return null;
        if (op === "+") {
          left = left + right;
        } else {
          left = left - right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  try {
    const result = parseExpression();
    if (pos < input.length && peek() !== "") {
      return null;
    }
    return result !== null && isFinite(result) && !isNaN(result) ? result : null;
  } catch {
    return null;
  }
}

/**
 * Evaluates mathematical expressions and Tokens Studio functions (e.g. roundTo, arithmetic, percentages)
 * using a safe AST arithmetic evaluator without code execution risks.
 */
export function evaluateTokenMath(
  expr: string,
  allTokens?: RawTokensDocument,
  currentSet?: string,
  visited: Set<string> = new Set(),
  lookupIndex?: TokenLookupIndex,
  depth: number = 0
): string {
  if (!expr || typeof expr !== "string") return expr;
  if (depth > 30) return expr;
  let str = expr.trim();

  // If expression is already a plain number or color or non-math string, return it
  if (/^-?[0-9]+(\.[0-9]+)?(px|rem|em)?$/.test(str) || str.startsWith("#") || str.startsWith("rgba")) {
    return str;
  }

  // If expression contains roundTo or math functions, resolve bare token names first if present
  if (allTokens && (str.includes("roundTo") || /^[a-zA-Z0-9_\-\.\s\+\-\*\/,()]+$/.test(str))) {
    const wordRegex = /[a-zA-Z0-9_\-]+(\.[a-zA-Z0-9_\-]+)+/g;
    str = str.replace(wordRegex, (match) => {
      if (
        match === "roundTo" ||
        match === "Math.round" ||
        match === "Math.floor" ||
        match === "Math.ceil" ||
        match.startsWith("Math.")
      ) {
        return match;
      }
      const res = resolveTokenAlias(`{${match}}`, allTokens, currentSet);
      return res !== `{${match}}` ? res : match;
    });
  }

  // Preserve units if present
  const hasPx = str.includes("px");
  const hasRem = str.includes("rem");
  const hasEm = str.includes("em");

  // Evaluate safely using our sandboxed arithmetic parser
  const result = safeEvalArithmetic(str);

  if (result !== null && typeof result === "number") {
    const rounded = Math.round(result * 1000) / 1000;
    if (hasPx) return `${rounded}px`;
    if (hasRem) return `${rounded}rem`;
    if (hasEm) return `${rounded}em`;
    return String(rounded);
  }

  return str;
}

/**
 * Formats a typography composite token (raw or resolved) into a clean readable string with fully resolved values
 * e.g. "Inter, Arial - Medium - 48 - 60"
 */
export function formatTypographySummary(
  val: string | Record<string, any>,
  rawDoc?: RawTokensDocument,
  currentSet?: string
): string {
  let obj: Record<string, any> = {};
  if (typeof val === "object" && val !== null) {
    obj = val;
  } else if (typeof val === "string" && val.trim().startsWith("{")) {
    try {
      obj = JSON.parse(val);
    } catch {
      return val;
    }
  } else {
    return String(val ?? "");
  }

  // Helper to resolve alias to concrete value
  const resolveProp = (propVal: any): string => {
    if (!propVal && propVal !== 0) return "";
    while (typeof propVal === "object" && propVal !== null && ("value" in propVal || "$value" in propVal)) {
      propVal = propVal.value !== undefined ? propVal.value : propVal.$value;
    }
    let str = typeof propVal === "object" && propVal !== null ? JSON.stringify(propVal) : String(propVal).trim();
    if (rawDoc && str.includes("{")) {
      str = resolveTokenAlias(str, rawDoc, currentSet);
    }
    // Clean up braces, quotes
    return str.replace(/^\{|\}$/g, "").replace(/^["']|["']$/g, "").trim();
  };

  const family = resolveProp(obj.fontFamily || obj.fontFamilies);
  const weight = resolveProp(obj.fontWeight || obj.fontWeights);
  const size = resolveProp(obj.fontSize || obj.fontSizes).replace(/px$/i, "");
  const lineHeight = resolveProp(obj.lineHeight || obj.lineHeights).replace(/px$/i, "");

  const parts: string[] = [];
  if (family) parts.push(family);
  if (weight) parts.push(weight);
  if (size) parts.push(size);
  if (lineHeight) parts.push(lineHeight);

  return parts.length > 0 ? parts.join(" - ") : JSON.stringify(obj);
}

/**
 * Traverses raw tokens and flattens them into a list of table-ready token items
 */
export function flattenAndResolveTokens(
  rawDoc: RawTokensDocument,
  selectedSet?: string,
  themeConfig?: ThemeResolutionConfig
): FlattenedToken[] {
  const result: FlattenedToken[] = [];
  if (!rawDoc || typeof rawDoc !== "object") return result;

  // Build O(1) lookup index across all token sets with theme priority order
  const lookupIndex = buildTokenLookupIndex(rawDoc, themeConfig);

  const setsToProcess = selectedSet && selectedSet !== "ALL" && rawDoc[selectedSet]
    ? [selectedSet]
    : Object.keys(rawDoc).filter((k) => !k.startsWith("$"));

  for (const setName of setsToProcess) {
    const setTree = rawDoc[setName];
    if (!setTree || typeof setTree !== "object") continue;

    const walk = (node: any, currentPath: string[]) => {
      if (!node || typeof node !== "object") return;

      if (isTokenLeaf(node)) {
        const rawValue = getLeafValue(node);
        const group = currentPath.length > 1 ? String(currentPath[0]) : "";
        const subgroup = currentPath.length > 2 ? String(currentPath[1]) : undefined;
        const id = `${setName}.${currentPath.join(".")}`;
        const name = currentPath.join(".");
        const isAlias = typeof rawValue === "string" && /\{[^}]+\}/.test(rawValue);
        const aliasMatch = isAlias ? rawValue.match(/\{([^}]+)\}/) : null;
        let resolvedValue = resolveTokenAlias(rawValue, rawDoc, setName, new Set(), lookupIndex);

        const modifier = extractColorModifier(node);
        let resolvedHex: string | undefined = undefined;

        if (modifier) {
          let resolvedMixColor: string | undefined = undefined;
          if (modifier.color && typeof modifier.color === "string" && modifier.color.includes("{")) {
            resolvedMixColor = resolveTokenAlias(modifier.color, rawDoc, setName, new Set(), lookupIndex);
          }
          let resolvedModValue = modifier.value;
          if (typeof resolvedModValue === "string" && resolvedModValue.includes("{")) {
            resolvedModValue = resolveTokenAlias(resolvedModValue, rawDoc, setName, new Set(), lookupIndex);
          }
          const modToApply: ColorModifier = {
            ...modifier,
            value: resolvedModValue,
          };
          const modResult = applyColorModifier(
            typeof resolvedValue === "string" ? resolvedValue : JSON.stringify(resolvedValue),
            modToApply,
            resolvedMixColor
          );
          resolvedValue = modResult.resolvedValue;
          resolvedHex = modResult.hex;
        } else if (typeof resolvedValue === "string") {
          resolvedHex = toHexFast(resolvedValue);
        }

        const rawDesc = node.description ?? node.$description;
        const description =
          typeof rawDesc === "string"
            ? rawDesc
            : rawDesc !== undefined && rawDesc !== null
            ? typeof rawDesc === "object"
              ? JSON.stringify(rawDesc)
              : String(rawDesc)
            : undefined;

        const extensions = node.$extensions && typeof node.$extensions === "object" ? node.$extensions : {};
        const studioExt =
          extensions["studio.tokens"] && typeof extensions["studio.tokens"] === "object"
            ? extensions["studio.tokens"]
            : {};
        const deprecatedFlag = Boolean(node.$deprecated ?? node.deprecated ?? studioExt.deprecated);
        const figmaKey =
          typeof node.$figmaVariableReferences === "string"
            ? node.$figmaVariableReferences
            : typeof node.figmaVariableKey === "string"
              ? node.figmaVariableKey
              : undefined;

        result.push({
          id,
          name,
          path: [setName, ...currentPath],
          group,
          subgroup,
          setName: String(setName),
          type: getLeafType(node, group),
          rawValue: typeof rawValue === "string" ? rawValue : JSON.stringify(rawValue),
          resolvedValue: typeof resolvedValue === "string" ? resolvedValue : JSON.stringify(resolvedValue),
          resolvedHex,
          modify: modifier || undefined,
          isAlias,
          aliasTarget: aliasMatch ? String(aliasMatch[1]) : undefined,
          description,
          deprecated: deprecatedFlag || undefined,
          deprecatedMessage:
            typeof (node.$deprecatedMessage ?? studioExt.deprecatedMessage) === "string"
              ? String(node.$deprecatedMessage ?? studioExt.deprecatedMessage)
              : undefined,
          deprecatedReplacement:
            typeof (node.$replacementToken ?? studioExt.replacementToken) === "string"
              ? String(node.$replacementToken ?? studioExt.replacementToken)
              : undefined,
          deprecatedSeverity:
            typeof (node.$deprecatedSeverity ?? studioExt.deprecatedSeverity) === "string"
              ? String(node.$deprecatedSeverity ?? studioExt.deprecatedSeverity)
              : undefined,
          deprecatedRemoveAfter:
            typeof (node.$deprecatedRemoveAfter ?? studioExt.deprecatedRemoveAfter) === "string"
              ? String(node.$deprecatedRemoveAfter ?? studioExt.deprecatedRemoveAfter)
              : undefined,
          figmaVariableKey: figmaKey,
          category: typeof node.category === "string" ? node.category : undefined,
        });
        return;
      }

      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith("$")) {
          continue;
        }
        walk(child, [...currentPath, key]);
      }
    };

    walk(setTree, []);
  }

  result.sort((a, b) => compareTokens(a, b, "resolved", "asc"));

  return result;
}

/**
 * Immutably updates a single token in the nested raw token document.
 */
export function setTokenAtKeyPath(
  doc: RawTokensDocument,
  fullPath: string[],
  newValue: any
): RawTokensDocument {
  if (fullPath.length === 0) return doc;

  const clone: RawTokensDocument = JSON.parse(JSON.stringify(doc));
  let current: any = clone;

  for (let i = 0; i < fullPath.length - 1; i++) {
    const segment = fullPath[i];
    if (!current[segment] || typeof current[segment] !== "object") {
      current[segment] = {};
    }
    current = current[segment];
  }

  const lastSegment = fullPath[fullPath.length - 1];

  // If newValue is a JSON string of an object, store as object if leaf originally had object
  let finalVal = newValue;
  if (typeof newValue === "string" && newValue.trim().startsWith("{") && newValue.trim().endsWith("}") && newValue.includes(":")) {
    try {
      finalVal = JSON.parse(newValue);
    } catch {
      finalVal = newValue;
    }
  }

  const isMetadataPayload =
    finalVal &&
    typeof finalVal === "object" &&
    !Array.isArray(finalVal) &&
    ("value" in finalVal || "type" in finalVal || "description" in finalVal || "$deprecated" in finalVal);

  const existing =
    current[lastSegment] && typeof current[lastSegment] === "object" ? { ...current[lastSegment] } : {};

  if (isMetadataPayload) {
    const nextLeaf: Record<string, any> = { ...existing };
    if (finalVal.value !== undefined) {
      if ("$value" in nextLeaf && !("value" in nextLeaf)) nextLeaf.$value = finalVal.value;
      else nextLeaf.value = finalVal.value;
    }
    if (finalVal.type !== undefined) nextLeaf.type = finalVal.type;
    if (finalVal.description !== undefined) {
      if (finalVal.description) nextLeaf.description = finalVal.description;
      else delete nextLeaf.description;
    }
    if (finalVal.category !== undefined) nextLeaf.category = finalVal.category;
    if (finalVal.$deprecated) {
      nextLeaf.$deprecated = true;
      if (finalVal.$deprecatedMessage) nextLeaf.$deprecatedMessage = finalVal.$deprecatedMessage;
      else delete nextLeaf.$deprecatedMessage;
      if (finalVal.$replacementToken) nextLeaf.$replacementToken = finalVal.$replacementToken;
      else delete nextLeaf.$replacementToken;
      if (finalVal.$deprecatedSeverity) nextLeaf.$deprecatedSeverity = finalVal.$deprecatedSeverity;
      else delete nextLeaf.$deprecatedSeverity;
      if (finalVal.$deprecatedRemoveAfter) nextLeaf.$deprecatedRemoveAfter = finalVal.$deprecatedRemoveAfter;
      else delete nextLeaf.$deprecatedRemoveAfter;
    } else {
      delete nextLeaf.$deprecated;
      delete nextLeaf.$deprecatedMessage;
      delete nextLeaf.$replacementToken;
      delete nextLeaf.$deprecatedSeverity;
      delete nextLeaf.$deprecatedRemoveAfter;
    }
    current[lastSegment] = nextLeaf;
  } else if (existing && typeof existing === "object") {
    if ("value" in existing) {
      current[lastSegment] = { ...existing, value: finalVal };
    } else if ("$value" in existing) {
      current[lastSegment] = { ...existing, $value: finalVal };
    } else {
      current[lastSegment] = { value: finalVal };
    }
  } else {
    current[lastSegment] = { value: finalVal };
  }

  return clone;
}

/**
 * Creates a new token leaf at the given key path.
 */
export function createTokenAtKeyPath(
  doc: RawTokensDocument,
  fullPath: string[],
  tokenLeaf: { value: any; type: string; description?: string }
): RawTokensDocument {
  if (fullPath.length === 0) return doc;

  const clone: RawTokensDocument = JSON.parse(JSON.stringify(doc));
  let current: any = clone;

  for (let i = 0; i < fullPath.length - 1; i++) {
    const segment = fullPath[i];
    if (!current[segment] || typeof current[segment] !== "object") {
      current[segment] = {};
    }
    current = current[segment];
  }

  const lastSegment = fullPath[fullPath.length - 1];
  current[lastSegment] = {
    value: tokenLeaf.value,
    type: tokenLeaf.type,
    ...(tokenLeaf.description ? { description: tokenLeaf.description } : {}),
  };

  return clone;
}

/**
 * Immutably deletes a token leaf at the given key path.
 */
export function deleteTokenAtKeyPath(
  doc: RawTokensDocument,
  fullPath: string[]
): RawTokensDocument {
  if (fullPath.length === 0) return doc;

  const clone: RawTokensDocument = JSON.parse(JSON.stringify(doc));
  let current: any = clone;

  for (let i = 0; i < fullPath.length - 1; i++) {
    const segment = fullPath[i];
    if (!current[segment] || typeof current[segment] !== "object") {
      return clone;
    }
    current = current[segment];
  }

  const lastSegment = fullPath[fullPath.length - 1];
  delete current[lastSegment];

  return clone;
}

/**
 * Creates a new empty token set in the document.
 */
export function createEmptyTokenSet(
  doc: RawTokensDocument,
  setName: string
): RawTokensDocument {
  const clone: RawTokensDocument = JSON.parse(JSON.stringify(doc));
  if (!clone[setName]) {
    clone[setName] = {};
  }

  // Update $metadata.tokenSetOrder if present
  const metaKey = clone["$metadata.json"] ? "$metadata.json" : "$metadata";
  if (clone[metaKey] && Array.isArray((clone[metaKey] as any).tokenSetOrder)) {
    const order = (clone[metaKey] as any).tokenSetOrder;
    if (!order.includes(setName)) {
      order.push(setName);
    }
  }

  return clone;
}

/**
 * Deletes a token set from the document and cleans up references.
 */
export function deleteTokenSet(
  doc: RawTokensDocument,
  setName: string
): RawTokensDocument {
  const clone: RawTokensDocument = JSON.parse(JSON.stringify(doc));
  delete clone[setName];

  // Clean from $metadata.tokenSetOrder
  const metaKey = clone["$metadata.json"] ? "$metadata.json" : "$metadata";
  if (clone[metaKey] && Array.isArray((clone[metaKey] as any).tokenSetOrder)) {
    (clone[metaKey] as any).tokenSetOrder = (clone[metaKey] as any).tokenSetOrder.filter(
      (s: string) => s !== setName
    );
  }

  // Clean from $themes.json / $theme.json
  const themesKey = ["$themes.json", "$themes", "$theme.json", "$theme"].find((k) =>
    Array.isArray(clone[k])
  );
  if (themesKey) {
    (clone[themesKey] as any).forEach((theme: any) => {
      if (theme.selectedTokenSets && theme.selectedTokenSets[setName]) {
        delete theme.selectedTokenSets[setName];
      }
    });
  }

  return clone;
}
