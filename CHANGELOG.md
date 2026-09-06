# Changelog

All notable changes to the Tokens & Asset Management Platform will be documented in this file.

---

# 1.3.0 `2026-09-06`

● **Minor Release — Living Documentation System**

### 🚀 Highlights & Features

- **Interactive 3-Panel Living Documentation Studio**: Launched full documentation editor in the `Documentation` tab featuring navigation tree, dynamic canvas, and contextual block inspector.
- **Folder & Multi-Page Organization**: Support for creating nested folders (e.g. `Foundations`, `Components`) and sub-pages (e.g. `Color`, `Typography`, `Spacing`) with inline renaming, reordering, and deletion.
- **Living Token & Variable Blocks**: Real-time connected blocks rendering Figma variables, color swatches with transparency checkerboards, typographic specimens, and repository tokens.
- **Do's & Don'ts Comparison**: Built-in side-by-side design guideline blocks comparing recommended patterns and anti-patterns.
- **Floating Slash Command Popover (`/`)**: Fast block insertion menu supporting keyboard navigation, quick search, and 8 block types.
- **Contextual Inspector Drawer**: Header background color swatches, layout options (`Classic`, `Hero`, `Feature`), Table of Contents toggle, and variable filters (collections, mode checkboxes, types, starts-with/includes).
- **Public Reader Route & Granular Publishing**: Dedicated public site (`/docs/[orgSlug]/[projectSlug]`) with one-click global publishing and page-by-page visibility switches.
- **Root Elements Directory (`/`)**: Visual overview dashboard summarizing documentation statistics and element directory cards.

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
