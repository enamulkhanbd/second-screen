# Changelog

All notable changes to the Tokens & Asset Management Platform will be documented in this file.

# 1.4.1 `2026-09-17`

● **Patch Release — Universal A-Z, 0-9 Collation Engine, Interactive Table Sorting & Brand Scale Precision**

### 🚀 Highlights & Features

- **Universal A-Z, 0-9 Collation Engine**: Built a centralized multi-segment sorting and comparison engine (`compareTokenNames`, `compareResolvedValues`, `compareTokens` in `utils/transformTokens.ts`). Adheres strictly to the `A-Z, 0-9` collation rule where alphabetical characters precede numerical digits, while contiguous digit segments are compared numerically (e.g. `0px` -> `1px` -> `2px` -> ... -> `10px` -> `12px` -> `48px` -> `999px`).
- **Interactive Sort Headers Across All Tables**: Added interactive column sort toggling (`asc` / `desc`) to `Name` and `Resolved` / `Value` columns across all token tables:
  - **Tokens Workspace**: `components/TokensWorkspace.tsx`
  - **Categorized Token Tables**: `components/TokenTable.tsx`
  - **Variables Workspace**: `components/VariablesView.tsx` with Collection, Variable Name, and Resolved Value sort headers
  - **Living Documentation Blocks**: `components/docs/blocks/TokensTableBlock.tsx` and `components/docs/blocks/VariablesTableBlock.tsx`
- **Dynamic Lucide Sort Indicators**: Integrated intuitive directional sorting icons (`ArrowUpAZ`, `ArrowDownAZ`, `ArrowUp01`, `ArrowDown01`, and `ArrowUpDown`) providing instant visual indicators for current sort column and direction.
- **Natural Progression as Default View**: Configured all token data grids, tree builders (`buildTokenGroupTree`), and documentation tables to initialize with `sortField: "resolved"` and `sortDirection: "asc"` by default, delivering an intuitive ascending scale out of the box without requiring manual user interaction.
- **Brand Color Shade Scale Alignment**: Fixed an issue where unmodified base color shades (such as `primary.500` defined as a `#hex` value) were displaced to the bottom of the shade group after modifier-calculated `oklch(...)` shades (`primary.50`–`primary.950`). Added numeric shade family extraction to preserve strict scale sequence (`50` < `100` < ... < `500` < ... < `950`).
- **Deterministic Theme Configuration References**: Ensured Figma token reference mappings in `components/ThemeConfigurationView.tsx` utilize `compareTokenNames` for predictable ordering.

---

# 1.4.0 `2026-09-14`

● **Minor Release — Unified Schema Marketplace, Self-Hosted JSON Schemas & Large-Scale Token Performance Engine**

### 🚀 Highlights & Features

- **Unified Single-Page Schema Marketplace**: Unified the extension management system into a single centered page (`components/ExtensionsView.tsx`). Users can discover, search, and toggle extensions active or inactive directly on cards with one-click `+ Enable` and `Disable` controls. Added an `Enabled` filter pill alongside `All`, `Color Spaces`, `Functions`, and `Core & Utilities`.
- **182 Self-Hosted Design Token Schemas**: Cataloged 182 design token schemas matching modern design token specifications:
  - **Color Spaces (41)**: OKLCH, OKLab, Display P3, Linear P3, HCT (Material Design 3), Hex, HSL, HSV, HWB, LCH, Lab, Rec2020, SRGB, XYZD65, and more.
  - **Functions (81)**: APCA Contrast, WCAG 2.1 Contrast Ratio, `harmonize()`, `to_gamut()`, `adjust_to_contrast()`, `scale_chroma()`, `scale_lightness()`, Gaussian decay, and tint/shade generators.
  - **Core & Utilities (60)**: Base dimensions, typography, borders, shadows, opacity, and cross-platform exporters (`android-xml-*`, `ios-swiftui-*`, `jetpack-compose-*`, `react-native-*`, `flutter-*`, `figma-*`, `css-*`, `dtcg`).
- **Self-Hosted JSON Schema Registry API**: Implemented local API routes (`/api/v1/schemas` and `/api/v1/schemas/[...path]`) returning valid draft 2020-12 JSON Schema documents with dynamic origin resolution. Completely eliminates all external copyright risks and third-party domain dependencies.
- **Reference-Accurate Extension Inspector Modal**: Replicated the dark-themed detail inspection dialog (`components/ExtensionDetailModal.tsx`) with dark-green category and status pills, angled link icon, copyable self-hosted schema URL, external open arrow, and zero scrollbar clutter.
- **Multi-Tenant Project Schema Persistence**: Project-level schema activation (`enabledSchemas`) persists with project data and hydrates into Zustand state on project switch.
- **Large-Scale Token Performance Optimization (13,000+ Tokens)**:
  - **Progressive Infinite Scrolling**: Implemented progressive batch loading (`100 tokens` per batch) with scroll sentinel in `components/TokensWorkspace.tsx`, preventing browser freezes when browsing large enterprise repositories.
  - **Eliminated Zustand Subscription Bloat**: Hoisted editing states and memoized table row nodes (`React.memo`), avoiding 13,000+ listener executions per keystroke.
  - **$O(1)$ In-Memory Alias Index**: Built a flat lookup index (`buildTokenLookupIndex`) eliminating deep recursive set scans during token alias resolution.
  - **Fast Color Conversion Cache**: Introduced LRU-cached hex conversions (`toHexFast`), bypassing repeated `colorjs.io` object allocations.
  - **Bounded Matrix Tree**: Bound grouped matrix calculations in `components/ThemeMatrix.tsx` to the active page, ensuring instantaneous rendering.
  - **Storage Sanitization & Document Safeguards**: Stripped heavy raw tokens from cached project lists in `localStorage` and added payload size safeguards.

---

# 1.3.0 `2026-09-13`

● **Minor Release — Figma Second Screen Plugin, Data Grid Engine & Multi-Tenant Architecture**

### 🚀 Highlights & Features

- **Figma Second Screen Companion Plugin**: Built a standalone companion Figma plugin (`plugin/`) with a dedicated React + Vite + Tailwind interface (`plugin/src-ui/App.tsx`). Features 1-click token pairing via `/api/v1/auth/pair`, live canvas variable introspection, bidirectional style sync, and instant export into studio tokens.
- **Interactive Tokens Data Grid with Resizable Columns**: Engineered an ultra-responsive data grid (`components/TokensWorkspace.tsx`) with dynamic column resizing for `Name`, `Type`, `Value`, `Resolved`, `Description`, and `Set`. Includes dot-notation grouping, hierarchical nesting, category tabs, fast fuzzy search, and dual-mode toggling between visual table view and raw JSON editor.
- **Multi-Tenant Workspace & Project Directory**: Full workspace architecture (`components/WorkspacesProjectsView.tsx`) allowing team members to switch organizations, view active vs archived projects, configure custom brand icons and colors, and manage team members.
- **Project Lifecycle Management & Danger Zone**: Implemented comprehensive project configuration (`components/ProjectSettingsView.tsx`) with profile details (name, slug, description, base permissions). Added non-destructive project archiving (freezes project to read-only status) and permanent project deletion with a two-step confirmation dialog.
- **Strict Duplicate Name Validation & Collision Guards**:
  - **Globally Unique Organizations**: Enforced case-insensitive, whitespace-trimmed uniqueness across all organizations and local caches. Duplicate organization names or URL slugs are strictly blocked.
  - **Organization-Scoped Unique Projects**: Project names are strictly unique within each organization, while permitting different organizations to create projects sharing the same name.
  - **Real-Time UI Protection**: Integrated real-time duplicate name detection across all modals (`CreateProjectModal`, `WorkspacesProjectsView`, `ProjectSettingsView`) with immediate inline alerts and disabled submit buttons.
- **Zero-Preset Clean Initialization**: Completely removed all legacy starter tokens (`colors.brand.*`, `spacing.*`) and mock Figma collection IDs (`VariableCollectionId:6:598`). New projects start 100% clean with zero injected tokens and zero dummy configurations.
- **Removed Demo Mode from Authentication Gateway**: Removed the "Explore Demo Workspace" button, demo user auto-login fallback, and unauthorized domain demo bypass from the login gateway and modal to ensure authentication adheres strictly to actual user credentials and Google OAuth.
- **Project Branches & Version Control**: Added full project branch management (`components/BranchesView.tsx`) with native branch switching (`main`, `staging`), commit timeline tracking, and branch merging.

---

# 1.2.3 `2026-09-06`

● **Patch Release — Living Documentation System**

### 🚀 Highlights & Features

- **Interactive 3-Panel Living Documentation Studio**: Launched the comprehensive documentation editor under the `Documentation` tab, featuring a left-hand navigation tree, dynamic central canvas, and a contextual right-hand inspector.
- **Folder & Multi-Page Organization**: Full multi-page hierarchy support allowing creation of section folders (e.g. `Foundations`, `Components`, `Utilities`) and sub-pages (e.g. `Color`, `Typography`, `Spacing`) with inline renaming, reordering, and deletion.
- **Real-Time Connected Design Token & Variable Blocks**:
  - **Variables Table Block**: Tabular multi-mode variable display with collections selector, type pills (`Color`, `Float`, `String`, `Boolean`), and 1-click copy for CSS variable names (`var(--...)`).
  - **Variable Color Swatches Block**: Visual grid of live color swatches with checkerboard transparency backgrounds, HEX/RGB values, and copy actions.
  - **Variable Typography Block**: Live font hierarchy specimens displaying font sizes, weights, and line-heights.
  - **Tokens Table Block**: Live repository token dictionary tables with type filtering and copy buttons.
  - **Callout Block**: Alert callout boxes with `Info`, `Success`, `Warning`, and `Error` variants.
  - **Markdown / Heading Block**: Rich markdown editing with instant formatting for headers (`#`), bullet lists, and paragraphs.
- **Do's & Don'ts Comparison Cards**: Native side-by-side design guideline cards comparing recommended best practices (green checkmark) and anti-patterns (red cross).
- **Floating Slash Command Popover (`/`)**: Fast block insertion menu supporting quick search, keyboard navigation, and instant insertion across 8 block types.
- **Contextual Inspector Drawer**: Matches user reference designs with canvas header background swatches (slate, emerald, gradients, etc.), layout modes (`Classic`, `Hero`, `Feature`), Table of Contents toggle, and variable filters (collections, mode checkboxes, types, starts-with/includes).
- **Public Reader Route & Granular Publishing**: Dedicated public site (`/docs/[orgSlug]/[projectSlug]`) with one-click global publishing and page-by-page visibility switches.
- **Root Elements Overview Directory (`/`)**: Visual documentation dashboard summarizing key documentation metrics and element directory cards.
- **First-Load Onboarding & Creation Guide**: When starting a fresh project, the canvas starts cleanly without auto-seeded dummy pages, presenting an interactive 4-step guide, instant `+ Create Your First Page` CTA, and an optional `Start with Foundations Template` button.
- **Cloud Persistence & Audit Logging**: Scoped documentation stored with project data and automatically recorded in the team activity log.

---

# 1.2.1 `2026-09-06`

● **Patch Changes**

### 🚀 Highlights

- **Real-Time Cross-Team User Activity Audit Logs**: Replaced static/mock fallback data with a dynamic, real-time organization activity log shared across collaborators.
- **Comprehensive Platform Event Instrumentation**: All core workspace actions—including token edits (`updateSingleToken`, `updateSetJson`, `addNewToken`, `deleteToken`, set creations/deletions), theme matrix additions, release package publishing, asset mutations (`uploadAssets`, `applyMetadataToAssets`, `updateAsset`, `deleteAsset`, `syncAssetsFromGit`, `syncAllFigmaSources`), and team invitations/member role updates—now automatically capture actor details, workspace project context, and precise action metadata.
- **Modernized Audit Trail UX**: Enhanced both the Team & Access Management Activity subtab and the User Activity Drawer with category filters (`All`, `Tokens`, `Git Operations`, `Figma`, `Assets`, `Releases`, `Team`), search filtering across descriptions and actor details, role pills, project badges, contextual metadata chips (e.g. old $\to$ new values, branch/commit SHA, icon count), and full localized datetime tooltips.
- **Dynamic Git Icon & Asset Hierarchy Sync**: Added flexible path synchronization supporting both `assets/icons` and `assets/icons/svg` with parent `metadata.json` automatic resolution and subfolder-stripping for clean icon naming.
- **High-Performance Large Asset Ingestion**: Expanded Git fetch limits to 5,000 items and implemented batched requests for Azure DevOps, seamlessly supporting enterprise repositories with 1,380+ icons.

---

# 0.2.0 `2026-09-06`

● **Minor Release**

### 🚀 Highlights & Features

- **Multi-Tenant Scope Isolation**: 100% sandboxed context isolation across organizations and projects. Switching context immediately purges residual state and resets theme groups (`$themes.json`) for unconfigured projects.
- **Figma Layer Name Enrichment for SVGs**: Copied SVG markup and downloaded `.svg` files now automatically contain embedded `id`, `data-name`, and `<title>` tags so pasting vector icons into Figma, Sketch, or Illustrator retains their exact icon names instead of pasting as generic `"Frame"`.
- **Zero-Latency App Startup**: Added instant `localStorage` cache hydration and parallelized database queries (`Promise.allSettled`), bypassing startup delay and unblocking the UI immediately.

---

# 0.1.1 `2026-09-01`

● **Patch Changes**

### 🚀 Highlights

- **shadcn/ui Drawer Integration**: Added official shadcn/ui `Drawer` component (`components/ui/drawer.tsx`) built on `vaul` featuring smooth slide-up animation, drag handle pill indicator, rounded floating card layout, and pill action buttons.
- **Multi-Source Figma Synchronization Hub**: Added support for adding unlimited Figma frame & section links with custom titles, unified PAT vault, per-link pause/resume toggles, individual link sync, and full-sync orchestration.
- **Streamlined Top Toolbar**: Modernized toolbar with smart conditional sync buttons (`Sync Figma (N)` and `Sync Git`) displayed only when configured, alongside an active connection indicator.
- **Empty State Onboarding Guide**: Restored high-value 3-card onboarding setup guide (SVG/ZIP/Folder dropzone, Figma links connector, and Git provider setup) linking directly into drawer tabs.
- **Cross-Platform Git Integration**: Enhanced Git setup supporting GitHub, GitLab, Azure DevOps, and Bitbucket with dedicated pause/resume and disconnect controls.

---

### ✨ Added Components & Features

#### ⚙️ Settings & Drawer
- `Drawer` (`components/ui/drawer.tsx`) — Official shadcn/ui bottom drawer powered by `vaul` with backdrop blur, rounded-top card containers, and pill buttons.
- `Figma & View Options Tab` — View & display options (badge visibility toggle, source filter), centralized PAT vault, add new Figma link form, and connected sources manager.
- `Git Repository Tab` — Provider select, repository details form, live connection status, pause/resume sync toggle, and disconnect button.

#### 🎨 Assets View & Toolbar
- `Conditional Sync Buttons` — `Sync Figma (${count})` and `Sync Git` buttons automatically hide when unconfigured and display active state badges when connected.
- `Per-Link Pause/Resume Control` — Granular pause and resume toggles for individual Figma sources (`isPaused` property in `FigmaSourceLink`).
- `Source Title Badges Toggle` — Toggle on/off the display of Figma source title pills (e.g. `📍 Navigation Icons`) across icon cards in the grid.

---

# 0.1.0 `2026-09-01`

● **Initial Release**

### 🚀 Highlights

- Initial release of the multi-tenant Design Tokens and Vector Asset Management Platform.
- Support for token transformation (`@tokens-studio/sd-transforms`, `token-transformer`), Git syncing, and Figma companion plugin integration.
