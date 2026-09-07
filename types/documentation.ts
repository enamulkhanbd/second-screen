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

export const createDefaultDocumentation = (projectName: string = "Design System"): ProjectDocumentation => {
  const foundationsFolderId = "folder_foundations";

  return {
    isPublishedGlobally: false,
    allowPublicAccess: true,
    folders: [
      {
        id: foundationsFolderId,
        title: "Foundations",
        order: 0,
        isOpen: true,
      },
    ],
    pages: [
      {
        id: "page_welcome",
        title: "Welcome",
        slug: "welcome",
        description: `Welcome to the ${projectName} Living Documentation.`,
        folderId: null,
        order: 0,
        layout: "classic",
        headerBackground: "transparent",
        showTableOfContents: true,
        isPublished: true,
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: "b_welcome_callout",
            type: "callout",
            content: "This documentation is live-connected to your Figma variables and design tokens. Any changes to variables sync instantly to this documentation!",
            settings: {
              calloutVariant: "info",
            },
          },
          {
            id: "b_welcome_intro",
            type: "paragraph",
            content: "Our design system empowers product teams to craft harmonious, accessible, and delightful interfaces at scale. Browse foundational color palettes, typography scales, and token values in the navigation sidebar.",
          },
          {
            id: "b_welcome_dodont",
            type: "dodont",
            settings: {
              doText: "Use semantic alias tokens (e.g. `color.bg.surface`, `color.brand.primary`) to ensure smooth multi-theme and dark mode transitions.",
              dontText: "Don't hardcode arbitrary hex codes or pixel numbers directly into production codebases.",
            },
          },
        ],
      },
      {
        id: "page_color",
        title: "Color",
        slug: "color",
        description: "Color swatches, token palettes, and multi-mode variable mapping.",
        folderId: foundationsFolderId,
        order: 0,
        layout: "classic",
        headerBackground: "transparent",
        showTableOfContents: true,
        isPublished: true,
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: "b_col_intro",
            type: "paragraph",
            content: "Below are the color variables and tokens configured for this project across active modes (e.g., Light and Dark).",
          },
          {
            id: "b_col_swatches",
            type: "color-swatches",
            settings: {
              filterType: "color",
              showSearchBox: true,
            },
          },
          {
            id: "b_col_table",
            type: "variables-table",
            settings: {
              filterType: "color",
              showSearchBox: true,
              filterCondition: "includes",
            },
          },
        ],
      },
      {
        id: "page_typography",
        title: "Typography",
        slug: "typography",
        description: "Typographic scale, font families, weights, and line heights.",
        folderId: foundationsFolderId,
        order: 1,
        layout: "classic",
        headerBackground: "transparent",
        showTableOfContents: true,
        isPublished: true,
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: "b_type_intro",
            type: "paragraph",
            content: "Type scale hierarchy and font specifications used across responsive layouts.",
          },
          {
            id: "b_type_scale",
            type: "typography-scale",
            settings: {
              filterType: "dimension",
              showSearchBox: false,
            },
          },
          {
            id: "b_type_table",
            type: "tokens-table",
            settings: {
              filterType: "all",
              showSearchBox: true,
            },
          },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  };
};

