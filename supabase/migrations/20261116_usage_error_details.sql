-- Add sanitized error_message telemetry on public.mcp_usage_events and return it in get_mcp_project_analytics.

ALTER TABLE public.mcp_usage_events
  ADD COLUMN IF NOT EXISTS error_message TEXT;

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
      'errorMessage', error_message,
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
