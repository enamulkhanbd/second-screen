# Second Screen MCP — System-Specific Implementation Plan

> **Status:** Implementation blueprint; no MCP server is deployed yet.
>
> **Repository baseline:** `main` at commit `dcd25ad9d5973197674614fe80e11b435533c857`.
>
> **Purpose:** This document is the corrected sibling of `docs/mcp.md`. It is intentionally specific to the current Second Screen repository. It separates existing code from planned work, freezes a safe read-only v1, and provides copy-pasteable vibe-coding task cards for an AI coding agent.
>
> **Non-negotiable rule:** Nothing described as planned below may be advertised as available until the corresponding code, tests, staging evidence, and release checklist are complete.

---

## 1. Decision summary

Second Screen should build MCP as a **remote, HTTPS, read-only, project-bound service first**. The first release should expose a small number of bounded tools over Streamable HTTP. It should not expose writes, broad documentation resources, Figma inspection, arbitrary R2 keys, or a stdio bridge in v1.

The existing repository contains useful domain logic for token transformation, theme resolution, export compilation, accessibility analysis, Supabase persistence, R2 metadata, PAT hashing, and project membership checks. It does **not** contain an MCP server, an MCP route, an MCP SDK dependency, a project-bound MCP credential flow, MCP tests, a stdio bridge, or production MCP observability.

The implementation must therefore proceed in this order:

1. Correct the truth in the UI and documentation.
2. Freeze the protocol, authentication, tenant context, and public data contracts.
3. Prove the Next.js/Node runtime and SDK build path.
4. Harden credential binding, origin handling, limits, and asset access.
5. Ship a read-only pilot with executable contract tests.
6. Add production evidence before expanding the surface.
7. Design writes as a separately approved release.

### 1.1 Final recommendation

**Do not implement the old 16-tool plan directly.** Build the following v1 first:

- `list_workspaces`
- `get_project_overview`
- `search_tokens`
- `get_token_details`
- `check_color_contrast`
- `export_tokens_code`

These tools must be project-bound, typed, bounded, read-only, and fixture-tested. MCP resources and prompts are deferred until their trust, size, and authorization contracts are proven.

---

## 2. Current repository truth

The following table is the source of truth for the starting point.

| Area | Current state | Evidence | MCP implication |
|---|---|---|---|
| MCP HTTP endpoint | Not implemented | No `app/api/v1/mcp/route.ts` | Build it from the frozen contract; do not document it as live. |
| MCP core | Not implemented | No `lib/mcp/` | Create a transport-independent core only after the runtime spike. |
| MCP SDK | Not a direct dependency | `package.json` has no `@modelcontextprotocol/sdk` or `zod` | Add and pin dependencies during Phase 1. |
| MCP tests | Not implemented | No MCP route/conformance test suite | Add route, protocol, security, and staging tests. |
| Stdio bridge | Not implemented | No `scripts/mcp-server.mjs` | Defer to a later release. |
| MCP UI | Exists but is misleading | `components/McpCliView.tsx` | Remove fake package, plaintext token config, and `MCP v1.0` badge. |
| PAT issuance | Exists, but unbound | `app/api/v1/auth/pat/route.ts` accepts no project binding | Add a separate project-bound MCP credential path. |
| PAT storage | Supports binding fields | `utils/cloudStorage.ts`, `api_keys` migration | Reuse storage after making binding mandatory for MCP keys. |
| Project authorization | Exists but allows unbound records | `utils/auth.ts:93-98` only rejects mismatches when fields exist | MCP authorization must fail closed when binding is missing. |
| Token transformation | Exists | `utils/transformTokens.ts` | Reuse through a stable adapter; do not expose internal types directly. |
| Theme resolution | Exists | `utils/themeHelpers.ts` | Define selections by stable IDs, not one display-name string. |
| Token writes | Existing REST behavior is shallow merge | `app/api/v1/tokens/route.ts` | Do not reuse this for future MCP writes. |
| Export compilers | Exists | `utils/exportsCompiler.ts`, `utils/releaseCompiler.ts` | Map exact compiler outputs to a versioned MCP response. |
| Accessibility | Exists with edge cases | `utils/accessibility.ts` | Define alpha and invalid-color behavior before exposing it. |
| Schema catalog | Exists as a catalog/generator | `data/schemaCatalog.ts`, `utils/dtcgSchemaGenerator.ts` | Do not claim current document validation; hard-code no count. |
| Asset metadata/R2 | Exists | `lib/r2.ts`, asset routes | MCP must authorize the project and derive keys server-side. |
| Rate limiting | Only instance-local precedent | pairing limiter and plan notes | Use shared production controls before public rollout. |
| CI/CD | No MCP-specific workflow | No `.github` workflow in the baseline | Add required checks before calling v1 releasable. |

### 2.1 Existing code that may be reused

Reuse the following only through small MCP adapters:

- `utils/patAuth.ts` for hashing and validation primitives.
- `utils/auth.ts` for the membership/role logic, after adding a fail-closed MCP binding check.
- `utils/cloudStorage.ts` for API-key persistence, after adding the MCP credential metadata required by the contract.
- `services/organizationService.ts` for project loading, after ensuring one-project queries only.
- `utils/transformTokens.ts` for flattening, alias resolution, and path operations.
- `utils/themeHelpers.ts` for theme-group and selected-set resolution.
- `utils/exportsCompiler.ts` and `utils/releaseCompiler.ts` for bounded export generation.
- `utils/accessibility.ts` after adding explicit tests for invalid colors and alpha behavior.
- `lib/r2.ts` for authorized asset metadata/content access, never with a client-supplied arbitrary key.

### 2.2 Code that must not be copied into MCP

Do not copy these behaviors into the MCP route:

- `app/api/v1/tokens` whole-document shallow merge for future writes.
- `app/api/v1/releases` all-project loading behavior.
- `app/api/v1/tokens/branches` external Git provider calls or Git credentials.
- `/api/assets/content` client-supplied arbitrary R2 key access.
- Wildcard CORS for credential-bearing responses.
- Process-local rate limiting as the only abuse control.
- The current `McpCliView.tsx` `npx @tokens-platform/mcp-server` snippet.

---

## 3. Protocol target and transport contract

### 3.1 Pin the protocol revision

At implementation start, record the exact MCP specification revision in:

- `lib/mcp/protocol.ts`
- `docs/mcp-pure-implementation-plan.md`
- the health/capabilities response
- the contract-test fixture

The implementation should target the current official Streamable HTTP specification and must not silently implement a mixture of legacy and current behavior. Use the official specification as the authority:

- [MCP basic specification](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [MCP lifecycle](https://modelcontextprotocol.io/specification/2026-07-28/basic/lifecycle)
- [MCP tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [MCP prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [MCP pagination](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination)
- [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)

If the official revision changes before implementation, update the pinned revision and rerun the protocol review. Never implement assumptions from an old blog post or a scratch experiment as the contract.

### 3.2 v1 transport

v1 has one transport:

```text
POST https://<second-screen-origin>/api/v1/mcp
Authorization: Bearer <project-bound-credential>
Content-Type: application/json
Accept: application/json, text/event-stream
```

The route runs in the Node runtime if required by the selected SDK. The implementation must prove that the selected SDK and transport bundle correctly in this Next.js 14 application.

The route must define behavior for:

- valid POST requests;
- malformed JSON;
- unsupported content types;
- protocol-version mismatch;
- missing or mismatched MCP headers required by the pinned revision;
- unauthorized and insufficient-scope requests;
- oversized request bodies;
- tool timeout and cancellation;
- unsupported methods;
- health checks that do not disclose secrets;
- upstream Supabase/R2 failures;
- rate-limit responses.

Do not add `GET`, `DELETE`, sessions, or subscription behavior unless the selected protocol revision and actual product need require them. If a capability is not implemented, do not advertise it.

### 3.3 Separate protocol errors from domain errors

Protocol/transport failures must use the protocol’s JSON-RPC and HTTP semantics. Business failures returned by a valid tool call must use a stable domain envelope.

Example domain error:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "The requested token was not found."
    }
  ],
	  "structuredContent": {
	    "error": {
	      "code": "TOKEN_NOT_FOUND",
	      "message": "The requested token was not found.",
	      "requestId": "req_01..."
	    }
	  }
}
```

Do not return database exception text, SQL details, R2 keys, bearer tokens, or stack traces to the MCP client.

---

## 4. Authentication, project binding, and tenant isolation

### 4.1 Credential decision

For the first implementation, use a **distinct project-bound MCP credential** built on the existing hashed PAT storage model. This is simpler and safer than pretending the existing general-purpose PAT is already sufficient.

The product must make one explicit decision before public remote rollout:

- **Private PAT profile:** supported clients receive a preconfigured bearer credential; interoperability limitations are documented; or
- **OAuth resource-server profile:** implement the current MCP authorization discovery and protected-resource requirements.

If broad remote-client interoperability is a product requirement, implement OAuth 2.1/PKCE, protected-resource metadata, `WWW-Authenticate` challenges, resource/audience validation, issuer validation, scopes, short-lived access tokens, and refresh-token rotation. See [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization), [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728.html), and [RFC 8707](https://www.rfc-editor.org/rfc/rfc8707.html).

Do not ship an ambiguous hybrid where clients are told to use PATs but the endpoint appears to be a standard OAuth resource server.

### 4.2 MCP credential invariants

Every MCP credential must have:

- immutable `uid`;
- immutable `orgId`;
- immutable `projectId`;
- explicit allowed scopes;
- bounded expiry;
- a credential ID and prefix for audit, never the plaintext token;
- revocation status;
- creation and last-used timestamps;
- a display name;
- a credential type such as `mcp_project`.

The MCP route must reject a credential with no `orgId` or `projectId`, even if the user is otherwise a valid member. General REST PAT compatibility must be reviewed separately.

### 4.3 Project resolution

MCP project scope is determined in this order:

1. Immutable project binding on the credential.
2. Optional explicit `projectRef` only if it exactly matches the binding.
3. No header/query fallback in v1.
4. No auto-selection of the first accessible project.
5. Slugs may be accepted only as a UI convenience during credential creation and must resolve to exactly one immutable ID before issuance.

Every project-scoped tool receives a canonical context:

```ts
export type McpProjectContext = {
  credentialId: string;
  uid: string;
  orgId: string;
  projectId: string;
  role: string;
  branchId?: string;
  branchRevision?: string;
};
```

Use IDs in database queries and cache keys. Names and slugs are display fields only.

### 4.4 Credential issuance changes

Modify the existing PAT UI and route only after the contract is approved:

- `components/ApiKeysManager.tsx`
- `components/McpCliView.tsx`
- `app/api/v1/auth/pat/route.ts`
- `utils/patAuth.ts`
- `utils/cloudStorage.ts`
- `utils/auth.ts`

The create request must include an explicit project selection and credential type. The server must resolve the project from the signed-in session, verify membership, and persist the immutable binding. Never trust `orgId` or `projectId` supplied by the browser without server-side membership verification.

Defaults must be least privilege:

- default scope: `mcp:read` or the project’s equivalent read scope;
- no write scope checkbox in v1;
- no non-expiring credential by default;
- bounded maximum expiry;
- write scopes hidden until the write release exists.

### 4.5 Origin and CORS policy

Credential-bearing routes must not use `Access-Control-Allow-Origin: *`.

Use a configured trusted-origin allowlist. For v1:

- local development may allow configured localhost origins;
- deployed production uses exact HTTPS origins;
- do not allow arbitrary preview origins by default;
- do not expose credentials or authorization headers unless required;
- validate proxy/host configuration at the deployment boundary;
- keep session-cookie mutations protected by same-origin/CSRF rules.

Add negative tests for unknown origins, preview domains, malformed `Origin`, preflight requests, and forwarded-host confusion.

---

## 5. v1 tool contract

### 5.1 Tool registry

Do not hard-code tool counts in documentation. Define one registry in `lib/mcp/registry.ts`. The registry should generate:

- `tools/list` output;
- health/capability output;
- the Developers UI capability explorer;
- contract-test expectations;
- documentation metadata.

The initial registry contains only these six read-only tools:

| Tool | Scope | Input summary | Output summary |
|---|---|---|---|
| `list_workspaces` | account discovery | bounded search/cursor | workspace/project summaries the user is allowed to discover |
| `get_project_overview` | project read | optional branch/ref | bounded project, branch, token-set, theme, and revision summary |
| `search_tokens` | project read | query, filters, cursor, limit, theme selection | matching token summaries with stable paths and revision |
| `get_token_details` | project read | exact token path/set/branch/theme selection | one bounded token detail record plus dependents if requested |
| `check_color_contrast` | project read | foreground/background token refs or explicit opaque colors | ratio, thresholds, pass/fail, parse/alpha status |
| `export_tokens_code` | project read | supported format, branch/theme selection, file cap | complete bounded files or explicit omission metadata |

### 5.2 Deferred tools

Do not register these in v1:

- `upsert_tokens`
- `delete_tokens`
- `create_branch`
- release publishing
- arbitrary asset content retrieval
- native Figma collection/mode inspection
- broad documentation search
- autonomous migration prompts

They require a second design review and separate release gate.

### 5.3 Common response envelope

Every tool response must include:

```ts
export type McpMeta = {
  requestId: string;
  serverVersion: string;
  surfaceVersion: string;
  orgId: string;
  projectId: string;
  branchId?: string;
  revision: string;
  truncated: boolean;
};
```

List-like outputs must additionally include:

```ts
export type McpPage<T> = {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  snapshotRevision: string;
};
```

Use opaque cursors. Do not expose database offsets or require clients to interpret cursor contents. A cursor must be tied to a deterministic sort and snapshot/revision. If the revision is no longer valid, return a typed cursor-invalidated error.

### 5.4 Token value contract

Do not expose repository `any` types directly. Define a public union:

```ts
export type McpTokenValue =
  | { kind: "scalar"; value: string | number | boolean | null }
  | { kind: "composite"; value: Record<string, unknown> | unknown[] };
```

Token records must distinguish:

- token path;
- token-set name and ID if available;
- raw value;
- resolved value;
- value type;
- alias/reference status;
- resolution errors;
- deprecation status;
- source revision.

Never include secrets or unrelated project data.

### 5.5 Theme contract

Use stable group and option IDs when available:

```ts
{
  "themeSelections": {
    "group-id": "option-id"
  }
}
```

A theme matrix must define:

- selected group/option IDs;
- precedence order;
- inactive token sets;
- missing-cell behavior;
- alias resolution status;
- source token set and path;
- nullable cells for unresolved/missing values.

Do not reduce the system to a single `themeMode: string` field.

### 5.6 Accessibility contract

The v1 tool must either require opaque colors or require explicit compositing behavior for alpha colors. It must never silently report a valid WCAG result for an invalid or incompletely handled color.

Return:

```ts
{
  "foreground": { "input": "...", "parsed": true, "alpha": 1 },
  "background": { "input": "...", "parsed": true, "alpha": 1 },
  "ratio": 7.12,
  "thresholds": {
    "normalTextAA": true,
    "largeTextAA": true,
    "normalTextAAA": false,
    "largeTextAAA": true
  },
  "alphaHandling": "opaque-only",
  "cvd": []
}
```

Invalid colors must produce a typed invalid-argument error. UI-only fields such as `statusColor` do not belong in the MCP contract.

### 5.7 Export contract

Map public format names to real compiler outputs. At minimum define:

- `css`
- `scss`
- `tailwind`
- `react`
- `typescript`
- `flutter`
- `swift`
- `android`
- `dtcg`
- `raw`

Return complete files, not character-truncated content:

```ts
export type McpExportFile = {
  path: string;
  language: string;
  bytes: number;
  content?: string;
  omitted?: boolean;
  omissionReason?: "byte_limit" | "format_limit" | "unsupported";
};
```

For Android, document that more than one file may be returned. Include the source revision and compiler version. Do not expose partial JSON or partial source code as if it were complete.

### 5.8 Asset policy

Assets are deferred from v1 unless metadata-only access is required for a tested use case. If assets are added later:

- return metadata by default;
- accept an asset ID, never an arbitrary R2 key;
- derive the R2 key server-side;
- verify the key prefix matches the bound org/project;
- cap bytes and content types;
- return SVG inline only when explicitly requested;
- use safe cache headers;
- never expose private URLs or custom metadata by default.

---

## 6. File plan

### 6.1 New files

```text
lib/mcp/protocol.ts
lib/mcp/types.ts
lib/mcp/errors.ts
lib/mcp/auth.ts
lib/mcp/context.ts
lib/mcp/limits.ts
lib/mcp/registry.ts
lib/mcp/server.ts
lib/mcp/serializers.ts
lib/mcp/cursors.ts
lib/mcp/tools/listWorkspaces.ts
lib/mcp/tools/getProjectOverview.ts
lib/mcp/tools/searchTokens.ts
lib/mcp/tools/getTokenDetails.ts
lib/mcp/tools/checkColorContrast.ts
lib/mcp/tools/exportTokensCode.ts
app/api/v1/mcp/route.ts
app/api/v1/mcp/health/route.ts
app/api/v1/mcp/__tests__/route.test.ts
app/api/v1/mcp/__tests__/security.test.ts
app/api/v1/mcp/__tests__/contract.test.ts
lib/mcp/__tests__/cursors.test.ts
lib/mcp/__tests__/serializers.test.ts
lib/mcp/__tests__/resolver.test.ts
```

### 6.2 Existing files to update

```text
package.json
package-lock.json
next.config.mjs
components/McpCliView.tsx
components/ApiKeysManager.tsx
app/api/v1/auth/pat/route.ts
utils/patAuth.ts
utils/auth.ts
utils/cloudStorage.ts
utils/cors.ts
utils/accessibility.ts
```

### 6.3 Files that should not be changed in the first MCP slice

Do not modify token write behavior, release publishing, external Git synchronization, or the Figma plugin unless a tool explicitly requires it and the change has its own tests and review.

---

## 7. Vibe-coding workflow

Vibe coding is allowed only when each AI coding step has a narrow objective, explicit files, tests, and a stop condition. The agent must inspect the repository before editing and must not invent files or claims.

### 7.1 Rules for every AI coding session

1. Work on branch `docs/mcp-pure-implementation-plan` or a new implementation branch created from the intended base.
2. Read `AGENTS.md` and the relevant source files first.
3. Make one coherent change per task card.
4. Add or update tests in the same task.
5. Run the narrowest relevant test first.
6. Run typecheck/build before merging a phase.
7. Never weaken a test to make it pass.
8. Never add a fallback protocol implementation without a written protocol review.
9. Never log bearer tokens, raw API keys, R2 keys, or full user-provided resource content.
10. End every task with a summary of files changed, tests run, known limitations, and the next task.

### 7.2 Agent preamble

Use this preamble at the beginning of every coding-agent prompt:

```text
You are modifying the Second Screen repository. Do not assume planned MCP files exist.
Inspect the requested files and AGENTS.md before editing. Keep the change narrowly scoped.
Do not change unrelated product behavior. Add tests for every new behavior.
Do not log credentials or return raw internal errors. If the requested behavior conflicts
with the current repository or the pinned MCP specification, stop and report the conflict
instead of guessing.
```

### 7.3 Task Card 0 — Truth reset

**Goal:** Remove misleading MCP availability claims before implementation.

**Files:**

- `components/McpCliView.tsx`
- `docs/mcp.md` only if the original is explicitly approved for correction
- this replacement plan remains the source of truth for planned behavior

**Agent prompt:**

```text
Apply the MCP truth reset to the Second Screen repository.

Inspect components/McpCliView.tsx and the current API-key UI. The MCP backend, npm package,
health route, and stdio bridge do not exist yet. Replace the fake npx configuration and
MCP v1.0 badge with an explicit not-yet-available state. Do not copy plaintext PATs into
React state or clipboard-ready configuration. Preserve the existing PAT manager unless a
small safe UI change is required. Add or update focused component tests if the repository
has a suitable test pattern. Report exact files changed and test commands.
```

**Exit criteria:** No UI claims MCP is available; no generated config contains a live token.

### 7.4 Task Card 1 — Runtime spike

**Goal:** Prove the SDK and Next.js runtime before creating the full server.

**Files:**

- `package.json`
- `package-lock.json`
- `next.config.mjs`
- a temporary or committed minimal route fixture

**Agent prompt:**

```text
Run a minimal MCP Streamable HTTP runtime spike for this Next.js 14.2 repository.

Pin the official MCP SDK and zod versions selected for the project. Add colorjs.io as a
direct dependency because existing source files import it directly. Create the smallest
possible route fixture using the Web Request/Response APIs and the Node runtime required
by the SDK. Run npm ci, typecheck, build, and start against the actual package scripts.
Record the exact Node version, SDK version, build result, and any next.config.mjs change.
Do not implement business tools or a custom fallback handler. If the SDK cannot bundle,
stop with the build error and propose the smallest evidence-based configuration change.
```

**Exit criteria:** Reproducible install/build/start result recorded; no fallback invented.

### 7.5 Task Card 2 — Public contract types

**Goal:** Freeze typed envelopes, context, cursors, errors, token values, themes, and exports.

**Files:**

- `lib/mcp/types.ts`
- `lib/mcp/errors.ts`
- `lib/mcp/cursors.ts`
- unit tests beside the new modules

**Agent prompt:**

```text
Create the versioned MCP public contract types for the six read-only tools.

Inspect types/tokens.ts, types/tenant.ts, utils/transformTokens.ts, utils/themeHelpers.ts,
utils/exportsCompiler.ts, utils/releaseCompiler.ts, and utils/accessibility.ts first.
Do not expose any or internal database rows directly. Define typed token values, project
context, opaque cursors tied to a revision, common response metadata, domain errors,
accessibility results, and complete export-file results. Add unit tests for serialization,
invalid cursors, record-boundary truncation, and invalid input. Keep the API additive and
versioned. Do not create route handlers in this task.
```

**Exit criteria:** Public types compile and fixtures cover real repository shapes.

### 7.6 Task Card 3 — Project-bound MCP credentials

**Goal:** Create and enforce immutable MCP credential binding.

**Files:**

- `app/api/v1/auth/pat/route.ts`
- `components/ApiKeysManager.tsx`
- `utils/patAuth.ts`
- `utils/cloudStorage.ts`
- `utils/auth.ts`
- migrations only if the schema inspection proves one is needed

**Agent prompt:**

```text
Implement a distinct project-bound MCP credential flow using the existing API-key storage.

Inspect the current database migration and storage types before editing. The browser must
not be able to bind a credential to a project without server-side membership verification.
Require credential type, org/project selection, read-only default, bounded expiry, and
immutable orgId/projectId persistence. Make MCP authorization fail closed when binding is
missing. Preserve existing non-MCP REST behavior unless the change is explicitly reviewed.
Add tests for successful binding, missing binding, cross-project access, cross-org access,
ambiguous slugs, removed membership, expiry, revocation, invalid expiry, and least-
privilege default scopes. Never return or log a secret more than the one-time issuance
response already requires.
```

**Exit criteria:** An MCP credential cannot be unbound or cross-project; negative tests pass.

### 7.7 Task Card 4 — MCP context resolver

**Goal:** Resolve one canonical fail-closed project context.

**Files:**

- `lib/mcp/context.ts`
- `lib/mcp/auth.ts`
- tests

**Agent prompt:**

```text
Build the MCP authentication and project-context adapter.

Use the pinned auth profile and existing authenticateRequest/authorizeProjectRequest logic,
but enforce immutable MCP orgId/projectId binding for every project-scoped read. Do not
accept arbitrary x-org-id, x-project-id, query precedence, or first-project auto-pick.
Use IDs for all downstream queries and cache keys. Return a canonical context object with
credential ID, uid, orgId, projectId, role, branch, and revision. Map failures to stable
protocol/domain errors without database details. Add IDOR, ambiguity, missing-project,
revoked-key, expired-key, and membership-removal tests.
```

**Exit criteria:** Every project-scoped call has exactly one authorized context.

### 7.8 Task Card 5 — Registry and read-only tools

**Goal:** Implement the six tools behind one registry.

**Files:**

- `lib/mcp/registry.ts`
- `lib/mcp/tools/*.ts`
- adapters under `lib/mcp/` as needed

**Agent prompt:**

```text
Implement only the six read-only tools listed in the MCP plan.

Reuse existing domain helpers through adapters. Keep outputs bounded and typed. Use opaque
revision-aware cursors for search and any list operation. Search must have deterministic
sorting. Token details must distinguish raw/resolved/composite values and report resolution
problems. Theme selection must use stable IDs. Contrast must reject invalid colors and
make alpha behavior explicit. Export results must contain complete files or explicit
omission metadata and must never be character-truncated. Do not expose assets, Figma,
write tools, broad docs, or prompts. Generate tools/list and health capabilities from one
registry. Add fixture tests for every tool and a test proving write tools are absent.
```

**Exit criteria:** Six tools work against deterministic fixtures and no write capability is advertised.

### 7.9 Task Card 6 — Streamable HTTP route

**Goal:** Expose the registry through the pinned protocol.

**Files:**

- `app/api/v1/mcp/route.ts`
- `app/api/v1/mcp/health/route.ts`
- `lib/mcp/server.ts`
- route tests

**Agent prompt:**

```text
Implement the MCP HTTP route using the pinned official SDK and protocol revision.

Follow the actual official Streamable HTTP contract, not the old initialize/session notes
from the original plan. Validate content type, accepted response types, required MCP
headers/meta for the pinned revision, authorization, body size, and request cancellation.
Return correct protocol errors and stable domain tool errors. Keep the route stateless
unless the specification and runtime proof require otherwise. Define explicit behavior for
unsupported methods, malformed JSON, version mismatch, timeout, cancellation, and upstream
failure. Add route contract tests using Web Request/Response objects. Do not hand-roll a
fallback or add GET/DELETE/subscriptions unless directly required and tested.
```

**Exit criteria:** Local route passes protocol contract tests and build/start.

### 7.10 Task Card 7 — Abuse controls and observability

**Goal:** Make the read-only route diagnosable and resistant to abuse.

**Files:**

- `lib/mcp/limits.ts`
- `utils/cors.ts`
- route/auth adapters
- deployment configuration and CI files

**Agent prompt:**

```text
Add production controls for the read-only MCP route.

Replace wildcard credential-bearing CORS with an explicit configured origin policy. Add
request, body, response, concurrency, timeout, and cost limits. Use a shared atomic limiter
or document the exact provider primitive that enforces the same guarantees across instances.
Add request IDs, structured redacted metrics, latency/error counters, and secret-scrubbing
tests. Do not log Authorization, plaintext PATs, R2 keys, raw token documents, or full
untrusted descriptions. Return Retry-After on quota errors. Add tests for origin rejection,
body limits, response limits, burst behavior, and sanitized errors.
```

**Exit criteria:** Controls work across the chosen deployment model and secrets cannot enter logs.

### 7.11 Task Card 8 — Test Connection and safe setup UI

**Goal:** Make setup accurate and secret-safe.

**Files:**

- `components/McpCliView.tsx`
- related UI components
- a small authenticated health/capability client if needed

**Agent prompt:**

```text
Implement the MCP Developers UI only for capabilities that now exist.

Add a Test Connection action that reports status, server version, surface version, latency,
auth/binding result, and the registry capabilities without displaying the bearer secret.
Generate client configuration with environment-variable references, never a plaintext PAT.
Clearly distinguish remote HTTPS from future local stdio. Do not claim Cursor, VS Code,
Claude, or Antigravity support until the exact configuration format is documented and
verified. Default all credentials to read-only. Add loading, error, revoked/expired, and
not-yet-available states. Preserve existing design-system patterns.
```

**Exit criteria:** UI never copies secrets into config and accurately reflects deployment state.

### 7.12 Task Card 9 — Staging conformance

**Goal:** Prove the route with a real deployed environment.

**Files:**

- integration harness
- CI workflow
- staging documentation

**Agent prompt:**

```text
Create a staging-only MCP integration and conformance harness.

Use a disposable test organization, project, branch, fixture token set, and project-bound
read-only credential. Test discovery, each six tool call, invalid arguments, missing auth,
wrong project, revoked/expired key, cursor invalidation, body/response limits, 429 behavior,
timeouts, and redacted diagnostics. Run against the deployed staging URL, not only mocks.
Record client/protocol/SDK versions and publish machine-readable results. Do not place the
credential in source control or CI logs. Add a cleanup step that revokes the test key and
removes test data.
```

**Exit criteria:** Staging evidence exists for the exact deployed artifact and client profile.

### 7.13 Task Card 10 — Write design, not write implementation

**Goal:** Produce a separate design review before any mutation tool exists.

**Agent prompt:**

```text
Design but do not implement MCP write tools.

Inspect current token persistence, branch storage, commit model, and tests. Propose an
opaque monotonic revision or ETag, atomic compare-and-swap, durable idempotency key,
replay window, explicit user confirmation, preview/dry-run response, mandatory audit event,
default-branch protection, rollback/revert path, and kill switch. Include failure behavior
for timeouts, duplicate requests, stale revisions, partial writes, and service outages.
Return a design document and test matrix. Do not register or expose any write tool.
```

**Exit criteria:** Security and operations approve the write design separately.

---

## 8. Testing and release gates

### 8.1 Required test layers

1. **Pure unit tests:** cursors, serializers, token adapters, theme mapping, accessibility results, export envelopes.
2. **Auth/security tests:** binding, scopes, expiry, revocation, origin, IDOR, membership changes, error redaction.
3. **Route contract tests:** JSON-RPC/protocol headers, content negotiation, malformed inputs, status mapping, body limits, cancellation.
4. **Integration tests:** real Supabase/R2 staging fixtures where mocks could hide behavior.
5. **Conformance tests:** official Inspector or equivalent plus a pinned Node MCP client.
6. **Performance tests:** 13,000-token project, multi-tenant isolation, burst traffic, p95/p99 latency, memory, DB calls, and export cost.
7. **Deployment smoke tests:** staging and production canary checks.

### 8.2 Release 1 read-only gate

Release 1 may ship only when:

- all six tools are implemented and registry-generated;
- write tools are absent from capability discovery;
- project-bound credential tests pass;
- no critical/high security or correctness findings remain;
- protocol contract tests pass against the pinned revision;
- staging conformance passes;
- CORS, limits, logs, and request IDs are active;
- p95/p99 and error budgets are documented;
- dashboards and alerts are live;
- rollback and disable instructions have been rehearsed;
- setup UI contains no fake package, fake version, or plaintext credential config;
- named engineering/security/operations owners approve the release.

### 8.3 Write-release gate

A write release requires a new review. It must not be enabled by merely changing an environment variable. It requires:

- revision-based atomic writes;
- durable idempotency and replay protection;
- explicit user confirmation;
- preview/dry-run;
- mandatory audit;
- branch/default-branch protection;
- rollback/revert;
- rate/cost controls;
- failure-injection tests;
- a documented kill switch;
- a canary allowlist;
- separate security approval.

---

## 9. Operations and rollback

### 9.1 Required runtime configuration

Document and validate all MCP environment variables through the application’s existing configuration conventions. At minimum define:

- protocol revision;
- MCP surface/server version;
- trusted origins;
- maximum body bytes;
- maximum response bytes;
- tool timeouts;
- shared rate-limit endpoint/credentials;
- staging/production mode;
- feature flags for read-only exposure;
- logging/redaction mode.

Do not print environment values in health responses or logs.

### 9.2 Health endpoint

`/api/v1/mcp/health` must expose only non-secret operational information:

```json
{
  "status": "ok",
  "serverVersion": "1.0.x",
  "surfaceVersion": "1.0",
  "protocolRevision": "<pinned-revision>",
  "capabilities": {
    "tools": ["list_workspaces", "get_project_overview", "search_tokens", "get_token_details", "check_color_contrast", "export_tokens_code"],
    "resources": [],
    "prompts": []
  }
}
```

Do not report raw database errors, secrets, project data, PAT status, or credentials from an unauthenticated health check.

### 9.3 Disable and rollback

The operational rollback for v1 is:

1. Disable MCP route exposure at the deployment edge or feature flag.
2. Revoke affected MCP credentials.
3. Preserve request IDs and redacted audit/metrics for investigation.
4. Roll back the application artifact if necessary.
5. Confirm the health endpoint and client behavior after rollback.
6. Re-enable only after the incident review and staging reproduction.

A write kill switch is not a substitute for safe writes; it is an additional emergency control.

---

## 10. Client setup policy

Client documentation is published only after a real endpoint and a verified client test exist.

### Remote HTTP

Use HTTPS outside localhost. Use environment-variable or client secret-store references. Never place a PAT in a URL, query parameter, checked-in config, screenshot, or generated clipboard JSON.

### Local stdio

Deferred. Do not advertise `scripts/mcp-server.mjs`, an npm package, or a dual-transport promise until the bridge exists and has its own platform-specific tests.

### Client-specific documentation

Maintain separate verified examples for each supported client:

- Cursor remote MCP configuration;
- VS Code `.vscode/mcp.json` versus portable `.mcp.json`;
- Antigravity’s actual current configuration field/path;
- Claude local stdio versus remote connector behavior;
- remote/dev-container execution context.

Each example must identify the tested client version, config location, secret reference syntax, restart/discovery action, and expected capability list.

---

## 11. Documentation maintenance rules

The documentation must be generated or reviewed from the implementation registry where possible.

Never hard-code:

- tool counts;
- resource counts;
- prompt counts;
- schema-catalog counts;
- server version;
- protocol revision;
- current project names;
- credential values;
- unsupported client behavior.

Every feature in the document must have exactly one of these labels:

- **Implemented:** code and tests exist in the referenced commit.
- **Staged:** deployed to staging with evidence.
- **Planned:** design only; not available.
- **Deferred:** intentionally excluded from the current release.
- **Blocked:** dependent on an unresolved runtime, security, or product decision.

---

## 12. Definition of done for this plan

This plan is considered successfully implemented only when:

- the original misleading setup UI is corrected;
- the protocol revision and auth profile are pinned;
- project-bound read-only credentials are issued and enforced;
- the six read-only tools are implemented behind one registry;
- public response contracts match real repository data shapes;
- pagination and truncation are safe;
- the route passes protocol, security, and integration tests;
- the deployed runtime is proven with `npm ci`, typecheck, build, start, and staging smoke tests;
- origin policy, limits, observability, and secret redaction are active;
- client setup is tested and secret-safe;
- no write tool, broad resource, prompt, Figma inspection, or stdio bridge is exposed prematurely;
- the release has measurable performance, rollback, and ownership evidence.

Only after these conditions are met should the plan be expanded with a separately reviewed write release.

---

## References

- [1]: https://modelcontextprotocol.io/specification/2026-07-28/basic "Model Context Protocol Basic Specification"
- [2]: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http "MCP Streamable HTTP Transport"
- [3]: https://modelcontextprotocol.io/specification/2026-07-28/basic/lifecycle "MCP Lifecycle"
- [4]: https://modelcontextprotocol.io/specification/2026-07-28/server/tools "MCP Tools"
- [5]: https://modelcontextprotocol.io/specification/2026-07-28/server/resources "MCP Resources"
- [6]: https://modelcontextprotocol.io/specification/2026-07-28/server/prompts "MCP Prompts"
- [7]: https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination "MCP Pagination"
- [8]: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization "MCP Authorization"
- [9]: https://www.rfc-editor.org/rfc/rfc9728.html "OAuth 2.0 Protected Resource Metadata"
- [10]: https://www.rfc-editor.org/rfc/rfc8707.html "OAuth 2.0 Resource Indicators"
- [11]: https://github.com/enamulkhanbd/second-screen/blob/main/docs/mcp.md "Original Second Screen MCP Plan"
