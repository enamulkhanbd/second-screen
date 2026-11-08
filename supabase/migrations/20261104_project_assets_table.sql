-- Migration: Create project_assets table for per-row asset metadata indexing (R6 Option A target)
-- and add pairing_sessions cleanup index + optional pg_cron schedule (R7 / P3).

BEGIN;

CREATE TABLE IF NOT EXISTS public.project_assets (
  id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  type TEXT,
  tag TEXT,
  category TEXT,
  folder_id TEXT,
  asset_type TEXT,
  url TEXT,
  content_type TEXT,
  size BIGINT,
  description TEXT,
  dimensions JSONB,
  color_space TEXT,
  format TEXT,
  custom_metadata JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  history JSONB,
  uploaded_by JSONB,
  source TEXT DEFAULT 'upload',
  figma_node_id TEXT,
  figma_url TEXT,
  figma_source_id TEXT,
  figma_source_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (project_id, id)
);

CREATE INDEX IF NOT EXISTS project_assets_folder_updated_idx
  ON public.project_assets(project_id, folder_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS project_assets_type_idx
  ON public.project_assets(project_id, asset_type);

ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view project assets in their org" ON public.project_assets;
CREATE POLICY "Members can view project assets in their org"
ON public.project_assets FOR SELECT
USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Editors, Admins and Owners can modify project assets" ON public.project_assets;
CREATE POLICY "Editors, Admins and Owners can modify project assets"
ON public.project_assets FOR ALL
USING (public.is_org_editor(org_id))
WITH CHECK (public.is_org_editor(org_id));

-- Pairing sessions expiration index for scheduled cleanup (R7 / P3)
CREATE INDEX IF NOT EXISTS pairing_sessions_expires_idx ON public.pairing_sessions(expires_at);

-- Schedule automatic pairing session cleanup every 15 minutes when pg_cron is installed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'pairing-cleanup',
      '*/15 * * * *',
      $cron$DELETE FROM public.pairing_sessions WHERE expires_at < (extract(epoch FROM now()) * 1000)::bigint - 3600000 OR (status = 'approved' AND created_at < (extract(epoch FROM now()) * 1000)::bigint - 300000)$cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore if pg_cron is not available; /api/v1/auth/pair/cleanup handles scheduled cleanup.
    NULL;
END;
$$;

COMMIT;

