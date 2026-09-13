# Changelog

All notable changes to the Tokens & Asset Management Platform will be documented in this file.

# 1.3.0 `2026-09-13`

● **Minor Release — Figma Second Screen Plugin, Data Grid Engine & Multi-Tenant Architecture**

### 🚀 Highlights & Features

- **Figma Second Screen Companion Plugin**: Built a standalone companion Figma plugin (`plugin/`) with a dedicated React + Vite + Tailwind interface (`plugin/src-ui/App.tsx`). Features 1-click token pairing via `/api/v1/auth/pair`, live canvas variable introspection, bidirectional style sync, and instant export into studio tokens.
- **Interactive Tokens Data Grid with Resizable Columns**: Engineered an ultra-responsive data grid (`components/TokensWorkspace.tsx`) with dynamic column resizing for `Name`, `Type`, `Value`, `Resolved`, `Description`, and `Set`. Includes dot-notation grouping, hierarchical nesting, category tabs, fast fuzzy search, and dual-mode toggling between visual table view and raw JSON editor.
- **Multi-Tenant Workspace & Project Directory**: Full workspace architecture (`components/WorkspacesProjectsView.tsx`) allowing team members to switch organizations, view active vs archived projects, configure custom brand icons and colors, and manage team members.
- **Project Lifecycle Management & Danger Zone**: Implemented comprehensive project configuration (`components/ProjectSettingsView.tsx`) with profile details (name, slug, description, base permissions). Added non-destructive project archiving (freezes project to read-only status) and permanent project deletion with a two-step confirmation dialog.
- **Strict Duplicate Name Validation & Collision Guards**:
  - **Globally Unique Organizations**: Enforced case-insensitive, whitespace-trimmed uniqueness across all organizations in Firestore and local caches. Duplicate organization names or URL slugs are strictly blocked.
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
- **Cloud Persistence & Audit Logging**: Scoped documentation stored dynamically in Cloud Firestore under `organizations/{orgId}/projects/{projectId}` with automatic event recording in the team activity log.

---

# 1.2.1 `2026-09-06`

● **Patch Changes**

### 🚀 Highlights

- **Real-Time Cross-Team User Activity Audit Logs**: Completely eliminated static/mock fallback data and replaced it with a dynamic, real-time Firestore audit log under `organizations/{orgId}/activities` that synchronizes activity across all organization collaborators.
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
- **Zero-Latency App Startup**: Added instant `localStorage` cache hydration and parallelized Firestore database queries (`Promise.allSettled`), bypassing starting delay and unblocking the UI immediately.

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
