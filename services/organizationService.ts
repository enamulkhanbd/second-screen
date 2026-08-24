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
} from "firebase/firestore";
import {
  Organization,
  Project,
  OrganizationMember,
  OrganizationInvitation,
  UserRole,
} from "@/types/tenant";
import { RawTokensDocument, ThemeGroup, GitCredentials } from "@/types/tokens";
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

    // 1. Direct query where user is the owner
    try {
      const ownerQ = query(collection(db, "organizations"), where("ownerUid", "==", uid));
      const ownerSnap = await getDocs(ownerQ);
      ownerSnap.forEach((d) => {
        orgsMap.set(d.id, d.data() as Organization);
      });
    } catch (err) {
      console.warn("Firestore owner query error:", err);
    }

    // 2. Query all accessible orgs for membership
    try {
      const orgsRef = collection(db, "organizations");
      const snap = await getDocs(orgsRef);
      snap.forEach((d) => {
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
    } catch (err) {
      console.warn("Firestore membership scan error:", err);
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
  owner: { uid: string; email: string; displayName?: string }
): Promise<Organization> {
  const orgId = `org_${Date.now()}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");

  const newOrg: Organization = {
    id: orgId,
    name,
    slug,
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
    snap.forEach((d) => invs.push(d.data() as OrganizationInvitation));
    return invs;
  } catch (e) {
    console.warn("Firestore error getting org invitations:", e);
    return [];
  }
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
  if (!orgId || !isFirebaseConfigured || !db) return [];
  try {
    const projsRef = collection(db, "organizations", orgId, "projects");
    const snap = await getDocs(projsRef);
    const projs: Project[] = [];
    snap.forEach((docSnap) => projs.push(docSnap.data() as Project));
    return projs;
  } catch (e) {
    console.warn("Firestore error fetching projects:", e);
    return [];
  }
}

/**
 * Creates a new Project inside an Organization directly in Firestore
 */
export async function createProject(
  orgId: string,
  name: string,
  description?: string,
  initialTokens?: RawTokensDocument,
  createdByName?: string
): Promise<Project> {
  const projId = `proj_${Date.now()}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const rawTokens = initialTokens && Object.keys(initialTokens).length > 0 ? initialTokens : {};
  const themeGroups = extractThemeGroups(rawTokens);

  const newProject: Project = {
    id: projId,
    orgId,
    name,
    slug,
    description: description || "Design tokens project",
    rawTokens,
    themeGroups,
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

  return newProject;
}

/**
 * Deletes a Project from an Organization in Firestore
 */
export async function deleteProject(orgId: string, projectId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, "organizations", orgId, "projects", projectId));
  } catch (e) {
    console.warn("Firestore error deleting project:", e);
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

  try {
    const projRef = doc(db, "organizations", orgId, "projects", projectId);
    await setDoc(
      projRef,
      {
        rawTokens,
        themeGroups: groups,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Firestore error saving project tokens:", e);
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

