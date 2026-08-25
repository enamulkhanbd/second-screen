import { create } from "zustand";
import {
  GitCredentials,
  RawTokensDocument,
  FlattenedToken,
  SyncStatus,
  ToastMessage,
  SyncMeta,
  ThemeGroup,
  UserProfile,
  DistributionTarget,
  TargetPublishResult,
  ReleasePackage,
  CompilerConfig,
  DEFAULT_COMPILER_CONFIG,
} from "@/types/tokens";
import {
  flattenAndResolveTokens,
  setTokenAtKeyPath,
  createTokenAtKeyPath,
  deleteTokenAtKeyPath,
  createEmptyTokenSet,
  deleteTokenSet,
} from "@/utils/transformTokens";
import {
  compileCssVariables,
  compileStyleDictionary,
} from "@/utils/releaseCompiler";
import { extractThemeGroups } from "@/utils/themeHelpers";
import {
  Organization,
  Project,
  OrganizationMember,
  OrganizationInvitation,
  UserRole,
  ROLE_DEFINITIONS,
  ProjectAsset,
  AssetGitConfig,
} from "@/types/tenant";
import {
  getUserOrganizations,
  getOrgProjects,
  createOrganization,
  createProject,
  saveProjectTokens,
  saveProjectGitConfig,
  saveProjectFigmaVariables,
  saveProjectAssets,
  saveProjectAssetGitConfig,
  createOrganizationInvitation,
  getOrganizationInvitations,
  getPendingInvitationsForEmail,
  getInvitationByToken,
  acceptOrganizationInvitation,
  revokeInvitation,
  resendOrganizationInvitation,
  removeOrgMember,
  deleteOrganization,
  deleteProject,
  updateOrganization,
  updateProject,
} from "@/services/organizationService";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface TokenStoreState {
  // Multi-Tenant Identity & Scope
  currentUser: { uid: string; email: string; displayName?: string; avatarUrl?: string } | null;
  isLoadingTenant: boolean;
  userOrgs: Organization[];
  currentOrg: Organization | null;
  orgProjects: Project[];
  currentProject: Project | null;
  pendingInvitations: OrganizationInvitation[];
  pendingInvitePrompt: OrganizationInvitation | null;
  activeInviteToken: string | null;

  setCurrentUser: (user: { uid: string; email: string; displayName?: string; avatarUrl?: string } | null) => void;
  setCurrentOrg: (org: Organization | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setActiveInviteToken: (token: string | null) => void;
  setPendingInvitePrompt: (inv: OrganizationInvitation | null) => void;
  loadTenantData: (uid: string, email?: string) => Promise<void>;
  createOrgAction: (name: string, icon?: string, color?: string, logoUrl?: string) => Promise<Organization | null>;
  updateOrgAction: (orgId: string, updates: { name: string; icon?: string; color?: string; logoUrl?: string }) => Promise<Organization | null>;
  deleteOrgAction: (orgId: string) => Promise<void>;
  createProjectAction: (name: string, description?: string, icon?: string, color?: string, logoUrl?: string) => Promise<Project | null>;
  updateProjectAction: (orgId: string, projectId: string, updates: { name: string; description?: string; icon?: string; color?: string; logoUrl?: string }) => Promise<Project | null>;
  deleteProjectAction: (orgId: string, projectId: string) => Promise<void>;
  loadInvitations: (orgId: string) => Promise<void>;
  sendInvitationAction: (email: string, role: UserRole) => Promise<OrganizationInvitation | null>;
  acceptInvitationAction: (token: string) => Promise<boolean>;
  resendInvitationAction: (id: string) => Promise<OrganizationInvitation | null>;
  revokeInvitationAction: (id: string) => Promise<void>;
  removeMemberAction: (memberEmailOrUid: string) => Promise<void>;
  getCurrentUserRole: () => UserRole;
  canUserEdit: () => boolean;

  // Git Credentials
  credentials: GitCredentials;
  setCredentials: (creds: Partial<GitCredentials>, rememberPat?: boolean) => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;

  // Dual State
  rawTokens: RawTokensDocument;
  resolvedTokens: FlattenedToken[];
  isDirty: boolean;
  lastFetchedSha: string | null;
  hasRemoteChanges: boolean;
  setHasRemoteChanges: (has: boolean) => void;
  checkRemoteUpdates: () => Promise<boolean>;

  // Figma Variables State
  figmaVariables: RawTokensDocument | null;
  figmaResolvedVariables: FlattenedToken[];
  figmaUpdatedAt: string | null;
  figmaMeta: Record<string, any> | null;
  setFigmaVariables: (vars: RawTokensDocument | null, meta?: Record<string, any>) => void;
  desyncFigmaVariablesAction: () => Promise<void>;
  deleteFigmaVariableAction: (setName: string, tokenPath: string[]) => Promise<void>;
  deleteFigmaCollectionAction: (setName: string) => Promise<void>;

  // Assets & SVG Icons State (Independent Sync)
  assets: ProjectAsset[];
  assetGitConfig: AssetGitConfig | null;
  isSyncingAssets: boolean;
  setAssets: (assets: ProjectAsset[]) => void;
  uploadAssets: (newAssets: Array<{ name: string; title?: string; type?: string; tag?: string; category?: string; svg: string }>) => Promise<void>;
  applyMetadataToAssets: (metadataMap: Map<string, { name?: string; title?: string; type?: string; tag?: string; category?: string }>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<ProjectAsset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  deleteAssets: (ids: string[]) => Promise<void>;
  setAssetGitConfig: (config: AssetGitConfig | null) => Promise<void>;
  syncAssetsFromGit: () => Promise<boolean>;

  // Theme Groups Architecture
  themeGroups: ThemeGroup[];
  activeThemeGroupId: string;
  activeThemeOptionId: string;
  setActiveThemeGroup: (groupId: string) => void;
  setActiveThemeOption: (optionId: string) => void;

  // Theme Mode (light/dark)
  themeMode: "light" | "dark";
  setThemeMode: (mode: "light" | "dark") => void;

  // Sidebar Tab
  sidebarTab:
    | "dashboard"
    | "variables"
    | "tokens"
    | "themes"
    | "documentation"
    | "assets"
    | "exports"
    | "releases"
    | "activity"
    | "integrations"
    | "mcp"
    | "project-settings"
    | "members"
    | "org-settings";
  setSidebarTab: (
    tab:
      | "dashboard"
      | "variables"
      | "tokens"
      | "themes"
      | "documentation"
      | "assets"
      | "exports"
      | "releases"
      | "activity"
      | "integrations"
      | "mcp"
      | "project-settings"
      | "members"
      | "org-settings"
  ) => void;

  // Releases, Compilers & Distribution Targets
  releases: ReleasePackage[];
  activeReleaseId: string | null;
  distributionTargets: DistributionTarget[];
  compilerConfig: CompilerConfig;
  createRelease: (pkg: ReleasePackage) => void;
  deleteRelease: (id: string) => void;
  setActiveReleaseId: (id: string | null) => void;
  addDistributionTarget: (target: DistributionTarget) => void;
  updateDistributionTarget: (id: string, target: Partial<DistributionTarget>) => void;
  deleteDistributionTarget: (id: string) => void;
  updateCompilerConfig: (config: Partial<CompilerConfig>) => void;
  publishReleaseToTargets: (releaseId: string, targetIds?: string[]) => Promise<TargetPublishResult[]>;

  // View Mode & Filters
  viewMode: "matrix" | "flow";
  setViewMode: (mode: "matrix" | "flow") => void;
  tokensViewMode: "preview" | "json";
  setTokensViewMode: (mode: "preview" | "json") => void;
  activeSet: string;
  activeGroup: string;
  searchQuery: string;
  highlightedTokenKey: string | null;
  setHighlightedTokenKey: (key: string | null) => void;
  focusTokenInMatrix: (tokenKey: string) => void;

  // Status & Notifications
  syncStatus: SyncStatus;
  syncError: string | null;
  syncMeta: SyncMeta | null;
  toasts: ToastMessage[];

  // Actions
  initializeFromStorage: () => void;
  fetchLiveTokens: (customCreds?: GitCredentials) => Promise<boolean>;
  setRawTokens: (doc: RawTokensDocument, meta?: SyncMeta) => void;
  setSyncMeta: (meta: SyncMeta | null) => void;
  setResolvedTokens: (tokens: FlattenedToken[]) => void;
  updateSingleToken: (path: string[], newValue: string) => void;
  updateSetJson: (setName: string, newJsonContent: any) => void;
  setActiveSet: (setName: string) => void;
  setActiveGroup: (group: string) => void;
  setSearchQuery: (query: string) => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  clearCredentials: () => void;
  addToast: (toast: Omit<ToastMessage, "id" | "timestamp">) => void;
  removeToast: (id: string) => void;
  resetDirtyState: () => void;
  addThemeOption: (params: {
    groupId: string;
    name: string;
    color?: string;
    selectedTokenSets: Record<string, "enabled" | "disabled" | "source">;
    cloneFromOptionId?: string;
    newSetName?: string;
  }) => void;
  updateThemeGroup: (groupId: string, newName: string, newColor?: string) => void;
  duplicateThemeGroup: (groupId: string) => void;
  deleteThemeGroup: (groupId: string) => void;
  addNewToken: (
    setName: string,
    tokenPath: string[],
    tokenData: { value: any; type: string; description?: string }
  ) => void;
  deleteToken: (setName: string, tokenPath: string[]) => void;
  duplicateToken: (setName: string, tokenPath: string[], newName: string) => void;
  addNewSet: (setName: string) => void;
  deleteSet: (setName: string) => void;
  initializeBlankWorkspace: () => void;
}

const DEFAULT_CREDENTIALS: GitCredentials = {
  provider: "azure",
  owner: "",
  project: "",
  repo: "",
  branch: "",
  path: "",
  pat: "",
};

export const useTokenStore = create<TokenStoreState>((set, get) => {
  const persistTokensChange = (doc: RawTokensDocument, groups?: ThemeGroup[]) => {
    const { currentOrg, currentProject } = get();
    if (currentOrg && currentProject) {
      saveProjectTokens(currentOrg.id, currentProject.id, doc, groups).catch(() => {});
    }
  };

  return {
  currentUser: null,
  isLoadingTenant: true,
  userOrgs: [],
  currentOrg: null,
  orgProjects: [],
  currentProject: null,
  pendingInvitations: [],
  pendingInvitePrompt: null,
  activeInviteToken: null,

  setActiveInviteToken: (token) => set({ activeInviteToken: token }),
  setPendingInvitePrompt: (inv) => set({ pendingInvitePrompt: inv }),

  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user?.uid) {
      get().loadTenantData(user.uid, user.email);
      if (user.email) {
        getPendingInvitationsForEmail(user.email).then((invs) => {
          if (invs.length > 0) {
            set({ pendingInvitePrompt: invs[0] });
          }
        });
      }
    } else {
      // Complete state sanitization on logout
      set({
        userOrgs: [],
        currentOrg: null,
        orgProjects: [],
        currentProject: null,
        pendingInvitations: [],
        pendingInvitePrompt: null,
        rawTokens: {},
        resolvedTokens: [],
        figmaVariables: null,
        figmaResolvedVariables: [],
        credentials: DEFAULT_CREDENTIALS,
      });
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("ts_tokens_platform_pat");
          localStorage.removeItem("ts_tokens_platform_pat_enc");
          localStorage.removeItem("ts_active_org_id");
          localStorage.removeItem("ts_active_project_id");
        } catch {}
      }
    }
  },

  getCurrentUserRole: () => {
    const { currentOrg, currentUser } = get();
    if (!currentOrg || !currentUser) return "viewer";
    if (currentOrg.ownerUid === currentUser.uid) return "owner";
    const member = currentOrg.members?.find(
      (m) => m.uid === currentUser.uid || (currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    return member?.role || "viewer";
  },

  canUserEdit: () => {
    const role = get().getCurrentUserRole();
    return role !== "viewer";
  },

  setCurrentOrg: async (org) => {
    set({ currentOrg: org });
    if (org) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_active_org_id", org.id);
        } catch {}
      }
      const projects = await getOrgProjects(org.id);
      set({ orgProjects: projects });
      if (projects.length > 0) {
        get().setCurrentProject(projects[0]);
      } else {
        set({ currentProject: null });
      }
      get().loadInvitations(org.id);
    }
  },

  setCurrentProject: (proj) => {
    set({ currentProject: proj });

    if (proj) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_active_project_id", proj.id);
        } catch {}
      }

      // 1. Git Connection & Token Dictionary
      if (proj.gitConfig && proj.gitConfig.repo) {
        set({ credentials: { ...DEFAULT_CREDENTIALS, ...proj.gitConfig } });
        if (proj.rawTokens && Object.keys(proj.rawTokens).length > 0) {
          get().setRawTokens(proj.rawTokens);
        } else {
          set({
            rawTokens: {},
            resolvedTokens: [],
            themeGroups: proj.themeGroups || [],
            activeThemeGroupId: proj.themeGroups?.[0]?.id || "",
            activeThemeOptionId: proj.themeGroups?.[0]?.options?.[0]?.id || "",
            syncMeta: null,
          });
        }
      } else {
        set({
          credentials: DEFAULT_CREDENTIALS,
          rawTokens: proj.rawTokens || {},
          resolvedTokens: proj.rawTokens && Object.keys(proj.rawTokens).length > 0
            ? flattenAndResolveTokens(proj.rawTokens, "ALL")
            : [],
          themeGroups: proj.themeGroups || [],
          activeThemeGroupId: proj.themeGroups?.[0]?.id || "",
          activeThemeOptionId: proj.themeGroups?.[0]?.options?.[0]?.id || "",
          syncMeta: null,
        });
      }

      // 2. Figma Variables
      if (proj.figmaVariables && Object.keys(proj.figmaVariables).length > 0) {
        const resolvedFigma = flattenAndResolveTokens(proj.figmaVariables, "ALL");
        set({
          figmaVariables: proj.figmaVariables,
          figmaResolvedVariables: resolvedFigma,
          figmaUpdatedAt: proj.figmaUpdatedAt || null,
          figmaMeta: proj.figmaMeta || null,
        });
      } else {
        set({
          figmaVariables: null,
          figmaResolvedVariables: [],
          figmaUpdatedAt: null,
          figmaMeta: null,
        });
      }

      if (proj.themeGroups && proj.themeGroups.length > 0) {
        set({
          themeGroups: proj.themeGroups,
          activeThemeGroupId: proj.themeGroups[0].id,
          activeThemeOptionId: proj.themeGroups[0].options[0]?.id || "",
        });
      }

      // 3. Independent Assets & SVG Icons
      set({
        assets: proj.assets || [],
        assetGitConfig: proj.assetGitConfig || null,
        isSyncingAssets: false,
      });
    }
  },

  loadTenantData: async (uid, email) => {
    set({ isLoadingTenant: true });
    try {
      const orgs = await getUserOrganizations(uid, email);
      set({ userOrgs: orgs });

      let activeOrg = orgs[0] || null;
      const savedOrgId = typeof window !== "undefined" ? localStorage.getItem("ts_active_org_id") : null;
      if (savedOrgId) {
        const found = orgs.find((o) => o.id === savedOrgId);
        if (found) activeOrg = found;
      }

      set({ currentOrg: activeOrg });

      if (activeOrg) {
        const projects = await getOrgProjects(activeOrg.id);
        set({ orgProjects: projects });

        let activeProj = projects[0] || null;
        const savedProjId = typeof window !== "undefined" ? localStorage.getItem("ts_active_project_id") : null;
        if (savedProjId) {
          const found = projects.find((p) => p.id === savedProjId);
          if (found) activeProj = found;
        }

        if (activeProj) {
          get().setCurrentProject(activeProj);
          if (
            activeProj.gitConfig?.provider &&
            activeProj.gitConfig?.owner &&
            activeProj.gitConfig?.repo &&
            activeProj.gitConfig?.branch &&
            activeProj.gitConfig?.pat
          ) {
            get().fetchLiveTokens(activeProj.gitConfig);
          }
        }
        get().loadInvitations(activeOrg.id);
      }
    } catch (e) {
      console.warn("Error loading tenant data:", e);
    } finally {
      set({ isLoadingTenant: false });
    }
  },

  loadInvitations: async (orgId) => {
    try {
      const invs = await getOrganizationInvitations(orgId);
      const { currentOrg } = get();
      const memberEmails = new Set(
        (currentOrg?.members || []).map((m) => m.email.toLowerCase())
      );
      // Filter out any invitation where invitee is already an active member or not pending
      const pendingOnly = invs.filter(
        (i) => i.status === "pending" && !memberEmails.has(i.inviteeEmail.toLowerCase())
      );
      set({ pendingInvitations: pendingOnly });
    } catch (e) {
      console.warn("Error loading invitations:", e);
    }
  },

  sendInvitationAction: async (email, role) => {
    const { currentOrg, currentUser } = get();
    if (!currentOrg || !currentUser) return null;

    try {
      const inv = await createOrganizationInvitation(
        currentOrg.id,
        currentOrg.name,
        {
          uid: currentUser.uid,
          name: currentUser.displayName,
          email: currentUser.email,
        },
        email,
        role
      );

      set((state) => ({
        pendingInvitations: [inv, ...state.pendingInvitations.filter((i) => i.id !== inv.id)],
      }));

      return inv;
    } catch (e) {
      console.warn("Error sending invitation:", e);
      return null;
    }
  },

  acceptInvitationAction: async (token) => {
    const { currentUser } = get();
    if (!currentUser) return false;

    try {
      const updatedOrg = await acceptOrganizationInvitation(token, {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
      });

      if (updatedOrg) {
        const allOrgs = await getUserOrganizations(currentUser.uid, currentUser.email);
        set((state) => ({
          userOrgs: allOrgs,
          pendingInvitePrompt: null,
          activeInviteToken: null,
          pendingInvitations: state.pendingInvitations.filter(
            (i) => i.token !== token && i.inviteeEmail.toLowerCase() !== currentUser.email.toLowerCase()
          ),
        }));
        get().setCurrentOrg(updatedOrg);
        return true;
      }
      return false;
    } catch (e: any) {
      console.warn("Error accepting invitation:", e);
      throw e;
    }
  },

  resendInvitationAction: async (id) => {
    try {
      const updated = await resendOrganizationInvitation(id);
      if (updated) {
        set((state) => ({
          pendingInvitations: state.pendingInvitations.map((i) =>
            i.id === id ? updated : i
          ),
        }));
        return updated;
      }
    } catch (e) {
      console.warn("Error resending invitation:", e);
    }
    return null;
  },

  revokeInvitationAction: async (id) => {
    try {
      await revokeInvitation(id);
      set((state) => ({
        pendingInvitations: state.pendingInvitations.filter((i) => i.id !== id),
      }));
    } catch (e) {
      console.warn("Error revoking invitation:", e);
    }
  },

  removeMemberAction: async (memberEmailOrUid) => {
    const { currentOrg } = get();
    if (!currentOrg) return;

    try {
      await removeOrgMember(currentOrg.id, memberEmailOrUid);
      const updatedMembers = (currentOrg.members || []).filter(
        (m) => m.uid !== memberEmailOrUid && m.email.toLowerCase() !== memberEmailOrUid.toLowerCase()
      );
      const updatedOrg = { ...currentOrg, members: updatedMembers };
      set((state) => ({
        currentOrg: updatedOrg,
        userOrgs: state.userOrgs.map((o) => (o.id === updatedOrg.id ? updatedOrg : o)),
      }));
    } catch (e) {
      console.warn("Error removing member:", e);
    }
  },

  createOrgAction: async (name, icon, color, logoUrl) => {
    const { currentUser } = get();
    if (!currentUser) return null;
    try {
      const newOrg = await createOrganization(
        name,
        {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
        },
        icon,
        color,
        logoUrl
      );
      const orgs = [...get().userOrgs, newOrg];
      set({ userOrgs: orgs });
      get().setCurrentOrg(newOrg);
      return newOrg;
    } catch (e) {
      console.warn("Failed creating org:", e);
      return null;
    }
  },

  updateOrgAction: async (orgId, updates) => {
    try {
      const slug = updates.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const orgUpdates = {
        name: updates.name,
        slug,
        ...(updates.icon ? { icon: updates.icon } : {}),
        ...(updates.color ? { color: updates.color } : {}),
        ...(updates.logoUrl !== undefined ? { logoUrl: updates.logoUrl } : {}),
      };
      await updateOrganization(orgId, orgUpdates);
      const updatedOrgs = get().userOrgs.map((o) =>
        o.id === orgId ? { ...o, ...orgUpdates, updatedAt: new Date().toISOString() } : o
      );
      set({ userOrgs: updatedOrgs });
      if (get().currentOrg?.id === orgId) {
        set({ currentOrg: { ...get().currentOrg!, ...orgUpdates, updatedAt: new Date().toISOString() } });
      }
      return get().currentOrg;
    } catch (e) {
      console.warn("Failed updating org:", e);
      throw e;
    }
  },

  deleteOrgAction: async (orgId) => {
    try {
      await deleteOrganization(orgId);
      const remaining = get().userOrgs.filter((o) => o.id !== orgId);
      set({ userOrgs: remaining });
      if (get().currentOrg?.id === orgId) {
        const nextOrg = remaining[0] || null;
        get().setCurrentOrg(nextOrg);
      }
    } catch (e) {
      console.warn("Failed deleting org:", e);
      throw e;
    }
  },

  createProjectAction: async (name, description, icon, color, logoUrl) => {
    const { currentOrg, currentUser } = get();
    if (!currentOrg) return null;
    try {
      const newProj = await createProject(
        currentOrg.id,
        name,
        description,
        get().rawTokens,
        currentUser?.displayName,
        icon,
        color,
        logoUrl
      );
      const projs = [...get().orgProjects, newProj];
      set({ orgProjects: projs });
      get().setCurrentProject(newProj);
      return newProj;
    } catch (e) {
      console.warn("Failed creating project:", e);
      return null;
    }
  },

  updateProjectAction: async (orgId, projectId, updates) => {
    try {
      const slug = updates.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const projectUpdates = {
        name: updates.name,
        description: updates.description || "",
        slug,
        ...(updates.icon ? { icon: updates.icon } : {}),
        ...(updates.color ? { color: updates.color } : {}),
        ...(updates.logoUrl !== undefined ? { logoUrl: updates.logoUrl } : {}),
      };
      await updateProject(orgId, projectId, projectUpdates);
      const updatedProjects = get().orgProjects.map((p) =>
        p.id === projectId ? { ...p, ...projectUpdates, updatedAt: new Date().toISOString() } : p
      );
      set({ orgProjects: updatedProjects });
      if (get().currentProject?.id === projectId) {
        set({ currentProject: { ...get().currentProject!, ...projectUpdates, updatedAt: new Date().toISOString() } });
      }
      return get().currentProject;
    } catch (e) {
      console.warn("Failed updating project:", e);
      throw e;
    }
  },

  deleteProjectAction: async (orgId, projectId) => {
    try {
      await deleteProject(orgId, projectId);
      const remaining = get().orgProjects.filter((p) => p.id !== projectId);
      set({ orgProjects: remaining });
      if (get().currentProject?.id === projectId) {
        get().setCurrentProject(remaining[0] || null);
      }
    } catch (e) {
      console.warn("Failed deleting project:", e);
      throw e;
    }
  },

  credentials: DEFAULT_CREDENTIALS,
  userProfile: null,
  setUserProfile: (profile) => {
    set({ userProfile: profile });
    if (typeof window !== "undefined" && profile) {
      try {
        localStorage.setItem("ts_second_screen_user", JSON.stringify(profile));
      } catch { }
    }
  },

  setCredentials: (newCreds, rememberPat = true) =>
    set((state) => {
      const updated = { ...state.credentials, ...newCreds };
      if (typeof window !== "undefined") {
        try {
          const { pat, ...safeCreds } = updated;
          localStorage.setItem("ts_tokens_platform_creds", JSON.stringify(safeCreds));

          // Save PAT in sessionStorage (secure tab lifecycle) and localStorage if requested
          if (updated.pat) {
            sessionStorage.setItem("ts_tokens_platform_pat", updated.pat);
            if (rememberPat) {
              localStorage.setItem("ts_tokens_platform_pat_enc", updated.pat);
            }
          }
        } catch {
          // Storage error
        }
      }
      return { credentials: updated };
    }),

  clearCredentials: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("ts_tokens_platform_creds");
        localStorage.removeItem("ts_tokens_platform_pat_enc");
        sessionStorage.removeItem("ts_tokens_platform_pat");
        localStorage.removeItem("ts_second_screen_creds");
        localStorage.removeItem("ts_second_screen_pat_enc");
        sessionStorage.removeItem("ts_second_screen_pat");
      } catch { }
    }
    set({
      credentials: DEFAULT_CREDENTIALS,
      rawTokens: {},
      resolvedTokens: [],
      themeGroups: [],
      activeThemeGroupId: "",
      activeThemeOptionId: "",
      syncMeta: null,
      syncStatus: "idle",
      syncError: null,
      isDirty: false,
    });
  },

  rawTokens: {},
  resolvedTokens: [],
  isDirty: false,

  figmaVariables: null,
  figmaResolvedVariables: [],
  figmaUpdatedAt: null,
  figmaMeta: null,

  setFigmaVariables: (vars, meta) => {
    const resolved = vars && Object.keys(vars).length > 0 ? flattenAndResolveTokens(vars, "ALL") : [];
    set({
      figmaVariables: vars,
      figmaResolvedVariables: resolved,
      figmaUpdatedAt: vars && Object.keys(vars).length > 0 ? new Date().toISOString() : null,
      figmaMeta: meta || null,
    });
    const { currentOrg, currentProject } = get();
    if (currentOrg && currentProject) {
      saveProjectFigmaVariables(currentOrg.id, currentProject.id, vars, meta).catch(() => {});
    }
  },

  desyncFigmaVariablesAction: async () => {
    const { currentOrg, currentProject, addToast } = get();
    set({
      figmaVariables: null,
      figmaResolvedVariables: [],
      figmaUpdatedAt: null,
      figmaMeta: null,
    });
    if (currentOrg && currentProject) {
      await saveProjectFigmaVariables(currentOrg.id, currentProject.id, null);
    }
    addToast({
      type: "info",
      title: "Figma Variables De-synced",
      message: "Disconnected Figma variables. You can re-sync anytime from Figma.",
    });
  },

  deleteFigmaVariableAction: async (setName: string, tokenPath: string[]) => {
    const { figmaVariables, currentOrg, currentProject, addToast } = get();
    if (!figmaVariables) return;
    const cloned = JSON.parse(JSON.stringify(figmaVariables));
    const targetSet = cloned[setName];
    if (targetSet) {
      const updatedSet = deleteTokenAtKeyPath(targetSet, tokenPath);
      if (Object.keys(updatedSet).length === 0) {
        delete cloned[setName];
      } else {
        cloned[setName] = updatedSet;
      }
    }
    const resolved = Object.keys(cloned).length > 0 ? flattenAndResolveTokens(cloned, "ALL") : [];
    set({
      figmaVariables: Object.keys(cloned).length > 0 ? cloned : null,
      figmaResolvedVariables: resolved,
      figmaUpdatedAt: Object.keys(cloned).length > 0 ? new Date().toISOString() : null,
    });
    if (currentOrg && currentProject) {
      await saveProjectFigmaVariables(currentOrg.id, currentProject.id, Object.keys(cloned).length > 0 ? cloned : null);
    }
    addToast({
      type: "success",
      title: "Variable Deleted",
      message: `Deleted variable ${tokenPath.join(".")}.`,
    });
  },

  deleteFigmaCollectionAction: async (setName: string) => {
    const { figmaVariables, currentOrg, currentProject, addToast } = get();
    if (!figmaVariables) return;
    const cloned = JSON.parse(JSON.stringify(figmaVariables));
    delete cloned[setName];
    const resolved = Object.keys(cloned).length > 0 ? flattenAndResolveTokens(cloned, "ALL") : [];
    set({
      figmaVariables: Object.keys(cloned).length > 0 ? cloned : null,
      figmaResolvedVariables: resolved,
      figmaUpdatedAt: Object.keys(cloned).length > 0 ? new Date().toISOString() : null,
    });
    if (currentOrg && currentProject) {
      await saveProjectFigmaVariables(currentOrg.id, currentProject.id, Object.keys(cloned).length > 0 ? cloned : null);
    }
    addToast({
      type: "success",
      title: "Collection Deleted",
      message: `Deleted Figma collection "${setName}".`,
    });
  },

  // Assets & SVG Icons Implementation (Independent Sync)
  assets: [],
  assetGitConfig: null,
  isSyncingAssets: false,

  setAssets: (assets) => set({ assets }),

  uploadAssets: async (newAssets) => {
    const { currentOrg, currentProject, assets, addToast } = get();
    const now = new Date().toISOString();
    const created: ProjectAsset[] = newAssets.map((a) => ({
      id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: a.name,
      title: a.title || a.name,
      type: a.type || undefined,
      tag: a.tag || undefined,
      category: a.category || "general",
      svg: a.svg,
      updatedAt: now,
      source: "upload",
    }));
    const updated = [...created, ...assets];
    set({ assets: updated });
    if (currentOrg && currentProject) {
      await saveProjectAssets(currentOrg.id, currentProject.id, updated);
    }
    addToast({
      type: "success",
      title: "Assets Uploaded",
      message: `Added ${created.length} SVG vector asset${created.length > 1 ? "s" : ""}.`,
    });
  },

  applyMetadataToAssets: async (metadataMap) => {
    const { currentOrg, currentProject, assets, addToast } = get();
    let updatedCount = 0;
    const normalize = (s: string) => s.toLowerCase().replace(/^icon[-_]?/i, "").replace(/[^a-z0-9]/g, "");

    const updated = assets.map((asset) => {
      const stem = asset.name;
      const typeKey = (asset.type || "").toLowerCase();
      const matched =
        (typeKey ? metadataMap.get(`${normalize(typeKey)}::${normalize(stem)}`) : undefined) ||
        metadataMap.get(normalize(stem)) ||
        metadataMap.get(stem.toLowerCase()) ||
        metadataMap.get(normalize(asset.title || ""));

      if (matched) {
        updatedCount++;
        return {
          ...asset,
          title: matched.title || asset.title || asset.name,
          type: matched.type || asset.type,
          category: matched.category || asset.category,
          tag: matched.tag || asset.tag,
          name: matched.name || asset.name,
          updatedAt: new Date().toISOString(),
        };
      }
      return asset;
    });

    if (updatedCount > 0) {
      set({ assets: updated });
      if (currentOrg && currentProject) {
        await saveProjectAssets(currentOrg.id, currentProject.id, updated);
      }
      addToast({
        type: "success",
        title: "Metadata Applied",
        message: `Updated metadata for ${updatedCount} icon${updatedCount > 1 ? "s" : ""}.`,
      });
    }
  },

  updateAsset: async (id, updates) => {
    const { currentOrg, currentProject, assets, addToast } = get();
    const updated = assets.map((a) =>
      a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
    );
    set({ assets: updated });
    if (currentOrg && currentProject) {
      await saveProjectAssets(currentOrg.id, currentProject.id, updated);
    }
    addToast({
      type: "success",
      title: "Asset Updated",
      message: "Saved changes to icon.",
    });
  },

  deleteAsset: async (id) => {
    const { currentOrg, currentProject, assets, addToast } = get();
    const updated = assets.filter((a) => a.id !== id);
    set({ assets: updated });
    if (currentOrg && currentProject) {
      await saveProjectAssets(currentOrg.id, currentProject.id, updated);
    }
    addToast({
      type: "info",
      title: "Asset Deleted",
      message: "Icon removed from project assets.",
    });
  },

  deleteAssets: async (ids: string[]) => {
    const { currentOrg, currentProject, assets, addToast } = get();
    const idSet = new Set(ids);
    const updated = assets.filter((a) => !idSet.has(a.id));
    set({ assets: updated });
    if (currentOrg && currentProject) {
      await saveProjectAssets(currentOrg.id, currentProject.id, updated);
    }
    addToast({
      type: "info",
      title: "Assets Removed",
      message: `Deleted ${ids.length} icon${ids.length > 1 ? "s" : ""} from project assets.`,
    });
  },

  setAssetGitConfig: async (config) => {
    const { currentOrg, currentProject, addToast } = get();
    set({ assetGitConfig: config });
    if (currentOrg && currentProject) {
      await saveProjectAssetGitConfig(currentOrg.id, currentProject.id, config);
    }
    addToast({
      type: "success",
      title: "Asset Git Config Saved",
      message: config ? `Connected to ${config.repo} (${config.assetFolder || "root"})` : "Disconnected asset Git sync.",
    });
  },

  syncAssetsFromGit: async () => {
    const { currentOrg, currentProject, assetGitConfig, assets, addToast } = get();
    if (!assetGitConfig || !assetGitConfig.owner || !assetGitConfig.repo || !assetGitConfig.pat) {
      addToast({
        type: "error",
        title: "Asset Sync Failed",
        message: "Please configure Git provider and Personal Access Token for assets.",
      });
      return false;
    }

    set({ isSyncingAssets: true });
    try {
      const res = await fetch("/api/git/fetch-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assetGitConfig),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch assets from Git repository.");
      }

      const fetchedAssets: ProjectAsset[] = data.assets || [];
      const uploadedAssets = assets.filter((a) => a.source === "upload");
      const merged = [...fetchedAssets, ...uploadedAssets];

      set({ assets: merged });
      if (currentOrg && currentProject) {
        await saveProjectAssets(currentOrg.id, currentProject.id, merged);
      }

      addToast({
        type: "success",
        title: "Assets Synchronized",
        message: `Successfully synchronized ${fetchedAssets.length} SVG icon${fetchedAssets.length === 1 ? "" : "s"} from Git.`,
      });
      return true;
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Asset Sync Failed",
        message: err.message || "Could not sync assets from repository.",
      });
      return false;
    } finally {
      set({ isSyncingAssets: false });
    }
  },

  themeGroups: [],
  activeThemeGroupId: "",
  activeThemeOptionId: "",

  setActiveThemeGroup: (groupId) => {
    const { themeGroups } = get();
    const grp = themeGroups.find((g) => g.id === groupId);
    const firstOption = grp?.options[0]?.id || "";
    set({ activeThemeGroupId: groupId, activeThemeOptionId: firstOption });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_active_group_id", groupId);
      } catch { }
    }
  },

  setActiveThemeOption: (optionId) => {
    set({ activeThemeOptionId: optionId });
  },

  viewMode: "matrix",
  setViewMode: (mode) => {
    set({ viewMode: mode });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_view_mode", mode);
      } catch { }
    }
  },

  // Theme mode initialization (default follows system)
  themeMode: "light",
  setThemeMode: (mode) => {
    set({ themeMode: mode });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_theme_mode", mode);
        // Apply/remove dark class on <html>
        const root = document.documentElement;
        if (mode === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      } catch { }
    }
  },

  sidebarTab: "dashboard",
  setSidebarTab: (tab) => {
    set({ sidebarTab: tab });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_sidebar_tab", tab);
      } catch { }
    }
  },

  // Releases & Distribution Targets State
  releases: [],
  activeReleaseId: null,
  distributionTargets: [],
  createRelease: (pkg) =>
    set((state) => {
      const updated = [pkg, ...state.releases];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_releases_history", JSON.stringify(updated));
        } catch { }
      }
      return { releases: updated, activeReleaseId: pkg.id };
    }),
  deleteRelease: (id) =>
    set((state) => {
      const updated = state.releases.filter((r) => r.id !== id);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_releases_history", JSON.stringify(updated));
        } catch { }
      }
      return {
        releases: updated,
        activeReleaseId: state.activeReleaseId === id ? (updated[0]?.id || null) : state.activeReleaseId,
      };
    }),
  setActiveReleaseId: (id) => set({ activeReleaseId: id }),

  addDistributionTarget: (target) =>
    set((state) => {
      const updated = [...state.distributionTargets, target];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_distribution_targets", JSON.stringify(updated));
        } catch { }
      }
      return { distributionTargets: updated };
    }),

  updateDistributionTarget: (id, target) =>
    set((state) => {
      const updated = state.distributionTargets.map((t) => (t.id === id ? { ...t, ...target } : t));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_distribution_targets", JSON.stringify(updated));
        } catch { }
      }
      return { distributionTargets: updated };
    }),

  compilerConfig: DEFAULT_COMPILER_CONFIG,

  updateCompilerConfig: (newCfg) =>
    set((state) => {
      const updatedConfig = { ...state.compilerConfig, ...newCfg };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_compiler_config", JSON.stringify(updatedConfig));
        } catch { }
      }

      // Recompile releases in real-time if resolved tokens exist
      const { resolvedTokens, themeGroups } = state;
      let updatedReleases = state.releases;
      if (resolvedTokens.length > 0 && state.releases.length > 0) {
        updatedReleases = state.releases.map((rel) => {
          const cssVars = compileCssVariables(resolvedTokens, themeGroups, updatedConfig);
          const styleDict = compileStyleDictionary(resolvedTokens, themeGroups, updatedConfig);
          return {
            ...rel,
            compilerConfig: updatedConfig,
            cssVariables: cssVars,
            styleDictionary: styleDict,
          };
        });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("ts_releases_history", JSON.stringify(updatedReleases));
          } catch { }
        }
      }

      return {
        compilerConfig: updatedConfig,
        releases: updatedReleases,
      };
    }),

  deleteDistributionTarget: (id) =>
    set((state) => {
      const updated = state.distributionTargets.filter((t) => t.id !== id);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_distribution_targets", JSON.stringify(updated));
        } catch { }
      }
      return { distributionTargets: updated };
    }),

  publishReleaseToTargets: async (releaseId, targetIds) => {
    const { releases, distributionTargets, credentials } = get();
    const release = releases.find((r) => r.id === releaseId) || releases[0];
    if (!release) {
      throw new Error("Release not found");
    }

    const selectedTargets = targetIds && targetIds.length > 0
      ? distributionTargets.filter((t) => targetIds.includes(t.id))
      : distributionTargets;

    if (selectedTargets.length === 0) {
      throw new Error("No target destinations selected for publishing.");
    }

    try {
      const res = await fetch("/api/v1/releases/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targets: selectedTargets,
          release,
          defaultPat: credentials.pat,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Publish failed (${res.status})`);
      }

      const results: TargetPublishResult[] = data.results || [];
      const updatedReleases = releases.map((r) => {
        if (r.id === release.id) {
          return {
            ...r,
            publishResults: results,
          };
        }
        return r;
      });

      set({ releases: updatedReleases });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_releases_history", JSON.stringify(updatedReleases));
        } catch { }
      }

      return results;
    } catch (err: any) {
      throw err;
    }
  },

  tokensViewMode: "preview",
  setTokensViewMode: (mode) => {
    set({ tokensViewMode: mode });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_tokens_view_mode", mode);
      } catch { }
    }
  },

  activeSet: "ALL",
  activeGroup: "all",
  searchQuery: "",
  highlightedTokenKey: null,
  setHighlightedTokenKey: (key) => set({ highlightedTokenKey: key }),
  focusTokenInMatrix: (tokenKey) => {
    set({
      viewMode: "matrix",
      searchQuery: "",
      highlightedTokenKey: tokenKey,
    });
  },

  syncStatus: "idle",
  syncError: null,
  syncMeta: null,
  toasts: [],

  lastFetchedSha: null,
  hasRemoteChanges: false,
  setHasRemoteChanges: (has) => set({ hasRemoteChanges: has }),

  checkRemoteUpdates: async () => {
    const creds = get().credentials;
    if (!creds.provider || !creds.owner || !creds.repo || !creds.branch || !creds.pat) {
      return false;
    }

    try {
      const res = await fetch("/api/git/check-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });

      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && data.latestSha) {
        const currentSha = get().lastFetchedSha;
        if (currentSha && data.latestSha !== currentSha) {
          set({ hasRemoteChanges: true });
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },

  // Live Git Fetcher (Memory-only, 100% fresh)
  fetchLiveTokens: async (customCreds) => {
    const creds = customCreds || get().credentials;
    if (!creds.provider || !creds.owner || !creds.repo || !creds.branch || !creds.pat) {
      return false;
    }

    set({ syncStatus: "fetching", syncError: null });
    try {
      const res = await fetch("/api/git/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to fetch live tokens from Git");
      }

      if (data.userProfile) {
        get().setUserProfile(data.userProfile);
      }

      get().setRawTokens(data.tokens, data.syncMeta);
      set({
        syncStatus: "success",
        syncError: null,
        lastFetchedSha: data.commitSha || null,
        hasRemoteChanges: false,
      });
      return true;
    } catch (err: any) {
      set({ syncStatus: "error", syncError: err.message });
      return false;
    }
  },

  initializeFromStorage: () => {
    if (typeof window === "undefined") return;

    try {
      // 1. Purge any legacy token cache from localStorage so tokens are ALWAYS fresh in-memory
      localStorage.removeItem("ts_cached_tokens");
      localStorage.removeItem("ts_cached_meta");

      // 2. Restore Credentials & PAT
      const savedCreds =
        localStorage.getItem("ts_tokens_platform_creds") ||
        localStorage.getItem("ts_second_screen_creds");
      const sessionPat =
        sessionStorage.getItem("ts_tokens_platform_pat") ||
        localStorage.getItem("ts_tokens_platform_pat_enc") ||
        sessionStorage.getItem("ts_second_screen_pat") ||
        localStorage.getItem("ts_second_screen_pat_enc") ||
        "";

      let parsedCreds: any = DEFAULT_CREDENTIALS;
      if (savedCreds) {
        parsedCreds = { ...JSON.parse(savedCreds), pat: sessionPat };
      } else if (sessionPat) {
        parsedCreds = { ...DEFAULT_CREDENTIALS, pat: sessionPat };
      }

      // 3. Restore User Profile & View Mode
      const savedUser =
        localStorage.getItem("ts_tokens_platform_user") ||
        localStorage.getItem("ts_second_screen_user");
      const userProfile = savedUser ? JSON.parse(savedUser) : null;
      const savedViewMode = (localStorage.getItem("ts_view_mode") as "matrix" | "flow") || "matrix";

      // 4. Restore Theme Mode (light/dark)
      const savedTheme = localStorage.getItem("ts_theme_mode") as "light" | "dark" | null;
      let initialTheme: "light" | "dark" = "light";
      if (savedTheme) {
        initialTheme = savedTheme;
      } else {
        const prefersDark = typeof window !== "undefined" && window.matchMedia('(prefers-color-scheme: dark)').matches;
        initialTheme = prefersDark ? "dark" : "light";
      }

      // Apply the theme class immediately
      if (typeof window !== "undefined") {
        const root = document.documentElement;
        if (initialTheme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }

      // 5. Restore Active Sidebar Tab and Tokens View Mode
      const validTabs = [
        "dashboard",
        "variables",
        "tokens",
        "themes",
        "documentation",
        "assets",
        "exports",
        "releases",
        "activity",
        "integrations",
        "mcp",
        "project-settings",
        "members",
        "org-settings",
      ];
      const savedTab = localStorage.getItem("ts_sidebar_tab");
      const initialTab: any =
        savedTab && validTabs.includes(savedTab)
          ? savedTab
          : "dashboard";

      const savedTokensViewMode =
        (localStorage.getItem("ts_tokens_view_mode") as "preview" | "json") ||
        "preview";

      // 6. Restore Releases History & Distribution Targets
      let savedReleases: ReleasePackage[] = [];
      try {
        const rawRel = localStorage.getItem("ts_releases_history");
        if (rawRel) savedReleases = JSON.parse(rawRel);
      } catch { }

      let savedTargets = get().distributionTargets;
      try {
        const rawTargets = localStorage.getItem("ts_distribution_targets");
        if (rawTargets) savedTargets = JSON.parse(rawTargets);
      } catch { }

      let savedConfig = DEFAULT_COMPILER_CONFIG;
      try {
        const rawCfg = localStorage.getItem("ts_compiler_config");
        if (rawCfg) savedConfig = { ...DEFAULT_COMPILER_CONFIG, ...JSON.parse(rawCfg) };
      } catch { }

      set({
        credentials: parsedCreds,
        userProfile,
        viewMode: savedViewMode,
        themeMode: initialTheme,
        sidebarTab: initialTab,
        tokensViewMode: savedTokensViewMode,
        releases: savedReleases,
        activeReleaseId: savedReleases[0]?.id || null,
        distributionTargets: savedTargets,
        compilerConfig: savedConfig,
        rawTokens: {},
        resolvedTokens: [],
        themeGroups: [],
        activeThemeGroupId: "",
        activeThemeOptionId: "",
        syncMeta: null,
        syncStatus: "idle",
        syncError: null,
        toasts: [],
      });

      // 7. Check for Invitation Token in URL Query Parameters
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const inviteToken = urlParams.get("invite");
        if (inviteToken) {
          set({ activeInviteToken: inviteToken });
          getInvitationByToken(inviteToken).then((inv) => {
            if (inv && inv.status === "pending") {
              set({ pendingInvitePrompt: inv });
            }
          });
        }
      }

      // 8. Listen to Firebase Authentication State Changes
      if (isFirebaseConfigured && auth) {
        onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            const userObj = {
              uid: fbUser.uid,
              email: fbUser.email || "",
              displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
              avatarUrl: fbUser.photoURL || undefined,
            };
            set({ currentUser: userObj });
            await get().loadTenantData(userObj.uid, userObj.email);
            if (userObj.email) {
              const pendingInvs = await getPendingInvitationsForEmail(userObj.email);
              if (pendingInvs.length > 0) {
                set({ pendingInvitePrompt: pendingInvs[0] });
              }
            }
          } else {
            set({ currentUser: null, isLoadingTenant: false });
          }
        });
      } else {
        set({ isLoadingTenant: false });
      }

      // 5. Automatically fetch fresh live tokens from remote git repository only if fully configured
      if (
        parsedCreds.provider &&
        parsedCreds.owner &&
        parsedCreds.repo &&
        parsedCreds.branch &&
        parsedCreds.pat
      ) {
        get().fetchLiveTokens(parsedCreds);
      }
    } catch {
      // ignore storage parsing error
    }
  },

  setRawTokens: (doc, meta) => {
    const { activeSet, activeThemeGroupId } = get();
    const resolved = flattenAndResolveTokens(doc, activeSet);
    const groups = extractThemeGroups(doc);
    const savedGroupId = typeof window !== "undefined" ? localStorage.getItem("ts_active_group_id") : null;
    const defaultGroup =
      groups.find((g) => g.id === activeThemeGroupId) ||
      (savedGroupId ? groups.find((g) => g.id === savedGroupId) : null) ||
      groups.find((g) => g.name.toLowerCase() === "theme") ||
      groups[0];

    // Synchronize loaded tokens with active Project in Cloud Firestore
    const { currentOrg, currentProject } = get();
    if (currentOrg && currentProject) {
      saveProjectTokens(currentOrg.id, currentProject.id, doc, groups).catch(() => {});
    }

    set({
      rawTokens: doc,
      resolvedTokens: resolved,
      themeGroups: groups,
      activeThemeGroupId: defaultGroup?.id || "",
      activeThemeOptionId: defaultGroup?.options[0]?.id || "",
      isDirty: false,
      syncError: null,
      ...(meta !== undefined ? { syncMeta: meta } : {}),
    });
  },

  setSyncMeta: (meta) => set({ syncMeta: meta }),

  setResolvedTokens: (tokens) => set({ resolvedTokens: tokens }),

  updateSingleToken: (path, newValue) => {
    const { rawTokens, activeSet } = get();
    const updatedRaw = setTokenAtKeyPath(rawTokens, path, newValue);
    const updatedResolved = flattenAndResolveTokens(updatedRaw, activeSet);
    const updatedGroups = extractThemeGroups(updatedRaw);

    set({
      rawTokens: updatedRaw,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      isDirty: true,
    });

    persistTokensChange(updatedRaw, updatedGroups);
  },

  updateSetJson: (setName, newJsonContent) => {
    const { rawTokens, activeSet } = get();
    const updatedRaw = {
      ...rawTokens,
      [setName]: newJsonContent,
    };
    const updatedResolved = flattenAndResolveTokens(updatedRaw, activeSet);
    const updatedGroups = extractThemeGroups(updatedRaw);

    set({
      rawTokens: updatedRaw,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      isDirty: true,
    });

    persistTokensChange(updatedRaw, updatedGroups);
  },

  setActiveSet: (setName) => {
    const { rawTokens } = get();
    const updatedResolved = flattenAndResolveTokens(rawTokens, setName);
    set({ activeSet: setName, resolvedTokens: updatedResolved });
  },

  setActiveGroup: (group) => set({ activeGroup: group }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSyncStatus: (status, error = null) =>
    set({ syncStatus: status, syncError: error }),

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = {
      ...toast,
      id,
      timestamp: Date.now(),
    };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    setTimeout(() => {
      get().removeToast(id);
    }, 4500);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  resetDirtyState: () => set({ isDirty: false }),

  addThemeOption: (params) => {
    const { rawTokens, themeGroups, activeSet } = get();
    const targetGroup =
      themeGroups.find((g) => g.id === params.groupId) ||
      themeGroups.find((g) => g.name.toLowerCase() === params.groupId.toLowerCase()) ||
      themeGroups[0];

    if (!targetGroup) return;

    const optionId = `opt-${params.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
    const themesKey = rawTokens["$themes.json"] ? "$themes.json" : "$themes";

    let existingThemes: any[] = Array.isArray(rawTokens[themesKey])
      ? JSON.parse(JSON.stringify(rawTokens[themesKey]))
      : [];

    if (existingThemes.length === 0) {
      themeGroups.forEach((grp) => {
        grp.options.forEach((opt) => {
          existingThemes.push({
            id: opt.id,
            name: opt.name,
            group: grp.name,
            selectedTokenSets: opt.selectedTokenSets || {},
            color: opt.color || "#ffffff",
          });
        });
      });
    }

    const selectedSets = { ...params.selectedTokenSets };
    let updatedRawDoc = { ...rawTokens };

    // If creating or populating a new set name
    if (params.newSetName && params.newSetName.trim()) {
      const setName = params.newSetName.trim();
      selectedSets[setName] = "enabled";

      // If cloning from an existing option, clone that option's enabled set
      if (params.cloneFromOptionId) {
        const sourceOpt = targetGroup.options.find(
          (o) => o.id === params.cloneFromOptionId
        );
        if (sourceOpt) {
          const sourceSetNames = Object.entries(sourceOpt.selectedTokenSets || {})
            .filter(([_, status]) => status === "enabled")
            .map(([s]) => s);

          if (sourceSetNames.length > 0 && rawTokens[sourceSetNames[0]]) {
            updatedRawDoc[setName] = JSON.parse(
              JSON.stringify(rawTokens[sourceSetNames[0]])
            );
          } else {
            updatedRawDoc[setName] = {};
          }
        } else {
          updatedRawDoc[setName] = {};
        }
      } else if (!updatedRawDoc[setName]) {
        updatedRawDoc[setName] = {};
      }
    }

    existingThemes.push({
      id: optionId,
      name: params.name,
      group: targetGroup.name,
      selectedTokenSets: selectedSets,
      color: params.color || "#3b82f6",
    });

    updatedRawDoc[themesKey] = existingThemes as any;

    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = flattenAndResolveTokens(updatedRawDoc, activeSet);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_active_group_id", targetGroup.id);
      } catch { }
    }

    set({
      rawTokens: updatedRawDoc,
      themeGroups: updatedGroups,
      resolvedTokens: updatedResolved,
      activeThemeGroupId: targetGroup.id,
      activeThemeOptionId: optionId,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "success",
      title: "Theme Option Created",
      message: `Added "${params.name}" to ${targetGroup.name}. You can edit its token values now.`,
    });
  },

  updateThemeGroup: (groupId, newName, newColor) => {
    const { rawTokens, themeGroups, activeSet } = get();
    const targetGroup =
      themeGroups.find((g) => g.id === groupId) ||
      themeGroups.find((g) => g.name.toLowerCase() === groupId.toLowerCase());

    if (!targetGroup) return;

    const oldName = targetGroup.name;
    const themesKey = rawTokens["$themes.json"] ? "$themes.json" : "$themes";

    let existingThemes: any[] = Array.isArray(rawTokens[themesKey])
      ? JSON.parse(JSON.stringify(rawTokens[themesKey]))
      : [];

    if (existingThemes.length === 0) {
      themeGroups.forEach((grp) => {
        grp.options.forEach((opt) => {
          existingThemes.push({
            id: opt.id,
            name: opt.name,
            group: grp.name,
            selectedTokenSets: opt.selectedTokenSets || {},
            color: opt.color || "#ffffff",
          });
        });
      });
    }

    const updatedThemes = existingThemes.map((t) => {
      if (t.group === oldName) {
        return {
          ...t,
          group: newName,
          ...(newColor ? { groupColor: newColor } : {}),
        };
      }
      return t;
    });

    const updatedRawDoc = {
      ...rawTokens,
      [themesKey]: updatedThemes as any,
    };

    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = flattenAndResolveTokens(updatedRawDoc, activeSet);
    const newMatchedGroup = updatedGroups.find((g) => g.name === newName) || updatedGroups[0];

    if (typeof window !== "undefined") {
      try {
        if (newMatchedGroup) {
          localStorage.setItem("ts_active_group_id", newMatchedGroup.id);
        }
      } catch { }
    }

    set({
      rawTokens: updatedRawDoc,
      themeGroups: updatedGroups,
      resolvedTokens: updatedResolved,
      activeThemeGroupId: newMatchedGroup?.id || "",
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "success",
      title: "Theme Group Updated",
      message: `Renamed to "${newName}".`,
    });
  },

  duplicateThemeGroup: (groupId) => {
    const { rawTokens, themeGroups, activeSet } = get();
    const targetGroup = themeGroups.find((g) => g.id === groupId);
    if (!targetGroup) return;

    const newGroupName = `${targetGroup.name} (Copy)`;
    const themesKey = rawTokens["$themes.json"] ? "$themes.json" : "$themes";

    let existingThemes: any[] = Array.isArray(rawTokens[themesKey])
      ? JSON.parse(JSON.stringify(rawTokens[themesKey]))
      : [];

    if (existingThemes.length === 0) {
      themeGroups.forEach((grp) => {
        grp.options.forEach((opt) => {
          existingThemes.push({
            id: opt.id,
            name: opt.name,
            group: grp.name,
            selectedTokenSets: opt.selectedTokenSets || {},
            color: opt.color || "#ffffff",
          });
        });
      });
    }

    // Clone all options for this group
    const clonedOptions = targetGroup.options.map((opt, idx) => ({
      id: `opt-clone-${Date.now().toString(36)}-${idx}`,
      name: opt.name,
      group: newGroupName,
      selectedTokenSets: { ...(opt.selectedTokenSets || {}) },
      color: opt.color || "#ffffff",
    }));

    const updatedThemes = [...existingThemes, ...clonedOptions];
    const updatedRawDoc = {
      ...rawTokens,
      [themesKey]: updatedThemes as any,
    };

    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = flattenAndResolveTokens(updatedRawDoc, activeSet);
    const newMatchedGroup = updatedGroups.find((g) => g.name === newGroupName) || updatedGroups[0];

    if (typeof window !== "undefined") {
      try {
        if (newMatchedGroup) {
          localStorage.setItem("ts_active_group_id", newMatchedGroup.id);
        }
      } catch { }
    }

    set({
      rawTokens: updatedRawDoc,
      themeGroups: updatedGroups,
      resolvedTokens: updatedResolved,
      activeThemeGroupId: newMatchedGroup?.id || "",
      activeThemeOptionId: newMatchedGroup?.options[0]?.id || "",
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "success",
      title: "Theme Group Duplicated",
      message: `Created copy "${newGroupName}".`,
    });
  },

  deleteThemeGroup: (groupId) => {
    const { rawTokens, themeGroups, activeSet } = get();
    const targetGroup = themeGroups.find((g) => g.id === groupId);
    if (!targetGroup) return;

    if (themeGroups.length <= 1) {
      get().addToast({
        type: "error",
        title: "Cannot Delete Group",
        message: "You must have at least one Theme Group.",
      });
      return;
    }

    const themesKey = rawTokens["$themes.json"] ? "$themes.json" : "$themes";

    let existingThemes: any[] = Array.isArray(rawTokens[themesKey])
      ? JSON.parse(JSON.stringify(rawTokens[themesKey]))
      : [];

    if (existingThemes.length === 0) {
      themeGroups.forEach((grp) => {
        grp.options.forEach((opt) => {
          existingThemes.push({
            id: opt.id,
            name: opt.name,
            group: grp.name,
            selectedTokenSets: opt.selectedTokenSets || {},
            color: opt.color || "#ffffff",
          });
        });
      });
    }

    const updatedThemes = existingThemes.filter(
      (t) => t.group !== targetGroup.name
    );

    const updatedRawDoc = {
      ...rawTokens,
      [themesKey]: updatedThemes as any,
    };

    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = flattenAndResolveTokens(updatedRawDoc, activeSet);
    const remainingGroup = updatedGroups[0];

    if (typeof window !== "undefined") {
      try {
        if (remainingGroup) {
          localStorage.setItem("ts_active_group_id", remainingGroup.id);
        }
      } catch { }
    }

    set({
      rawTokens: updatedRawDoc,
      themeGroups: updatedGroups,
      resolvedTokens: updatedResolved,
      activeThemeGroupId: remainingGroup?.id || "",
      activeThemeOptionId: remainingGroup?.options[0]?.id || "",
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "info",
      title: "Theme Group Deleted",
      message: `Deleted "${targetGroup.name}".`,
    });
  },

  addNewToken: (setName, tokenPath, tokenData) => {
    const { rawTokens, activeSet } = get();
    const fullPath = [setName, ...tokenPath];
    const updatedRawDoc = createTokenAtKeyPath(rawTokens, fullPath, tokenData);
    const updatedResolved = flattenAndResolveTokens(updatedRawDoc, activeSet);
    const updatedGroups = extractThemeGroups(updatedRawDoc);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "success",
      title: "Token Created",
      message: `Created "${tokenPath.join(".")}" in ${setName}.`,
    });
  },

  deleteToken: (setName, tokenPath) => {
    const { rawTokens, activeSet } = get();
    const fullPath = [setName, ...tokenPath];
    const updatedRawDoc = deleteTokenAtKeyPath(rawTokens, fullPath);
    const updatedResolved = flattenAndResolveTokens(updatedRawDoc, activeSet);
    const updatedGroups = extractThemeGroups(updatedRawDoc);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "info",
      title: "Token Deleted",
      message: `Deleted "${tokenPath.join(".")}".`,
    });
  },

  duplicateToken: (setName, tokenPath, newName) => {
    const { rawTokens, activeSet, resolvedTokens } = get();
    const existingName = tokenPath.join(".");
    const existing = resolvedTokens.find((t) => t.setName === setName && t.name === existingName);
    if (!existing) return;

    const newPath = newName.split(".");
    const fullPath = [setName, ...newPath];
    const updatedRawDoc = createTokenAtKeyPath(rawTokens, fullPath, {
      value: existing.rawValue,
      type: existing.type,
      description: existing.description ? `${existing.description} (Copy)` : undefined,
    });
    const updatedResolved = flattenAndResolveTokens(updatedRawDoc, activeSet);
    const updatedGroups = extractThemeGroups(updatedRawDoc);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "success",
      title: "Token Duplicated",
      message: `Created "${newName}".`,
    });
  },

  addNewSet: (setName) => {
    const { rawTokens, activeSet } = get();
    const cleanName = setName.trim();
    if (!cleanName || rawTokens[cleanName]) return;

    const updatedRawDoc = createEmptyTokenSet(rawTokens, cleanName);
    const updatedResolved = flattenAndResolveTokens(updatedRawDoc, activeSet);
    const updatedGroups = extractThemeGroups(updatedRawDoc);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      activeSet: cleanName,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "success",
      title: "Set Created",
      message: `Created token set "${cleanName}".`,
    });
  },

  deleteSet: (setName) => {
    const { rawTokens, activeSet } = get();
    const updatedRawDoc = deleteTokenSet(rawTokens, setName);
    const remainingSets = Object.keys(updatedRawDoc).filter((k) => !k.startsWith("$"));
    const newActiveSet = activeSet === setName ? (remainingSets[0] || "ALL") : activeSet;
    const updatedResolved = flattenAndResolveTokens(updatedRawDoc, newActiveSet);
    const updatedGroups = extractThemeGroups(updatedRawDoc);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      activeSet: newActiveSet,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "info",
      title: "Set Deleted",
      message: `Deleted token set "${setName}".`,
    });
  },

  initializeBlankWorkspace: () => {
    const blankDoc: RawTokensDocument = {
      global: {
        colors: {
          brand: {
            primary: { value: "#7c3aed", type: "color", description: "Primary brand accent" },
          },
        },
      },
    };
    get().setRawTokens(blankDoc);
    set({ sidebarTab: "tokens" });
    get().addToast({
      type: "success",
      title: "Workspace Initialized",
      message: "Started with clean design token workspace. Add your tokens or connect a repository.",
    });
  },
};
});
