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
  UserActivityItem,
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
import { extractThemeGroups, canonicalizeTokenDocument } from "@/utils/themeHelpers";
import { computeTokensDiff, DocumentDiffSummary } from "@/utils/tokenDiff";
import {
  Organization,
  Project,
  OrganizationMember,
  OrganizationInvitation,
  UserRole,
  ROLE_DEFINITIONS,
  ProjectAsset,
  AssetGitConfig,
  AssetFigmaConfig,
  FigmaSourceLink,
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
  saveProjectAssetFigmaConfig,
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
  updateOrgAction: (orgId: string, updates: { name?: string; icon?: string; color?: string; logoUrl?: string }) => Promise<Organization | null>;
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
  canUserInvite: () => boolean;
  canManageRoles: () => boolean;

  // Git Credentials
  credentials: GitCredentials;
  setCredentials: (creds: Partial<GitCredentials>, rememberPat?: boolean) => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;

  // Dual State
  rawTokens: RawTokensDocument;
  originalTokens: RawTokensDocument;
  resolvedTokens: FlattenedToken[];
  isDirty: boolean;
  lastFetchedSha: string | null;
  hasRemoteChanges: boolean;
  setHasRemoteChanges: (has: boolean) => void;
  checkRemoteUpdates: () => Promise<boolean>;
  getDiffSummary: () => DocumentDiffSummary;

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
  assetFigmaConfig: AssetFigmaConfig | null;
  isSyncingAssets: boolean;
  isSyncingFigmaAssets: boolean;
  setAssets: (assets: ProjectAsset[]) => void;
  uploadAssets: (newAssets: Array<{ name: string; title?: string; type?: string; tag?: string; category?: string; svg: string }>) => Promise<void>;
  applyMetadataToAssets: (metadataMap: Map<string, { name?: string; title?: string; type?: string; tag?: string; category?: string }>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<ProjectAsset>) => Promise<void>;
  updateAssets: (ids: string[], updates: Partial<ProjectAsset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  deleteAssets: (ids: string[]) => Promise<void>;
  setAssetGitConfig: (config: AssetGitConfig | null) => Promise<void>;
  syncAssetsFromGit: () => Promise<boolean>;
  togglePauseAssetGit: () => Promise<void>;
  disconnectAssetGit: () => Promise<void>;
  setAssetFigmaConfig: (config: AssetFigmaConfig | null) => Promise<void>;
  setFigmaPat: (pat: string) => Promise<void>;
  addFigmaSource: (source: { name: string; fileUrl: string }) => Promise<boolean>;
  updateFigmaSource: (id: string, updates: Partial<FigmaSourceLink>) => Promise<void>;
  removeFigmaSource: (id: string, removeAssets?: boolean) => Promise<void>;
  togglePauseFigmaSource: (sourceId: string) => Promise<void>;
  syncSingleFigmaSource: (sourceId: string) => Promise<boolean>;
  syncAllFigmaSources: () => Promise<boolean>;
  togglePauseFigmaSync: () => Promise<void>;
  syncAssetsFromFigma: (customConfig?: AssetFigmaConfig) => Promise<boolean>;

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
    | "org-settings"
    | "changelog";
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
      | "changelog"
  ) => void;
  membersSubTab: "members" | "invites" | "activity";
  setMembersSubTab: (tab: "members" | "invites" | "activity") => void;

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
  userActivities: UserActivityItem[];
  logUserActivity: (activity: Omit<UserActivityItem, "id" | "timestamp">) => void;
  clearUserActivities: () => void;
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
  let scopeSwitchVersion = 0;
  const isScopeActive = (orgId?: string, projectId?: string) => {
    const { currentOrg, currentProject } = get();
    return currentOrg?.id === orgId && currentProject?.id === projectId;
  };

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
    if (!currentUser) {
      return isFirebaseConfigured ? "viewer" : "admin";
    }
    if (!currentOrg) return "admin";
    if (currentOrg.ownerUid === currentUser.uid) return "owner";
    const member = currentOrg.members?.find(
      (m) =>
        m.uid === currentUser.uid ||
        (currentUser.email &&
          m?.email &&
          m.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    return member?.role || "viewer";
  },

  canUserEdit: () => {
    const role = get().getCurrentUserRole();
    return role === "owner" || role === "admin" || role === "editor";
  },

  canUserInvite: () => {
    const role = get().getCurrentUserRole();
    return role === "owner" || role === "admin" || role === "editor";
  },

  canManageRoles: () => {
    const role = get().getCurrentUserRole();
    return role === "owner" || role === "admin";
  },

  setCurrentOrg: async (org) => {
    const switchVersion = ++scopeSwitchVersion;
    set({
      currentOrg: org,
      orgProjects: [],
      currentProject: null,
      rawTokens: {},
      resolvedTokens: [],
      themeGroups: [],
      activeThemeGroupId: "",
      activeThemeOptionId: "",
      syncMeta: null,
      figmaVariables: null,
      figmaResolvedVariables: [],
      figmaUpdatedAt: null,
      figmaMeta: null,
      assets: [],
      assetGitConfig: null,
      assetFigmaConfig: null,
      credentials: DEFAULT_CREDENTIALS,
      pendingInvitations: [],
    });
    if (org) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_active_org_id", org.id);
          localStorage.removeItem("ts_active_project_id");
        } catch {}
      }
      const projects = await getOrgProjects(org.id);
      if (switchVersion !== scopeSwitchVersion || get().currentOrg?.id !== org.id) return;
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
    if (proj && get().currentOrg && proj.orgId !== get().currentOrg?.id) return;

    set({
      currentProject: proj,
      rawTokens: {},
      resolvedTokens: [],
      themeGroups: [],
      activeThemeGroupId: "",
      activeThemeOptionId: "",
      syncMeta: null,
      figmaVariables: null,
      figmaResolvedVariables: [],
      figmaUpdatedAt: null,
      figmaMeta: null,
      assets: [],
      assetGitConfig: null,
      assetFigmaConfig: null,
      credentials: DEFAULT_CREDENTIALS,
    });

    if (proj) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_active_project_id", proj.id);
        } catch {}
      }

      // 1. Git Connection & Token Dictionary
      if (proj.gitConfig && proj.gitConfig.repo) {
        let branchToUse = proj.gitConfig.branch;
        if (typeof window !== "undefined") {
          const savedBranch = localStorage.getItem(`ts_project_branch_${proj.id}`);
          if (savedBranch) {
            branchToUse = savedBranch;
          }
        }
        const activeCreds = {
          ...DEFAULT_CREDENTIALS,
          ...proj.gitConfig,
          branch: branchToUse || proj.gitConfig.branch || DEFAULT_CREDENTIALS.branch,
        };
        set({ credentials: activeCreds });
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
        const canonical = proj.rawTokens ? canonicalizeTokenDocument(proj.rawTokens) : {};
        const hasTokens = Object.keys(canonical).length > 0;
        const groups = hasTokens ? extractThemeGroups(canonical) : proj.themeGroups || [];
        set({
          credentials: DEFAULT_CREDENTIALS,
          rawTokens: canonical,
          resolvedTokens: hasTokens ? flattenAndResolveTokens(canonical, "ALL") : [],
          themeGroups: groups,
          activeThemeGroupId: groups[0]?.id || "",
          activeThemeOptionId: groups[0]?.options?.[0]?.id || "",
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
      let normalizedFigmaConfig: AssetFigmaConfig | null = proj.assetFigmaConfig || null;
      if (normalizedFigmaConfig) {
        if (!Array.isArray(normalizedFigmaConfig.sources)) {
          normalizedFigmaConfig = {
            pat: normalizedFigmaConfig.pat || "",
            sources: normalizedFigmaConfig.fileUrl ? [
              {
                id: "figma_src_default",
                name: normalizedFigmaConfig.nodeName || "Primary Frame",
                fileUrl: normalizedFigmaConfig.fileUrl,
                fileKey: normalizedFigmaConfig.fileKey || "",
                nodeId: normalizedFigmaConfig.nodeId,
                nodeName: normalizedFigmaConfig.nodeName,
                lastSyncedAt: normalizedFigmaConfig.lastSyncedAt,
                enabled: true,
              }
            ] : [],
            lastSyncedAt: normalizedFigmaConfig.lastSyncedAt,
            isPaused: normalizedFigmaConfig.isPaused || false,
          };
        }
      }

      set({
        assets: proj.assets || [],
        assetGitConfig: proj.assetGitConfig || null,
        assetFigmaConfig: normalizedFigmaConfig,
        isSyncingAssets: false,
        isSyncingFigmaAssets: false,
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
          const activeCreds = get().credentials;
          if (
            activeCreds?.provider &&
            activeCreds?.owner &&
            activeCreds?.repo &&
            activeCreds?.branch &&
            activeCreds?.pat
          ) {
            get().fetchLiveTokens(activeCreds);
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
      if (currentOrg?.id !== orgId) return;
      const memberEmails = new Set(
        (currentOrg?.members || []).map((m) => String(m?.email || "").toLowerCase()).filter(Boolean)
      );
      // Filter out any invitation where invitee is already an active member or not pending
      const pendingOnly = invs.filter(
        (i) => i.status === "pending" && !memberEmails.has(String(i?.inviteeEmail || "").toLowerCase())
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
          email: currentUser.email || "",
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
      throw e;
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
            (i) => i.token !== token && String(i?.inviteeEmail || "").toLowerCase() !== String(currentUser.email || "").toLowerCase()
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
        (m) => m.uid !== memberEmailOrUid && String(m?.email || "").toLowerCase() !== String(memberEmailOrUid || "").toLowerCase()
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
      const existingOrg = get().userOrgs.find((org) => org.id === orgId);
      const name = updates.name ?? existingOrg?.name;
      const orgUpdates = {
        ...(name ? { name } : {}),
        ...(updates.name ? { slug: String(updates.name).toLowerCase().replace(/[^a-z0-9]/g, "-") } : {}),
        ...(updates.icon !== undefined ? { icon: updates.icon } : {}),
        ...(updates.color !== undefined ? { color: updates.color } : {}),
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
        {},
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
      const slug = updates.name ? String(updates.name).toLowerCase().replace(/[^a-z0-9]/g, "-") : "";
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
        const nextProj = remaining[0] || null;
        get().setCurrentProject(nextProj);
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

          if (state.currentProject?.id && updated.branch) {
            localStorage.setItem(`ts_project_branch_${state.currentProject.id}`, updated.branch);
          }

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

      // Persist to project in Firestore if available
      if (state.currentOrg && state.currentProject) {
        const updatedProject = {
          ...state.currentProject,
          gitConfig: {
            ...(state.currentProject.gitConfig || {}),
            ...updated,
          },
        };
        saveProjectGitConfig(state.currentOrg.id, state.currentProject.id, updatedProject.gitConfig);
        return { credentials: updated, currentProject: updatedProject };
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
  originalTokens: {},
  resolvedTokens: [],
  isDirty: false,
  lastFetchedSha: null,
  hasRemoteChanges: false,
  setHasRemoteChanges: (has) => set({ hasRemoteChanges: has }),
  getDiffSummary: () =>
    computeTokensDiff(
      get().originalTokens || {},
      get().rawTokens || {},
      get().syncMeta?.files
    ),

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
    if (!get().canUserEdit()) {
      get().addToast({ type: "info", title: "Read-Only Access", message: "Viewer role cannot de-sync Figma variables." });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({ type: "info", title: "Read-Only Access", message: "Viewer role cannot delete variables." });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({ type: "info", title: "Read-Only Access", message: "Viewer role cannot delete collections." });
      return;
    }
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
  assetFigmaConfig: null,
  isSyncingAssets: false,
  isSyncingFigmaAssets: false,

  setAssets: (assets) => set({ assets }),

  uploadAssets: async (newAssets) => {
    if (!get().canUserEdit()) {
      get().addToast({ type: "info", title: "Read-Only Access", message: "Viewer role cannot upload assets." });
      return;
    }
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
    const normalize = (s: any) => String(s || "").toLowerCase().replace(/^icon[-_]?/i, "").replace(/[^a-z0-9]/g, "");

    const updated = assets.map((asset) => {
      const stem = asset.name;
      const typeKey = String(asset.type || "").toLowerCase();
      const matched =
        (typeKey ? metadataMap.get(`${normalize(typeKey)}::${normalize(stem)}`) : undefined) ||
        metadataMap.get(normalize(stem)) ||
        metadataMap.get(String(stem || "").toLowerCase()) ||
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

  updateAssets: async (ids, updates) => {
    const { currentOrg, currentProject, assets, addToast } = get();
    const idSet = new Set(ids);
    const updated = assets.map((asset) =>
      idSet.has(asset.id) ? { ...asset, ...updates, updatedAt: new Date().toISOString() } : asset
    );
    set({ assets: updated });
    if (currentOrg && currentProject) {
      await saveProjectAssets(currentOrg.id, currentProject.id, updated);
    }
    addToast({
      type: "success",
      title: "Metadata Updated",
      message: `Updated metadata for ${ids.length} icon${ids.length > 1 ? "s" : ""}.`,
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
    const scopeOrgId = currentOrg?.id;
    const scopeProjectId = currentProject?.id;
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
      if (!isScopeActive(scopeOrgId, scopeProjectId)) return false;
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

  togglePauseAssetGit: async () => {
    const { currentOrg, currentProject, assetGitConfig, addToast } = get();
    if (!assetGitConfig) return;
    const isPaused = !assetGitConfig.isPaused;
    const updated = { ...assetGitConfig, isPaused };
    set({ assetGitConfig: updated });
    if (currentOrg && currentProject) {
      await saveProjectAssetGitConfig(currentOrg.id, currentProject.id, updated);
    }
    addToast({
      type: "info",
      title: isPaused ? "Git Sync Paused" : "Git Sync Resumed",
      message: isPaused ? "Automatic Git asset sync is paused." : "Git asset sync is now active.",
    });
  },

  disconnectAssetGit: async () => {
    const { currentOrg, currentProject, addToast } = get();
    set({ assetGitConfig: null });
    if (currentOrg && currentProject) {
      await saveProjectAssetGitConfig(currentOrg.id, currentProject.id, null);
    }
    addToast({
      type: "info",
      title: "Git Disconnected",
      message: "Asset Git configuration has been removed.",
    });
  },

  setAssetFigmaConfig: async (config) => {
    const { currentOrg, currentProject, addToast } = get();
    set({ assetFigmaConfig: config });
    if (currentOrg && currentProject) {
      await saveProjectAssetFigmaConfig(currentOrg.id, currentProject.id, config);
    }
  },

  setFigmaPat: async (pat: string) => {
    const { currentOrg, currentProject, assetFigmaConfig, addToast } = get();
    const cleanPat = pat.trim();
    const updated: AssetFigmaConfig = {
      pat: cleanPat,
      sources: assetFigmaConfig?.sources || [],
      lastSyncedAt: assetFigmaConfig?.lastSyncedAt,
      isPaused: assetFigmaConfig?.isPaused || false,
    };
    set({ assetFigmaConfig: updated });
    if (currentOrg && currentProject) {
      await saveProjectAssetFigmaConfig(currentOrg.id, currentProject.id, updated);
    }
    addToast({
      type: "success",
      title: cleanPat ? "Figma Token Saved" : "Figma Token Cleared",
      message: cleanPat ? "Personal Access Token securely saved for all Figma sources." : "Figma Personal Access Token removed.",
    });
  },

  addFigmaSource: async (source: { name: string; fileUrl: string }) => {
    const { currentOrg, currentProject, assetFigmaConfig, addToast } = get();
    const pat = assetFigmaConfig?.pat || "";
    if (!source.fileUrl.trim()) {
      addToast({ type: "error", title: "Missing URL", message: "Please enter a valid Figma frame or section link." });
      return false;
    }

    const newId = `figma_src_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newSource: FigmaSourceLink = {
      id: newId,
      name: source.name.trim() || "Figma Frame",
      fileUrl: source.fileUrl.trim(),
      fileKey: "",
      enabled: true,
    };

    const currentSources = assetFigmaConfig?.sources || [];
    const updatedSources = [...currentSources, newSource];
    const updatedConfig: AssetFigmaConfig = {
      pat,
      sources: updatedSources,
      lastSyncedAt: assetFigmaConfig?.lastSyncedAt,
      isPaused: assetFigmaConfig?.isPaused || false,
    };

    set({ assetFigmaConfig: updatedConfig });
    if (currentOrg && currentProject) {
      await saveProjectAssetFigmaConfig(currentOrg.id, currentProject.id, updatedConfig);
    }

    if (pat) {
      // Automatically run initial sync for this source
      await get().syncSingleFigmaSource(newId);
    } else {
      addToast({
        type: "success",
        title: "Figma Source Added",
        message: `Added "${newSource.name}". Connect your Figma PAT to sync.`,
      });
    }
    return true;
  },

  updateFigmaSource: async (id: string, updates: Partial<FigmaSourceLink>) => {
    const { currentOrg, currentProject, assetFigmaConfig } = get();
    if (!assetFigmaConfig) return;
    const updatedSources = (assetFigmaConfig.sources || []).map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    const updatedConfig = { ...assetFigmaConfig, sources: updatedSources };
    set({ assetFigmaConfig: updatedConfig });
    if (currentOrg && currentProject) {
      await saveProjectAssetFigmaConfig(currentOrg.id, currentProject.id, updatedConfig);
    }
  },

  removeFigmaSource: async (id: string, removeAssets = false) => {
    const { currentOrg, currentProject, assetFigmaConfig, assets, addToast } = get();
    if (!assetFigmaConfig) return;
    const removedSrc = assetFigmaConfig.sources.find((s) => s.id === id);
    const updatedSources = (assetFigmaConfig.sources || []).filter((s) => s.id !== id);
    const updatedConfig = { ...assetFigmaConfig, sources: updatedSources };

    let updatedAssets = assets;
    if (removeAssets) {
      updatedAssets = assets.filter((a) => a.figmaSourceId !== id);
    }

    set({ assetFigmaConfig: updatedConfig, assets: updatedAssets });
    if (currentOrg && currentProject) {
      await saveProjectAssetFigmaConfig(currentOrg.id, currentProject.id, updatedConfig);
      if (removeAssets) {
        await saveProjectAssets(currentOrg.id, currentProject.id, updatedAssets);
      }
    }
    addToast({
      type: "info",
      title: "Figma Source Removed",
      message: `Removed source "${removedSrc?.name || id}".`,
    });
  },

  togglePauseFigmaSource: async (sourceId: string) => {
    const { currentOrg, currentProject, assetFigmaConfig, addToast } = get();
    if (!assetFigmaConfig) return;
    let isNowPaused = false;
    let sourceName = "Figma Source";
    const updatedSources = (assetFigmaConfig.sources || []).map((s) => {
      if (s.id === sourceId) {
        isNowPaused = !s.isPaused;
        sourceName = s.name;
        return { ...s, isPaused: isNowPaused, enabled: !isNowPaused };
      }
      return s;
    });
    const updatedConfig = { ...assetFigmaConfig, sources: updatedSources };
    set({ assetFigmaConfig: updatedConfig });
    if (currentOrg && currentProject) {
      await saveProjectAssetFigmaConfig(currentOrg.id, currentProject.id, updatedConfig);
    }
    addToast({
      type: "info",
      title: isNowPaused ? `Paused "${sourceName}"` : `Resumed "${sourceName}"`,
      message: isNowPaused ? "This Figma link is paused and excluded from sync." : "This Figma link is active and ready to sync.",
    });
  },

  togglePauseFigmaSync: async () => {
    const { currentOrg, currentProject, assetFigmaConfig, addToast } = get();
    if (!assetFigmaConfig) return;
    const isPaused = !assetFigmaConfig.isPaused;
    const updated = { ...assetFigmaConfig, isPaused };
    set({ assetFigmaConfig: updated });
    if (currentOrg && currentProject) {
      await saveProjectAssetFigmaConfig(currentOrg.id, currentProject.id, updated);
    }
    addToast({
      type: "info",
      title: isPaused ? "Figma Sync Paused" : "Figma Sync Resumed",
      message: isPaused ? "Figma asset sync is paused." : "Figma asset sync is active.",
    });
  },

  syncSingleFigmaSource: async (sourceId: string) => {
    const { currentOrg, currentProject, assetFigmaConfig, assets, addToast } = get();
    const scopeOrgId = currentOrg?.id;
    const scopeProjectId = currentProject?.id;
    if (!assetFigmaConfig || !assetFigmaConfig.pat) {
      addToast({
        type: "error",
        title: "Missing Figma Token",
        message: "Please configure your Figma Personal Access Token in settings.",
      });
      return false;
    }

    const targetSrc = (assetFigmaConfig.sources || []).find((s) => s.id === sourceId);
    if (!targetSrc || !targetSrc.fileUrl) {
      addToast({ type: "error", title: "Source Not Found", message: "Target Figma source was not found." });
      return false;
    }

    set({ isSyncingFigmaAssets: true });
    try {
      const res = await fetch("/api/figma/fetch-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pat: assetFigmaConfig.pat,
          fileUrl: targetSrc.fileUrl,
          fileKey: targetSrc.fileKey,
          nodeId: targetSrc.nodeId,
          name: targetSrc.name,
          sourceId: targetSrc.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch assets from Figma.");
      }

      if (!isScopeActive(scopeOrgId, scopeProjectId)) return false;

      const fetchedAssets: ProjectAsset[] = (data.assets || []).map((a: ProjectAsset) => ({
        ...a,
        figmaSourceId: targetSrc.id,
        figmaSourceName: targetSrc.name,
      }));

      // Merge: Update matching figmaNodeId or append new, keep non-source assets
      const otherAssets = assets.filter((a) => a.figmaSourceId !== targetSrc.id);
      const existingThisSource = assets.filter((a) => a.figmaSourceId === targetSrc.id);
      const existingNodeMap = new Map(existingThisSource.map((a) => [a.figmaNodeId, a]));

      let newCount = 0;
      let updatedCount = 0;

      const mergedThisSource = fetchedAssets.map((fetched) => {
        const existing = existingNodeMap.get(fetched.figmaNodeId);
        if (existing) {
          updatedCount++;
          return {
            ...existing,
            ...fetched,
            id: existing.id,
          };
        } else {
          newCount++;
          return fetched;
        }
      });

      const finalAssets = [...mergedThisSource, ...otherAssets];
      const now = new Date().toISOString();

      const updatedSources = (assetFigmaConfig.sources || []).map((s) =>
        s.id === sourceId
          ? {
              ...s,
              nodeName: data.nodeName || s.nodeName,
              fileKey: data.fileKey || s.fileKey,
              nodeId: data.nodeId || s.nodeId,
              lastSyncedAt: now,
              assetCount: mergedThisSource.length,
            }
          : s
      );

      const updatedConfig: AssetFigmaConfig = {
        ...assetFigmaConfig,
        sources: updatedSources,
        lastSyncedAt: now,
      };

      set({ assets: finalAssets, assetFigmaConfig: updatedConfig });
      if (currentOrg && currentProject) {
        await saveProjectAssets(currentOrg.id, currentProject.id, finalAssets);
        await saveProjectAssetFigmaConfig(currentOrg.id, currentProject.id, updatedConfig);
      }

      addToast({
        type: "success",
        title: `Synced: ${targetSrc.name}`,
        message: `Synced ${fetchedAssets.length} icons (${newCount} new, ${updatedCount} updated).`,
      });
      return true;
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Figma Sync Failed",
        message: err.message || `Could not sync source "${targetSrc.name}".`,
      });
      return false;
    } finally {
      set({ isSyncingFigmaAssets: false });
    }
  },

  syncAllFigmaSources: async () => {
    const { currentOrg, currentProject, assetFigmaConfig, assets, addToast } = get();
    if (!assetFigmaConfig || !assetFigmaConfig.pat) {
      addToast({
        type: "error",
        title: "Missing Figma Token",
        message: "Please configure your Figma Personal Access Token.",
      });
      return false;
    }

    const enabledSources = (assetFigmaConfig.sources || []).filter(
      (s) => s.enabled !== false && !s.isPaused && s.fileUrl
    );
    if (enabledSources.length === 0) {
      addToast({
        type: "info",
        title: "No Active Sources",
        message: "Please add or resume at least one active Figma source link to sync.",
      });
      return false;
    }

    set({ isSyncingFigmaAssets: true });
    try {
      const res = await fetch("/api/figma/fetch-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pat: assetFigmaConfig.pat,
          sources: enabledSources,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch assets from Figma.");
      }

      const fetchedAssets: ProjectAsset[] = data.assets || [];
      const nonFigmaAssets = assets.filter((a) => a.source !== "figma");
      const existingFigmaAssets = assets.filter((a) => a.source === "figma");
      const existingNodeMap = new Map(existingFigmaAssets.map((a) => [a.figmaNodeId, a]));

      let newCount = 0;
      let updatedCount = 0;

      const mergedFigma = fetchedAssets.map((fetched) => {
        const existing = existingNodeMap.get(fetched.figmaNodeId);
        if (existing) {
          updatedCount++;
          return {
            ...existing,
            ...fetched,
            id: existing.id,
          };
        } else {
          newCount++;
          return fetched;
        }
      });

      const finalAssets = [...mergedFigma, ...nonFigmaAssets];
      const now = new Date().toISOString();

      const resultsMap = new Map((data.sourcesResults || []).map((r: any) => [r.sourceId, r]));
      const updatedSources = (assetFigmaConfig.sources || []).map((s) => {
        const r: any = resultsMap.get(s.id);
        if (r) {
          return {
            ...s,
            nodeName: r.nodeName || s.nodeName,
            fileKey: r.fileKey || s.fileKey,
            nodeId: r.nodeId || s.nodeId,
            lastSyncedAt: now,
            assetCount: r.importedCount,
          };
        }
        return s;
      });

      const updatedConfig: AssetFigmaConfig = {
        ...assetFigmaConfig,
        sources: updatedSources,
        lastSyncedAt: now,
      };

      set({ assets: finalAssets, assetFigmaConfig: updatedConfig });
      if (currentOrg && currentProject) {
        await saveProjectAssets(currentOrg.id, currentProject.id, finalAssets);
        await saveProjectAssetFigmaConfig(currentOrg.id, currentProject.id, updatedConfig);
      }

      addToast({
        type: "success",
        title: "All Figma Sources Synchronized",
        message: `Synced ${fetchedAssets.length} icons across ${enabledSources.length} sources (${newCount} new, ${updatedCount} updated).`,
      });
      return true;
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Figma Sync Failed",
        message: err.message || "Could not sync assets from Figma.",
      });
      return false;
    } finally {
      set({ isSyncingFigmaAssets: false });
    }
  },

  syncAssetsFromFigma: async (customConfig) => {
    return get().syncAllFigmaSources();
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

  membersSubTab: "members",
  setMembersSubTab: (tab) => set({ membersSubTab: tab }),

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
    const scopeOrgId = get().currentOrg?.id;
    const scopeProjectId = get().currentProject?.id;
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

      if (!isScopeActive(scopeOrgId, scopeProjectId)) return false;
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

      const activeProjId = localStorage.getItem("ts_active_project_id");
      if (activeProjId) {
        const projBranch = localStorage.getItem(`ts_project_branch_${activeProjId}`);
        if (projBranch) {
          parsedCreds.branch = projBranch;
        }
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
        "changelog",
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

      let savedActivities: UserActivityItem[] = [];
      try {
        const rawAct = localStorage.getItem("ts_user_activities");
        if (rawAct) savedActivities = JSON.parse(rawAct);
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
        userActivities: savedActivities,
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
    const canonical = canonicalizeTokenDocument(doc);
    const resolved = flattenAndResolveTokens(canonical, activeSet);
    const groups = extractThemeGroups(canonical);
    const savedGroupId = typeof window !== "undefined" ? localStorage.getItem("ts_active_group_id") : null;
    const defaultGroup =
      groups.find((g) => g && g.id === activeThemeGroupId) ||
      (savedGroupId ? groups.find((g) => g && g.id === savedGroupId) : null) ||
      groups.find((g) => g && typeof g.name === "string" && g.name.toLowerCase() === "theme") ||
      groups[0];

    // Synchronize loaded tokens with active Project in Cloud Firestore
    const { currentOrg, currentProject } = get();
    if (currentOrg && currentProject) {
      saveProjectTokens(currentOrg.id, currentProject.id, canonical, groups).catch(() => {});
    }

    set({
      rawTokens: canonical,
      originalTokens: JSON.parse(JSON.stringify(canonical)),
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
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot modify design tokens.",
      });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot modify design tokens.",
      });
      return;
    }
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

  resetDirtyState: () =>
    set({
      isDirty: false,
      hasRemoteChanges: false,
      originalTokens: JSON.parse(JSON.stringify(get().rawTokens)),
    }),

  addThemeOption: (params) => {
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot add theme options.",
      });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot edit theme groups.",
      });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot duplicate theme groups.",
      });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot delete theme groups.",
      });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot add design tokens.",
      });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot delete design tokens.",
      });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot duplicate design tokens.",
      });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot add token sets.",
      });
      return;
    }
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
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot delete token sets.",
      });
      return;
    }
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

  userActivities: [],

  logUserActivity: (act) => {
    const newActivity: UserActivityItem = {
      ...act,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    set((state) => {
      const updated = [newActivity, ...state.userActivities].slice(0, 100);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_user_activities", JSON.stringify(updated));
        } catch {}
      }
      return { userActivities: updated };
    });
  },

  clearUserActivities: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("ts_user_activities");
      } catch {}
    }
    set({ userActivities: [] });
  },
};
});
