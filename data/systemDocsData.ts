import { SystemDocSection } from "@/types/systemDocs";

export const SYSTEM_DOCS_SECTIONS: SystemDocSection[] = [
  {
    id: "tokens-studio",
    title: "Tokens Studio & Data Grid",
    category: "Studio",
    summary:
      "Author, inspect, and organize design tokens with dot-path grouping, A-Z 0-9 collation, and alias math.",
    iconName: "Layers",
    badge: "Core Studio",
    screenshotUrl: "/docs/tokens-workspace.png",
    screenshotCaption: "Tokens Workspace featuring dot-notation set trees, resizable columns, and interactive sort headers.",
    highlights: [
      "Universal A-Z, 0-9 Collation: Letters sort before numbers; contiguous digits sort by numeric magnitude (1px < 2px < 10px < 48px < 999px).",
      "Default Resolved View: Tables initialize sorted ascending by resolved value, displaying sizing scales in natural progression.",
      "Brand Color Sequence: Unmodified base hex shades (e.g. primary.500) remain strictly ordered between primary.400 and primary.600.",
      "Alias Syntax & Math: Reference other tokens via {category.item} and evaluate dynamic arithmetic like {spacing.base} * 2.",
      "High-Scale Performance: Progressive batching renders 100 rows per batch, handling 13,000+ tokens smoothly without UI lag.",
    ],
    options: [
      {
        name: "Name Column",
        description: "Sorts token names alphabetically with numeric segments compared by value (A-Z, 0-9).",
      },
      {
        name: "Resolved Column",
        description: "Default ascending sort by unit magnitude (px, rem, ms) and perceptual color luminance.",
      },
      {
        name: "JSON Mode",
        description: "Switch between visual interactive table and raw JSON code editor.",
      },
      {
        name: "Add Token",
        description: "Modal to create tokens with type selection, dot-path naming, value, and description.",
      },
    ],
    quickLink: {
      label: "Open Tokens Studio",
      tab: "tokens",
    },
  },
  {
    id: "figma-variables",
    title: "Figma Variables & Sync",
    category: "Studio",
    summary:
      "Inspect collections, compare mode columns, copy CSS custom properties, and sync with the Figma Companion Plugin.",
    iconName: "Variable",
    badge: "Figma Sync",
    screenshotUrl: "/docs/variables-view.png",
    screenshotCaption: "Figma Variables workspace displaying collections, multi-mode columns, and 1-click CSS variable copying.",
    highlights: [
      "Collection Filtering: Filter and inspect Color, Float, String, and Boolean variables imported from Figma.",
      "Multi-Mode Columns: View and compare variable values across all modes (Light, Dark, Desktop, Mobile) side-by-side.",
      "1-Click CSS Copy: Hover any variable row to immediately copy var(--variable-name) to your clipboard.",
      "Figma Companion Plugin: Bidirectional synchronization connecting Figma canvas styles directly to studio tokens.",
    ],
    options: [
      {
        name: "Collection Filter",
        description: "Dropdown to filter variables by Figma collection (e.g. Primitives, Semantic, Sizing).",
      },
      {
        name: "Mode Columns",
        description: "Dynamic columns representing each mode configured in the Figma collection.",
      },
      {
        name: "Copy CSS",
        description: "Hover action button to copy the CSS custom property identifier.",
      },
    ],
    quickLink: {
      label: "Open Variables View",
      tab: "variables",
    },
  },
  {
    id: "brand-colors",
    title: "Brand Color Scales & Collation",
    category: "Studio",
    summary:
      "Perceptual luminance sorting (OKLCH L) and shade family sequence alignment from 50 through 950.",
    iconName: "Palette",
    badge: "Color Engine",
    screenshotUrl: "/docs/brand-colors.png",
    screenshotCaption: "Brand color scale sequence alignment preserving base shades and modifier shades in strict numeric order.",
    highlights: [
      "Perceptual Luminance: Arbitrary colors sort from light to dark by perceptual lightness (OKLCH L).",
      "Numeric Scale Sequence: Scale families (.50 to .950) order strictly by numeric index regardless of format.",
      "Modifier Preservation: Correctly balances unmodified hex base shades alongside oklch(...) calculated modifiers.",
    ],
    options: [
      {
        name: "Shade Family Extraction",
        description: "Automatically extracts numeric indices from tokens like primary.500 to maintain scale sequence.",
      },
      {
        name: "OKLCH Lightness",
        description: "Evaluates color luminance using modern perceptual color models.",
      },
    ],
    quickLink: {
      label: "Open Tokens Studio",
      tab: "tokens",
    },
  },
  {
    id: "living-docs",
    title: "Project Living Documentation",
    category: "Documentation",
    summary:
      "Interactive 3-panel documentation studio for creating live token specs and design system style guides.",
    iconName: "FileText",
    badge: "Studio Feature",
    highlights: [
      "Studio Docs vs. System Docs: Use this studio to document your project; use the sidebar bottom Docs for system manuals.",
      "9 Live Block Types: Embed live Figma variable tables, token tables, color swatches, typography scales, and code.",
      "Public Web Sharing: Publish documentation to a standalone public URL at /docs/{orgSlug}/{projectSlug}.",
      "Markdown Export: Download clean GitHub-compatible Markdown files with alert banners.",
    ],
    options: [
      {
        name: "Doc Tree Nav",
        description: "Organize pages into section folders with inline reordering and renaming.",
      },
      {
        name: "Block Inspector",
        description: "Configure live collection filters, token sets, and block variants in the right-hand panel.",
      },
      {
        name: "Publish Modal",
        description: "Manage public reader URLs and public access toggles.",
      },
    ],
    quickLink: {
      label: "Open Studio Docs",
      tab: "documentation",
    },
  },
  {
    id: "themes",
    title: "Themes & Multi-Mode Matrix",
    category: "Studio",
    summary:
      "Configure multi-dimensional theme axes (Mode, Brand, Density) and audit contrast ratios.",
    iconName: "Sliders",
    badge: "Multi-Mode",
    highlights: [
      "Theme Groups: Define axes of variation such as Color Mode (Light/Dark) and Brand (Brand A/Brand B).",
      "Set Mapping: Specify which token sets are activated and prioritized for each theme mode.",
      "Side-by-Side Matrix: Compare resolved tokens across modes in parallel columns.",
      "Contrast Audits: Automatic WCAG 2.1 AA/AAA and APCA contrast ratio validation.",
    ],
    options: [
      {
        name: "Theme Groups",
        description: "Add and configure independent variation axes for your design system.",
      },
      {
        name: "Matrix View",
        description: "Compare multi-mode tokens side by side across themes.",
      },
    ],
    quickLink: {
      label: "Open Themes Studio",
      tab: "themes",
    },
  },
  {
    id: "schema-marketplace",
    title: "Schema Marketplace & Registry",
    category: "Platform",
    summary:
      "182 self-hosted token schemas across Color Spaces, Functions, and Core Utilities with local REST APIs.",
    iconName: "Lightbulb",
    badge: "182 Schemas",
    highlights: [
      "Zero External Dependencies: All 182 schemas are self-hosted under /api/v1/schemas/* with no third-party tracking.",
      "Per-Project Toggling: Enable or disable specific schemas per project with project-level persistence.",
      "Draft 2020-12 REST APIs: Valid JSON Schema endpoints resolving dynamically to your application origin.",
      "Inspector Dialog: Dark-themed inspector with copyable local schema URLs and schema tree viewer.",
    ],
    options: [
      {
        name: "Category Pills",
        description: "Filter by All, Enabled, Color Spaces, Functions, and Core Utilities.",
      },
      {
        name: "Enable/Disable",
        description: "1-click toggle on cards to activate schemas for the current project.",
      },
    ],
    quickLink: {
      label: "Open Schema Marketplace",
      tab: "extensions",
    },
  },
  {
    id: "exporters",
    title: "Multi-Platform Exporters",
    category: "Platform",
    summary:
      "Export tokens for Web, iOS SwiftUI, Android Jetpack Compose, Flutter, and Tailwind.",
    iconName: "Download",
    badge: "Cross-Platform",
    highlights: [
      "Cross-Platform: Generate production-ready code for 8 targets in 1 click.",
      "DTCG 2025.10 Parity: Full compatibility with modern W3C Design Tokens Community Group standard.",
      "ZIP Bundles: Download organized ZIP archives containing all selected format packages.",
    ],
    options: [
      {
        name: "Format Selection",
        description: "Select DTCG, Tailwind, CSS, SCSS, Style Dictionary, SwiftUI, Compose, or Flutter.",
      },
      {
        name: "Include Multi-Theme",
        description: "Generates scoped CSS classes (.theme-dark) for multi-mode setups.",
      },
    ],
    quickLink: {
      label: "Open Exporters",
      tab: "exports",
    },
  },
  {
    id: "git-sync",
    title: "Version Control & Git Sync",
    category: "Platform",
    summary:
      "Dual-engine versioning: Native branch management or direct Git provider synchronization.",
    iconName: "GitBranch",
    badge: "Dual-Engine",
    highlights: [
      "External Git Sync: Connect GitHub, Azure DevOps, GitLab, or Bitbucket via Personal Access Tokens.",
      "Granular Path Scoping: Restrict synchronization strictly to specific token paths (e.g. tokens/tokens.json).",
      "Native Branching: Create branches, track commit history, and merge changes without external Git.",
      "Diff Inspector: Review line-by-line additions and deletions before pushing or pulling.",
    ],
    options: [
      {
        name: "Provider Auth",
        description: "Enter PAT tokens with repo read/write scopes.",
      },
      {
        name: "File Path",
        description: "Scoped repository path for token file persistence.",
      },
    ],
    quickLink: {
      label: "Open Git Sync",
      tab: "project-settings",
    },
  },
  {
    id: "releases-changelog",
    title: "Releases & System Changelog",
    category: "Platform",
    summary:
      "Semver release packaging, documentation freezing, and in-app platform change logs.",
    iconName: "Package",
    badge: "Versioning",
    highlights: [
      "Semver Packaging: Create Major, Minor, and Patch releases with automated changelog generation.",
      "Release-Coupled Docs: Automatically snapshot documentation for historical version integrity.",
      "System Changelog: Track platform feature releases, enhancements, and hotfixes in the footer.",
    ],
    options: [
      {
        name: "New Release",
        description: "Semver version bump wizard with markdown release notes.",
      },
      {
        name: "Changelog",
        description: "In-app version release history and release badges.",
      },
    ],
    quickLink: {
      label: "Open Releases",
      tab: "releases",
    },
  },
  {
    id: "developer-mcp",
    title: "Developer APIs & MCP Server",
    category: "Developer Tools",
    summary:
      "Embedded Model Context Protocol server for AI coding assistants and headless REST APIs.",
    iconName: "Code2",
    badge: "AI & APIs",
    highlights: [
      "Embedded MCP: Connect AI assistants (Antigravity, Claude, Cursor) to list and update tokens.",
      "Headless REST APIs: Query /api/v1/tokens in CI/CD pipelines without browser overhead.",
      "Local Registry: Host your own Draft 2020-12 schema registry with zero third-party tracking.",
    ],
    options: [
      {
        name: "MCP Server",
        description: "Bridge for agentic AI tools to inspect and modify tokens.",
      },
      {
        name: "REST API",
        description: "Token retrieval and publication endpoints for automation.",
      },
    ],
    quickLink: {
      label: "Open MCP & CLI",
      tab: "mcp",
    },
  },
];
