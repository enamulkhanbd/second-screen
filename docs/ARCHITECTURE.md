# System Architecture (`ARCHITECTURE.md`)

This document provides a comprehensive technical overview of the **Second Screen / Tokens Platform** architecture, data flow, synchronization engines, and component layout.

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Second Screen Web Studio                              │
│                      (Next.js 14 App Router + Tailwind CSS)                       │
├──────────────────────┬──────────────────────┬────────────────────────────────────┤
│   Tokens Workspace   │   Themes & Matrix    │        Schema Marketplace          │
│ (Infinite Scrolling) │  (Multi-Mode Groups) │       (182 Dynamic Schemas)        │
└──────────┬───────────┴──────────┬───────────┴─────────────────┬──────────────────┘
           │                      │                             │
           ▼                      ▼                             ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      Client State Management (Zustand)                            │
│    - rawTokens / themeGroups / enabledSchemas / currentProject / currentUser      │
│    - $O(1)$ Token Lookup Index (buildTokenLookupIndex)                           │
│    - LRU Color & Hex Cache (toHexFast)                                           │
└──────────┬──────────────────────┬─────────────────────────────┬──────────────────┘
           │                      │                             │
           ▼                      ▼                             ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌────────────────────────────────┐
│ Supabase / PostgreSQL│ │   Git Providers      │ │      Local Schema Registry     │
│   (Multi-Tenancy)    │ │ (GitHub, Azure, GitLab)││     (/api/v1/schemas/*)      │
│ - orgs / projects    │ │ - 2-Way Push / Pull  │ │ - 182 Draft 2020-12 Schemas    │
│ - RLS and indexes    │ │ - Branch & Git Tree  │ │ - Dynamic Origin Resolution    │
└──────────────────────┘ └──────────────────────┘ └────────────────────────────────┘
           ▲
           │ Ephemeral 6-digit pairing code (/api/v1/auth/pair)
           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       Figma Companion Plugin (`plugin/`)                         │
│ - Sandbox (`code.ts`): Reads & writes figma.variables, text styles, color modes  │
│ - UI (`src-ui/App.tsx`): React + Tailwind interface embedded in Figma            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure & Responsibilities

```
d:\GitHub\second-screen/
├── app/                        # Next.js 14 App Router
│   ├── api/                    # Serverless API routes
│   │   ├── figma/              # Figma variables & assets endpoints
│   │   ├── git/                # GitHub / Azure DevOps 2-way sync
│   │   ├── v1/auth/            # PAT token & ephemeral pairing APIs
│   │   ├── v1/tokens/          # Token reads and on-demand branch discovery
│   │   ├── v1/releases/        # Version releases & publish
│   │   └── v1/schemas/         # Local Self-Hosted Schema Registry APIs
│   ├── layout.tsx              # Root HTML layout, font loader, dark theme
│   └── page.tsx                # Main entry point: primary sidebar & workspace routing
├── components/                 # React UI components
│   ├── ExtensionsView.tsx      # Unified Schema Marketplace view (centered, no scrollbars)
│   ├── ExtensionDetailModal.tsx# Reference-styled schema inspector dialog
│   ├── TokensWorkspace.tsx     # High-performance tokens grid with infinite scrolling
│   ├── ThemeMatrix.tsx         # Theme groups & multi-mode token matrix
│   ├── Sidebar.tsx             # Primary navigation (Studio tools & Organization switch)
│   ├── Header.tsx              # Breadcrumbs, git status, sync actions, and user menu
│   └── ui/                     # Radix UI + shadcn primitive components
├── data/                       # Static catalogs & changelogs
│   ├── schemaCatalog.ts        # 182-schema catalog master array
│   └── systemChangelog.ts      # In-app version release history (v1.7.0)
├── plugin/                     # Standalone Figma Companion Plugin
│   ├── src/code.ts             # Plugin sandbox code (Figma variables API)
│   ├── src-ui/                 # React UI rendered inside Figma window
│   └── vite.config.ts          # Vite configuration for plugin bundling
├── services/                   # Backend services
│   ├── organizationService.ts  # Supabase tenancy, projects, schemas, and audit logs
│   ├── gitSyncService.ts       # GitHub & Azure DevOps Git API wrapper
│   └── figmaSyncService.ts     # Figma REST API integration
├── store/                      # Zustand state store
│   └── useTokenStore.ts        # Unified client state, token operations, and cache hydration
├── types/                      # TypeScript definitions
│   ├── tokens.ts               # DTCG token types, themes, and formats
│   ├── tenant.ts               # Organization, Project, and Member models
│   └── changelog.ts            # Changelog entry data structures
└── utils/                      # Utilities & pure helper functions
    ├── transformTokens.ts      # Fast alias resolution, $O(1)$ indexing, and color math
    └── themeHelpers.ts         # Token set extraction and theme configuration helpers
```

---

## 3. Data Flow & State Lifecycle

1. **Hydration**:
   On first load, `initializeFromStorage()` in `useTokenStore` reads cached projects and credentials from `localStorage`.
2. **Project Selection**:
   When switching projects, `setCurrentProject(project)` automatically hydrates the project's token sets, active branches, and enabled extensions (`enabledSchemas`).
3. **Token Mutations & Performance**:
   Token additions and edits update the in-memory store and recompute the $O(1)$ alias index. Rows render progressively (100 tokens per batch) to prevent DOM bloat.
4. **Cloud Persistence**:
   Organizations, project data, and activity records are stored in Supabase PostgreSQL (`saveProjectTokensAndBranches` performs atomic project token + branch updates and verifies affected rows; `POST /api/v1/tokens` fails closed on read errors). Asset files are stored in R2, with metadata updated via ETag-conditional writes (`If-Match` / `If-None-Match` with retry in `updateMetadataIndex`) and backed by the `project_assets` schema.
5. **Git & Figma Synchronization**:
   Pushing or pulling synchronizes raw JSON files against GitHub or Azure DevOps repositories via Git tree and commit APIs with per-request deadlines. Figma asset and variable sync endpoints use a shared bounded worker pool (`utils/pool.ts`), per-request and overall deadlines, and structured partial-result reporting.

---

## 4. Authorization, Invitations & Credential Lifecycle

1. **Invitation Authorization (`public.invitations`)**:
   - Enforced by six hardened RLS policies (`20261104_invitation_policy_cleanup.sql`) plus a defence-in-depth `BEFORE INSERT` trigger (`enforce_invitation_insert_rules()`): viewers cannot create or view invitations; editors may invite `editor` or `viewer` only; admins may invite up to `admin`; only the organization owner may invite `owner`.
   - On acceptance (`POST /api/invitations/[token]/accept`) and email dispatch (`POST /api/invitations/send`), the server re-validates the inviter's current authority (`inviterMayGrant`), performs targeted duplicate checks, and atomically claims the `pending -> accepted` state transition before inserting membership.
2. **Personal Access Tokens (`public.api_keys`)**:
   - Bearer tokens (`sec_pat_live_*`) are SHA-256 hashed and resolved in $O(1)$ via the unique index `api_keys_key_hash_uidx` (`findApiKeyByHash`), without full-table scans or cross-instance stale in-memory caches.
   - Revocation (`DELETE /api/v1/auth/pat`) is owner-scoped (`id` + `user_id`), verifies the deleted row count, and propagates database errors rather than reporting false success.
3. **Plugin Pairing Sessions (`public.pairing_sessions`)**:
   - `POST /api/v1/auth/pair` enforces per-IP rate limits (`10/min`, `60/hour`), builds `connectUrl` dynamically from the request origin, and prunes expired/excess sessions (`MAX_PAIRING_MAP_SIZE = 1000`).
   - Plaintext PATs stored on approved pairing sessions are scrubbed (`pat = null`) immediately upon first delivery (`GET`) or acknowledgement (`PATCH`), and expired/stale sessions are purged by `pg_cron` (`pairing-cleanup`) or `/api/v1/auth/pair/cleanup`.
