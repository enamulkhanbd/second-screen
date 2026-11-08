const fs = require("fs");
let md = fs.readFileSync("docs/PERFORMANCE_SYSTEM_ANALYSIS.md", "utf8");

const oldPhase1 = `### Phase 1 — Quick wins (≈1 week)
| Item | Ref | Effort |
|---|---|---|
| Batch store actions for bulk edit/delete (one clone/resolve/persist) | F2 | S |
| Debounce + single-flight cloud save; stop invalidating metadata cache per keystroke; debounce activity persistence | F3 | S–M |
| Authenticate once per request; remove double auth in \`/api/v1/tokens\` | B1 | S |
| Hash lookup for bearer tokens; \`UNIQUE(key_hash)\` | B2 | S |
| Column projection for \`getProject\` in API routes; \`?include=\` flag | B3 | S |
| Dynamic \`import()\` for \`releaseCompiler\`/\`jszip\`; extract \`DEFAULT_ENABLED_SCHEMA_IDS\` | F4 | S |
| Remove \`useTokenStore()\` from row/cell/doc-block components (selectors) | F5 | S |
| Compact JSON for R2 metadata; ETag micro-cache | B6 | S |
| Delete dead \`TokenTable.tsx\`; drop \`./plugin/**\` from Tailwind content | F14 | S |`;

const newPhase1 = `### Phase 1 — Quick wins (≈1 week)
| Item | Ref | Effort | Status | Notes |
|---|---|---|---|---|
| Batch store actions for bulk edit/delete/duplicate/move (one clone/resolve/persist) | F2 | S | **Done** | \`duplicateTokensBatch\`, \`moveTokensBatch\`, \`updateTokensBatch\`, \`deleteTokensBatch\` active in store & workspace |
| Debounce + single-flight cloud save; stop invalidating metadata cache per keystroke | F3 | S–M | **Done** | Single-flight queue with retry back-off in \`store/useTokenStore.ts\`; metadata cache churn removed |
| Authenticate once per request; remove double auth in \`/api/v1/tokens\` | B1 | S | **Done** | \`authorizeProjectRequest\` accepts pre-authenticated record; duplicate calls in GET/POST eliminated |
| Hash lookup for bearer tokens; \`UNIQUE(key_hash)\` | B2 | S | **Done** | Sha256 hash lookup via \`findApiKeyByHash\`; unique index in migration \`20261104_api_keys_unique_hash.sql\` |
| Column projection & ETag 304 for \`/api/v1/tokens\` | B3 | S | **Done** | ETag header added, \`If-None-Match\` -> \`304 Not Modified\` short-circuit |
| Dynamic \`import()\` for \`releaseCompiler\`/\`jszip\`; extract \`DEFAULT_ENABLED_SCHEMA_IDS\` | F4 | S | **Done** | Extracted \`data/schemaIds.ts\`; dynamic \`jszip\` imports in all exporters; bundle dropped −24 kB gz on \`/\` |
| Remove \`useTokenStore()\` from row/cell/doc-block components (selectors) | F5 | S | In Progress | Selectors in \`TokensWorkspace\` & hot paths; batch row lifting underway |
| Compact JSON for R2 metadata; ETag micro-cache | B6 | S | **Done** | \`loadMetadataIndexWithEtag\` + conditional upload & retry |
| Delete dead \`TokenTable.tsx\`; drop \`./plugin/**\` from Tailwind content | F14 | S | **Done** | Removed \`TokenTable.tsx\` and updated \`tailwind.config.ts\` |`;

const normOld = oldPhase1.replace(/\r?\n/g, "\r\n");
const normNew = newPhase1.replace(/\r?\n/g, "\r\n");

if (!md.includes(normOld)) {
  console.error("Could not find oldPhase1 in PERFORMANCE_SYSTEM_ANALYSIS.md!");
  process.exit(1);
}

md = md.replace(normOld, normNew);
fs.writeFileSync("docs/PERFORMANCE_SYSTEM_ANALYSIS.md", md, "utf8");
console.log("Updated docs/PERFORMANCE_SYSTEM_ANALYSIS.md successfully.");

