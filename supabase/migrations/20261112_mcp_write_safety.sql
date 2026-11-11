-- Phase 6 write infrastructure. No MCP write tool is registered by this migration.
-- All tables are service-role managed; application routes must enforce authorization.

CREATE TABLE IF NOT EXISTS public.mcp_write_branch_revisions (
  org_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (project_id, branch_name)
);

CREATE TABLE IF NOT EXISTS public.mcp_write_confirmations (
  id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  base_revision BIGINT NOT NULL,
  patch_digest TEXT NOT NULL,
  token_digest TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mcp_write_confirmations_scope
  ON public.mcp_write_confirmations(credential_id, project_id, branch_name, expires_at);

CREATE TABLE IF NOT EXISTS public.mcp_write_idempotency (
  credential_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  idempotency_key_digest TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  result JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (credential_id, project_id, branch_name, idempotency_key_digest)
);

CREATE INDEX IF NOT EXISTS idx_mcp_write_idempotency_expiry
  ON public.mcp_write_idempotency(expires_at);

CREATE TABLE IF NOT EXISTS public.mcp_write_audit_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('preview_created', 'write_applied', 'write_replayed', 'write_rejected')),
  credential_id TEXT NOT NULL,
  actor_uid TEXT NOT NULL,
  org_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  base_revision BIGINT,
  next_revision BIGINT,
  patch_digest TEXT NOT NULL,
  idempotency_key_digest TEXT,
  changed_count INTEGER NOT NULL DEFAULT 0,
  result_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mcp_write_audit_project
  ON public.mcp_write_audit_events(project_id, branch_name, created_at DESC);

ALTER TABLE public.mcp_write_branch_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_write_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_write_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_write_audit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.mcp_apply_token_write(
  p_audit_id TEXT,
  p_credential_id TEXT,
  p_actor_uid TEXT,
  p_org_id TEXT,
  p_project_id TEXT,
  p_branch_name TEXT,
  p_base_revision BIGINT,
  p_confirmation_id TEXT,
  p_patch_digest TEXT,
  p_idempotency_key_digest TEXT,
  p_request_digest TEXT,
  p_next_tokens JSONB,
  p_next_theme_groups JSONB,
  p_changed_count INTEGER,
  p_idempotency_expires_at TIMESTAMPTZ,
  p_confirmation_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_revision BIGINT;
  v_next_revision BIGINT;
  v_confirmation RECORD;
  v_existing JSONB;
  v_result JSONB;
  v_branch_found BOOLEAN;
BEGIN
  SELECT result INTO v_existing
  FROM public.mcp_write_idempotency
  WHERE credential_id = p_credential_id
    AND project_id = p_project_id
    AND branch_name = p_branch_name
    AND idempotency_key_digest = p_idempotency_key_digest
    AND expires_at > timezone('utc'::text, now())
  FOR UPDATE;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'replayed', 'result', v_existing);
  END IF;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id AND org_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'PROJECT_NOT_FOUND';
  END IF;

  IF COALESCE(v_project.active_branch, 'main') = p_branch_name THEN
    RAISE EXCEPTION USING MESSAGE = 'PROTECTED_BRANCH';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(v_project.branches, '[]'::jsonb)) branch
    WHERE branch->>'name' = p_branch_name
  ) INTO v_branch_found;

  IF NOT v_branch_found THEN
    RAISE EXCEPTION USING MESSAGE = 'BRANCH_NOT_FOUND';
  END IF;

  INSERT INTO public.mcp_write_branch_revisions(org_id, project_id, branch_name)
  VALUES (p_org_id, p_project_id, p_branch_name)
  ON CONFLICT (project_id, branch_name) DO NOTHING;

  SELECT revision INTO v_revision
  FROM public.mcp_write_branch_revisions
  WHERE project_id = p_project_id AND branch_name = p_branch_name
  FOR UPDATE;

  IF v_revision <> p_base_revision THEN
    RAISE EXCEPTION USING MESSAGE = 'STALE_REVISION';
  END IF;

  SELECT * INTO v_confirmation
  FROM public.mcp_write_confirmations
  WHERE id = p_confirmation_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_confirmation.credential_id <> p_credential_id
     OR v_confirmation.org_id <> p_org_id
     OR v_confirmation.project_id <> p_project_id
     OR v_confirmation.branch_name <> p_branch_name
     OR v_confirmation.base_revision <> p_base_revision
     OR v_confirmation.patch_digest <> p_patch_digest
     OR v_confirmation.used_at IS NOT NULL
     OR v_confirmation.expires_at <= timezone('utc'::text, now()) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_CONFIRMATION';
  END IF;

  v_next_revision := v_revision + 1;

  UPDATE public.projects
  SET branches = (
    SELECT jsonb_agg(
      CASE
        WHEN branch->>'name' = p_branch_name THEN
          jsonb_set(
            jsonb_set(branch, '{rawTokens}', p_next_tokens, true),
            '{themeGroups}', COALESCE(p_next_theme_groups, '[]'::jsonb), true
          )
        ELSE branch
      END
    )
    FROM jsonb_array_elements(COALESCE(branches, '[]'::jsonb)) branch
  ),
  updated_at = timezone('utc'::text, now())
  WHERE id = p_project_id AND org_id = p_org_id;

  UPDATE public.mcp_write_branch_revisions
  SET revision = v_next_revision, updated_at = timezone('utc'::text, now())
  WHERE project_id = p_project_id AND branch_name = p_branch_name;

  UPDATE public.mcp_write_confirmations
  SET used_at = timezone('utc'::text, now())
  WHERE id = p_confirmation_id;

  INSERT INTO public.mcp_write_audit_events(
    id, event_type, credential_id, actor_uid, org_id, project_id, branch_name,
    base_revision, next_revision, patch_digest, idempotency_key_digest,
    changed_count, result_status
  ) VALUES (
    p_audit_id, 'write_applied', p_credential_id, p_actor_uid, p_org_id, p_project_id, p_branch_name,
    p_base_revision, v_next_revision, p_patch_digest, p_idempotency_key_digest,
    p_changed_count, 'applied'
  );

  v_result := jsonb_build_object(
    'status', 'applied',
    'auditEventId', p_audit_id,
    'branchName', p_branch_name,
    'baseRevision', p_base_revision,
    'nextRevision', v_next_revision,
    'changedCount', p_changed_count
  );

  INSERT INTO public.mcp_write_idempotency(
    credential_id, project_id, branch_name, idempotency_key_digest,
    request_digest, result, expires_at
  ) VALUES (
    p_credential_id, p_project_id, p_branch_name, p_idempotency_key_digest,
    p_request_digest, v_result, p_idempotency_expires_at
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_apply_token_write(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT,
  JSONB, JSONB, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_apply_token_write(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT,
  JSONB, JSONB, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ
) TO service_role;
