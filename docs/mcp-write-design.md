# MCP write-capability design review

**Status:** Design only. No write tool is registered, advertised, or callable.

**Scope:** Future token and branch mutations through MCP. The current read-only MCP surface remains unchanged.

## 1. Non-goals and release boundary

This document does not enable mutation, change the MCP registry, alter the read-only credential scope, or add a write route. A separate security and operations approval is required before implementation. Changing an environment variable alone must never expose a write tool.

The first write release should be limited to token and branch operations. It must not include asset deletion, Git push, release publishing, Figma writes, organization administration, credential management, or arbitrary database operations.

## 2. Proposed write surface

The eventual registry may contain these tools only after the write-release gate passes:

| Tool | Purpose | Default branch allowed | Confirmation |
|---|---|---:|---:|
| `preview_token_changes` | Validate a proposed token patch and return a diff | Yes | No mutation; confirmation not required |
| `apply_token_changes` | Apply a bounded token patch to a non-default branch | No | Required |
| `create_token_branch` | Create an isolated branch from a known revision | N/A | Required |
| `revert_token_changes` | Revert a previously audited MCP mutation | No | Required |

`tools/list` must continue to advertise only the six read-only tools until a separate release artifact, allowlist, and approval record exist. A write-capable credential must be a distinct credential type and must never be inferred from `write:tokens` on an existing personal or read-only MCP credential.

## 3. Authorization model

A future write request must pass all of these checks:

1. The bearer credential is a distinct, explicitly issued write-capable MCP credential.
2. The credential has immutable `orgId` and `projectId` binding.
3. The authenticated user is still an active organization member.
4. The role is `owner`, `admin`, or `editor`; viewers can never write.
5. The requested branch is authorized and is not the protected default branch unless an independent emergency policy explicitly allows it.
6. The deployment-level write feature flag is enabled for the request's canary identity.
7. The request includes a valid confirmation token produced by a prior preview operation.

Project IDs, branch IDs, and revision IDs must be resolved from server-side records. Slugs, display names, client-supplied roles, and “first available project” fallbacks must not participate in authorization.

## 4. Revision and compare-and-swap protocol

Each mutable project branch needs a server-issued monotonic revision. The preferred representation is:

```text
branch_revision = integer sequence or database bigint
branch_etag = HMAC(project_id || branch_id || branch_revision || updated_at)
```

The client must send the exact `baseRevision` or `baseEtag` returned by `preview_token_changes`. The write transaction must update only when the stored revision still equals the supplied base revision:

```sql
UPDATE project_branches
SET raw_tokens = :next_tokens,
    theme_groups = :next_theme_groups,
    revision = revision + 1,
    updated_at = now()
WHERE project_id = :project_id
  AND branch_id = :branch_id
  AND revision = :base_revision;
```

A zero-row update is a stale-revision conflict. It must return a stable conflict error and must not overwrite or merge silently. The response must include the current revision metadata only; it must not include a full token document unless the caller separately requests a bounded read.

If the current repository continues storing branches inside a JSON column on `projects`, the implementation must first add a transactional database function or normalized branch table. Read-modify-write of a JSON blob in application memory is not sufficient for concurrent mutation safety.

## 5. Preview and explicit confirmation

`preview_token_changes` accepts a bounded patch against a branch and returns:

- a canonical normalized patch;
- token-level added, modified, and deleted counts;
- a bounded diff summary;
- the exact base revision and branch identity;
- a short-lived `confirmationToken` bound to the credential, project, branch, patch digest, base revision, and expiry;
- warnings for aliases, deprecated tokens, protected paths, and large changes.

The confirmation token must be opaque, single-use, and stored as a digest. It must not contain the patch or bearer credential. It must expire quickly, for example within 10 minutes, and must be invalidated after use, expiry, credential revocation, or any change to the base revision.

`apply_token_changes` must require:

```json
{
  "projectId": "...",
  "branchId": "...",
  "baseRevision": 42,
  "confirmationToken": "opaque-token",
  "idempotencyKey": "client-generated-unique-key",
  "patch": { "...": { "$value": "..." } }
}
```

The server must recompute the patch digest and compare it with the confirmation record. It must reject a token reused with a different patch, branch, project, credential, or revision.

## 6. Durable idempotency and replay protection

Every mutation requires an idempotency key with a bounded length and strict character set. Store a digest keyed by:

```text
credential_id + project_id + branch_id + idempotency_key
```

The record must contain the request digest, result status, resulting revision, audit-event ID, and expiration time. A repeated request with the same digest returns the original result without applying the mutation again. Reuse with a different digest returns a conflict.

The idempotency insert and project update must be coordinated transactionally. A process-local map is not acceptable. The replay window must be documented and enforced by the database.

## 7. Transaction, audit, and rollback

A successful mutation must atomically create:

1. the new branch/project revision;
2. the durable idempotency result;
3. the audit event.

The audit event must include only redacted metadata:

```text
id, event_type, actor_uid, credential_id, org_id, project_id,
branch_id, base_revision, next_revision, patch_digest,
changed_count, confirmation_id, idempotency_key_digest,
created_at, result_status
```

Never store bearer tokens, plaintext API keys, full untrusted descriptions, or an unbounded raw patch in logs. A separately protected audit-detail store may retain a bounded normalized diff if security approves it.

Rollback must be implemented as a new audited CAS mutation that restores a prior known revision or applies an inverse patch. It must not mutate history in place. Every rollback must require confirmation and a fresh idempotency key.

## 8. Protected branch policy

The default branch is protected by default. The first write release may allow creation and mutation of non-default branches only. A future default-branch exception requires:

- a separate feature flag;
- a canary allowlist;
- stronger role checks;
- an explicit confirmation phrase or second confirmation step;
- an audit event marking the protected-branch override;
- a tested rollback procedure.

Git publishing remains out of scope for the first write release.

## 9. Limits and kill switch

Write operations require stricter limits than reads:

- maximum patch bytes;
- maximum changed token count;
- maximum affected paths;
- maximum mutation rate per credential and project;
- maximum concurrent mutation count;
- transaction timeout;
- confirmation-token lifetime;
- idempotency retention window.

A deployment-level kill switch must be checked before preview and again immediately before commit. The switch must default to disabled and be independently observable. Disabling writes must not disable read-only MCP tools.

Recommended controls:

```text
MCP_WRITE_ENABLED=false
MCP_WRITE_CANARY_CREDENTIAL_IDS=
MCP_WRITE_MAX_PATCH_BYTES=65536
MCP_WRITE_MAX_CHANGED_TOKENS=500
MCP_WRITE_CONFIRMATION_TTL_SECONDS=600
MCP_WRITE_IDEMPOTENCY_TTL_SECONDS=86400
```

These values must be validated at startup or health-check time without exposing their contents.

## 10. Failure behavior

| Failure | Required behavior |
|---|---|
| Missing write feature flag | Return `NOT_IMPLEMENTED`; advertise no write tool |
| Read-only credential | Return `FORBIDDEN`; do not create preview state |
| Missing confirmation | Return `INVALID_ARGUMENT`; do not mutate |
| Expired/reused confirmation | Return `FORBIDDEN` or conflict; do not mutate |
| Stale base revision | Return `CONFLICT`-class domain error; do not mutate |
| Duplicate same idempotency digest | Return the original durable result |
| Duplicate different digest | Return conflict; do not mutate |
| Invalid patch | Return validation error; do not mutate |
| Protected default branch | Return forbidden; do not mutate |
| Timeout before commit | Return upstream/timeout error; transaction must roll back or be queryable by idempotency key |
| Timeout after commit | Client retries same idempotency key and receives the durable result |
| Audit write failure | Roll back the mutation; never report success without an audit record |
| Partial downstream failure | Keep the database transaction atomic; no Git or external side effect in the first release |
| Database unavailable | Return upstream unavailable; no local fallback |

## 11. Required implementation test matrix

Before any write tool is registered, the implementation must have tests for:

### Authorization and scope

- read-only credential cannot preview or apply;
- write credential cannot cross project or organization boundaries;
- removed membership fails closed;
- viewer role cannot write;
- default branch is protected;
- canary allowlist and kill switch are enforced;
- ambiguous project or branch identifiers are rejected.

### Revision and concurrency

- stale revision produces zero writes;
- two concurrent writes allow only one CAS winner;
- branch revision is monotonic;
- cursor/revision changes invalidate prior previews;
- rollback is a new revision.

### Confirmation and idempotency

- confirmation is required;
- confirmation is bound to patch, project, branch, credential, and revision;
- expired confirmation fails;
- confirmation reuse fails;
- same idempotency digest returns the original result;
- different digest under the same key conflicts;
- timeout after commit can be safely retried.

### Failure injection

- database transaction failure;
- audit insert failure;
- process timeout before and after commit;
- duplicate concurrent requests;
- malformed and oversized patch;
- service outage;
- kill switch changes during request.

### Secret and audit safety

- logs never contain Authorization headers or plaintext PATs;
- audit rows contain digests, not secrets;
- untrusted descriptions are bounded and redacted;
- error responses do not expose SQL, stack traces, or raw token documents.

## 12. Approval gate

Phase 5 design is complete only when security and operations approve this document and the test matrix. Implementation must be a new, separately reviewed phase. Until then:

- `tools/list` must remain read-only;
- `writeEnabled` must remain `false`;
- no write credential type may be issued;
- no mutation route or tool may be added;
- no environment variable may enable writes accidentally.
