# Tokens Platform UX/UI System Audit

Full-product review of the web studio, public docs, invite/auth flows, and Figma plugin. The visual system is already disciplined. The main gaps are information architecture, vocabulary, chrome density, and teaching the mental model.
*Source: codebase review of app routes, 107 components, plugin UI, DESIGN.md · Nov 2, 2026*

- **27** Surfaces reviewed
- **3** Critical IA issues
- **9** High-priority UX gaps
- **12+** Studio nav destinations

## Issue mix by severity
27 product-area findings: 3 critical · 9 high · 11 medium · 4 low
*(Counts are product-area findings, not individual lint hits. Accessibility issues are grouped as one High item even though they appear in many files.)*

---

## Start here: the shell, not the tokens table
Users must understand Workspace vs Studio, Organization vs Project, Tokens vs Variables vs Themes, and Native cloud vs Git — before they can edit a color. Collapse those models first. Polish after.

## What already works
- **Craft:** Dark surfaces, 4px grid, Inter + mono, Radix primitives, and DESIGN.md give a coherent Tokens Studio aesthetic. Toasts, skeletons per view type, and progressive token loading (100-row batches) are the right scale choices.
- **Guided moments:** Invite landing copy is clear. Documentation empty state teaches the job. Assets empty collection supports drag-and-drop. Toast live regions and several icon buttons already have `aria-labels`.

## Highest-leverage problems

1. **Two products in one sidebar**
   Entering a project replaces Overview / Projects / Members with Tokens, Themes, Variables, Assets, Documentation, Extensions, Exports, Branches, Releases, MCP. Collapsed mode is icon-only. New users cannot tell what is required vs optional.

2. **Header is an operations console**
   Cloud save, Git repo chip, Pull, Push/Commit, Native vs Git branch, theme, search, and user sit in one 32px bar. Branch switching exists in both Header and Tokens toolbar.

3. **Three sources of truth, unnamed**
   Tokens (DTCG JSON), Figma Variables, and Git files look like parallel studios. The product never states: Tokens is source, Variables is a projection, Git is optional backup.

4. **Browser dialogs in a designed app**
   Rename/delete token sets still use `window.prompt` and `window.confirm`. That breaks the design system, keyboard flow, and undo story.

5. **Global search is missing**
   Cmd+K opens bulk actions only when tokens are selected. There is no command palette for jumping to a project, set, page, asset, or setting.

---

## Every surface

| Area | Severity | Primary UX gap |
| --- | --- | --- |
| Auth gateway | Medium | Sign-in and sign-up share one form; OAuth vs email is unclear; no skip-to-content. |
| Invite landing | Low | Strong empty/error copy; duplicated auth UI vs gateway increases drift risk. |
| Onboarding wizard | High | Forces org + project in three technical steps; dismissible with no recovery path. |
| Workspaces home | Medium | Hardcoded dark palette; org vs workspace wording; emoji default on create. |
| Shell / IA | Critical | Workspace vs Studio swap, 12+ studio items, collapsed icons lose meaning. |
| Header / sync chrome | Critical | Supabase, Git, Native, Pull, Push, branch, theme, user compete in one bar. |
| Overview dashboard | Medium | Activity is a feed, not a job-to-be-done; opening a project toasts; fallback name. |
| Projects list | Low | Card grid is fine; settings vs open-project is easy to miss. |
| Tokens table | High | Power-user density; prompt/confirm dialogs; Cmd+K only after selection. |
| Token editor | Medium | DTCG fields are complete but intimidating; alias search is buried. |
| Themes matrix | High | Wide table does not scale; theme groups vs modes vs sets is unexplained. |
| Figma variables | High | Looks like a second token studio; relationship to Tokens tab is not taught. |
| Assets studio | High | A product inside the product; collections, Figma import, Git import, bulk edit. |
| Living docs editor | Medium | Three-pane editor plus inspector; empty state is strong, publish flow is hidden. |
| Public docs site | Medium | Separate chrome from studio; mobile nav is hidden; no studio-to-public preview. |
| Schema marketplace | Medium | 182 schemas; enable/disable without consequence preview. |
| Exports | Medium | Save config toast does not persist; hub vs format views lose context. |
| Branches | High | Native cloud branches and Git branches are two models shown as one. |
| Releases | Medium | Versioning is disconnected from Git tags and docs publish. |
| MCP / CLI | Low | Copy-paste snippets, not a guided install; PAT placeholder in JSON. |
| Project settings / sync | High | PAT-first GitHub/Azure/GitLab/Figma/webhooks in one long form. |
| Members & invites | Medium | Org-level only; sub-tabs plus preview modal; no project roles. |
| Org settings | Low | Standard form; color/logo vs workspace switcher identity can desync. |
| System docs / changelog | Low | Competes with project documentation in the same nav. |
| Figma plugin | High | Connect → org → project → sync; pairing vs PAT; 300px plugin chrome. |
| Plugin connect web | Medium | Third auth surface; org/project pickers duplicate plugin UI. |
| Cross-cutting a11y | High | No skip link; html always dark; transition-all; missing labels; ALL CAPS. |

---

## Shell, identity, and language

### Navigation and vocabulary (Critical)
Sidebar labels mix Workspace, Organization, Studio, Native, Cloud Only, and Git. WorkspacesListView creates a “workspace”; Dashboard and onboarding still say organization. Members live at org level while most work is in a project.
*Improve:* pick one word (Workspace). Keep a persistent project switcher. Group Studio into Design (Tokens, Themes), Sync (Variables, Branches, Git), Distribute (Docs, Assets, Exports, Releases), and Admin. Use links, not `setSidebarTab` buttons, so Cmd-click and back-button work.

### Header chrome (Critical)
`Header.tsx` packs sync status that belongs in a status tray. “Cloud Only” is engineer language. Pulsing Git Pull dots ignore `prefers-reduced-motion`. Commit vs Push changes label based on Git config without explaining why.

---

## Getting in: auth, invite, onboarding

- **Auth:** Toggle sign-in/sign-up on one canvas. Password managers get weaker autocomplete. Loading copy is “Loading sign in…”. html is always class dark even when the user wants light.
- **Invites:** InviteLandingView handles expired/revoked well. AuthModal + AcceptInviteModal + gateway are three join paths. Unify so invitees never see a generic sign-in first.
- **Onboarding:** Wizard creates org then project then optional Git. Dismissal leaves an empty account with no checklist. Default project copy is internal (“Brand tokens, colors…”).

## Workspace home
DashboardView is a status page: 5 projects, 5 activities, shortcuts. Opening a project always jumps to Tokens and fires a success toast. Fallback title “Planet Design System” is leftover sample copy. WorkspacesListView is locked to zinc dark even when the rest of the app can go light. Color presets are unlabeled hex swatches.

---

## Design studio

### Tokens (High)
TokensWorkspace is the core editor: table, JSON, flow. Batch loading is correct for 13k tokens. Pain is chrome: set options, inactive-in-themes pill, native branch switcher duplicating the header, bulk palette gated on selection, JSON save using Ctrl+S only in that mode.
*Action:* Replace prompt/confirm with the same dialog pattern as CreateBranchModal. Add a first-run empty set that explains aliases with curly braces. Virtualize instead of only batching. Expose grouping and deprecated filter as first-class, not overflow.

### Themes (High)
ThemeMatrix is a spreadsheet of modes. Horizontal overflow, 100-row batches, and “inactive in themes” assume Tokens Studio knowledge. Need a simple “Light / Dark / Brand” first, then the matrix as an advanced view.

### Variables (High)
VariablesView is a full Figma-variable browser (grid/list, filters, pull/push). Designers will not know whether to edit here or in Tokens. Treat it as a sync panel with a mapping, not a second token table.

---

## Content and distribution

### Assets
AssetsWorkspace is huge: collections, metadata schema, Figma/Git import, bulk rename, detail studio with zoom. Powerful, but the first screen should be “upload or import icons,” not all of those controls. Collection empty state is good; keep that tone everywhere.

### Documentation
Editor + tree + inspector is Notion-like and cramped under 1280px. Publish lives in a modal. Public `/docs/[org]/[project]` hides the tree on mobile. Preview-as-published should be one click from the editor.

### Extensions
Marketplace of 182 schemas. Enabling a color-space schema has no before/after on a token. Add recommended packs (W3C core, color, math) and a “what this unlocks” inspector — `ExtensionDetailModal` is a good start.

### Exports & releases
Exports hub is clear; “Save configuration” only toasts. Releases are a third version story next to Git commits and doc publish. Unify as “Publish a version” that can include tokens, docs, and export snapshots.

---

## Sync, branches, plugin

### Project settings / SyncProvidersView (High)
GitHub, Azure, GitLab, Figma PAT, webhooks, and shield-blur secrets in one scroll. Designers should see “Connect GitHub” OAuth or a 3-field form, not owner/repo/branch/path/PAT at once. Blur-to-reveal secrets is clever and bad for accessibility.

### Figma plugin + `/connect` (High)
Plugin App.tsx is a four-view wizard in a narrow panel: pairing code, org, project, pull/push. Hardcoded production URL, `execCommand` copy, and success modals. The web `/connect` page repeats org/project selection. Pairing should land the user in the same project they already have open in the studio.

### MCP / CLI (Low)
Useful for agents, confusing in Studio nav. Move under Project Settings → Developers, with a one-click copy and a “create PAT” button that actually mints a token.

---

## People and system
MembersView is org-scoped with invite preview (good). There are no project-level roles, so a contractor invited to one design system sees the whole workspace. OrgSettingsView is straightforward. System docs and changelog at the bottom of the project sidebar feel like product marketing inside the working canvas — move them to Help.

---

## Accessibility, motion, responsive
*No skip link | html always dark | transition-all | prompt / confirm | ALL CAPS nav | animate-ping | div click cards | Sidebar buttons not links*

Button primitive has a good focus ring. Many custom icon buttons only have `title=`. Workspaces and dashboard cards are clickable divs, so middle-click and keyboard fail. Sidebar and secondary nav hide until lg/xl; tables (tokens, themes, members) are not usable on a phone. Header actions overflow without a “more” menu. Reduced motion is not honored on pulse/ping/bounce loaders.

---

## Suggested sequence

| Order | Work | Why it moves the needle |
| --- | --- | --- |
| 1 | Rewrite IA + vocabulary | One word for workspace; grouped Studio nav; persistent project switcher. |
| 2 | Slim the header | One save/sync control + overflow. Kill duplicate branch switchers. |
| 3 | Teach Tokens vs Variables vs Git | Empty states and a 30-second diagram on first project open. |
| 4 | Replace prompt/confirm; add global Cmd+K | Feels like a product instead of a prototype. |
| 5 | Simplify sync and plugin pairing | Connect Git / Connect Figma as two short flows, not a PAT wall. |
| 6 | A11y + responsive pass | Skip link, labels, reduced motion, header overflow, token tables on tablet. |
| 7 | Unify publish | Releases, docs publish, and export save become one version story. |

## Visual system notes
Do not restyle the palette. DESIGN.md is already the brand. Inconsistencies to fix: hardcoded `#09090d` on the workspaces route vs CSS variables elsewhere; uppercase tracked labels vs sentence-case DESIGN.md; mixed 11px/10px mono chips; native select vs Radix Select; dialogs that do not follow ExtensionDetailModal geometry.