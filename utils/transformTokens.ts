import { RawTokensDocument, RawTokenLeaf, FlattenedToken, TokenType } from "@/types/tokens";

// Check if a leaf is a token node (has 'value' or '$value')
export function isTokenLeaf(node: any): node is RawTokenLeaf {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;
  return "value" in node || "$value" in node;
}

// Extract the raw value string or object from a token leaf
export function getLeafValue(leaf: RawTokenLeaf): string {
  const val = leaf.value !== undefined ? leaf.value : leaf.$value;
  if (typeof val === "object" && val !== null) {
    return JSON.stringify(val);
  }
  return String(val ?? "");
}

// Extract the token type from a token leaf
export function getLeafType(leaf: RawTokenLeaf, parentGroupOrPath?: string | string[]): TokenType {
  const type = (leaf.type || leaf.$type || "") as string;
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
    ? parentGroupOrPath.join(".").toLowerCase()
    : (parentGroupOrPath || "").toLowerCase();

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

/**
 * Resolves a token alias string like "{colors.blue.500}" or composite objects
 */
export function resolveTokenAlias(
  aliasValue: any,
  allTokens: RawTokensDocument,
  currentSet?: string,
  visited: Set<string> = new Set()
): string {
  if (aliasValue === null || aliasValue === undefined) return "";

  // Handle composite object values (e.g. typography)
  if (typeof aliasValue === "object") {
    const resolvedObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(aliasValue)) {
      resolvedObj[k] = resolveTokenAlias(v, allTokens, currentSet, visited);
    }
    return JSON.stringify(resolvedObj);
  }

  // If it's a JSON stringified composite object
  if (typeof aliasValue === "string" && aliasValue.trim().startsWith("{") && aliasValue.trim().endsWith("}") && aliasValue.includes(":")) {
    try {
      const parsed = JSON.parse(aliasValue);
      if (typeof parsed === "object" && parsed !== null) {
        const resolvedObj: Record<string, any> = {};
        for (const [k, v] of Object.entries(parsed)) {
          resolvedObj[k] = resolveTokenAlias(v, allTokens, currentSet, visited);
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
    const cleanPath = pathString.trim();

    if (visited.has(cleanPath)) {
      return match; // Circular reference guard
    }
    const newVisited = new Set(visited);
    newVisited.add(cleanPath);

    const pathSegments = cleanPath.split(".");

    // Try finding within current set first
    let foundLeaf: any = undefined;

    if (currentSet && allTokens[currentSet]) {
      const candidate = getNestedValue(allTokens[currentSet], pathSegments);
      if (isTokenLeaf(candidate)) {
        foundLeaf = candidate;
      }
    }

    if (!foundLeaf) {
      const candidate = getNestedValue(allTokens, pathSegments);
      if (isTokenLeaf(candidate)) {
        foundLeaf = candidate;
      }
    }

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

    if (foundLeaf) {
      const rawVal = getLeafValue(foundLeaf);
      return resolveTokenAlias(rawVal, allTokens, currentSet, newVisited);
    }

    return match;
  });

  return evaluateTokenMath(replaced, allTokens, currentSet);
}

/**
 * Evaluates mathematical expressions and Tokens Studio functions (e.g. roundTo, arithmetic, percentages)
 */
export function evaluateTokenMath(
  expr: string,
  allTokens?: RawTokensDocument,
  currentSet?: string
): string {
  if (!expr || typeof expr !== "string") return expr;
  let str = expr.trim();

  // If expression is already a plain number, return it
  if (/^-?[0-9]+(\.[0-9]+)?(px|rem|em)?$/.test(str)) {
    return str;
  }

  // If expression contains roundTo or functions, resolve bare token names first if present
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

  // Transform roundTo(val, step) to JavaScript Math.round
  let jsExpr = str.replace(/roundTo\s*\(\s*([^,]+)\s*(?:,\s*([^)]+))?\s*\)/gi, (_, valExpr, stepExpr) => {
    const step = stepExpr ? stepExpr.trim().replace(/px|rem|em/g, "") : "1";
    if (step === "0" || step === "" || !stepExpr) {
      return `Math.round(${valExpr})`;
    }
    return `(Math.round((${valExpr}) / (${step})) * (${step}))`;
  });

  // Convert percentages (e.g. "125%" -> "(125 / 100)")
  jsExpr = jsExpr.replace(/([0-9.]+)%/g, "($1 / 100)");

  // Strip CSS units before evaluation
  const hasPx = jsExpr.includes("px") || str.includes("px");
  const hasRem = jsExpr.includes("rem") || str.includes("rem");
  const hasEm = jsExpr.includes("em") || str.includes("em");
  const sanitized = jsExpr.replace(/px|rem|em/g, "");

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`
      "use strict";
      return (${sanitized});
    `)();

    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      const rounded = Math.round(result * 1000) / 1000;
      if (hasPx) return `${rounded}px`;
      if (hasRem) return `${rounded}rem`;
      if (hasEm) return `${rounded}em`;
      return String(rounded);
    }
  } catch {
    // If evaluation fails, strip raw Math.round artifacts if present
    if (str.includes("Math.round")) {
      return str.replace(/Math\.round\(([^)]+)\)/g, "$1");
    }
  }

  return str;
}

/**
 * Formats a typography composite token (raw or resolved) into a clean readable string
 * e.g. "Inter · 16px / 24px (400)" or "{font-families.primary} · {font-sizes.base}"
 */
export function formatTypographySummary(val: string | Record<string, any>): string {
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

  const family = obj.fontFamily ? String(obj.fontFamily).replace(/^\{|\}$/g, "") : "";
  const size = obj.fontSize ? String(obj.fontSize).replace(/^\{|\}$/g, "") : "";
  const weight = obj.fontWeight ? String(obj.fontWeight).replace(/^\{|\}$/g, "") : "";
  const lineHeight = obj.lineHeight ? String(obj.lineHeight).replace(/^\{|\}$/g, "") : "";

  const parts: string[] = [];
  if (family) parts.push(family);
  if (size && lineHeight) parts.push(`${size} / ${lineHeight}`);
  else if (size) parts.push(size);
  if (weight) parts.push(`(${weight})`);

  return parts.length > 0 ? parts.join(" · ") : JSON.stringify(obj);
}

/**
 * Traverses raw tokens and flattens them into a list of table-ready token items
 */
export function flattenAndResolveTokens(
  rawDoc: RawTokensDocument,
  selectedSet?: string
): FlattenedToken[] {
  const result: FlattenedToken[] = [];
  if (!rawDoc || typeof rawDoc !== "object") return result;

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
        const group = currentPath[0] || "general";
        const subgroup = currentPath.length > 2 ? currentPath[1] : undefined;
        const id = `${setName}.${currentPath.join(".")}`;
        const name = currentPath.join(".");
        const isAlias = typeof rawValue === "string" && /\{[^}]+\}/.test(rawValue);
        const aliasMatch = isAlias ? rawValue.match(/\{([^}]+)\}/) : null;
        const resolvedValue = resolveTokenAlias(rawValue, rawDoc, setName);

        result.push({
          id,
          name,
          path: [setName, ...currentPath],
          group,
          subgroup,
          setName,
          type: getLeafType(node, group),
          rawValue,
          resolvedValue,
          isAlias,
          aliasTarget: aliasMatch ? aliasMatch[1] : undefined,
          description: node.description || node.$description,
        });
        return;
      }

      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith("$") && key !== "$value" && key !== "$type" && key !== "$description") {
          continue;
        }
        walk(child, [...currentPath, key]);
      }
    };

    walk(setTree, []);
  }

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

  if (current[lastSegment] && typeof current[lastSegment] === "object") {
    if ("value" in current[lastSegment]) {
      current[lastSegment].value = finalVal;
    } else if ("$value" in current[lastSegment]) {
      current[lastSegment].$value = finalVal;
    } else {
      current[lastSegment] = { value: finalVal };
    }
  } else {
    current[lastSegment] = { value: finalVal };
  }

  return clone;
}
