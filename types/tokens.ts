export type GitProvider = "github" | "azure" | "gitlab" | "bitbucket";

export interface GitCredentials {
  provider: GitProvider;
  owner: string; // GitHub owner / Azure Org / GitLab group
  project?: string; // Azure Project (optional for GitHub/GitLab)
  repo: string;
  branch: string;
  path: string; // e.g. "tokens.json" or "tokens" or "$themes.json"
  filePath?: string;
  pat: string;
}

export type TokenType =
  | "color"
  | "dimension"
  | "spacing"
  | "sizing"
  | "borderRadius"
  | "borderWidth"
  | "opacity"
  | "fontFamilies"
  | "fontFamily"
  | "fontWeights"
  | "fontWeight"
  | "fontSizes"
  | "fontSize"
  | "lineHeights"
  | "lineHeight"
  | "letterSpacing"
  | "boxShadow"
  | "shadow"
  | "typography"
  | "composition"
  | "asset"
  | "boolean"
  | "border"
  | "cubicBezier"
  | "duration"
  | "number"
  | "size"
  | "space"
  | "text"
  | "textCase"
  | "textDecoration"
  | "other";

export interface RawTokenLeaf {
  value: string | number | Record<string, any>;
  type?: TokenType | string;
  description?: string;
  $type?: TokenType | string;
  $value?: string | number | Record<string, any>;
  $description?: string;
  [key: string]: any;
}

export type RawTokenTree = {
  [key: string]: RawTokenLeaf | RawTokenTree;
};

// Top-level structure can be a single set OR multi-set dictionary: { "global": { ... }, "dark": { ... }, "$themes": [...] }
export type RawTokensDocument = Record<string, RawTokenTree | any>;

export interface FlattenedToken {
  id: string; // Full dot path, e.g. "global.colors.brand.primary" or "colors.brand.primary"
  name: string; // Display name, e.g. "colors.brand.primary"
  path: string[]; // Path array, e.g. ["global", "colors", "brand", "primary"]
  group: string; // e.g. "colors"
  subgroup?: string; // e.g. "brand"
  setName: string; // e.g. "global" or "dark"
  type: TokenType;
  rawValue: string;
  resolvedValue: string;
  resolvedHex?: string;
  modify?: any;
  isAlias: boolean;
  aliasTarget?: string;
  description?: string;
  deprecated?: boolean;
  deprecatedMessage?: string;
  deprecatedReplacement?: string;
  deprecatedSeverity?: string;
  deprecatedRemoveAfter?: string;
  figmaVariableKey?: string;
  category?: string;
}

export interface ThemeOption {
  id: string;
  name: string; // e.g. "Dark", "Light", "Default", "Atlas Connect"
  group: string; // e.g. "Theme", "Semantic", "Components", "Brands"
  selectedTokenSets: Record<string, "enabled" | "disabled" | "source">;
  color?: string; // Color dot (e.g. "#f97316", "#3b82f6", "#10b981", "#ef4444", "#a855f7")
  description?: string;
  figmaVariableReferences?: Record<string, string>;
  figmaCollectionId?: string;
  figmaModeId?: string;
}

export interface ThemeGroup {
  id: string;
  name: string;
  color: string;
  options: ThemeOption[];
}

export interface UserProfile {
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  username?: string;
}

export type ResolvedTokenMap = Record<string, any>;

export type SyncStatus = "idle" | "fetching" | "pushing" | "success" | "error";

export interface SyncMeta {
  mode: "file" | "folder";
  targetPath?: string;
  targetFolder?: string;
  files?: Record<string, string>;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  timestamp: number;
}

// -------------------------------------------------------------
// MULTI-PLATFORM & DISTRIBUTION TARGET TYPES
// -------------------------------------------------------------
export type PlatformFormatId =
  | "css"
  | "scss"
  | "tailwind"
  | "react"
  | "flutter"
  | "swift"
  | "android"
  | "tokens_json"
  | "config_json";

export interface TargetPlatformFormat {
  formatId: PlatformFormatId;
  targetPath: string; // e.g. "apps/web/styles/tokens.css" or "lib/tokens/tokens.dart"
  enabled: boolean;
}

export interface DistributionTarget {
  id: string;
  name: string; // e.g. "Web App (GitHub)", "Mobile Flutter App (Azure)"
  provider: GitProvider;
  owner: string;
  project?: string; // for azure
  repo: string;
  branch: string;
  pat?: string; // optional override, otherwise falls back to global credentials
  publishMode: "commit" | "pull_request";
  formats: TargetPlatformFormat[];
  lastPublishedAt?: string;
  lastPublishStatus?: "success" | "error";
  lastPublishMessage?: string;
}

export interface TargetPublishResult {
  targetId: string;
  targetName: string;
  provider: GitProvider;
  repo: string;
  branch: string;
  status: "success" | "error";
  message: string;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  commitHash?: string;
  filesCount?: number;
}

export interface CompilerConfig {
  nameTransform: "kebab" | "camel" | "snake" | "pascal" | "constant";
  prefix: string; // e.g. "ds-", "app-", or ""
  dimensionUnit: "px" | "rem";
  rootFontSize: number; // default 16
  flutterClassName: string; // default "AppColors"
  swiftStructName: string; // default "DesignTokens"
  outputReferences: boolean; // default true (outputs var(--...) for aliases)
  customConfigJson?: string; // raw Style Dictionary config.json overrides
}

export const DEFAULT_COMPILER_CONFIG: CompilerConfig = {
  nameTransform: "kebab",
  prefix: "",
  dimensionUnit: "px",
  rootFontSize: 16,
  flutterClassName: "AppColors",
  swiftStructName: "DesignTokens",
  outputReferences: true,
};

export interface ReleaseArtifact {
  name: string;
  filename: string;
  size: string;
  bytes: number;
  type: "manifest" | "raw_json" | "zip" | "notes";
}

export interface ReleaseThemeChange {
  groupName: string;
  optionName: string;
  changeType: "added" | "modified" | "deleted";
}

export interface ReleasePackage {
  id: string;
  version: string;
  title: string;
  notes: string;
  summary?: string;
  createdAt: string;
  author?: {
    uid?: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  branch?: string;
  tokenCount: number;
  themesCount: number;
  changesCount?: number;
  isDeprecated?: boolean;
  deprecationReason?: string;
  deprecatedAt?: string;
  deprecatedBy?: {
    uid?: string;
    name: string;
    email?: string;
  };
  targetSystems: string[];
  publishResults?: TargetPublishResult[];
  compilerConfig?: CompilerConfig;
  rawTokensSnapshot?: RawTokensDocument;
  themeGroupsSnapshot?: any[];
  diffSummary?: any; // DocumentDiffSummary
  themeChanges?: ReleaseThemeChange[];
  artifacts?: ReleaseArtifact[];
  cssVariables: {
    root: string;
    themes: Record<string, string>;
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
    reactTs: string;
    flutterDart: string;
    iosSwift: string;
    androidColorsXml: string;
    androidDimensXml: string;
  };
}

export interface UserActivityItem {
  id: string;
  type: "token" | "git" | "release" | "team" | "figma" | "project" | "asset" | "doc";
  title: string;
  description: string;
  timestamp: string;
  actor: {
    uid?: string;
    name: string;
    email: string;
    role?: string;
    avatarUrl?: string;
  };
  orgId?: string;
  projectId?: string;
  projectName?: string;
  metadata?: Record<string, any>;
}

export type LogActivityInput = Omit<UserActivityItem, "id" | "timestamp" | "actor"> & {
  actor?: {
    uid?: string;
    name?: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
  };
};

export type BranchChangeCategory = "tokens" | "sets" | "themes" | "assets" | "docs";

export interface BranchChangeItem {
  id: string;
  category: BranchChangeCategory;
  action: "added" | "modified" | "deleted";
  key: string; // e.g. "border.state.error" or "alias/color-palette"
  label: string; // e.g. "Token" or "Set" or "Theme"
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface BranchCommit {
  id: string;
  sha: string;
  message: string;
  timestamp: string;
  author: {
    uid?: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  totalAdded: number;
  totalModified: number;
  totalDeleted: number;
  changes: BranchChangeItem[];
}

export interface BranchComment {
  id: string;
  text: string;
  createdAt: string;
  author: {
    uid?: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: {
    name: string;
    email: string;
  };
}

export interface ProjectBranch {
  id: string;
  name: string; // branch slug, e.g. "main" or "new-color-palette"
  title: string; // display title, e.g. "Main" or "New color palette"
  description?: string;
  isDefault: boolean;
  basedOn?: string; // parent branch name it was forked from
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    uid?: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  rawTokens: RawTokensDocument;
  themeGroups?: ThemeGroup[];
  commits: BranchCommit[];
  comments: BranchComment[];
}

