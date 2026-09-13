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
} from "firebase/firestore";
import {
  Organization,
  Project,
  OrganizationMember,
  OrganizationInvitation,
  UserRole,
  ProjectAsset,
  AssetGitConfig,
  AssetFigmaConfig,
} from "@/types/tenant";
import { RawTokensDocument, ThemeGroup, GitCredentials, UserActivityItem, ProjectBranch, BranchCommit, BranchComment } from "@/types/tokens";
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
    const ownerQ = query(collection(db, "organizations"), where("ownerUid", "==", uid));
    const orgsRef = collection(db, "organizations");

    const [ownerRes, allRes] = await Promise.allSettled([
      getDocs(ownerQ),
      getDocs(orgsRef),
    ]);

    if (ownerRes.status === "fulfilled") {
      ownerRes.value.forEach((d) => {
        orgsMap.set(d.id, d.data() as Organization);
      });
    }

    if (allRes.status === "fulfilled") {
      allRes.value.forEach((d) => {
        const data = d.data() as Organization;
        const isMember =
          data.ownerUid === uid ||
          data.members?.some(
            (m) =>
              m.uid === uid ||
              (userEmail && m.email.toLowerCase() === userEmail.toLowerCase())
          );
        if (isMember) {
          orgsMap.set(d.id, data);
        }
      });
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
 * Creates a new Organization directly in Firestore
 */
export async function createOrganization(
  name: string,
  owner: { uid: string; email: string; displayName?: string },
  icon?: string,
  color?: string,
  logoUrl?: string
): Promise<Organization> {
  const orgId = `org_${Date.now()}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");

  const newOrg: Organization = {
    id: orgId,
    name,
    slug,
    icon: icon || "🏢",
    color: color || "#6366f1",
    logoUrl: logoUrl || "",
    ownerUid: owner.uid,
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
  if (!orgId || !isFirebaseConfigured || !db) return;
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
      await updateDoc(orgRef, {
        members: filtered,
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
      await updateDoc(orgRef, {
        members: filtered,
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
 * Dynamically fetches all projects under an Organization from Firestore
 */
export async function getOrgProjects(orgId: string): Promise<Project[]> {
  if (!orgId) return [];

  // 1. Try Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      const projsRef = collection(db, "organizations", orgId, "projects");
      const snap = await getDocs(projsRef);
      const projs: Project[] = [];
      snap.forEach((docSnap) => projs.push(docSnap.data() as Project));
      if (projs.length > 0) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`ts_cached_org_projects_${orgId}`, JSON.stringify(projs));
          } catch {}
        }
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
      localStorage.setItem(key, JSON.stringify(updated));
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
        localStorage.setItem(key, JSON.stringify(updated));
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
  updates: Partial<{ name: string; description: string; slug: string; icon: string; color: string; logoUrl: string }>
): Promise<void> {
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
        localStorage.setItem(key, JSON.stringify(updated));
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

const ASSET_CHUNK_SIZE = 150;

/**
 * Dynamically saves SVG assets for a specific Project in Firestore.
 * Automatically splits libraries exceeding 150 items into sub-documents under
 * `organizations/{orgId}/projects/{projectId}/asset_chunks/` to avoid the 1 MB Firestore limit.
 */
export async function saveProjectAssets(
  orgId: string,
  projectId: string,
  assets: ProjectAsset[]
): Promise<void> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return;
  const firestore = db;
  try {
    const projRef = doc(firestore, "organizations", orgId, "projects", projectId);
    const chunksRef = collection(firestore, "organizations", orgId, "projects", projectId, "asset_chunks");

    // Small library (<= 150): save directly in project document and clean up chunks
    if (assets.length <= ASSET_CHUNK_SIZE) {
      await setDoc(
        projRef,
        {
          assets,
          hasChunkedAssets: false,
          assetsCount: assets.length,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Clean up previous chunks if any
      try {
        const existingChunks = await getDocs(chunksRef);
        if (!existingChunks.empty) {
          const batch = writeBatch(firestore);
          existingChunks.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch {}
      return;
    }

    // Large library (> 150): Split into chunked sub-documents
    const chunks: ProjectAsset[][] = [];
    for (let i = 0; i < assets.length; i += ASSET_CHUNK_SIZE) {
      chunks.push(assets.slice(i, i + ASSET_CHUNK_SIZE));
    }

    const existingSnap = await getDocs(chunksRef);
    const existingDocIds = new Set(existingSnap.docs.map((d) => d.id));

    const batch = writeBatch(firestore);
    const usedDocIds = new Set<string>();

    chunks.forEach((chunk, index) => {
      const chunkId = `chunk_${String(index).padStart(3, "0")}`;
      usedDocIds.add(chunkId);
      const chunkDocRef = doc(firestore, "organizations", orgId, "projects", projectId, "asset_chunks", chunkId);
      batch.set(chunkDocRef, {
        index,
        assets: chunk,
        count: chunk.length,
        updatedAt: new Date().toISOString(),
      });
    });

    // Delete stale chunks
    existingDocIds.forEach((oldId) => {
      if (!usedDocIds.has(oldId)) {
        batch.delete(doc(firestore, "organizations", orgId, "projects", projectId, "asset_chunks", oldId));
      }
    });

    await batch.commit();

    // Clear heavy assets array from main document to ensure it stays < 50KB
    await setDoc(
      projRef,
      {
        hasChunkedAssets: true,
        assetsCount: assets.length,
        assets: [],
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Firestore error saving project assets:", e);
  }
}

/**
 * Dynamically loads all SVG assets for a specific Project from Firestore.
 * Resolves both chunked sub-documents and legacy single-document assets.
 */
export async function loadProjectAssets(
  orgId: string,
  projectId: string
): Promise<ProjectAsset[]> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return [];
  const firestore = db;
  try {
    const chunksRef = collection(firestore, "organizations", orgId, "projects", projectId, "asset_chunks");
    const snap = await getDocs(chunksRef);

    if (!snap.empty) {
      const chunksData: Array<{ index: number; assets: ProjectAsset[] }> = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (Array.isArray(data.assets)) {
          chunksData.push({
            index: typeof data.index === "number" ? data.index : 0,
            assets: data.assets as ProjectAsset[],
          });
        }
      });

      chunksData.sort((a, b) => a.index - b.index);
      const combined: ProjectAsset[] = [];
      for (const chunk of chunksData) {
        combined.push(...chunk.assets);
      }
      return combined;
    }

    // Fallback: Check project document directly
    const projRef = doc(firestore, "organizations", orgId, "projects", projectId);
    const projSnap = await getDoc(projRef);
    if (projSnap.exists()) {
      const data = projSnap.data() as Project;
      return data.assets || [];
    }

    return [];
  } catch (e) {
    console.warn("Firestore error loading project assets:", e);
    return [];
  }
}

/**
 * Dynamically saves independent Git asset configuration for a specific Project in Firestore
 */
export async function saveProjectAssetGitConfig(
  orgId: string,
  projectId: string,
  assetGitConfig: AssetGitConfig | null
): Promise<void> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return;
  try {
    const projRef = doc(db, "organizations", orgId, "projects", projectId);
    await setDoc(
      projRef,
      {
        assetGitConfig: assetGitConfig || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Firestore error saving project asset git config:", e);
  }
}

/**
 * Dynamically saves Figma asset configuration for a specific Project in Firestore
 */
export async function saveProjectAssetFigmaConfig(
  orgId: string,
  projectId: string,
  assetFigmaConfig: AssetFigmaConfig | null
): Promise<void> {
  if (!orgId || !projectId || !isFirebaseConfigured || !db) return;
  try {
    const projRef = doc(db, "organizations", orgId, "projects", projectId);
    await setDoc(
      projRef,
      {
        assetFigmaConfig: assetFigmaConfig || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Firestore error saving project asset figma config:", e);
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
