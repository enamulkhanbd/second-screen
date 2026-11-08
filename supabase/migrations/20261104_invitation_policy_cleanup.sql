-- Migration: Remove overly-permissive invitation policies introduced by 20260930
-- and re-assert the hardened role-aware invitation policies and insert-guard trigger.

BEGIN;

-- 1. Remove the broad policies introduced by 20260930 (they OR-combine with the hardened ones).
DROP POLICY IF EXISTS "Members and invitees can view invitations"        ON public.invitations;
DROP POLICY IF EXISTS "Org members can create invitations"               ON public.invitations;
DROP POLICY IF EXISTS "Org members and invitees can update invitations"  ON public.invitations;
DROP POLICY IF EXISTS "Org members can delete invitations"               ON public.invitations;

-- Also drop any legacy names before re-asserting the hardened six policies.
DROP POLICY IF EXISTS "Users can view their invitations"                 ON public.invitations;
DROP POLICY IF EXISTS "Admins/Owners can create invitations"             ON public.invitations;
DROP POLICY IF EXISTS "Invitees and admins can view invitations"         ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations"                    ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations"                    ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete invitations"                    ON public.invitations;
DROP POLICY IF EXISTS "Editors can revoke pending invitations"           ON public.invitations;
DROP POLICY IF EXISTS "Invitees can accept their invitation"             ON public.invitations;

-- 2. Re-assert the hardened set verbatim from 20260927 so every environment converges.
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

-- 3. Defence in depth: even if a permissive policy is added again, inserts must obey role rules.
CREATE OR REPLACE FUNCTION public.enforce_invitation_insert_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.inviter_uid IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'inviter_uid must match the signed-in user';
  END IF;
  IF NOT public.is_org_editor(NEW.org_id) THEN
    RAISE EXCEPTION 'Viewers cannot create invitations';
  END IF;
  IF NEW.role = 'owner' AND NOT public.is_org_owner(NEW.org_id) THEN
    RAISE EXCEPTION 'Only the owner can invite an owner';
  END IF;
  IF NEW.role = 'admin' AND NOT public.is_org_admin(NEW.org_id) THEN
    RAISE EXCEPTION 'Only admins can invite an admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invitations_insert_guard ON public.invitations;
CREATE TRIGGER invitations_insert_guard
BEFORE INSERT ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.enforce_invitation_insert_rules();

COMMIT;

