# Changelog

All notable changes to the Tokens & Asset Management Platform will be documented in this file.

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
