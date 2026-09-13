# Skills & Operational Workflows (`SKILLS.md`)

This guide serves as an operational cheat sheet for human engineers and AI coding agents working on the **Second Screen / Tokens Platform** codebase.

---

## 1. Schema Management & Registry Operations

### Adding a New Schema
1. Open [`data/schemaCatalog.ts`](file:///d:/GitHub/second-screen/data/schemaCatalog.ts).
2. Append a new typed object to `SCHEMA_CATALOG`:
   ```typescript
   {
     id: "my-new-schema",
     name: "My New Schema",
     category: "functions", // "core" | "color-spaces" | "functions"
     typeTag: "Function",
     description: "Explanation of purpose and parameters.",
     schemaUrl: "/api/v1/schemas/functions/my-new-schema/0/schema.json",
     isCoreDefault: false,
   }
   ```
3. If this schema should be enabled by default for fresh projects, add `"my-new-schema"` to `DEFAULT_ENABLED_SCHEMA_IDS`.
4. The local dynamic router in [`app/api/v1/schemas/[...path]/route.ts`](file:///d:/GitHub/second-screen/app/api/v1/schemas/[...path]/route.ts) will automatically serve the JSON Schema draft 2020-12 specification with dynamic origin matching.

### Checking Catalog Integrity
```bash
node -e "const { SCHEMA_CATALOG } = require('./data/schemaCatalog'); console.log('Total Schemas:', SCHEMA_CATALOG.length);"
```

---

## 2. High-Scale Token Engine & Infinite Scrolling

When modifying [`components/TokensWorkspace.tsx`](file:///d:/GitHub/second-screen/components/TokensWorkspace.tsx):
- **Never Mount 10,000+ DOM Rows at Once**: Large repositories have 13,000+ tokens across sets. Always use the progressive batch loader (`visibleCount`, `INITIAL_BATCH_SIZE = 100`, `BATCH_INCREMENT = 100`).
- **Use `sliceGroupTree` for Folder Trees**: Grouped view hierarchy nodes must be sliced to `visibleCount` to prevent memory blowup.
- **Hoisting State**: Never let individual table rows subscribe to the entire Zustand store directly. Pass down `isEditable` and `onCopy` as memoized props to prevent 13,000+ simultaneous re-renders.
- **Alias Resolution Index**: When resolving reference aliases (`{color.brand.primary}`), always query the $O(1)$ index via `buildTokenLookupIndex` in [`utils/transformTokens.ts`](file:///d:/GitHub/second-screen/utils/transformTokens.ts) rather than recursively walking all set trees.

---

## 3. Figma Companion Plugin & Variable Synchronization

### Plugin Architecture
* **Directory:** [`plugin/`](file:///d:/GitHub/second-screen/plugin/)
* **Backend Hook:** `plugin/src/code.ts` (runs inside Figma sandbox, accesses `figma.variables` and canvas nodes).
* **Frontend UI:** `plugin/src-ui/App.tsx` (React + Tailwind UI rendered in an iframe inside Figma).

### Development & Build
To build the Figma companion plugin bundle:
```bash
npm run build:plugin
```
This runs Vite with `plugin/vite.config.ts` and outputs the final bundle to `plugin/dist/`.

### Testing Pairing API
Pairing tokens between web app and Figma uses an ephemeral 6-digit code:
```bash
# Request pairing code:
POST /api/v1/auth/pair
```

---

## 4. Multi-Tenant Project & Workspace Life-Cycle

* **Data Model:** [`types/tenant.ts`](file:///d:/GitHub/second-screen/types/tenant.ts)
* **Firestore Service:** [`services/organizationService.ts`](file:///d:/GitHub/second-screen/services/organizationService.ts)
* **Validation Rules:**
  - Organization names and slugs must be globally unique across all tenants.
  - Project names and slugs must be unique within the current organization.
  - Fresh projects must initialize 100% clean (zero mock/dummy token injections).
* **Document Safeguard:**
  - Never write payloads > 950 KB to a single Firestore document (Firestore has a hard 1 MiB document limit). Large token sets must be chunked or stored in Git.

---

## 5. Build, Lint & Verification Commands

Always run these commands before committing code changes:

```bash
# 1. Verify TypeScript types (must exit with code 0)
npx tsc --noEmit

# 2. Verify Next.js production build & static routes (must generate 15/15 pages)
npm run build

# 3. Test local dev server
npm run dev
```
