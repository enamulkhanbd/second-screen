# Backend Audit — 2026-11-02

## Scope and method

Read-only review of the 28 Next.js API route handlers under `app/api/**`, the OAuth callback and shared authentication utilities, Supabase/R2/invitation services, database migrations, and backend-related package/configuration. Compared related implementations across the repository (including R2 metadata writes, token persistence, API-key lookup, and outbound-provider request handling). No `middleware` file was present. `.env.local` values were not inspected.

Findings below are based on checked-in code. No live Supabase, R2, Figma, or Git provider was accessed, so deployed migration state and external-service behavior were not verified.

## Executive summary

One high-impact authorization defect is confirmed in the invitation RLS policies: the later migration permits any organization member to create invitations, while the acceptance route applies the stored role. Additional confirmed reliability defects can falsely report success when API-key revocation or token persistence fails. R2 asset metadata is maintained as a whole-object read/modify/write document, which creates lost-update races and increasing per-operation cost. Several concrete scaling opportunities concern unbounded Figma request fan-out, full-table API-key reads, and stale pairing-session cleanup.

## Findings

### High impact

#### H1 — Any organization member can create an admin invitation
**Status:** Confirmed defect · **Severity:** High

**Evidence:** `supabase/migrations/20260930_invitations_activities_policies.sql:20-28` adds an invitation `INSERT` policy whose `WITH CHECK` accepts `public.is_org_member(org_id)` without constraining inviter identity or invited role. The prior policy in `supabase/migrations/20260927_security_hardening.sql:320-327` is named `"Admins can create invitations"` and is not dropped by the later migration (which drops a differently named policy at line 5). PostgreSQL permissive policies are OR-combined, so the broader policy expands access. On acceptance, `app/api/invitations/[token]/accept/route.ts:76-83` inserts the stored `invitation.role` after verifying the invitee’s email; it does not independently validate that role against the inviter’s authority.

**Why it matters:** A lower-privilege member may create an invitation assigning a higher role; a matching verified account can accept it. This can elevate membership to administrator-level access.

**Recommendation:** Replace the broad policy with a role-aware policy, explicitly drop the prior narrow policy by its actual name when migrating, and enforce inviter/role authorization server-side both when creating and accepting invitations. Verify the migration is applied in each deployed Supabase project.

### Moderate impact

#### M1 — API-key revocation can return success when the database deletion fails
**Status:** Confirmed defect · **Impact:** Moderate (credential lifecycle/reliability)

**Evidence:** `utils/cloudStorage.ts:90-98` removes the key from the current process’s map, then awaits the Supabase delete without inspecting its returned `error`; its catch also logs and suppresses thrown errors. `app/api/v1/auth/pat/route.ts:107-112` consequently returns “revoked successfully” whenever that helper resolves.

**Why it matters:** A transient database failure can leave the persisted credential active while the caller receives a success response. The in-memory removal only affects the current process.

**Recommendation:** Check and propagate the Supabase error, and return success only after confirmed deletion. Consider an affected-row check and an explicit failure response.

#### M2 — Token push reports success even when project token writes fail
**Status:** Confirmed defect · **Impact:** Moderate (data loss/consistency)

**Evidence:** `services/organizationService.ts:1295-1314` (`saveProjectBranches`) and `1398-1421` (`saveProjectTokens`) await Supabase updates but neither inspects the resolved `{ error }`; both suppress thrown errors. `app/api/v1/tokens/route.ts:358-368` calls these helpers inside a catch that only logs, then returns `success: true` at line 395.

**Why it matters:** A rejected or failed database write can be acknowledged as a successful token publish, leaving the client and stored project state out of sync.

**Recommendation:** Check and propagate Supabase errors from both helpers, and make the route return a failure when persistence fails. Where practical, verify that the update affected the expected project row.

#### M3 — Concurrent asset changes can overwrite the R2 metadata index
**Status:** Confirmed defect · **Impact:** Moderate (asset metadata loss; increasing latency with scale)

**Evidence:** Upload (`app/api/assets/upload/route.ts:185-198`), delete (`app/api/assets/delete/route.ts:58-77`), and list metadata actions all load the complete index, modify it in memory, then replace it. `lib/r2.ts:229-250` writes the complete JSON document with an unconditional `PutObjectCommand`.

**Why it matters:** Two overlapping operations can read the same old index and each write a different replacement; the later write discards the earlier operation’s metadata changes. Every mutation also reads, serializes, and writes the full index, so request cost and memory use grow with asset count.

**Recommendation:** Store metadata in rows or another updateable index, or implement serialized/conditional updates with retry. Add concurrency tests for overlapping upload, delete, and metadata-update operations.

### Improvement opportunities

#### P1 — Figma asset sync has unbounded outbound fan-out and no request deadlines
**Status:** Improvement opportunity · **Impact:** Moderate (latency, rate limits, resource use)

**Evidence:** `app/api/figma/fetch-assets/route.ts:261-274` launches all image-rendering chunks with one `Promise.all`; lines 293-310 create groups of 15 but launch every group and each group’s SVG downloads concurrently. The Figma fetches at lines 212, 232, 272, and 306 have no abort timeout. `app/api/figma/fetch-variables/route.ts:42-45` likewise has no timeout.

**Why it matters:** For a large component tree, the apparent 15-item grouping does not cap total concurrency because all groups are started together. Slow or throttled provider calls can hold requests open and consume substantial memory and connection capacity.

**Recommendation:** Use a shared bounded worker pool across all chunks, apply per-request and overall deadlines, and return explicit partial/timeout results.

#### P2 — Every bearer-authenticated request reads and scans the complete API-key table
**Status:** Improvement opportunity · **Impact:** Moderate at higher key counts or traffic

**Evidence:** `utils/auth.ts:20-23` calls `getStoredApiKeys()` for each bearer request. `utils/cloudStorage.ts:15-55` executes `select("*")`, maps all rows, and then the caller validates by scanning the returned array. The schema already has an index on `key_hash` (`supabase/migrations/20260928_pairing_credentials.sql:35`).

**Why it matters:** Authentication work and database transfer scale with the total number of credentials rather than the presented token; this adds avoidable database and application work to every request.

**Recommendation:** Hash the presented token and query by the indexed `key_hash`, selecting only the fields needed for validation. Preserve a short, revocation-aware cache only if measurement justifies it.

#### P3 — Pairing-session storage has no general expiry cleanup or bounded in-memory cache
**Status:** Improvement opportunity · **Impact:** Low to moderate (long-lived process/database growth)

**Evidence:** `app/api/v1/auth/pair/route.ts:26,49-74` stores every generated session in a module-level map and, when configured, in Supabase. Expired entries are removed only when that same code is polled (`:140-145`); there is no scheduled/table-wide cleanup or map-size bound.

**Why it matters:** Abandoned pairing attempts are not reclaimed by this code path, so database rows and long-lived process memory can accumulate. The endpoint is intentionally available to the companion plugin, making retention controls useful even without assuming hostile traffic.

**Recommendation:** Expire/delete old rows with a scheduled cleanup or database TTL process and prune expired map entries on insertion. Add a reasonable creation rate limit if appropriate for the deployment.

## Validation and caveats

- `npm test -- app/api/v1/auth/pair/generatePairingCode.test.ts` — passed (1 file, 3 tests).
- `npx tsc --noEmit` — passed.
- `npm run build` — passed with Next.js 14.2.35; the build emitted an existing Edge-runtime/static-generation warning.
- Git status was clean before the report was created; `BACKEND_AUDIT.md` did not previously exist.
- The invitation finding is confirmed from repository migrations and route logic, but live migration state and Supabase grants were not inspected. No production service, load, or integration tests were run. No dependency advisory scan was performed.
