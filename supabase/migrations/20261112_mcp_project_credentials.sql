-- Add an explicit credential type so MCP project-bound keys cannot be confused
-- with legacy general-purpose Personal Access Tokens.
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS credential_type text NOT NULL DEFAULT 'personal';

ALTER TABLE public.api_keys
  DROP CONSTRAINT IF EXISTS api_keys_credential_type_check;

ALTER TABLE public.api_keys
  ADD CONSTRAINT api_keys_credential_type_check
  CHECK (credential_type IN ('personal', 'mcp_project'));

CREATE INDEX IF NOT EXISTS idx_api_keys_mcp_project_scope
  ON public.api_keys(credential_type, org_id, project_id)
  WHERE credential_type = 'mcp_project';
