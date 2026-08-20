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
 * Normalizes set names for comparison (strips leading/trailing slashes, dots, lowercase)
 */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/^[./\s]+|[./\s]+$/g, "").replace(/[/\\]/g, ".");
}

/**
 * Finds all matching token sets in rawDoc using flexible matching (e.g. exact key, suffix, path segments, folder matching)
 */
export function findSetsInDoc(
  setName: string,
  rawDoc: RawTokensDocument
): Array<{ setTree: any; actualKey: string }> {
  if (!rawDoc || typeof rawDoc !== "object") return [];

  const results: Array<{ setTree: any; actualKey: string }> = [];
  const visitedKeys = new Set<string>();

  // 1. Direct exact key match
  if (rawDoc[setName]) {
    results.push({ setTree: rawDoc[setName], actualKey: setName });
    visitedKeys.add(setName);
  }

  const norm = normalizeName(setName);

  for (const [key, val] of Object.entries(rawDoc)) {
    if (key.startsWith("$") || visitedKeys.has(key)) continue;
    const normKey = normalizeName(key);

    if (
      normKey === norm ||
      normKey.endsWith(`.${norm}`) ||
      norm.endsWith(`.${normKey}`) ||
      normKey.includes(`.${norm}.`) ||
      normKey.startsWith(`${norm}.`) ||
      normKey.includes(`.${norm}`) ||
      norm.includes(`.${normKey}`)
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
 */
export function extractThemeGroups(rawDoc: RawTokensDocument): ThemeGroup[] {
  if (!rawDoc || typeof rawDoc !== "object") return [];

  // 1. Check if $themes.json exists in rawDoc (or $themes)
  const themesRaw = rawDoc["$themes"] || rawDoc["$themes.json"];
  if (themesRaw && Array.isArray(themesRaw) && themesRaw.length > 0) {
    const groupMap = new Map<string, ThemeOption[]>();

    themesRaw.forEach((item: any, idx: number) => {
      const groupName = item.group || "Theme";
      const option: ThemeOption = {
        id: item.id || `opt-${idx}`,
        name: item.name || `Option ${idx + 1}`,
        group: groupName,
        selectedTokenSets: item.selectedTokenSets || {},
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
    return Array.from(groupMap.entries()).map(([name, options]) => ({
      id: `grp-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      color: GROUP_PALETTE[colorIdx++ % GROUP_PALETTE.length],
      options,
    }));
  }

  // 2. Fallback: Infer Theme Groups from existing token sets
  const setNames = Object.keys(rawDoc).filter((k) => !k.startsWith("$"));

  const hasDark = setNames.some((s) => s.toLowerCase().includes("dark"));
  const hasLight = setNames.some((s) => s.toLowerCase().includes("light"));

  const groups: ThemeGroup[] = [];

  // Theme / Mode Group (Dark / Light)
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
  const typoSets = setNames.filter(
    (s) =>
      s.toLowerCase().includes("typography") ||
      s.toLowerCase().includes("font") ||
      s.toLowerCase().includes("text")
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
  const brandSets = setNames.filter(
    (s) => s.toLowerCase().includes("brand")
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

  if (groups.length === 0 && setNames.length > 0) {
    groups.push({
      id: "grp-default",
      name: "Theme",
      color: "#f97316",
      options: setNames.map((setName, idx) => ({
        id: `opt-${setName}`,
        name: setName.toUpperCase(),
        group: "Theme",
        selectedTokenSets: { [setName]: "enabled" },
        color: GROUP_PALETTE[idx % GROUP_PALETTE.length],
      })),
    });
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

export function getCategoryForType(type: TokenType | string): TokenCategory {
  const t = (type || "").toLowerCase();
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
 * Finds a token node by path segments in an object tree
 */
function findNodeByPath(tree: any, pathSegments: string[]): any {
  let curr = tree;
  for (const seg of pathSegments) {
    if (!curr || typeof curr !== "object") return undefined;
    curr = curr[seg];
  }
  return curr;
}

/**
 * Builds rows for the active Theme Group matrix.
 * Accurately scopes tokens to the token sets that belong to the active Theme Group.
 */
export function buildThemeMatrix(
  rawDoc: RawTokensDocument,
  group: ThemeGroup
): MatrixRowData[] {
  if (!rawDoc || !group || group.options.length === 0) return [];

  // 1. Resolve enabled token set trees for each option in this group
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
          if (status === "enabled") {
            // ONLY enabled sets define the token rows shown in the Theme Matrix
            groupSetKeys.add(matched.actualKey);
            enabledSets.push({ setName: matched.actualKey, setTree: matched.setTree });
          } else if (status === "source") {
            // Source sets act strictly in the background for alias/reference lookup
            sourceSets.push({ setName: matched.actualKey, setTree: matched.setTree });
          }
        });
      });
    } else {
      // Fallback only if NO selectedTokenSets was configured at all in $themes.json
      const matches = findSetsInDoc(option.name, rawDoc);
      const fallbackMatches = matches.length > 0 ? matches : findSetsInDoc(group.name, rawDoc);
      fallbackMatches.forEach((matched) => {
        groupSetKeys.add(matched.actualKey);
        enabledSets.push({ setName: matched.actualKey, setTree: matched.setTree });
      });
    }

    optionSetsMap.set(option.name, { enabledSets, sourceSets });
  });

  // If no enabled sets were specified for this group, matrix is empty (do not scan source sets)
  if (groupSetKeys.size === 0) {
    return [];
  }

  const setsToScanKeys = Array.from(groupSetKeys);

  // 2. Gather unique token keys ONLY from the enabled sets belonging to this Theme Group
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
        const tokenKey = currentPath.join(".");
        if (!groupTokensMap.has(tokenKey)) {
          groupTokensMap.set(tokenKey, {
            type: getLeafType(node, currentPath),
            group: currentPath[0] || "general",
            pathSegments: currentPath,
          });
        }
        return;
      }

      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith("$") && key !== "$value" && key !== "$type") continue;
        collectKeys(child, [...currentPath, key]);
      }
    };

    collectKeys(setTree, []);
  });

  // 3. For each token, populate cells for each option in this group from its enabled sets
  const rows: MatrixRowData[] = [];

  groupTokensMap.forEach(({ type, group: tokenGroup, pathSegments }, tokenKey) => {
    const cells: Record<string, MatrixCellData | undefined> = {};

    group.options.forEach((option) => {
      const sets = optionSetsMap.get(option.name);
      let foundLeaf: any = undefined;
      let foundSetName: string = "";

      // Search exclusively in the option's enabled token sets
      if (sets?.enabledSets) {
        for (const { setName, setTree } of sets.enabledSets) {
          const node = findNodeByPath(setTree, pathSegments);
          if (isTokenLeaf(node)) {
            foundLeaf = node;
            foundSetName = setName;
            break;
          }
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

  // Sort rows alphabetically
  rows.sort((a, b) => a.tokenKey.localeCompare(b.tokenKey));

  return rows;
}

export interface SetTreeNode {
  id: string; // unique identifier (full path)
  name: string; // label (folder or file name)
  isFolder: boolean;
  fullPath: string; // actual set key or folder path
  children?: SetTreeNode[];
}

/**
 * Builds a hierarchical folder tree from flat set names using "/" delimiters.
 * e.g. ["comp/button", "comp/toggle", "global", "pattern/feature"]
 */
export function buildSetFolderTree(setNames: string[]): SetTreeNode[] {
  const rootNodes: SetTreeNode[] = [];
  const folderMap = new Map<string, SetTreeNode>();

  // Filter out system files like $themes, $metadata
  const validSets = setNames
    .filter((s) => !s.startsWith("$"))
    .sort((a, b) => a.localeCompare(b));

  for (const setName of validSets) {
    const parts = setName.split("/").filter(Boolean);
    if (parts.length === 1) {
      // Root leaf set (e.g. "global", "semantic")
      rootNodes.push({
        id: setName,
        name: parts[0],
        isFolder: false,
        fullPath: setName,
      });
    } else {
      // Nested set in folder(s) (e.g. "comp/button", "pattern/feature")
      let currentPath = "";
      let currentParentList = rootNodes;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLeaf = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLeaf) {
          currentParentList.push({
            id: currentPath,
            name: part,
            isFolder: false,
            fullPath: setName,
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
