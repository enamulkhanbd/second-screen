-- Migration: 20261108_rls_perf_and_indexes.sql
-- Performance Optimization (B5 / WS6 Stage A): Composite Indexes & RLS InitPlan Optimization

-- 1. High-frequency query composite indexes & schema columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_activities_org_timestamp ON public.activities(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_org_status ON public.invitations(org_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_org_slug ON public.projects(org_id, slug);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user ON public.organization_members(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pairing_sessions_expires ON public.pairing_sessions(expires_at);

-- 2. RLS InitPlan Optimization: Wrap auth.uid() as (SELECT auth.uid()) so Postgres computes it once per statement

-- Hardened Invitations Insert Policy
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
CREATE POLICY "Admins can create invitations"
ON public.invitations FOR INSERT
WITH CHECK (
  public.is_org_editor(org_id)
  AND inviter_uid = (SELECT auth.uid())::text
  AND (role <> 'owner' OR public.is_org_owner(org_id))
  AND (public.is_org_admin(org_id) OR role IN ('editor', 'viewer'))
);

-- Activities Policies
DROP POLICY IF EXISTS "Members can view activities" ON public.activities;
CREATE POLICY "Members can view activities"
ON public.activities FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = activities.org_id AND owner_uid = (SELECT auth.uid())::text
  ))
  OR public.is_org_member(org_id)
);

DROP POLICY IF EXISTS "Members can insert activities" ON public.activities;
CREATE POLICY "Members can insert activities"
ON public.activities FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = activities.org_id AND owner_uid = (SELECT auth.uid())::text
  ))
  OR public.is_org_member(org_id)
);

-- Organization Creation Policy
DROP POLICY IF EXISTS "Users can create orgs as themselves" ON public.organizations;
CREATE POLICY "Users can create orgs as themselves"
ON public.organizations FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND owner_uid = (SELECT auth.uid())::text);
