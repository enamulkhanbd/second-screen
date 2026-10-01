-- Migration: Add missing RLS policies for invitations and activities tables

-- 1. Invitations Policies
DROP POLICY IF EXISTS "Members and invitees can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Org members can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Org members and invitees can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Org members can delete invitations" ON public.invitations;

CREATE POLICY "Members and invitees can view invitations"
ON public.invitations FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = invitations.org_id AND owner_uid = auth.uid()::text
  ))
  OR public.is_org_member(org_id)
  OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

CREATE POLICY "Org members can create invitations"
ON public.invitations FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = invitations.org_id AND owner_uid = auth.uid()::text
  ))
  OR public.is_org_member(org_id)
);

CREATE POLICY "Org members and invitees can update invitations"
ON public.invitations FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = invitations.org_id AND owner_uid = auth.uid()::text
  ))
  OR public.is_org_member(org_id)
  OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

CREATE POLICY "Org members can delete invitations"
ON public.invitations FOR DELETE
USING (
  (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = invitations.org_id AND owner_uid = auth.uid()::text
  ))
  OR public.is_org_member(org_id)
);

-- 2. Activities Policies
DROP POLICY IF EXISTS "Members can view activities" ON public.activities;
DROP POLICY IF EXISTS "Members can insert activities" ON public.activities;

CREATE POLICY "Members can view activities"
ON public.activities FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = activities.org_id AND owner_uid = auth.uid()::text
  ))
  OR public.is_org_member(org_id)
);

CREATE POLICY "Members can insert activities"
ON public.activities FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = activities.org_id AND owner_uid = auth.uid()::text
  ))
  OR public.is_org_member(org_id)
);
