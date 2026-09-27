# Second Screen / Tokens Platform: Comprehensive System Guide & Operations Manual

This document provides a complete, option-by-option reference and operational guide for the **Second Screen / Tokens Platform**. It covers every module, screen, modal, control, setting, and integration workflow across the application.

---

## Table of Contents
1. [System Architecture & Core Principles](#1-system-architecture--core-principles)
2. [Workspaces, Organizations & Project Tenancy](#2-workspaces-organizations--project-tenancy)
3. [Studio: Tokens Workspace & Data Grid](#3-studio-tokens-workspace--data-grid)
4. [Studio: Themes & Multi-Mode Matrix](#4-studio-themes--multi-mode-matrix)
5. [Studio: Living Documentation Studio ("Docs")](#5-studio-living-documentation-studio-docs)
6. [Studio: Figma Variables & Companion Plugin](#6-studio-figma-variables--companion-plugin)
7. [Studio: Schema Marketplace & Local Registry](#7-studio-schema-marketplace--local-registry)
8. [Studio: Assets & Multi-Platform Exporters](#8-studio-assets--multi-platform-exporters)
9. [Version Control: Native Branching & Git Provider Sync](#9-version-control-native-branching--git-provider-sync)
10. [Releases & In-App Changelog System](#10-releases--in-app-changelog-system)
11. [Developer APIs, Local Schemas & MCP Server](#11-developer-apis-local-schemas--mcp-server)

---

## 1. System Architecture & Core Principles

The Second Screen platform is designed for enterprise design systems requiring high performance, strict data privacy, multi-tenant isolation, and bidirectional synchronization across design (Figma) and code (Web, Mobile, Cloud).

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SECOND SCREEN PLATFORM                                │
├────────────────────────┬─────────────────────────┬──────────────────────────────┤
│  Studio Layer          │  Living Docs Layer      │  Sync & Delivery Layer       │
│  - Tokens Data Grid    │  - 3-Panel Doc Studio   │  - Figma Companion Plugin    │
│  - Themes Matrix       │  - Live Connected Blocks│  - Git Sync (GitHub / Azure) │
│  - Figma Variables     │  - Public Reader Route  │  - Multi-Platform Exporters  │
│  - Schema Marketplace  │  - Markdown Exporter    │  - Local Draft 2020-12 API   │
└────────────────────────┴─────────────────────────┴──────────────────────────────┘
```

### Core Invariants
- **Zero Third-Party Schema Dependencies**: All schema definitions, validation references, and endpoints (`/api/v1/schemas/*`) are 100% self-hosted and dynamically resolved to the current host origin.
- **Natural Progression by Default**: Numeric dimensions and scales default to ascending resolved value order (`0px` ➔ `999px`) across all grids and trees.
- **Enterprise Scale**: High-scale architecture with memoized rows, $O(1)$ alias indices, and progressive infinite scrolling capable of handling 13,000+ tokens without thread blocking.

---

## 2. Workspaces, Organizations & Project Tenancy

### Organization Management
The organization represents the top-level boundary for billing, users, brand identity, and projects.

| Option / Setting | Location | Description & Behavior |
| :--- | :--- | :--- |
| **Organization Switcher** | Header & Sidebar top | Dropdown allowing rapid switching between organizations you belong to. |
| **Create Organization** | Organization Dropdown | Opens modal to create a new organization with custom name, URL slug, and brand color. |
| **Organization Name** | Create Org Modal / Settings | Display name of the organization. Must be globally unique across the platform. |
| **Organization Slug** | Create Org Modal / Settings | URL-safe identifier (e.g., `acme-corp`). Auto-generated from name; editable before creation. |
| **Brand Color & Icon** | Create Org Modal / Settings | Custom accent color and icon displayed in the header badge and workspace cards. |
| **Members & Roles** | Settings ➔ Members | Add team members by email. Roles: `Owner` (full access & billing), `Admin` (manage projects & settings), `Member` (read/write studio tokens), `Viewer` (read-only). |

### Project Directory & Lifecycle Management
Projects reside within organizations and hold token sets, theme configurations, branches, and documentation.

| Option / Setting | Location | Description & Behavior |
| :--- | :--- | :--- |
| **Projects Tab** | Sidebar ➔ Projects | Grid view of all projects in the active organization, separated into **Active** and **Archived**. |
| **Create Project** | Projects View | Opens modal to instantiate a new project. Enforces organization-scoped unique names. |
| **Zero-Preset Slate** | System default | Newly created projects start completely empty with zero seeded tokens, preventing unwanted dummy data. |
| **Active vs. Archived** | Projects View filter | Toggle between active projects and frozen/read-only archived projects. |
| **Project Settings** | Sidebar ➔ Project Settings | Configure project name, description, repository path scoping, and default permissions. |
| **Archive Project** | Project Settings ➔ Danger Zone | Freezes the project into read-only status. Can be unarchived at any time without data loss. |
| **Delete Project** | Project Settings ➔ Danger Zone | Permanently deletes project, token sets, branches, and documentation. Requires two-step name confirmation. |

---

## 3. Studio: Tokens Workspace & Data Grid

The **Tokens Workspace** (`components/TokensWorkspace.tsx`) is the central studio for authoring, grouping, resolving, and inspecting design tokens.

### View Modes & Navigation
- **Table View**: Interactive data grid with resizable columns, category grouping, and sorting.
- **JSON Editor**: Code editor with live syntax validation and format formatting for direct raw JSON manipulation.
- **Secondary Sidebar (Token Sets)**: Tree view showing all token sets (e.g. `global`, `semantic/light`, `semantic/dark`, `brand/core`). Supports adding, renaming, reordering, and deleting token sets.

### Data Grid Columns & Interactive Sorting

```
┌─────────────────┬──────────┬──────────────┬──────────────┬────────────────┬────────┐
│ Name            │ Type     │ Value        │ Resolved     │ Description    │ Set    │
│ [A-Z, 0-9 ↕]    │          │              │ [0-9, A-Z ↕] │                │        │
└─────────────────┴──────────┴──────────────┴──────────────┴────────────────┴────────┘
```

| Column | Interactive Controls | Sort Engine & Behavior |
| :--- | :--- | :--- |
| **Name** | Click column header to sort; Lucide icon updates (`ArrowUpAZ`, `ArrowDownAZ`, `ArrowUpDown`). | **Universal `A-Z, 0-9` Collation Engine**: Segment-based comparison where alphabetical text precedes numbers, and contiguous digits are evaluated by numeric magnitude. |
| **Type** | Filter dropdown by token type (`color`, `dimension`, `spacing`, `borderRadius`, `typography`, `boxShadow`, `opacity`). | Groups and categorizes tokens by DTCG token types. |
| **Value** | Direct inline click-to-edit or modal editor. | Displays the raw value, alias reference (e.g. `{colors.primary.500}`), or math expression (`{spacing.base} * 1.5`). |
| **Resolved** | Click column header to sort; Lucide icon updates (`ArrowUp01`, `ArrowDown01`, `ArrowUpDown`). | **Default View (Ascending)**: Numerically evaluates units (`px`, `rem`, `ms`, `%`) and colors (perceptual lightness `OKLCH L`). Sizing scales automatically display in natural progression: `0px` ➔ `1px` ➔ `2px` ➔ ... ➔ `999px`. |
| **Description** | Direct inline click-to-edit. | Human-readable documentation for token usage guidelines. |
| **Set** | Set badge indicator. | Identifies which token set the token belongs to in combined or multi-set views. |

### Token Collation & Brand Scale Rules
1. **Multi-Segment Collation**: Segments delimited by dots or hyphens are compared left-to-right. In each segment, letters precede digits (`A` < `Z` < `0` < `9`).
2. **Numeric Shade Sequence**: When tokens belong to the same parent family and end in numeric shades (e.g. `primary.50`, `primary.100`, ..., `primary.500`, ..., `primary.950`), the engine extracts the numeric index. This guarantees unmodified base hex shades (such as `primary.500` defined as `#2fa491`) remain strictly positioned between `primary.400` and `primary.600`.

### Token Authoring & Operations
- **Add Token Button**: Launches modal to select token type, enter dot-path name, value or alias, and optional description.
- **Alias Autocomplete**: Typing `{` inside the value field opens instant suggestions across all active token sets.
- **Math Evaluation**: Supports standard arithmetic (`+`, `-`, `*`, `/`) with automatic unit preservation (`{spacing.base} * 2` ➔ `32px`).
- **Progressive Batch Loading**: In-memory virtualizer renders 100 rows per batch, ensuring instantaneous scrolling and low memory overhead even with 13,000+ tokens.

---

## 4. Studio: Themes & Multi-Mode Matrix

The **Themes Studio** (`components/ThemeMatrix.tsx` and `components/ThemeConfigurationView.tsx`) manages multi-dimensional theme combinations (Modes, Brands, Viewports).

### Core Concepts
- **Theme Groups**: Dimensions of variation (e.g., `Theme Group: Mode` containing `Light` and `Dark`; `Theme Group: Brand` containing `Brand A` and `Brand B`).
- **Set Mapping**: Each mode in a theme group specifies which token sets are enabled and which set takes priority during alias resolution.

### Options & Workflows
| Feature / Option | Description & Operational Behavior |
| :--- | :--- |
| **Add Theme Group** | Creates a new variation axis (e.g., `Color Mode`, `Density`, `Platform`). |
| **Add Mode / Theme** | Adds an option within a theme group (e.g., `High Contrast`, `Compact`). |
| **Active Sets Configuration** | Checkbox list mapping which token sets are active under the selected mode. |
| **Theme Matrix View** | Multi-column table rendering resolved values side-by-side across all active theme combinations (e.g. `Light` vs `Dark`). |
| **Contrast Audit Matrix** | Evaluates color contrast ratios (WCAG 2.1 AA/AAA and APCA) between foreground text tokens and background tokens across modes. |

---

## 5. Studio: Living Documentation Studio ("Docs")

The **Living Documentation Studio** (`components/DocumentationView.tsx`) allows design system teams to author interactive, production-grade documentation directly connected to tokens and Figma variables.

```
┌──────────────────┬─────────────────────────────────────┬──────────────────┐
│ Tree Navigation  │ Dynamic Canvas                      │ Block Inspector  │
│ - Folders        │ - Page Title & Description          │ - Type Settings  │
│ - Pages          │ - Live Connected Blocks             │ - Filters & Set  │
│ - New Section    │ - Slash Menu (/)                    │ - Visual Options │
└──────────────────┴─────────────────────────────────────┴──────────────────┘
```

### 1. Navigation Panel (Left)
- **Sections / Folders**: Group related pages together (e.g., `Foundations`, `Components`, `Guidelines`).
- **Page Tree**: Reorder pages via drag-and-drop or action menus. Add pages to the root or nested within folders.
- **Page Status Indicator**: Green checkmark for published pages; gray outline for drafts.

### 2. Page Canvas & Layout Settings (Center)
- **Page Layout**:
  - `classic`: Standard editorial layout with central column and optional right-hand table of contents.
  - `hero`: Full-width colored or gradient hero header with prominent title and description.
  - `feature`: Grid-oriented showcase layout for components and token sets.
- **Header Background**: Select solid dark neutrals (`#09090d`, `#121316`), brand accents, or curated gradients (Violet, Ocean, Sunset).
- **Table of Contents**: Toggle right-side floating table of contents generated dynamically from page heading blocks.
- **Slash Menu (`/`)**: Type `/` on any blank line to summon the quick-insert block menu.

### 3. The 9 Specialized Block Types

| Block Type | Output & Purpose | Inspector Configuration Options |
| :--- | :--- | :--- |
| **1. Heading** | Page structure (`H1`, `H2`, `H3`). Generates TOC anchor links. | Heading Level: `1`, `2`, `3`. |
| **2. Paragraph** | Body text with markdown formatting (bold, italic, links, lists). | Text content field with markdown support. |
| **3. Callout** | Highlighted informational banners with icons. | Variant: `info` (blue), `success` (green), `warning` (amber), `error` (red). |
| **4. Do's & Don'ts** | Side-by-side design practice comparison cards. | Left column (Do text & green check) and Right column (Don't text & red X). |
| **5. Variables Table** | Live connected table of Figma variables. Automatically updates on sync. | Collection filter, Mode column toggles, Type filter (`all`, `color`, `float`), Search box toggle, Sort by `Name` or `Value`. |
| **6. Color Swatches** | Visual color grid displaying swatches with alpha checkerboard backgrounds. | Collection filter, color mode selector, copy format (HEX, RGB, OKLCH). |
| **7. Typography Scale** | Live font specimens with sample text, font size, weight, and line-height. | Collection filter, preview sample text string, unit display format. |
| **8. Tokens Table** | Live connected table of design tokens from any token set. | Token Set selector (`global`, `brand`, etc.), Type filter, Sort column (`name`, `resolved`), Sort direction (`asc`, `desc`). |
| **9. Code Block** | Syntax-highlighted code specimen with 1-click copy button. | Language selector (`css`, `json`, `typescript`, `swift`, `kotlin`), code content. |

### 4. Inspector Panel (Right)
- **Block Inspector**: Contextually updates based on the currently selected block. Adjusts filters, collection bindings, sort fields, and variant styles.
- **Page Inspector**: Configures page metadata (Title, Slug, Description, Layout, Header Styling).

### 5. Publishing & Public Distribution
- **Publish Page Toggle**: Toggles draft vs live state for individual pages.
- **Publish Entire Documentation**: Publishes the complete documentation bundle with a snapshot of current tokens and variables.
- **Public URL**: Generates a clean URL (`/docs/{orgSlug}/{projectSlug}`) accessible to public viewers or restricted to authenticated organization members via the **Allow Public Access** switch.
- **Export Markdown**: Downloads the active documentation page as a clean `.md` document with GitHub-compatible alert blocks.

---

## 6. Studio: Figma Variables & Companion Plugin

The **Figma Variables Studio** (`components/VariablesView.tsx`) connects directly to Figma's Variables API via the Second Screen Companion Plugin.

### Features & Controls
- **Collection Filter**: Dropdown filtering variables by Figma collection (e.g. `Primitives`, `Semantic`, `Spacing`).
- **Type Filter**: Filter by `Color`, `Float`, `String`, or `Boolean`.
- **Modes Grid**: Dynamically displays columns for each mode defined in the Figma collection (e.g. `Mode 1`, `Dark`, `Desktop`).
- **Instant CSS Variable Copy**: Hovering any variable displays a `Copy CSS` button copying `var(--variable-name)`.
- **Interactive Collation**: Sort by Collection name, Variable Name (`A-Z, 0-9`), and Resolved Value with Lucide directional icons.

### Companion Plugin Workflow
1. **Download / Install**: Obtain the plugin from `plugin/` or the in-app download link (`/api/v1/plugin/download`).
2. **Pairing**: In Figma, open the plugin and click "Pair with Platform". Enter the 6-digit code into the platform's **Integrations ➔ Figma** screen.
3. **Pull Variables**: Import all local collections and variables from Figma into the platform in one click.
4. **Push Tokens**: Write studio tokens back into Figma as native variables and text styles.

---

## 7. Studio: Schema Marketplace & Local Registry

The **Schema Marketplace** (`components/ExtensionsView.tsx`) provides 182 self-hosted schemas covering modern token standards.

### Catalog Categories
- **Color Spaces (41)**: OKLCH, OKLab, Display P3, Linear P3, HCT (Material 3), Hex, HSL, HSV, HWB, LCH, Lab, Rec2020, SRGB, XYZD65, and more.
- **Functions & Math (81)**: APCA Contrast, WCAG 2.1 Contrast Ratio, `harmonize()`, `to_gamut()`, `adjust_to_contrast()`, `scale_chroma()`, `scale_lightness()`, Gaussian decay, and tint/shade generators.
- **Core & Utilities (60)**: Dimensions, typography, borders, shadows, opacity, and cross-platform exporters (`android-xml-*`, `ios-swiftui-*`, `jetpack-compose-*`, `react-native-*`, `flutter-*`, `figma-*`, `css-*`, `dtcg`).

### Controls & Options
| Option / Control | Behavior & Technical Detail |
| :--- | :--- |
| **Category Filter Pills** | Instant filtering by `All`, `Enabled`, `Color Spaces`, `Functions`, and `Core & Utilities`. |
| **Search Filter** | Fast live search across schema IDs, names, descriptions, and tags. |
| **Enable / Disable Button** | 1-click toggle on each card. Persists per-project activation state in Supabase (`enabled_schemas`). |
| **Inspect Button / Card Click** | Opens the dark-themed **Extension Inspector Modal** (`components/ExtensionDetailModal.tsx`). |
| **Inspector Modal Features** | Displays category pill, enabled status, copyable local schema URL, JSON schema tree viewer, and usage examples. |
| **Zero External Links** | All schema URLs resolve to `/api/v1/schemas/{schemaId}` on the current application origin. |

---

## 8. Studio: Assets & Multi-Platform Exporters

### Assets Studio (Beta)
- **Asset Library**: Store, inspect, and organize vector SVGs, brand icons, and raster assets.
- **Figma Asset Sync**: Pull icons and component frames directly from Figma documents.
- **Batch Export**: Download optimized SVG or PNG asset archives.

### Multi-Platform Exporters Engine (`components/ExportsView.tsx`)
Transforms token sets into production code for any platform:

| Target Platform | Export Format & Features |
| :--- | :--- |
| **DTCG 2025.10 JSON** | Official Design Tokens Community Group specification format with `$value`, `$type`, and `$description`. |
| **Tailwind CSS** | Ready-to-use `tailwind.config.js` with extended color palettes, spacing, and typography scales. |
| **CSS Custom Properties** | Clean `:root { --color-primary-500: #...; }` with multi-theme classes (`.theme-dark { ... }`). |
| **SCSS Variables** | Modular `$color-primary-500: #...;` maps and mixins. |
| **Style Dictionary** | Standard Style Dictionary v4 format with transforms for enterprise pipeline builds. |
| **iOS SwiftUI** | Swift extension files with `Color(...)` and `Font(...)` structs. |
| **Android Jetpack Compose** | Kotlin object files with `Color(0xFF...)` and `TextStyle(...)`. |
| **Flutter Dart** | Dart class files with `Color(0xFF...)` constants. |
| **ZIP Download** | 1-click download bundling all selected formats into an organized archive. |

---

## 9. Version Control: Native Branching & Git Provider Sync

The platform provides dual-engine version control based on team infrastructure:

### Mode A: Native Branching (No External Git)
Active when no external Git provider credentials are configured.
- **Branch Creation**: Create isolated branches (e.g. `staging`, `feature/dark-mode`) based on any existing branch.
- **Branch Switching**: Instantly switch the active workspace branch from the header or Branches tab.
- **Commit History**: Automatically logs token edits, set additions, and schema toggles as chronological commits.
- **Branch Merge**: Non-destructive merge tool validating token conflicts and merging changes into `main`.

### Mode B: External Git Provider Sync
Active when connected to GitHub, Azure DevOps, GitLab, or Bitbucket.
- **Authentication**: Personal Access Token (PAT) with repository read/write permissions.
- **Path Scoping**: Direct repository path scoping (e.g. `tokens/design-tokens.json` or `packages/tokens/src/`).
- **Push Workflow**: Commit message prompt, diff summary calculation, and direct push to remote branch.
- **Pull Workflow**: Fetches latest remote changes, highlights incoming additions/deletions, and merges into the local state.
- **Commit Details Modal**: Inspect full commit diffs, additions, and deletions using `/api/git/commit-details`.

---

## 10. Releases & In-App Changelog System

### Releases Engine (`components/ReleasesWorkspace.tsx`)
- **Create Release**: Semver release workflow (`Major`, `Minor`, `Patch`).
- **Release Highlights**: Enter rich markdown release notes summarizing token updates, component additions, and breaking changes.
- **Release-Coupled Docs**: Automatically snapshots and publishes the living documentation version corresponding to the release tag.
- **Artifact Generation**: Attaches generated ZIP bundles of token exporters to each release.

### System Changelog (`data/systemChangelog.ts`)
- Accessible from the footer link (`Changelog`) in the primary sidebar.
- Displays chronological history of platform updates with release badges (`Feature Release`, `Enhancement`, `Hotfix`).
- Itemized tag pills categorizing updates by `Tokens`, `Sorting`, `UI`, `Security`, and `Integration`.

---

## 11. Developer APIs, Local Schemas & MCP Server

### Local Schema Registry REST APIs
- `GET /api/v1/schemas`: Returns the master JSON catalog of all 182 supported schemas.
- `GET /api/v1/schemas/[...path]`: Returns the exact Draft 2020-12 JSON Schema definition for any registered schema ID.
- `GET /api/v1/tokens`: Headless token retrieval endpoint for CI/CD pipelines.
- `GET /api/v1/tokens/branches?orgId=...&projectId=...`: Loads remote Git branches separately from token retrieval; requires `read:tokens` access.

### MCP (Model Context Protocol) Server & CLI
The platform includes an embedded MCP server (`components/MCPCliView.tsx`) allowing AI developer assistants (such as Antigravity, Claude, or Cursor) to programmatically interact with the design system:
- **Available Agent Tools**:
  - `list_tokens`: Query tokens with type, set, and alias filtering.
  - `update_token`: Modify token values and metadata.
  - `export_tokens`: Generate platform formats programmatically.
  - `inspect_variables`: Read Figma variable collections.
- **CLI Workflows**: Scriptable terminal workflows for token linting, contrast validation, and automated exports.
