import { SystemChangelogEntry } from "@/types/changelog";

export const SYSTEM_CHANGELOG: SystemChangelogEntry[] = [
  {
    version: "v1.4.0",
    releaseDate: "September 14, 2026",
    title: "Unified Schema Marketplace, Self-Hosted JSON Schemas & Large-Scale Token Performance Engine",
    badge: "Feature Release",
    badgeVariant: "success",
    isLatest: true,
    summary:
      "Launched the Schema Marketplace with 182 self-hosted design token schemas across Core & Utilities, Color Spaces, and Functions. Added dynamic schema endpoints, per-project extension toggling, a reference-designed inspector modal with zero external dependencies, and progressive infinite scrolling for large repositories (13,000+ tokens).",
    highlights: [
      "Unified single-page Schema Marketplace with centered layout, live search, category pills, and instant Enable/Disable controls.",
      "Comprehensive catalog of 182 schemas matching modern token specifications across 41 Color Spaces (OKLCH, OKLab, Display P3, HCT), 81 Functions (APCA, WCAG 2.1, harmonize), and 60 Core Utilities.",
      "100% self-hosted schema endpoints (/api/v1/schemas/*) serving valid JSON Schema draft 2020-12 documents with zero third-party domain dependencies.",
      "Reference-accurate dark theme inspection dialog matching Tokens Studio aesthetics with copyable schema URLs and no scrollbar clutter.",
      "Per-project extension persistence in Cloud Firestore integrated with Zustand state.",
      "Progressive infinite scrolling and memory-efficient batching in TokensWorkspace for smooth navigation of 13,000+ tokens without browser freezing.",
      "O(1) in-memory alias indexing and cached color conversions eliminating recursive alias resolution lag.",
    ],
    items: [
      {
        title: "Unified Single-Page Schema Marketplace",
        description:
          "Integrated full extension management into a centered single page. Toggle any schema active or inactive directly from item cards, with live search and category pill filtering (All, Enabled, Color Spaces, Functions, Core & Utilities).",
        category: "feature",
        tags: ["Schemas", "Marketplace", "Extensions", "UI"],
      },
      {
        title: "182 Self-Hosted Design Token Schemas",
        description:
          "Full catalog covering 41 color spaces (OKLCH, OKLab, P3, HCT, etc.), 81 color and math functions (APCA, contrast ratios, decay curves, gamut mapping), and 60 core types and platform-target serializers.",
        category: "feature",
        tags: ["Color Spaces", "Functions", "OKLCH", "APCA", "DTCG"],
      },
      {
        title: "Self-Hosted JSON Schema Registry API",
        description:
          "Built private, local /api/v1/schemas endpoints serving valid draft 2020-12 JSON Schema definitions with dynamic origin resolution, eliminating all external copyright risks and third-party domain dependencies.",
        category: "feature",
        tags: ["JSON Schema", "REST API", "Self-Hosted", "Enterprise"],
      },
      {
        title: "Reference-Designed Inspector Modal",
        description:
          "Implemented a dark-themed extension inspector matching Tokens Studio visual design with category/status pills, rotated link icon, monospace URL box, one-click copy, and zero scrollbar clipping.",
        category: "feature",
        tags: ["Inspector", "Modal", "UI Design"],
      },
      {
        title: "Multi-Tenant Project Schema Persistence",
        description:
          "Project-scoped schema activation stored directly in Cloud Firestore (enabledSchemas), providing governance over allowed token types per project.",
        category: "feature",
        tags: ["Multi-Tenant", "Firestore", "Governance"],
      },
      {
        title: "Large-Scale Token Performance Optimization",
        description:
          "Added progressive infinite scrolling with batch loading (100 tokens per batch) in TokensWorkspace, O(1) in-memory alias lookup index, fast color cache, and lightweight localStorage caching for 13,000+ token repositories.",
        category: "enhancement",
        tags: ["Infinite Scroll", "Optimization", "Caching", "Performance"],
      },
    ],
  },
  {
    version: "v1.3.0",
    releaseDate: "September 13, 2026",
    title: "Figma Second Screen Plugin, Data Grid Engine & Multi-Tenant Architecture",
    badge: "Feature Release",
    badgeVariant: "violet",
    isLatest: false,
    summary:
      "Launched the Figma Second Screen companion plugin, interactive tokens data grid with column resizing, multi-tenant workspace/project lifecycle management with danger zone controls, strict duplicate name validation, zero-preset project initialization, and native branching.",
    highlights: [
      "Figma Second Screen companion plugin with dedicated React UI and 1-click token pairing.",
      "Interactive tokens data grid with resizable columns, category grouping, and dual-mode JSON editor.",
      "Multi-tenant workspace and project management with Active vs Archived tabs and fast switching.",
      "Project Settings view with Danger Zone controls: non-destructive archive and permanent deletion.",
      "Strict duplicate name validation: globally unique organization names and org-scoped unique project names.",
      "Zero-preset initialization: newly created projects start 100% clean with zero seeded tokens or mock IDs.",
      "Removed demo workspace and demo login fallbacks from authentication gateway for secure, real user onboarding.",
      "Project branch management with timeline commit history and branch switching.",
    ],
    items: [
      {
        title: "Figma Second Screen Companion Plugin",
        description:
          "Standalone Figma plugin with a high-performance React + Tailwind interface that connects live canvas variables, color collections, and text styles directly to the token studio via secure pairing APIs.",
        category: "integration",
        tags: ["Figma", "Plugin", "Variables", "Pairing"],
      },
      {
        title: "Interactive Tokens Data Grid with Resizable Columns",
        description:
          "Engineered an interactive table workspace with draggable column dividers, dot-path grouping, search filtering, and seamless toggling between formatted table view and JSON code editor.",
        category: "feature",
        tags: ["Data Grid", "Tokens", "Resizable Columns", "JSON"],
      },
      {
        title: "Multi-Tenant Workspace & Project Management",
        description:
          "Complete multi-tenant workspace system allowing creation of organizations with custom icons/colors, project directories, and rapid workspace switching.",
        category: "feature",
        tags: ["Workspaces", "Organizations", "Multi-Tenant"],
      },
      {
        title: "Project Lifecycle & Danger Zone",
        description:
          "Project profile settings with name, slug, description, and base permissions, alongside non-destructive project archiving (read-only freeze) and permanent deletion with two-step confirmation.",
        category: "feature",
        tags: ["Settings", "Archiving", "Deletion", "Danger Zone"],
      },
      {
        title: "Strict Duplicate Name Validation & Collision Guards",
        description:
          "Enforced global uniqueness for organization names and slugs, and organization-scoped uniqueness for project names (allowing cross-org sharing). Supported by real-time inline alerts in all modals.",
        category: "security",
        tags: ["Validation", "Uniqueness", "Collision Prevention"],
      },
      {
        title: "Zero-Preset Clean Project Initialization",
        description:
          "Purged all hardcoded starter token fallbacks and mock Figma collection IDs. Newly created projects under any organization start entirely blank with zero seeded tokens.",
        category: "enhancement",
        tags: ["Clean Slate", "Initialization", "Zero Presets"],
      },
      {
        title: "Project Branches & Version Control",
        description:
          "Native branch management system supporting multiple development branches (main, staging, dev), commit history inspection, and branch merging workflows.",
        category: "feature",
        tags: ["Branches", "Git", "Versioning"],
      },
    ],
  },
  {
    version: "v1.2.3",
    releaseDate: "September 6, 2026",
    title: "Living Documentation Studio, Live Design Tokens & Multi-Page Publishing",
    badge: "Feature Release",
    badgeVariant: "success",
    isLatest: false,
    summary:
      "Introduced an interactive 3-panel Living Documentation Studio with folder and page hierarchies, live design token & variable table/swatch blocks, Do's & Don'ts cards, slash command menu, contextual inspector, first-load onboarding, and granular public publishing.",
    highlights: [
      "Interactive 3-panel living documentation editor with left navigation tree, central canvas, and inspector.",
      "Multi-page & folder hierarchy with inline reordering, renaming, and page creation.",
      "Live connected Figma variables and token blocks (Variables Table, Color Swatches, Typography Specimens, Tokens Table).",
      "Do's & Don'ts guideline comparison cards with side-by-side visual recommendations.",
      "Slash command menu (`/`) for rapid block insertion across 8 content types.",
      "Contextual page inspector with header background swatches, layout modes, TOC toggle, and live variable filtering.",
      "Public documentation reader route (`/docs/[orgSlug]/[projectSlug]`) with one-click publishing and per-page visibility toggles.",
      "Clean first-load onboarding guide with starter templates and zero auto-seeded clutter.",
    ],
    items: [
      {
        title: "Living Documentation Studio",
        description:
          "Full-featured documentation workspace integrated directly into the platform with folder organization, sub-pages, live markdown editing, and real-time design system connection.",
        category: "feature",
        tags: ["Documentation", "Studio", "Markdown"],
      },
      {
        title: "Live Token & Variable Blocks",
        description:
          "Directly embed Figma variables and design tokens into living docs with live color swatches, tabular multi-mode values, typography specimens, and one-click CSS variable copy actions.",
        category: "feature",
        tags: ["Variables", "Tokens", "Swatches", "Live Blocks"],
      },
      {
        title: "Do's & Don'ts Comparison Cards",
        description:
          "Clear visual design guideline cards comparing best practices (green check) vs anti-patterns (red cross) to enforce design system consistency.",
        category: "feature",
        tags: ["Guidelines", "Best Practices", "Design System"],
      },
      {
        title: "Slash Command Menu (`/`)",
        description:
          "Trigger a keyboard-navigable slash command popover anywhere in the doc to instantly insert text, headings, variables, swatches, tokens, callouts, or guidelines.",
        category: "ui",
        tags: ["Shortcuts", "Slash Command", "UX"],
      },
      {
        title: "Contextual Page Inspector & Theming",
        description:
          "Right-side drawer to customize canvas header color swatches (emerald, violet, amber, etc.), layout modes (Classic, Hero, Feature), table of contents, and variable filtering rules.",
        category: "ui",
        tags: ["Inspector", "Theming", "Layout"],
      },
      {
        title: "Granular Public Publishing",
        description:
          "Publish entire documentation portals to a clean public reader URL (`/docs/...`) with granular per-page public/private visibility toggles.",
        category: "integration",
        tags: ["Publishing", "Public Docs", "Sharing"],
      },
      {
        title: "First-Load Onboarding & Clean Start",
        description:
          "Ensured first-time project loads start clean without mock data, providing a 4-step quick guide, quick page creation CTA, and optional Foundations starter template.",
        category: "enhancement",
        tags: ["Onboarding", "Templates", "UX"],
      },
    ],
  },
  {
    version: "v1.2.1",
    releaseDate: "September 6, 2026",
    title: "Real-Time User Activity Audit Logs & Smart Git Asset Sync",
    badge: "Enhancement",
    badgeVariant: "secondary",
    isLatest: false,
    summary:
      "Added cross-team real-time User Activity Audit Logging via Firestore, full event tracking across tokens and assets, and dynamic dual-path Git icon synchronization.",
    highlights: [
      "Authentic cross-team User Activity Log powered by Cloud Firestore (`organizations/{orgId}/activities`).",
      "Full event tracking across token mutations, theme creation, releases, vector asset uploads, and member management.",
      "Dynamic Git sync supporting both `assets/icons` and `assets/icons/svg` with parent `metadata.json` automatic resolution.",
      "High-scale asset ingestion expanded to 5,000 items with Azure DevOps chunking.",
      "Modernized UI with Assets filter tab, role pills, project badges, and exact ISO timestamp tooltips.",
    ],
    items: [
      {
        title: "Cross-Team User Activity Audit Logs",
        description:
          "Completely eliminated dummy/mock fallback logs in favor of a shared Firestore audit collection, enabling all team members in an organization to see who modified tokens, created releases, or updated assets in real time.",
        category: "feature",
        tags: ["Audit Log", "Firestore", "Team"],
      },
      {
        title: "Comprehensive Platform Event Triggers",
        description:
          "Instrumented automatic activity logging across token edits, theme option creation, package releases, vector asset uploads/updates/deletions, Git asset syncs, Figma source syncs, and team invitations.",
        category: "enhancement",
        tags: ["Tokens", "Assets", "Git", "Figma", "Releases"],
      },
      {
        title: "Dynamic Dual-Path Git Icon Sync",
        description:
          "Added automatic resolution for both `assets/icons` and `assets/icons/svg` structures with recursive parent folder lookups for `metadata.json` and subfolder format stripping.",
        category: "integration",
        tags: ["Git", "Icons", "Azure DevOps", "GitHub"],
      },
      {
        title: "High-Scale Icon Processing",
        description:
          "Expanded Git asset retrieval limit to 5,000 items with batched Azure DevOps requests to seamlessly handle repositories with 1,380+ vector icons without timeouts.",
        category: "enhancement",
        tags: ["Performance", "Azure DevOps"],
      },
      {
        title: "Modernized Activity Log UX",
        description:
          "Added dedicated Assets category filter, actor role badges, project tags, contextual metadata badges (old vs new values, commit SHAs, release versions), and hover datetime tooltips.",
        category: "ui",
        tags: ["UI", "Accessibility", "UX"],
      },
    ],
  },
  {
    version: "v1.2.0",
    releaseDate: "September 1, 2026",
    title: "Dynamic Git Path Scoping & Git Log Tracking",
    badge: "Feature Release",
    badgeVariant: "violet",
    isLatest: false,
    summary:
      "Added dynamic repository path scoping for Git commit histories, path-filtered change detection, and dedicated system changelog tracking.",
    highlights: [
      "Dynamic path scoping (`assets/tokens/` or custom folder) for Git commit history.",
      "Smart remote update detection scoped to configured token files.",
      "Dedicated System Changelog workspace to track platform releases.",
    ],
    items: [
      {
        title: "Dynamic Path Scoping for Git History",
        description:
          "Commit history and side-by-side file diffs are now filtered dynamically based on the exact path configured in your project Git settings (e.g. `assets/tokens/`, `tokens.json`, or custom subfolders), skipping all non-token commits.",
        category: "feature",
        tags: ["Git", "Tokens", "Performance"],
      },
      {
        title: "Scoped Remote Update Checking",
        description:
          "Remote update notifications ('New Remote Commits Detected') now only trigger when changes happen within your configured token directory.",
        category: "enhancement",
        tags: ["Git", "Notifications"],
      },
      {
        title: "Dedicated System Changelog Workspace",
        description:
          "Explore platform version releases, categorized feature additions, performance enhancements, and bug fixes directly from the sidebar.",
        category: "feature",
        tags: ["Changelog", "UI"],
      },
      {
        title: "Multi-Provider Path Query Normalization",
        description:
          "Standardized path parameters across GitHub, Azure DevOps (`searchCriteria.itemPath`), GitLab, and Bitbucket Cloud.",
        category: "integration",
        tags: ["GitHub", "Azure DevOps", "GitLab", "Bitbucket"],
      },
    ],
  },
  {
    version: "v1.1.0",
    releaseDate: "August 24, 2026",
    title: "Multi-Platform Code Compiler & Distribution Targets",
    badge: "Major Release",
    badgeVariant: "default",
    isLatest: false,
    summary:
      "Automated multi-platform compilation supporting Tailwind CSS, React TypeScript, Flutter Dart, iOS Swift, and Android XML with direct multi-repo distribution.",
    highlights: [
      "Multi-platform token compilation to 6 target systems simultaneously.",
      "Automated distribution targets with direct Git push or PR creation.",
      "Customizable compiler settings: name transforms, units, and class prefixes.",
    ],
    items: [
      {
        title: "Multi-Platform Token Compiler",
        description:
          "Compile tokens into Tailwind CSS configs, CSS variables, React TypeScript types, Flutter Dart classes, iOS Swift structs, and Android XML resources with one click.",
        category: "feature",
        tags: ["Compiler", "Tailwind", "Flutter", "iOS", "Android"],
      },
      {
        title: "Automated Distribution Targets",
        description:
          "Push compiled token artifacts across multiple connected web, iOS, and Android repositories via direct commits or automated Pull Requests.",
        category: "feature",
        tags: ["Distribution", "Multi-Repo", "CI/CD"],
      },
      {
        title: "Configurable Style Dictionary Transforms",
        description:
          "Configure case formatting (kebab, camel, snake, pascal), root font size (rem/px), and alias reference resolution.",
        category: "enhancement",
        tags: ["Compiler", "Style Dictionary"],
      },
      {
        title: "Semantic Versioning Release Packages",
        description:
          "Package tokens into immutable semantic versions (+Major, +Minor, +Patch) with full changelog notes and target system summaries.",
        category: "feature",
        tags: ["Releases", "SemVer"],
      },
    ],
  },
  {
    version: "v1.0.0",
    releaseDate: "August 10, 2026",
    title: "Official Platform Launch: Figma Sync & Visual Token Studio",
    badge: "Major Release",
    badgeVariant: "success",
    isLatest: false,
    summary:
      "Initial production release featuring Figma companion plugin synchronization, two-way Git syncing, theme matrix comparison grid, and visual token dependency graph.",
    highlights: [
      "Two-way synchronization with Figma companion plugin via 6-digit pair codes.",
      "Visual theme matrix comparison grid and token dependency flow graph.",
      "W3C DTCG standard compliance with cross-file alias resolution.",
    ],
    items: [
      {
        title: "Figma Companion Plugin Integration",
        description:
          "Pair your desktop Figma canvas in seconds using a 6-digit code. Push and pull 2,400+ variables with zero manual JSON export.",
        category: "feature",
        tags: ["Figma", "Plugin", "Sync"],
      },
      {
        title: "Two-Way Git Version Control",
        description:
          "Connect GitHub, Azure DevOps, GitLab, and Bitbucket repositories with branch switching, direct push, and side-by-side diff reviews.",
        category: "integration",
        tags: ["Git", "GitHub", "Azure DevOps"],
      },
      {
        title: "Interactive Theme Matrix & Flow Graph",
        description:
          "Compare color palettes across Light, Dark, High Contrast, and Custom brand modes in a real-time matrix or visual dependency flow graph.",
        category: "feature",
        tags: ["Themes", "Flow Graph", "Matrix"],
      },
      {
        title: "W3C DTCG Token Specification",
        description:
          "Full support for colors, typography, dimensions, spacing, border radii, shadows, and multi-level alias references.",
        category: "enhancement",
        tags: ["W3C DTCG", "Tokens"],
      },
    ],
  },
  {
    version: "v0.9.0-beta",
    releaseDate: "July 20, 2026",
    title: "Initial Beta & Cloud Architecture",
    badge: "Initial Beta",
    badgeVariant: "outline",
    isLatest: false,
    summary:
      "Early beta foundation featuring multi-tenant organization workspaces, team role management, and encrypted token storage.",
    highlights: [
      "Multi-tenant workspace architecture with project switching.",
      "Role-based access control: Owner, Admin, Editor, and Viewer.",
      "Firebase authentication and cloud persistence.",
    ],
    items: [
      {
        title: "Multi-Tenant Workspaces & Projects",
        description:
          "Create and manage isolated organizations, design projects, and team permissions with granular role-based controls.",
        category: "security",
        tags: ["Auth", "Tenancy", "RBAC"],
      },
      {
        title: "Encrypted Cloud Storage",
        description:
          "Securely store and retrieve token dictionaries with zero data leakage between organizations.",
        category: "security",
        tags: ["Cloud", "Security"],
      },
    ],
  },
];

export const LATEST_VERSION = SYSTEM_CHANGELOG[0].version;
