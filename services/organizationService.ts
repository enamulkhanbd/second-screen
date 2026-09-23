import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore/lite";
import {
  Organization,
  Project,
  OrganizationMember,
  OrganizationInvitation,
  UserRole,
} from "@/types/tenant";
import { RawTokensDocument, ThemeGroup, GitCredentials, UserActivityItem, ProjectBranch } from "@/types/tokens";
import { extractThemeGroups } from "@/utils/themeHelpers";

// -------------------------------------------------------------
// ORGANIZATION OPERATIONS (100% Dynamic Firestore)
// -------------------------------------------------------------

/**
 * Dynamically fetches all organizations where the user is a member or owner from Firestore
 */
export async function getUserOrganizations(uid: string, userEmail?: string): Promise<Organization[]> {
  if (!uid && !userEmail) return [];
  if (!isFirebaseConfigured || !db) return [];

  try {
    const orgsMap = new Map<string, Organization>();
    const queries = [];

    if (uid) {
      queries.push(getDocs(query(collection(db, "organizations"), where("ownerUid", "==", uid))));
      queries.push(getDocs(query(collection(db, "organizations"), where("memberUids", "array-contains", uid))));
    }

    const cleanEmail = userEmail?.trim().toLowerCase();
    if (cleanEmail) {
      queries.push(getDocs(query(collection(db, "organizations"), where("memberEmails", "array-contains", cleanEmail))));
    }

    const results = await Promise.allSettled(queries);
    for (const res of results) {
      if (res.status === "fulfilled") {
        res.value.forEach((d) => {
          orgsMap.set(d.id, d.data() as Organization);
        });
      }
    }

    return Array.from(orgsMap.values());
  } catch (e) {
    console.warn("Firestore error fetching user organizations:", e);
    return [];
  }
}

/**
 * Dynamically fetches a specific organization by ID from Firestore
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  if (!orgId || !isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "organizations", orgId));
    if (snap.exists()) {
      return snap.data() as Organization;
    }
  } catch (e) {
    console.warn("Firestore error fetching organization:", e);
  }
  return null;
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

  // 1. Check in Firestore with targeted slug query (O(1) indexed lookup)
  if (isFirebaseConfigured && db) {
    try {
      const slugQ = query(collection(db, "organizations"), where("slug", "==", slug), limit(1));
      const snap = await getDocs(slugQ);
      for (const d of snap.docs) {
        if (excludeOrgId && d.id === excludeOrgId) continue;
        return {
          available: false,
          error: `An organization with the name "${trimmed}" already exists.`,
        };
      }
    } catch (e) {
      console.warn("Firestore error checking org name availability:", e);
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
 * Creates a new Organization directly in Firestore
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

  const newOrg: Organization = {
    id: orgId,
    name: name.trim(),
    slug,
    icon: icon || "🏢",
    color: color || "#6366f1",
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
        joinedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "organizations", orgId), newOrg);
    } catch (e) {
      console.warn("Firestore error creating org:", e);
    }
  }

  return newOrg;
}

/**
 * Updates Organization metadata (e.g. name, slug, icon, color, logoUrl) in Firestore
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

  if (!isFirebaseConfigured || !db) return;
  try {
    const orgRef = doc(db, "organizations", orgId);
    await updateDoc(orgRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Firestore error updating organization:", e);
    throw e;
  }
}

/**
 * Deletes an Organization and its projects from Firestore
 */
export async function deleteOrganization(orgId: string): Promise<void> {
  if (!orgId || !isFirebaseConfigured || !db) return;
  try {
    const projsRef = collection(db, "organizations", orgId, "projects");
    const snap = await getDocs(projsRef);
    const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    await deleteDoc(doc(db, "organizations", orgId));
  } catch (e) {
    console.warn("Firestore error deleting organization:", e);
    throw e;
  }
}

/**
 * Adds or updates a member in an Organization in Firestore
 */
export async function updateOrgMember(
  orgId: string,
  member: OrganizationMember
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const orgRef = doc(db, "organizations", orgId);
    const orgSnap = await getDoc(orgRef);
    if (orgSnap.exists()) {
      const orgData = orgSnap.data() as Organization;
      const filtered = orgData.members.filter(
        (m) => m.uid !== member.uid && m.email.toLowerCase() !== member.email.toLowerCase()
      );
      filtered.push(member);
      const memberUids = Array.from(new Set(filtered.map((m) => m.uid).filter(Boolean)));
      const memberEmails = Array.from(new Set(filtered.map((m) => m.email.toLowerCase()).filter(Boolean)));
      await updateDoc(orgRef, {
        members: filtered,
        memberUids,
        memberEmails,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("Firestore error updating member:", e);
  }
}

/**
 * Removes a member from an Organization in Firestore
 */
export async function removeOrgMember(
  orgId: string,
  memberEmailOrUid: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const orgRef = doc(db, "organizations", orgId);
    const orgSnap = await getDoc(orgRef);
    if (orgSnap.exists()) {
      const orgData = orgSnap.data() as Organization;
      const filtered = orgData.members.filter(
        (m) => m.uid !== memberEmailOrUid && m.email.toLowerCase() !== memberEmailOrUid.toLowerCase()
      );
      const memberUids = Array.from(new Set(filtered.map((m) => m.uid).filter(Boolean)));
      const memberEmails = Array.from(new Set(filtered.map((m) => m.email.toLowerCase()).filter(Boolean)));
      await updateDoc(orgRef, {
        members: filtered,
        memberUids,
        memberEmails,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("Firestore error removing member:", e);
  }
}

// -------------------------------------------------------------
// INVITATION OPERATIONS (100% Dynamic Firestore)
// -------------------------------------------------------------

/**
 * Generates an invitation for an email in Firestore
 */
export async function createOrganizationInvitation(
  orgId: string,
  orgName: string,
  inviter: { uid: string; name?: string; email: string },
  inviteeEmail: string,
  role: UserRole
): Promise<OrganizationInvitation> {
  const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const token = `tok_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const newInvitation: OrganizationInvitation = {
    id,
    token,
    orgId,
    orgName,
    invitedByUid: inviter.uid,
    invitedByName: inviter.name || inviter.email.split("@")[0],
    invitedByEmail: inviter.email,
    inviteeEmail: inviteeEmail.trim().toLowerCase(),
    role,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "invitations", id), newInvitation);
    } catch (e) {
      console.warn("Firestore error saving invitation:", e);
    }
  }

  return newInvitation;
}

/**
 * Gets all pending invitations for a specific organization from Firestore
 */
export async function getOrganizationInvitations(orgId: string): Promise<OrganizationInvitation[]> {
  if (!orgId || !isFirebaseConfigured || !db) return [];
  try {
    const q = query(
      collection(db, "invitations"),
      where("orgId", "==", orgId)
    );
    const snap = await getDocs(q);
    const invs: OrganizationInvitation[] = [];
    snap.forEach((d) => {
      const data = d.data() as OrganizationInvitation;
      // Only keep pending invitations (exclude accepted or revoked)
      if (data.status === "pending") {
        invs.push(data);
      }
    });
    return invs;
  } catch (e) {
    console.warn("Firestore error getting org invitations:", e);
    return [];
  }
}

/**
 * Resends / renews an invitation in Firestore with a new token and fresh 7-day expiration
 */
export async function resendOrganizationInvitation(
  invitationId: string
): Promise<OrganizationInvitation | null> {
  if (!invitationId) return null;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
  const newToken = `tok_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
  const createdAt = new Date().toISOString();

  if (isFirebaseConfigured && db) {
    try {
      const invRef = doc(db, "invitations", invitationId);
      const invSnap = await getDoc(invRef);
      if (invSnap.exists()) {
        const existing = invSnap.data() as OrganizationInvitation;
        const updatedInv: OrganizationInvitation = {
          ...existing,
          token: newToken,
          status: "pending",
          createdAt,
          expiresAt,
        };
        await updateDoc(invRef, {
          token: newToken,
          status: "pending",
          createdAt,
          expiresAt,
          updatedAt: createdAt,
        });
        return updatedInv;
      }
    } catch (e) {
      console.warn("Firestore error resending invitation:", e);
      throw e;
    }
  }
  return null;
}

/**
 * Gets pending invitations for a user's email address from Firestore
 */
export async function getPendingInvitationsForEmail(email: string): Promise<OrganizationInvitation[]> {
  if (!email || !isFirebaseConfigured || !db) return [];
  const normalized = email.trim().toLowerCase();

  try {
    const q = query(
      collection(db, "invitations"),
      where("inviteeEmail", "==", normalized),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    const invs: OrganizationInvitation[] = [];
    snap.forEach((d) => invs.push(d.data() as OrganizationInvitation));
    return invs;
  } catch (e) {
    console.warn("Firestore error getting email invitations:", e);
    return [];
  }
}

/**
 * Looks up an invitation by its unique token in Firestore
 */
export async function getInvitationByToken(token: string): Promise<OrganizationInvitation | null> {
  if (!token || !isFirebaseConfigured || !db) return null;
  try {
    const q = query(
      collection(db, "invitations"),
      where("token", "==", token)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as OrganizationInvitation;
    }
  } catch (e) {
    console.warn("Firestore error looking up invitation token:", e);
  }
  return null;
}

/**
 * Accepts an invitation in Firestore
 */
export async function acceptOrganizationInvitation(
  token: string,
  user: { uid: string; email: string; displayName?: string }
): Promise<Organization | null> {
  const inv = await getInvitationByToken(token);
  if (!inv || inv.status !== "pending") {
    throw new Error("Invitation is invalid or has already been used.");
  }

  // Check expiration
  if (inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now()) {
    throw new Error("This invitation has expired. Please ask your team administrator to resend it.");
  }

  // 1. Add user as a member of the organization
  const newMember: OrganizationMember = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split("@")[0],
    role: inv.role,
    joinedAt: new Date().toISOString(),
  };

  await updateOrgMember(inv.orgId, newMember);

  // 2. Mark invitation status as accepted
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, "invitations", inv.id), {
        status: "accepted",
        acceptedAt: new Date().toISOString(),
        acceptedByUid: user.uid,
      });
    } catch (e) {
      console.warn("Firestore error updating invitation status:", e);
    }
  }

  return await getOrganization(inv.orgId);
}

/**
 * Revokes a pending invitation in Firestore
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await updateDoc(doc(db, "invitations", invitationId), {
      status: "revoked",
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Firestore error revoking invitation:", e);
  }
}

// -------------------------------------------------------------
// PROJECT OPERATIONS (100% Dynamic Firestore)
// -------------------------------------------------------------

/**
 * In-flight promise registry to deduplicate concurrent requests for the same organization
 */
const inFlightOrgProjectsPromises = new Map<string, Promise<Project[]>>();

/**
 * Sanitizes project metadata for localStorage caching by stripping bulky documentation
 * and asset blobs, while keeping token dictionaries intact so tokens never fail to load.
 */
export function sanitizeProjectsForCache(projs: Project[]): Project[] {
  return projs.map((p) => ({
    ...p,
    rawTokens: p.rawTokens || {},
    assets: [],
    figmaVariables: undefined,
    figmaResolvedVariables: [],
    documentation: p.documentation
      ? {
          ...p.documentation,
          pages: [],
          folders: [],
        }
      : undefined,
    branches: p.branches?.map((b) => ({
      ...b,
      rawTokens: b.rawTokens || {},
      commits: b.commits?.map((c) => ({
        id: c.id,
        sha: c.sha,
        message: c.message,
        timestamp: c.timestamp,
        author: c.author,
        totalAdded: c.totalAdded,
        totalModified: c.totalModified,
        totalDeleted: c.totalDeleted,
        changes: [], // Strip heavy diff change arrays
      })),
    })),
  }));
}

/**
 * Resilient localStorage caching without dropping other workspaces
 */
export function safeSetCachedProjects(orgId: string, projs: Project[]): void {
  if (typeof window === "undefined" || !orgId) return;
  const key = `ts_cached_org_projects_${orgId}`;
  try {
    const serialized = JSON.stringify(sanitizeProjectsForCache(projs));
    localStorage.setItem(key, serialized);
  } catch (err) {
    // If QuotaExceededError, fallback to storing without tokens only for this key as emergency fallback
    try {
      const emergency = projs.map((p) => ({
        id: p.id,
        orgId: p.orgId,
        name: p.name,
        slug: p.slug,
        icon: p.icon,
        color: p.color,
        description: p.description,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
      }));
      localStorage.setItem(key, JSON.stringify(emergency));
    } catch {
      console.warn("Storage quota exceeded; unable to persist projects cache for org:", orgId);
    }
  }
}

/**
 * Fetches a single project from Firestore by orgId and projectId with full tokens and branches
 */
export async function getProject(orgId: string, projectId: string): Promise<Project | null> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return null;
  try {
    const projRef = doc(db, "organizations", orgId, "projects", projectId);
    const snap = await getDoc(projRef);
    if (snap.exists()) {
      return snap.data() as Project;
    }
  } catch (e) {
    console.warn("Firestore error fetching single project:", e);
  }
  return null;
}

/**
 * Dynamically fetches all projects under an Organization from Firestore with in-flight deduplication
 */
export async function getOrgProjects(orgId: string): Promise<Project[]> {
  if (!orgId) return [];

  // Deduplicate in-flight queries for the same org
  const inFlight = inFlightOrgProjectsPromises.get(orgId);
  if (inFlight) {
    return inFlight;
  }

  const fetchPromise = (async () => {
    // 1. Try Firestore if configured
    if (isFirebaseConfigured && db) {
      try {
        const projsRef = collection(db, "organizations", orgId, "projects");
        const snap = await getDocs(projsRef);
        const projs: Project[] = [];
        snap.forEach((docSnap) => projs.push(docSnap.data() as Project));
        if (projs.length > 0) {
          safeSetCachedProjects(orgId, projs);
          return projs;
        }
      } catch (e) {
        console.warn("Firestore error fetching projects:", e);
      }
    }

    // 2. Fallback to localStorage cache for offline/local continuity
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
 * Case-insensitive & trimmed comparison.
 * Scoped strictly to orgId (two different orgs CAN have the same project name).
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

  // 1. Check in Firestore under organizations/{orgId}/projects
  if (isFirebaseConfigured && db) {
    try {
      const projsRef = collection(db, "organizations", orgId, "projects");
      const snap = await getDocs(projsRef);
      for (const d of snap.docs) {
        if (excludeProjectId && d.id === excludeProjectId) continue;
        const projData = d.data() as Project;
        const existingName = (projData.name || "").trim().toLowerCase();
        if (existingName === normalized) {
          return {
            available: false,
            error: `A project with the name "${trimmed}" already exists in this organization.`,
          };
        }
      }
    } catch (e) {
      console.warn("Firestore error checking project name availability:", e);
    }
  }

  // 2. Check in localStorage cache for this specific org
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
 * Creates a new Project inside an Organization directly in Firestore
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

  const defaultBranch: ProjectBranch = {
    id: `branch_main_${projId}`,
    name: "main",
    title: "Main",
    description: "Default production branch",
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
    color: color || "#6366f1",
    logoUrl: logoUrl || "",
    rawTokens,
    themeGroups,
    branches: [defaultBranch],
    activeBranch: "main",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdByName: createdByName || "Team Member",
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "organizations", orgId, "projects", projId), newProject);
    } catch (e) {
      console.warn("Firestore error creating project:", e);
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
 * Dynamically saves native branches for a specific Project in Firestore
 */
export async function saveProjectBranches(
  orgId: string,
  projectId: string,
  branches: ProjectBranch[],
  activeBranch?: string
): Promise<void> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return;
  const projRef = doc(db, "organizations", orgId, "projects", projectId);
  const data = {
    branches,
    ...(activeBranch ? { activeBranch } : {}),
    updatedAt: new Date().toISOString(),
  };
  try {
    await updateDoc(projRef, data);
  } catch {
    try {
      await setDoc(projRef, data, { merge: true });
    } catch (e) {
      console.warn("Firestore error saving project branches:", e);
    }
  }
}

/**
 * Deletes a Project from an Organization in Firestore
 */
export async function deleteProject(orgId: string, projectId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "organizations", orgId, "projects", projectId));
    } catch (e) {
      console.warn("Firestore error deleting project:", e);
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
 * Updates Project metadata (name, description, slug, icon, color, logoUrl) in Firestore
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

  if (isFirebaseConfigured && db && orgId && projectId) {
    try {
      const projRef = doc(db, "organizations", orgId, "projects", projectId);
      await updateDoc(projRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Firestore error updating project:", e);
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
 * Dynamically saves updated design tokens & themes for a specific Project in Firestore
 */
export async function saveProjectTokens(
  orgId: string,
  projectId: string,
  rawTokens: RawTokensDocument,
  themeGroups?: ThemeGroup[]
): Promise<void> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return;
  const groups = themeGroups || extractThemeGroups(rawTokens);
  const projRef = doc(db, "organizations", orgId, "projects", projectId);
  const data = {
    rawTokens,
    themeGroups: groups,
    updatedAt: new Date().toISOString(),
  };

  try {
    // Check rough serialized size to guard against Firestore 1MB document limit
    const jsonSize = JSON.stringify(data).length;
    if (jsonSize > 950000) {
      console.warn(`[saveProjectTokens] Document size (${(jsonSize / 1024).toFixed(1)} KB) approaches Firestore 1MB limit. Syncing in memory.`);
      return;
    }
    await updateDoc(projRef, data);
  } catch {
    try {
      await setDoc(projRef, data, { merge: true });
    } catch (e) {
      console.warn("Firestore error saving project tokens:", e);
    }
  }
}

/**
 * Dynamically saves Git configuration for a specific Project in Firestore
 */
export async function saveProjectGitConfig(
  orgId: string,
  projectId: string,
  gitConfig: GitCredentials | null
): Promise<void> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return;
  try {
    const projRef = doc(db, "organizations", orgId, "projects", projectId);
    await updateDoc(projRef, {
      gitConfig,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Firestore error saving project git config:", e);
  }
}

/**
 * Dynamically saves or clears Figma Variables for a specific Project in Firestore
 */
export async function saveProjectFigmaVariables(
  orgId: string,
  projectId: string,
  figmaVariables: RawTokensDocument | null,
  meta?: Record<string, any>
): Promise<void> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return;
  try {
    const projRef = doc(db, "organizations", orgId, "projects", projectId);
    await setDoc(
      projRef,
      {
        figmaVariables: figmaVariables || {},
        figmaUpdatedAt: figmaVariables && Object.keys(figmaVariables).length > 0 ? new Date().toISOString() : null,
        figmaMeta: meta || {},
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Firestore error saving figma variables:", e);
  }
}


// -------------------------------------------------------------
// DOCUMENTATION OPERATIONS (100% Dynamic Firestore)
// -------------------------------------------------------------

/**
 * Saves project documentation (folders, pages, blocks, publish settings) in Firestore
 */
export async function saveProjectDocumentation(
  orgId: string,
  projectId: string,
  documentation: import("@/types/documentation").ProjectDocumentation | null
): Promise<void> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return;
  try {
    const projRef = doc(db, "organizations", orgId, "projects", projectId);
    await setDoc(
      projRef,
      {
        documentation: documentation || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Firestore error saving project documentation:", e);
  }
}

/**
 * Fetches project documentation from Firestore
 */
export async function getProjectDocumentation(
  orgId: string,
  projectId: string
): Promise<import("@/types/documentation").ProjectDocumentation | null> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return null;
  try {
    const projRef = doc(db, "organizations", orgId, "projects", projectId);
    const snap = await getDoc(projRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data.documentation as import("@/types/documentation").ProjectDocumentation) || null;
    }
    return null;
  } catch (e) {
    console.warn("Firestore error getting project documentation:", e);
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
  if (!isFirebaseConfigured || !db) return null;
  try {
    // 1. Try finding org by ID or slug
    let orgDoc = await getDoc(doc(db, "organizations", orgSlugOrId));
    let orgData: Organization | null = orgDoc.exists() ? (orgDoc.data() as Organization) : null;

    if (!orgData) {
      const orgQuery = query(collection(db, "organizations"), where("slug", "==", orgSlugOrId));
      const orgSnaps = await getDocs(orgQuery);
      if (!orgSnaps.empty) {
        orgData = orgSnaps.docs[0].data() as Organization;
      }
    }

    if (!orgData) return null;

    // 2. Query project in this org
    const projsQuery = collection(db, "organizations", orgData.id, "projects");
    const projSnaps = await getDocs(projsQuery);
    let targetProject: Project | null = null;

    projSnaps.forEach((pDoc) => {
      const p = pDoc.data() as Project;
      const cleanNameSlug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const docSlug = p.documentation?.publishedUrlSlug;
      if (
        p.id === projectSlugOrName ||
        cleanNameSlug === projectSlugOrName ||
        docSlug === projectSlugOrName
      ) {
        targetProject = p;
      }
    });

    if (!targetProject) return null;

    const proj = targetProject as Project;
    if (!proj.documentation || !proj.documentation.isPublishedGlobally) {
      return null;
    }

    // Extract tokens to serve with public docs
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
// USER & WORKSPACE ACTIVITY AUDIT LOG (Dynamic Firestore)
// -------------------------------------------------------------

/**
 * Persists an activity item to the organization's activities subcollection in Firestore
 */
export async function logOrganizationActivity(
  orgId: string,
  activity: UserActivityItem
): Promise<void> {
  if (!orgId || !isFirebaseConfigured || !db) return;
  try {
    const actRef = doc(db, "organizations", orgId, "activities", activity.id);
    await setDoc(actRef, {
      ...activity,
      createdAt: activity.timestamp || new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Firestore error logging organization activity:", e);
  }
}

/**
 * Fetches recent activity logs for an organization from Firestore (ordered by timestamp desc)
 */
export async function getOrganizationActivities(
  orgId: string,
  maxItems = 60
): Promise<UserActivityItem[]> {
  if (!orgId || !isFirebaseConfigured || !db) return [];
  try {
    const actCol = collection(db, "organizations", orgId, "activities");
    const q = query(actCol, orderBy("timestamp", "desc"), limit(maxItems));
    const snapshot = await getDocs(q);
    const activities: UserActivityItem[] = [];
    snapshot.forEach((d) => {
      activities.push(d.data() as UserActivityItem);
    });
    return activities;
  } catch (e) {
    console.warn("Firestore error fetching organization activities:", e);
    return [];
  }
}

/**
 * Persists enabled schemas configuration for a Project in Firestore
 */
export async function saveProjectSchemas(
  orgId: string,
  projectId: string,
  enabledSchemas: string[]
): Promise<void> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return;
  try {
    const projRef = doc(db, "organizations", orgId, "projects", projectId);
    await updateDoc(projRef, {
      enabledSchemas,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Firestore error saving project schemas:", e);
  }
}

