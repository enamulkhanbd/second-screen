# Agent Development & Pair Programming Guide (`AGENTS.md`)

This document defines the behavioral constraints, architectural rules, and engineering guardrails for AI coding assistants (such as Antigravity, Gemini, or Claude) pair programming on the **Second Screen / Tokens Platform** codebase.

---

## 1. Architectural Guardrails & Tech Stack

1. **Framework**: Next.js 14 (App Router, React 18, TypeScript).
2. **State Management**: Zustand stores ([`store/useTokenStore.ts`](file:///d:/GitHub/second-screen/store/useTokenStore.ts)).
3. **Styling**: Tailwind CSS with custom theme variables, Radix UI primitives, Lucide React icons.
4. **Backend & Tenancy**: Firebase Client SDK / Cloud Firestore (`organizations/{orgId}/projects/{projectId}`), Next.js API route handlers (`app/api/*`).
5. **Token Standards**: DTCG 2025.10 design token specification, self-hosted Draft 2020-12 JSON Schema registry.

---

## 2. Critical Rules & Invariants

### Rule 1: Zero External Schema Registry Links
* **NEVER** link to or hardcode `https://registry.tokens.studio` anywhere in the codebase.
* All schema URLs must be **100% self-hosted** (e.g. `/api/v1/schemas/...`), resolving dynamically to the application's current origin (`window.location.origin` in UI, `req.nextUrl.origin` on server).
* The user's platform owns its schema definitions and branding completely.

### Rule 2: Strict React Hooks Ordering
* **NEVER** place an early return (`if (!item) return null;`) before hook calls (`useMemo`, `useState`, `useEffect`).
* Every hook must execute unconditionally at the top of the functional component to comply with React's Rules of Hooks.

### Rule 3: `tailwind-merge` & Dialog Overrides
* Do not prepend exclamation marks (`!overflow-hidden`, `!flex`) when attempting to override base Radix/shadcn classes inside `cn()`.
* `tailwind-merge` fails to recognize exclamation-prefixed classes as conflicting with base classes (e.g. `overflow-y-auto` will not be removed if passed `!overflow-hidden`).
* Instead, pass standard utility classes (`overflow-hidden`, `flex flex-col`), and apply `style={{ overflow: "hidden" }}` when strict container bounds are required.

### Rule 4: High-Scale Token Rendering
* Real enterprise projects in this application contain **13,000+ tokens**.
* Never attempt to render thousands of table rows, color pickers, or dropdowns simultaneously.
* Always maintain progressive batch loading (`INITIAL_BATCH_SIZE = 100`, `BATCH_INCREMENT = 100`) and use `React.memo` on row and tree items to keep browser thread memory responsive.

### Rule 5: Preservation of Documentation & Comments
* Maintain documentation integrity. Preserve all existing comments and docstrings that are unrelated to code modifications.
* Do not delete or overwrite production configurations without explicit confirmation.

---

## 3. Standard Verification Checklist

Before reporting completion on any task:

1. **Type Safety**:
   ```bash
   npx tsc --noEmit
   ```
   *Must exit with code 0.*
2. **Production Build Validation**:
   ```bash
   npm run build
   ```
   *Must generate all 15 static/dynamic pages without lint or compilation errors.*
3. **No Dangling References**:
   Verify that any new routes or component views are properly imported and routed in [`app/page.tsx`](file:///d:/GitHub/second-screen/app/page.tsx), [`components/Sidebar.tsx`](file:///d:/GitHub/second-screen/components/Sidebar.tsx), and [`components/Header.tsx`](file:///d:/GitHub/second-screen/components/Header.tsx).

---

## 4. Key File Map

| Purpose | File Path |
|---------|-----------|
| **Schema Catalog** | [`data/schemaCatalog.ts`](file:///d:/GitHub/second-screen/data/schemaCatalog.ts) |
| **Schema Registry API** | [`app/api/v1/schemas/route.ts`](file:///d:/GitHub/second-screen/app/api/v1/schemas/route.ts) & [`app/api/v1/schemas/[...path]/route.ts`](file:///d:/GitHub/second-screen/app/api/v1/schemas/[...path]/route.ts) |
| **Extension Marketplace** | [`components/ExtensionsView.tsx`](file:///d:/GitHub/second-screen/components/ExtensionsView.tsx) |
| **Inspector Detail Modal** | [`components/ExtensionDetailModal.tsx`](file:///d:/GitHub/second-screen/components/ExtensionDetailModal.tsx) |
| **Tokens Table Workspace** | [`components/TokensWorkspace.tsx`](file:///d:/GitHub/second-screen/components/TokensWorkspace.tsx) |
| **Token Aliases & Math** | [`utils/transformTokens.ts`](file:///d:/GitHub/second-screen/utils/transformTokens.ts) |
| **Global Store** | [`store/useTokenStore.ts`](file:///d:/GitHub/second-screen/store/useTokenStore.ts) |
| **Multi-Tenant Service** | [`services/organizationService.ts`](file:///d:/GitHub/second-screen/services/organizationService.ts) |
| **Figma Companion Plugin** | [`plugin/src/code.ts`](file:///d:/GitHub/second-screen/plugin/src/code.ts) & [`plugin/src-ui/App.tsx`](file:///d:/GitHub/second-screen/plugin/src-ui/App.tsx) |
| **System Architecture** | [`docs/ARCHITECTURE.md`](file:///d:/GitHub/second-screen/docs/ARCHITECTURE.md) |
| **Design System Standards** | [`docs/DESIGN.md`](file:///d:/GitHub/second-screen/docs/DESIGN.md) |
| **Skills & Operations** | [`docs/SKILLS.md`](file:///d:/GitHub/second-screen/docs/SKILLS.md) |
| **Schema Deployment Plan** | [`docs/SCHEMA_REGISTRY_DEPLOYMENT_PLAN.md`](file:///d:/GitHub/second-screen/docs/SCHEMA_REGISTRY_DEPLOYMENT_PLAN.md) |
