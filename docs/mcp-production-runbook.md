# MCP production runbook

This runbook covers the read-only MCP release. Write capabilities are not part of this release.

## Required environment

Configure these values in the deployment environment, never in client configuration or source control:

```text
SECOND_SCREEN_TRUSTED_ORIGINS=https://app.example.com,https://staging.example.com
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
MCP_REQUIRE_SHARED_LIMITER=true
MCP_RATE_LIMIT_PER_MINUTE=120
MCP_OBSERVABILITY=true
```

`MCP_REQUIRE_SHARED_LIMITER=true` makes the route fail closed if the shared Upstash limiter is missing or unavailable. The in-process limiter is for local development only and must not be treated as a production control.

## Database migration

Apply the pending migrations through the project's approved Supabase pipeline. Do not run migrations from an untrusted workstation.

```bash
supabase db push
```

Verify the project-bound API-key migration and the existing API-key hash index are present before issuing MCP credentials. If the migration cannot be applied, stop the release; do not enable MCP traffic.

## Staging conformance

Create a short-lived, read-only project-bound MCP credential in staging and run:

```bash
MCP_BASE_URL=https://staging.example.com \
MCP_TEST_TOKEN='sec_pat_…' \
npm run mcp:conformance
```

The conformance check verifies health, Streamable HTTP initialization, exact read-only tool discovery, and absence of write-like tool names. It must be run after every staging deployment.

## Release gates

Before enabling production traffic, confirm:

- `/api/v1/mcp/health` reports `status: ok`.
- `productionReadiness.sharedRateLimiterConfigured` is `true`.
- `productionReadiness.trustedOriginsConfigured` is `true`.
- The Supabase migration is applied.
- A real staging project can run all six read-only tools.
- Invalid, expired, revoked, cross-project, and removed-membership credentials fail closed.
- Logs contain request IDs and metrics only; never Authorization headers, plaintext PATs, R2 keys, raw token documents, or full untrusted descriptions.
- Rate-limit responses include `Retry-After`.
- The deployment can roll back to the previous application revision.

## Rollback

If conformance, latency, authorization, or error-rate checks fail:

1. Disable MCP traffic at the deployment edge or set the route's deployment flag to off.
2. Roll back the application revision.
3. Revoke test credentials created for the release.
4. Preserve redacted request IDs and metrics for diagnosis.
5. Do not roll back the database migration unless the migration owner confirms that no issued credential depends on it.

## Current limitations

This route is stateless JSON transport. The local test suite validates protocol initialization and the route contract, but staging must still validate real Supabase authorization and real MCP clients. The shared limiter requires Upstash credentials in the deployment environment; without them, production mode intentionally returns `503` rather than silently using a per-instance limiter.
