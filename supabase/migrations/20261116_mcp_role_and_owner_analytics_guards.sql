-- Enforce owner-only access on MCP usage analytics and actor write-role defense-in-depth
-- on mcp_apply_token_write (viewers and non-members can never mutate project tokens).

-- 0. Ensure current_org_role exists on live databases (including verified-email fallback
--    before legacy non-UUID member rows are backfilled to Supabase auth UUIDs).
CREATE OR REPLACE FUNCTION public.current_org_role(target_org_id TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN ''
    WHEN EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = target_org_id
        AND o.owner_uid = auth.uid()::text
    ) THEN 'owner'
    ELSE COALESCE((
      SELECT m.role::text
      FROM public.organization_members m
      WHERE m.org_id = target_org_id
        AND (
          m.user_id = auth.uid()::text
          OR (
            COALESCE(m.email, '') <> ''
            AND EXISTS (
              SELECT 1
              FROM auth.users u
              WHERE u.id = auth.uid()
                AND u.email_confirmed_at IS NOT NULL
                AND u.email IS NOT NULL
                AND lower(u.email) = lower(m.email)
            )
          )
        )
      ORDER BY
        CASE WHEN m.user_id = auth.uid()::text THEN 0 ELSE 1 END ASC,
        CASE m.role::text
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'editor' THEN 3
          ELSE 4
        END ASC
      LIMIT 1
    ), '')
  END;
$$;

REVOKE ALL ON FUNCTION public.current_org_role(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_org_role(TEXT) TO authenticated, service_role;

-- 1. Restrict MCP usage events RLS SELECT policy strictly to organization owners
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mcp_usage_events'
      AND policyname = 'Org members can view project MCP usage events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'mcp_usage_events'
        AND policyname = 'Only org owners can view project MCP usage events'
    ) THEN
      ALTER POLICY "Org members can view project MCP usage events"
        ON public.mcp_usage_events
        RENAME TO "Only org owners can view project MCP usage events";
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mcp_usage_events'
      AND policyname = 'Only org owners can view project MCP usage events'
  ) THEN
    ALTER POLICY "Only org owners can view project MCP usage events"
      ON public.mcp_usage_events
      USING (public.current_org_role(org_id) = 'owner');
  ELSE
    CREATE POLICY "Only org owners can view project MCP usage events"
      ON public.mcp_usage_events FOR SELECT
      USING (public.current_org_role(org_id) = 'owner');
  END IF;
END;
$$;

-- 2. Restrict get_mcp_project_analytics RPC strictly to service_role or organization owners
CREATE OR REPLACE FUNCTION public.get_mcp_project_analytics(
  p_org_id TEXT,
  p_project_id TEXT,
  p_hours INTEGER DEFAULT 168
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_hours INTEGER := GREATEST(1, LEAST(COALESCE(p_hours, 168), 720));
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_since TIMESTAMPTZ := v_now - make_interval(hours => v_hours);
  v_bucket TEXT := CASE WHEN v_hours <= 48 THEN 'hour' ELSE 'day' END;
  v_step INTERVAL := CASE WHEN v_hours <= 48 THEN interval '1 hour' ELSE interval '1 day' END;
  v_summary JSONB;
  v_timeline JSONB;
  v_by_tool JSONB;
  v_by_key JSONB;
  v_by_method JSONB;
  v_clients JSONB;
  v_recent JSONB;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND public.current_org_role(p_org_id) <> 'owner' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'totalRequests', COUNT(*)::integer,
    'toolCalls', COUNT(*) FILTER (WHERE rpc_method = 'tools/call')::integer,
    'successCount', COUNT(*) FILTER (WHERE outcome = 'success')::integer,
    'toolErrorCount', COUNT(*) FILTER (WHERE outcome = 'tool_error')::integer,
    'rateLimitedCount', COUNT(*) FILTER (WHERE outcome = 'rate_limited')::integer,
    'clientErrorCount', COUNT(*) FILTER (WHERE outcome = 'client_error')::integer,
    'serverErrorCount', COUNT(*) FILTER (WHERE outcome = 'server_error')::integer,
    'avgDurationMs', COALESCE(ROUND(AVG(duration_ms))::integer, 0),
    'p95DurationMs', COALESCE(ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::integer, 0),
    'totalResponseBytes', COALESCE(SUM(response_bytes), 0)::bigint,
    'activeKeysCount', COUNT(DISTINCT COALESCE(credential_id, key_prefix)) FILTER (
      WHERE COALESCE(credential_id, key_prefix) IS NOT NULL
    )::integer
  )
  INTO v_summary
  FROM public.mcp_usage_events
  WHERE org_id = p_org_id
    AND project_id = p_project_id
    AND created_at >= v_since;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'bucketStart', to_char(s.bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'total', COALESCE(b.total, 0),
      'success', COALESCE(b.success, 0),
      'errors', COALESCE(b.errors, 0),
      'rateLimited', COALESCE(b.rate_limited, 0),
      'avgDurationMs', COALESCE(b.avg_duration_ms, 0)
    )
    ORDER BY s.bucket ASC
  ), '[]'::jsonb)
  INTO v_timeline
  FROM generate_series(
    date_trunc(v_bucket, v_since AT TIME ZONE 'UTC'),
    date_trunc(v_bucket, v_now AT TIME ZONE 'UTC'),
    v_step
  ) AS s(bucket)
  LEFT JOIN (
    SELECT
      date_trunc(v_bucket, created_at AT TIME ZONE 'UTC') AS bucket,
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE outcome = 'success')::integer AS success,
      COUNT(*) FILTER (WHERE outcome IN ('tool_error', 'client_error', 'server_error'))::integer AS errors,
      COUNT(*) FILTER (WHERE outcome = 'rate_limited')::integer AS rate_limited,
      COALESCE(ROUND(AVG(duration_ms))::integer, 0) AS avg_duration_ms
    FROM public.mcp_usage_events
    WHERE org_id = p_org_id
      AND project_id = p_project_id
      AND created_at >= v_since
    GROUP BY 1
  ) b ON b.bucket = s.bucket;

  SELECT COALESCE(jsonb_agg(t_row ORDER BY (t_row->>'calls')::integer DESC, t_row->>'toolName' ASC), '[]'::jsonb)
  INTO v_by_tool
  FROM (
    SELECT jsonb_build_object(
      'toolName', tool_name,
      'calls', COUNT(*)::integer,
      'errors', COUNT(*) FILTER (WHERE outcome <> 'success')::integer,
      'avgDurationMs', COALESCE(ROUND(AVG(duration_ms))::integer, 0),
      'p95DurationMs', COALESCE(ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::integer, 0),
      'lastCalledAt', to_char(MAX(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) AS t_row
    FROM public.mcp_usage_events
    WHERE org_id = p_org_id
      AND project_id = p_project_id
      AND created_at >= v_since
      AND tool_name IS NOT NULL
    GROUP BY tool_name
  ) sub;

  SELECT COALESCE(jsonb_agg(k_row ORDER BY (k_row->>'calls')::integer DESC), '[]'::jsonb)
  INTO v_by_key
  FROM (
    SELECT jsonb_build_object(
      'credentialId', COALESCE(credential_id, key_prefix, 'unknown'),
      'keyPrefix', COALESCE(MAX(key_prefix), 'unknown'),
      'keyName', COALESCE(MAX(key_name), 'MCP Key'),
      'calls', COUNT(*)::integer,
      'errors', COUNT(*) FILTER (WHERE outcome <> 'success')::integer,
      'rateLimited', COUNT(*) FILTER (WHERE outcome = 'rate_limited')::integer,
      'lastUsedAt', to_char(MAX(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) AS k_row
    FROM public.mcp_usage_events
    WHERE org_id = p_org_id
      AND project_id = p_project_id
      AND created_at >= v_since
      AND COALESCE(credential_id, key_prefix) IS NOT NULL
    GROUP BY COALESCE(credential_id, key_prefix, 'unknown')
  ) sub;

  SELECT COALESCE(jsonb_agg(m_row ORDER BY (m_row->>'count')::integer DESC), '[]'::jsonb)
  INTO v_by_method
  FROM (
    SELECT jsonb_build_object(
      'method', rpc_method,
      'count', COUNT(*)::integer
    ) AS m_row
    FROM public.mcp_usage_events
    WHERE org_id = p_org_id
      AND project_id = p_project_id
      AND created_at >= v_since
    GROUP BY rpc_method
  ) sub;

  SELECT COALESCE(jsonb_agg(c_row ORDER BY (c_row->>'count')::integer DESC), '[]'::jsonb)
  INTO v_clients
  FROM (
    SELECT jsonb_build_object(
      'name', client_name,
      'count', COUNT(*)::integer
    ) AS c_row
    FROM public.mcp_usage_events
    WHERE org_id = p_org_id
      AND project_id = p_project_id
      AND created_at >= v_since
      AND client_name IS NOT NULL
      AND client_name <> ''
    GROUP BY client_name
    ORDER BY COUNT(*) DESC
    LIMIT 20
  ) sub;

  SELECT COALESCE(jsonb_agg(r_row ORDER BY (r_row->>'createdAt') DESC), '[]'::jsonb)
  INTO v_recent
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'createdAt', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'rpcMethod', rpc_method,
      'toolName', tool_name,
      'clientName', client_name,
      'keyPrefix', key_prefix,
      'keyName', key_name,
      'outcome', outcome,
      'statusCode', status_code,
      'errorClass', error_class,
      'durationMs', duration_ms,
      'responseBytes', response_bytes
    ) AS r_row
    FROM public.mcp_usage_events
    WHERE org_id = p_org_id
      AND project_id = p_project_id
      AND created_at >= v_since
    ORDER BY created_at DESC
    LIMIT 50
  ) sub;

  RETURN jsonb_build_object(
    'summary', COALESCE(v_summary, '{}'::jsonb),
    'timeline', v_timeline,
    'byTool', v_by_tool,
    'byKey', v_by_key,
    'byMethod', v_by_method,
    'clients', v_clients,
    'recentEvents', v_recent
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_mcp_project_analytics(TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mcp_project_analytics(TEXT, TEXT, INTEGER) TO authenticated, service_role;

-- 3. Enforce actor write role inside mcp_apply_token_write (owner/admin/editor only; viewer denied)
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
  v_actor_role TEXT;
  v_project RECORD;
  v_revision BIGINT;
  v_next_revision BIGINT;
  v_confirmation RECORD;
  v_existing JSONB;
  v_result JSONB;
  v_branch_found BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = p_org_id
      AND o.owner_uid = p_actor_uid
  ) THEN
    SELECT m.role::text INTO v_actor_role
    FROM public.organization_members m
    WHERE m.org_id = p_org_id
      AND (
        m.user_id = p_actor_uid
        OR (
          COALESCE(m.email, '') <> ''
          AND EXISTS (
            SELECT 1
            FROM auth.users u
            WHERE u.id::text = p_actor_uid
              AND u.email_confirmed_at IS NOT NULL
              AND u.email IS NOT NULL
              AND lower(u.email) = lower(m.email)
          )
        )
      )
    ORDER BY
      CASE WHEN m.user_id = p_actor_uid THEN 0 ELSE 1 END ASC,
      CASE m.role::text
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'editor' THEN 3
        ELSE 4
      END ASC
    LIMIT 1;

    IF COALESCE(v_actor_role, '') NOT IN ('owner', 'admin', 'editor') THEN
      RAISE EXCEPTION USING MESSAGE = 'FORBIDDEN_ROLE';
    END IF;
  END IF;

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

  IF p_branch_name = 'main'
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements(COALESCE(v_project.branches, '[]'::jsonb)) branch
       WHERE branch->>'name' = p_branch_name
         AND COALESCE((branch->>'isDefault')::boolean, false)
     ) THEN
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
