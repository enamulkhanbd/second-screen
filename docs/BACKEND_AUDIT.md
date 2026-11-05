# Backend Audit — 2026-11-02

## Scope and method

Read-only review of the 28 Next.js API route handlers under `app/api/**`, the OAuth callback and shared authentication utilities, Supabase/R2/invitation services, database migrations, and backend-related package/configuration. Compared related implementations across the repository (including R2 metadata writes, token persistence, API-key lookup, and outbound-provider request handling). No `middleware` file was present. `.env.local` values were not inspected.

Findings below are based on checked-in code. No live Supabase, R2, Figma, or Git provider was accessed, so deployed migration state and external-service behavior were not verified.

## Executive summary

One high-impact authorization defect is confirmed in the invitation RLS policies: the later migration permits any organization member to create invitations, while the acceptance route applies the stored role. Additional confirmed reliability defects can falsely report success when API-key revocation or token persistence fails. R2 asset metadata is maintained as a whole-object read/modify/write document, which creates lost-update races and increasing per-operation cost. Several concrete scaling opportunities concern unbounded Figma request fan-out, full-table API-key reads, and stale pairing-session cleanup.

> A step-by-step **Resolution Plan** (designs, migrations, tests, acceptance criteria, rollback and a status tracker) is at the end of this document; it also lists seven additional issues (A1–A7) found while planning.

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

---

# Resolution Plan

**Status:** Planned (no code changes made yet) · **Plan date:** 2026-11-04 · **Companion document:** [`PERFORMANCE_SYSTEM_ANALYSIS.md`](./PERFORMANCE_SYSTEM_ANALYSIS.md) (items B1–B9, WS5–WS7 overlap with P1–P3/M3 below; implement them together to avoid reworking the same files).

This plan turns every finding above into an ordered set of changes with concrete designs, tests, acceptance criteria and rollback. While re-reading the code to write it, seven **additional issues** (A1–A7) were found (§R1); they are folded into the relevant fixes.

## R0. Summary & Order of Work

| Order | ID | Finding | Severity | Fix summary | Effort | Ship as |
|---|---|---|---|---|---|---|
| 1 | **H1 (+A2, A3, A4)** | Any member can create/alter/read invitations; role trusted at acceptance | 🔴 High | New migration drops the four broad policies, adds an insert-guard trigger, accept route re-validates inviter authority, audit existing data | S–M | Hot-fix PR + staged migration |
| 2 | **M1 (+A5) / P2** | Revocation reports success on DB failure; revoked keys can survive on other instances; full-table key scan | 🟠 Moderate | Check/propagate delete result, validate by indexed `key_hash`, drop in-memory merge | S | PR |
| 3 | **M2 (+A1)** | Token push reports success when persistence fails; a failed project read becomes an "initial import" overwrite | 🟠 Moderate | Propagate errors, one atomic UPDATE, fail closed on read errors, optional version check | S–M | PR |
| 4 | **P1 (+A7)** | Unbounded Figma/R2 fan-out, no deadlines | 🟡 Improvement | Shared bounded pool, per-request + global deadlines, partial results | S–M | PR |
| 5 | **M3** | R2 metadata index lost-update race | 🟠 Moderate | Interim: ETag-conditional write + retry; target: Postgres `project_assets` table | M → L | PR, then project |
| 6 | **P3 (+A6)** | Pairing sessions never cleaned; unauthenticated create with no limit | 🟡 Improvement | Scheduled cleanup, prune map, rate limit, narrow selects | S | PR |
| 7 | — | Regression safety net | — | Policy tests, route tests, concurrency tests, CI migration check | M | Continuous |

> Rationale for order: H1 is a privilege-escalation path and is fixed first. M1/P2 and M2 are small, high-confidence correctness fixes. P1/M3/P3 are reliability and scale work that benefits from the tests added earlier.

## R1. Additional Issues Found While Planning

| ID | Issue | Evidence | Impact | Handled in |
|---|---|---|---|---|
| **A1** | A failed or empty `getProject()` in `POST /api/v1/tokens` is swallowed (`catch {}`), leaving `currentDoc = {}`; the request is then treated as an *initial import* and `saveProjectTokens(mergedDoc)` overwrites stored tokens with only the incoming document | `app/api/v1/tokens/route.ts` ~L240–262 and ~L363 | Data loss on a transient read failure or wrong project id | M2 |
| **A2** | `20260930_invitations_activities_policies.sql` broadens **all four** invitation operations, not only INSERT: `SELECT` (any member sees every invitation **including its secret `token`**), `UPDATE` (any member can change a pending invitation, e.g. its `role`; the update-guard trigger only restricts editors and invitees), `DELETE`. Policies are OR-combined with the hardened ones from `20260927` because the names differ | migration L5–L48 vs `20260927` ≈L308–358 | Same escalation as H1 plus token disclosure | H1 |
| **A3** | Invitations are created by a **client-side insert** (`createOrganizationInvitation`) — RLS is the only enforcement; `POST /api/invitations/send` allows owner/admin/editor to email any invitation id without comparing the invitation's role to the caller's authority | `services/organizationService.ts` ~L559–620; `app/api/invitations/send/route.ts` | A bad policy (A2) is directly exploitable from the browser | H1 |
| **A4** | `accept` ignores the result of the final `status = 'accepted'` update and downloads every member of the org (`select user_id,email`) just to check duplicates | `app/api/invitations/[token]/accept/route.ts` | Invitation may stay re-usable after a failed update; unnecessary read growth | H1 |
| **A5** | `getStoredApiKeys()` seeds results from the process-local `inMemoryApiKeys` map and only *adds* DB rows; `deleteApiKey` removes the key from the *calling* instance only. On any other warm instance a revoked key remains valid until restart | `utils/cloudStorage.ts` L6, L15–55, L90–98 | Revocation is not effective across instances (credential lifecycle) | M1/P2 |
| **A6** | `POST /api/v1/auth/pair` is unauthenticated, unthrottled, and its `connectUrl` is hardcoded to `https://tokensplatform.enamulkhan.com` instead of the request origin; `pairing_sessions.pat` holds a plaintext PAT until the plugin acknowledges | `app/api/v1/auth/pair/route.ts` L40–86, PATCH handler | Table growth/abuse; staging/preview environments hand out production links; PAT lifetime in DB | P3 |
| **A7** | `/api/assets/upload` uploads every asset with an unbounded `Promise.all(...)`; `GET /api/assets/list` may *write* the reconstructed index (auto-recovery) concurrently with other requests | `app/api/assets/upload/route.ts`; `app/api/assets/list/route.ts` `fetchAssetMetadata` | Memory/connection spikes; extra index races | P1, M3 |

---

## R2. H1 — Invitation authorisation (privilege escalation)  🔴

**Goal:** only the roles the hardened policies intended can create/read/update/delete invitations, and acceptance never grants a role the inviter could not have granted.

### R2.1 Migration `supabase/migrations/20261104_invitation_policy_cleanup.sql` (new file — do **not** edit applied migrations)

```sql
BEGIN;

-- 1. Remove the broad policies introduced by 20260930 (they OR-combine with the hardened ones).
DROP POLICY IF EXISTS "Members and invitees can view invitations"        ON public.invitations;
DROP POLICY IF EXISTS "Org members can create invitations"               ON public.invitations;
DROP POLICY IF EXISTS "Org members and invitees can update invitations"  ON public.invitations;
DROP POLICY IF EXISTS "Org members can delete invitations"               ON public.invitations;

-- 2. Re-assert the hardened set verbatim from 20260927 (≈L308–358) so every environment converges:
--    "Invitees and admins can view invitations", "Admins can create invitations",
--    "Admins can update invitations", "Admins can delete invitations",
--    "Editors can revoke pending invitations", "Invitees can accept their invitation".
--    (DROP POLICY IF EXISTS … ; CREATE POLICY … for each, copied unchanged.)

-- 3. Defence in depth: even if a permissive policy is added again, inserts must obey role rules.
CREATE OR REPLACE FUNCTION public.enforce_invitation_insert_rules()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.inviter_uid IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'inviter_uid must match the signed-in user';
  END IF;
  IF NOT public.is_org_editor(NEW.org_id) THEN
    RAISE EXCEPTION 'Viewers cannot create invitations';
  END IF;
  IF NEW.role = 'owner' AND NOT public.is_org_owner(NEW.org_id) THEN
    RAISE EXCEPTION 'Only the owner can invite an owner';
  END IF;
  IF NEW.role = 'admin' AND NOT public.is_org_admin(NEW.org_id) THEN
    RAISE EXCEPTION 'Only admins can invite an admin';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS invitations_insert_guard ON public.invitations;
CREATE TRIGGER invitations_insert_guard
BEFORE INSERT ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.enforce_invitation_insert_rules();

COMMIT;
```

### R2.2 Server-side hardening in `app/api/invitations/[token]/accept/route.ts`
1. After `findInvitationByToken` + state check, **re-validate the inviter's current authority**:

   ```ts
   async function inviterMayGrant(admin, orgId: string, inviterUid: string, role: string) {
     const { data: org } = await admin.from("organizations").select("owner_uid").eq("id", orgId).maybeSingle();
     if (org?.owner_uid === inviterUid) return true;                         // owner may grant anything
     const { data: m } = await admin.from("organization_members").select("role")
       .eq("org_id", orgId).eq("user_id", inviterUid).maybeSingle();
     if (m?.role === "admin") return role !== "owner";
     if (m?.role === "editor") return role === "editor" || role === "viewer";
     return false;                                                           // inviter left or was demoted
   }
   // if (!(await inviterMayGrant(...))) → mark invitation 'revoked' and return 403 { code: "inviter_not_authorized" }
   ```
2. Replace the "select every member" duplicate check with two targeted queries (`.eq("user_id", user.id)` and `.ilike("email", normalizedEmail)` with `.limit(1)`).
3. Check the result of the final `update({ status: "accepted" }).eq("status","pending")`; if it affected 0 rows, return 409 (already used) and do not create the membership.
4. *(Phase 2, recommended)* Move membership insert + invitation update into one SQL function `accept_invitation(p_token text, p_uid text, p_email text)` using `SELECT … FOR UPDATE` on the invitation row, so acceptance is atomic and race-free.
5. *(Phase 2)* Create invitations through a server route (`POST /api/invitations`) that authorises the caller with the service role and the same rule as `inviterMayGrant`; remove the client-side insert and `INSERT` privilege for `authenticated`. Make `POST /api/invitations/send` verify the caller may manage **that** invitation (admin/owner, or the original inviter).

### R2.3 Data remediation (run once per environment, review before acting)

```sql
-- Which migrations are applied?
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;

-- Policies currently in force (expect only the hardened six after the fix)
SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='invitations' ORDER BY policyname;

-- Suspicious privileged invitations since 20260930 was applied (indicative; roles may have changed since)
SELECT i.id, i.org_id, i.email, i.role, i.status, i.inviter_uid, i.created_at
FROM public.invitations i
JOIN public.organizations o ON o.id = i.org_id
LEFT JOIN public.organization_members m ON m.org_id = i.org_id AND m.user_id = i.inviter_uid
WHERE i.role IN ('admin','owner')
  AND i.created_at >= :'applied_at_of_20260930'
  AND COALESCE(CASE WHEN o.owner_uid = i.inviter_uid THEN 'owner' END, m.role::text, '') NOT IN ('owner','admin');
```
Then: revoke any still-`pending` hits (`UPDATE … SET status='revoked'`), review `organization_members` rows created from `accepted` hits, and **re-issue all pending invitations** (their secret tokens were readable by every org member under A2). Record the outcome in the incident/security log.

### R2.4 Tests
* SQL/RLS tests (Supabase local + `pgTAP`, or a Vitest integration suite using the service role to seed and `set local role authenticated` + JWT claims to act): viewer → insert/select/update/delete invitation **denied**; editor → insert `admin`/`owner` **denied**, insert `editor`/`viewer` **allowed**, revoke pending **allowed**, update role **denied**; admin → insert `admin` **allowed**, `owner` **denied**; owner → all allowed; invitee (verified email) → accept own pending only.
* Route tests for `accept`: inviter demoted/removed → 403 and invitation revoked; role `admin` invited by editor row (seeded via service role) → 403; wrong/unverified email → 403; reuse after accept → 410/409; success path creates exactly one membership.

### R2.5 Acceptance & rollback
* ✅ `pg_policies` for `invitations` lists only the hardened six; all RLS tests green; a viewer cannot read any `token`.
* Rollback: policies are dropped/recreated inside one transaction; the guard trigger can be dropped independently. Route change is behind a small env flag (`INVITE_REVALIDATE_INVITER=on`) for one release if desired.
* **Effort:** migration + route ≈ 1–2 days; atomic RPC and server-side create ≈ +2–3 days.

---

## R3. M1 (+A5) and P2 — API-key lifecycle and lookup  🟠

**Goal:** revocation is reported accurately and is effective on every instance; bearer auth reads one indexed row, never the whole table.

**Changes**
1. `utils/cloudStorage.ts` — make deletion authoritative and owner-scoped:

   ```ts
   export async function deleteApiKey(id: string, ownerUid: string): Promise<boolean> {
     if (isSupabaseConfigured) {
       const { data, error } = await getClient()
         .from("api_keys").delete().eq("id", id).eq("user_id", ownerUid).select("id");
       if (error) throw new Error("Could not revoke the API key. Please try again.");
       inMemoryApiKeys.delete(id);
       return (data?.length ?? 0) > 0;
     }
     return inMemoryApiKeys.delete(id);
   }
   ```
2. `app/api/v1/auth/pat/route.ts` `DELETE` — call `deleteApiKey(id, user.id)` directly (drop the pre-read of **all** keys), return `404` when `false`, `500` with a generic message when it throws, `200` only after confirmed deletion.
3. Add `findApiKeyByHash(hash)` selecting only `id,name,key_prefix,key_hash,scopes,created_at,expires_at,user_id,user_email,org_id,project_id,org_name,project_name` with `.eq("key_hash", hash).maybeSingle()`.
4. `utils/auth.ts` — hash the presented token (`sha256`, same as `validateApiKey`), call `findApiKeyByHash`, and pass `[record]` to the existing `validateApiKey(token, [record], scope)` (no signature change needed). Remove the `inMemoryApiKeys` merge from the validation path. Optional: ≤ 15 s TTL positive cache; document that revocation is effective within that TTL.
5. Migration `20261104_api_keys_unique_hash.sql`: de-duplicate (`DELETE … USING` keeping newest), then `CREATE UNIQUE INDEX CONCURRENTLY api_keys_key_hash_uidx ON public.api_keys(key_hash);` (run outside a transaction block). Keep or drop `idx_api_keys_key_hash` afterwards.
6. Optionally update `last_used_at` at most once per N minutes (fire-and-forget) — the column exists but is never written.

**Tests:** delete failure (mock `{ error }`) → 500, key still validates; delete by non-owner → 404; validate-by-hash for valid/expired/wrong-scope/unknown; two simulated instances — key revoked via instance A is rejected by instance B on the next request.
**Acceptance:** `getStoredApiKeys()` no longer used on the request path (`select("*")` on `api_keys` absent from query logs); revoked key rejected immediately (or ≤ TTL).
**Rollback:** the helper keeps the old function as `getStoredApiKeysLegacy` for one release behind `API_KEY_LOOKUP=legacy`. **Effort:** ≈ 1 day.

---

## R4. M2 (+A1) — Token push must fail loudly and fail closed  🟠

**Goal:** `success: true` is returned only after the project row was actually updated; a read failure never turns into an overwrite.

**Changes**
1. `services/organizationService.ts` — `saveProjectBranches`, `saveProjectTokens` (and `saveProjectFigmaVariables`) must inspect the response and throw:

   ```ts
   const { data, error } = await client.from("projects").update(updates)
     .eq("id", projectId).eq("org_id", orgId).select("id");
   if (error) throw error;
   if (!data?.length) throw new Error("Project not found or not updated");
   ```
   Keep `invalidateMetadataCache()` and the existing `saveProjectTokensAndBranches` (already checks `error`; add the row-count check).
2. `app/api/v1/tokens/route.ts` (POST):
   * **A1:** if `getProject` throws → respond `503 { success:false, code:"project_unavailable" }`; if it returns `null` → `404`. Never continue with `currentDoc = {}` unless the project exists *and* genuinely has no tokens.
   * Replace the two sequential writes (`saveProjectBranches` then `saveProjectTokens`) with **one** `saveProjectTokensAndBranches(...)` call so the update is atomic; when the target branch is `main` also set `raw_tokens` in the same statement.
   * Remove the swallowing `try/catch`; map errors to `500 { success:false, code:"persist_failed" }` and do **not** compute the success message afterwards.
   * Persist Figma variables in the same request path but report their failure separately (`figmaVariablesSaved: false`) instead of silently ignoring it.
3. *(Recommended, shared with the performance plan WS2.4/WS6)* add `projects.version integer not null default 1` and make saves compare-and-swap (`.eq("version", seen)` → `409 { code:"conflict" }`); the Figma plugin retries after re-pulling. This also fixes concurrent-writer overwrites between the web app and the plugin.
4. Plugin/UI: surface `persist_failed`/`conflict` responses (plugin `App.tsx` push handler) instead of showing "Published".

**Tests:** mock Supabase update `{ error }` → 500 and no success body; update returning `[]` → 500; `getProject` rejecting → 503 and **no** write call; unchanged diff → no write; happy path calls exactly one update.
**Acceptance:** no code path returns `success: true` after a failed/empty update; no write occurs when the project was not read.
**Rollback:** pure server change; revert the commit. **Effort:** ≈ 1–2 days (+1 for version CAS).

---

## R5. P1 (+A7) — Bounded outbound fan-out and deadlines  🟡

**Goal:** predictable memory, connections and latency regardless of file size; provider throttling handled explicitly.

**Changes**
1. Add `utils/pool.ts`:

   ```ts
   export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
     const out: PromiseSettledResult<R>[] = new Array(items.length);
     let next = 0;
     await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
       while (true) {
         const i = next++; if (i >= items.length) return;
         try { out[i] = { status: "fulfilled", value: await fn(items[i], i) }; }
         catch (reason) { out[i] = { status: "rejected", reason }; }
       }
     }));
     return out;
   }
   ```
2. `app/api/figma/fetch-assets/route.ts`: replace the two `Promise.all` blocks (image-URL chunks, SVG downloads) with `mapLimit(chunks, 3, …)` and `mapLimit(componentNodes, 8, …)`; wrap **every** Figma/CDN `fetch` with `AbortSignal.timeout(15_000)`; add an overall deadline (e.g. 50 s via an `AbortController` shared by all calls); handle `429` by honouring `Retry-After` once, then returning a partial result; cap component count (e.g. > 2,000 → return `{ truncated: true, totalFound }` with guidance to narrow the node).
3. Return a structured partial result: `{ assets, failed: [{id, reason}], truncated, timedOut }` and have the client store show "Synced N of M" instead of failing silently.
4. `app/api/figma/fetch-variables/route.ts`: add `AbortSignal.timeout(20_000)` and map abort to `504`.
5. `app/api/assets/upload/route.ts`: replace the unbounded `Promise.all(assets.map(...))` with `mapLimit(assets, 6, …)`; reject requests above a payload cap (count and total bytes) with `413`; prefer the existing presigned-URL path (`/api/assets/presigned-url`) for large binaries so bytes do not transit the server.
6. Apply the same timeout rule to `app/api/git/fetch` blob and `/user` requests (see performance plan B7).

**Tests:** unit-test `mapLimit` (never exceeds limit, preserves order, collects rejections); route test with mocked `fetch` that hangs → returns 504/partial within the deadline; 429 path.
**Acceptance:** at most 3 + 8 concurrent Figma calls (observable via logging); every outbound request has a timeout; large file sync returns within the deadline with a partial/truncated flag rather than hanging.
**Rollback:** revert; limits are named constants (`FIGMA_IMAGE_CONCURRENCY`, `FIGMA_SVG_CONCURRENCY`) for quick tuning. **Effort:** ≈ 2 days.

---

## R6. M3 — R2 metadata index lost updates  🟠

**Goal:** concurrent upload/delete/move/update operations can never discard each other's changes.

**Option A — Target (recommended): move metadata to Postgres**
1. Migration: `project_assets(id text, project_id text references projects(id) on delete cascade, org_id text, name, title, type, tag, category, folder_id, asset_type, url, content_type, size, description, dimensions jsonb, color_space, format, custom_metadata jsonb, version int, history jsonb, uploaded_by jsonb, source, figma_* …, created_at, updated_at, primary key (project_id, id))` with RLS mirroring `projects` and indexes `(project_id, folder_id, updated_at desc)` and `(project_id, asset_type)`.
2. Backfill script reading each `metadata.json` from R2 → upsert rows (idempotent, resumable per project).
3. Change `upload`/`delete`/`list` routes to `INSERT … ON CONFLICT DO UPDATE`, `DELETE … WHERE id = ANY($1)`, and cursor-paginated `SELECT` — per-row operations, so no read-modify-write of a shared document.
4. Dual-write for one release (keep writing `metadata.json`), shadow-compare counts, then switch reads and stop writing the file. Keep R2 for binaries only.

**Option B — Interim (smaller): optimistic concurrency on the existing file**
1. `lib/r2.ts`: `loadMetadataIndex` returns `{ items, etag }`; `uploadMetadataIndex(orgId, projectId, items, { ifMatch })` sends `IfMatch` (or `IfNoneMatch: "*"` for first write). **Confirm the deployed R2 API/SDK version supports conditional `PutObject`** before choosing this option.
2. Add `updateMetadataIndex(orgId, projectId, mutate)`:

   ```ts
   for (let attempt = 0; attempt < 5; attempt++) {
     const { items, etag } = await loadMetadataIndex(orgId, projectId);
     try { await uploadMetadataIndex(orgId, projectId, mutate(items), { ifMatch: etag }); return; }
     catch (e: any) { if (e?.$metadata?.httpStatusCode !== 412) throw e; await sleep(50 * 2 ** attempt + Math.random() * 50); }
   }
   throw new Error("Asset index is busy, please retry");   // → 409 to the client
   ```
3. Use it in `upload` (merge), `delete` (filter), `list` POST actions (`move-folder`, `update-metadata`) and in the auto-recovery write (`IfNoneMatch: "*"`).
4. Write compact JSON (`JSON.stringify(items)`, no indentation).

**Tests:** an in-memory fake R2 with ETag semantics; run `Promise.all([upload(A), upload(B), delete(C), move(D)])` and assert all four effects are present; 412 exhaustion → 409; first-write race (`IfNoneMatch`).
**Acceptance:** concurrency test passes 100× in CI; no `metadata.json` rewrite without an ETag check (Option B) or no `metadata.json` writes at all (Option A).
**Effort:** Option B ≈ 2 days; Option A ≈ 1–2 weeks (schema, backfill, dual-write, cut-over). Recommended path: ship B now, plan A (also unlocks pagination — see performance plan B6).

---

## R7. P3 (+A6) — Pairing session hygiene  🟡

**Changes**
1. **Scheduled cleanup** (Supabase `pg_cron`, `expires_at` is epoch **milliseconds**):

   ```sql
   CREATE INDEX IF NOT EXISTS pairing_sessions_expires_idx ON public.pairing_sessions(expires_at);
   SELECT cron.schedule('pairing-cleanup', '*/15 * * * *',
     $$DELETE FROM public.pairing_sessions WHERE expires_at < (extract(epoch FROM now()) * 1000)::bigint - 3600000$$);
   ```
   If `pg_cron` is unavailable, add a protected cron route (`/api/v1/auth/pair/cleanup`, secret header) invoked by the host's scheduler.
2. **In-process hygiene:** on every `POST`, delete expired entries from `pairingSessions` and cap the map (e.g. 1,000 entries, oldest first).
3. **Rate limiting** `POST /api/v1/auth/pair`: per-IP limit (e.g. 10/min, 60/hour) using a small DB/KV counter (or the host's edge rate limiter); return `429` with `Retry-After`.
4. **Narrow reads:** `GET` selects only `code,status,created_at,expires_at,server_url,pat,org_id,project_id,org_name,project_name`; poll interval guidance for the plugin (2 s → 5 s → 10 s back-off).
5. **Origin & PAT lifetime (A6):** build `connectUrl` from `getRequestOrigin(req)` instead of the hardcoded production host; set `pat = null` immediately on the first successful `GET` that returns it *or* on acknowledgement (already done in `PATCH`), and delete approved sessions older than 5 minutes in the cleanup job.

**Tests:** cleanup SQL on seeded rows; rate-limit unit test; `connectUrl` uses the request origin; map pruning test.
**Acceptance:** `pairing_sessions` row count stays bounded (alert if > N); no row older than 1 h remains; `POST` limited per IP.
**Rollback:** drop the cron job / limiter flag. **Effort:** ≈ 1 day.

---

## R8. Cross-cutting Safety Net

| Item | Action |
|---|---|
| **Test harness** | Add route-handler tests (Vitest) with a mocked Supabase/R2 client; add RLS tests against Supabase local (`supabase start`) for invitations/projects/api_keys. Today only `generatePairingCode.test.ts` covers `app/api`. |
| **CI** | Run `npx tsc --noEmit`, `npm run build`, `npm test`, and a migration check (`supabase db reset` on a clean DB, then policy assertions) on every PR touching `supabase/` or `app/api/`. |
| **Migrations hygiene** | Never edit applied migrations; add a policy-inventory test asserting the exact policy names per table so an overlapping permissive policy (the root cause of H1/A2) fails CI. |
| **Observability** | Structured error logs with a request id for `persist_failed`, `inviter_not_authorized`, `conflict`; counters for 401/403/429/5xx per route; alert on repeated `persist_failed`. |
| **Secrets/data** | Keep `.env.local` out of reviews (not inspected); rotate any key shown in logs during remediation; rotate pairing/PAT secrets if exposure is suspected. |
| **Docs** | Update `docs/ARCHITECTURE.md` (authorisation model, invitation flow, key lifecycle) when the fixes land. |

## R9. Verification Checklist (after each PR / deploy)

1. `npx tsc --noEmit` → exit 0; `npm test` → all green; `npm run build` → success (the existing Edge-runtime warning is expected).
2. **H1:** `pg_policies` inventory shows only hardened invitation policies; viewer/editor negative tests pass in the target Supabase project; remediation queries reviewed and pending invitations re-issued.
3. **M1/P2:** revoke a key → subsequent request with it fails on a *different* instance; query log shows no `select * from api_keys`.
4. **M2/A1:** simulate DB failure (revoke update privilege in staging or mock) → API returns 5xx and the project row is unchanged.
5. **P1:** large Figma file sync stays within the deadline and concurrency limits; partial results are reported.
6. **M3:** concurrency script (two simultaneous uploads + a delete) preserves all changes.
7. **P3:** `select count(*) from pairing_sessions` stable over a day; `POST /api/v1/auth/pair` rate-limited.

## R10. Decisions & Open Questions

| # | Question | Needed for | Default if undecided |
|---|---|---|---|
| 1 | Should **editors** be allowed to invite at all (the `send` route and hardened policy allow editor → editor/viewer)? | H1 | Keep the current hardened behaviour (editor → editor/viewer only) |
| 2 | Does the deployed R2 API/SDK support conditional `PutObject` (`If-Match`/`If-None-Match`)? | M3 Option B | If not, go straight to Option A (Postgres) |
| 3 | Is `pg_cron` enabled in the production Supabase project? | P3 | Use a scheduled protected route instead |
| 4 | Which environments have `20260930` applied (and when)? | H1 data audit | Assume all; run remediation queries everywhere |
| 5 | Acceptable revocation latency for API keys (immediate vs ≤ 15 s cache)? | P2 | Immediate (no cache) until measured |
| 6 | Where is rate limiting best enforced (host edge vs app/DB counter)? | P3 | App-level DB counter |

## R11. Definition of Done

A finding is **Resolved** only when: (1) the fix is merged with tests covering the failure mode; (2) migrations are applied and verified in every environment (staging → production) with the §R9 checks; (3) data remediation (H1) is completed and recorded; (4) this document's status table is updated with the PR link and date; (5) `docs/ARCHITECTURE.md` reflects the new behaviour.

### Resolution Status Tracker

| ID | Status | PR / Migration | Verified in prod | Notes |
|---|---|---|---|---|
| H1 / A2–A4 | ✅ Implemented (2026-11-05) | `20261104_invitation_policy_cleanup.sql` + `accept`/`send` routes + `invitationsAuth.test.ts` | ⬜ Pending prod deploy | Run §R2.3 data audit + re-issue pending invites on deploy |
| M1 / A5 / P2 | ✅ Implemented (2026-11-05) | `20261104_api_keys_unique_hash.sql` + `utils/auth.ts` + `utils/cloudStorage.ts` + `patAndPairing.test.ts` | ⬜ Pending prod deploy | Indexed `key_hash` lookup; owner-scoped verified delete |
| M2 / A1 | ✅ Implemented (2026-11-05) | `services/organizationService.ts` + `app/api/v1/tokens/route.ts` + `tokensRoute.test.ts` | ⬜ Pending prod deploy | Fail-closed project read + single atomic `saveProjectTokensAndBranches` |
| P1 / A7 | ✅ Implemented (2026-11-05) | `utils/pool.ts` + Figma/upload/git routes + `pool.test.ts` + `figmaRoutes.test.ts` | ⬜ Pending prod deploy | Bounded concurrency, deadlines, 429 retry, payload cap |
| M3 | ✅ Implemented (2026-11-05) | `lib/r2.ts` + asset routes + `20261104_project_assets_table.sql` + `r2MetadataConcurrency.test.ts` | ⬜ Pending prod deploy | Option B conditional ETag writes active; Option A table migration added |
| P3 / A6 | ✅ Implemented (2026-11-05) | `app/api/v1/auth/pair/route.ts` + `pair/cleanup/route.ts` + `patAndPairing.test.ts` | ⬜ Pending prod deploy | Dynamic origin, rate limit, map pruning, immediate PAT scrub, cron cleanup |
