-- Migration: Enforce uniqueness on api_keys.key_hash and replace non-unique index.
-- Note: In high-volume production environments, CREATE UNIQUE INDEX CONCURRENTLY
-- can be run outside a transaction block.

-- 1. De-duplicate any rows sharing a key_hash, keeping the newest row.
DELETE FROM public.api_keys a
USING public.api_keys b
WHERE a.key_hash = b.key_hash
  AND (
    a.created_at < b.created_at
    OR (a.created_at = b.created_at AND a.id < b.id)
  );

-- 2. Create unique index on key_hash for O(1) bearer token lookup.
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_uidx ON public.api_keys(key_hash);

-- 3. Drop redundant non-unique index if present.
DROP INDEX IF EXISTS public.idx_api_keys_key_hash;

