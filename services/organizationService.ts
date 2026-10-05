import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Organization,
  Project,
  OrganizationMember,
  OrganizationInvitation,
  UserRole,
} from "@/types/tenant";
import { RawTokensDocument, ThemeGroup, GitCredentials, UserActivityItem, ProjectBranch } from "@/types/tokens";
import { extractThemeGroups } from "@/utils/themeHelpers";

/**
 * Returns the appropriate Supabase client depending on the execution environment.
 * On server side (Node.js API routes / Server Components), uses the service-role admin client.
 * In the browser, uses the standard Supabase client with active user session cookies.
 */
function getClient() {
  if (typeof window === "undefined") {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  }
  return supabase;
}

// -------------------------------------------------------------
// DATA MAPPING HELPERS
// -------------------------------------------------------------

function mapDbOrgToOrganization(row: any, membersRows: any[] = []): Organization {
  const members: OrganizationMember[] = membersRows.map((m) => ({
    uid: m.user_id,
    email: m.email,
    displayName: m.display_name || m.email?.split("@")[0] || "Member",
    role: m.role as UserRole,
    joinedAt: m.joined_at,
  }));

  const memberUids = Array.from(new Set(members.map((m) => m.uid).filter(Boolean)));
  const memberEmails = Array.from(new Set(members.map((m) => m.email.toLowerCase()).filter(Boolean)));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon || "🏢",
    color: row.color || "#171717",
    logoUrl: row.logo_url || "",
    avatarUrl: row.logo_url || "",
    ownerUid: row.owner_uid,
    memberUids,
    memberEmails,
    members,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbProjectToProject(row: any, integration?: any): Project {
  const extra = row.extra_data || {};
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    icon: row.icon || "🎯",
    color: row.color || "#171717",
    logoUrl: row.logo_url || "",
    activeBranch: row.active_branch || "main",
    branches: row.branches || [],
    rawTokens: row.raw_tokens || {},
    themeGroups: row.theme_groups || [],
    enabledSchemas: row.enabled_schemas || [],
    gitConfig:
      integration?.git_config && Object.keys(integration.git_config).length > 0
        ? integration.git_config
        : row.git_config && Object.keys(row.git_config).length > 0
        ? row.git_config
        : row.credentials && Object.keys(row.credentials).length > 0
        ? row.credentials
        : null,
    assetGitConfig:
      integration?.asset_git_config && Object.keys(integration.asset_git_config).length > 0
        ? integration.asset_git_config
        : row.asset_git_config && Object.keys(row.asset_git_config).length > 0
        ? row.asset_git_config
        : null,
    assetFigmaConfig:
      integration?.asset_figma_config && Object.keys(integration.asset_figma_config).length > 0
        ? integration.asset_figma_config
        : row.asset_figma_config && Object.keys(row.asset_figma_config).length > 0
        ? row.asset_figma_config
        : null,
    figmaVariables: row.figma_variables || {},
    documentation: row.documentation || null,
    assets: extra.assets || [],
    assetFolders: extra.assetFolders || [],
    assetsCount: extra.assetsCount || (extra.assets?.length || 0),
    figmaMeta: extra.figmaMeta || {},
    figmaUpdatedAt: extra.figmaUpdatedAt || null,
    createdByName: extra.createdByName || "Team Member",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbInvitation(row: any): OrganizationInvitation {
  return {
    id: row.id,
    token: row.token,
    orgId: row.org_id,
    orgName: row.org_name,
    invitedByUid: row.inviter_uid,
    invitedByName: row.inviter_name || row.inviter_email?.split("@")[0] || "User",
    invitedByEmail: row.inviter_email,
    inviteeEmail: row.email,
    role: row.role as UserRole,
    status: row.status as "pending" | "accepted" | "declined" | "revoked",
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

// -------------------------------------------------------------
// ORGANIZATION OPERATIONS (100% Dynamic Supabase)
// -------------------------------------------------------------

const inFlightUserOrgsPromises = new Map<string, Promise<Organization[]>>();

/**
 * Dynamically fetches all organizations where the user is a member or owner from Supabase
 */
export async function getUserOrganizations(uid: string, userEmail?: string): Promise<Organization[]> {
  if (!uid && !userEmail) return [];
  if (!isSupabaseConfigured) return [];

  const cleanEmail = userEmail?.trim().toLowerCase();
  const cacheKey = `${uid || ""}__${cleanEmail || ""}`;
  const inFlight = inFlightUserOrgsPromises.get(cacheKey);
  if (inFlight) return inFlight;

  const fetchPromise = (async () => {
    const client = getClient();
    try {
      // 1. Find all org IDs where user is a direct member or has matching email
      let memberOrgIds: string[] = [];
      let memberFilter = "";
      if (uid && cleanEmail) {
        memberFilter = `user_id.eq.${uid},email.ilike.${cleanEmail}`;
      } else if (uid) {
        memberFilter = `user_id.eq.${uid}`;
      } else if (cleanEmail) {
        memberFilter = `email.ilike.${cleanEmail}`;
      }

      if (memberFilter) {
        const { data: memberRows, error: mErr } = await client
          .from("organization_members")
          .select("org_id")
          .or(memberFilter);
        if (!mErr && memberRows) {
          memberOrgIds = memberRows.map((m: any) => m.org_id);
        }
      }

      // Auto-link user_id in background if matched by email
      if (uid && cleanEmail) {
        client
          .from("organization_members")
          .update({ user_id: uid })
          .eq("email", cleanEmail)
          .neq("user_id", uid)
          .then(() => {})
          .catch(() => {});
      }

      if (!uid && memberOrgIds.length === 0) {
        return [];
      }

      // 2. Fetch all organizations where user is owner OR user is a member
      let orgQuery = client.from("organizations").select(`
        *,
        organization_members (*)
      `);

      if (memberOrgIds.length > 0 && uid) {
        orgQuery = orgQuery.or(`owner_uid.eq.${uid},id.in.(${memberOrgIds.join(",")})`);
      } else if (memberOrgIds.length > 0) {
        orgQuery = orgQuery.in("id", memberOrgIds);
      } else if (uid) {
        orgQuery = orgQuery.eq("owner_uid", uid);
      }

      const { data: orgsData, error: orgsErr } = await orgQuery.order("created_at", { ascending: true });

      if (orgsErr) {
        console.warn("Supabase error fetching user organizations:", orgsErr.message);
        // Fallback query without joins if RLS limits nested select
        let fallbackQuery = client.from("organizations").select("*");
        if (memberOrgIds.length > 0 && uid) {
          fallbackQuery = fallbackQuery.or(`owner_uid.eq.${uid},id.in.(${memberOrgIds.join(",")})`);
        } else if (memberOrgIds.length > 0) {
          fallbackQuery = fallbackQuery.in("id", memberOrgIds);
        } else if (uid) {
          fallbackQuery = fallbackQuery.eq("owner_uid", uid);
        }
        const { data: fallbackOrgs, error: fallbackError } = await fallbackQuery.order("created_at", { ascending: true });
        if (fallbackError) {
          console.warn("Supabase fallback error fetching user organizations:", fallbackError.message);
          return [];
        }
        return (fallbackOrgs || []).map((o: any) => mapDbOrgToOrganization(o, []));
      }

      return (orgsData || []).map((o: any) => mapDbOrgToOrganization(o, o.organization_members || []));
    } catch (e) {
      console.warn("Supabase error fetching user organizations:", e);
      return [];
    }
  })().finally(() => {
    inFlightUserOrgsPromises.delete(cacheKey);
  });

  inFlightUserOrgsPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Dynamically fetches a specific organization by ID from Supabase
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  if (!orgId || !isSupabaseConfigured) return null;
  const client = getClient();
  try {
    const { data: orgData, error: orgErr } = await client
      .from("organizations")
      .select("*, organization_members(*)")
      .eq("id", orgId)
      .maybeSingle();

    if (orgErr || !orgData) {
      return null;
    }

    return mapDbOrgToOrganization(orgData, orgData.organization_members || []);
  } catch (e) {
    console.warn("Supabase error fetching organization:", e);
    return null;
  }
}

/**
 * Checks whether an organization name or slug is available globally.
 * Case-insensitive & trimmed comparison.
 */
export async function checkOrganizationNameAvailable(
  name: string,
  excludeOrgId?: string
): Promise<{ available: boolean; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { available: false, error: "Organization name cannot be empty." };
  }
  const normalized = trimmed.toLowerCase();
  const slug = normalized.replace(/[^a-z0-9]/g, "-");

  // 1. Check in Supabase with targeted slug/name query
  if (isSupabaseConfigured) {
    try {
      const client = getClient();
      let query = client.from("organizations").select("id, name, slug").or(`slug.eq.${slug},name.ilike.${trimmed}`);
      if (excludeOrgId) {
        query = query.neq("id", excludeOrgId);
      }
      const { data, error } = await query.limit(1);
      if (!error && data && data.length > 0) {
        return {
          available: false,
          error: `An organization with the name "${trimmed}" already exists.`,
        };
      }
    } catch (e) {
      console.warn("Supabase error checking org name availability:", e);
    }
  }

  // 2. Check in localStorage cache
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("ts_cached_user_orgs");
      if (cached) {
        const orgs: Organization[] = JSON.parse(cached);
        if (Array.isArray(orgs)) {
          for (const org of orgs) {
            if (excludeOrgId && org.id === excludeOrgId) continue;
            const existingName = (org.name || "").trim().toLowerCase();
            const existingSlug = (org.slug || "").trim().toLowerCase();
            if (existingName === normalized || existingSlug === slug) {
              return {
                available: false,
                error: `An organization with the name "${trimmed}" already exists.`,
              };
            }
          }
        }
      }
    } catch {}
  }

  return { available: true };
}

/**
 * Creates a new Organization directly in Supabase
 */
export async function createOrganization(
  name: string,
  owner: { uid: string; email: string; displayName?: string },
  icon?: string,
  color?: string,
  logoUrl?: string
): Promise<Organization> {
  const check = await checkOrganizationNameAvailable(name);
  if (!check.available) {
    throw new Error(check.error || `An organization with the name "${name}" already exists.`);
  }

  const orgId = `org_${Date.now()}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const now = new Date().toISOString();

  const newOrg: Organization = {
    id: orgId,
    name: name.trim(),
    slug,
    icon: icon || "🏢",
    color: color || "#171717",
    logoUrl: logoUrl || "",
    ownerUid: owner.uid,
    memberUids: [owner.uid],
    memberEmails: [owner.email.trim().toLowerCase()],
    members: [
      {
        uid: owner.uid,
        email: owner.email,
        displayName: owner.displayName || owner.email.split("@")[0],
        role: "owner",
        joinedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    const client = getClient();
    // 1. Insert organization
    const { error: orgErr } = await client.from("organizations").insert({
      id: orgId,
      name: newOrg.name,
      slug: newOrg.slug,
      owner_uid: newOrg.ownerUid,
      icon: newOrg.icon,
      color: newOrg.color,
      logo_url: newOrg.logoUrl,
      created_at: now,
      updated_at: now,
    });

    if (orgErr) {
      console.error("Supabase error creating organization:", orgErr.message);
      throw new Error(`Failed creating organization: ${orgErr.message}`);
    }

    // 2. Insert owner into organization_members
    await client.from("organization_members").insert({
      org_id: orgId,
      user_id: owner.uid,
      email: owner.email,
      display_name: owner.displayName || owner.email.split("@")[0],
      role: "owner",
      joined_at: now,
    });
  }

  return newOrg;
}

/**
 * Updates Organization metadata in Supabase
 */
export async function updateOrganization(
  orgId: string,
  updates: Partial<{ name: string; slug: string; icon: string; color: string; logoUrl: string; avatarUrl: string }>
): Promise<void> {
  if (!orgId) return;

  if (updates.name) {
    const check = await checkOrganizationNameAvailable(updates.name, orgId);
    if (!check.available) {
      throw new Error(check.error || `An organization with the name "${updates.name}" already exists.`);
    }
  }

  if (!isSupabaseConfigured) return;
  const client = getClient();
  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
  if (updates.avatarUrl !== undefined && !updates.logoUrl) dbUpdates.logo_url = updates.avatarUrl;

  const { error } = await client.from("organizations").update(dbUpdates).eq("id", orgId);
  if (error) {
    console.error("Supabase error updating organization:", error.message);
    throw error;
  }
}

/**
 * Deletes an Organization and cascades to projects, members, and invitations in Supabase
 */
export async function deleteOrganization(orgId: string): Promise<void> {
  if (!orgId || !isSupabaseConfigured) return;
  const client = getClient();
  const { error } = await client.from("organizations").delete().eq("id", orgId);
  if (error) {
    console.error("Supabase error deleting organization:", error.message);
    throw error;
  }
}

/**
 * Adds or updates a member in an Organization in Supabase
 */
export async function updateOrgMember(
  orgId: string,
  member: OrganizationMember
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getClient();
  try {
    await client.from("organization_members").upsert(
      {
        org_id: orgId,
        user_id: member.uid,
        email: member.email.trim().toLowerCase(),
        display_name: member.displayName || null,
        role: member.role,
        joined_at: member.joinedAt || new Date().toISOString(),
      },
      { onConflict: "org_id,user_id" }
    );
  } catch (e) {
    console.warn("Supabase error updating member:", e);
  }
}

/**
 * Removes a member from an Organization in Supabase
 */
export async function removeOrgMember(
  orgId: string,
  memberUid: string
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const response = await fetch(
    `/api/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberUid)}`,
    { method: "DELETE" }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Failed to remove member.");
}

// -------------------------------------------------------------
// INVITATION OPERATIONS (100% Dynamic Supabase)
// -------------------------------------------------------------

function generateInviteToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `tok_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

async function assertInviteEmailAvailable(
  orgId: string,
  email: string,
  excludeInvitationId?: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const client = getClient();
  const [{ data: members, error: membersError }, { data: invitations, error: invitationsError }] =
    await Promise.all([
      client.from("organization_members").select("email").eq("org_id", orgId),
      client.from("invitations").select("id, email").eq("org_id", orgId).eq("status", "pending"),
    ]);

  if (membersError) throw membersError;
  if (invitationsError) throw invitationsError;

  if (members?.some((member: { email: string | null }) => member.email?.trim().toLowerCase() === normalizedEmail)) {
    throw new Error("This email is already an active member of this workspace.");
  }
  if (
    invitations?.some(
      (invitation: { id: string; email: string | null }) =>
        invitation.id !== excludeInvitationId &&
        invitation.email?.trim().toLowerCase() === normalizedEmail
    )
  ) {
    throw new Error("A pending invitation already exists for this email in this workspace.");
  }
}

/**
 * Generates an invitation for an email in Supabase
 */
export async function createOrganizationInvitation(
  orgId: string,
  orgName: string,
  inviter: { uid: string; name?: string; email: string },
  inviteeEmail: string,
  role: UserRole
): Promise<OrganizationInvitation> {
  const normalizedEmail = inviteeEmail.trim().toLowerCase();
  if (normalizedEmail === inviter.email.trim().toLowerCase()) {
    throw new Error("You are already part of this workspace.");
  }
  if (isSupabaseConfigured) await assertInviteEmailAvailable(orgId, normalizedEmail);

  const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  const now = new Date().toISOString();

  const newInvitation: OrganizationInvitation = {
    id,
    token,
    orgId,
    orgName,
    invitedByUid: inviter.uid,
    invitedByName: inviter.name || inviter.email.split("@")[0],
    invitedByEmail: inviter.email,
    inviteeEmail: normalizedEmail,
    role,
    status: "pending",
    createdAt: now,
    expiresAt,
  };

  if (isSupabaseConfigured) {
    const client = getClient();
    try {
      const { error: insertErr } = await client.from("invitations").insert({
        id,
        org_id: orgId,
        org_name: orgName,
        email: newInvitation.inviteeEmail,
        role,
        inviter_uid: inviter.uid,
        inviter_email: inviter.email,
        inviter_name: newInvitation.invitedByName,
        token,
        status: "pending",
        created_at: now,
        expires_at: expiresAt,
      });
      if (insertErr) throw insertErr;
    } catch (e) {
      console.warn("Supabase error saving invitation:", e);
      if ((e as { code?: string })?.code === "23505") {
        throw new Error("This email already has a membership or pending invitation in this workspace.");
      }
      throw e;
    }
  }

  return newInvitation;
}

/**
 * Gets all pending invitations for a specific organization from Supabase
 */
export async function getOrganizationInvitations(orgId: string): Promise<OrganizationInvitation[]> {
  if (!orgId || !isSupabaseConfigured) return [];
  const client = getClient();
  try {
    const { data, error } = await client
      .from("invitations")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "pending");

    if (error || !data) return [];
    return data.map(mapDbInvitation);
  } catch (e) {
    console.warn("Supabase error getting org invitations:", e);
    return [];
  }
}

/**
 * Resends / renews an invitation in Supabase with a new token and fresh 7-day expiration
 */
export async function resendOrganizationInvitation(
  invitationId: string
): Promise<OrganizationInvitation | null> {
  if (!invitationId || !isSupabaseConfigured) return null;
  const client = getClient();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const newToken = generateInviteToken();
  const now = new Date().toISOString();

  try {
    const { data: currentInvitation, error: lookupError } = await client
      .from("invitations")
      .select("org_id, email")
      .eq("id", invitationId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!currentInvitation) return null;
    await assertInviteEmailAvailable(currentInvitation.org_id, currentInvitation.email, invitationId);

    const { data, error } = await client
      .from("invitations")
      .update({
        token: newToken,
        status: "pending",
        created_at: now,
        expires_at: expiresAt,
      })
      .eq("id", invitationId)
      .select()
      .maybeSingle();

    if (error?.code === "23505") {
      throw new Error("This email already has a membership or pending invitation in this workspace.");
    }
    if (error || !data) return null;
    return mapDbInvitation(data);
  } catch (e) {
    console.warn("Supabase error resending invitation:", e);
    throw e;
  }
}

/**
 * Gets pending invitations for a user's email address from Supabase
 */
export async function getPendingInvitationsForEmail(email: string): Promise<OrganizationInvitation[]> {
  if (!email || !isSupabaseConfigured) return [];
  const client = getClient();
  const normalized = email.trim().toLowerCase();

  try {
    const { data, error } = await client
      .from("invitations")
      .select("*")
      .ilike("email", normalized)
      .eq("status", "pending");

    if (error || !data) return [];
    return data.map(mapDbInvitation);
  } catch (e) {
    console.warn("Supabase error getting email invitations:", e);
    return [];
  }
}

/**
 * Looks up an invitation by its unique token in Supabase
 */
export async function getInvitationByToken(token: string): Promise<OrganizationInvitation | null> {
  if (!token || !isSupabaseConfigured) return null;
  const client = getClient();
  try {
    const { data, error } = await client
      .from("invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error || !data) return null;
    return mapDbInvitation(data);
  } catch (e) {
    console.warn("Supabase error looking up invitation token:", e);
    return null;
  }
}

/**
 * Accepts an invitation through the server API, which verifies the signed-in user's email.
 */
export async function acceptOrganizationInvitation(token: string): Promise<Organization | null> {
  const res = await fetch(`/api/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || "Invitation is invalid or has already been used.");
  }
  return await getOrganization(payload.orgId);
}

/**
 * Asks the server to email an invitation link. Resolves false when delivery is unavailable.
 */
export async function sendInvitationEmail(invitationId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/invitations/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    const payload = await res.json().catch(() => ({}));
    return res.ok && payload?.sent === true;
  } catch {
    return false;
  }
}

/**
 * Revokes a pending invitation in Supabase
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getClient();
  try {
    await client
      .from("invitations")
      .update({
        status: "revoked",
      })
      .eq("id", invitationId);
  } catch (e) {
    console.warn("Supabase error revoking invitation:", e);
  }
}

// -------------------------------------------------------------
// PROJECT OPERATIONS (100% Dynamic Supabase)
// -------------------------------------------------------------

const inFlightOrgProjectsPromises = new Map<string, Promise<Project[]>>();

/**
 * Sanitizes project metadata for localStorage caching by stripping bulky documentation
 * and asset blobs, while keeping token dictionaries intact so tokens never fail to load.
 */
export function sanitizeProjectsForCache(projs: Project[]): Project[] {
  return projs.map((p) => {
    const { documentation, assets, assetFolders, ...safeProject } = p;
    return {
      ...safeProject,
      assetsCount: p.assetsCount || (assets ? assets.length : 0),
    } as Project;
  });
}

/**
 * Safely persists projects to localStorage with automatic compression and fallback
 * to prevent browser QuotaExceededError when storing large token sets.
 */
export function safeSetCachedProjects(orgId: string, projs: Project[]): void {
  if (typeof window === "undefined" || !orgId) return;
  const cacheKey = `ts_cached_org_projects_${orgId}`;

  try {
    const sanitized = sanitizeProjectsForCache(projs);
    localStorage.setItem(cacheKey, JSON.stringify(sanitized));
  } catch {
    try {
      const minimal = projs.map((p) => ({
        id: p.id,
        orgId: p.orgId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        icon: p.icon,
        color: p.color,
        activeBranch: p.activeBranch,
        branches: p.branches,
        rawTokens: p.rawTokens,
        themeGroups: p.themeGroups,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      localStorage.setItem(cacheKey, JSON.stringify(minimal));
    } catch {
      try {
        localStorage.removeItem(cacheKey);
      } catch {}
    }
  }
}

const inFlightProjectPromises = new Map<string, Promise<Project | null>>();
const inFlightOrgSummariesPromises = new Map<string, Promise<Project[]>>();

/**
 * Fetches a single project from Supabase by orgId and projectId with full tokens and branches
 */
export async function getProject(orgId: string, projectId: string): Promise<Project | null> {
  if (!orgId || !projectId || !isSupabaseConfigured) return null;

  const cacheKey = `${orgId}__${projectId}`;
  const inFlight = inFlightProjectPromises.get(cacheKey);
  if (inFlight) return inFlight;

  const fetchPromise = (async () => {
    const client = getClient();
    try {
      const { data, error } = await client
        .from("projects")
        .select("*")
        .eq("org_id", orgId)
        .eq("id", projectId)
        .maybeSingle();

      if (error || !data) return null;
      const { data: integration } = await client
        .from("project_integrations")
        .select("git_config, asset_git_config, asset_figma_config")
        .eq("project_id", projectId)
        .maybeSingle();
      return mapDbProjectToProject(data, integration || undefined);
    } catch (e) {
      console.warn("Supabase error fetching single project:", e);
      return null;
    }
  })().finally(() => {
    inFlightProjectPromises.delete(cacheKey);
  });

  inFlightProjectPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Fetches lightweight project metadata for lists without downloading token trees or assets.
 */
export async function getOrgProjectSummaries(orgId: string): Promise<Project[]> {
  if (!orgId) return [];

  const inFlight = inFlightOrgSummariesPromises.get(orgId);
  if (inFlight) return inFlight;

  const fetchPromise = (async () => {
    if (isSupabaseConfigured) {
      try {
        const client = getClient();
        const { data, error } = await client
          .from("projects")
          .select("id, org_id, name, slug, description, icon, color, logo_url, active_branch, git_config, credentials, asset_git_config, asset_figma_config, enabled_schemas, created_at, updated_at")
          .eq("org_id", orgId)
          .order("created_at", { ascending: true });

        if (!error && data) {
          const { data: integrations } = await client
            .from("project_integrations")
            .select("project_id, git_config, asset_git_config, asset_figma_config")
            .eq("org_id", orgId);
          const integrationByProject = new Map<string, any>((integrations || []).map((item: any) => [item.project_id, item]));

          return data.map((row: any) => {
            const integ = integrationByProject.get(row.id);
            const gitConfig =
              integ?.git_config && Object.keys(integ.git_config).length > 0
                ? integ.git_config
                : row.git_config && Object.keys(row.git_config).length > 0
                ? row.git_config
                : row.credentials && Object.keys(row.credentials).length > 0
                ? row.credentials
                : null;
            const assetGitConfig =
              integ?.asset_git_config && Object.keys(integ.asset_git_config).length > 0
                ? integ.asset_git_config
                : row.asset_git_config && Object.keys(row.asset_git_config).length > 0
                ? row.asset_git_config
                : null;
            const assetFigmaConfig =
              integ?.asset_figma_config && Object.keys(integ.asset_figma_config).length > 0
                ? integ.asset_figma_config
                : row.asset_figma_config && Object.keys(row.asset_figma_config).length > 0
                ? row.asset_figma_config
                : null;

            return {
              id: row.id,
              orgId: row.org_id,
              name: row.name,
              slug: row.slug,
              description: row.description || undefined,
              icon: row.icon || "🎯",
              color: row.color || "#171717",
              logoUrl: row.logo_url || "",
              activeBranch: row.active_branch || "main",
              enabledSchemas: row.enabled_schemas || [],
              gitConfig,
              assetGitConfig,
              assetFigmaConfig,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
          });
        }

        if (error) {
          console.warn("Supabase error fetching project summaries:", error.message);
        }
      } catch (e) {
        console.warn("Supabase error fetching project summaries:", e);
      }
    }

    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`ts_cached_org_projects_${orgId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }

    return [];
  })().finally(() => {
    inFlightOrgSummariesPromises.delete(orgId);
  });

  inFlightOrgSummariesPromises.set(orgId, fetchPromise);
  return fetchPromise;
}

/**
 * Dynamically fetches all projects under an Organization from Supabase with in-flight deduplication
 */
export async function getOrgProjects(orgId: string): Promise<Project[]> {
  if (!orgId) return [];

  const inFlight = inFlightOrgProjectsPromises.get(orgId);
  if (inFlight) {
    return inFlight;
  }

  const fetchPromise = (async () => {
    if (isSupabaseConfigured) {
      try {
        const client = getClient();
        const { data, error } = await client
          .from("projects")
          .select("*")
          .eq("org_id", orgId)
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          const { data: integrations } = await client
            .from("project_integrations")
            .select("project_id, git_config, asset_git_config, asset_figma_config")
            .eq("org_id", orgId);
          const integrationByProject = new Map((integrations || []).map((item: any) => [item.project_id, item]));
          const projs = data.map((row: any) => mapDbProjectToProject(row, integrationByProject.get(row.id)));
          safeSetCachedProjects(orgId, projs);
          return projs;
        }
      } catch (e) {
        console.warn("Supabase error fetching projects:", e);
      }
    }

    // Fallback to localStorage cache for offline/local continuity
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`ts_cached_org_projects_${orgId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch {}
    }

    return [];
  })().finally(() => {
    inFlightOrgProjectsPromises.delete(orgId);
  });

  inFlightOrgProjectsPromises.set(orgId, fetchPromise);
  return fetchPromise;
}

/**
 * Checks whether a project name is available inside a specific organization.
 */
export async function checkProjectNameAvailable(
  orgId: string,
  name: string,
  excludeProjectId?: string
): Promise<{ available: boolean; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { available: false, error: "Project name cannot be empty." };
  }
  if (!orgId) {
    return { available: false, error: "Organization ID is required." };
  }
  const normalized = trimmed.toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const client = getClient();
      let q = client.from("projects").select("id, name").eq("org_id", orgId).ilike("name", trimmed);
      if (excludeProjectId) {
        q = q.neq("id", excludeProjectId);
      }
      const { data, error } = await q.limit(1);
      if (!error && data && data.length > 0) {
        return {
          available: false,
          error: `A project with the name "${trimmed}" already exists in this organization.`,
        };
      }
    } catch (e) {
      console.warn("Supabase error checking project name availability:", e);
    }
  }

  // Fallback to localStorage cache
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`ts_cached_org_projects_${orgId}`);
      if (cached) {
        const projs: Project[] = JSON.parse(cached);
        if (Array.isArray(projs)) {
          for (const p of projs) {
            if (excludeProjectId && p.id === excludeProjectId) continue;
            const existingName = (p.name || "").trim().toLowerCase();
            if (existingName === normalized) {
              return {
                available: false,
                error: `A project with the name "${trimmed}" already exists in this organization.`,
              };
            }
          }
        }
      }
    } catch {}
  }

  return { available: true };
}

/**
 * Creates a new Project inside an Organization directly in Supabase
 */
export async function createProject(
  orgId: string,
  name: string,
  description?: string,
  initialTokens?: RawTokensDocument,
  createdByName?: string,
  icon?: string,
  color?: string,
  logoUrl?: string
): Promise<Project> {
  const check = await checkProjectNameAvailable(orgId, name);
  if (!check.available) {
    throw new Error(check.error || `A project with the name "${name}" already exists in this organization.`);
  }

  const projId = `proj_${Date.now()}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const rawTokens = initialTokens && Object.keys(initialTokens).length > 0 ? initialTokens : {};
  const themeGroups = extractThemeGroups(rawTokens);
  const now = new Date().toISOString();

  const defaultBranch: ProjectBranch = {
    id: `branch_main_${projId}`,
    name: "main",
    title: "Main",
    description: "Default production branch",
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    createdBy: {
      name: createdByName || "Team Member",
      email: "user@example.com",
    },
    rawTokens,
    themeGroups,
    commits: [
      {
        id: `commit_init_${projId}`,
        sha: "init-" + Math.random().toString(36).substring(2, 8),
        message: "Initial project setup",
        timestamp: now,
        author: {
          name: createdByName || "Team Member",
          email: "user@example.com",
        },
        totalAdded: Object.keys(rawTokens).length,
        totalModified: 0,
        totalDeleted: 0,
        changes: [],
      },
    ],
    comments: [],
  };

  const newProject: Project = {
    id: projId,
    orgId,
    name,
    slug,
    description: description || "Design tokens project",
    icon: icon || "🎯",
    color: color || "#171717",
    logoUrl: logoUrl || "",
    rawTokens,
    themeGroups,
    branches: [defaultBranch],
    activeBranch: "main",
    createdAt: now,
    updatedAt: now,
    createdByName: createdByName || "Team Member",
  };

  if (isSupabaseConfigured) {
    const client = getClient();
    try {
      await client.from("projects").insert({
        id: projId,
        org_id: orgId,
        name,
        slug,
        description: newProject.description,
        icon: newProject.icon,
        color: newProject.color,
        logo_url: newProject.logoUrl,
        active_branch: "main",
        branches: newProject.branches,
        raw_tokens: rawTokens,
        theme_groups: themeGroups,
        credentials: {},
        compiler_config: {},
        enabled_schemas: [],
        git_config: {},
        asset_git_config: {},
        asset_figma_config: {},
        figma_variables: {},
        documentation: null,
        extra_data: {
          createdByName: newProject.createdByName,
        },
        created_at: now,
        updated_at: now,
      });
    } catch (e) {
      console.warn("Supabase error creating project:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const key = `ts_cached_org_projects_${orgId}`;
      const existing = localStorage.getItem(key);
      const list: Project[] = existing ? JSON.parse(existing) : [];
      const updated = [...list.filter((p) => p.id !== projId), newProject];
      safeSetCachedProjects(orgId, updated);
    } catch {}
  }

  return newProject;
}

/**
 * Ensures a project always has a valid list of native branches with at least a default 'main' branch
 */
export function ensureProjectDefaultBranch(proj: Project): ProjectBranch[] {
  if (proj.branches && proj.branches.length > 0) {
    return proj.branches;
  }
  const effectiveTokens: RawTokensDocument =
    proj.rawTokens && Object.keys(proj.rawTokens).length > 0
      ? proj.rawTokens
      : {};

  const defaultBranch: ProjectBranch = {
    id: `branch_main_${proj.id}`,
    name: "main",
    title: "Main",
    description: "Default production branch",
    isDefault: true,
    createdAt: proj.createdAt || new Date().toISOString(),
    updatedAt: proj.updatedAt || new Date().toISOString(),
    createdBy: {
      name: proj.createdByName || "Team Member",
      email: "user@example.com",
    },
    rawTokens: effectiveTokens,
    themeGroups: proj.themeGroups || [],
    commits: [
      {
        id: `commit_init_${proj.id}`,
        sha: "init-" + Math.random().toString(36).substring(2, 8),
        message: "Initial tokens import",
        timestamp: proj.createdAt || new Date().toISOString(),
        author: {
          name: proj.createdByName || "Team Member",
          email: "user@example.com",
        },
        totalAdded: Object.keys(effectiveTokens || {}).length,
        totalModified: 0,
        totalDeleted: 0,
        changes: [],
      },
    ],
    comments: [],
  };
  return [defaultBranch];
}

/**
 * Dynamically saves native branches for a specific Project in Supabase
 */
export async function saveProjectBranches(
  orgId: string,
  projectId: string,
  branches: ProjectBranch[],
  activeBranch?: string
): Promise<void> {
  if (!orgId || !projectId || !isSupabaseConfigured) return;
  const client = getClient();
  const updates: Record<string, any> = {
    branches,
    updated_at: new Date().toISOString(),
  };
  if (activeBranch) {
    updates.active_branch = activeBranch;
  }
  try {
    await client.from("projects").update(updates).eq("id", projectId).eq("org_id", orgId);
  } catch (e) {
    console.warn("Supabase error saving project branches:", e);
  }
}

/**
 * Deletes a Project from an Organization in Supabase
 */
export async function deleteProject(orgId: string, projectId: string): Promise<void> {
  if (isSupabaseConfigured) {
    const client = getClient();
    try {
      await client.from("projects").delete().eq("id", projectId).eq("org_id", orgId);
    } catch (e) {
      console.warn("Supabase error deleting project:", e);
    }
  }
  if (typeof window !== "undefined") {
    try {
      const key = `ts_cached_org_projects_${orgId}`;
      const existing = localStorage.getItem(key);
      if (existing) {
        const list: Project[] = JSON.parse(existing);
        const updated = list.filter((p) => p.id !== projectId);
        safeSetCachedProjects(orgId, updated);
      }
    } catch {}
  }
}

/**
 * Updates Project metadata in Supabase
 */
export async function updateProject(
  orgId: string,
  projectId: string,
  updates: Partial<{ name: string; description: string; slug: string; icon: string; color: string; logoUrl: string; isArchived?: boolean }>
): Promise<void> {
  if (updates.name) {
    const check = await checkProjectNameAvailable(orgId, updates.name, projectId);
    if (!check.available) {
      throw new Error(check.error || `A project with the name "${updates.name}" already exists in this organization.`);
    }
  }

  if (isSupabaseConfigured && orgId && projectId) {
    const client = getClient();
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;

    try {
      await client.from("projects").update(dbUpdates).eq("id", projectId).eq("org_id", orgId);
    } catch (e) {
      console.warn("Supabase error updating project:", e);
      throw e;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const key = `ts_cached_org_projects_${orgId}`;
      const existing = localStorage.getItem(key);
      if (existing) {
        const list: Project[] = JSON.parse(existing);
        const updated = list.map((p) =>
          p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        );
        safeSetCachedProjects(orgId, updated);
      }
    } catch {}
  }
}

/**
 * Dynamically saves updated design tokens & themes for a specific Project in Supabase
 */
export async function saveProjectTokens(
  orgId: string,
  projectId: string,
  rawTokens: RawTokensDocument,
  themeGroups?: ThemeGroup[]
): Promise<void> {
  if (!orgId || !projectId || !isSupabaseConfigured) return;
  const groups = themeGroups || extractThemeGroups(rawTokens);
  const client = getClient();

  try {
    await client
      .from("projects")
      .update({
        raw_tokens: rawTokens,
        theme_groups: groups,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("org_id", orgId);
  } catch (e) {
    console.warn("Supabase error saving project tokens:", e);
  }
}

/**
 * Dynamically saves Git configuration for a specific Project in Supabase
 */
export async function saveProjectGitConfig(
  orgId: string,
  projectId: string,
  gitConfig: GitCredentials | null
): Promise<void> {
  if (!orgId || !projectId) return;

  // 1. Update localStorage project caches immediately
  if (typeof window !== "undefined") {
    try {
      const key = `ts_cached_org_projects_${orgId}`;
      const existing = localStorage.getItem(key);
      if (existing) {
        const list: Project[] = JSON.parse(existing);
        const updated = list.map((p) =>
          p.id === projectId ? { ...p, gitConfig, updatedAt: new Date().toISOString() } : p
        );
        safeSetCachedProjects(orgId, updated);
      }
      const projKey = `ts_cached_project_${orgId}_${projectId}`;
      const existingSingle = localStorage.getItem(projKey);
      if (existingSingle) {
        const p: Project = JSON.parse(existingSingle);
        localStorage.setItem(projKey, JSON.stringify({ ...p, gitConfig, updatedAt: new Date().toISOString() }));
      }
    } catch {}
  }

  if (!isSupabaseConfigured) return;
  const client = getClient();
  try {
    const now = new Date().toISOString();
    const integrationPromise = client.from("project_integrations").upsert(
      {
        project_id: projectId,
        org_id: orgId,
        git_config: gitConfig || {},
        updated_at: now,
      },
      { onConflict: "project_id" }
    );

    const projectPromise = client
      .from("projects")
      .update({
        git_config: gitConfig || {},
        updated_at: now,
      })
      .eq("id", projectId)
      .eq("org_id", orgId);

    const [intResult, projResult] = await Promise.allSettled([integrationPromise, projectPromise]);
    if (intResult.status === "fulfilled" && intResult.value.error) {
      console.warn("Supabase notice saving to project_integrations:", intResult.value.error.message);
    }
    if (projResult.status === "fulfilled" && projResult.value.error) {
      console.warn("Supabase notice saving to projects.git_config:", projResult.value.error.message);
    }
  } catch (e) {
    console.warn("Supabase error saving project git config:", e);
  }
}

/**
 * Dynamically saves or clears Figma Variables for a specific Project in Supabase
 */
export async function saveProjectFigmaVariables(
  orgId: string,
  projectId: string,
  figmaVariables: RawTokensDocument | null,
  meta?: Record<string, any>
): Promise<void> {
  if (!orgId || !projectId || !isSupabaseConfigured) return;
  const client = getClient();
  try {
    const { data: currentProj } = await client
      .from("projects")
      .select("extra_data")
      .eq("id", projectId)
      .maybeSingle();

    const currentExtra = currentProj?.extra_data || {};
    const updatedExtra = {
      ...currentExtra,
      figmaMeta: meta || {},
      figmaUpdatedAt: figmaVariables && Object.keys(figmaVariables).length > 0 ? new Date().toISOString() : null,
    };

    await client
      .from("projects")
      .update({
        figma_variables: figmaVariables || {},
        extra_data: updatedExtra,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("org_id", orgId);
  } catch (e) {
    console.warn("Supabase error saving figma variables:", e);
  }
}

// -------------------------------------------------------------
// DOCUMENTATION OPERATIONS (100% Dynamic Supabase)
// -------------------------------------------------------------

/**
 * Saves project documentation in Supabase
 */
export async function saveProjectDocumentation(
  orgId: string,
  projectId: string,
  documentation: import("@/types/documentation").ProjectDocumentation | null
): Promise<void> {
  if (!orgId || !projectId || !isSupabaseConfigured) return;
  const client = getClient();
  try {
    await client
      .from("projects")
      .update({
        documentation: documentation || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("org_id", orgId);
  } catch (e) {
    console.warn("Supabase error saving project documentation:", e);
  }
}

/**
 * Fetches project documentation from Supabase
 */
export async function getProjectDocumentation(
  orgId: string,
  projectId: string
): Promise<import("@/types/documentation").ProjectDocumentation | null> {
  if (!orgId || !projectId || !isSupabaseConfigured) return null;
  const client = getClient();
  try {
    const { data, error } = await client
      .from("projects")
      .select("documentation")
      .eq("id", projectId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error || !data) return null;
    return (data.documentation as import("@/types/documentation").ProjectDocumentation) || null;
  } catch (e) {
    console.warn("Supabase error getting project documentation:", e);
    return null;
  }
}

/**
 * Fetches published project documentation for public viewing
 */
export async function getPublishedProjectDocs(
  orgSlugOrId: string,
  projectSlugOrName: string
): Promise<{
  orgName: string;
  projectName: string;
  documentation: import("@/types/documentation").ProjectDocumentation;
  rawTokens?: import("@/types/tokens").RawTokensDocument;
  figmaVariables?: import("@/types/tokens").RawTokensDocument;
  themeGroups?: import("@/types/tokens").ThemeGroup[];
} | null> {
  if (!isSupabaseConfigured) return null;
  const client = getClient();
  try {
    // 1. Try finding org by ID or slug
    const { data: orgData, error: orgErr } = await client
      .from("organizations")
      .select("*")
      .or(`id.eq.${orgSlugOrId},slug.eq.${orgSlugOrId}`)
      .maybeSingle();

    if (orgErr || !orgData) return null;

    // 2. Query projects in this org
    const { data: projsData, error: projErr } = await client
      .from("projects")
      .select("*")
      .eq("org_id", orgData.id);

    if (projErr || !projsData) return null;

    let targetProject: any = null;
    for (const p of projsData) {
      const cleanNameSlug = (p.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const docSlug = p.documentation?.publishedUrlSlug;
      if (
        p.id === projectSlugOrName ||
        p.slug === projectSlugOrName ||
        cleanNameSlug === projectSlugOrName ||
        docSlug === projectSlugOrName
      ) {
        targetProject = p;
        break;
      }
    }

    if (!targetProject) return null;
    const proj = mapDbProjectToProject(targetProject);
    if (!proj.documentation || !proj.documentation.isPublishedGlobally) {
      return null;
    }

    let rawTokensToReturn = proj.documentation.publishedTokens;
    let figmaVariablesToReturn = proj.documentation.publishedVariables;

    if (!rawTokensToReturn || Object.keys(rawTokensToReturn).length === 0) {
      if (proj.branches && proj.branches.length > 0) {
        const activeB =
          proj.branches.find((b) => b.name === (proj.activeBranch || "main")) ||
          proj.branches.find((b) => b.isDefault) ||
          proj.branches[0];
        if (activeB && activeB.rawTokens && Object.keys(activeB.rawTokens).length > 0) {
          rawTokensToReturn = activeB.rawTokens;
        }
      }
      if (!rawTokensToReturn || Object.keys(rawTokensToReturn).length === 0) {
        rawTokensToReturn = proj.rawTokens || {};
      }
    }

    if (!figmaVariablesToReturn || Object.keys(figmaVariablesToReturn).length === 0) {
      figmaVariablesToReturn = proj.figmaVariables || {};
    }

    return {
      orgName: orgData.name,
      projectName: proj.name,
      documentation: proj.documentation,
      rawTokens: rawTokensToReturn || {},
      figmaVariables: figmaVariablesToReturn || {},
      themeGroups: proj.themeGroups || [],
    };
  } catch (e) {
    console.warn("Error fetching published project docs:", e);
    return null;
  }
}

// -------------------------------------------------------------
// USER & WORKSPACE ACTIVITY AUDIT LOG (Dynamic Supabase)
// -------------------------------------------------------------

/**
 * Persists an activity item to the organization's activities in Supabase
 */
export async function logOrganizationActivity(
  orgId: string,
  activity: UserActivityItem
): Promise<void> {
  if (!orgId || !isSupabaseConfigured) return;
  const client = getClient();
  try {
    await client.from("activities").insert({
      id: activity.id,
      org_id: orgId,
      type: activity.type || "system",
      title: activity.title,
      description: activity.description,
      user_data: activity.actor || (activity as any).user || {},
      timestamp: activity.timestamp || new Date().toISOString(),
      metadata: activity.metadata || {},
    });
  } catch (e) {
    console.warn("Supabase error logging organization activity:", e);
  }
}

/**
 * Fetches recent activity logs for an organization from Supabase (ordered by timestamp desc)
 */
export async function getOrganizationActivities(
  orgId: string,
  maxItems = 60
): Promise<UserActivityItem[]> {
  if (!orgId || !isSupabaseConfigured) return [];
  const client = getClient();
  try {
    const { data, error } = await client
      .from("activities")
      .select("*")
      .eq("org_id", orgId)
      .order("timestamp", { ascending: false })
      .limit(maxItems);

    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      type: d.type as any,
      title: d.title,
      description: d.description,
      actor: d.user_data || { name: "User", email: "" },
      timestamp: d.timestamp,
      metadata: d.metadata,
    }));
  } catch (e) {
    console.warn("Supabase error fetching organization activities:", e);
    return [];
  }
}

/**
 * Persists enabled schemas configuration for a Project in Supabase
 */
export async function saveProjectSchemas(
  orgId: string,
  projectId: string,
  enabledSchemas: string[]
): Promise<void> {
  if (!orgId || !projectId || !isSupabaseConfigured) return;
  const client = getClient();
  try {
    await client
      .from("projects")
      .update({
        enabled_schemas: enabledSchemas,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("org_id", orgId);
  } catch (e) {
    console.warn("Supabase error saving project schemas:", e);
  }
}
