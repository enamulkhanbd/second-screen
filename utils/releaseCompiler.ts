import { FlattenedToken, ThemeGroup } from "@/types/tokens";
import { evaluateTokenMath } from "./transformTokens";
import JSZip from "jszip";

export interface ReleasePackage {
  id: string;
  version: string;
  title: string;
  notes: string;
  createdAt: string;
  commitHash?: string;
  branch?: string;
  tokenCount: number;
  themesCount: number;
  targetSystems: string[];
  cssVariables: {
    root: string;
    themes: Record<string, string>; // themeId -> css string
    allCombined: string;
  };
  styleDictionary: {
    configJson: string;
    tokensJson: string;
    css: string;
    scss: string;
    esmJs: string;
    dts: string;
    tailwindConfig: string;
    iosSwift: string;
    androidColorsXml: string;
    androidDimensXml: string;
  };
}

/**
 * Normalizes token name into valid CSS variable name (--category-name)
 */
export function tokenToCssVarName(name: string): string {
  return `--${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

/**
 * Normalizes token name into valid SCSS variable name ($category-name)
 */
export function tokenToScssVarName(name: string): string {
  return `$${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

/**
 * Normalizes token name into valid Swift/JS camelCase variable name
 */
export function tokenToCamelCase(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ");
  return parts
    .map((p, idx) => (idx === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join("");
}

/**
 * Compiles flattened tokens into production-ready CSS variables
 */
export function compileCssVariables(
  tokens: FlattenedToken[],
  themeGroups: ThemeGroup[] = [],
  rawTokensDoc: Record<string, any> = {}
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
    const varName = tokenToCssVarName(t.name);
    let resolved = t.resolvedValue;

    // Evaluate math for composite typography or raw math
    if (resolved && (resolved.includes("roundTo") || resolved.includes("*") || resolved.includes("/"))) {
      resolved = evaluateTokenMath(resolved);
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
          const varName = tokenToCssVarName(t.name);
          let resolved = t.resolvedValue;
          if (resolved && (resolved.includes("roundTo") || resolved.includes("*") || resolved.includes("/"))) {
            resolved = evaluateTokenMath(resolved);
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
 * Compiles tokens into full Style Dictionary multi-platform artifacts
 */
export function compileStyleDictionary(
  tokens: FlattenedToken[],
  themeGroups: ThemeGroup[] = []
): ReleasePackage["styleDictionary"] {
  // 1. Style Dictionary Config JSON
  const configJson = JSON.stringify(
    {
      source: ["tokens/**/*.json"],
      platforms: {
        css: {
          transformGroup: "css",
          buildPath: "dist/web/",
          files: [
            {
              destination: "tokens.css",
              format: "css/variables",
              options: {
                outputReferences: true,
              },
            },
          ],
        },
        scss: {
          transformGroup: "scss",
          buildPath: "dist/web/",
          files: [
            {
              destination: "tokens.scss",
              format: "scss/variables",
              options: {
                outputReferences: true,
              },
            },
          ],
        },
        js: {
          transformGroup: "js",
          buildPath: "dist/web/",
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
          transformGroup: "js",
          buildPath: "dist/tailwind/",
          files: [
            {
              destination: "tailwind.config.js",
              format: "javascript/module-flat",
            },
          ],
        },
        ios: {
          transformGroup: "ios-swift",
          buildPath: "dist/ios/",
          files: [
            {
              destination: "Tokens.swift",
              format: "ios-swift/class.swift",
              className: "DesignTokens",
            },
          ],
        },
        android: {
          transformGroup: "android",
          buildPath: "dist/android/values/",
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
    .map((t) => `  ${tokenToCssVarName(t.name)}: ${t.resolvedValue};`)
    .join("\n")}\n}`;

  // 4. SCSS
  const scss = `${tokens
    .map((t) => `${tokenToScssVarName(t.name)}: ${t.resolvedValue};`)
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
    const key = tokenToCamelCase(t.name);
    if (t.type === "color") tailwindColors[key] = `var(${tokenToCssVarName(t.name)})`;
    else if (t.type === "spacing" || t.type === "sizing") tailwindSpacing[key] = `var(${tokenToCssVarName(t.name)})`;
    else if (t.type === "borderRadius") tailwindRadius[key] = `var(${tokenToCssVarName(t.name)})`;
  });

  const tailwindConfig = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(
    tailwindColors,
    null,
    6
  )},\n      spacing: ${JSON.stringify(
    tailwindSpacing,
    null,
    6
  )},\n      borderRadius: ${JSON.stringify(
    tailwindRadius,
    null,
    6
  )}\n    }\n  }\n};\n`;

  // 8. iOS Swift
  const swiftLines: string[] = [
    "import UIKit",
    "import SwiftUI",
    "",
    "public struct DesignTokens {",
  ];
  tokens.forEach((t) => {
    const prop = tokenToCamelCase(t.name);
    if (t.type === "color" && /^#[0-9a-fA-F]{6}$/.test(t.resolvedValue)) {
      swiftLines.push(`    public static let ${prop} = Color(hex: "${t.resolvedValue}")`);
    } else if (t.type === "spacing" || t.type === "sizing" || t.type === "borderRadius") {
      const num = parseInt(t.resolvedValue) || 0;
      swiftLines.push(`    public static let ${prop}: CGFloat = ${num}.0`);
    }
  });
  swiftLines.push("}");
  const iosSwift = swiftLines.join("\n");

  // 9. Android colors.xml & dimens.xml
  const colorXmlLines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"];
  const dimenXmlLines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"];

  tokens.forEach((t) => {
    const xmlName = t.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
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
    iosSwift,
    androidColorsXml: colorXmlLines.join("\n"),
    androidDimensXml: dimenXmlLines.join("\n"),
  };
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
    ).toLocaleString()}\n**Tokens:** ${pkg.tokenCount}\n\n## Release Notes\n${pkg.notes}\n\n## Structure\n- \`/dist/web/\`: CSS, SCSS, ESM JavaScript, and TypeScript definitions.\n- \`/dist/tailwind/\`: Tailwind CSS theme config extension.\n- \`/dist/ios/\`: Swift static tokens struct.\n- \`/dist/android/\`: Android XML colors and dimens.\n- \`/tokens/\`: Standard DTCG formatted JSON tokens.\n`
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
  tailwindFolder?.file("tailwind.config.js", pkg.styleDictionary.tailwindConfig);

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
