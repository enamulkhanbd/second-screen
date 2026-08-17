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
 * Finds a matching token set in rawDoc using flexible matching
 */
function findSetInDoc(setName: string, rawDoc: RawTokensDocument): { setTree: any; actualKey: string } | null {
  if (rawDoc[setName]) return { setTree: rawDoc[setName], actualKey: setName };

  const norm = normalizeName(setName);
  for (const [key, val] of Object.entries(rawDoc)) {
    if (key.startsWith("$")) continue;
    const normKey = normalizeName(key);
    if (
      normKey === norm ||
      normKey.endsWith(`.${norm}`) ||
      norm.endsWith(`.${normKey}`) ||
      normKey.split(".").pop() === norm.split(".").pop()
    ) {
      return { setTree: val, actualKey: key };
    }
  }

  return null;
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
    (s) => s.toLowerCase().includes("brand") || s.toLowerCase().includes("justgo")
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
        if (status === "enabled" || status === "source") {
          const matched = findSetInDoc(setName, rawDoc);
          if (matched) {
            groupSetKeys.add(matched.actualKey);
            if (status === "enabled") {
              enabledSets.push({ setName: matched.actualKey, setTree: matched.setTree });
            } else {
              sourceSets.push({ setName: matched.actualKey, setTree: matched.setTree });
            }
          }
        }
      });
    }

    // Fallback: If no sets specified in selectedTokenSets, match option name
    if (enabledSets.length === 0 && sourceSets.length === 0) {
      const matched = findSetInDoc(option.name, rawDoc) || findSetInDoc(group.name, rawDoc);
      if (matched) {
        groupSetKeys.add(matched.actualKey);
        enabledSets.push({ setName: matched.actualKey, setTree: matched.setTree });
      }
    }

    optionSetsMap.set(option.name, { enabledSets, sourceSets });
  });

  // If no specific sets matched for the group, look for sets containing the group name
  if (groupSetKeys.size === 0) {
    const groupNorm = normalizeName(group.name);
    for (const [setName, setTree] of Object.entries(rawDoc)) {
      if (setName.startsWith("$")) continue;
      const setNorm = normalizeName(setName);
      if (setNorm.includes(groupNorm) || groupNorm.includes(setNorm)) {
        groupSetKeys.add(setName);
      }
    }
  }

  // If still empty (e.g. general multi-set), include all sets
  const setsToScanKeys =
    groupSetKeys.size > 0
      ? Array.from(groupSetKeys)
      : Object.keys(rawDoc).filter((k) => !k.startsWith("$"));

  // 2. Gather unique token keys ONLY from the sets belonging to this Theme Group
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
            type: getLeafType(node, currentPath[0]),
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

  // 3. For each token, populate cells for each option in this group
  const rows: MatrixRowData[] = [];

  groupTokensMap.forEach(({ type, group: tokenGroup, pathSegments }, tokenKey) => {
    const cells: Record<string, MatrixCellData | undefined> = {};

    group.options.forEach((option) => {
      const sets = optionSetsMap.get(option.name);
      let foundLeaf: any = undefined;
      let foundSetName: string = "";

      // 1. Search in option's directly enabled sets
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

      // 2. Search in option's source sets
      if (!foundLeaf && sets?.sourceSets) {
        for (const { setName, setTree } of sets.sourceSets) {
          const node = findNodeByPath(setTree, pathSegments);
          if (isTokenLeaf(node)) {
            foundLeaf = node;
            foundSetName = setName;
            break;
          }
        }
      }

      // 3. If the token is defined in any set belonging to this group, use that
      if (!foundLeaf) {
        for (const setName of setsToScanKeys) {
          const node = findNodeByPath(rawDoc[setName], pathSegments);
          if (isTokenLeaf(node)) {
            foundLeaf = node;
            foundSetName = setName;
            break;
          }
        }
      }

      if (foundLeaf) {
        const rawValue = getLeafValue(foundLeaf);
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
      cells,
    });
  });

  // Sort rows alphabetically
  rows.sort((a, b) => a.tokenKey.localeCompare(b.tokenKey));

  return rows;
}
