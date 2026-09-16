import { FlattenedToken, ThemeGroup, TokenType } from "@/types/tokens";

export type ExportViewType =
  | "hub"
  | "css"
  | "scss"
  | "typescript"
  | "raw-json"
  | "dtcg-json"
  | "figma-variables";

export type ColorSpaceOption = "as-authored" | "hex" | "srgb" | "display-p3" | "hsl" | "oklch";
export type ColorSpace = ColorSpaceOption;

export type CasingOption = "kebab" | "camel" | "snake" | "constant" | "pascal" | "as-authored";
export type NamingCasing = CasingOption;

export type StrategyType = "data-attribute" | "class";
export type ThemeGroupExportSetting = ThemeGroupSelectorConfig;

export interface GeneratedExportFile {
  id: string;
  name: string;
  path: string;
  folder?: string;
  content: string;
  language: "css" | "scss" | "typescript" | "json" | "javascript" | "markdown";
  tokenCount?: number;
  sizeFormatted?: string;
}

export interface ThemeGroupSelectorConfig {
  groupId: string;
  groupName: string;
  enabled: boolean;
  strategy: "data-attribute" | "class";
  attributeName: string; // e.g. "data-theme" or "data-mode"
  includeTokens: "all" | "overrides-only";
}

export interface CssExportConfig {
  colorSpace: ColorSpaceOption;
  prefix: string; // e.g. "pds", "pad", "pods", "pvds", or custom
  casing: CasingOption;
  separator: string; // e.g. "-"
  layerEnabled: boolean;
  layerName: string; // e.g. "tokens"
  rootSelector: string; // e.g. ":root"
  minify: boolean;
  optimizeComputed: boolean;
  sourceComments: boolean;
  descriptionComments: boolean;
  deprecationComments: boolean;
  assetBaseUrl: string;
  themeGroups: ThemeGroupSelectorConfig[];
  fileLayout: "split" | "single";
  baseFileName: string; // e.g. "tokens.css"
}

export interface ScssExportConfig {
  colorSpace: ColorSpaceOption;
  prefix: string;
  casing: CasingOption;
  separator: string;
  emitVariables: boolean; // Emit $-variables alongside $tokens map
  themeGroups: ThemeGroupSelectorConfig[];
  outputStrategy: "partials" | "single-file";
  baseFileName: string; // e.g. "tokens.scss"
}

export interface TypeScriptMetadataConfig {
  packageName: string;
  version: string;
  schemaVersion: string;
  commitSha: string;
  branch: string;
  repositoryUrl: string;
}

export interface TypeScriptExportConfig {
  colorSpace: ColorSpaceOption;
  constCasing: "camel" | "constant" | "pascal";
  keyCasing: "camel" | "kebab" | "snake" | "constant";
  constShape: "value-map" | "flat-map" | "nested-object";
  typeShape: "literal-union" | "enum" | "interface";
  declarations: "as-const" | "record" | "none";
  includeDescriptions: boolean;
  numericKeys: boolean;
  moduleFormat: "dual" | "esm" | "cjs";
  emitDeclarations: boolean; // .d.ts
  emitPackageJson: boolean;
  themeGroups: ThemeGroupSelectorConfig[];
  outputStrategy: "per-type" | "single-file";
  metadata: TypeScriptMetadataConfig;
}

export interface FigmaCreationOrderItem {
  order: number;
  id: string;
  name: string;
  collection: string;
  mode?: string;
  type: TokenType;
  resolvedValue: string;
  isAlias: boolean;
  aliasTarget?: string;
  dependencies: string[];
}
