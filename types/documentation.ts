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
  const studioFolderId = "folder_studio";
  const platformFolderId = "folder_platform";

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
      {
        id: studioFolderId,
        title: "Studio & Token Operations",
        order: 1,
        isOpen: true,
      },
      {
        id: platformFolderId,
        title: "Platform Tools & Publishing",
        order: 2,
        isOpen: true,
      },
    ],
    pages: [
      {
        id: "page_welcome",
        title: "Welcome & System Overview",
        slug: "welcome",
        description: `Welcome to the ${projectName} Living Documentation and Operations Guide.`,
        folderId: null,
        order: 0,
        layout: "hero",
        headerBackground: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
        showTableOfContents: true,
        isPublished: true,
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: "b_welcome_callout",
            type: "callout",
            content: "This documentation is live-connected to your Figma variables and design tokens. Any changes made in the studio or synced from Figma update here in real-time!",
            settings: {
              calloutVariant: "info",
            },
          },
          {
            id: "b_welcome_intro",
            type: "paragraph",
            content: "The Second Screen platform empowers design and engineering teams to build, manage, and distribute design tokens with zero third-party dependencies, strict multi-tenant isolation, and high-performance collation engines.",
          },
          {
            id: "b_welcome_h2",
            type: "heading",
            content: "Design System Guidelines",
            settings: {
              level: 2,
            },
          },
          {
            id: "b_welcome_dodont",
            type: "dodont",
            settings: {
              doText: "Use semantic alias tokens (e.g. `color.bg.surface`, `color.brand.primary`) to ensure seamless multi-mode and dark theme transitions.",
              dontText: "Don't hardcode arbitrary hex values or ad-hoc pixel numbers directly into application codebases.",
            },
          },
          {
            id: "b_welcome_code",
            type: "code",
            content: "/* Access tokens directly in CSS */\n.button-primary {\n  background-color: var(--colors-primary-500, #2fa491);\n  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);\n  border-radius: var(--radius-md, 6px);\n}",
            settings: {
              calloutVariant: "info",
            },
          },
        ],
      },
      {
        id: "page_color",
        title: "Color Palette & Modes",
        slug: "color",
        description: "Live visual swatches, token palettes, and multi-mode variable mapping.",
        folderId: foundationsFolderId,
        order: 0,
        layout: "classic",
        headerBackground: "transparent",
        showTableOfContents: true,
        isPublished: true,
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: "b_col_callout",
            type: "callout",
            content: "Colors are sorted from light to dark by perceptual luminance (OKLCH L), with brand shade families (50 through 950) maintaining strict numeric sequence.",
            settings: {
              calloutVariant: "success",
            },
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
        title: "Typography Scale",
        slug: "typography",
        description: "Typographic scale hierarchy, font families, weights, and line heights.",
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
            content: "Live specimen specimens demonstrating font sizes, weights, and responsive line heights across UI components.",
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
      {
        id: "page_tokens_workspace",
        title: "Tokens Workspace & Collation",
        slug: "tokens-workspace",
        description: "Authoring tokens, dot-notation grouping, alias resolution, and A-Z 0-9 sorting.",
        folderId: studioFolderId,
        order: 0,
        layout: "classic",
        headerBackground: "transparent",
        showTableOfContents: true,
        isPublished: true,
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: "b_tw_intro",
            type: "paragraph",
            content: "The Tokens Workspace provides a responsive data grid with resizable columns, category tabs, and dual-mode editing (visual table vs raw JSON code editor).",
          },
          {
            id: "b_tw_callout",
            type: "callout",
            content: "Universal A-Z, 0-9 Collation: Token names and resolved values sort alphabetically before digits. Numeric segments sort naturally by magnitude (0px < 1px < 10px < 48px < 999px).",
            settings: {
              calloutVariant: "info",
            },
          },
          {
            id: "b_tw_table",
            type: "tokens-table",
            settings: {
              filterType: "all",
              showSearchBox: true,
              sortField: "value",
              sortOrder: "asc",
            },
          },
        ],
      },
      {
        id: "page_figma_variables",
        title: "Figma Variables & Sync",
        slug: "figma-variables",
        description: "Bi-directional variable synchronization, mode inspection, and CSS generation.",
        folderId: studioFolderId,
        order: 1,
        layout: "classic",
        headerBackground: "transparent",
        showTableOfContents: true,
        isPublished: true,
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: "b_fv_intro",
            type: "paragraph",
            content: "Variables imported from Figma collections maintain exact mode matrices (e.g. Light, Dark, Desktop, Mobile) and support 1-click CSS variable copying.",
          },
          {
            id: "b_fv_table",
            type: "variables-table",
            settings: {
              filterType: "all",
              showSearchBox: true,
            },
          },
        ],
      },
      {
        id: "page_schema_marketplace",
        title: "Schema Marketplace & Registry",
        slug: "schema-marketplace",
        description: "182 self-hosted DTCG schemas, color spaces, math functions, and dynamic local APIs.",
        folderId: platformFolderId,
        order: 0,
        layout: "classic",
        headerBackground: "transparent",
        showTableOfContents: true,
        isPublished: true,
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: "b_sm_callout",
            type: "callout",
            content: "All schemas are 100% self-hosted under /api/v1/schemas/*. Third-party domain dependencies and copyright risks are entirely eliminated.",
            settings: {
              calloutVariant: "success",
            },
          },
          {
            id: "b_sm_intro",
            type: "paragraph",
            content: "Explore 41 Color Spaces (OKLCH, Display P3, HCT), 81 Functions (APCA, WCAG 2.1, harmonize, gamut mapping), and 60 Core Utilities directly in the Schema Marketplace.",
          },
        ],
      },
      {
        id: "page_exporters_releases",
        title: "Exporters & Releases",
        slug: "exporters-releases",
        description: "Multi-platform code generators, ZIP bundles, Semver releases, and changelogs.",
        folderId: platformFolderId,
        order: 1,
        layout: "classic",
        headerBackground: "transparent",
        showTableOfContents: true,
        isPublished: true,
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: "b_er_intro",
            type: "paragraph",
            content: "Export tokens in production formats: DTCG 2025.10 JSON, Tailwind CSS, CSS custom properties, SCSS, Style Dictionary, iOS SwiftUI, Android Jetpack Compose, and Flutter Dart.",
          },
          {
            id: "b_er_callout",
            type: "callout",
            content: "Publishing a release snapshots and freezes the current living documentation, ensuring that every published version maintains an exact historical record of token specifications.",
            settings: {
              calloutVariant: "info",
            },
          },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  };
};

