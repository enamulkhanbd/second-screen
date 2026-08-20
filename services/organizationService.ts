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
import { Organization, Project, OrganizationMember } from "@/types/tenant";
import { RawTokensDocument, ThemeGroup, GitCredentials } from "@/types/tokens";
import { SAMPLE_TOKENS_DATA } from "@/data/sampleTokens";
import { extractThemeGroups } from "@/utils/themeHelpers";

const LOCAL_ORGS_KEY = "ts_local_organizations";
const LOCAL_PROJECTS_KEY = "ts_local_projects";
const DEFAULT_ORGS: Organization[] = [
  {
    id: "org_acme",
    name: "Acme Corp",
    slug: "acme-corp",
    ownerUid: "usr_default",
    members: [
      {
        uid: "usr_default",
        email: "designer@acme.com",
        displayName: "Lead Designer",
        role: "owner",
        joinedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "org_personal",
    name: "Personal Workspace",
    slug: "personal",
    ownerUid: "usr_default",
    members: [
      {
        uid: "usr_default",
        email: "me@tokens.studio",
        displayName: "Personal",
        role: "owner",
        joinedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_PROJECTS: Project[] = [
  {
    id: "proj_ds",
    orgId: "org_acme",
    name: "Design System",
    slug: "design-system",
    description: "Core design tokens and typography matrix",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "proj_mobile",
    orgId: "org_acme",
    name: "Mobile App",
    slug: "mobile-app",
    description: "iOS and Android application tokens",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "proj_beta",
    orgId: "org_personal",
    name: "Tokens Beta",
    slug: "tokens-beta",
    description: "Personal design tokens repository",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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

// -------------------------------------------------------------
// ORGANIZATION OPERATIONS
// -------------------------------------------------------------

/**
 * Fetches all organizations where the user is a member or owner
 */
export async function getUserOrganizations(uid: string): Promise<Organization[]> {
  if (!uid) return [];

  if (isFirebaseConfigured && db) {
    try {
      const orgsRef = collection(db, "organizations");
      // Query where members contains this user's UID
      const q = query(orgsRef);
      const snapshot = await getDocs(q);
      const orgs: Organization[] = [];

      snapshot.forEach((d) => {
        const data = d.data() as Organization;
        if (
          data.ownerUid === uid ||
          (Array.isArray(data.members) && data.members.some((m) => m.uid === uid))
        ) {
          orgs.push({ ...data, id: d.id });
        }
      });

      return orgs;
    } catch (e) {
      console.warn("Firestore error fetching orgs, using local fallback:", e);
    }
  }

  // Local fallback
  const local = getLocalOrgs();
  return local.filter(
    (o) => o.ownerUid === uid || o.members.some((m) => m.uid === uid)
  );
}

/**
 * Creates a new Organization
 */
export async function createOrganization(
  name: string,
  user: { uid: string; email: string; displayName?: string }
): Promise<Organization> {
  const orgId = `org_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const newOrg: Organization = {
    id: orgId,
    name,
    slug,
    ownerUid: user.uid,
    members: [
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
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
        const filtered = orgData.members.filter((m) => m.uid !== member.uid && m.email !== member.email);
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
    target.members = target.members.filter((m) => m.uid !== member.uid && m.email !== member.email);
    target.members.push(member);
    target.updatedAt = new Date().toISOString();
    saveLocalOrgs(local);
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
      const projRef = collection(db, "organizations", orgId, "projects");
      const snapshot = await getDocs(projRef);
      const projects: Project[] = [];

      snapshot.forEach((d) => {
        projects.push({ ...(d.data() as Project), id: d.id, orgId });
      });

      return projects;
    } catch (e) {
      console.warn("Firestore error fetching projects, using local fallback:", e);
    }
  }

  const local = getLocalProjects();
  return local.filter((p) => p.orgId === orgId);
}

/**
 * Creates a new Project under an Organization
 */
export async function createProject(
  orgId: string,
  name: string,
  description?: string,
  initialTokens?: RawTokensDocument,
  createdByName?: string
): Promise<Project> {
  const projId = `proj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const rawTokens = initialTokens || SAMPLE_TOKENS_DATA;
  const themeGroups = extractThemeGroups(rawTokens);

  const newProject: Project = {
    id: projId,
    orgId,
    name,
    slug,
    description: description || "",
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
      await updateDoc(projRef, {
        rawTokens,
        themeGroups: groups,
        updatedAt: new Date().toISOString(),
      });
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
