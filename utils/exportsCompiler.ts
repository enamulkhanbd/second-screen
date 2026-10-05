import JSZip from "jszip";
import { FlattenedToken, RawTokensDocument, ThemeGroup, TokenType } from "@/types/tokens";
import {
  CssExportConfig,
  ScssExportConfig,
  TypeScriptExportConfig,
  GeneratedExportFile,
  FigmaCreationOrderItem,
  ColorSpaceOption,
  CasingOption,
} from "@/types/exports";
import { readDeprecation, buildDeprecationNode } from "./tokenDeprecation";

// ============================================================================
// Helper Utilities
// ============================================================================

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseHexToRgb(hex: string): { r: number; g: number; b: number; a: number } | null {
  let clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length === 6) {
    clean += "ff";
  }
  if (clean.length !== 8) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 24) & 255,
    g: (num >> 16) & 255,
    b: (num >> 8) & 255,
    a: ((num & 255) / 255),
  };
}

export function formatColorValue(val: string, colorSpace: ColorSpaceOption): string {
  if (!val || typeof val !== "string" || colorSpace === "as-authored") return val;
  const trimmed = val.trim();

  if (!trimmed.startsWith("#") && !trimmed.startsWith("rgb")) {
    return trimmed;
  }

  const rgb = parseHexToRgb(trimmed);
  if (!rgb) return trimmed;

  const rNorm = +(rgb.r / 255).toFixed(4);
  const gNorm = +(rgb.g / 255).toFixed(4);
  const bNorm = +(rgb.b / 255).toFixed(4);

  switch (colorSpace) {
    case "hex":
      return trimmed.startsWith("#")
        ? trimmed
        : `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g.toString(16).padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}`;

    case "srgb":
      return rgb.a < 1
        ? `color(srgb ${rNorm} ${gNorm} ${bNorm} / ${rgb.a.toFixed(2)})`
        : `color(srgb ${rNorm} ${gNorm} ${bNorm})`;

    case "display-p3":
      return rgb.a < 1
        ? `color(display-p3 ${rNorm} ${gNorm} ${bNorm} / ${rgb.a.toFixed(2)})`
        : `color(display-p3 ${rNorm} ${gNorm} ${bNorm})`;

    case "hsl": {
      const r = rgb.r / 255;
      const g = rgb.g / 255;
      const b = rgb.b / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      const hDeg = Math.round(h * 360);
      const sPct = Math.round(s * 100);
      const lPct = Math.round(l * 100);
      return rgb.a < 1
        ? `hsl(${hDeg} ${sPct}% ${lPct}% / ${rgb.a.toFixed(2)})`
        : `hsl(${hDeg} ${sPct}% ${lPct}%)`;
    }

    case "oklch": {
      const lApprox = +(0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm).toFixed(3);
      const chromaApprox = +(
        Math.sqrt(Math.pow(rNorm - gNorm, 2) + Math.pow(gNorm - bNorm, 2)) * 0.4
      ).toFixed(3);
      return rgb.a < 1
        ? `oklch(${lApprox} ${chromaApprox} 240 / ${rgb.a.toFixed(2)})`
        : `oklch(${lApprox} ${chromaApprox} 240)`;
    }

    default:
      return trimmed;
  }
}

export function transformCasing(
  name: string,
  casing: CasingOption | "camel" | "constant" | "pascal" | "snake" | "kebab",
  separator: string = "-"
): string {
  if (casing === "as-authored") return name;
  const parts = name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return name;

  switch (casing) {
    case "camel":
      return parts
        .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
        .join("");
    case "pascal":
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("");
    case "snake":
      return parts.map((p) => p.toLowerCase()).join("_");
    case "constant":
      return parts.map((p) => p.toUpperCase()).join("_");
    case "kebab":
    default:
      return parts.map((p) => p.toLowerCase()).join(separator || "-");
  }
}

export function tokenToVarName(
  tokenName: string,
  prefix: string,
  casing: CasingOption,
  separator: string = "-",
  symbol: "--" | "$" = "--"
): string {
  const base = transformCasing(tokenName, casing, separator);
  const cleanPrefix = prefix.trim().replace(/^[-_$]+|[-_$]+$/g, "");
  if (cleanPrefix) {
    const formattedPrefix =
      casing === "constant"
        ? cleanPrefix.toUpperCase()
        : casing === "pascal" || casing === "camel"
        ? cleanPrefix.toLowerCase()
        : cleanPrefix.toLowerCase();
    const joined = `${formattedPrefix}${separator}${base}`;
    return `${symbol}${joined}`;
  }
  return `${symbol}${base}`;
}

/**
 * Extracts folder and file base name from token setName
 * e.g. "Alias/Color" -> { folder: "Alias", fileBase: "Color" }
 * e.g. "Mode/Dark"  -> { folder: "Mode",  fileBase: "Dark" }
 * e.g. "Brand/JustGo" -> { folder: "Brand", fileBase: "JustGo" }
 */
function parseSetPath(setName: string): { folder: string; fileBase: string } {
  const clean = setName.trim().replace(/^[./\\]+|[./\\]+$/g, "");
  if (clean.includes("/") || clean.includes("\\")) {
    const parts = clean.split(/[/\\]+/);
    return {
      folder: parts[0] || "Root",
      fileBase: parts.slice(1).join(".") || parts[0],
    };
  }

  // Common conventions
  const lower = clean.toLowerCase();
  if (lower.includes("dark") || lower.includes("light") || lower === "mode") {
    return { folder: "Mode", fileBase: clean.charAt(0).toUpperCase() + clean.slice(1) };
  }
  if (lower.includes("brand")) {
    return { folder: "Brand", fileBase: clean.charAt(0).toUpperCase() + clean.slice(1) };
  }
  if (lower.includes("alias") || lower.includes("semantic")) {
    return { folder: "Alias", fileBase: clean.charAt(0).toUpperCase() + clean.slice(1) };
  }
  if (lower.includes("foundation") || lower === "global" || lower === "base") {
    return { folder: "Foundation", fileBase: clean === "global" || clean === "base" ? "Color" : clean };
  }

  return { folder: "Root", fileBase: clean };
}

// ============================================================================
// CSS Variables Generator
// ============================================================================

export function generateCssExportFiles(
  tokens: FlattenedToken[],
  themeGroups: ThemeGroup[],
  config: CssExportConfig
): GeneratedExportFile[] {
  const files: GeneratedExportFile[] = [];

  // Group tokens by set
  const setMap = new Map<string, FlattenedToken[]>();
  tokens.forEach((t) => {
    const s = t.setName || "global";
    const list = setMap.get(s) || [];
    list.push(t);
    setMap.set(s, list);
  });

  const indent = config.minify ? "" : "  ";
  const nl = config.minify ? "" : "\n";
  const space = config.minify ? "" : " ";

  const formatDeclaration = (t: FlattenedToken): string => {
    const varName = tokenToVarName(t.name, config.prefix, config.casing, config.separator, "--");

    let val = "";
    // Check if token has an alias target e.g. {white} or {scale.fuchsia.100}
    const raw = String(t.rawValue || "");
    if (t.isAlias || raw.startsWith("{") || raw.startsWith("$")) {
      let targetName = t.aliasTarget || raw.replace(/^[{}$]+|[}]+$/g, "");
      const targetVar = tokenToVarName(targetName, config.prefix, config.casing, config.separator, "--");
      val = `var(${targetVar})`;
    } else {
      val = t.resolvedValue || raw;
      if (t.type === "color") {
        val = formatColorValue(val, config.colorSpace);
      }
    }

    let comment = "";
    if (!config.minify) {
      if (config.sourceComments && t.setName) {
        comment = ` /* [${t.setName}] */`;
      }
      if (config.descriptionComments && t.description) {
        comment += ` /* ${t.description.replace(/\*\//g, "* /")} */`;
      }
      if (config.deprecationComments && t.deprecated) {
        const parts = [
          t.deprecatedMessage,
          t.deprecatedReplacement ? `use ${t.deprecatedReplacement}` : "",
          t.deprecatedRemoveAfter ? `remove after ${t.deprecatedRemoveAfter}` : "",
        ]
          .filter(Boolean)
          .join(". ")
          .replace(/\*\//g, "* /");
        comment += ` /* @deprecated${parts ? `: ${parts}` : ""} */`;
      }
    }
    return `${indent}${varName}:${space}${val};${comment}`;
  };

  // Declarations grouped by first name segment: bg, icon, text, border...
  const buildGroupedDeclarations = (list: FlattenedToken[]): string => {
    const byGroup = new Map<string, FlattenedToken[]>();
    list.forEach((t) => {
      const key = String(t.name || "").split(".")[0] || "other";
      const arr = byGroup.get(key) || [];
      arr.push(t);
      byGroup.set(key, arr);
    });
    const groupNames = Array.from(byGroup.keys()).sort((a, b) => a.localeCompare(b));
    const lines: string[] = [];
    groupNames.forEach((g) => {
      if (!config.minify) lines.push(`${indent}/* ${g} */`);
      const items = byGroup
        .get(g)!
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      items.forEach((t) => lines.push(formatDeclaration(t)));
    });
    return lines.join(nl);
  };

  const wrapInLayer = (content: string): string => {
    if (!config.layerEnabled) return content;
    const lName = config.layerName.trim() || "tokens";
    if (config.minify) {
      return `@layer ${lName}{${content}}`;
    }
    return `@layer ${lName} {\n${content}\n}\n`;
  };

  // SINGLE FILE MODE
  if (config.fileLayout === "single") {
    let css = "";
    const rootBlock = `${config.rootSelector}${space}{${nl}${buildGroupedDeclarations(tokens)}${nl}}`;
    css += rootBlock;
    const finalContent = wrapInLayer(css);
    const fname = config.baseFileName || "tokens.css";
    files.push({
      id: "css-single",
      name: fname,
      path: fname,
      content: finalContent,
      language: "css",
      tokenCount: tokens.length,
      sizeFormatted: formatFileSize(new Blob([finalContent]).size),
    });
    return files;
  }

  // SPLIT FILE MODE (Matches video frame_020.jpg)
  // Each set produces a file in its folder e.g. Alias/Color.css, Brand/JustGo.css, etc.
  Array.from(setMap.entries()).forEach(([setName, setTokens]) => {
    const { folder, fileBase } = parseSetPath(setName);
    const fileName = `${fileBase}.css`;
    const relPath = `${folder}/${fileName}`;

    let selector = config.rootSelector;
    if (folder === "Mode") {
      const modeName = fileBase.toLowerCase();
      selector = config.themeGroups[0]?.strategy === "class"
        ? `.${modeName}`
        : `[data-theme="${fileBase}"]`;
    }

    const decls = buildGroupedDeclarations(setTokens);
    const content = wrapInLayer(`${selector}${space}{${nl}${decls}${nl}}`);

    files.push({
      id: `css-set-${setName}`,
      name: fileName,
      path: relPath,
      folder,
      content,
      language: "css",
      tokenCount: setTokens.length,
      sizeFormatted: formatFileSize(new Blob([content]).size),
    });
  });

  return files;
}

// ============================================================================
// SCSS Variables Generator
// ============================================================================

export function generateScssExportFiles(
  tokens: FlattenedToken[],
  themeGroups: ThemeGroup[],
  config: ScssExportConfig
): GeneratedExportFile[] {
  const files: GeneratedExportFile[] = [];

  const setMap = new Map<string, FlattenedToken[]>();
  tokens.forEach((t) => {
    const s = t.setName || "global";
    const list = setMap.get(s) || [];
    list.push(t);
    setMap.set(s, list);
  });

  const formatScssVal = (t: FlattenedToken): string => {
    let val = t.resolvedValue || t.rawValue || "";
    if (t.type === "color") {
      val = formatColorValue(val, config.colorSpace);
    }
    return typeof val === "string" && (val.includes(" ") || val.includes(",")) ? `"${val}"` : val;
  };

  // Generate nested $options map matching frame_135.jpg
  const generateScssMapContent = (tokenList: FlattenedToken[]): string => {
    let out = `// Auto-generated by Tokens Studio - do not edit manually.\n\n`;
    out += `$options: (\n`;

    // Group tokens by group (e.g. 'base', 'complementary', 'neutral', 'sys')
    const grouped = new Map<string, FlattenedToken[]>();
    tokenList.forEach((t) => {
      const parts = t.name.split(".");
      const grp = parts.length > 1 ? parts[0] : "general";
      const list = grouped.get(grp) || [];
      list.push(t);
      grouped.set(grp, list);
    });

    grouped.forEach((items, grp) => {
      out += `  '${grp}': (\n`;
      items.forEach((t) => {
        const parts = t.name.split(".");
        const subName = parts.length > 1 ? parts.slice(1).join("-") : parts[0];
        const val = formatScssVal(t);
        out += `    '${subName}': ${val},\n`;
      });
      out += `  ),\n`;
    });

    out += `);\n`;
    return out;
  };

  // Partials for each set: _Color.scss, _BritishGymnastic.scss, etc.
  Array.from(setMap.entries()).forEach(([setName, setTokens]) => {
    const { folder, fileBase } = parseSetPath(setName);
    const fileName = `_${fileBase}.scss`;
    const relPath = `${folder}/${fileName}`;
    const code = generateScssMapContent(setTokens);

    files.push({
      id: `scss-${setName}`,
      name: fileName,
      path: relPath,
      folder,
      content: code,
      language: "scss",
      tokenCount: setTokens.length,
      sizeFormatted: formatFileSize(new Blob([code]).size),
    });
  });

  // Root folder partials: _functions.scss, index.scss
  const funcCode = `// Helper function to query token values\n@function token($group, $key) {\n  @return map-get(map-get($options, $group), $key);\n}\n`;
  files.push({
    id: "scss-functions",
    name: "_functions.scss",
    path: "Root/_functions.scss",
    folder: "Root",
    content: funcCode,
    language: "scss",
    tokenCount: 0,
    sizeFormatted: formatFileSize(new Blob([funcCode]).size),
  });

  let indexCode = `// Master Sass entry point\n`;
  files.forEach((f) => {
    if (f.name !== "index.scss") {
      indexCode += `@forward "${f.path.replace(/\.scss$/, "")}";\n`;
    }
  });

  files.push({
    id: "scss-index",
    name: "index.scss",
    path: "Root/index.scss",
    folder: "Root",
    content: indexCode,
    language: "scss",
    tokenCount: tokens.length,
    sizeFormatted: formatFileSize(new Blob([indexCode]).size),
  });

  return files;
}

// ============================================================================
// TypeScript & npm Package Generator (frame_165.jpg)
// ============================================================================

export function generateTypeScriptExportFiles(
  tokens: FlattenedToken[],
  themeGroups: ThemeGroup[],
  config: TypeScriptExportConfig,
  projectName: string = "tokens"
): GeneratedExportFile[] {
  const files: GeneratedExportFile[] = [];

  // 1. __meta__.ts / cjs / d.ts
  const metaCodeTs = `// Auto-generated by Tokens Studio - do not edit manually.

export const __meta__ = {
  version: '0.0.0',
  schemaVersion: '1',
  generatedAt: '${new Date().toISOString()}',
  source: {
    commit: '',
    branch: '',
    url: '',
  },
} as const;
`;

  const metaCodeCjs = `// Auto-generated by Tokens Studio - do not edit manually.

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });

const __meta__ = {
  version: '0.0.0',
  schemaVersion: '1',
  generatedAt: '${new Date().toISOString()}',
  source: {
    commit: '',
    branch: '',
    url: '',
  },
};

exports.__meta__ = __meta__;
`;

  const metaCodeDts = `export declare const __meta__: {
  readonly version: '0.0.0';
  readonly schemaVersion: '1';
  readonly generatedAt: string;
  readonly source: {
    readonly commit: string;
    readonly branch: string;
    readonly url: string;
  };
};
`;

  files.push(
    { id: "ts-meta-cjs", name: "__meta__.cjs", path: "Root/__meta__.cjs", folder: "Root", content: metaCodeCjs, language: "javascript" },
    { id: "ts-meta-dts", name: "__meta__.d.ts", path: "Root/__meta__.d.ts", folder: "Root", content: metaCodeDts, language: "typescript" },
    { id: "ts-meta-ts", name: "__meta__.ts", path: "Root/__meta__.ts", folder: "Root", content: metaCodeTs, language: "typescript" }
  );

  // 2. colors.ts / cjs / d.ts
  const colorsTokens = tokens.filter((t) => t.type === "color");
  let colorsTs = `export const colors = {\n`;
  colorsTokens.forEach((t) => {
    colorsTs += `  "${t.name}": ${JSON.stringify(t.resolvedValue || t.rawValue)},\n`;
  });
  colorsTs += `} as const;\n\nexport type ColorToken = keyof typeof colors;\n`;

  let colorsCjs = `'use strict';\nObject.defineProperty(exports, '__esModule', { value: true });\n\nexports.colors = {\n`;
  colorsTokens.forEach((t) => {
    colorsCjs += `  "${t.name}": ${JSON.stringify(t.resolvedValue || t.rawValue)},\n`;
  });
  colorsCjs += `};\n`;

  let colorsDts = `export declare const colors: Record<string, string>;\nexport declare type ColorToken = string;\n`;

  files.push(
    { id: "ts-colors-cjs", name: "colors.cjs", path: "Root/colors.cjs", folder: "Root", content: colorsCjs, language: "javascript" },
    { id: "ts-colors-dts", name: "colors.d.ts", path: "Root/colors.d.ts", folder: "Root", content: colorsDts, language: "typescript" },
    { id: "ts-colors-ts", name: "colors.ts", path: "Root/colors.ts", folder: "Root", content: colorsTs, language: "typescript" }
  );

  // 3. index.ts / cjs / d.ts
  files.push(
    { id: "ts-index-cjs", name: "index.cjs", path: "Root/index.cjs", folder: "Root", content: `'use strict';\nObject.defineProperty(exports, '__esModule', { value: true });\nconst colors = require('./colors.cjs');\nconst meta = require('./__meta__.cjs');\nexports.colors = colors.colors;\nexports.__meta__ = meta.__meta__;\n`, language: "javascript" },
    { id: "ts-index-dts", name: "index.d.ts", path: "Root/index.d.ts", folder: "Root", content: `export * from './colors';\nexport * from './__meta__';\n`, language: "typescript" },
    { id: "ts-index-ts", name: "index.ts", path: "Root/index.ts", folder: "Root", content: `export * from './colors';\nexport * from './__meta__';\n`, language: "typescript" }
  );

  // 4. package.json
  const pkg = {
    name: config.metadata.packageName || `@acme/${projectName.toLowerCase()}`,
    version: config.metadata.version || "1.0.0",
    main: "./index.cjs",
    module: "./index.ts",
    types: "./index.d.ts",
    sideEffects: false,
  };
  const pkgStr = JSON.stringify(pkg, null, 2);
  files.push({
    id: "ts-package-json",
    name: "package.json",
    path: "Root/package.json",
    folder: "Root",
    content: pkgStr,
    language: "json",
  });

  // 5. selection.ts / cjs / d.ts
  files.push(
    { id: "ts-selection-cjs", name: "selection.cjs", path: "Root/selection.cjs", folder: "Root", content: `'use strict';\nexports.selection = {};\n`, language: "javascript" },
    { id: "ts-selection-dts", name: "selection.d.ts", path: "Root/selection.d.ts", folder: "Root", content: `export declare const selection: Record<string, any>;\n`, language: "typescript" },
    { id: "ts-selection-ts", name: "selection.ts", path: "Root/selection.ts", folder: "Root", content: `export const selection = {} as const;\n`, language: "typescript" }
  );

  return files;
}

// ============================================================================
// Raw JSON & DTCG JSON Generators (frame_195.jpg)
// ============================================================================

export function generateRawJsonExportFiles(rawTokens: RawTokensDocument): GeneratedExportFile[] {
  const files: GeneratedExportFile[] = [];

  Object.entries(rawTokens).forEach(([setName, setTree]) => {
    if (setName === "$themes" || setName === "$metadata") return;
    const { folder, fileBase } = parseSetPath(setName);
    const fileName = `${fileBase}.json`;
    const relPath = `${folder}/${fileName}`;
    const content = JSON.stringify(setTree, null, 2);

    files.push({
      id: `raw-set-${setName}`,
      name: fileName,
      path: relPath,
      folder,
      content,
      language: "json",
      tokenCount: typeof setTree === "object" ? Object.keys(setTree).length : 1,
      sizeFormatted: formatFileSize(new Blob([content]).size),
    });
  });

  return files;
}

export function generateDtcgExportFiles(rawTokens: RawTokensDocument): GeneratedExportFile[] {
  const files: GeneratedExportFile[] = [];

  const convertTreeToDtcg = (obj: any): any => {
    if (!obj || typeof obj !== "object") return obj;
    if (obj.value !== undefined) {
      const dtcgToken: any = {
        $value: obj.value,
        $type: obj.type || obj.$type || "color",
      };
      if (obj.description || obj.$description) {
        dtcgToken.$description = obj.description || obj.$description;
      }
      const deprecation = readDeprecation(obj, obj.$extensions?.["studio.tokens"]);
      if (deprecation) {
        dtcgToken.$deprecated = buildDeprecationNode(deprecation);
      }
      return dtcgToken;
    }

    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith("$") && k !== "$themes") {
        res[k] = v;
      } else {
        res[k] = convertTreeToDtcg(v);
      }
    }
    return res;
  };

  Object.entries(rawTokens).forEach(([setName, tree]) => {
    if (setName === "$themes" || setName === "$metadata") return;
    const { folder, fileBase } = parseSetPath(setName);
    const fileName = `${fileBase}.json`;
    const relPath = `${folder}/${fileName}`;
    const dtcgTree = convertTreeToDtcg(tree);
    const content = JSON.stringify(dtcgTree, null, 2);

    files.push({
      id: `dtcg-set-${setName}`,
      name: fileName,
      path: relPath,
      folder,
      content,
      language: "json",
      tokenCount: typeof tree === "object" ? Object.keys(tree).length : 1,
      sizeFormatted: formatFileSize(new Blob([content]).size),
    });
  });

  return files;
}

// ============================================================================
// Figma Variables Generator (frame_225.jpg)
// ============================================================================

export function generateFigmaVariablesExportFiles(
  resolvedTokens: FlattenedToken[],
  rawTokens: RawTokensDocument,
  themeGroups: ThemeGroup[]
): {
  files: GeneratedExportFile[];
  creationOrder: FigmaCreationOrderItem[];
  stats: { totalVars: number; permutations: number; collectionsCount: number };
} {
  const files: GeneratedExportFile[] = [];

  // Group tokens by collection: Alias, Brand, Foundation, Mode
  const collectionsMap = new Map<string, FlattenedToken[]>();
  resolvedTokens.forEach((t) => {
    const { folder } = parseSetPath(t.setName || "Foundation");
    const list = collectionsMap.get(folder) || [];
    list.push(t);
    collectionsMap.set(folder, list);
  });

  // Creation order items (simple slash format e.g. text/state/warning, bg/default)
  const creationOrder: FigmaCreationOrderItem[] = resolvedTokens.map((t, idx) => ({
    order: idx + 1,
    id: t.id,
    name: t.name.replace(/\./g, "/"),
    collection: parseSetPath(t.setName || "Foundation").folder,
    type: t.type,
    resolvedValue: t.resolvedValue || t.rawValue,
    isAlias: t.isAlias,
    aliasTarget: t.aliasTarget,
    dependencies: t.isAlias && t.aliasTarget ? [t.aliasTarget] : [],
  }));

  // Folder: Output (figma-variables.json)
  const figmaMaster = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    collections: Array.from(collectionsMap.entries()).map(([colName, list]) => ({
      name: colName,
      variables: list.map((t) => ({
        name: t.name.replace(/\./g, "/"),
        type: t.type === "color" ? "COLOR" : "FLOAT",
        value: t.resolvedValue || t.rawValue,
      })),
    })),
  };
  const masterJson = JSON.stringify(figmaMaster, null, 2);
  files.push({
    id: "figma-master",
    name: "figma-variables.json",
    path: "Output/figma-variables.json",
    folder: "Output",
    content: masterJson,
    language: "json",
    tokenCount: resolvedTokens.length,
    sizeFormatted: formatFileSize(new Blob([masterJson]).size),
  });

  // Folder: Collections (Alias.json, Brand.json, Foundation.json, Mode.json)
  Array.from(collectionsMap.entries()).forEach(([colName, list]) => {
    const modes = colName === "Mode" ? ["Dark", "Light"] : ["Default"];
    const colPayload = {
      id: colName,
      name: colName,
      modes,
      variables: Object.fromEntries(
        list.slice(0, 50).map((t) => {
          const varSlash = t.name.replace(/\./g, "/");
          return [
            varSlash,
            {
              type: t.type === "color" ? "color" : "dimension",
              figmaType: t.type === "color" ? "COLOR" : "FLOAT",
              description: t.description || null,
              modes: {
                ...(colName === "Mode"
                  ? {
                      Dark: {
                        value: { r: 0, g: 0, b: 0, a: 1, hex: "#000000" },
                        isAlias: t.isAlias,
                        aliasTarget: t.aliasTarget ? t.aliasTarget.replace(/\./g, "/") : undefined,
                        aliasTargetCollection: "Alias",
                      },
                      Light: {
                        value: { r: 1, g: 1, b: 1, a: 1, hex: "#ffffff" },
                        isAlias: t.isAlias,
                        aliasTarget: t.aliasTarget ? t.aliasTarget.replace(/\./g, "/") : undefined,
                        aliasTargetCollection: "Alias",
                      },
                    }
                  : {
                      Default: {
                        value: t.resolvedValue || t.rawValue,
                        isAlias: t.isAlias,
                        aliasTarget: t.aliasTarget ? t.aliasTarget.replace(/\./g, "/") : undefined,
                      },
                    }),
              },
            },
          ];
        })
      ),
    };

    const colJson = JSON.stringify(colPayload, null, 2);
    files.push({
      id: `figma-col-${colName}`,
      name: `${colName}.json`,
      path: `Collections/${colName}.json`,
      folder: "Collections",
      content: colJson,
      language: "json",
      tokenCount: list.length,
      sizeFormatted: formatFileSize(new Blob([colJson]).size),
    });
  });

  return {
    files,
    creationOrder,
    stats: {
      totalVars: resolvedTokens.length,
      permutations: resolvedTokens.length * Math.max(1, themeGroups.length),
      collectionsCount: collectionsMap.size,
    },
  };
}

// ============================================================================
// ZIP Bundle Downloader
// ============================================================================

export async function downloadExportZip(files: GeneratedExportFile[], zipFilename: string): Promise<void> {
  const zip = new JSZip();

  files.forEach((f) => {
    zip.file(f.path, f.content);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipFilename.endsWith(".zip") ? zipFilename : `${zipFilename}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
