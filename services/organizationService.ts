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
  serverTimestamp,
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

const LOCAL_ORGS_KEY = "ts_local_organizations";
const LOCAL_PROJECTS_KEY = "ts_local_projects";
const LOCAL_INVITATIONS_KEY = "ts_local_invitations";

const DEFAULT_ORGS: Organization[] = [];

const DEFAULT_PROJECTS: Project[] = [];

/**
 * Reads local fallback organizations
 */
function getLocalOrgs(): Organization[] {
  if (typeof window === "undefined") return DEFAULT_ORGS;
  try {
    const raw = localStorage.getItem(LOCAL_ORGS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed && parsed.length > 0 ? parsed : DEFAULT_ORGS;
  } catch {
    return DEFAULT_ORGS;
  }
}

function saveLocalOrgs(orgs: Organization[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_ORGS_KEY, JSON.stringify(orgs));
  } catch {}
}

/**
 * Reads local fallback projects
 */
function getLocalProjects(): Project[] {
  if (typeof window === "undefined") return DEFAULT_PROJECTS;
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed && parsed.length > 0 ? parsed : DEFAULT_PROJECTS;
  } catch {
    return DEFAULT_PROJECTS;
  }
}

function saveLocalProjects(projects: Project[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
  } catch {}
}

/**
 * Reads local fallback invitations
 */
function getLocalInvitations(): OrganizationInvitation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_INVITATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalInvitations(invs: OrganizationInvitation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_INVITATIONS_KEY, JSON.stringify(invs));
  } catch {}
}

// -------------------------------------------------------------
// ORGANIZATION OPERATIONS
// -------------------------------------------------------------

/**
 * Fetches all organizations where the user is a member or owner
 */
export async function getUserOrganizations(uid: string, userEmail?: string): Promise<Organization[]> {
  if (!uid && !userEmail) return [];

  if (isFirebaseConfigured && db) {
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

      const firestoreOrgs = Array.from(orgsMap.values());
      if (firestoreOrgs.length > 0) return firestoreOrgs;
    } catch (e) {
      console.warn("Firestore error fetching orgs, using local fallback:", e);
    }
  }

  const local = getLocalOrgs();
  return local.filter(
    (o) =>
      o.ownerUid === uid ||
      o.members?.some((m) => m.uid === uid || (userEmail && m.email.toLowerCase() === userEmail.toLowerCase()))
  );
}

/**
 * Creates a new Organization and provisions default starter project
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
      console.warn("Firestore error creating org, using local fallback:", e);
    }
  }

  const local = getLocalOrgs();
  local.push(newOrg);
  saveLocalOrgs(local);

  return newOrg;
}

/**
 * Adds or updates a member in an Organization
 */
export async function updateOrgMember(
  orgId: string,
  member: OrganizationMember
): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const orgRef = doc(db, "organizations", orgId);
      const orgSnap = await getDoc(orgRef);
      if (orgSnap.exists()) {
        const orgData = orgSnap.data() as Organization;
        const filtered = orgData.members.filter((m) => m.uid !== member.uid && m.email.toLowerCase() !== member.email.toLowerCase());
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

  const local = getLocalOrgs();
  const target = local.find((o) => o.id === orgId);
  if (target) {
    target.members = target.members.filter((m) => m.uid !== member.uid && m.email.toLowerCase() !== member.email.toLowerCase());
    target.members.push(member);
    target.updatedAt = new Date().toISOString();
    saveLocalOrgs(local);
  }
}

/**
 * Removes a member from an Organization
 */
export async function removeOrgMember(
  orgId: string,
  memberEmailOrUid: string
): Promise<void> {
  if (isFirebaseConfigured && db) {
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

  const local = getLocalOrgs();
  const target = local.find((o) => o.id === orgId);
  if (target) {
    target.members = target.members.filter(
      (m) => m.uid !== memberEmailOrUid && m.email.toLowerCase() !== memberEmailOrUid.toLowerCase()
    );
    target.updatedAt = new Date().toISOString();
    saveLocalOrgs(local);
  }
}

// -------------------------------------------------------------
// INVITATION OPERATIONS
// -------------------------------------------------------------

/**
 * Generates a secure invitation for an email to join an organization with a designated role
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
      console.warn("Firestore error saving invitation, using local fallback:", e);
    }
  }

  const local = getLocalInvitations();
  local.push(newInvitation);
  saveLocalInvitations(local);

  return newInvitation;
}

/**
 * Gets all pending invitations for a specific organization
 */
export async function getOrganizationInvitations(orgId: string): Promise<OrganizationInvitation[]> {
  if (!orgId) return [];

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, "invitations"),
        where("orgId", "==", orgId)
      );
      const snap = await getDocs(q);
      const invs: OrganizationInvitation[] = [];
      snap.forEach((d) => invs.push(d.data() as OrganizationInvitation));
      if (invs.length > 0) return invs;
    } catch (e) {
      console.warn("Firestore error getting org invitations:", e);
    }
  }

  const local = getLocalInvitations();
  return local.filter((i) => i.orgId === orgId && i.status === "pending");
}

/**
 * Gets pending invitations for a user's email address (for auto-detection on login)
 */
export async function getPendingInvitationsForEmail(email: string): Promise<OrganizationInvitation[]> {
  if (!email) return [];
  const normalized = email.trim().toLowerCase();

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, "invitations"),
        where("inviteeEmail", "==", normalized),
        where("status", "==", "pending")
      );
      const snap = await getDocs(q);
      const invs: OrganizationInvitation[] = [];
      snap.forEach((d) => invs.push(d.data() as OrganizationInvitation));
      if (invs.length > 0) return invs;
    } catch (e) {
      console.warn("Firestore error getting email invitations:", e);
    }
  }

  const local = getLocalInvitations();
  return local.filter((i) => i.inviteeEmail.toLowerCase() === normalized && i.status === "pending");
}

/**
 * Looks up an invitation by its unique token
 */
export async function getInvitationByToken(token: string): Promise<OrganizationInvitation | null> {
  if (!token) return null;

  if (isFirebaseConfigured && db) {
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
  }

  const local = getLocalInvitations();
  return local.find((i) => i.token === token) || null;
}

/**
 * Accepts an invitation: updates the status to accepted and adds the user to the organization
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

  const localInvs = getLocalInvitations();
  const targetInv = localInvs.find((i) => i.id === inv.id || i.token === token);
  if (targetInv) {
    targetInv.status = "accepted";
    saveLocalInvitations(localInvs);
  }

  // 3. Return updated organization
  const localOrgs = getLocalOrgs();
  return localOrgs.find((o) => o.id === inv.orgId) || null;
}

/**
 * Revokes a pending invitation
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, "invitations", invitationId), {
        status: "revoked",
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Firestore error revoking invitation:", e);
    }
  }

  const localInvs = getLocalInvitations();
  const target = localInvs.find((i) => i.id === invitationId);
  if (target) {
    target.status = "revoked";
    saveLocalInvitations(localInvs);
  }
}

// -------------------------------------------------------------
// PROJECT OPERATIONS
// -------------------------------------------------------------

/**
 * Fetches all projects under an Organization
 */
export async function getOrgProjects(orgId: string): Promise<Project[]> {
  if (!orgId) return [];

  if (isFirebaseConfigured && db) {
    try {
      const projsRef = collection(db, "organizations", orgId, "projects");
      const snap = await getDocs(projsRef);
      const projs: Project[] = [];
      snap.forEach((doc) => projs.push(doc.data() as Project));
      if (projs.length > 0) return projs;
    } catch (e) {
      console.warn("Firestore error fetching projects, using local fallback:", e);
    }
  }

  const local = getLocalProjects();
  return local.filter((p) => p.orgId === orgId);
}

/**
 * Creates a new Project inside an Organization
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
  const rawTokens = initialTokens && Object.keys(initialTokens).length > 0 ? initialTokens : { global: {} };
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
      console.warn("Firestore error creating project, using local fallback:", e);
    }
  }

  const local = getLocalProjects();
  local.push(newProject);
  saveLocalProjects(local);

  return newProject;
}

/**
 * Saves updated design tokens & themes for a specific Project
 */
export async function saveProjectTokens(
  orgId: string,
  projectId: string,
  rawTokens: RawTokensDocument,
  themeGroups?: ThemeGroup[]
): Promise<void> {
  const groups = themeGroups || extractThemeGroups(rawTokens);

  if (isFirebaseConfigured && db) {
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

  const local = getLocalProjects();
  const proj = local.find((p) => p.id === projectId);
  if (proj) {
    proj.rawTokens = rawTokens;
    proj.themeGroups = groups;
    proj.updatedAt = new Date().toISOString();
    saveLocalProjects(local);
  }
}

/**
 * Saves Git configuration for a specific Project
 */
export async function saveProjectGitConfig(
  orgId: string,
  projectId: string,
  gitConfig: GitCredentials
): Promise<void> {
  if (isFirebaseConfigured && db) {
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

  const local = getLocalProjects();
  const proj = local.find((p) => p.id === projectId);
  if (proj) {
    proj.gitConfig = gitConfig;
    proj.updatedAt = new Date().toISOString();
    saveLocalProjects(local);
  }
}
