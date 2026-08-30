import {
  RawTokensDocument,
  ThemeGroup,
  ThemeOption,
  TokenType,
} from "@/types/tokens";
import {
  isTokenLeaf,
  getLeafValue,
  getLeafType,
  resolveTokenAlias,
  naturalCompareTokenKeys,
} from "@/utils/transformTokens";

// Palette colors for theme groups
export const GROUP_PALETTE = [
  "#3b82f6", // Blue - Semantic / Typography
  "#10b981", // Green - Components / Mode
  "#f97316", // Orange - Theme / Brand
  "#ef4444", // Red - Brands
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#eab308", // Yellow
];

/**
 * Normalizes set names for comparison (strips leading/trailing slashes, dots, .json, lowercase)
 */
function normalizeName(name: any): string {
  const str = typeof name === "string" ? name : String(name || "");
  return str
    .toLowerCase()
    .replace(/\.json$/i, "")
    .replace(/^[./\s]+|[./\s]+$/g, "")
    .replace(/[/\\]/g, ".");
}

/**
 * Finds all matching token sets in rawDoc using flexible matching (e.g. exact key, suffix, path segments, folder matching)
 */
export function findSetsInDoc(
  setName: string,
  rawDoc: RawTokensDocument
): Array<{ setTree: any; actualKey: string }> {
  if (!rawDoc || typeof rawDoc !== "object" || setName === undefined || setName === null) return [];

  const results: Array<{ setTree: any; actualKey: string }> = [];
  const visitedKeys = new Set<string>();

  // 1. Direct exact key match
  if (rawDoc[setName]) {
    results.push({ setTree: rawDoc[setName], actualKey: setName });
    visitedKeys.add(setName);
  }

  const norm = normalizeName(setName);
  if (!norm) return results;

  for (const [key, val] of Object.entries(rawDoc)) {
    if (key.startsWith("$") || visitedKeys.has(key)) continue;
    const normKey = normalizeName(key);

    if (
      normKey === norm ||
      normKey.endsWith(`.${norm}`) ||
      norm.endsWith(`.${normKey}`) ||
      normKey.includes(`.${norm}.`) ||
      norm.includes(`.${normKey}.`) ||
      normKey.startsWith(`${norm}.`) ||
      norm.startsWith(`${normKey}.`) ||
      normKey.includes(`.${norm}`) ||
      norm.includes(`.${normKey}`) ||
      normKey.includes(norm) ||
      norm.includes(normKey)
    ) {
      results.push({ setTree: val, actualKey: key });
      visitedKeys.add(key);
    }
  }

  // 2. Fallback: match by filename (last segment)
  if (results.length === 0) {
    const targetLastSeg = norm.split(".").pop();
    if (targetLastSeg) {
      for (const [key, val] of Object.entries(rawDoc)) {
        if (key.startsWith("$") || visitedKeys.has(key)) continue;
        const normKey = normalizeName(key);
        if (normKey.split(".").pop() === targetLastSeg) {
          results.push({ setTree: val, actualKey: key });
          visitedKeys.add(key);
        }
      }
    }
  }

  return results;
}

export function findSetInDoc(
  setName: string,
  rawDoc: RawTokensDocument
): { setTree: any; actualKey: string } | null {
  const matches = findSetsInDoc(setName, rawDoc);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Extracts or synthesizes theme groups from rawTokens (including $themes.json if present).
 * Also discovers and exposes Foundation, Alias, Semantic, and Component layers.
 */
export function extractThemeGroups(rawDoc: RawTokensDocument): ThemeGroup[] {
  if (!rawDoc || typeof rawDoc !== "object") return [];

  const groups: ThemeGroup[] = [];
  const coveredSetNames = new Set<string>();

  // 1. Check if $themes.json exists in rawDoc (or $themes)
  const themesRaw = rawDoc["$themes"] || rawDoc["$themes.json"];
  if (themesRaw && Array.isArray(themesRaw) && themesRaw.length > 0) {
    const groupMap = new Map<string, ThemeOption[]>();

    themesRaw.forEach((item: any, idx: number) => {
      if (!item || typeof item !== "object") return;
      const groupName = typeof item.group === "string" && item.group.trim() ? item.group.trim() : "Theme";
      const optionName = typeof item.name === "string" && item.name.trim() ? item.name.trim() : `Option ${idx + 1}`;
      const optionId = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `opt-${idx}`;
      const selectedSets = item.selectedTokenSets && typeof item.selectedTokenSets === "object" ? item.selectedTokenSets : {};

      // Track all sets covered by this theme group
      Object.keys(selectedSets).forEach((s) => coveredSetNames.add(normalizeName(s)));

      const option: ThemeOption = {
        id: optionId,
        name: optionName,
        group: groupName,
        selectedTokenSets: selectedSets,
        color:
          item.color ||
          (groupName.toLowerCase() === "theme" || groupName.toLowerCase() === "mode"
            ? "#ffffff"
            : GROUP_PALETTE[idx % GROUP_PALETTE.length]),
      };

      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(option);
    });

    let colorIdx = 0;
    groupMap.forEach((options, name) => {
      groups.push({
        id: `grp-${String(name).toLowerCase().replace(/\s+/g, "-")}`,
        name: String(name),
        color: GROUP_PALETTE[colorIdx++ % GROUP_PALETTE.length],
        options,
      });
    });
  }

  // 2. Discover Foundation, Alias, Brand, and other orphan layers if they exist in rawDoc
  const allRawSetKeys = Object.keys(rawDoc).filter((k) => !k.startsWith("$"));

  // Check for Foundation sets
  const foundationSets = allRawSetKeys.filter(
    (s) =>
      typeof s === "string" &&
      (s.toLowerCase().startsWith("foundation") ||
        s.toLowerCase().includes("/foundation") ||
        s.toLowerCase().startsWith("base") ||
        s.toLowerCase().startsWith("core") ||
        s.toLowerCase().startsWith("primitives") ||
        s.toLowerCase().startsWith("global"))
  );

  const hasFoundationGroup = groups.some((g) => g.name.toLowerCase().includes("foundation"));
  if (!hasFoundationGroup && foundationSets.length > 0) {
    groups.unshift({
      id: "grp-foundation",
      name: "Foundation",
      color: "#f59e0b",
      options: foundationSets.map((s) => ({
        id: `opt-foundation-${s.replace(/[/\\]/g, "-")}`,
        name: s.split(/[/.]/).pop() || s,
        group: "Foundation",
        selectedTokenSets: { [s]: "enabled" },
        color: "#f59e0b",
      })),
    });
  }

  // Check for Alias / Semantic sets
  const aliasSets = allRawSetKeys.filter(
    (s) =>
      typeof s === "string" &&
      (s.toLowerCase().startsWith("alias") ||
        s.toLowerCase().includes("/alias") ||
        s.toLowerCase().startsWith("semantic") ||
        s.toLowerCase().includes("/semantic"))
  );

  const hasAliasGroup = groups.some((g) => g.name.toLowerCase().includes("alias") || g.name.toLowerCase().includes("semantic"));
  if (!hasAliasGroup && aliasSets.length > 0) {
    groups.push({
      id: "grp-alias",
      name: "Alias",
      color: "#8b5cf6",
      options: aliasSets.map((s) => ({
        id: `opt-alias-${s.replace(/[/\\]/g, "-")}`,
        name: s.split(/[/.]/).pop() || s,
        group: "Alias",
        selectedTokenSets: { [s]: "enabled" },
        color: "#8b5cf6",
      })),
    });
  }

  // Fallback: If no theme groups created yet, infer from sets
  if (groups.length === 0) {
    const hasDark = allRawSetKeys.some((s) => typeof s === "string" && s.toLowerCase().includes("dark"));
    const hasLight = allRawSetKeys.some((s) => typeof s === "string" && s.toLowerCase().includes("light"));

    const themeOptions: ThemeOption[] = [];
    if (hasDark) {
      themeOptions.push({
        id: "opt-dark",
        name: "Dark",
        group: "Mode",
        selectedTokenSets: { global: "source", dark: "enabled" },
        color: "#ffffff",
      });
    }
    if (hasLight) {
      themeOptions.push({
        id: "opt-light",
        name: "Light",
        group: "Mode",
        selectedTokenSets: { global: "source", light: "enabled" },
        color: "#ffffff",
      });
    }

    if (themeOptions.length > 0) {
      groups.push({
        id: "grp-mode",
        name: "Mode",
        color: "#10b981",
        options: themeOptions,
      });
    }

    // Typography Group
    const typoSets = allRawSetKeys.filter(
      (s) =>
        typeof s === "string" &&
        (s.toLowerCase().includes("typography") ||
          s.toLowerCase().includes("font") ||
          s.toLowerCase().includes("text"))
    );
    if (typoSets.length > 0) {
      groups.push({
        id: "grp-typography",
        name: "Typography",
        color: "#3b82f6",
        options: typoSets.map((s) => ({
          id: `opt-typo-${s}`,
          name: s.split(/[/.]/).pop() || s,
          group: "Typography",
          selectedTokenSets: { [s]: "enabled" },
          color: "#3b82f6",
        })),
      });
    }

    // Brands Group
    const brandSets = allRawSetKeys.filter(
      (s) => typeof s === "string" && s.toLowerCase().includes("brand")
    );
    if (brandSets.length > 0) {
      groups.push({
        id: "grp-brands",
        name: "Brand",
        color: "#ef4444",
        options: brandSets.map((b) => ({
          id: `opt-brand-${b}`,
          name: b.split(/[/.]/).pop() || b,
          group: "Brand",
          selectedTokenSets: { [b]: "enabled" },
          color: "#a855f7",
        })),
      });
    }

    if (groups.length === 0 && allRawSetKeys.length > 0) {
      groups.push({
        id: "grp-default",
        name: "Theme",
        color: "#f97316",
        options: allRawSetKeys.map((setName, idx) => ({
          id: `opt-${setName}`,
          name: String(setName).toUpperCase(),
          group: "Theme",
          selectedTokenSets: { [setName]: "enabled" },
          color: GROUP_PALETTE[idx % GROUP_PALETTE.length],
        })),
      });
    }
  }

  return groups;
}

export type TokenCategory =
  | "color"
  | "typography"
  | "spacing"
  | "sizing"
  | "borderRadius"
  | "boxShadow"
  | "opacity"
  | "other";

export function getCategoryForType(type: TokenType | string | any): TokenCategory {
  const t = typeof type === "string" ? type.toLowerCase() : String(type || "").toLowerCase();
  if (t === "color" || t === "colors") return "color";
  if (
    t === "typography" ||
    t === "fontfamilies" ||
    t === "fontweights" ||
    t === "fontsizes" ||
    t === "lineheights" ||
    t === "letterspacing" ||
    t === "paragraphspacing" ||
    t === "textcase" ||
    t === "textdecoration"
  ) {
    return "typography";
  }
  if (t === "spacing" || t === "space") return "spacing";
  if (t === "sizing" || t === "size" || t === "dimension" || t === "dimensions") return "sizing";
  if (t === "borderradius" || t === "radius" || t === "radii" || t === "borderwidth" || t === "border") return "borderRadius";
  if (t === "boxshadow" || t === "shadow") return "boxShadow";
  if (t === "opacity") return "opacity";
  return "other";
}

export const CATEGORY_ORDER: TokenCategory[] = [
  "color",
  "typography",
  "spacing",
  "sizing",
  "borderRadius",
  "boxShadow",
  "opacity",
  "other",
];

export const CATEGORY_LABELS: Record<TokenCategory, { label: string; countLabel: string }> = {
  color: { label: "Color", countLabel: "colors" },
  typography: { label: "Typography", countLabel: "typography" },
  spacing: { label: "Spacing", countLabel: "spacing" },
  sizing: { label: "Sizing", countLabel: "sizing" },
  borderRadius: { label: "Border & Radius", countLabel: "radius" },
  boxShadow: { label: "Shadow", countLabel: "shadows" },
  opacity: { label: "Opacity", countLabel: "opacity" },
  other: { label: "Other", countLabel: "other" },
};

export interface MatrixCellData {
  rawValue: string;
  resolvedValue: string;
  isAlias: boolean;
  tokenPath: string[]; // e.g. ["dark", "color", "semantic", "bg", "brandStrong"]
  setName: string;
}

export interface MatrixRowData {
  tokenKey: string; // e.g. "body.body1.dl-400" or "color.semantic.bg.brandStrong"
  type: TokenType;
  group: string;
  category: TokenCategory;
  cells: Record<string, MatrixCellData | undefined>; // optionName -> CellData
}

/**
 * Finds a token node by path segments in an object tree with flexible root wrapper handling
 */
function findNodeByPath(tree: any, pathSegments: string[], setName?: string): any {
  if (!tree || typeof tree !== "object" || !pathSegments || pathSegments.length === 0) return undefined;

  // 1. Direct path traversal
  let curr = tree;
  let directMatch = true;
  for (const seg of pathSegments) {
    if (!curr || typeof curr !== "object" || curr[seg] === undefined) {
      directMatch = false;
      break;
    }
    curr = curr[seg];
  }
  if (directMatch && isTokenLeaf(curr)) {
    return curr;
  }

  // 2. If tree has a root wrapper matching setName (e.g. tree["dark"][...pathSegments])
  if (setName) {
    const lastSeg = setName.split("/").pop()?.replace(/\.json$/i, "") || setName;
    if (tree[lastSeg] && typeof tree[lastSeg] === "object") {
      const matched = findNodeByPath(tree[lastSeg], pathSegments);
      if (isTokenLeaf(matched)) return matched;
    }
    if (tree[setName] && typeof tree[setName] === "object") {
      const matched = findNodeByPath(tree[setName], pathSegments);
      if (isTokenLeaf(matched)) return matched;
    }
  }

  // 3. Check if first segment of pathSegments is a root wrapper not present in this tree
  if (pathSegments.length > 1) {
    let subCurr = tree;
    let subMatch = true;
    for (let i = 1; i < pathSegments.length; i++) {
      const seg = pathSegments[i];
      if (!subCurr || typeof subCurr !== "object" || subCurr[seg] === undefined) {
        subMatch = false;
        break;
      }
      subCurr = subCurr[seg];
    }
    if (subMatch && isTokenLeaf(subCurr)) return subCurr;
  }

  return undefined;
}

/**
 * Builds rows for the active Theme Group matrix.
 * Accurately scopes tokens to the token sets that belong to the active Theme Group.
 */
/**
 * Builds rows for the active Theme Group matrix.
 * Accurately scopes tokens to the token sets that belong to the active Theme Group (including source foundation sets).
 */
export function buildThemeMatrix(
  rawDoc: RawTokensDocument,
  group: ThemeGroup
): MatrixRowData[] {
  if (!rawDoc || !group || group.options.length === 0) return [];

  // 1. Resolve enabled and source token set trees for each option in this group
  const optionSetsMap = new Map<
    string,
    {
      enabledSets: Array<{ setName: string; setTree: any }>;
      sourceSets: Array<{ setName: string; setTree: any }>;
    }
  >();

  // Collect all sets relevant to this theme group
  const groupSetKeys = new Set<string>();

  group.options.forEach((option) => {
    const enabledSets: Array<{ setName: string; setTree: any }> = [];
    const sourceSets: Array<{ setName: string; setTree: any }> = [];

    const selected = option.selectedTokenSets || {};
    const selectedEntries = Object.entries(selected);

    if (selectedEntries.length > 0) {
      selectedEntries.forEach(([setName, status]) => {
        const matches = findSetsInDoc(setName, rawDoc);
        matches.forEach((matched) => {
          // Include both enabled and source sets so Foundation & Alias tokens are visible in matrix
          groupSetKeys.add(matched.actualKey);
          if (status === "enabled") {
            enabledSets.push({ setName: matched.actualKey, setTree: matched.setTree });
          } else if (status === "source") {
            sourceSets.push({ setName: matched.actualKey, setTree: matched.setTree });
          }
        });
      });
    } else {
      // Fallback only if NO selectedTokenSets was configured at all in $themes.json
      const optionName = String(option?.name || "");
      const groupName = String(group?.name || "");
      const matches = optionName ? findSetsInDoc(optionName, rawDoc) : [];
      const fallbackMatches = matches.length > 0 ? matches : (groupName ? findSetsInDoc(groupName, rawDoc) : []);
      fallbackMatches.forEach((matched) => {
        groupSetKeys.add(matched.actualKey);
        enabledSets.push({ setName: matched.actualKey, setTree: matched.setTree });
      });
    }

    optionSetsMap.set(String(option?.name || ""), { enabledSets, sourceSets });
  });

  if (groupSetKeys.size === 0) {
    return [];
  }

  const setsToScanKeys = Array.from(groupSetKeys);

  // 2. Gather unique token keys from the sets belonging to this Theme Group
  const groupTokensMap = new Map<
    string,
    { type: TokenType; group: string; pathSegments: string[] }
  >();

  setsToScanKeys.forEach((setName) => {
    const setTree = rawDoc[setName];
    if (!setTree || typeof setTree !== "object") return;

    const collectKeys = (node: any, currentPath: string[]) => {
      if (!node || typeof node !== "object") return;

      if (isTokenLeaf(node)) {
        // Strip leading set name wrapper if setTree wrapped tokens with set name
        let logicalPath = currentPath;
        const normSet = normalizeName(setName);
        const firstSegNorm = currentPath.length > 1 ? normalizeName(currentPath[0]) : "";
        if (
          firstSegNorm &&
          (firstSegNorm === normSet ||
            normSet.endsWith(`.${firstSegNorm}`) ||
            firstSegNorm === normalizeName(setName.split("/").pop() || ""))
        ) {
          logicalPath = currentPath.slice(1);
        }

        const tokenKey = logicalPath.join(".");
        if (!groupTokensMap.has(tokenKey)) {
          groupTokensMap.set(tokenKey, {
            type: getLeafType(node, logicalPath),
            group: logicalPath[0] || "general",
            pathSegments: logicalPath,
          });
        }
        return;
      }

      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith("$")) continue;
        collectKeys(child, [...currentPath, key]);
      }
    };

    collectKeys(setTree, []);
  });

  // 3. For each token, populate cells for each option in this group from its enabled sets (or source sets)
  const rows: MatrixRowData[] = [];

  groupTokensMap.forEach(({ type, group: tokenGroup, pathSegments }, tokenKey) => {
    const cells: Record<string, MatrixCellData | undefined> = {};

    group.options.forEach((option) => {
      const sets = optionSetsMap.get(option.name);
      let foundLeaf: any = undefined;
      let foundSetName: string = "";

      const targetSets = [
        ...(sets?.enabledSets || []),
        ...(sets?.sourceSets || []),
      ];

      for (const { setName, setTree } of targetSets) {
        const node = findNodeByPath(setTree, pathSegments, setName);
        if (isTokenLeaf(node)) {
          foundLeaf = node;
          foundSetName = setName;
          break;
        }
      }

      if (foundLeaf) {
        const rawValue = getLeafValue(foundLeaf);
        // Alias resolution uses rawDoc (which includes all source sets in the background)
        const resolvedValue = resolveTokenAlias(rawValue, rawDoc, foundSetName);
        const isAlias = typeof rawValue === "string" && /\{[^}]+\}/.test(rawValue);

        cells[option.name] = {
          rawValue,
          resolvedValue,
          isAlias,
          tokenPath: [foundSetName, ...pathSegments],
          setName: foundSetName,
        };
      }
    });

    rows.push({
      tokenKey,
      type,
      group: tokenGroup,
      category: getCategoryForType(type),
      cells,
    });
  });

  // Sort rows naturally using numeric collation
  rows.sort((a, b) => naturalCompareTokenKeys(a.tokenKey, b.tokenKey));

  return rows;
}

// -------------------------------------------------------------
// MULTI-LEVEL TOKEN GROUP TREE DATA STRUCTURE & BUILDER
// -------------------------------------------------------------

export interface TokenGroupNode<T> {
  id: string; // unique identifier (e.g. "grp-color", "grp-color.brand")
  name: string; // group segment name (e.g. "color", "brand")
  fullPath: string; // dot-separated group path (e.g. "color.brand")
  level: number; // 1 for Level 1, 2 for Level 2, 3 for Level 3, 4 for Level 4...
  totalTokenCount: number;
  subgroups: TokenGroupNode<T>[];
  items: T[]; // leaf token items belonging directly to this group level
}

/**
 * Builds an N-level recursive hierarchical group tree from flat token items.
 * Supports 1-level, 2-level, 3-level, 4-level and deeper groups.
 * Applies natural numeric sorting at each level.
 */
export function buildTokenGroupTree<T>(
  items: T[],
  getPathSegments: (item: T) => string[]
): TokenGroupNode<T>[] {
  const rootMap = new Map<string, any>();

  for (const item of items) {
    const rawSegments = getPathSegments(item).filter(Boolean);
    // If token key is "base.50" -> segments: ["base", "50"]. Group segments: ["base"]. Leaf: "50"
    // If token key is "color.brand.primary.hover" -> Group segments: ["color", "brand", "primary"]. Leaf: "hover"
    // If token key has only 1 segment (e.g. "spacing") -> Group: ["general"]. Leaf: "spacing"
    const groupSegments = rawSegments.length > 1 ? rawSegments.slice(0, rawSegments.length - 1) : ["general"];

    let currentMap = rootMap;
    let currentPath = "";

    for (let level = 1; level <= groupSegments.length; level++) {
      const seg = groupSegments[level - 1];
      currentPath = currentPath ? `${currentPath}.${seg}` : seg;

      if (!currentMap.has(seg)) {
        currentMap.set(seg, {
          id: `grp-${currentPath}`,
          name: seg,
          fullPath: currentPath,
          level,
          subgroupsMap: new Map<string, any>(),
          items: [] as T[],
        });
      }

      const node = currentMap.get(seg)!;
      if (level === groupSegments.length) {
        node.items.push(item);
      } else {
        currentMap = node.subgroupsMap;
      }
    }
  }

  function convertNode(rawNode: any): TokenGroupNode<T> {
    const subgroups: TokenGroupNode<T>[] = Array.from(rawNode.subgroupsMap.values())
      .map(convertNode)
      .sort((a, b) => naturalCompareTokenKeys(a.name, b.name));

    const sortedItems: T[] = (rawNode.items as T[]).sort((a: any, b: any) => {
      const pathA = getPathSegments(a).join(".");
      const pathB = getPathSegments(b).join(".");
      return naturalCompareTokenKeys(pathA, pathB);
    });

    const totalTokenCount = sortedItems.length + subgroups.reduce((acc, g) => acc + g.totalTokenCount, 0);

    return {
      id: rawNode.id,
      name: rawNode.name,
      fullPath: rawNode.fullPath,
      level: rawNode.level,
      totalTokenCount,
      subgroups,
      items: sortedItems,
    };
  }

  return Array.from(rootMap.values())
    .map(convertNode)
    .sort((a, b) => naturalCompareTokenKeys(a.name, b.name));
}

export interface SetTreeNode {
  id: string; // unique identifier (full path)
  name: string; // label (folder or file name)
  isFolder: boolean;
  fullPath: string; // actual set key or folder path
  children?: SetTreeNode[];
}

/**
 * Non-token JSON files or configs to ignore
 */
export const NON_TOKEN_PATTERNS = [
  "staticwebapp.config",
  "package-releases",
  "metadata",
  "package",
  "package-lock",
  "tsconfig",
  "jsconfig",
  "vercel",
  "project",
  "composer",
  "angular",
];

/**
 * Extracts the exact list of valid token sets defined by $metadata.json (tokenSetOrder),
 * $themes.json (selectedTokenSets), and any other valid token sets present in rawDoc.
 */
export function getValidTokenSetNames(rawDoc: RawTokensDocument): string[] {
  if (!rawDoc || typeof rawDoc !== "object") return [];

  const rawKeys = Object.keys(rawDoc).filter((k) => !k.startsWith("$"));
  const validOrdered: string[] = [];
  const visited = new Set<string>();

  // Helper to filter non-token keys
  const isValidTokenKey = (key: string): boolean => {
    const lower = String(key || "").toLowerCase();
    const fileName = lower.split("/").pop() || "";
    const baseName = fileName.replace(/\.json$/i, "");

    if (NON_TOKEN_PATTERNS.includes(baseName)) return false;
    if (
      lower.startsWith("apps/") ||
      lower.startsWith("assets/icons") ||
      lower.startsWith("assets/illustrations") ||
      lower.startsWith("assets/logos")
    ) {
      return false;
    }

    const val = rawDoc[key];
    return val !== null && typeof val === "object" && Object.keys(val).length > 0;
  };

  // 1. Check $metadata.json / $metadata for tokenSetOrder
  const meta = rawDoc["$metadata"] || rawDoc["$metadata.json"];
  if (meta && Array.isArray(meta.tokenSetOrder) && meta.tokenSetOrder.length > 0) {
    for (const declaredSet of meta.tokenSetOrder) {
      if (typeof declaredSet !== "string" || !declaredSet.trim()) continue;
      const match = findSetInDoc(declaredSet, rawDoc);
      if (match && !visited.has(match.actualKey)) {
        validOrdered.push(match.actualKey);
        visited.add(match.actualKey);
      } else if (!visited.has(declaredSet) && rawDoc[declaredSet]) {
        validOrdered.push(declaredSet);
        visited.add(declaredSet);
      }
    }
  }

  // 2. Check $themes.json / $themes for selectedTokenSets across all themes
  const themesRaw = rawDoc["$themes"] || rawDoc["$themes.json"];
  if (themesRaw && Array.isArray(themesRaw) && themesRaw.length > 0) {
    for (const theme of themesRaw) {
      if (theme && theme.selectedTokenSets && typeof theme.selectedTokenSets === "object") {
        for (const setName of Object.keys(theme.selectedTokenSets)) {
          const match = findSetInDoc(setName, rawDoc);
          if (match && !visited.has(match.actualKey)) {
            validOrdered.push(match.actualKey);
            visited.add(match.actualKey);
          } else if (rawDoc[setName] && !visited.has(setName)) {
            validOrdered.push(setName);
            visited.add(setName);
          }
        }
      }
    }
  }

  // 3. Append all remaining valid token sets in rawDoc
  for (const key of rawKeys) {
    if (!visited.has(key) && isValidTokenKey(key)) {
      validOrdered.push(key);
      visited.add(key);
    }
  }

  return validOrdered;
}

/**
 * Finds common directory prefix among paths to strip unnecessary wrapper folders in UI
 */
export function getCommonPathPrefix(paths: string[]): string {
  if (!paths || paths.length === 0) return "";
  const partsList = paths.map((p) => p.split("/").filter(Boolean));
  if (partsList.length === 0 || partsList[0].length <= 1) return "";

  const commonSegments: string[] = [];
  const firstParts = partsList[0];

  for (let i = 0; i < firstParts.length - 1; i++) {
    const seg = firstParts[i];
    const isCommon = partsList.every((parts) => parts.length > i + 1 && parts[i] === seg);
    if (isCommon) {
      commonSegments.push(seg);
    } else {
      break;
    }
  }

  return commonSegments.length > 0 ? commonSegments.join("/") + "/" : "";
}

/**
 * Builds a hierarchical folder tree from set names or a RawTokensDocument.
 */
export function buildSetFolderTree(
  setNamesOrDoc: string[] | RawTokensDocument
): SetTreeNode[] {
  let validSets: string[] = [];

  if (Array.isArray(setNamesOrDoc)) {
    validSets = setNamesOrDoc.filter((s) => !s.startsWith("$"));
  } else if (setNamesOrDoc && typeof setNamesOrDoc === "object") {
    validSets = getValidTokenSetNames(setNamesOrDoc);
  }

  const rootNodes: SetTreeNode[] = [];
  const folderMap = new Map<string, SetTreeNode>();

  // Determine common wrapper prefix if multiple sets exist
  const commonPrefix = getCommonPathPrefix(validSets);

  for (const fullKey of validSets) {
    // Strip common outer prefix for display while retaining fullKey for selection
    const displayPath = commonPrefix && fullKey.startsWith(commonPrefix)
      ? fullKey.slice(commonPrefix.length)
      : fullKey;

    const parts = displayPath.split("/").filter(Boolean);
    if (parts.length === 1) {
      rootNodes.push({
        id: fullKey,
        name: parts[0],
        isFolder: false,
        fullPath: fullKey,
      });
    } else {
      let currentPath = "";
      let currentParentList = rootNodes;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLeaf = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLeaf) {
          currentParentList.push({
            id: fullKey,
            name: part,
            isFolder: false,
            fullPath: fullKey,
          });
        } else {
          let folderNode = folderMap.get(currentPath);
          if (!folderNode) {
            folderNode = {
              id: currentPath,
              name: part,
              isFolder: true,
              fullPath: currentPath,
              children: [],
            };
            folderMap.set(currentPath, folderNode);
            currentParentList.push(folderNode);
          }
          currentParentList = folderNode.children!;
        }
      }
    }
  }

  return rootNodes;
}
