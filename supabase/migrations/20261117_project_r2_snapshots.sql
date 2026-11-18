-- ==============================================================================
-- SECOND SCREEN / TOKENS PLATFORM - PROJECT R2 SNAPSHOT OFFLOADING
-- ==============================================================================
-- Adds non-breaking pointer columns so large (>100 KB) raw_tokens and branches
-- payloads can be stored gzip-compressed in Cloudflare R2 ($0 egress) instead
-- of bloating Supabase PostgreSQL JSONB rows and free-tier storage quotas.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS storage_mode TEXT NOT NULL DEFAULT 'inline',
  ADD COLUMN IF NOT EXISTS snapshot_r2_key TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_bytes INTEGER;

CREATE INDEX IF NOT EXISTS idx_projects_storage_mode
  ON public.projects(storage_mode)
  WHERE storage_mode = 'r2';
