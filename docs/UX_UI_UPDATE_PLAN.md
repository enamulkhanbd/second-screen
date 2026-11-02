# UX / UI Update Plan

This plan turns the system UX/UI audit into sequenced implementation work for the **Tokens Platform** web studio, public docs, invite/auth flows, and Figma companion plugin.

**Do not restyle the palette.** Follow [`DESIGN.md`](./DESIGN.md): zinc/slate surfaces, Inter + mono, 4px grid, Radix/shadcn. The work is information architecture, vocabulary, chrome density, empty-state teaching, and accessibility — not a new look.

**Related:** in-chat audit canvas `ux-ui-system-audit.canvas.tsx`. Guardrails: [`AGENTS.md`](../AGENTS.md) (hooks order, no `!important` in `cn()`, 13k-token batching, self-hosted schemas).

---

## 1. Goal and success criteria

After this plan, a new designer can:

1. Sign in, create a **workspace**, open a **project**, and edit a token without learning Git, DTCG, or Figma Variables first.
2. Explain, from the UI, that **Tokens are source**, **Variables are a Figma projection**, and **Git is optional backup**.
3. Save work with **one** primary control, not competing Cloud / Native / Git chips.
4. Use the product on a 1280px laptop and a tablet without losing core actions.
5. Complete critical flows with keyboard, visible focus, and no native `prompt` / `confirm`.

---

## 2. Vocabulary lock (do this first, everywhere)

Pick one term and stop mixing. Copy, nav, toasts, and docs must match.

| Concept | Use this word | Do not use |
|---------|---------------|------------|
| Tenant | **Workspace** | Organization (except API/DB internals) |
| Design file | **Project** | Repo, design system (unless describing the project) |
| DTCG editor | **Tokens** | Variables (that word is Figma-only) |
| Figma sync | **Figma Variables** | Tokens, second studio |
| Theme groups / modes | **Themes** | Options, modes (use “mode” only inside a theme) |
| Cloud branch | **Branch** | Native branch, Supabase branch (tooltip may say stored in cloud) |
| Git remote | **Git** + provider name | Cloud Only, Native vs Git as equal products |
| Save without Git | **Save** / **Commit** | Push (Push is Git-only) |
| Save with Git | **Push to Git** | Generic Push without destination |

Implementation: a short copy table in this file is the source of truth. When touching a screen, replace old terms in visible strings only (do not rename DB columns or Zustand fields in the same PR unless required).

---

## 3. Principles for every change

1. **Links for navigation.** Sidebar and dashboard cards that change route must be `<Link>` / `<a>` (or `Button asChild` + `Link`) so Cmd-click, middle-click, and the back button work. Keep Zustand `setSidebarTab` in sync via the existing URL effects in `app/page.tsx`.
2. **One primary action per toolbar.** Secondary actions go in overflow (`More`) or a status popover.
3. **Empty states teach the job.** CTA + one sentence of model, not a blank table.
4. **Dialogs, not browser chrome.** Replace `window.prompt` / `window.confirm` with existing `Dialog` patterns (`CreateBranchModal`, `ExtensionDetailModal`).
5. **Sentence case.** No tracked ALL CAPS section labels (`WORKSPACE`, `STUDIO`, `RECENT PROJECTS`).
6. **Motion.** Honor `prefers-reduced-motion`. No `transition-all`, no `animate-ping` without a static fallback. List transition properties explicitly.
7. **Scale.** Tokens/themes lists stay batched (`INITIAL_BATCH_SIZE = 100`). Do not mount 13k rows.
8. **Hooks.** Never return early before hooks.

---

## 4. Phased delivery

Each phase is a shippable PR (or small PR group). Do not start a later phase until the previous phase’s acceptance checks pass.

```
Phase 0  Copy + IA spec (no visual redesign)
Phase 1  Shell: sidebar grouping + header slim
Phase 2  First-run teaching: onboarding, dashboard, empty states
Phase 3  Tokens / Themes / Variables mental model
Phase 4  Sync, Git, plugin pairing
Phase 5  Docs, assets, exports, publish
Phase 6  Accessibility + responsive
Phase 7  Auth/invite unification + leftovers
```

---

## 5. Phase 0 — Copy and IA spec

**Why:** Later PRs will fight if “org” and “workspace” still mean two things.

### Work

- Update visible strings in `Sidebar.tsx`, `Header.tsx`, `WorkspacesListView.tsx`, `OnboardingWizardModal.tsx`, `DashboardView.tsx`, `AuthGatewayView.tsx` to the vocabulary table.
- Remove leftover sample copy: `Planet Design System` in `DashboardView.tsx`.
- Default new-workspace icon: drop the emoji default (`"🏢"`) in `WorkspacesListView` create handler; use initial letter + color (already used in avatars).
- Document nav groups (below) in `DESIGN.md` under a short “Navigation” subsection **only if** you are already editing that file in the same PR; otherwise keep this plan as the spec.

### Target information architecture

**Workspace mode** (no project selected)

- Overview
- Projects
- Members
- Workspace settings

**Project mode** — grouped, not a flat list of 12

| Group | Items | Default visibility |
|-------|--------|--------------------|
| Design | Tokens, Themes | Always |
| Connect | Figma Variables, Git & branches | Always; Git subsection if connected |
| Publish | Documentation, Assets, Exports, Releases | Always |
| Advanced | Extensions, Developers (MCP + PAT) | Collapsed by default or behind “More” |
| Help | Product docs, Changelog | Footer / Help menu, **not** mixed with Studio |

### Acceptance

- Grep the `components/` UI copy: no user-facing “Native:”, “Cloud Only”, “Organization Created” (use Workspace). API errors may still say organization.
- Sidebar mock or comment in code lists the groups above.

---

## 6. Phase 1 — Shell (highest leverage)

### 1.1 Sidebar grouping

**Files:** `components/Sidebar.tsx`, `app/page.tsx`, `components/SecondarySidebar.tsx`

**How**

1. Split project nav into labeled groups (sentence case: “Design”, “Connect”, “Publish”). Put Extensions + MCP under “Advanced”.
2. Move System docs + Changelog out of the project list into a Help footer control (popover or `sidebarTab` values kept, trigger moved).
3. Collapsed rail (`w-16`): every icon button needs `aria-label` **and** a Tooltip (title alone is not enough). Do not collapse below `lg`; keep the existing Sheet for smaller screens.
4. Convert nav items that already have URLs (`/{org}/{tab}`, `/{org}/{project}/{tab}`) to Next.js `Link`. Keep `onNavigateWorkspaceTab` / `setSidebarTab` for state alignment.
5. Persistent project switcher in the sidebar header stays; rename “CURRENT WORKSPACE” → “Workspaces”, “RECENT PROJECTS” → “Projects”.

**Do not** add nested accordions that hide Tokens. Design group should be expanded by default.

### 1.2 Header slim

**Files:** `components/Header.tsx`, optionally a new `components/SyncStatusPopover.tsx`

**How**

Target header actions, left to right:

1. Mobile nav toggle (existing)
2. Breadcrumb: Workspace / Project (links)
3. Branch control (single control — remove the duplicate from `TokensWorkspace` toolbar)
4. **Primary:** Save / Commit, or **Push to Git** when Git is connected and dirty
5. Overflow `More`: Pull from Git, open Git settings, theme, account
6. User menu

Move Supabase “synced” chip and Git repo chip into one **Status** popover (dot + “Saved” / “Unsaved” / “Git: behind remote”). Kill the “Cloud Only” dashed button; if Git is disconnected, Status popover includes “Connect Git”.

Remove `animate-ping` on remote changes; use a static badge “Updates”.

Unify branch UI: Header owns switching. Tokens toolbar must not render a second Native branch dropdown (`TokensWorkspace.tsx` ~lines 692–744).

### 1.3 Workspaces home theming

**Files:** `components/WorkspacesListView.tsx`, `app/page.tsx`

**How**

- Replace hardcoded `#09090d` / `#0e0e11` / `#1f2126` with `bg-background`, `border-border`, `bg-card` so light mode works.
- `page.tsx` should not special-case `bg-[#09090d]` for workspaces view.

### Acceptance

- At 1280px, header actions do not wrap or overflow; extra actions sit in More.
- Only one branch switcher on Tokens.
- Sidebar groups visible; Help not in the Design list.
- `npx tsc --noEmit` clean.

---

## 7. Phase 2 — First-run teaching

### 2.1 Onboarding

**Files:** `components/OnboardingWizardModal.tsx`, `app/page.tsx`

**How**

- Step 1: Workspace name (already there). Copy: “A workspace holds your team and projects.”
- Step 2: First project name. Drop Git from the wizard. After create, land on **Tokens** with an empty-state, not a Git wall.
- If the user dismisses: show a persistent Overview checklist card (create project, invite, connect Figma) instead of a dead empty dashboard.
- Do not block the app with a modal on every reload if they dismissed; keep `isWizardDismissed` and honor it.

### 2.2 Overview

**Files:** `components/DashboardView.tsx`

**How**

- Opening a project: **no success toast**. Navigate quietly to Tokens (or last tab).
- Primary column: projects (open vs settings as two explicit actions: card click opens; gear is `aria-label="Project settings"` and `stopPropagation`).
- Secondary: checklist if Git/Figma/docs unused; then activity.
- Remove `Planet Design System` fallback; use “Workspace”.

### 2.3 Empty states (minimum set)

| Surface | File | Empty-state message + CTA |
|---------|------|---------------------------|
| Tokens, no sets | `TokensWorkspace.tsx` | “Add a token set to store colors, type, and space.” → Add set |
| Themes, no groups | `ThemeMatrix.tsx` | “Themes map the same tokens to Light, Dark, or a brand.” → Add theme |
| Variables, none | `VariablesView.tsx` | “Pull Figma Variables into this project. Tokens stay the source.” → Connect Figma |
| Docs | keep `DocEmptyStateGuide.tsx` | Already good; sentence-case only if needed |
| Assets | keep collection empty | Keep drag-and-drop |

### Acceptance

- New account: workspace → project → Tokens empty state in under 2 minutes, no Git.
- Dismissed wizard still has a checklist on Overview.

---

## 8. Phase 3 — Tokens, Themes, Variables

### 3.1 Tokens editor chrome

**Files:** `components/TokensWorkspace.tsx`, `components/AddSetModal.tsx` (or new `RenameSetModal` / `DeleteSetDialog`), `components/BulkActionsCommandPalette.tsx`

**How**

1. Replace `prompt("Rename set to:")` and `confirm(delete)` with Dialogs (name field, destructive footer per DESIGN.md).
2. Keep bulk Cmd+K when rows are selected.
3. Add **global** Cmd+K (new `components/CommandPalette.tsx`): jump to project, tab, token set, settings. Filter locally from Zustand (`orgProjects`, `sidebarTab` list, `getValidTokenSetNames`). No new backend.
4. Advertised shortcuts (`⌘E`, `⌘D`, `⌘C`) must either work (`keydown` handlers) or be removed from menus.
5. JSON mode: keep Ctrl+S; show “Unsaved” in the set toolbar only, not a second save in the header if header already commits.

### 3.2 Token drawer

**Files:** `components/EditTokenDrawer.tsx`

**How**

- Default panel: name, type, value, description. Fold `$extensions`, deprecation, schema into “Advanced”.
- Alias field: keep `{token.name}` placeholder; surface the existing token search without an extra click if a value starts with `{`.

### 3.3 Themes

**Files:** `components/ThemeMatrix.tsx`, `components/ThemeSwitcherDropdown.tsx`, `components/EditThemeGroupModal.tsx`

**How**

- First-run: create “Light / Dark” group helper, then show matrix.
- Sticky first column + horizontal scroll; do not render all 13k rows (keep batching).
- Replace hover-only “Inactive in themes” with a Tooltip component (keyboard accessible).

### 3.4 Figma Variables as a sync surface

**Files:** `components/VariablesView.tsx`, `components/Sidebar.tsx`

**How**

- Sidebar label: **Figma Variables** (not “Variables”).
- Page header: one sentence — “These are Figma variables mapped from this project’s tokens.”
- Primary actions: Pull from Figma, Push to Figma, Open mapping. Demote the second full token-table chrome (duplicate type filters) so it does not compete with Tokens.

### Acceptance

- No `window.prompt` / `window.confirm` in `components/`.
- Cmd+K opens jump palette from any studio tab; with a token selection it can still offer bulk actions as a group.
- Variables header states the relationship to Tokens.

---

## 9. Phase 4 — Sync, Git, plugin

### 4.1 Project settings / Git

**Files:** `components/ProjectSettingsView.tsx`, `components/SyncProvidersView.tsx`, `components/CredentialsModal.tsx`

**How**

Split the long form into three short cards:

1. **Git** — provider, then owner/repo/branch/path, then PAT (or “token already saved”). Hide webhook until Git is connected.
2. **Figma** — file + PAT rotate, separate from Git.
3. **Automation** — webhook.

Do not show all PAT fields for GitHub, Azure, and GitLab at once; show fields for the selected provider only (likely already partially true — enforce it).

Replace blur-to-reveal secrets with a Show/Hide toggle (`aria-pressed`) so keyboard users can read values.

Status popover “Connect Git” deep-links to `project-settings` + `projectSettingsTab = "sync"`.

### 4.2 Branches

**Files:** `components/BranchesView.tsx`, `components/CreateBranchModal.tsx`, `components/Header.tsx`

**How**

- If Git is not connected: Branches is “project versions stored with the workspace.” No Git Pull/Push on this page.
- If Git is connected: show remote tracking on each branch; Pull/Push live in Header.
- Create-branch copy: “Branch from {current}” — not “Native”.

### 4.3 Plugin + `/connect`

**Files:** `plugin/src-ui/App.tsx`, `app/connect/page.tsx`, `components/PluginDistributionModal.tsx`

**How**

- Pairing: if the user is already signed in on the web connect page, skip generic AuthModal when session exists.
- Preselect `currentOrg` / `currentProject` from the studio session; do not force a blank org dropdown.
- Plugin: keep CONNECT → project → MAIN, but merge org+project into one compact picker.
- Copy success: keep `execCommand` fallback for Figma sandbox; user-facing string “Copied {label}” without a checkmark character if the rest of the app uses Lucide Check.
- Avoid duplicating PAT-in-plugin if pairing code is the happy path; PAT as “Use a token instead” disclosure.

### Acceptance

- Connect Git is ≤ one screen for the selected provider.
- Plugin pairing can complete without re-picking a workspace the user already has open.

---

## 10. Phase 5 — Publish: docs, assets, exports, releases

### 5.1 Documentation

**Files:** `components/DocumentationView.tsx`, `components/docs/*`, `app/docs/[orgSlug]/[projectSlug]/page.tsx`

**How**

- Below 1280px: inspector as a Sheet (same pattern as secondary sidebar), not a third persistent column.
- Header: Edit / Preview / **Publish** always visible. Preview should match public docs chrome.
- Public docs: show a compact page picker on mobile (`md:hidden` select or sheet), not a missing tree.

### 5.2 Assets

**Files:** `components/assets/AssetsWorkspace.tsx`, `components/AssetsView.tsx`

**How**

- Default first visit: upload dropzone + “Import from Figma” + “Import from Git”. Collections, metadata schema, bulk edit stay behind “Manage library” or after the first collection exists.
- Do not regress drag-and-drop empty collection.

### 5.3 Exports

**Files:** `components/ExportsView.tsx`, `components/exports/*`

**How**

- `handleSaveExport` currently toasts only. Persist preset in project settings / Zustand + existing cloud save path, **or** rename the button to “Download” / “Copy config” so it does not claim save.
- Keep hub → format views; add a back control “All formats”.

### 5.4 Releases + Developers

**Files:** `components/releases/*`, `components/McpCliView.tsx`, `components/ApiKeysManager.tsx`

**How**

- Releases copy: “A version of this project’s tokens (and optional docs snapshot).” Link to Git commit when connected; do not invent a fourth version system.
- Move MCP from Studio nav to **Project settings → Developers** (or Advanced group). Button “Create personal access token” should open `ApiKeysManager` / PAT flow, not only show `<YOUR_PERSONAL_ACCESS_TOKEN>`.

### Acceptance

- Publish is findable from the docs editor without opening nested menus.
- Export “save” either persists or is not called Save.
- MCP is not a top-level Studio item.

---

## 11. Phase 6 — Accessibility and responsive

Do as a dedicated PR after chrome is stable so you are not labeling controls that will move.

### App shell

**Files:** `app/layout.tsx`, `app/page.tsx`, `components/ThemeProvider.tsx`

- Add skip link: “Skip to main content” targeting the workspace `<main>` (split the current full-app `<main>` so nav is outside, or use `id="main-content"` on the workspace column).
- `html` should not force `className="dark"` when theme mode is light; drive class from `ThemeProvider` / `themeMode`.
- `color-scheme` matching background.

### Controls

- Icon-only buttons: `aria-label` (Header overflow, Sidebar collapse, Token set ⋮, Assets, Theme matrix).
- Dashboard / workspace cards: `button` or `Link`, not clickable `div`.
- Form fields: `Label htmlFor` on Auth, Onboarding, Create workspace, Sync, Invite.
- Toasts already have `aria-live` — keep.

### Motion and type

- Grep `transition-all` in `components/` and replace with `transition-colors` or listed properties.
- Wrap ping/bounce in `motion-safe:` or disable under `prefers-reduced-motion`.
- Loading copy: “Loading…” with ellipsis character `…`.
- Section labels: sentence case.

### Responsive

- Header: overflow menu before 1024px.
- Tokens table: horizontal scroll with sticky name column; do not require three sidebars. Existing Sheets for primary + context nav stay.
- Touch targets ≥ 32px for header/sidebar icons (current `h-7`/`h-8` is acceptable if hit area padded).

### Acceptance

- Keyboard: tab from skip link → tokens table → edit drawer → save.
- Light mode: workspaces home, sidebar, header, tokens all use CSS variables.
- No `transition-all` in product components (ui primitives may stay if already scoped).

---

## 12. Phase 7 — Auth, invites, members, leftovers

### Auth

**Files:** `components/AuthGatewayView.tsx`, `components/AuthModal.tsx`

- Separate Sign in and Create account as two routes or two explicit screens (not a single toggle buried under the form).
- `autocomplete="email"` / `current-password` / `new-password`; `spellCheck={false}` on email.
- Invitees: if `/invite/[token]`, do not bounce through the generic gateway first.

### Invites

**Files:** `components/InviteLandingView.tsx`, `components/AcceptInviteModal.tsx`, `app/invite/[token]/page.tsx`

- Keep terminal copy (expired / revoked / accepted). Extract shared auth fields if AuthModal and InviteLanding drift.

### Members

**Files:** `components/MembersView.tsx`

- Copy: “Workspace members” not “Organization”.
- Out of scope unless product agrees: project-level roles. If not building it, add one sentence: “Everyone here can access all projects in this workspace.”

### Extensions

**Files:** `components/ExtensionsView.tsx`, `components/ExtensionDetailModal.tsx`

- Preset packs: “W3C core”, “Color spaces”, “Math / functions” as enable-all for the filtered list (bulk actions already exist — label them as packs).
- Detail modal: one line “Tokens with this `$type` will validate against this schema.”

---

## 13. File map (quick)

| Phase | Primary files |
|-------|----------------|
| 0 | `DashboardView.tsx`, `WorkspacesListView.tsx`, `OnboardingWizardModal.tsx`, `Sidebar.tsx` (strings) |
| 1 | `Sidebar.tsx`, `Header.tsx`, `page.tsx`, `TokensWorkspace.tsx` (remove dup branch UI), `WorkspacesListView.tsx` |
| 2 | `OnboardingWizardModal.tsx`, `DashboardView.tsx`, empty states in Tokens / ThemeMatrix / VariablesView |
| 3 | `TokensWorkspace.tsx`, new set dialogs, `CommandPalette.tsx`, `EditTokenDrawer.tsx`, `VariablesView.tsx`, `ThemeMatrix.tsx` |
| 4 | `SyncProvidersView.tsx`, `BranchesView.tsx`, `plugin/src-ui/App.tsx`, `app/connect/page.tsx` |
| 5 | `DocumentationView.tsx`, `AssetsWorkspace.tsx`, `ExportsView.tsx`, `McpCliView.tsx`, `ReleasesWorkspace.tsx` |
| 6 | `layout.tsx`, `ThemeProvider.tsx`, grep a11y/motion, card `Link`s |
| 7 | `AuthGatewayView.tsx`, `InviteLandingView.tsx`, `MembersView.tsx`, `ExtensionsView.tsx` |

---

## 14. Verification (every phase)

Per [`AGENTS.md`](../AGENTS.md):

```bash
npx tsc --noEmit
npm run build
```

Manual UX checks:

1. Signed-out → gateway → (optional) invite.
2. Empty account → onboarding → Tokens empty state.
3. Existing project → Tokens edit → header Save/Push → no duplicate branch control.
4. Cmd-click a sidebar item (after Link conversion) opens a new tab.
5. Theme light/dark on workspaces + studio.
6. 1280×800: docs inspector and token sets reachable.
7. Keyboard: skip link (phase 6), dialogs, token row → drawer.

Do not ship a phase that breaks 13k-token batching or hook order.

---

## 15. Suggested PR slices

Keep PRs reviewable:

1. **copy-vocabulary** — strings only  
2. **sidebar-ia** — groups, help footer, Links  
3. **header-status** — slim header + status popover + remove Tokens branch dup  
4. **workspaces-theme-tokens** — CSS variables on home  
5. **onboarding-overview** — wizard + checklist + no open-project toast  
6. **tokens-dialogs-cmdk** — dialogs + command palette  
7. **variables-themes-empty** — model copy + empty states  
8. **sync-git-cards** — SyncProviders split  
9. **plugin-connect** — pairing UX  
10. **publish-docs-assets-exports**  
11. **a11y-responsive**  
12. **auth-invite-members**

---

## 16. Out of scope (this plan)

- New color palette, new font, marketing site redesign.
- Virtualizing 13k rows with a new library (optional later; batching stays unless a dedicated perf PR).
- Project-level RBAC (call out in Members copy only).
- OAuth for GitHub instead of PAT (desirable; separate security/product spec).
- Renaming database `organizations` tables.

---

## 17. How to execute a slice

1. Read this phase’s **How** and **Files**.
2. Match existing patterns: `Dialog` from `components/ui/dialog.tsx`, `PageHeader`, `Button`, `Tooltip`, `Sheet` for mobile nav.
3. Preserve comments unrelated to the change.
4. Run typecheck + build.
5. Verify in the browser: the flow in §14 for that phase, plus light/dark if chrome moved.

When in doubt, cut chrome rather than adding a new card.
