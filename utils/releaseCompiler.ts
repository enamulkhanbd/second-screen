import {
  FlattenedToken,
  ThemeGroup,
  ReleasePackage,
  PlatformFormatId,
  CompilerConfig,
  DEFAULT_COMPILER_CONFIG,
} from "@/types/tokens";
import { evaluateTokenMath } from "./transformTokens";
import JSZip from "jszip";

/**
 * Transforms token name according to casing rules and optional prefix
 */
export function formatTokenName(
  name: string,
  config: Partial<CompilerConfig> = DEFAULT_COMPILER_CONFIG,
  forceCase?: CompilerConfig["nameTransform"]
): string {
  const parts = name.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const activeCase = forceCase || config.nameTransform || "kebab";
  const prefix = config.prefix || "";

  let transformed = "";

  switch (activeCase) {
    case "camel":
      transformed = parts
        .map((p, idx) =>
          idx === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
        )
        .join("");
      break;

    case "pascal":
      transformed = parts
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join("");
      break;

    case "snake":
      transformed = parts.map((p) => p.toLowerCase()).join("_");
      break;

    case "constant":
      transformed = parts.map((p) => p.toUpperCase()).join("_");
      break;

    case "kebab":
    default:
      transformed = parts.map((p) => p.toLowerCase()).join("-");
      break;
  }

  if (prefix) {
    const cleanPrefix = prefix.replace(/^-+|-+$/g, "");
    if (activeCase === "kebab") return `${cleanPrefix}-${transformed}`;
    if (activeCase === "snake") return `${cleanPrefix}_${transformed}`;
    if (activeCase === "constant") return `${cleanPrefix.toUpperCase()}_${transformed}`;
    if (activeCase === "camel") {
      return `${cleanPrefix.toLowerCase()}${transformed.charAt(0).toUpperCase() + transformed.slice(1)}`;
    }
    if (activeCase === "pascal") {
      return `${cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1).toLowerCase()}${transformed}`;
    }
  }

  return transformed;
}

/**
 * Normalizes token name into valid CSS variable name (--prefix-name)
 */
export function tokenToCssVarName(
  name: string,
  config: Partial<CompilerConfig> = DEFAULT_COMPILER_CONFIG
): string {
  const baseName = formatTokenName(name, config, config.nameTransform || "kebab");
  return `--${baseName.replace(/^--+/, "")}`;
}

/**
 * Normalizes token name into valid SCSS variable name ($prefix-name)
 */
export function tokenToScssVarName(
  name: string,
  config: Partial<CompilerConfig> = DEFAULT_COMPILER_CONFIG
): string {
  const baseName = formatTokenName(name, config, config.nameTransform || "kebab");
  return `$${baseName.replace(/^\$+/, "")}`;
}

/**
 * Normalizes token name into camelCase variable name
 */
export function tokenToCamelCase(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  return parts
    .map((p, idx) => (idx === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join("");
}

/**
 * Formats dimension values (px to rem conversion if enabled)
 */
export function formatDimensionValue(
  val: string,
  config: Partial<CompilerConfig> = DEFAULT_COMPILER_CONFIG
): string {
  if (config.dimensionUnit === "rem") {
    const num = parseFloat(val);
    const rootSize = config.rootFontSize || 16;
    if (!isNaN(num) && (val.endsWith("px") || /^\d+$/.test(val))) {
      const remVal = (num / rootSize).toFixed(4).replace(/\.?0+$/, "");
      return `${remVal}rem`;
    }
  }
  return val;
}

/**
 * Converts CSS Hex (#rgb, #rrggbb, #rrggbbaa) to 0xAARRGGBB for Flutter Dart
 */
export function hexToFlutterColor(hex: string): string {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length === 6) {
    clean = "FF" + clean;
  } else if (clean.length === 8) {
    const rr = clean.slice(0, 2);
    const gg = clean.slice(2, 4);
    const bb = clean.slice(4, 6);
    const aa = clean.slice(6, 8);
    clean = aa + rr + gg + bb;
  } else {
    clean = "FF000000";
  }
  return `0x${clean.toUpperCase()}`;
}

/**
 * Compiles flattened tokens into production-ready Flutter Dart classes
 */
export function compileFlutterDart(
  tokens: FlattenedToken[],
  config: Partial<CompilerConfig> = DEFAULT_COMPILER_CONFIG
): string {
  const colorLines: string[] = [];
  const spacingLines: string[] = [];
  const radiusLines: string[] = [];
  const typographyLines: string[] = [];

  const className = config.flutterClassName || "AppColors";

  tokens.forEach((t) => {
    const prop = formatTokenName(t.name, config, "camel");
    const comment = t.description ? `  /// ${t.description.replace(/\n/g, " ")}\n` : "";

    // 1. Color Tokens
    if (t.type === "color" || /^#([0-9a-fA-F]{3,8})$/.test(t.resolvedValue.trim())) {
      const hexDart = hexToFlutterColor(t.resolvedValue);
      colorLines.push(`${comment}  static const Color ${prop} = Color(${hexDart});`);
    }
    // 2. Spacing & Sizing Tokens
    else if (t.type === "spacing" || t.type === "sizing" || t.type === "dimension") {
      const num = parseFloat(t.resolvedValue) || 0;
      spacingLines.push(`${comment}  static const double ${prop} = ${num.toFixed(1)};`);
    }
    // 3. Border Radius Tokens
    else if (t.type === "borderRadius") {
      const num = parseFloat(t.resolvedValue) || 0;
      radiusLines.push(
        `${comment}  static const BorderRadius ${prop} = BorderRadius.all(Radius.circular(${num.toFixed(1)}));`
      );
    }
    // 4. Typography Composite Tokens
    else if (t.type === "typography") {
      try {
        const obj =
          typeof t.resolvedValue === "string" && t.resolvedValue.startsWith("{")
            ? JSON.parse(t.resolvedValue)
            : null;
        if (obj) {
          const fontSize = parseFloat(obj.fontSize) || 16.0;
          const fontWeight =
            obj.fontWeight === "bold" || obj.fontWeight === "700"
              ? "FontWeight.bold"
              : "FontWeight.normal";
          typographyLines.push(
            `${comment}  static const TextStyle ${prop} = TextStyle(fontSize: ${fontSize.toFixed(
              1
            )}, fontWeight: ${fontWeight});`
          );
        }
      } catch {
        // ignore
      }
    }
  });

  return `// Generated by Second Screen Token Studio
// Style Dictionary & Tokens Studio Compiler

import 'package:flutter/widgets.dart';

class ${className} {
  ${className}._();
${colorLines.join("\n")}
}

class AppSpacing {
  AppSpacing._();
${spacingLines.join("\n")}
}

class AppRadius {
  AppRadius._();
${radiusLines.join("\n")}
}

class AppTypography {
  AppTypography._();
${typographyLines.join("\n")}
}
`;
}

/**
 * Compiles flattened tokens into strongly-typed React / TypeScript definitions and object
 */
export function compileReactTs(
  tokens: FlattenedToken[],
  config: Partial<CompilerConfig> = DEFAULT_COMPILER_CONFIG
): string {
  const tokenMap: Record<string, any> = {};

  tokens.forEach((t) => {
    const key = formatTokenName(t.name, config, config.nameTransform || "camel");
    tokenMap[key] =
      t.type === "dimension" || t.type === "spacing" || t.type === "sizing"
        ? formatDimensionValue(t.resolvedValue, config)
        : t.resolvedValue;
  });

  return `/**
 * Second Screen Design Tokens
 * Strongly-typed React & TypeScript export
 * Transform: name/${config.nameTransform || "camel"}
 */

export const tokens = ${JSON.stringify(tokenMap, null, 2)} as const;

export type DesignTokens = typeof tokens;
export type TokenName = keyof typeof tokens;

export default tokens;
`;
}

/**
 * Compiles flattened tokens into production-ready CSS variables
 */
export function compileCssVariables(
  tokens: FlattenedToken[],
  themeGroups: ThemeGroup[] = [],
  config: Partial<CompilerConfig> = DEFAULT_COMPILER_CONFIG
): ReleasePackage["cssVariables"] {
  const linesByCat: Record<string, string[]> = {
    Color: [],
    Typography: [],
    Spacing: [],
    Sizing: [],
    "Border Radius": [],
    "Box Shadow": [],
    Opacity: [],
    Other: [],
  };

  tokens.forEach((t) => {
    const varName = tokenToCssVarName(t.name, config);
    let resolved = t.resolvedValue;

    // Evaluate math
    if (resolved && (resolved.includes("roundTo") || resolved.includes("*") || resolved.includes("/"))) {
      resolved = evaluateTokenMath(resolved);
    }

    // Units
    if (t.type === "spacing" || t.type === "sizing" || t.type === "dimension") {
      resolved = formatDimensionValue(resolved, config);
    }

    const comment = t.description ? ` /* ${t.description.replace(/\*\//g, "")} */` : "";
    const line = `  ${varName}: ${resolved};${comment}`;

    if (t.type === "color") linesByCat.Color.push(line);
    else if (t.type === "typography") linesByCat.Typography.push(line);
    else if (t.type === "spacing") linesByCat.Spacing.push(line);
    else if (t.type === "sizing") linesByCat.Sizing.push(line);
    else if (t.type === "borderRadius") linesByCat["Border Radius"].push(line);
    else if (t.type === "boxShadow") linesByCat["Box Shadow"].push(line);
    else if (t.type === "opacity") linesByCat.Opacity.push(line);
    else linesByCat.Other.push(line);
  });

  const rootBody: string[] = [];
  Object.entries(linesByCat).forEach(([cat, lines]) => {
    if (lines.length > 0) {
      rootBody.push(`  /* === ${cat.toUpperCase()} TOKENS === */`);
      rootBody.push(...lines);
      rootBody.push("");
    }
  });

  const rootCss = `:root {\n${rootBody.join("\n")}\n}`;

  // Theme-specific CSS classes
  const themesCss: Record<string, string> = {};
  const allThemesBlocks: string[] = [rootCss];

  themeGroups.forEach((group) => {
    group.options.forEach((opt) => {
      const selectorClass = `.theme-${opt.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const dataSelector = `[data-theme="${opt.name.toLowerCase()}"]`;

      const themeLines: string[] = [];
      const enabledSetNames = Object.entries(opt.selectedTokenSets || {})
        .filter(([_, state]) => state === "enabled")
        .map(([setName]) => setName);

      tokens
        .filter((t) => enabledSetNames.includes(t.setName))
        .forEach((t) => {
          const varName = tokenToCssVarName(t.name, config);
          let resolved = t.resolvedValue;
          if (resolved && (resolved.includes("roundTo") || resolved.includes("*") || resolved.includes("/"))) {
            resolved = evaluateTokenMath(resolved);
          }
          if (t.type === "spacing" || t.type === "sizing" || t.type === "dimension") {
            resolved = formatDimensionValue(resolved, config);
          }
          themeLines.push(`  ${varName}: ${resolved};`);
        });

      const themeBlock = `${selectorClass}, ${dataSelector} {\n  /* Theme: ${group.name} - ${opt.name} */\n${themeLines.join("\n")}\n}`;
      themesCss[opt.id] = themeBlock;
      if (themeLines.length > 0) {
        allThemesBlocks.push(themeBlock);
      }
    });
  });

  return {
    root: rootCss,
    themes: themesCss,
    allCombined: allThemesBlocks.join("\n\n"),
  };
}

/**
 * Compiles tokens into Style Dictionary v4 compatible configuration and platform artifacts
 */
export function compileStyleDictionary(
  tokens: FlattenedToken[],
  themeGroups: ThemeGroup[] = [],
  config: Partial<CompilerConfig> = DEFAULT_COMPILER_CONFIG
): ReleasePackage["styleDictionary"] {
  const activeTransform = `name/${config.nameTransform || "kebab"}`;
  const prefix = config.prefix || "";

  // 1. Style Dictionary v4 Configuration JSON (matching Tokens Studio specs)
  const configJson = JSON.stringify(
    {
      source: ["tokens/**/*.json"],
      log: {
        verbosity: "default",
      },
      preprocessors: ["tokens-studio"],
      platforms: {
        css: {
          transformGroup: "tokens-studio",
          transforms: [activeTransform],
          ...(prefix ? { prefix } : {}),
          buildPath: "build/css/",
          files: [
            {
              destination: "tokens.css",
              format: "css/variables",
              options: {
                outputReferences: config.outputReferences !== false,
              },
            },
          ],
        },
        scss: {
          transformGroup: "tokens-studio",
          transforms: [activeTransform],
          ...(prefix ? { prefix } : {}),
          buildPath: "build/scss/",
          files: [
            {
              destination: "tokens.scss",
              format: "scss/variables",
            },
          ],
        },
        js: {
          transformGroup: "tokens-studio",
          transforms: [activeTransform],
          buildPath: "build/js/",
          files: [
            {
              destination: "tokens.js",
              format: "javascript/es6",
            },
            {
              destination: "tokens.d.ts",
              format: "typescript/es6-declarations",
            },
          ],
        },
        tailwind: {
          transformGroup: "tokens-studio",
          buildPath: "build/tailwind/",
          files: [
            {
              destination: "tailwind.tokens.js",
              format: "javascript/module-flat",
            },
          ],
        },
        flutter: {
          transformGroup: "tokens-studio",
          buildPath: "build/flutter/",
          className: config.flutterClassName || "AppColors",
          files: [
            {
              destination: "tokens.dart",
              format: "flutter/class.dart",
            },
          ],
        },
        ios: {
          transformGroup: "ios-swift",
          buildPath: "build/ios/",
          className: config.swiftStructName || "DesignTokens",
          files: [
            {
              destination: "Tokens.swift",
              format: "ios-swift/class.swift",
            },
          ],
        },
        android: {
          transformGroup: "android",
          buildPath: "build/android/values/",
          files: [
            {
              destination: "colors.xml",
              format: "android/colors",
            },
            {
              destination: "dimens.xml",
              format: "android/dimens",
            },
          ],
        },
      },
    },
    null,
    2
  );

  // 2. Transformed DTCG Tokens JSON
  const dtcgTree: Record<string, any> = {};
  tokens.forEach((t) => {
    const parts = t.name.split(".");
    let curr = dtcgTree;
    parts.forEach((p, idx) => {
      if (idx === parts.length - 1) {
        curr[p] = {
          $value: t.resolvedValue,
          $type: t.type || "color",
          $description: t.description || undefined,
        };
      } else {
        if (!curr[p]) curr[p] = {};
        curr = curr[p];
      }
    });
  });
  const tokensJson = JSON.stringify(dtcgTree, null, 2);

  // 3. CSS
  const css = `:root {\n${tokens
    .map((t) => `  ${tokenToCssVarName(t.name, config)}: ${formatDimensionValue(t.resolvedValue, config)};`)
    .join("\n")}\n}`;

  // 4. SCSS
  const scss = `${tokens
    .map((t) => `${tokenToScssVarName(t.name, config)}: ${formatDimensionValue(t.resolvedValue, config)};`)
    .join("\n")}`;

  // 5. JavaScript ESM
  const esmJs = `/**\n * Design Tokens ESM Export\n * Auto-generated by Second Screen\n */\n\nexport const tokens = ${JSON.stringify(
    dtcgTree,
    null,
    2
  )};\n\nexport default tokens;\n`;

  // 6. TypeScript .d.ts
  const dts = `/**\n * Design Tokens TypeScript Definitions\n * Auto-generated by Second Screen\n */\n\ndeclare const tokens: ${JSON.stringify(
    dtcgTree,
    null,
    2
  )};\n\nexport default tokens;\n`;

  // 7. Tailwind Config snippet
  const tailwindColors: Record<string, string> = {};
  const tailwindSpacing: Record<string, string> = {};
  const tailwindRadius: Record<string, string> = {};

  tokens.forEach((t) => {
    const key = formatTokenName(t.name, config, "camel");
    if (t.type === "color") tailwindColors[key] = `var(${tokenToCssVarName(t.name, config)})`;
    else if (t.type === "spacing" || t.type === "sizing") tailwindSpacing[key] = `var(${tokenToCssVarName(t.name, config)})`;
    else if (t.type === "borderRadius") tailwindRadius[key] = `var(${tokenToCssVarName(t.name, config)})`;
  });

  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(tailwindColors, null, 8)},
      spacing: ${JSON.stringify(tailwindSpacing, null, 8)},
      borderRadius: ${JSON.stringify(tailwindRadius, null, 8)}
    }
  }
};
`;

  // 8. Flutter Dart
  const flutterDart = compileFlutterDart(tokens, config);

  // 9. React TypeScript
  const reactTs = compileReactTs(tokens, config);

  // 10. iOS Swift
  const structName = config.swiftStructName || "DesignTokens";
  const swiftLines: string[] = [
    "import UIKit",
    "import SwiftUI",
    "",
    `public struct ${structName} {`,
  ];
  tokens.forEach((t) => {
    const prop = formatTokenName(t.name, config, "camel");
    if (t.type === "color" && /^#[0-9a-fA-F]{6}$/.test(t.resolvedValue)) {
      swiftLines.push(`    public static let ${prop} = Color(hex: "${t.resolvedValue}")`);
    } else if (t.type === "spacing" || t.type === "sizing" || t.type === "borderRadius") {
      const num = parseInt(t.resolvedValue) || 0;
      swiftLines.push(`    public static let ${prop}: CGFloat = ${num}.0`);
    }
  });
  swiftLines.push("}");
  const iosSwift = swiftLines.join("\n");

  // 11. Android XML
  const colorXmlLines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"];
  const dimenXmlLines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"];

  tokens.forEach((t) => {
    const xmlName = formatTokenName(t.name, config, "snake");
    if (t.type === "color" && /^#[0-9a-fA-F]{3,8}$/.test(t.resolvedValue)) {
      colorXmlLines.push(`    <color name="${xmlName}">${t.resolvedValue}</color>`);
    } else if (t.type === "spacing" || t.type === "sizing" || t.type === "borderRadius") {
      const val = t.resolvedValue.endsWith("px") ? t.resolvedValue.replace("px", "dp") : `${t.resolvedValue}dp`;
      dimenXmlLines.push(`    <dimen name="${xmlName}">${val}</dimen>`);
    }
  });

  colorXmlLines.push("</resources>");
  dimenXmlLines.push("</resources>");

  return {
    configJson,
    tokensJson,
    css,
    scss,
    esmJs,
    dts,
    tailwindConfig,
    reactTs,
    flutterDart,
    iosSwift,
    androidColorsXml: colorXmlLines.join("\n"),
    androidDimensXml: dimenXmlLines.join("\n"),
  };
}

/**
 * Returns the exact content and default file name for any platform format
 */
export function getPlatformArtifactContent(
  formatId: PlatformFormatId,
  pkg: ReleasePackage
): { filename: string; content: string; lang: string } {
  const sd = pkg.styleDictionary || {};
  switch (formatId) {
    case "css":
      return { filename: "tokens.css", content: pkg.cssVariables?.allCombined || sd.css || "", lang: "css" };
    case "tailwind":
      return { filename: "tailwind.tokens.js", content: sd.tailwindConfig || "", lang: "javascript" };
    case "react":
      return {
        filename: "tokens.ts",
        content:
          sd.reactTs ||
          `/**\n * React TypeScript Tokens Export\n */\nexport const tokens = ${sd.tokensJson || "{}"} as const;\nexport type DesignTokens = typeof tokens;\nexport default tokens;\n`,
        lang: "typescript",
      };
    case "flutter":
      return {
        filename: "tokens.dart",
        content:
          sd.flutterDart ||
          `// Flutter Tokens Export\nimport 'package:flutter/widgets.dart';\n\nclass AppColors {\n  AppColors._();\n}\n`,
        lang: "dart",
      };
    case "swift":
      return { filename: "Tokens.swift", content: sd.iosSwift || "", lang: "swift" };
    case "android":
      return { filename: "colors.xml", content: sd.androidColorsXml || "", lang: "xml" };
    case "tokens_json":
      return { filename: "tokens.json", content: sd.tokensJson || "{}", lang: "json" };
    case "config_json":
      return { filename: "config.json", content: sd.configJson || "{}", lang: "json" };
    default:
      return { filename: "tokens.css", content: sd.css || "", lang: "css" };
  }
}

/**
 * Downloads a complete ZIP bundle of all release artifacts
 */
export async function downloadReleaseZip(pkg: ReleasePackage) {
  const zip = new JSZip();

  // Root files
  zip.file("config.json", pkg.styleDictionary.configJson);
  zip.file(
    "README.md",
    `# Design Tokens Release: ${pkg.version}\n\n**Title:** ${pkg.title}\n**Created:** ${new Date(
      pkg.createdAt
    ).toLocaleString()}\n**Tokens:** ${pkg.tokenCount}\n\n## Release Notes\n${pkg.notes}\n\n## Structure\n- \`/config.json\`: Style Dictionary v4 & Tokens Studio configuration.\n- \`/dist/web/\`: CSS, SCSS, ESM JavaScript, and TypeScript definitions.\n- \`/dist/tailwind/\`: Tailwind CSS theme config extension.\n- \`/dist/flutter/\`: Flutter Dart classes.\n- \`/dist/react/\`: React TypeScript constants.\n- \`/dist/ios/\`: Swift static tokens struct.\n- \`/dist/android/\`: Android XML colors and dimens.\n- \`/tokens/\`: Standard DTCG formatted JSON tokens.\n`
  );

  // /tokens/ folder
  const tokensFolder = zip.folder("tokens");
  tokensFolder?.file("tokens.json", pkg.styleDictionary.tokensJson);

  // /dist/web/ folder
  const webFolder = zip.folder("dist")?.folder("web");
  webFolder?.file("tokens.css", pkg.styleDictionary.css);
  webFolder?.file("tokens.scss", pkg.styleDictionary.scss);
  webFolder?.file("tokens.js", pkg.styleDictionary.esmJs);
  webFolder?.file("tokens.d.ts", pkg.styleDictionary.dts);

  // /dist/tailwind/ folder
  const tailwindFolder = zip.folder("dist")?.folder("tailwind");
  tailwindFolder?.file("tailwind.tokens.js", pkg.styleDictionary.tailwindConfig);

  // /dist/flutter/ folder
  const flutterFolder = zip.folder("dist")?.folder("flutter");
  flutterFolder?.file("tokens.dart", pkg.styleDictionary.flutterDart);

  // /dist/react/ folder
  const reactFolder = zip.folder("dist")?.folder("react");
  reactFolder?.file("tokens.ts", pkg.styleDictionary.reactTs);

  // /dist/ios/ folder
  const iosFolder = zip.folder("dist")?.folder("ios");
  iosFolder?.file("Tokens.swift", pkg.styleDictionary.iosSwift);

  // /dist/android/ folder
  const androidFolder = zip.folder("dist")?.folder("android")?.folder("values");
  androidFolder?.file("colors.xml", pkg.styleDictionary.androidColorsXml);
  androidFolder?.file("dimens.xml", pkg.styleDictionary.androidDimensXml);

  // Generate blob & trigger download
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `design-tokens-${pkg.version}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a download of a single text file
 */
export function downloadTextFile(content: string, filename: string, mimeType: string = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
