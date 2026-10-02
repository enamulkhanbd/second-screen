export type DocBlockType =
  | "heading"
  | "paragraph"
  | "callout"
  | "dodont"
  | "variables-table"
  | "color-swatches"
  | "typography-scale"
  | "tokens-table"
  | "code";

export interface DocBlockSettings {
  level?: 1 | 2 | 3;
  calloutVariant?: "info" | "success" | "warning" | "error";
  
  // For Do's & Don'ts
  doText?: string;
  dontText?: string;

  // For Variable & Token Blocks
  collection?: string;
  selectedModes?: string[];
  filterType?: "all" | "color" | "float" | "dimension" | "string" | "boolean";
  filterQuery?: string;
  filterCondition?: "startsWith" | "includes";
  sortField?: "name" | "value";
  sortOrder?: "asc" | "desc";
  showSearchBox?: boolean;
  tokenSetName?: string;
}

export interface DocBlock {
  id: string;
  type: DocBlockType;
  content?: string;
  settings?: DocBlockSettings;
}

export type DocPageLayout = "classic" | "hero" | "feature";

export interface DocPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  folderId?: string | null; // null for root-level pages
  order: number;
  blocks: DocBlock[];
  layout: DocPageLayout;
  headerBackground?: string;
  showTableOfContents?: boolean;
  isPublished: boolean;
  publishedAt?: string;
  updatedAt: string;
}

export interface DocFolder {
  id: string;
  title: string;
  order: number;
  isOpen?: boolean;
}

export interface ProjectDocumentation {
  folders: DocFolder[];
  pages: DocPage[];
  isPublishedGlobally: boolean;
  publishedUrlSlug?: string;
  allowPublicAccess: boolean;
  publishedTokens?: import("./tokens").RawTokensDocument;
  publishedVariables?: import("./tokens").RawTokensDocument;
  updatedAt: string;
}

export const DEFAULT_PAGE_BACKGROUNDS = [
  "transparent",
  "#0f172a", // slate
  "#1e293b",
  "#064e3b", // emerald
  "#7c2d12", // amber/orange
  "#581c87", // purple
  "#0e7490", // cyan
  "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", // violet gradient
  "linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)", // ocean gradient
  "linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)", // sunset gradient
  "#ffffff",
  "#f8fafc",
];

export const createEmptyDocumentation = (): ProjectDocumentation => ({
  folders: [],
  pages: [],
  isPublishedGlobally: false,
  allowPublicAccess: true,
  updatedAt: new Date().toISOString(),
});

