-- ==============================================================================
-- SECOND SCREEN / TOKENS PLATFORM - SUPABASE SCHEMA MIGRATION
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Define Custom Types
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    owner_uid TEXT NOT NULL,
    icon TEXT DEFAULT '🪐',
    color TEXT DEFAULT '#2E9401',
    logo_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_uid);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- 4. Organization Members Table (Multi-tenancy & Roles)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    role public.user_role DEFAULT 'viewer' NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON public.organization_members(email);

-- 5. Projects Table (Design Token Store, Branches, Config)
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    logo_url TEXT,
    active_branch TEXT DEFAULT 'main',
    branches JSONB DEFAULT '[]'::jsonb,
    raw_tokens JSONB DEFAULT '{}'::jsonb,
    theme_groups JSONB DEFAULT '[]'::jsonb,
    credentials JSONB DEFAULT '{}'::jsonb,
    compiler_config JSONB DEFAULT '{}'::jsonb,
    enabled_schemas JSONB DEFAULT '[]'::jsonb,
    git_config JSONB DEFAULT '{}'::jsonb,
    asset_git_config JSONB DEFAULT '{}'::jsonb,
    asset_figma_config JSONB DEFAULT '{}'::jsonb,
    figma_variables JSONB DEFAULT '{}'::jsonb,
    documentation JSONB,
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);

-- 6. Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    org_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role public.user_role DEFAULT 'editor' NOT NULL,
    inviter_uid TEXT NOT NULL,
    inviter_email TEXT NOT NULL,
    inviter_name TEXT,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(org_id);

-- 7. Activities Table (Audit Logging)
CREATE TABLE IF NOT EXISTS public.activities (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    user_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activities_org ON public.activities(org_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON public.activities(timestamp DESC);

-- 8. Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Helper security function: Check membership
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = target_org_id
        AND (user_id = auth.uid()::text OR email = auth.jwt() ->> 'email')
    ) OR EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = target_org_id
        AND owner_uid = auth.uid()::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations Policies
CREATE POLICY "Users can view orgs they are members of"
ON public.organizations FOR SELECT
USING (public.is_org_member(id));

CREATE POLICY "Authenticated users can create orgs"
ON public.organizations FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owners and Admins can update orgs"
ON public.organizations FOR UPDATE
USING (
    owner_uid = auth.uid()::text OR
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.org_id = organizations.id
        AND user_id = auth.uid()::text
        AND role IN ('owner', 'admin')
    )
);

CREATE POLICY "Only Owners can delete orgs"
ON public.organizations FOR DELETE
USING (owner_uid = auth.uid()::text);

-- Organization Members Policies
CREATE POLICY "Members can view other members in their org"
ON public.organization_members FOR SELECT
USING (public.is_org_member(org_id));

CREATE POLICY "Owners and Admins can manage members"
ON public.organization_members FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = org_id AND owner_uid = auth.uid()::text
    ) OR
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = organization_members.org_id
        AND user_id = auth.uid()::text
        AND role IN ('owner', 'admin')
    )
);

-- Projects Policies
CREATE POLICY "Members can view projects in their org"
ON public.projects FOR SELECT
USING (public.is_org_member(org_id));

CREATE POLICY "Editors, Admins and Owners can insert/update projects"
ON public.projects FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = org_id AND owner_uid = auth.uid()::text
    ) OR
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = projects.org_id
        AND (user_id = auth.uid()::text OR email = auth.jwt() ->> 'email')
        AND role IN ('owner', 'admin', 'editor')
    )
);

-- Invitations Policies
CREATE POLICY "Users can view their invitations"
ON public.invitations FOR SELECT
USING (email = auth.jwt() ->> 'email' OR public.is_org_member(org_id));

CREATE POLICY "Admins/Owners can create invitations"
ON public.invitations FOR INSERT
WITH CHECK (public.is_org_member(org_id));

-- Activities Policies
CREATE POLICY "Members can view activities"
ON public.activities FOR SELECT
USING (public.is_org_member(org_id));

CREATE POLICY "Members can insert activities"
ON public.activities FOR INSERT
WITH CHECK (public.is_org_member(org_id));
