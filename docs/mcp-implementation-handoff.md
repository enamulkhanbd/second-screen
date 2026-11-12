# Second Screen MCP implementation handoff

**Repository:** `enamulkhanbd/second-screen`

**Working branch:** `docs/mcp-pure-implementation-plan`

**Current head:** `b8af007 feat: add Release 1 read-only MCP tools`

**Purpose:** This document is the implementation handoff for another developer or AI agent. It separates verified code from work that requires access to Supabase, staging, deployment secrets, or production operations.

## 1. Current overall status

The read-only MCP implementation is present and locally validated. The first write-infrastructure slice is also present, but write tools are deliberately not exposed.

The current state is:

- Read-only Streamable HTTP MCP route: implemented.
- Thirteen Release 1 read-only tools: implemented and registered.
- Project-bound credential flow: implemented in the application code and migration.
- Security boundary and trusted-origin CORS: implemented.
- Shared Upstash rate-limit integration: implemented, but not connected to real production credentials in this environment.
- Health and staging conformance tooling: implemented.
- Write design review: documented.
- Write revision, confirmation, idempotency, audit, and CAS database primitives: implemented in code and migration.
- Write preview/apply service primitives: implemented but not exposed through MCP.
- Write MCP tools: **not implemented or registered yet**.
- Supabase credential and write-safety migrations: applied to the connected `tokens-platform` project `kujjcmpevldoaopoevjn`.
- Live branch JSON shape: verified; the default branch is identified by `isDefault`, while `active_branch` may point to a working branch.
- Vercel production deployment: deployed and health-checked at `https://tokensplatform.enamulkhan.com`.
- Trusted origins: configured in Vercel for production and preview.
- Staging conformance against a deployed environment: health contract verified; authenticated tool conformance remains pending a disposable MCP credential.
- Production rollout: **complete for the read-only Release 1 surface**; write capabilities remain disabled.

Do not enable write capabilities merely by changing an environment variable. The write tool registration and release gate are intentionally still missing.

### Live environment verification

The connected Supabase project is:

```text
name: tokens-platform
ref: kujjcmpevldoaopoevjn
region: ap-northeast-2
```

Applied migrations include:

```text
mcp_project_credentials
mcp_write_safety
mcp_default_branch_guard
harden_live_is_org_member_search_path
```

The Vercel project is `second-screen` (`prj_SPbO4guhtRPjzyEdNXwpJqa6RdJ8`). Its latest verified production health response reports:

```json
{
  "trustedOriginsConfigured": true,
  "sharedRateLimiterConfigured": false,
  "writeCapabilitiesEnabled": false
}
```

The shared limiter remains disabled because Upstash credentials have not been supplied. Do not set `MCP_REQUIRE_SHARED_LIMITER=true` until those credentials are configured.

## 2. Branch and commit history

The work is on:

```text
docs/mcp-pure-implementation-plan
```

Relevant commits, newest first:

```text
b8af007 feat: add Release 1 read-only MCP tools
cd955eb feat: add guarded MCP write primitives
ea58837 docs: define MCP write safety design
640cc54 feat: harden MCP for controlled release
47ac21a feat: implement read-only MCP server
dcd1352 feat: harden MCP security boundary
5d86816 feat: add project-bound MCP credential foundation
```

## 3. Implemented read-only MCP surface

### HTTP endpoints

- `POST /api/v1/mcp`
- `GET /api/v1/mcp/health`
- `OPTIONS /api/v1/mcp`
- Unsupported stateful `GET` and `DELETE` behavior is rejected.

The route uses the pinned official MCP SDK:

```text
@modelcontextprotocol/sdk 1.32.2
```

It uses stateless JSON Streamable HTTP with JSON responses. The route includes authentication, trusted-origin handling, request IDs, body limits, response limits, timeout protection, shared rate limiting, and redacted metrics.

### Registered tools

The following thirteen read-only tools are advertised:

```text
list_workspaces
get_project_overview
list_token_sets
get_themes_matrix
search_tokens
get_token_details
validate_tokens
list_branches
inspect_figma_variables
search_project_assets
get_documentation_pages
check_color_contrast
export_tokens_code
```

No write tools, resources, or prompts are advertised.

### Main files

- `app/api/v1/mcp/route.ts`
- `app/api/v1/mcp/health/route.ts`
- `lib/mcp/server.ts`
- `lib/mcp/context.ts`
- `lib/mcp/tools.ts`
- `lib/mcp/types.ts`
- `lib/mcp/errors.ts`
- `lib/mcp/cursors.ts`
- `lib/mcp/limits.ts`
- `lib/mcp/observability.ts`

## 4. Implemented authentication and tenancy controls

The MCP credential flow uses explicit project-bound credentials instead of treating every PAT as an MCP credential.

Implemented behavior includes:

- Explicit `credential_type` storage.
- Immutable organization and project binding for `mcp_project` credentials.
- Server-side membership and role verification.
- Fail-closed behavior when project binding or verified user identity is missing.
- Cross-organization and cross-project rejection.
- Read-only default scopes.
- Trusted-origin CORS for credential-bearing responses.
- Asset content authorization hardening and traversal protection from the earlier security phase.

Relevant files include:

- `app/api/v1/auth/pat/route.ts`
- `utils/patAuth.ts`
- `utils/cloudStorage.ts`
- `utils/auth.ts`
- `utils/cors.ts`
- `supabase/migrations/20261112_mcp_project_credentials.sql`

## 5. Implemented production-hardening code

### Shared rate limiting

`lib/mcp/limits.ts` supports Upstash Redis through:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Production should set:

```text
MCP_REQUIRE_SHARED_LIMITER=true
```

When that flag is true and Upstash is unavailable, the route returns `503` rather than silently using the per-instance in-memory limiter.

### Operational variables

Recommended deployment configuration:

```text
SECOND_SCREEN_TRUSTED_ORIGINS=https://app.example.com,https://staging.example.com
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
MCP_REQUIRE_SHARED_LIMITER=true
MCP_RATE_LIMIT_PER_MINUTE=120
MCP_OBSERVABILITY=true
```

### Conformance command

The repository includes:

```bash
npm run mcp:conformance
```

It requires:

```bash
MCP_BASE_URL=https://staging.example.com
MCP_TEST_TOKEN=sec_pat_...
```

The command verifies health, initialization, exact tool discovery, and absence of write-like tools.

Relevant files:

- `scripts/mcp-conformance.mjs`
- `docs/mcp-production-runbook.md`

## 6. Implemented write infrastructure

The first write slice is deliberately infrastructure-only.

### Database migration

File:

```text
supabase/migrations/20261112_mcp_write_safety.sql
```

It defines:

- `mcp_write_branch_revisions`
- `mcp_write_confirmations`
- `mcp_write_idempotency`
- `mcp_write_audit_events`
- `mcp_apply_token_write(...)` transactional CAS function

The migration includes:

- Row-level security enabled on the new tables.
- Service-role-only execution for the mutation function.
- Monotonic branch revisions.
- Stale-revision rejection.
- Protected default branch rejection.
- Confirmation binding and one-time use.
- Durable idempotency replay response.
- Redacted audit event creation.
- Atomic branch JSON update and revision/audit/idempotency writes.

### Write service

File:

```text
lib/mcp/write.ts
```

Implemented service primitives:

- `previewTokenWrite(...)`
- `applyTokenWrite(...)`
- Zod input validation.
- Write kill switch.
- Canary credential allowlist.
- Patch byte limit.
- Changed-token limit.
- Project and branch authorization.
- Protected default branch rejection.
- Confirmation-token digest lookup.
- Idempotency-key digest creation.
- RPC error mapping to stable MCP domain errors.

The kill switch defaults to disabled:

```text
MCP_WRITE_ENABLED=false
MCP_WRITE_CANARY_CREDENTIAL_IDS=
```

### Safety tests

File:

```text
lib/mcp/__tests__/write.test.ts
```

The tests verify that preview and apply fail before any database access while writes are disabled or not canary-authorized.

## 7. What remains incomplete in the write implementation

These items must be completed by the next developer or AI before write tools can be enabled.

### 7.1 Apply the Supabase migrations

The migration has only been committed to the repository. It has not been applied to a real Supabase project from this environment because no project URL, service-role credentials, or Supabase CLI project context was available.

Required action:

```bash
supabase link --project-ref <staging-project-ref>
supabase db push
```

Then repeat for production only after staging verification and approval.

Verify that these objects exist:

```sql
mcp_write_branch_revisions
mcp_write_confirmations
mcp_write_idempotency
mcp_write_audit_events
mcp_apply_token_write
```

Also verify the function privileges:

- `service_role`: execute allowed.
- `anon`: execute denied.
- `authenticated`: execute denied.

### 7.2 Verify the actual branch JSON shape

The SQL function assumes project branch objects use these JSON keys:

```json
{
  "name": "feature/example",
  "rawTokens": {},
  "themeGroups": []
}
```

This matches the current application serialization assumptions, but it has not been verified against a live production row. Inspect real staging data before applying a write migration.

If live data uses snake-case keys such as `raw_tokens` or `theme_groups`, update the SQL function and add migration tests before proceeding.

### 7.3 Fix or confirm confirmation/audit transaction behavior

`previewTokenWrite` inserts the confirmation and then inserts a preview audit event in two application-level calls. If the audit insert fails after the confirmation insert succeeds, an orphan confirmation may remain.

Recommended follow-up:

- Move preview confirmation and preview-audit creation into one database function or explicit cleanup transaction.
- Add a scheduled cleanup for expired confirmations and idempotency records.
- Add tests for audit insertion failure and cleanup behavior.

### 7.4 Verify confirmation token semantics in staging

The apply service resolves the confirmation row by hashing the presented confirmation token, then passes the confirmation row ID to the transactional RPC. Test:

- Correct token succeeds.
- Wrong token fails.
- Expired token fails.
- Reused token fails.
- Same token with a different project, branch, revision, or patch fails.

### 7.5 Add real database integration tests

The local suite does not connect to Supabase. Add a staging-only integration harness that creates disposable:

- Organization.
- Project.
- Non-default branch.
- Token document.
- Write-capable canary credential.

Test the complete preview/apply path against the deployed application and real database. Clean up by revoking the credential and deleting test data.

### 7.6 Add write MCP tool adapters

Not implemented yet by design.

The future tools should be:

```text
preview_token_changes
apply_token_changes
create_token_branch
revert_token_changes
```

They must not be added directly to the existing read-only registry without a separate release review. Add them through a write capability registry that checks all of:

- `MCP_WRITE_ENABLED=true`.
- Credential ID is in `MCP_WRITE_CANARY_CREDENTIAL_IDS`.
- Credential is an explicit write-capable MCP credential type.
- Deployment mode is approved.
- The health and capability response clearly reports write status without exposing secrets.

Until then, `MCP_TOOL_NAMES` must remain read-only.

### 7.7 Add write-capable credential issuance

Not implemented yet.

The existing `mcp_project` credential type is read-only and must remain read-only. Add a separate credential type, such as `mcp_project_write`, only after:

- Scope defaults are defined.
- Maximum expiry is defined.
- UI confirmation is implemented.
- Server-side role and project checks are complete.
- Revocation and expiry tests exist.
- Security approves the issuance workflow.

Never make existing credentials write-capable by adding a scope or environment flag.

### 7.8 Add durable revision initialization

The database function creates a branch revision row lazily at revision `0`. Verify that this is correct for existing branches. If the application already has a meaningful branch revision or updated-at history, write a migration that initializes revision rows from the live branch state and documents the mapping.

### 7.9 Add rollback/revert implementation

The design requires rollback as a new audited CAS mutation. The current code does not implement a revert tool or inverse-patch service.

Implement and test:

- Revert to a known prior revision.
- Fresh confirmation required.
- Fresh idempotency key required.
- New monotonic revision created.
- Audit event records the source and target revisions.

### 7.10 Add timeout-after-commit behavior tests

The transactional function is designed to support safe retry through idempotency, but no live failure-injection test has been run. Simulate:

1. Commit succeeds.
2. Response is lost or times out.
3. Client retries with the same idempotency key.
4. Client receives the original durable result.

### 7.11 Add cleanup and monitoring

Not implemented or verified:

- Expired confirmation cleanup.
- Expired idempotency cleanup.
- Audit retention policy.
- Alert for repeated stale revisions.
- Alert for failed write transactions.
- Dashboard for write preview/apply outcomes.
- Canary write error budget.

## 8. What could not be completed because of access limitations

The following work was blocked by this sandbox's missing external configuration:

### Supabase access

Unavailable in this environment:

- Supabase project reference.
- Linked Supabase project.
- Service-role credentials.
- Production or staging database access.
- Live database rows for branch-shape verification.

Because of this, the migration was not applied, the SQL function was not executed, and transaction behavior was not tested against PostgreSQL.

### Staging deployment access

Unavailable:

- Deployed staging URL.
- Staging MCP credential.
- Staging Upstash credentials.
- Staging deployment logs and dashboards.
- Real MCP Inspector or client session against the deployed artifact.

Because of this, `npm run mcp:conformance` could not be run against a real environment.

### Production operations access

Unavailable:

- Deployment edge feature flag access.
- Secret manager access.
- Production rollback permission.
- Security/operations dashboard access.
- Production canary allowlist management.

No production capability was enabled or attempted.

## 9. Exact recommended completion order

Use this order to avoid enabling incomplete mutation behavior:

1. Create or select a disposable staging Supabase project.
2. Apply the existing read-only credential migrations.
3. Apply `20261112_mcp_write_safety.sql`.
4. Inspect real project branch JSON shape.
5. Run SQL privilege checks.
6. Configure staging Upstash and trusted origins.
7. Create a disposable read-only project-bound credential.
8. Run `npm run mcp:conformance` against staging.
9. Add staging integration tests for the six read-only tools.
10. Add a separate write-capable credential migration and issuance flow.
11. Add preview/apply/revert MCP tool adapters behind the disabled-by-default registry gate.
12. Add write capability discovery tests.
13. Run preview/apply/replay/stale-revision/failure-injection integration tests.
14. Test rollback and kill switch behavior.
15. Obtain security and operations approval for a staging canary.
16. Enable only selected canary credentials.
17. Monitor errors, latency, stale conflicts, audit events, and idempotency replays.
18. Expand allowlist only after the canary passes.
19. Keep default branch writes disabled until a separate approval.

## 10. Commands for the next implementer

From the repository root:

```bash
npm ci
npx tsc --noEmit
npm test
npm run build
```

For migration work:

```bash
supabase login
supabase link --project-ref <staging-project-ref>
supabase db push
supabase db diff
```

For read-only staging conformance:

```bash
MCP_BASE_URL=https://staging.example.com \
MCP_TEST_TOKEN='sec_pat_...' \
npm run mcp:conformance
```

For write capability, do not set these until the code and staging tests are complete:

```text
MCP_WRITE_ENABLED=true
MCP_WRITE_CANARY_CREDENTIAL_IDS=<explicit-staging-credential-id>
```

## 11. Current verification results

The latest local validation after commit `cd955eb`:

- TypeScript: passed.
- Full Vitest suite: **112 tests passed**.
- Production build: passed.
- Migration marker and privilege checks: passed.
- Write-tool absence check: passed.

The local tests do not prove database correctness. A successful local build is not a substitute for staging migration and transaction verification.

## 12. Safety statement

At the time of this handoff:

- The MCP registry exposes only read-only tools.
- The health endpoint reports writes disabled.
- No write credential is issued by the new code.
- The write kill switch defaults to disabled.
- The write migration is not applied by this environment.
- No staging or production data was modified.
