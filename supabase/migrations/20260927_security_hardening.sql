-- Harden tenant policies and keep credential tables server-only.

ALTER TABLE IF EXISTS public.api_keys
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.pairing_sessions
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT;

DO $$
BEGIN
  IF to_regclass('public.api_keys') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.api_keys FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.api_keys TO service_role';
    EXECUTE 'DELETE FROM public.api_keys WHERE user_id IS NULL';
  END IF;

  IF to_regclass('public.pairing_sessions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.pairing_sessions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.pairing_sessions FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.pairing_sessions TO service_role';
    EXECUTE 'UPDATE public.pairing_sessions SET pat = NULL WHERE pat IS NOT NULL';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_org_role(target_org_id TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
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
        AND m.user_id = auth.uid()::text
      LIMIT 1
    ), '')
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_verified_email_identity()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = lower(auth.jwt() ->> 'email')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_org_role(target_org_id) <> '';
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_org_role(target_org_id) IN ('owner', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_org_editor(target_org_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_org_role(target_org_id) IN ('owner', 'admin', 'editor');
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(target_org_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = target_org_id
      AND o.owner_uid = auth.uid()::text
  );
$$;

REVOKE ALL ON FUNCTION public.current_org_role(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_verified_email_identity() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_admin(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_editor(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_owner(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_org_role(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_verified_email_identity() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_editor(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_owner(TEXT) TO authenticated, service_role;

UPDATE public.organization_members m
SET user_id = u.id::text
FROM auth.users u
WHERE lower(m.email) = lower(u.email)
  AND u.email_confirmed_at IS NOT NULL
  AND m.user_id IS DISTINCT FROM u.id::text
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members existing
    WHERE existing.org_id = m.org_id
      AND existing.user_id = u.id::text
  );

CREATE UNIQUE INDEX IF NOT EXISTS projects_id_org_id_uidx
  ON public.projects (id, org_id);

CREATE TABLE IF NOT EXISTS public.project_integrations (
  project_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  git_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  asset_git_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  asset_figma_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT project_integrations_project_org_fkey
    FOREIGN KEY (project_id, org_id)
    REFERENCES public.projects(id, org_id)
    ON DELETE CASCADE
);

ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.project_integrations FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_integrations TO authenticated, service_role;
CREATE POLICY "Editors can view project integrations"
ON public.project_integrations FOR SELECT
USING (public.is_org_editor(org_id));
CREATE POLICY "Editors can insert project integrations"
ON public.project_integrations FOR INSERT
WITH CHECK (public.is_org_editor(org_id));
CREATE POLICY "Editors can update project integrations"
ON public.project_integrations FOR UPDATE
USING (public.is_org_editor(org_id))
WITH CHECK (public.is_org_editor(org_id));
CREATE POLICY "Editors can delete project integrations"
ON public.project_integrations FOR DELETE
USING (public.is_org_editor(org_id));

INSERT INTO public.project_integrations (
  project_id,
  org_id,
  git_config,
  asset_git_config,
  asset_figma_config,
  updated_at
)
SELECT
  p.id,
  p.org_id,
  COALESCE(NULLIF(p.git_config, '{}'::jsonb), NULLIF(p.credentials, '{}'::jsonb), '{}'::jsonb),
  COALESCE(p.asset_git_config, '{}'::jsonb),
  COALESCE(p.asset_figma_config, '{}'::jsonb),
  p.updated_at
FROM public.projects p
WHERE COALESCE(p.git_config, '{}'::jsonb) <> '{}'::jsonb
   OR COALESCE(p.credentials, '{}'::jsonb) <> '{}'::jsonb
   OR COALESCE(p.asset_git_config, '{}'::jsonb) <> '{}'::jsonb
   OR COALESCE(p.asset_figma_config, '{}'::jsonb) <> '{}'::jsonb
ON CONFLICT (project_id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  git_config = EXCLUDED.git_config,
  asset_git_config = EXCLUDED.asset_git_config,
  asset_figma_config = EXCLUDED.asset_figma_config,
  updated_at = EXCLUDED.updated_at;

UPDATE public.projects
SET git_config = '{}'::jsonb,
    credentials = '{}'::jsonb,
    asset_git_config = '{}'::jsonb,
    asset_figma_config = '{}'::jsonb
WHERE COALESCE(git_config, '{}'::jsonb) <> '{}'::jsonb
   OR COALESCE(credentials, '{}'::jsonb) <> '{}'::jsonb
   OR COALESCE(asset_git_config, '{}'::jsonb) <> '{}'::jsonb
   OR COALESCE(asset_figma_config, '{}'::jsonb) <> '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.prevent_project_integration_storage()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND (
       COALESCE(NEW.git_config, '{}'::jsonb) <> '{}'::jsonb
       OR COALESCE(NEW.credentials, '{}'::jsonb) <> '{}'::jsonb
       OR COALESCE(NEW.asset_git_config, '{}'::jsonb) <> '{}'::jsonb
       OR COALESCE(NEW.asset_figma_config, '{}'::jsonb) <> '{}'::jsonb
     ) THEN
    RAISE EXCEPTION 'Integration credentials must be stored in project_integrations';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_integration_storage_guard ON public.projects;
CREATE TRIGGER projects_integration_storage_guard
BEFORE INSERT OR UPDATE OF git_config, credentials, asset_git_config, asset_figma_config ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.prevent_project_integration_storage();

DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
CREATE POLICY "Users can create orgs as themselves"
ON public.organizations FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND owner_uid = auth.uid()::text);

DROP POLICY IF EXISTS "Owners and Admins can update orgs" ON public.organizations;
CREATE POLICY "Owners and Admins can update orgs"
ON public.organizations FOR UPDATE
USING (public.is_org_admin(id))
WITH CHECK (public.is_org_admin(id));

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_owner_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.role() <> 'service_role'
      AND NEW.owner_uid IS DISTINCT FROM OLD.owner_uid
     AND OLD.owner_uid <> auth.uid()::text THEN
    RAISE EXCEPTION 'Only the current owner may transfer organization ownership';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_owner_transfer_guard ON public.organizations;
CREATE TRIGGER organizations_owner_transfer_guard
BEFORE UPDATE OF owner_uid ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_owner_transfer();

DROP POLICY IF EXISTS "Members can view other members in their org" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and Admins can manage members" ON public.organization_members;
CREATE POLICY "Members can view other members in their org"
ON public.organization_members FOR SELECT
USING (public.is_org_member(org_id));
CREATE POLICY "Admins can add members"
ON public.organization_members FOR INSERT
WITH CHECK (public.is_org_admin(org_id) AND (role <> 'owner' OR public.is_org_owner(org_id)));
CREATE POLICY "Admins can update members"
ON public.organization_members FOR UPDATE
USING (public.is_org_admin(org_id) AND (role <> 'owner' OR public.is_org_owner(org_id)))
WITH CHECK (public.is_org_admin(org_id) AND (role <> 'owner' OR public.is_org_owner(org_id)));
CREATE POLICY "Admins can remove members"
ON public.organization_members FOR DELETE
USING (public.is_org_admin(org_id) AND (role <> 'owner' OR public.is_org_owner(org_id)));
CREATE POLICY "Invitees can join their invited organization"
ON public.organization_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()::text
  AND public.has_verified_email_identity()
  AND lower(email) = lower(auth.jwt() ->> 'email')
  AND EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.org_id = organization_members.org_id
      AND lower(i.email) = lower(auth.jwt() ->> 'email')
      AND public.has_verified_email_identity()
      AND i.status = 'pending'
      AND i.expires_at > now()
      AND i.role = organization_members.role
  )
);

DROP POLICY IF EXISTS "Members can view projects in their org" ON public.projects;
DROP POLICY IF EXISTS "Editors, Admins and Owners can insert/update projects" ON public.projects;
CREATE POLICY "Members can view projects in their org"
ON public.projects FOR SELECT
USING (public.is_org_member(org_id));
CREATE POLICY "Editors, Admins and Owners can modify projects"
ON public.projects FOR ALL
USING (public.is_org_editor(org_id))
WITH CHECK (public.is_org_editor(org_id));

DROP POLICY IF EXISTS "Users can view their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins/Owners can create invitations" ON public.invitations;
CREATE POLICY "Invitees and admins can view invitations"
ON public.invitations FOR SELECT
USING (
  public.is_org_admin(org_id)
  OR (
    lower(email) = lower(auth.jwt() ->> 'email')
    AND public.has_verified_email_identity()
  )
);
CREATE POLICY "Admins can create invitations"
ON public.invitations FOR INSERT
WITH CHECK (
  public.is_org_editor(org_id)
  AND inviter_uid = auth.uid()::text
  AND (role <> 'owner' OR public.is_org_owner(org_id))
  AND (public.is_org_admin(org_id) OR role IN ('editor', 'viewer'))
);
CREATE POLICY "Admins can update invitations"
ON public.invitations FOR UPDATE
USING (public.is_org_admin(org_id))
WITH CHECK (public.is_org_admin(org_id));
CREATE POLICY "Admins can delete invitations"
ON public.invitations FOR DELETE
USING (public.is_org_admin(org_id));
CREATE POLICY "Editors can revoke pending invitations"
ON public.invitations FOR UPDATE
USING (
  public.current_org_role(org_id) = 'editor'
  AND status = 'pending'
  AND role <> 'owner'
)
WITH CHECK (
  public.current_org_role(org_id) = 'editor'
  AND status = 'revoked'
  AND role <> 'owner'
);
CREATE POLICY "Invitees can accept their invitation"
ON public.invitations FOR UPDATE
USING (
  lower(email) = lower(auth.jwt() ->> 'email')
  AND public.has_verified_email_identity()
  AND status = 'pending'
  AND expires_at > now()
)
WITH CHECK (
  lower(email) = lower(auth.jwt() ->> 'email')
  AND public.has_verified_email_identity()
  AND status = 'accepted'
);

CREATE OR REPLACE FUNCTION public.protect_invitee_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND public.current_org_role(OLD.org_id) = 'editor'
     AND NOT public.is_org_admin(OLD.org_id)
     AND (
       NEW.status <> 'revoked'
       OR (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status')
     ) THEN
    RAISE EXCEPTION 'Editors may only revoke pending invitations';
  END IF;

  IF auth.role() <> 'service_role'
     AND NOT public.is_org_admin(OLD.org_id)
     AND lower(OLD.email) = lower(auth.jwt() ->> 'email')
     AND OLD.status = 'pending'
     AND (
       NEW.status <> 'accepted'
       OR (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status')
     ) THEN
    RAISE EXCEPTION 'Invitees may only accept their own pending invitation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invitations_invitee_update_guard ON public.invitations;
CREATE TRIGGER invitations_invitee_update_guard
BEFORE UPDATE ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.protect_invitee_acceptance();