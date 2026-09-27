-- Persist API credentials and pairing sessions across serverless instances.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  user_id TEXT,
  user_email TEXT,
  org_id TEXT,
  project_id TEXT,
  org_name TEXT,
  project_name TEXT
);

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS key_prefix TEXT,
  ADD COLUMN IF NOT EXISTS key_hash TEXT,
  ADD COLUMN IF NOT EXISTS scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS org_id TEXT,
  ADD COLUMN IF NOT EXISTS project_id TEXT,
  ADD COLUMN IF NOT EXISTS org_name TEXT,
  ADD COLUMN IF NOT EXISTS project_name TEXT;

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);

CREATE TABLE IF NOT EXISTS public.pairing_sessions (
  code TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  pat TEXT,
  user_id TEXT,
  user_email TEXT,
  org_id TEXT,
  project_id TEXT,
  org_name TEXT,
  project_name TEXT,
  server_url TEXT,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);

ALTER TABLE public.pairing_sessions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pat TEXT,
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS org_id TEXT,
  ADD COLUMN IF NOT EXISTS project_id TEXT,
  ADD COLUMN IF NOT EXISTS org_name TEXT,
  ADD COLUMN IF NOT EXISTS project_name TEXT,
  ADD COLUMN IF NOT EXISTS server_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at BIGINT,
  ADD COLUMN IF NOT EXISTS expires_at BIGINT;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api_keys TO service_role;

ALTER TABLE public.pairing_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pairing_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pairing_sessions TO service_role;