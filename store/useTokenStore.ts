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
  LogActivityInput,
  ProjectBranch,
  BranchCommit,
  BranchComment,
  BranchChangeItem,
} from "@/types/tokens";
import {
  ProjectDocumentation,
  DocPage,
  DocFolder,
  DocBlock,
  createEmptyDocumentation,
} from "@/types/documentation";
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
import { extractThemeGroups, canonicalizeTokenDocument, getActiveThemeSets } from "@/utils/themeHelpers";
import { computeTokensDiff, DocumentDiffSummary } from "@/utils/tokenDiff";
import {
  Organization,
  Project,
  OrganizationMember,
  OrganizationInvitation,
  UserRole,
  ROLE_DEFINITIONS,
  ProjectAsset,
  AssetFolder,
  AssetType,
  AssetGitConfig,
  AssetFigmaConfig,
  FigmaSourceLink,
} from "@/types/tenant";
import {
  getUserOrganizations,
  getOrgProjects,
  getOrgProjectSummaries,
  checkOrganizationNameAvailable,
  checkProjectNameAvailable,
  createOrganization,
  createProject,
  saveProjectTokens,
  saveProjectGitConfig,
  saveProjectFigmaVariables,
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
  saveProjectDocumentation,
  logOrganizationActivity,
  getOrganizationActivities,
  saveProjectBranches,
  ensureProjectDefaultBranch,
  sanitizeProjectsForCache,
  safeSetCachedProjects,
  getProject,
  saveProjectSchemas,
} from "@/services/organizationService";
import { DEFAULT_ENABLED_SCHEMA_IDS } from "@/data/schemaCatalog";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface TokenStoreState {
  // Multi-Tenant Identity & Scope
  currentUser: { uid: string; email: string; displayName?: string; avatarUrl?: string } | null;
  isLoadingTenant: boolean;
  isLoadingProjects: boolean;
  isLoadingProjectData: boolean;
  userOrgs: Organization[];
  currentOrg: Organization | null;
  orgProjects: Project[];
  currentProject: Project | null;
  syncTargetProject: Project | null;
  pendingInvitations: OrganizationInvitation[];
  pendingInvitePrompt: OrganizationInvitation | null;
  activeInviteToken: string | null;

  setCurrentUser: (user: { uid: string; email: string; displayName?: string; avatarUrl?: string } | null) => void;
  signOutUser: () => Promise<void>;
  setCurrentOrg: (org: Organization | null) => void;
  setCurrentProject: (project: Project | null, options?: { skipHydration?: boolean }) => void;
  setSyncTargetProject: (project: Project | null) => void;
  setActiveInviteToken: (token: string | null) => void;
  setPendingInvitePrompt: (inv: OrganizationInvitation | null) => void;
  loadTenantData: (uid: string, email?: string) => Promise<void>;
  /** @internal Do not call directly \u2014 use loadTenantData, which dedupes concurrent invocations. */
  __runLoadTenantData: (uid: string, email?: string) => Promise<void>;
  createOrgAction: (name: string, icon?: string, color?: string, logoUrl?: string) => Promise<Organization | null>;
  updateOrgAction: (orgId: string, updates: { name?: string; slug?: string; icon?: string; color?: string; logoUrl?: string }) => Promise<Organization | null>;
  deleteOrgAction: (orgId: string) => Promise<void>;
  createProjectAction: (name: string, description?: string, icon?: string, color?: string, logoUrl?: string) => Promise<Project | null>;
  updateProjectAction: (orgId: string, projectId: string, updates: { name?: string; description?: string; icon?: string; color?: string; logoUrl?: string; isArchived?: boolean }) => Promise<Project | null>;
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

  assets: ProjectAsset[];
  assetFolders: AssetFolder[];
  activeFolderId: string | null;
  setActiveFolderId: (folderId: string | null) => void;
  createAssetFolder: (name: string, description?: string, icon?: string, color?: string) => Promise<AssetFolder>;
  updateAssetFolder: (folderId: string, updates: Partial<AssetFolder>) => Promise<void>;
  deleteAssetFolder: (folderId: string, moveContentsToFolderId?: string | null) => Promise<void>;
  moveAssetsToFolder: (assetIds: string[], targetFolderId: string | null) => Promise<void>;
  assetGitConfig: AssetGitConfig | null;
  assetFigmaConfig: AssetFigmaConfig | null;
  isSyncingAssets: boolean;
  isSyncingFigmaAssets: boolean;
  isLoadingAssets: boolean;
  r2StorageError: string | null;
  refreshAssets: () => Promise<void>;
  setAssets: (assets: ProjectAsset[]) => void;
  uploadAssets: (
    newAssets: Array<{
      id?: string;
      name: string;
      title?: string;
      type?: string;
      tag?: string;
      category?: string;
      folderId?: string;
      assetType?: AssetType;
      svg?: string;
      content?: string;
      contentType?: string;
    }>
  ) => Promise<void>;
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
  setFigmaPat: (pat: string, project?: Project) => Promise<AssetFigmaConfig>;
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
  activeThemeOptionIds: Record<string, string>;
  setActiveThemeGroup: (groupId: string) => void;
  setActiveThemeOption: (optionId: string) => void;
  setActiveThemeOptionForGroup: (groupId: string, optionId: string) => void;

  // Native Branch System
  branches: ProjectBranch[];
  activeBranch: string;
  createBranchAction: (params: { title: string; name: string; description?: string; basedOn?: string }) => Promise<ProjectBranch>;
  switchBranchAction: (branchName: string) => Promise<void>;
  deleteBranchAction: (branchName: string) => Promise<void>;
  mergeBranchAction: (sourceBranch: string, targetBranch: string) => Promise<void>;
  commitToActiveBranchAction: (message: string) => Promise<void>;
  addBranchCommentAction: (branchName: string, text: string) => Promise<void>;
  resolveBranchCommentAction: (branchName: string, commentId: string) => Promise<void>;

  // Theme Mode (light/dark/system)
  themeMode: "light" | "dark" | "system";
  setThemeMode: (mode: "light" | "dark" | "system") => void;

  // Sidebar Tab
  sidebarTab:
    | "dashboard"
    | "projects"
    | "workspaces"
    | "variables"
    | "tokens"
    | "themes"
    | "branches"
    | "documentation"
    | "assets"
    | "exports"
    | "releases"
    | "mcp"
    | "project-settings"
    | "members"
    | "org-settings"
    | "changelog"
    | "extensions"
    | "system-docs";
  setSidebarTab: (
    tab:
      | "dashboard"
      | "projects"
      | "workspaces"
      | "variables"
      | "tokens"
      | "themes"
      | "branches"
      | "documentation"
      | "assets"
      | "exports"
      | "releases"
      | "mcp"
      | "project-settings"
      | "members"
      | "org-settings"
      | "changelog"
      | "extensions"
      | "system-docs"
  ) => void;
  projectSettingsTab: "details" | "sync";
  setProjectSettingsTab: (tab: "details" | "sync") => void;
  membersSubTab: "members" | "invites" | "activity";
  setMembersSubTab: (tab: "members" | "invites" | "activity") => void;

  // Releases, Compilers & Distribution Targets
  releases: ReleasePackage[];
  activeReleaseId: string | null;
  distributionTargets: DistributionTarget[];
  compilerConfig: CompilerConfig;
  createRelease: (pkg: ReleasePackage) => void;
  deleteRelease: (id: string) => void;
  toggleDeprecateRelease: (id: string, reason?: string) => void;
  setActiveReleaseId: (id: string | null) => void;
  addDistributionTarget: (target: DistributionTarget) => void;
  updateDistributionTarget: (id: string, target: Partial<DistributionTarget>) => void;
  deleteDistributionTarget: (id: string) => void;
  updateCompilerConfig: (config: Partial<CompilerConfig>) => void;
  publishReleaseToTargets: (releaseId: string, targetIds?: string[]) => Promise<TargetPublishResult[]>;

  // Living Documentation System
  documentation: ProjectDocumentation | null;
  activeDocPageId: string | null;
  activeDocFolderId: string | null;
  isDocEditing: boolean;
  selectedDocBlockId: string | null;
  setActiveDocPageId: (pageId: string | null) => void;
  setActiveDocFolderId: (folderId: string | null) => void;
  setIsDocEditing: (isEditing: boolean) => void;
  setSelectedDocBlockId: (blockId: string | null) => void;
  addDocFolder: (title: string) => Promise<DocFolder>;
  updateDocFolder: (folderId: string, updates: Partial<DocFolder>) => Promise<void>;
  deleteDocFolder: (folderId: string) => Promise<void>;
  addDocPage: (title: string, folderId?: string | null) => Promise<DocPage>;
  updateDocPage: (pageId: string, updates: Partial<DocPage>) => Promise<void>;
  deleteDocPage: (pageId: string) => Promise<void>;
  addDocBlock: (pageId: string, block: Omit<DocBlock, "id">, insertIndex?: number) => Promise<DocBlock>;
  updateDocBlock: (pageId: string, blockId: string, updates: Partial<DocBlock>) => Promise<void>;
  deleteDocBlock: (pageId: string, blockId: string) => Promise<void>;
  reorderDocBlocks: (pageId: string, blocks: DocBlock[]) => Promise<void>;
  publishDocPage: (pageId: string, isPublished: boolean) => Promise<void>;
  publishEntireDocumentation: (isPublishedGlobally: boolean, allowPublicAccess?: boolean) => Promise<void>;

  // View Mode & Filters
  viewMode: "sets" | "matrix" | "flow";
  setViewMode: (mode: "sets" | "matrix" | "flow") => void;
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
  cloudSaveStatus: "synced" | "saving" | "error" | "offline";
  lastCloudSaveTime: string | null;
  setCloudSaveStatus: (status: "synced" | "saving" | "error" | "offline", time?: string) => void;

  // Actions
  initializeFromStorage: () => Promise<void> | void;
  fetchLiveTokens: (customCreds?: GitCredentials) => Promise<boolean>;
  setRawTokens: (doc: RawTokensDocument, meta?: SyncMeta) => void;
  setSyncMeta: (meta: SyncMeta | null) => void;
  setResolvedTokens: (tokens: FlattenedToken[]) => void;
  updateSingleToken: (path: string[], newValue: any) => void;
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
  logUserActivity: (activity: LogActivityInput) => void;
  loadOrganizationActivities: (orgId: string) => Promise<void>;
  clearUserActivities: () => void;
  addThemeOption: (params: {
    groupId: string;
    name: string;
    color?: string;
    description?: string;
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
  renameToken: (setName: string, oldPath: string[], newName: string) => void;
  deleteToken: (setName: string, tokenPath: string[]) => void;
  duplicateToken: (setName: string, tokenPath: string[], newName: string) => void;
  addNewSet: (setName: string) => void;
  renameSet: (oldSetName: string, newSetName: string) => void;
  deleteSet: (setName: string) => void;
  renameFolder: (oldFolderPrefix: string, newFolderPrefix: string) => void;
  deleteFolder: (folderPrefix: string) => void;
  updateThemeOption: (
    groupId: string,
    optionId: string,
    updates: {
      name?: string;
      color?: string;
      description?: string;
      selectedTokenSets?: Record<string, "enabled" | "disabled" | "source">;
      figmaVariableReferences?: Record<string, string>;
      figmaCollectionId?: string;
      figmaModeId?: string;
    }
  ) => void;
  deleteThemeOption: (groupId: string, optionId: string) => void;
  initializeBlankWorkspace: () => void;

  // Schema Marketplace & Extension State
  enabledSchemas: string[];
  toggleSchemaAction: (schemaId: string) => Promise<void>;
  setSchemasEnabledAction: (schemaIds: string[], enabled: boolean) => Promise<void>;
  enableSchemaAction: (schemaId: string) => Promise<void>;
  disableSchemaAction: (schemaId: string) => Promise<void>;
  isSchemaEnabled: (schemaId: string) => boolean;
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

function buildDefaultActiveOptionIds(
  groups: ThemeGroup[],
  existing: Record<string, string> = {}
): Record<string, string> {
  const result: Record<string, string> = { ...existing };
  groups.forEach((g) => {
    if (!result[g.id] || !g.options.some((o) => o.id === result[g.id])) {
      if (g.options.length > 0) {
        result[g.id] = g.options[0].id;
      }
    }
  });
  return result;
}

function resolveTokensWithActiveThemes(
  doc: RawTokensDocument,
  activeSet: string,
  themeGroups: ThemeGroup[],
  activeThemeOptionIds: Record<string, string>
): FlattenedToken[] {
  const themeConfig = getActiveThemeSets(themeGroups, activeThemeOptionIds, doc);
  return flattenAndResolveTokens(doc, activeSet, themeConfig);
}

// Client-side in-memory SWR cache for project assets & configuration (0ms reloads)
const projectAssetsCache = new Map<string, ProjectAsset[]>();
const projectConfigCache = new Map<string, any>();

// Dedupes concurrent loadTenantData invocations for the same user (e.g. Supabase's
// getSession() fast-path racing with its onAuthStateChange initial-session fire),
// so the "restore active project from localStorage" step can't run twice and
// clobber a project the user has since opened.
let tenantDataLoadState: { uid: string; promise: Promise<void> } | null = null;

const INVITE_TOKEN_STORAGE_KEY = "ts_pending_invite_token";

function clearStoredInviteToken(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
  } catch {}
}

function cacheHydratedProject(project: Project): void {
  if (typeof window === "undefined") return;

  try {
    const cacheKey = `ts_cached_org_projects_${project.orgId}`;
    const cached = localStorage.getItem(cacheKey);
    const parsed = cached ? JSON.parse(cached) : [];
    const existingProjects = Array.isArray(parsed)
      ? parsed.filter((item: Project) => item.id !== project.id)
      : [];
    safeSetCachedProjects(project.orgId, [...existingProjects, project]);
  } catch {
    safeSetCachedProjects(project.orgId, [project]);
  }
}

function getCachedHydratedProject(orgId: string, projectId: string): Project | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(`ts_cached_org_projects_${orgId}`);
    const parsed = cached ? JSON.parse(cached) : [];
    if (!Array.isArray(parsed)) return null;
    return parsed.find((project: Project) => project.id === projectId && project.rawTokens !== undefined) || null;
  } catch {
    return null;
  }
}

function cacheProjectList(orgId: string, projects: Project[]): void {
  if (typeof window === "undefined") return;

  try {
    const cached = localStorage.getItem(`ts_cached_org_projects_${orgId}`);
    const parsed = cached ? JSON.parse(cached) : [];
    const cachedProjects = Array.isArray(parsed) ? parsed : [];
    const cachedFullProjects = new Map(
      cachedProjects
        .filter((project: Project) => project.rawTokens !== undefined)
        .map((project: Project) => [project.id, project])
    );
    const mergedProjects = projects.map((project) => {
      const cachedProject = cachedFullProjects.get(project.id);
      return cachedProject ? { ...cachedProject, ...project } : project;
    });
    safeSetCachedProjects(orgId, mergedProjects);
  } catch {
    safeSetCachedProjects(orgId, projects);
  }
}

export const useTokenStore = create<TokenStoreState>((set, get) => {
  let scopeSwitchVersion = 0;
  let isCheckingRemoteUpdates = false;
  let lastRemoteCheckTimestamp = 0;
  const isScopeActive = (orgId?: string, projectId?: string) => {
    if (!orgId || !projectId) return false;
    const { currentOrg, currentProject } = get();
    return currentOrg?.id === orgId && currentProject?.id === projectId;
  };

  /**
  * Persists asset metadata and files through the R2-backed asset API.
   * This is the single abstraction point for all asset write operations.
   *
   * @param orgId       - Organization ID
   * @param projectId   - Project ID
   * @param assets      - Full asset array to persist
   * @param replaceAll  - If true, replace the entire R2 metadata index (used by sync operations)
   */
  const persistAssetsToStorage = async (
    orgId: string,
    projectId: string,
    assets: ProjectAsset[],
    replaceAll = false
  ): Promise<void> => {
    try {
      if (!replaceAll) {
        // Lightweight metadata update via /api/assets/list without re-uploading file binaries
        const res = await fetch("/api/assets/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            projectId,
            action: "update-metadata",
            updates: assets.map((a) => ({
              id: a.id,
              name: a.name,
              title: a.title,
              type: a.type,
              tag: a.tag,
              category: a.category,
              folderId: a.folderId,
              assetType: a.assetType,
            })),
          }),
        });
        if (res.ok) return;
      }

      // Attempt R2 storage first (full sync/replaceAll)
      const r2Assets = assets.map((a) => ({
        id: a.id,
        name: a.name,
        title: a.title || a.name,
        type: a.type,
        tag: a.tag,
        category: a.category && a.category !== "general" ? a.category : undefined,
        folderId: a.folderId,
        assetType: a.assetType,
        content: a.svg || "", // SVG content for upload
        contentType: a.contentType || "image/svg+xml",
        source: a.source,
        path: a.path,
        figmaNodeId: a.figmaNodeId,
        figmaUrl: a.figmaUrl,
        figmaSourceId: a.figmaSourceId,
        figmaSourceName: a.figmaSourceName,
      }));

      const res = await fetch("/api/assets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          projectId,
          assets: r2Assets,
          replaceAll,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Update in-memory assets with R2 URLs
          if (data.assets && Array.isArray(data.assets)) {
            const urlMap = new Map<string, string>(data.assets.map((a: any) => [a.id, a.url]));
            const updatedAssets = assets.map((a) => ({
              ...a,
              url: (urlMap.get(a.id) || a.url) as string | undefined,
              contentType: a.contentType || "image/svg+xml",
            }));
            const cacheKey = `${orgId}::${projectId}`;
            projectAssetsCache.set(cacheKey, updatedAssets);
            set({ assets: updatedAssets });
          }
          return;
        }
        throw new Error(data.error || "R2 asset upload failed");
      }

      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `R2 asset upload failed (${res.status})`);
    } catch (err) {
      console.error("[R2 Storage Error]: Failed to persist assets to Cloudflare R2:", err);
      throw err;
    }
  };

  /**
   * Loads assets strictly from Cloudflare R2 via /api/assets/list.
   * This is the single abstraction point for all asset read operations.
   */
  const loadAssetsFromStorage = async (
    orgId: string,
    projectId: string
  ): Promise<ProjectAsset[]> => {
    const cacheKey = `${orgId}::${projectId}`;
    try {
      const res = await fetch("/api/assets/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, projectId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.assets)) {
          set({ r2StorageError: null });
          const mapped: ProjectAsset[] = data.assets.map((a: any) => ({
            id: a.id,
            name: a.name,
            title: a.title,
            type: a.type,
            tag: a.tag,
            category: a.category,
            folderId: a.folderId,
            assetType: a.assetType,
            url: a.url,
            contentType: a.contentType || "image/svg+xml",
            size: a.size,
            svg: a.svg, // preserved for 0ms instant vector rendering
            path: a.path,
            updatedAt: a.updatedAt,
            source: a.source || "upload",
            figmaNodeId: a.figmaNodeId,
            figmaUrl: a.figmaUrl,
            figmaSourceId: a.figmaSourceId,
            figmaSourceName: a.figmaSourceName,
          }));
          projectAssetsCache.set(cacheKey, mapped);
          return mapped;
        }
      } else {
        const data = await res.json().catch(() => ({}));
        const errMessage = data.error || (res.status === 503
          ? "Cloudflare R2 storage is not configured on this deployment. Missing R2 environment variables in Vercel."
          : `Failed to load assets (${res.status})`);
        console.warn("[R2 Storage Warning]:", errMessage);
        set({ r2StorageError: errMessage });
      }

      return projectAssetsCache.get(cacheKey) || [];
    } catch (err: any) {
      console.error("[R2 Storage Error]: Failed to load assets from Cloudflare R2:", err);
      set({ r2StorageError: err.message || "Failed to connect to Cloudflare R2 storage." });
      return projectAssetsCache.get(cacheKey) || [];
    }
  };

  /**
   * Deletes assets from R2 storage by ID.
   * Falls back silently if R2 is not configured.
   */
  const deleteAssetsFromStorage = async (
    orgId: string,
    projectId: string,
    assetIds: string[]
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/assets/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, projectId, assetIds }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const cacheKey = `${orgId}::${projectId}`;
          const current = projectAssetsCache.get(cacheKey) || [];
          const updated = current.filter((a) => !assetIds.includes(a.id));
          projectAssetsCache.set(cacheKey, updated);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  /**
   * Loads asset configuration (Git sync & Figma sync settings) from Cloudflare R2.
   */
  const loadAssetConfigFromStorage = async (
    orgId: string,
    projectId: string
  ): Promise<{
    assetGitConfig?: AssetGitConfig | null;
    assetFigmaConfig?: AssetFigmaConfig | null;
    folders?: AssetFolder[];
  } | null> => {
    const cacheKey = `${orgId}::${projectId}`;
    try {
      const res = await fetch(
        `/api/assets/config?orgId=${encodeURIComponent(orgId)}&projectId=${encodeURIComponent(projectId)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 503 && data.error) {
          set({ r2StorageError: data.error });
        }
        return projectConfigCache.get(cacheKey) || null;
      }
      const data = await res.json();
      if (data.success && data.config) {
        projectConfigCache.set(cacheKey, data.config);
        return data.config;
      }
      return projectConfigCache.get(cacheKey) || null;
    } catch (err) {
      console.error("[R2 Config Error]: Failed to load asset configuration from R2:", err);
      return projectConfigCache.get(cacheKey) || null;
    }
  };

  /**
   * Saves asset configuration updates directly to Cloudflare R2.
   */
  const saveAssetConfigToStorage = async (
    orgId: string,
    projectId: string,
    updates: {
      assetGitConfig?: AssetGitConfig | null;
      assetFigmaConfig?: AssetFigmaConfig | null;
      folders?: AssetFolder[];
      assetsCount?: number;
    }
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/assets/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, projectId, ...updates }),
      });
      return res.ok;
    } catch (err) {
      console.error("[R2 Config Error]: Failed to save asset configuration to R2:", err);
      return false;
    }
  };

  const updateProjectInMemoryAndCache = (
    updatedBranches?: ProjectBranch[],
    updatedTokens?: RawTokensDocument,
    updatedThemes?: ThemeGroup[],
    newActiveBranch?: string
  ) => {
    const { currentOrg, currentProject, orgProjects } = get();
    if (!currentOrg || !currentProject) return;

    const updatedProj: Project = {
      ...currentProject,
      ...(updatedBranches ? { branches: updatedBranches } : {}),
      ...(updatedTokens !== undefined ? { rawTokens: updatedTokens } : {}),
      ...(updatedThemes ? { themeGroups: updatedThemes } : {}),
      ...(newActiveBranch ? { activeBranch: newActiveBranch } : {}),
      updatedAt: new Date().toISOString(),
    };

    const updatedOrgProjects = orgProjects.map((p) =>
      p.id === currentProject.id ? updatedProj : p
    );

    set({
      currentProject: updatedProj,
      orgProjects: updatedOrgProjects,
    });

    if (typeof window !== "undefined") {
      try {
        cacheProjectList(currentOrg.id, updatedOrgProjects);
        if (updatedBranches) {
          localStorage.setItem(`ts_project_branches_${currentProject.id}`, JSON.stringify(updatedBranches));
        }
        if (newActiveBranch) {
          localStorage.setItem(`ts_project_branch_${currentProject.id}`, newActiveBranch);
          localStorage.setItem("ts_active_branch", newActiveBranch);
        }
      } catch {}
    }
  };

  const persistTokensChange = (doc: RawTokensDocument, groups?: ThemeGroup[]) => {
    const { currentOrg, currentProject, branches, activeBranch } = get();
    if (currentOrg && currentProject) {
      set({ cloudSaveStatus: "saving" });
      saveProjectTokens(currentOrg.id, currentProject.id, doc, groups)
        .then(() => {
          set({ cloudSaveStatus: "synced", lastCloudSaveTime: new Date().toISOString() });
        })
        .catch(() => {
          set({ cloudSaveStatus: "error" });
        });
      const projectBranches = branches && branches.length > 0 ? branches : ensureProjectDefaultBranch(currentProject);
      const updatedBranches = projectBranches.map((b) =>
        b.name === activeBranch
          ? {
              ...b,
              rawTokens: doc,
              themeGroups: groups || b.themeGroups,
              updatedAt: new Date().toISOString(),
            }
          : b
      );
      saveProjectBranches(currentOrg.id, currentProject.id, updatedBranches, activeBranch).catch(() => {});
      set({ branches: updatedBranches });
      updateProjectInMemoryAndCache(updatedBranches, doc, groups || currentProject.themeGroups);
    }
  };

  /** Build an org+project-scoped localStorage key to prevent cross-context data leaks */
  const getScopedKey = (base: string, orgId?: string, projectId?: string): string => {
    if (orgId && projectId) return `${base}__${orgId}__${projectId}`;
    if (orgId) return `${base}__${orgId}`;
    return base;
  };

  /** Restore scoped localStorage data (releases, targets, config, activities) for the active project */
  const restoreScopedProjectData = (orgId: string, projId: string) => {
    if (typeof window === "undefined") return;
    try {
      let releases: ReleasePackage[] = [];
      const rawRel = localStorage.getItem(getScopedKey("ts_releases_history", orgId, projId));
      if (rawRel) releases = JSON.parse(rawRel);

      if (releases.length === 0) {
        const storeRaw = get().rawTokens;
        const tokenKeys = Object.keys(storeRaw || {}).filter((k) => !k.startsWith("$"));
        if (tokenKeys.length > 0) {
          const curUser = get().currentUser;
          const author = curUser
            ? {
                uid: curUser.uid,
                name: curUser.displayName || curUser.email?.split("@")[0] || "Studio Member",
                email: curUser.email || undefined,
                avatarUrl: curUser.avatarUrl || undefined,
              }
            : { name: "Studio Member" };

          const count = get().resolvedTokens.length || 634;
          const initialRel: ReleasePackage = {
            id: `rel-initial`,
            version: "v1.0.0",
            title: "initial-release",
            summary: "initial release",
            notes: "Initial Release",
            createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            author,
            branch: "main",
            tokenCount: count,
            themesCount: get().themeGroups.reduce((acc, g) => acc + g.options.length, 0),
            changesCount: count,
            targetSystems: ["Tailwind CSS", "CSS Variables", "SCSS Variables", "React / TS"],
            rawTokensSnapshot: JSON.parse(JSON.stringify(storeRaw)),
            themeGroupsSnapshot: JSON.parse(JSON.stringify(get().themeGroups)),
            artifacts: [
              { name: "Manifest", filename: "manifest.json", size: "610 B", bytes: 610, type: "manifest" },
              { name: "Raw JSON", filename: "tokens.json", size: "184 KB", bytes: 188416, type: "raw_json" },
            ],
            cssVariables: {
              root: "",
              themes: {},
              allCombined: "",
            },
            styleDictionary: {
              configJson: "{}",
              tokensJson: "{}",
              css: "",
              scss: "",
              esmJs: "",
              dts: "",
              tailwindConfig: "{}",
              reactTs: "",
              flutterDart: "",
              iosSwift: "",
              androidColorsXml: "",
              androidDimensXml: "",
            },
          };
          releases = [initialRel];
          try {
            localStorage.setItem(getScopedKey("ts_releases_history", orgId, projId), JSON.stringify(releases));
          } catch {}
        }
      }

      let targets = get().distributionTargets;
      const rawTargets = localStorage.getItem(getScopedKey("ts_distribution_targets", orgId, projId));
      if (rawTargets) targets = JSON.parse(rawTargets);
      else targets = [];

      let config = DEFAULT_COMPILER_CONFIG;
      const rawCfg = localStorage.getItem(getScopedKey("ts_compiler_config", orgId, projId));
      if (rawCfg) config = { ...DEFAULT_COMPILER_CONFIG, ...JSON.parse(rawCfg) };

      let activities: UserActivityItem[] = [];
      const rawAct = localStorage.getItem(getScopedKey("ts_user_activities", orgId, projId));
      if (rawAct) activities = JSON.parse(rawAct);

      set({
        releases,
        activeReleaseId: releases[0]?.id || null,
        distributionTargets: targets,
        compilerConfig: config,
        userActivities: activities,
      });
    } catch {}
  };

  const getSidebarTabWithoutProject = (): TokenStoreState["sidebarTab"] => {
    const tab = get().sidebarTab;
    switch (tab) {
      case "dashboard":
      case "projects":
      case "members":
      case "org-settings":
      case "workspaces":
      case "project-settings":
        return tab;
      default:
        return "dashboard";
    }
  };

  return {
  currentUser: null,
  isLoadingTenant: true,
  isLoadingProjects: false,
  isLoadingProjectData: false,
  userOrgs: [],
  currentOrg: null,
  orgProjects: [],
  currentProject: null,
  syncTargetProject: null,
  pendingInvitations: [],
  pendingInvitePrompt: null,
  activeInviteToken: null,

  // Living Documentation Initial State
  documentation: null,
  activeDocPageId: null,
  activeDocFolderId: null,
  isDocEditing: false,
  selectedDocBlockId: null,
  setActiveDocPageId: (pageId) => set({ activeDocPageId: pageId, selectedDocBlockId: null }),
  setActiveDocFolderId: (folderId) => set({ activeDocFolderId: folderId }),
  setIsDocEditing: (isEditing) => set({ isDocEditing: isEditing }),
  setSelectedDocBlockId: (blockId) => set({ selectedDocBlockId: blockId }),

  setActiveInviteToken: (token) => {
    if (!token) clearStoredInviteToken();
    set({ activeInviteToken: token });
  },
  setPendingInvitePrompt: (inv) => {
    if (!inv) {
      clearStoredInviteToken();
      set({ pendingInvitePrompt: null, activeInviteToken: null });
      return;
    }
    set({ pendingInvitePrompt: inv });
  },

  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user?.uid) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_tokens_platform_user", JSON.stringify(user));
        } catch {}
      }
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
        currentUser: null,
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
          localStorage.removeItem("ts_tokens_platform_user");
          localStorage.removeItem("ts_second_screen_user");
          sessionStorage.removeItem("ts_tokens_platform_pat");
          localStorage.removeItem("ts_tokens_platform_pat_enc");
          localStorage.removeItem("ts_active_org_id");
          localStorage.removeItem("ts_active_project_id");
        } catch {}
      }
    }
  },

  signOutUser: async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("Client signOut warning:", e);
    }
    try {
      await fetch("/api/v1/auth/signout", { method: "POST" });
    } catch (e) {
      console.warn("Server signout endpoint warning:", e);
    }
    get().setCurrentUser(null);
  },

  getCurrentUserRole: () => {
    const { currentOrg, currentUser } = get();
    if (!currentUser) {
      return isSupabaseConfigured ? "viewer" : "admin";
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
    const previousOrgId = get().currentOrg?.id;

    // 1. Synchronously inspect cache for target org to prevent UI flashing
    let cachedProjects: Project[] = [];
    if (org && typeof window !== "undefined") {
      try {
        const cachedStr = localStorage.getItem(`ts_cached_org_projects_${org.id}`);
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedProjects = parsed;
          }
        }
      } catch {}
    }

    set({
      currentOrg: org,
      syncTargetProject: previousOrgId === org?.id ? get().syncTargetProject : null,
      orgProjects: cachedProjects,
      isLoadingProjects: Boolean(org),
      currentProject: null,
      isLoadingProjectData: false,
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
      // Reset local-only state so previous org/project data doesn't leak
      releases: [],
      activeReleaseId: null,
      distributionTargets: [],
      compilerConfig: DEFAULT_COMPILER_CONFIG,
      userActivities: [],
    });
    if (previousOrgId !== org?.id && typeof window !== "undefined") {
      try {
        localStorage.removeItem("ts_sync_target_project_id");
      } catch {}
    }

    if (org) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_active_org_id", org.id);
          localStorage.removeItem("ts_active_project_id");
        } catch {}
      }

      // 2. Fetch fresh projects from service (in-flight deduplicated)
      const projects = await getOrgProjectSummaries(org.id);
      if (switchVersion !== scopeSwitchVersion || get().currentOrg?.id !== org.id) return;

      const finalProjects = projects.length > 0 ? projects : cachedProjects;
      const currentProj = get().currentProject;
      let updatedCurrentProject = currentProj;
      if (currentProj) {
        const found = finalProjects.find((p) => p.id === currentProj.id);
        if (found) {
          updatedCurrentProject = found;
          if (found.rawTokens && Object.keys(found.rawTokens).length > 0) {
            get().setRawTokens(found.rawTokens);
          }
        }
      }
      set({ orgProjects: finalProjects, isLoadingProjects: false, currentProject: updatedCurrentProject });

      get().loadInvitations(org.id);
      get().loadOrganizationActivities(org.id);
    }
  },

  setCurrentProject: (proj, options) => {
    if (proj && get().currentOrg && proj.orgId !== get().currentOrg?.id) return;
    const previousState = get();
    const isSameProject = previousState.currentProject?.id === proj?.id;
    const previousThemeGroupId = isSameProject ? previousState.activeThemeGroupId : "";
    const previousThemeOptionIds = isSameProject ? previousState.activeThemeOptionIds : {};
    const switchVersion = ++scopeSwitchVersion;
    const isProjectSettings = get().sidebarTab === "project-settings" || Boolean(options?.skipHydration);
    const needsProjectHydration = !options?.skipHydration && !isProjectSettings && Boolean(proj && proj.rawTokens === undefined);

    set({
      currentProject: proj,
      cloudSaveStatus: "synced",
      lastCloudSaveTime: proj?.updatedAt || new Date().toISOString(),
      isLoadingProjectData: needsProjectHydration,
      rawTokens: {},
      originalTokens: {},
      resolvedTokens: [],
      themeGroups: [],
      activeThemeGroupId: "",
      activeThemeOptionId: "",
      branches: [],
      activeBranch: "main",
      isDirty: false,
      hasRemoteChanges: false,
      lastFetchedSha: null,
      syncStatus: "idle",
      syncError: null,
      syncMeta: null,
      figmaVariables: null,
      figmaResolvedVariables: [],
      figmaUpdatedAt: null,
      figmaMeta: null,
      assets: [],
      assetFolders: [],
      activeFolderId: null,
      assetGitConfig: null,
      assetFigmaConfig: null,
      credentials: DEFAULT_CREDENTIALS,
      // Reset local-only state so previous project data doesn't leak
      releases: [],
      activeReleaseId: null,
      distributionTargets: [],
      compilerConfig: DEFAULT_COMPILER_CONFIG,
      userActivities: [],
    });

    if (proj) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_active_project_id", proj.id);
        } catch {}
      }

      // 1. Native Branches & Token Dictionary
      let projectBranches = ensureProjectDefaultBranch(proj);
      if (typeof window !== "undefined") {
        try {
          const cachedBranches = localStorage.getItem(`ts_project_branches_${proj.id}`);
          if (cachedBranches) {
            const parsed = JSON.parse(cachedBranches);
            if (Array.isArray(parsed) && parsed.length > 0) {
              projectBranches = parsed;
            }
          }
        } catch {}
      }

      // If the project has a configured Git branch, ensure it is registered in projectBranches
      const configuredGitBranch = proj.gitConfig?.branch;
      if (configuredGitBranch && !projectBranches.some((b) => b.name === configuredGitBranch)) {
        projectBranches.push({
          id: `branch_${proj.id}_${configuredGitBranch.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
          name: configuredGitBranch,
          title: configuredGitBranch,
          description: `Linked to remote Git branch ${configuredGitBranch}`,
          isDefault: false,
          createdAt: proj.createdAt || new Date().toISOString(),
          updatedAt: proj.updatedAt || new Date().toISOString(),
          rawTokens: proj.rawTokens || {},
          themeGroups: proj.themeGroups || [],
          commits: [],
          comments: [],
        });
      }

      let activeBranchName =
        proj.activeBranch ||
        (configuredGitBranch && projectBranches.some((b) => b.name === configuredGitBranch) ? configuredGitBranch : null) ||
        "main";

      if (typeof window !== "undefined") {
        try {
          const savedBranch =
            localStorage.getItem(`ts_project_branch_${proj.id}`) ||
            localStorage.getItem("ts_active_branch");
          if (savedBranch && projectBranches.some((b) => b.name === savedBranch)) {
            activeBranchName = savedBranch;
          }
        } catch {}
      }
      const activeBranchObj =
        projectBranches.find((b) => b.name === activeBranchName) ||
        (configuredGitBranch ? projectBranches.find((b) => b.name === configuredGitBranch) : null) ||
        projectBranches[0];

      let initialTokens =
        activeBranchObj && activeBranchObj.rawTokens && Object.keys(activeBranchObj.rawTokens).length > 0
          ? activeBranchObj.rawTokens
          : proj.rawTokens && Object.keys(proj.rawTokens).length > 0
          ? proj.rawTokens
          : {};

      if (activeBranchObj) {
        activeBranchObj.rawTokens = initialTokens;
      }

      const initialThemes =
        activeBranchObj && activeBranchObj.themeGroups !== undefined && activeBranchObj.themeGroups.length > 0
          ? activeBranchObj.themeGroups
          : proj.themeGroups !== undefined && proj.themeGroups.length > 0
          ? proj.themeGroups
          : Object.keys(initialTokens).length > 0
          ? extractThemeGroups(initialTokens)
          : [];
      const activeThemeOptionIds = buildDefaultActiveOptionIds(initialThemes, previousThemeOptionIds);
      let savedThemeGroupId = "";
      if (typeof window !== "undefined") {
        try {
          savedThemeGroupId = localStorage.getItem("ts_active_group_id") || "";
        } catch {}
      }
      const preferredThemeGroupId = previousThemeGroupId || savedThemeGroupId;
      const activeThemeGroup =
        initialThemes.find((group) => group.id === preferredThemeGroupId) ||
        initialThemes.find((group) => group.name.toLowerCase() === "theme") ||
        initialThemes[0];
      const activeThemeOptionId = activeThemeGroup
        ? activeThemeOptionIds[activeThemeGroup.id] || activeThemeGroup.options[0]?.id || ""
        : "";

      set({
        branches: projectBranches,
        activeBranch: activeBranchObj?.name || activeBranchName || "main",
      });

      // 1b. Git Provider Connection (if configured)
      const hasProjectGitProvider = Boolean(
        proj.gitConfig?.provider &&
        proj.gitConfig.owner &&
        proj.gitConfig.repo &&
        proj.gitConfig.branch
      );

      if (hasProjectGitProvider) {
        const gitConfig = proj.gitConfig!;
        let branchToUse = gitConfig.branch;
        if (typeof window !== "undefined") {
          const savedBranch = localStorage.getItem(`ts_project_branch_${proj.id}`);
          if (savedBranch) {
            branchToUse = savedBranch;
          }
        }
        let pat = gitConfig.pat || "";
        if (!pat && typeof window !== "undefined") {
          pat =
            sessionStorage.getItem("ts_tokens_platform_pat") ||
            localStorage.getItem("ts_tokens_platform_pat_enc") ||
            sessionStorage.getItem("ts_second_screen_pat") ||
            localStorage.getItem("ts_second_screen_pat_enc") ||
            "";
        }
        set({
          credentials: {
            ...DEFAULT_CREDENTIALS,
            ...gitConfig,
            pat,
            branch: branchToUse || gitConfig.branch || DEFAULT_CREDENTIALS.branch,
          },
        });
      } else {
        set({
          credentials: {
            ...DEFAULT_CREDENTIALS,
            branch: activeBranchObj?.name || "main",
          },
        });
      }

      // Hydrate Tokens & Themes
      if (initialTokens && Object.keys(initialTokens).length > 0) {
        get().setRawTokens(initialTokens);
        set({
          themeGroups: initialThemes,
          activeThemeGroupId: activeThemeGroup?.id || "",
          activeThemeOptionId,
          activeThemeOptionIds,
          originalTokens: JSON.parse(JSON.stringify(initialTokens)),
          isDirty: false,
        });
      } else {
        set({
          rawTokens: {},
          originalTokens: {},
          resolvedTokens: [],
          themeGroups: initialThemes || [],
          activeThemeGroupId: activeThemeGroup?.id || "",
          activeThemeOptionId,
          activeThemeOptionIds,
          syncMeta: null,
          isDirty: false,
        });

        // If tokens are not yet in memory/cache, fetch the full project document directly from Supabase
        if (needsProjectHydration && proj.orgId && proj.id && isSupabaseConfigured) {
          getProject(proj.orgId, proj.id).then((freshProj) => {
            if (get().currentProject?.id !== proj.id || switchVersion !== scopeSwitchVersion) return;
            if (!freshProj) {
              const cachedProject = getCachedHydratedProject(proj.orgId, proj.id);
              if (cachedProject) {
                get().setCurrentProject(cachedProject);
                return;
              }
              set({ isLoadingProjectData: false });
              return;
            }

            const hydratedProject = { ...proj, ...freshProj };
            cacheHydratedProject(hydratedProject);
            get().setCurrentProject(hydratedProject);

            const activeCredentials = get().credentials;
            if (
              activeCredentials?.provider &&
              activeCredentials?.owner &&
              activeCredentials?.repo &&
              activeCredentials?.branch &&
              activeCredentials?.pat
            ) {
              get().fetchLiveTokens(activeCredentials);
            }
          }).catch(() => {
            if (get().currentProject?.id === proj.id && switchVersion === scopeSwitchVersion) {
              const cachedProject = getCachedHydratedProject(proj.orgId, proj.id);
              if (cachedProject) {
                get().setCurrentProject(cachedProject);
                return;
              }
              set({ isLoadingProjectData: false });
            }
          });
        }
      }

      // Hydrate Enabled Schemas
      const activeSchemas = Array.isArray(proj.enabledSchemas) && proj.enabledSchemas.length > 0
        ? proj.enabledSchemas
        : DEFAULT_ENABLED_SCHEMA_IDS;
      set({ enabledSchemas: activeSchemas });

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

      const docToUse =
        proj.documentation || createEmptyDocumentation();

      const rawFigmaVars = proj.figmaVariables || null;
      const resolvedFigmaVars =
        rawFigmaVars && Object.keys(rawFigmaVars).length > 0
          ? flattenAndResolveTokens(rawFigmaVars, "ALL")
          : [];

      const cacheKey = `${proj.orgId}::${proj.id}`;
      const cachedAssets = projectAssetsCache.get(cacheKey) || proj.assets || [];
      const cachedConfig = projectConfigCache.get(cacheKey);

      set({
        figmaVariables: rawFigmaVars,
        figmaResolvedVariables: resolvedFigmaVars,
        figmaUpdatedAt: proj.figmaUpdatedAt || null,
        figmaMeta: proj.figmaMeta || null,
        assets: cachedAssets,
        assetFolders: cachedConfig?.folders || proj.assetFolders || [],
        activeFolderId: null,
        assetGitConfig: cachedConfig?.assetGitConfig !== undefined ? cachedConfig.assetGitConfig : (proj.assetGitConfig || null),
        assetFigmaConfig: cachedConfig?.assetFigmaConfig !== undefined ? cachedConfig.assetFigmaConfig : normalizedFigmaConfig,
        documentation: docToUse,
        activeDocPageId: docToUse.pages[0]?.id || null,
        activeDocFolderId: null,
        isSyncingAssets: false,
        isSyncingFigmaAssets: false,
        isLoadingAssets: cachedAssets.length === 0,
      });

      if (!isProjectSettings && !options?.skipHydration) {
        // Hydrate assets from R2
        loadAssetsFromStorage(proj.orgId, proj.id).then((loadedAssets) => {
          if (!isScopeActive(proj.orgId, proj.id)) return;
          set({
            assets: loadedAssets,
            isLoadingAssets: false,
          });
        });

        // Hydrate asset configs (Git, Figma, Folders) from R2
        loadAssetConfigFromStorage(proj.orgId, proj.id).then((r2Config) => {
          if (!isScopeActive(proj.orgId, proj.id) || !r2Config) return;
          if (r2Config.assetGitConfig !== undefined) {
            set({ assetGitConfig: r2Config.assetGitConfig });
          }
          if (r2Config.assetFigmaConfig !== undefined) {
            set({ assetFigmaConfig: r2Config.assetFigmaConfig });
          }
          if (r2Config.folders !== undefined) {
            set({ assetFolders: r2Config.folders });
          }
        });

        // 4. Restore scoped localStorage data (releases, targets, config, activities)
        const scopeOrgId = get().currentOrg?.id;
        if (scopeOrgId) {
          restoreScopedProjectData(scopeOrgId, proj.id);
          get().loadOrganizationActivities(scopeOrgId);
        }
      }
    } else {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("ts_active_project_id");
        } catch {}
      }
    }
  },

  setSyncTargetProject: (project) => {
    if (project && get().currentOrg && project.orgId !== get().currentOrg?.id) return;
    set({ syncTargetProject: project });
    if (typeof window !== "undefined") {
      try {
        if (project) {
          localStorage.setItem("ts_sync_target_project_id", project.id);
        } else {
          localStorage.removeItem("ts_sync_target_project_id");
        }
      } catch {}
    }
    if (!project) return;

    loadAssetConfigFromStorage(project.orgId, project.id).then((config) => {
      const currentTarget = get().syncTargetProject;
      if (currentTarget?.id !== project.id || config?.assetFigmaConfig === undefined) return;
      set({
        syncTargetProject: {
          ...currentTarget,
          assetFigmaConfig: config.assetFigmaConfig,
        },
      });
    });
  },

  loadTenantData: async (uid, email) => {
    if (tenantDataLoadState && tenantDataLoadState.uid === uid) {
      return tenantDataLoadState.promise;
    }
    const promise = get().__runLoadTenantData(uid, email);
    tenantDataLoadState = { uid, promise };
    try {
      await promise;
    } finally {
      if (tenantDataLoadState?.promise === promise) {
        tenantDataLoadState = null;
      }
    }
  },

  __runLoadTenantData: async (uid, email) => {
    // 1. Instant Cache Hydration: If cached tenant orgs and projects exist in localStorage, restore them immediately
    if (typeof window !== "undefined") {
      try {
        const cachedOrgsStr = localStorage.getItem("ts_cached_user_orgs");
        const savedOrgId = localStorage.getItem("ts_active_org_id");
        if (cachedOrgsStr) {
          const cachedOrgs: Organization[] = JSON.parse(cachedOrgsStr);
          if (Array.isArray(cachedOrgs) && cachedOrgs.length > 0) {
            let activeOrg = cachedOrgs[0];
            if (savedOrgId) {
              const found = cachedOrgs.find((o) => o.id === savedOrgId);
              if (found) activeOrg = found;
            }
            set({ userOrgs: cachedOrgs, currentOrg: activeOrg });

            const cachedProjectsStr = localStorage.getItem(`ts_cached_org_projects_${activeOrg.id}`);
            const savedProjId = localStorage.getItem("ts_active_project_id");
            const isSyncSettings = get().sidebarTab === "project-settings" && get().projectSettingsTab === "sync";
            if (cachedProjectsStr) {
              const cachedProjects: Project[] = JSON.parse(cachedProjectsStr);
              if (Array.isArray(cachedProjects) && cachedProjects.length > 0) {
                set({ orgProjects: cachedProjects, isLoadingProjects: true });
                const savedSyncTargetId = localStorage.getItem("ts_sync_target_project_id") || (isSyncSettings ? savedProjId : null);
                const cachedSyncTarget = cachedProjects.find((project) => project.id === savedSyncTargetId);
                if (cachedSyncTarget) get().setSyncTargetProject(cachedSyncTarget);
                let activeProj: Project | null = null;
                if (savedProjId && !isSyncSettings) {
                  const found = cachedProjects.find((p) => p.id === savedProjId);
                  if (found) activeProj = found;
                }
                if (isSyncSettings) localStorage.removeItem("ts_active_project_id");
                if (activeProj) {
                  get().setCurrentProject(activeProj);
                } else {
                  set({
                    currentProject: null,
                    sidebarTab: getSidebarTabWithoutProject(),
                  });
                }
              } else {
                set({ isLoadingProjects: true });
              }
            } else {
              set({ isLoadingProjects: true });
            }
            // Immediately unblock loading screen so UI renders instantly
            set({ isLoadingTenant: false });
          }
        }
      } catch {}
    }

    if (!get().currentOrg) {
      set({ isLoadingTenant: true, isLoadingProjects: true });
    }

    // 2. Fetch fresh tenant data in parallel/background
    try {
      const savedOrgId = typeof window !== "undefined" ? localStorage.getItem("ts_active_org_id") : null;
      // Concurrently query organizations and projects for active org ID
      const orgsPromise = getUserOrganizations(uid, email);
      const earlyProjectsPromise = savedOrgId ? getOrgProjectSummaries(savedOrgId) : null;

      const [orgsResult, earlyProjectsResult] = await Promise.allSettled([
        orgsPromise,
        earlyProjectsPromise || Promise.resolve([]),
      ]);

      const orgs = orgsResult.status === "fulfilled" ? orgsResult.value : [];
      if (typeof window !== "undefined" && orgs.length > 0) {
        try {
          localStorage.setItem("ts_cached_user_orgs", JSON.stringify(orgs));
        } catch {}
      }
      set({ userOrgs: orgs });

      let activeOrg = orgs[0] || null;
      if (savedOrgId) {
        const found = orgs.find((o) => o.id === savedOrgId);
        if (found) activeOrg = found;
      }
      // Resolve any pending invitation before the UI decides between a workspace and onboarding.
      try {
        const inviteToken = get().activeInviteToken;
        const [tokenInv, emailInvs] = await Promise.all([
          inviteToken ? getInvitationByToken(inviteToken) : Promise.resolve(null),
          email ? getPendingInvitationsForEmail(email) : Promise.resolve([]),
        ]);
        const pendingInv = tokenInv && tokenInv.status === "pending" ? tokenInv : emailInvs[0];
        if (pendingInv) set({ pendingInvitePrompt: pendingInv });
      } catch (inviteErr) {
        console.warn("Failed resolving pending invitations:", inviteErr);
      }

      set({ currentOrg: activeOrg });

      if (activeOrg) {
        // Use early parallel result if activeOrg matches savedOrgId, otherwise fetch for activeOrg
        let projects: Project[] = [];
        if (
          savedOrgId === activeOrg.id &&
          earlyProjectsResult.status === "fulfilled" &&
          Array.isArray(earlyProjectsResult.value) &&
          earlyProjectsResult.value.length > 0
        ) {
          projects = earlyProjectsResult.value;
        } else {
          projects = await getOrgProjectSummaries(activeOrg.id);
        }

        set({ orgProjects: projects, isLoadingProjects: false });
        const isSyncSettings = get().sidebarTab === "project-settings" && get().projectSettingsTab === "sync";
        const savedActiveProjectId = typeof window !== "undefined" ? localStorage.getItem("ts_active_project_id") : null;
        const savedSyncTargetId = typeof window !== "undefined"
          ? localStorage.getItem("ts_sync_target_project_id")
          : null;
        const syncTarget = projects.find((project) => project.id === (savedSyncTargetId || (isSyncSettings ? savedActiveProjectId : null)));
        if (syncTarget) {
          get().setSyncTargetProject(syncTarget);
        } else if (savedSyncTargetId) {
          get().setSyncTargetProject(null);
        }
        if (isSyncSettings && typeof window !== "undefined") {
          localStorage.removeItem("ts_active_project_id");
        }

        let activeProj: Project | null = null;
        const savedProjId = isSyncSettings ? null : savedActiveProjectId;
        if (savedProjId) {
          const cachedCurrentProject = get().currentProject;
          const found = cachedCurrentProject?.id === savedProjId &&
            cachedCurrentProject.orgId === activeOrg.id &&
            cachedCurrentProject.rawTokens !== undefined
            ? cachedCurrentProject
            : projects.find((p) => p.id === savedProjId);
          if (found) activeProj = found;
        }

        if (activeProj) {
          get().setCurrentProject(activeProj);
          const activeCreds = get().credentials;
          if (
            activeProj.rawTokens !== undefined &&
            activeCreds?.provider &&
            activeCreds?.owner &&
            activeCreds?.repo &&
            activeCreds?.branch &&
            activeCreds?.pat
          ) {
            get().fetchLiveTokens(activeCreds);
          }
        } else {
          set({
            currentProject: null,
            isLoadingProjectData: false,
            sidebarTab: getSidebarTabWithoutProject(),
          });
        }
        get().loadInvitations(activeOrg.id);
      } else {
        set({ isLoadingProjects: false });
      }
    } catch (e) {
      console.warn("Error loading tenant data:", e);
      set({ isLoadingProjects: false, isLoadingProjectData: false });
    } finally {
      set({ isLoadingTenant: false, isLoadingProjects: false });
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

      get().logUserActivity({
        type: "team",
        title: "Team Member Invited",
        description: `Sent invitation to ${email} as ${role}.`,
        metadata: {
          inviteeEmail: email,
          role,
        },
      });

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
        clearStoredInviteToken();
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

        get().logUserActivity({
          type: "team",
          title: "Joined Workspace",
          description: `${currentUser.displayName || currentUser.email} accepted invitation and joined organization.`,
          orgId: updatedOrg.id,
        });

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

      get().logUserActivity({
        type: "team",
        title: "Team Member Removed",
        description: `Removed member ${memberEmailOrUid} from organization.`,
        metadata: {
          member: memberEmailOrUid,
        },
      });
    } catch (e) {
      console.warn("Error removing member:", e);
    }
  },

  createOrgAction: async (name, icon, color, logoUrl) => {
    const { currentUser, addToast } = get();
    if (!currentUser) return null;
    const trimmed = name.trim();
    if (!trimmed) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Organization name cannot be empty.",
      });
      return null;
    }

    const check = await checkOrganizationNameAvailable(trimmed);
    if (!check.available) {
      addToast({
        type: "error",
        title: "Organization Name Taken",
        message: check.error || `An organization with the name "${trimmed}" already exists.`,
      });
      return null;
    }

    try {
      const newOrg = await createOrganization(
        trimmed,
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
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_cached_user_orgs", JSON.stringify(orgs));
        } catch {}
      }
      get().setCurrentOrg(newOrg);
      return newOrg;
    } catch (e: any) {
      console.warn("Failed creating org:", e);
      addToast({
        type: "error",
        title: "Creation Failed",
        message: e.message || "Failed to create organization.",
      });
      return null;
    }
  },

  updateOrgAction: async (orgId, updates) => {
    const { addToast } = get();
    if (updates.name) {
      const trimmed = updates.name.trim();
      const check = await checkOrganizationNameAvailable(trimmed, orgId);
      if (!check.available) {
        addToast({
          type: "error",
          title: "Organization Name Taken",
          message: check.error || `An organization with the name "${trimmed}" already exists.`,
        });
        throw new Error(check.error || `An organization with the name "${trimmed}" already exists.`);
      }
    }
    try {
      const existingOrg = get().userOrgs.find((org) => org.id === orgId);
      const name = updates.name ? updates.name.trim() : existingOrg?.name;
      const slug =
        updates.slug !== undefined
          ? updates.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-")
          : updates.name
          ? String(updates.name).toLowerCase().replace(/[^a-z0-9-]/g, "-")
          : undefined;
      const orgUpdates = {
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {}),
        ...(updates.icon !== undefined ? { icon: updates.icon } : {}),
        ...(updates.color !== undefined ? { color: updates.color } : {}),
        ...(updates.logoUrl !== undefined ? { logoUrl: updates.logoUrl } : {}),
      };
      await updateOrganization(orgId, orgUpdates);
      const updatedOrgs = get().userOrgs.map((o) =>
        o.id === orgId ? { ...o, ...orgUpdates, updatedAt: new Date().toISOString() } : o
      );
      set({ userOrgs: updatedOrgs });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_cached_user_orgs", JSON.stringify(updatedOrgs));
        } catch {}
      }
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
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ts_cached_user_orgs", JSON.stringify(remaining));
        } catch {}
      }
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
    const { currentOrg, currentUser, addToast } = get();
    if (!currentOrg) return null;
    const trimmed = name.trim();
    if (!trimmed) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Project name cannot be empty.",
      });
      return null;
    }

    const check = await checkProjectNameAvailable(currentOrg.id, trimmed);
    if (!check.available) {
      addToast({
        type: "error",
        title: "Project Name Taken",
        message: check.error || `A project named "${trimmed}" already exists in ${currentOrg.name}.`,
      });
      return null;
    }

    try {
      const newProj = await createProject(
        currentOrg.id,
        trimmed,
        description,
        {},
        currentUser?.displayName,
        icon,
        color,
        logoUrl
      );
      const projs = [...get().orgProjects.filter((p) => p.id !== newProj.id), newProj];
      set({ orgProjects: projs });
      if (typeof window !== "undefined") {
        try {
          cacheProjectList(currentOrg.id, projs);
        } catch {}
      }
      get().setCurrentProject(newProj);
      set({ sidebarTab: "tokens" });
      return newProj;
    } catch (e: any) {
      console.warn("Failed creating project:", e);
      addToast({
        type: "error",
        title: "Creation Failed",
        message: e.message || "Failed to create project.",
      });
      return null;
    }
  },

  updateProjectAction: async (orgId, projectId, updates) => {
    const { addToast } = get();
    if (updates.name) {
      const trimmed = updates.name.trim();
      const check = await checkProjectNameAvailable(orgId, trimmed, projectId);
      if (!check.available) {
        addToast({
          type: "error",
          title: "Project Name Taken",
          message: check.error || `A project named "${trimmed}" already exists in this organization.`,
        });
        throw new Error(check.error || `A project named "${trimmed}" already exists in this organization.`);
      }
    }
    try {
      const slug = updates.name ? String(updates.name).toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined;
      const projectUpdates: any = {
        ...(updates.name ? { name: updates.name.trim(), slug } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.icon ? { icon: updates.icon } : {}),
        ...(updates.color ? { color: updates.color } : {}),
        ...(updates.logoUrl !== undefined ? { logoUrl: updates.logoUrl } : {}),
        ...(updates.isArchived !== undefined ? { isArchived: updates.isArchived } : {}),
      };
      await updateProject(orgId, projectId, projectUpdates);
      const updatedProjects = get().orgProjects.map((p) =>
        p.id === projectId ? { ...p, ...projectUpdates, updatedAt: new Date().toISOString() } : p
      );
      set({ orgProjects: updatedProjects });
      if (typeof window !== "undefined") {
        try {
          cacheProjectList(orgId, updatedProjects);
        } catch {}
      }
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
      if (typeof window !== "undefined") {
        try {
          cacheProjectList(orgId, remaining);
        } catch {}
      }
      if (get().currentProject?.id === projectId) {
        const nextProj = remaining[0] || null;
        get().setCurrentProject(nextProj);
      }
    } catch (e) {
      console.warn("Failed deleting project:", e);
      throw e;
    }
  },

  enabledSchemas: DEFAULT_ENABLED_SCHEMA_IDS,
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
      const targetProject = state.syncTargetProject || state.currentProject;

      if (typeof window !== "undefined") {
        try {
          if (targetProject?.id && updated.branch) {
            localStorage.setItem(`ts_project_branch_${targetProject.id}`, updated.branch);
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

      // Persist to project in Supabase if available
      if (state.currentOrg && targetProject) {
        const updatedProject = {
          ...targetProject,
          gitConfig: {
            ...(targetProject.gitConfig || {}),
            ...updated,
          },
        };
        saveProjectGitConfig(state.currentOrg.id, targetProject.id, updatedProject.gitConfig);

        const updatedOrgProjects = state.orgProjects.map((p) =>
          p.id === targetProject.id ? updatedProject : p
        );

        return {
          credentials: updated,
          currentProject: state.currentProject?.id === targetProject.id ? updatedProject : state.currentProject,
          syncTargetProject: state.syncTargetProject?.id === targetProject.id ? updatedProject : state.syncTargetProject,
          orgProjects: updatedOrgProjects,
        };
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

  branches: [],
  activeBranch: "main",
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

  assets: [],
  assetFolders: [],
  activeFolderId: null,
  assetGitConfig: null,
  assetFigmaConfig: null,
  isSyncingAssets: false,
  isSyncingFigmaAssets: false,
  isLoadingAssets: false,
  r2StorageError: null,

  setActiveFolderId: (activeFolderId) => set({ activeFolderId }),

  createAssetFolder: async (name, description, icon, color) => {
    const { currentOrg, currentProject, assetFolders, addToast } = get();
    const now = new Date().toISOString();
    const newFolder: AssetFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      description: description?.trim() || undefined,
      icon: icon || "Folder",
      color: color || "blue",
      createdAt: now,
      updatedAt: now,
    };
    const updatedFolders = [...assetFolders, newFolder];
    set({ assetFolders: updatedFolders });
    if (currentOrg && currentProject) {
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { folders: updatedFolders });
    }
    addToast({
      type: "success",
      title: "Folder Created",
      message: `Created folder "${newFolder.name}".`,
    });
    return newFolder;
  },

  updateAssetFolder: async (folderId, updates) => {
    const { currentOrg, currentProject, assetFolders, addToast } = get();
    const now = new Date().toISOString();
    const updatedFolders = assetFolders.map((f) => (f.id === folderId ? { ...f, ...updates, updatedAt: now } : f));
    set({ assetFolders: updatedFolders });
    if (currentOrg && currentProject) {
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { folders: updatedFolders });
    }
    addToast({
      type: "success",
      title: "Folder Updated",
      message: "Folder settings saved.",
    });
  },

  deleteAssetFolder: async (folderId, moveContentsToFolderId) => {
    const { currentOrg, currentProject, assetFolders, assets, activeFolderId, addToast } = get();
    const targetFolder = assetFolders.find((f) => f.id === folderId);
    const updatedFolders = assetFolders.filter((f) => f.id !== folderId);
    const now = new Date().toISOString();
    const updatedAssets = assets.map((a) => {
      if (a.folderId === folderId) {
        return { ...a, folderId: moveContentsToFolderId || undefined, updatedAt: now };
      }
      return a;
    });
    const nextActive = activeFolderId === folderId ? null : activeFolderId;
    set({ assetFolders: updatedFolders, assets: updatedAssets, activeFolderId: nextActive });
    if (currentOrg && currentProject) {
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { folders: updatedFolders });
      await persistAssetsToStorage(currentOrg.id, currentProject.id, updatedAssets);
    }
    addToast({
      type: "info",
      title: "Folder Deleted",
      message: `Deleted folder "${targetFolder?.name || ""}".`,
    });
  },

  moveAssetsToFolder: async (assetIds, targetFolderId) => {
    const { currentOrg, currentProject, assets, addToast } = get();
    const idSet = new Set(assetIds);
    const now = new Date().toISOString();
    const updated = assets.map((a) => {
      if (idSet.has(a.id)) {
        return { ...a, folderId: targetFolderId || undefined, updatedAt: now };
      }
      return a;
    });
    set({ assets: updated });
    if (currentOrg && currentProject) {
      try {
        await fetch("/api/assets/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: currentOrg.id,
            projectId: currentProject.id,
            action: "move-folder",
            assetIds,
            targetFolderId,
          }),
        });
      } catch (err) {
        console.error("Failed to persist move-folder to R2:", err);
      }
    }
    addToast({
      type: "success",
      title: "Assets Moved",
      message: `Moved ${assetIds.length} asset${assetIds.length > 1 ? "s" : ""} to target folder.`,
    });
  },

  refreshAssets: async () => {
    const { currentOrg, currentProject } = get();
    if (!currentOrg || !currentProject) return;
    set({ isLoadingAssets: true, r2StorageError: null });
    try {
      const loaded = await loadAssetsFromStorage(currentOrg.id, currentProject.id);
      if (isScopeActive(currentOrg.id, currentProject.id)) {
        set({ assets: loaded });
      }
      const config = await loadAssetConfigFromStorage(currentOrg.id, currentProject.id);
      if (config && isScopeActive(currentOrg.id, currentProject.id)) {
        if (config.assetGitConfig !== undefined) set({ assetGitConfig: config.assetGitConfig });
        if (config.assetFigmaConfig !== undefined) set({ assetFigmaConfig: config.assetFigmaConfig });
        if (config.folders !== undefined) set({ assetFolders: config.folders });
      }
    } finally {
      set({ isLoadingAssets: false });
    }
  },

  setAssets: (assets) => set({ assets }),

  uploadAssets: async (newAssets) => {
    if (!get().canUserEdit()) {
      get().addToast({ type: "info", title: "Read-Only Access", message: "Viewer role cannot upload assets." });
      return;
    }
    const { currentOrg, currentProject, assets, activeFolderId, addToast } = get();
    const now = new Date().toISOString();
    const created: ProjectAsset[] = newAssets.map((a, i) => ({
      id: a.id || `asset_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      name: a.name,
      title: a.title || a.name,
      type: a.type || undefined,
      tag: a.tag || undefined,
      category: a.category && a.category !== "general" ? a.category : undefined,
      folderId: a.folderId !== undefined ? a.folderId : (activeFolderId || undefined),
      assetType: a.assetType,
      svg: a.svg,
      contentType: a.contentType || (a.svg ? "image/svg+xml" : undefined),
      updatedAt: now,
      source: "upload",
    }));
    const updated = [...created, ...assets];
    set({ assets: updated });
    if (currentOrg && currentProject) {
      const r2Payload = newAssets.map((a, idx) => ({
        ...created[idx],
        content: a.content || a.svg || "",
      }));
      try {
        const BATCH_SIZE = 10;
        const allUploadedAssets: any[] = [];
        for (let i = 0; i < r2Payload.length; i += BATCH_SIZE) {
          const slice = r2Payload.slice(i, i + BATCH_SIZE);
          const res = await fetch("/api/assets/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId: currentOrg.id,
              projectId: currentProject.id,
              assets: slice,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.assets && Array.isArray(data.assets)) {
              allUploadedAssets.push(...data.assets);
            }
          }
        }
        if (allUploadedAssets.length > 0) {
          const urlMap = new Map<string, string>(allUploadedAssets.map((x: any) => [x.id, x.url]));
          const finalized = updated.map((asset) => ({
            ...asset,
            url: (urlMap.get(asset.id) || asset.url) as string | undefined,
          }));
          set({ assets: finalized });
        }
      } catch (err) {
        console.error("Failed uploading assets to R2:", err);
      }
    }

    addToast({
      type: "success",
      title: "Assets Uploaded",
      message: `Successfully uploaded ${created.length} asset${created.length > 1 ? "s" : ""}.`,
    });

    get().logUserActivity({
      type: "asset",
      title: "Assets Uploaded",
      description: `Uploaded ${created.length} SVG asset${created.length > 1 ? "s" : ""} to project.`,
      metadata: {
        count: created.length,
        source: "upload",
      },
    });

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
        await persistAssetsToStorage(currentOrg.id, currentProject.id, updated);
      }

      get().logUserActivity({
        type: "asset",
        title: "Asset Metadata Applied",
        description: `Applied JSON metadata to ${updatedCount} icon${updatedCount > 1 ? "s" : ""}.`,
        metadata: {
          updatedCount,
        },
      });

      addToast({
        type: "success",
        title: "Metadata Applied",
        message: `Updated metadata for ${updatedCount} icon${updatedCount > 1 ? "s" : ""}.`,
      });
    }
  },

  updateAsset: async (id, updates) => {
    const { currentOrg, currentProject, assets, addToast } = get();
    const targetAsset = assets.find((a) => a.id === id);
    const updated = assets.map((a) =>
      a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
    );
    set({ assets: updated });
    if (currentOrg && currentProject) {
      await persistAssetsToStorage(currentOrg.id, currentProject.id, updated);
    }

    if (targetAsset) {
      get().logUserActivity({
        type: "asset",
        title: "Asset Updated",
        description: `Updated asset "${targetAsset.title || targetAsset.name}".`,
        metadata: {
          assetName: targetAsset.name,
          ...updates,
        },
      });
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
      await persistAssetsToStorage(currentOrg.id, currentProject.id, updated);
    }

    get().logUserActivity({
      type: "asset",
      title: "Bulk Assets Updated",
      description: `Updated metadata for ${ids.length} icon${ids.length > 1 ? "s" : ""}.`,
      metadata: {
        count: ids.length,
      },
    });

    addToast({
      type: "success",
      title: "Metadata Updated",
      message: `Updated metadata for ${ids.length} icon${ids.length > 1 ? "s" : ""}.`,
    });
  },

  deleteAsset: async (id) => {
    const { currentOrg, currentProject, assets, addToast } = get();
    const targetAsset = assets.find((a) => a.id === id);
    const updated = assets.filter((a) => a.id !== id);
    set({ assets: updated });
    if (currentOrg && currentProject) {
      await deleteAssetsFromStorage(currentOrg.id, currentProject.id, [id]);
    }

    if (targetAsset) {
      get().logUserActivity({
        type: "asset",
        title: "Asset Deleted",
        description: `Deleted asset "${targetAsset.title || targetAsset.name}".`,
        metadata: {
          assetName: targetAsset.name,
        },
      });
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
      await deleteAssetsFromStorage(currentOrg.id, currentProject.id, ids);
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
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetGitConfig: config });
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
        await persistAssetsToStorage(currentOrg.id, currentProject.id, merged, true);
      }

      get().logUserActivity({
        type: "git",
        title: "Git Assets Synchronized",
        description: `Synchronized ${fetchedAssets.length} SVG icon${fetchedAssets.length === 1 ? "" : "s"} from ${assetGitConfig.repo} (${assetGitConfig.branch}).`,
        metadata: {
          count: fetchedAssets.length,
          repo: assetGitConfig.repo,
          branch: assetGitConfig.branch,
          folder: assetGitConfig.assetFolder || "root",
        },
      });

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
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetGitConfig: updated });
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
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetGitConfig: null });
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
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetFigmaConfig: config });
    }
  },

  setFigmaPat: async (pat: string, project) => {
    const { currentOrg, currentProject, assetFigmaConfig, addToast } = get();
    const cleanPat = pat.trim();
    const targetProject = project || currentProject;
    let sourceConfig = project ? project.assetFigmaConfig : assetFigmaConfig;
    if (project && currentOrg) {
      const storedConfig = await loadAssetConfigFromStorage(currentOrg.id, project.id);
      if (storedConfig?.assetFigmaConfig !== undefined) {
        sourceConfig = storedConfig.assetFigmaConfig;
      }
    }
    const updated: AssetFigmaConfig = {
      pat: cleanPat,
      sources: sourceConfig?.sources || [],
      lastSyncedAt: sourceConfig?.lastSyncedAt,
      isPaused: sourceConfig?.isPaused || false,
    };
    set({ assetFigmaConfig: updated });
    if (currentOrg && targetProject) {
      await saveAssetConfigToStorage(currentOrg.id, targetProject.id, { assetFigmaConfig: updated });
    }
    addToast({
      type: "success",
      title: cleanPat ? "Figma Token Saved" : "Figma Token Cleared",
      message: cleanPat ? "Personal Access Token securely saved for all Figma sources." : "Figma Personal Access Token removed.",
    });
    return updated;
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
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetFigmaConfig: updatedConfig });
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
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetFigmaConfig: updatedConfig });
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
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetFigmaConfig: updatedConfig });
      if (removeAssets) {
        await persistAssetsToStorage(currentOrg.id, currentProject.id, updatedAssets);
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
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetFigmaConfig: updatedConfig });
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
      await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetFigmaConfig: updated });
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
        await persistAssetsToStorage(currentOrg.id, currentProject.id, finalAssets, true);
        await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetFigmaConfig: updatedConfig });
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
        await persistAssetsToStorage(currentOrg.id, currentProject.id, finalAssets, true);
        await saveAssetConfigToStorage(currentOrg.id, currentProject.id, { assetFigmaConfig: updatedConfig });
      }

      get().logUserActivity({
        type: "figma",
        title: "Figma Assets Synchronized",
        description: `Synced ${fetchedAssets.length} icons across ${enabledSources.length} Figma sources (${newCount} new, ${updatedCount} updated).`,
        metadata: {
          iconCount: fetchedAssets.length,
          sourceCount: enabledSources.length,
          newCount,
          updatedCount,
        },
      });

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
  activeThemeOptionIds: {},

  setActiveThemeGroup: (groupId) => {
    const { themeGroups, activeThemeOptionIds, rawTokens, activeSet } = get();
    const grp = themeGroups.find((g) => g.id === groupId);
    const chosenOption = activeThemeOptionIds[groupId] || grp?.options[0]?.id || "";
    const nextMap = {
      ...activeThemeOptionIds,
      ...(chosenOption ? { [groupId]: chosenOption } : {}),
    };
    const resolved = resolveTokensWithActiveThemes(rawTokens, activeSet, themeGroups, nextMap);
    set({
      activeThemeGroupId: groupId,
      activeThemeOptionId: chosenOption,
      activeThemeOptionIds: nextMap,
      resolvedTokens: resolved,
    });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_active_group_id", groupId);
      } catch { }
    }
  },

  setActiveThemeOption: (optionId) => {
    const { activeThemeGroupId, activeThemeOptionIds, themeGroups, rawTokens, activeSet } = get();
    const nextMap = activeThemeGroupId
      ? { ...activeThemeOptionIds, [activeThemeGroupId]: optionId }
      : activeThemeOptionIds;
    const resolved = resolveTokensWithActiveThemes(rawTokens, activeSet, themeGroups, nextMap);
    set({
      activeThemeOptionId: optionId,
      activeThemeOptionIds: nextMap,
      resolvedTokens: resolved,
    });
  },

  setActiveThemeOptionForGroup: (groupId: string, optionId: string) => {
    const { activeThemeGroupId, activeThemeOptionIds, themeGroups, rawTokens, activeSet } = get();
    const isCurrentActive = activeThemeOptionIds[groupId] === optionId;
    const nextMap = { ...activeThemeOptionIds };
    if (isCurrentActive) {
      delete nextMap[groupId];
    } else {
      nextMap[groupId] = optionId;
    }
    const resolved = resolveTokensWithActiveThemes(rawTokens, activeSet, themeGroups, nextMap);
    set({
      activeThemeOptionIds: nextMap,
      resolvedTokens: resolved,
      ...(groupId === activeThemeGroupId
        ? { activeThemeOptionId: isCurrentActive ? "" : optionId }
        : {}),
    });
  },

  viewMode: "sets",
  setViewMode: (mode) => {
    set({ viewMode: mode });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_view_mode", mode);
      } catch { }
    }
  },

  // Theme mode initialization (default is dark theme)
  themeMode: "dark",
  setThemeMode: (mode) => {
    set({ themeMode: mode });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_theme_mode", mode);
        // Apply/remove dark class on <html>
        const root = document.documentElement;
        const isDark =
          mode === "dark"
            ? true
            : mode === "light"
            ? false
            : window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (isDark) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      } catch { }
    }
  },

  sidebarTab: "dashboard",
  projectSettingsTab: "details",
  setSidebarTab: (tab) => {
    const currentProj = get().currentProject;
    set((state) => ({
      sidebarTab: tab,
      syncTargetProject: tab === "project-settings" ? state.syncTargetProject : null,
    }));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_sidebar_tab", tab);
        if (tab !== "project-settings") {
          localStorage.removeItem("ts_sync_target_project_id");
        }
      } catch { }
    }
    // If entering a token-bearing Studio tab and project tokens have not been hydrated yet, trigger hydration
    if (
      tab !== "project-settings" &&
      currentProj &&
      currentProj.rawTokens === undefined &&
      !get().isLoadingProjectData
    ) {
      get().setCurrentProject(currentProj);
    }
  },
  setProjectSettingsTab: (tab) => {
    set({ projectSettingsTab: tab });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_project_settings_tab", tab);
      } catch { }
    }
  },

  membersSubTab: "members",
  setMembersSubTab: (tab) => set({ membersSubTab: tab }),

  // Releases & Distribution Targets State
  releases: [],
  activeReleaseId: null,
  distributionTargets: [],
  createRelease: (pkg) => {
    set((state) => {
      const updated = [pkg, ...state.releases];
      if (typeof window !== "undefined") {
        try {
          const key = getScopedKey("ts_releases_history", state.currentOrg?.id, state.currentProject?.id);
          localStorage.setItem(key, JSON.stringify(updated));
        } catch { }
      }
      return { releases: updated, activeReleaseId: pkg.id };
    });

    get().logUserActivity({
      type: "release",
      title: "Release Package Published",
      description: `Created release package "${pkg.version}" (${pkg.title || "Production Bundle"}).`,
      metadata: {
        version: pkg.version,
        tokenCount: pkg.tokenCount,
        targets: pkg.targetSystems?.join(", ") || "Style Dictionary",
      },
    });
  },
  deleteRelease: (id) => {
    const targetRelease = get().releases.find((r) => r.id === id);
    set((state) => {
      const updated = state.releases.filter((r) => r.id !== id);
      if (typeof window !== "undefined") {
        try {
          const key = getScopedKey("ts_releases_history", state.currentOrg?.id, state.currentProject?.id);
          localStorage.setItem(key, JSON.stringify(updated));
        } catch { }
      }
      return {
        releases: updated,
        activeReleaseId: state.activeReleaseId === id ? (updated[0]?.id || null) : state.activeReleaseId,
      };
    });

    if (targetRelease) {
      get().logUserActivity({
        type: "release",
        title: "Release Package Deleted",
        description: `Deleted release package "${targetRelease.version}".`,
        metadata: {
          version: targetRelease.version,
        },
      });
    }
  },
  toggleDeprecateRelease: (id, reason) => {
    const state = get();
    const targetRelease = state.releases.find((r) => r.id === id);
    if (!targetRelease) return;

    const willBeDeprecated = !targetRelease.isDeprecated;
    const updated = state.releases.map((r) => {
      if (r.id !== id) return r;
      return {
        ...r,
        isDeprecated: willBeDeprecated,
        deprecationReason: willBeDeprecated ? (reason?.trim() || "Deprecated by project maintainer") : undefined,
        deprecatedAt: willBeDeprecated ? new Date().toISOString() : undefined,
        deprecatedBy: willBeDeprecated && state.currentUser ? {
          uid: state.currentUser.uid,
          name: state.currentUser.displayName || state.currentUser.email?.split("@")[0] || "User",
          email: state.currentUser.email,
        } : undefined,
      };
    });

    set({ releases: updated });
    if (typeof window !== "undefined") {
      try {
        const key = getScopedKey("ts_releases_history", state.currentOrg?.id, state.currentProject?.id);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch { }
    }

    get().logUserActivity({
      type: "release",
      title: willBeDeprecated ? "Release Deprecated" : "Release Restored",
      description: willBeDeprecated
        ? `Marked release "${targetRelease.version}" as deprecated.${reason ? ` Reason: ${reason}` : ""}`
        : `Restored release "${targetRelease.version}" from deprecated status.`,
      metadata: {
        version: targetRelease.version,
        isDeprecated: willBeDeprecated,
      },
    });
  },
  setActiveReleaseId: (id) => set({ activeReleaseId: id }),

  addDistributionTarget: (target) =>
    set((state) => {
      const updated = [...state.distributionTargets, target];
      if (typeof window !== "undefined") {
        try {
          const key = getScopedKey("ts_distribution_targets", state.currentOrg?.id, state.currentProject?.id);
          localStorage.setItem(key, JSON.stringify(updated));
        } catch { }
      }
      return { distributionTargets: updated };
    }),

  updateDistributionTarget: (id, target) =>
    set((state) => {
      const updated = state.distributionTargets.map((t) => (t.id === id ? { ...t, ...target } : t));
      if (typeof window !== "undefined") {
        try {
          const key = getScopedKey("ts_distribution_targets", state.currentOrg?.id, state.currentProject?.id);
          localStorage.setItem(key, JSON.stringify(updated));
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
          const cfgKey = getScopedKey("ts_compiler_config", state.currentOrg?.id, state.currentProject?.id);
          localStorage.setItem(cfgKey, JSON.stringify(updatedConfig));
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
            const relKey = getScopedKey("ts_releases_history", state.currentOrg?.id, state.currentProject?.id);
            localStorage.setItem(relKey, JSON.stringify(updatedReleases));
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
          const key = getScopedKey("ts_distribution_targets", state.currentOrg?.id, state.currentProject?.id);
          localStorage.setItem(key, JSON.stringify(updated));
        } catch { }
      }
      return { distributionTargets: updated };
    }),

  publishReleaseToTargets: async (releaseId, targetIds) => {
    const { releases, distributionTargets, credentials, currentOrg, currentProject } = get();
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
          orgId: currentOrg?.id,
          projectId: currentProject?.id,
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
  cloudSaveStatus: "synced",
  lastCloudSaveTime: null,
  setCloudSaveStatus: (status, time) =>
    set({
      cloudSaveStatus: status,
      ...(time !== undefined ? { lastCloudSaveTime: time } : {}),
    }),
  toasts: [],

  checkRemoteUpdates: async () => {
    const creds = get().credentials;
    const scopeOrgId = get().currentOrg?.id;
    const scopeProjectId = get().currentProject?.id;
    if (!creds.provider || !creds.owner || !creds.repo || !creds.branch || !creds.pat) {
      return false;
    }

    const now = Date.now();
    // Guard: Enforce 30s minimum cooldown between remote checks and prevent concurrent fetches
    if (isCheckingRemoteUpdates || now - lastRemoteCheckTimestamp < 30000) {
      return false;
    }

    isCheckingRemoteUpdates = true;
    lastRemoteCheckTimestamp = now;

    try {
      const res = await fetch("/api/git/check-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });

      if (!res.ok) {
        if (res.status === 403) {
          // Rate-limited: back off for 10 minutes before polling again
          lastRemoteCheckTimestamp = now + 600000;
        }
        return false;
      }
      const data = await res.json();
      if (!isScopeActive(scopeOrgId, scopeProjectId)) return false;
      if (data.success && data.latestSha) {
        const currentSha = get().lastFetchedSha;
        if (currentSha && data.latestSha !== currentSha) {
          if (!get().hasRemoteChanges) {
            set({ hasRemoteChanges: true });
          }
          return true;
        }
      }
      return false;
    } catch {
      return false;
    } finally {
      isCheckingRemoteUpdates = false;
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
        body: JSON.stringify({
          ...creds,
          lastCommitSha: get().lastFetchedSha || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to fetch live tokens from Git");
      }

      if (data.userProfile) {
        get().setUserProfile(data.userProfile);
      }

      if (!isScopeActive(scopeOrgId, scopeProjectId)) return false;
      const targetBranch = creds.branch || get().activeBranch;
      set({
        activeBranch: targetBranch,
        syncStatus: "success",
        syncError: null,
        lastFetchedSha: data.commitSha || null,
        hasRemoteChanges: false,
      });
      if (typeof window !== "undefined" && scopeProjectId && targetBranch) {
        try {
          localStorage.setItem(`ts_project_branch_${scopeProjectId}`, targetBranch);
          localStorage.setItem("ts_active_branch", targetBranch);
        } catch {}
      }
      get().setRawTokens(data.tokens, data.syncMeta);
      return true;
    } catch (err: any) {
      set({ syncStatus: "error", syncError: err.message });
      return false;
    }
  },

  initializeFromStorage: async () => {
    if (typeof window === "undefined") return;

    try {
      // 1. Purge any legacy token cache from localStorage so tokens are ALWAYS fresh in-memory
      localStorage.removeItem("ts_cached_tokens");
      localStorage.removeItem("ts_cached_meta");

      // 2. Credentials are NO LONGER restored from global localStorage.
      //    They are derived from the project's config in setCurrentProject.
      //    We only keep the PAT alive so it can be re-attached when the project loads.
      //    (PAT is intentionally global since users often share one PAT across projects.)

      // 3. Restore User Profile & View Mode
      const savedUser =
        localStorage.getItem("ts_tokens_platform_user") ||
        localStorage.getItem("ts_second_screen_user");
      const userProfile = savedUser ? JSON.parse(savedUser) : null;
      const savedViewMode = (localStorage.getItem("ts_view_mode") as "matrix" | "flow") || "matrix";

      // 4. Restore Theme Mode (light/dark/system)
      const savedTheme = localStorage.getItem("ts_theme_mode") as "light" | "dark" | "system" | null;
      let initialTheme: "light" | "dark" | "system" = "dark";
      if (savedTheme && (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system")) {
        initialTheme = savedTheme;
      }

      // Apply the theme class immediately
      if (typeof window !== "undefined") {
        const root = document.documentElement;
        const isDark =
          initialTheme === "dark"
            ? true
            : initialTheme === "light"
            ? false
            : window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (isDark) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }

      // 5. Restore Active Sidebar Tab and Tokens View Mode
      const validTabs = [
        "dashboard",
        "projects",
        "variables",
        "tokens",
        "themes",
        "documentation",
        "assets",
        "exports",
        "releases",
        "branches",
        "mcp",
        "project-settings",
        "members",
        "org-settings",
        "changelog",
        "extensions",
        "system-docs",
        "workspaces",
      ];
      const savedTab = localStorage.getItem("ts_sidebar_tab");
      const isLegacySyncTab = ["integrations", "sync", "project-sync"].includes(savedTab || "");
      const currentTab = get().sidebarTab;
      const initialTab: any =
        isLegacySyncTab
          ? "project-settings"
          : currentTab && validTabs.includes(currentTab)
          ? currentTab
          : savedTab && validTabs.includes(savedTab)
          ? savedTab
          : "dashboard";
      const savedProjectSettingsTab = localStorage.getItem("ts_project_settings_tab");
      const initialProjectSettingsTab = isLegacySyncTab || savedProjectSettingsTab === "sync" ? "sync" : "details";

      const savedTokensViewMode =
        (localStorage.getItem("ts_tokens_view_mode") as "preview" | "json") ||
        "preview";

      // 6. Releases, Distribution Targets, Compiler Config, and User Activities
      //    are now project-scoped and restored by restoreScopedProjectData() when setCurrentProject runs.
      //    We start with empty/default values here.

      // 6b. ONE-TIME MIGRATION: Move any existing unscoped data to the active project's scoped key.
      //     This preserves existing user data when upgrading to scoped storage.
      const savedOrgId = localStorage.getItem("ts_active_org_id");
      const savedProjId = localStorage.getItem("ts_active_project_id");
      if (savedOrgId && savedProjId) {
        const migrationFlag = `ts_scoped_migration_done__${savedOrgId}__${savedProjId}`;
        if (!localStorage.getItem(migrationFlag)) {
          try {
            const migrateKey = (base: string) => {
              const globalVal = localStorage.getItem(base);
              if (globalVal) {
                const scopedKey = getScopedKey(base, savedOrgId, savedProjId);
                // Only migrate if the scoped key doesn't already have data
                if (!localStorage.getItem(scopedKey)) {
                  localStorage.setItem(scopedKey, globalVal);
                }
                localStorage.removeItem(base);
              }
            };
            migrateKey("ts_releases_history");
            migrateKey("ts_distribution_targets");
            migrateKey("ts_compiler_config");
            migrateKey("ts_user_activities");
            localStorage.setItem(migrationFlag, "1");
          } catch {}
        }
      }

      set({
        credentials: DEFAULT_CREDENTIALS,
        userProfile,
        viewMode: savedViewMode,
        themeMode: initialTheme,
        sidebarTab: initialTab,
        projectSettingsTab: initialProjectSettingsTab,
        tokensViewMode: savedTokensViewMode,
        // Start with empty/default project-scoped data — will be populated by setCurrentProject
        releases: [],
        activeReleaseId: null,
        distributionTargets: [],
        compilerConfig: DEFAULT_COMPILER_CONFIG,
        userActivities: [],
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

      // 7. Check for OAuth PKCE Code and Invitation in URL Query Parameters
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get("code");
        if (authCode && isSupabaseConfigured && supabase) {
          try {
            set({ isLoadingTenant: true });
            const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
            if (!error && data?.session) {
              const cleanUrl = new URL(window.location.href);
              cleanUrl.searchParams.delete("code");
              window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.search ? `?${cleanUrl.search}` : ""));
            }
          } catch (e) {
            console.warn("Client PKCE exchange fallback:", e);
          }
        }

        const inviteToken = urlParams.get("invite") || sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY);
        if (inviteToken) {
          // OAuth redirects drop the query string, so keep the token for this tab session.
          try {
            sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, inviteToken);
          } catch {}
          set({ activeInviteToken: inviteToken });
          getInvitationByToken(inviteToken).then((inv) => {
            if (inv && inv.status === "pending") {
              set({ pendingInvitePrompt: inv });
            }
          });
        }
      }

      // 8. Listen to Supabase Authentication State Changes
      if (isSupabaseConfigured && supabase) {
        // Fast-path: check existing session from cookies/storage
        try {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (initialSession?.user) {
            const sbUser = initialSession.user;
            const userObj = {
              uid: sbUser.id,
              email: sbUser.email || "",
              displayName:
                sbUser.user_metadata?.full_name ||
                sbUser.user_metadata?.name ||
                sbUser.email?.split("@")[0] ||
                "User",
              avatarUrl: sbUser.user_metadata?.avatar_url || undefined,
            };
            set({ currentUser: userObj });
            await get().loadTenantData(userObj.uid, userObj.email);
          }
        } catch {}

        supabase.auth.onAuthStateChange(async (event: any, session: any) => {
          const sbUser = session?.user;
          if (sbUser) {
            // Same-user auth events are already covered by getSession() or the first
            // sign-in event. Re-running tenant hydration can overwrite the active project.
            const isSameUserEvent = get().currentUser?.uid === sbUser.id;
            const userObj = {
              uid: sbUser.id,
              email: sbUser.email || "",
              displayName:
                sbUser.user_metadata?.full_name ||
                sbUser.user_metadata?.name ||
                sbUser.user_metadata?.user_name ||
                sbUser.email?.split("@")[0] ||
                "User",
              avatarUrl: sbUser.user_metadata?.avatar_url || undefined,
            };
            set({ currentUser: userObj });
            if (isSameUserEvent) return;
            await get().loadTenantData(userObj.uid, userObj.email);
            if (userObj.email) {
              const pendingInvs = await getPendingInvitationsForEmail(userObj.email);
              if (pendingInvs.length > 0) {
                set({ pendingInvitePrompt: pendingInvs[0] });
              }
            }
          } else {
            // If code is still in URL, wait for code exchange rather than unblocking as logged out
            if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("code")) {
              return;
            }
            // Supabase session is null -> user is completely signed out.
            // Never fall back to unauthenticated localStorage data.
            if (typeof window !== "undefined") {
              try {
                localStorage.removeItem("ts_tokens_platform_user");
                localStorage.removeItem("ts_second_screen_user");
              } catch {}
            }
            set({ currentUser: null, isLoadingTenant: false });
          }
        });
      } else {
        set({ isLoadingTenant: false });
      }

      // Live token fetching is started only after the active project is loaded.
    } catch {
      // ignore storage parsing error
    }
  },

  setRawTokens: (doc, meta) => {
    const { activeSet, activeThemeGroupId } = get();
    const canonical = canonicalizeTokenDocument(doc);
    const groups = extractThemeGroups(canonical);
    const updatedOptionIds = buildDefaultActiveOptionIds(groups, get().activeThemeOptionIds);
    const resolved = resolveTokensWithActiveThemes(canonical, activeSet, groups, updatedOptionIds);
    const savedGroupId = typeof window !== "undefined" ? localStorage.getItem("ts_active_group_id") : null;
    const defaultGroup =
      groups.find((g) => g && g.id === activeThemeGroupId) ||
      (savedGroupId ? groups.find((g) => g && g.id === savedGroupId) : null) ||
      groups.find((g) => g && typeof g.name === "string" && g.name.toLowerCase() === "theme") ||
      groups[0];

    // Synchronize loaded tokens with the active project and branch.
    const { currentOrg, currentProject, branches, activeBranch, credentials } = get();
    if (currentOrg && currentProject) {
      set({ cloudSaveStatus: "saving" });
      saveProjectTokens(currentOrg.id, currentProject.id, canonical, groups)
        .then(() => {
          set({ cloudSaveStatus: "synced", lastCloudSaveTime: new Date().toISOString() });
        })
        .catch(() => {
          set({ cloudSaveStatus: "error" });
        });
      const projectBranches = branches && branches.length > 0 ? branches : ensureProjectDefaultBranch(currentProject);
      const effectiveBranch = credentials.branch || activeBranch || "main";
      const hasBranch = projectBranches.some((b) => b.name === effectiveBranch);
      const updatedBranches = hasBranch
        ? projectBranches.map((b) =>
            b.name === effectiveBranch
              ? {
                  ...b,
                  rawTokens: canonical,
                  themeGroups: groups || b.themeGroups,
                  updatedAt: new Date().toISOString(),
                }
              : b
          )
        : [
            ...projectBranches,
            {
              id: `branch_${currentProject.id}_${effectiveBranch.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
              name: effectiveBranch,
              title: effectiveBranch,
              description: `Imported from Git branch ${effectiveBranch}`,
              isDefault: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              rawTokens: canonical,
              themeGroups: groups,
              commits: [],
              comments: [],
            },
          ];
      saveProjectBranches(currentOrg.id, currentProject.id, updatedBranches, effectiveBranch).catch(() => {});
      set({ branches: updatedBranches, activeBranch: effectiveBranch });
      updateProjectInMemoryAndCache(updatedBranches, canonical, groups, effectiveBranch);
    }

    set({
      rawTokens: canonical,
      originalTokens: JSON.parse(JSON.stringify(canonical)),
      resolvedTokens: resolved,
      themeGroups: groups,
      activeThemeGroupId: defaultGroup?.id || "",
      activeThemeOptionId: defaultGroup ? updatedOptionIds[defaultGroup.id] || defaultGroup.options[0]?.id || "" : "",
      activeThemeOptionIds: updatedOptionIds,
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
    const { rawTokens, activeSet, activeThemeOptionIds } = get();
    const updatedRaw = setTokenAtKeyPath(rawTokens, path, newValue);
    const updatedGroups = extractThemeGroups(updatedRaw);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRaw, activeSet, updatedGroups, activeThemeOptionIds);

    set({
      rawTokens: updatedRaw,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      isDirty: true,
    });

    persistTokensChange(updatedRaw, updatedGroups);

    const tokenName = path.slice(1).join(".");
    const setName = path[0];
    get().logUserActivity({
      type: "token",
      title: "Token Updated",
      description: `Modified token "${tokenName}" in set "${setName}" to "${newValue}".`,
      metadata: {
        token: tokenName,
        set: setName,
        newValue,
      },
    });
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
    const { rawTokens, activeSet, activeThemeOptionIds } = get();
    const updatedRaw = {
      ...rawTokens,
      [setName]: newJsonContent,
    };
    const updatedGroups = extractThemeGroups(updatedRaw);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRaw, activeSet, updatedGroups, activeThemeOptionIds);

    set({
      rawTokens: updatedRaw,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      isDirty: true,
    });

    persistTokensChange(updatedRaw, updatedGroups);

    get().logUserActivity({
      type: "token",
      title: "Token Set Updated",
      description: `Updated JSON definitions for set "${setName}".`,
      metadata: {
        set: setName,
      },
    });
  },

  setActiveSet: (setName) => {
    const { rawTokens, themeGroups, activeThemeOptionIds } = get();
    const updatedResolved = resolveTokensWithActiveThemes(rawTokens, setName, themeGroups, activeThemeOptionIds);
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
      ...(params.description ? { description: params.description } : {}),
    });

    updatedRawDoc[themesKey] = existingThemes as any;

    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);

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

    get().logUserActivity({
      type: "token",
      title: "Theme Option Created",
      description: `Created theme option "${params.name}" under group "${targetGroup.name}".`,
      metadata: {
        themeOption: params.name,
        themeGroup: targetGroup.name,
      },
    });

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
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);
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
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);
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
    const targetGroup =
      themeGroups.find((g) => g.id === groupId) ||
      themeGroups.find((g) => g.name.toLowerCase() === groupId.toLowerCase());
    if (!targetGroup) return;

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

    const targetNameLower = targetGroup.name.trim().toLowerCase();
    const targetIdLower = targetGroup.id.trim().toLowerCase();

    const updatedThemes = existingThemes.filter((t) => {
      const gName = String(t.group || "").trim().toLowerCase();
      const isTargetName = gName === targetNameLower;
      const isTargetId = gName === targetIdLower || `grp-${gName.replace(/\s+/g, "-")}` === targetIdLower;
      const belongsToGroup = targetGroup.options.some((o) => o.id === t.id);
      return !isTargetName && !isTargetId && !belongsToGroup;
    });

    const updatedRawDoc = {
      ...rawTokens,
      [themesKey]: updatedThemes as any,
    };

    // Directly exclude targetGroup so it is completely removed from state
    const updatedGroups = themeGroups.filter(
      (g) => g.id !== targetGroup.id && g.name.trim().toLowerCase() !== targetNameLower
    );
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);
    const remainingGroup = updatedGroups[0];

    if (typeof window !== "undefined") {
      try {
        if (remainingGroup) {
          localStorage.setItem("ts_active_group_id", remainingGroup.id);
        } else {
          localStorage.removeItem("ts_active_group_id");
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

  updateThemeOption: (groupId, optionId, updates) => {
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot update theme options.",
      });
      return;
    }
    const { rawTokens, themeGroups, activeSet } = get();
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
      if (t.id === optionId) {
        return {
          ...t,
          ...(updates.name ? { name: updates.name.trim() } : {}),
          ...(updates.color ? { color: updates.color } : {}),
          ...(updates.description !== undefined ? { description: updates.description } : {}),
          ...(updates.selectedTokenSets !== undefined ? { selectedTokenSets: updates.selectedTokenSets } : {}),
          ...(updates.figmaVariableReferences !== undefined
            ? {
                $figmaVariableReferences: updates.figmaVariableReferences,
                figmaVariableReferences: updates.figmaVariableReferences,
              }
            : {}),
          ...(updates.figmaCollectionId !== undefined
            ? {
                $figmaCollectionId: updates.figmaCollectionId,
                figmaCollectionId: updates.figmaCollectionId,
              }
            : {}),
          ...(updates.figmaModeId !== undefined
            ? {
                $figmaModeId: updates.figmaModeId,
                figmaModeId: updates.figmaModeId,
              }
            : {}),
        };
      }
      return t;
    });

    const updatedRawDoc = {
      ...rawTokens,
      [themesKey]: updatedThemes as any,
    };

    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);

    set({
      rawTokens: updatedRawDoc,
      themeGroups: updatedGroups,
      resolvedTokens: updatedResolved,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "success",
      title: "Theme Option Updated",
      message: updates.name ? `Renamed to "${updates.name}".` : "Option updated.",
    });
  },

  deleteThemeOption: (groupId, optionId) => {
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot delete theme options.",
      });
      return;
    }
    const { rawTokens, themeGroups, activeSet, activeThemeOptionId } = get();
    const targetGroup = themeGroups.find((g) => g.id === groupId);
    if (targetGroup && targetGroup.options.length <= 1) {
      get().addToast({
        type: "error",
        title: "Cannot Delete Option",
        message: "A theme group must have at least one option.",
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

    const updatedThemes = existingThemes.filter((t) => t.id !== optionId);
    const updatedRawDoc = {
      ...rawTokens,
      [themesKey]: updatedThemes as any,
    };

    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);
    const remainingGroup = updatedGroups.find((g) => g.id === groupId) || updatedGroups[0];
    const newActiveOptionId =
      activeThemeOptionId === optionId
        ? remainingGroup?.options[0]?.id || ""
        : activeThemeOptionId;

    set({
      rawTokens: updatedRawDoc,
      themeGroups: updatedGroups,
      resolvedTokens: updatedResolved,
      activeThemeOptionId: newActiveOptionId,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().addToast({
      type: "info",
      title: "Theme Option Deleted",
      message: "Theme option removed.",
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
    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().logUserActivity({
      type: "token",
      title: "Token Created",
      description: `Created token "${tokenPath.join(".")}" in set "${setName}".`,
      metadata: {
        token: tokenPath.join("."),
        set: setName,
        type: tokenData.type,
      },
    });

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
    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().logUserActivity({
      type: "token",
      title: "Token Deleted",
      description: `Deleted token "${tokenPath.join(".")}" from set "${setName}".`,
      metadata: {
        token: tokenPath.join("."),
        set: setName,
      },
    });

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
    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);

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

  renameToken: (setName, oldPath, newName) => {
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot rename tokens.",
      });
      return;
    }
    const cleanNewName = newName.trim();
    if (!cleanNewName) return;
    const oldKey = oldPath.join(".");
    if (cleanNewName === oldKey) return;

    const { rawTokens, activeSet, resolvedTokens } = get();
    const existing = resolvedTokens.find(
      (t) => t.setName === setName && t.name === oldKey
    );
    if (!existing) return;

    const newPathSegments = cleanNewName.split(".");
    const oldFullPath = [setName, ...oldPath];
    const newFullPath = [setName, ...newPathSegments];

    let updatedRawDoc = createTokenAtKeyPath(rawTokens, newFullPath, {
      value: existing.rawValue,
      type: existing.type,
      description: existing.description,
    });
    updatedRawDoc = deleteTokenAtKeyPath(updatedRawDoc, oldFullPath);

    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().logUserActivity({
      type: "token",
      title: "Token Renamed",
      description: `Renamed token "${oldKey}" to "${cleanNewName}" in set "${setName}".`,
      metadata: {
        oldToken: oldKey,
        newToken: cleanNewName,
        set: setName,
      },
    });

    get().addToast({
      type: "success",
      title: "Token Renamed",
      message: `Renamed to "${cleanNewName}".`,
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
    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, activeSet, updatedGroups, get().activeThemeOptionIds);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      activeSet: cleanName,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().logUserActivity({
      type: "token",
      title: "Token Set Created",
      description: `Created new token set "${cleanName}".`,
      metadata: {
        set: cleanName,
      },
    });

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
    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, newActiveSet, updatedGroups, get().activeThemeOptionIds);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      activeSet: newActiveSet,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().logUserActivity({
      type: "token",
      title: "Token Set Deleted",
      description: `Deleted token set "${setName}".`,
      metadata: {
        set: setName,
      },
    });

    get().addToast({
      type: "info",
      title: "Set Deleted",
      message: `Deleted token set "${setName}".`,
    });
  },

  renameSet: (oldSetName, newSetName) => {
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot rename token sets.",
      });
      return;
    }
    const cleanOld = oldSetName.trim();
    const cleanNew = newSetName.trim();
    if (!cleanNew || cleanOld === cleanNew) return;

    const { rawTokens, activeSet } = get();
    if (!rawTokens[cleanOld] || rawTokens[cleanNew]) {
      get().addToast({
        type: "error",
        title: "Cannot Rename Set",
        message: rawTokens[cleanNew]
          ? `A set named "${cleanNew}" already exists.`
          : `Set "${cleanOld}" not found.`,
      });
      return;
    }

    const updatedRawDoc = { ...rawTokens };
    updatedRawDoc[cleanNew] = updatedRawDoc[cleanOld];
    delete updatedRawDoc[cleanOld];

    // Update $metadata.json / $metadata tokenSetOrder
    const metaKey = updatedRawDoc["$metadata.json"] ? "$metadata.json" : "$metadata";
    if (updatedRawDoc[metaKey] && Array.isArray(updatedRawDoc[metaKey].tokenSetOrder)) {
      updatedRawDoc[metaKey] = {
        ...updatedRawDoc[metaKey],
        tokenSetOrder: updatedRawDoc[metaKey].tokenSetOrder.map((s: string) =>
          s === cleanOld ? cleanNew : s
        ),
      };
    }

    // Update themes selectedTokenSets mapping
    const themesKey = updatedRawDoc["$themes.json"] ? "$themes.json" : "$themes";
    if (Array.isArray(updatedRawDoc[themesKey])) {
      updatedRawDoc[themesKey] = updatedRawDoc[themesKey].map((theme: any) => {
        if (theme.selectedTokenSets && theme.selectedTokenSets[cleanOld] !== undefined) {
          const sets = { ...theme.selectedTokenSets };
          sets[cleanNew] = sets[cleanOld];
          delete sets[cleanOld];
          return { ...theme, selectedTokenSets: sets };
        }
        return theme;
      });
    }

    const newActiveSet = activeSet === cleanOld ? cleanNew : activeSet;
    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, newActiveSet, updatedGroups, get().activeThemeOptionIds);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      activeSet: newActiveSet,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().logUserActivity({
      type: "token",
      title: "Token Set Renamed",
      description: `Renamed set "${cleanOld}" to "${cleanNew}".`,
      metadata: {
        oldSet: cleanOld,
        newSet: cleanNew,
      },
    });

    get().addToast({
      type: "success",
      title: "Set Renamed",
      message: `Renamed to "${cleanNew}".`,
    });
  },

  renameFolder: (oldFolderPrefix, newFolderPrefix) => {
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot rename folders.",
      });
      return;
    }
    const cleanOld = oldFolderPrefix.trim();
    const cleanNew = newFolderPrefix.trim();
    if (!cleanNew || cleanOld === cleanNew) return;

    const { rawTokens, activeSet } = get();
    const updatedRawDoc = { ...rawTokens };

    const matchingSets = Object.keys(updatedRawDoc).filter(
      (k) => !k.startsWith("$") && (k === cleanOld || k.startsWith(`${cleanOld}/`))
    );

    if (matchingSets.length === 0) return;

    const renameMap: Record<string, string> = {};
    matchingSets.forEach((oldSet) => {
      const remainder = oldSet === cleanOld ? "" : oldSet.slice(cleanOld.length + 1);
      const newSet = remainder ? `${cleanNew}/${remainder}` : cleanNew;
      renameMap[oldSet] = newSet;
      updatedRawDoc[newSet] = updatedRawDoc[oldSet];
      delete updatedRawDoc[oldSet];
    });

    const metaKey = updatedRawDoc["$metadata.json"] ? "$metadata.json" : "$metadata";
    if (updatedRawDoc[metaKey] && Array.isArray(updatedRawDoc[metaKey].tokenSetOrder)) {
      updatedRawDoc[metaKey] = {
        ...updatedRawDoc[metaKey],
        tokenSetOrder: updatedRawDoc[metaKey].tokenSetOrder.map((s: string) =>
          renameMap[s] || s
        ),
      };
    }

    const themesKey = updatedRawDoc["$themes.json"] ? "$themes.json" : "$themes";
    if (Array.isArray(updatedRawDoc[themesKey])) {
      updatedRawDoc[themesKey] = updatedRawDoc[themesKey].map((theme: any) => {
        if (!theme.selectedTokenSets) return theme;
        const sets = { ...theme.selectedTokenSets };
        let modified = false;
        Object.entries(renameMap).forEach(([oldS, newS]) => {
          if (sets[oldS] !== undefined) {
            sets[newS] = sets[oldS];
            delete sets[oldS];
            modified = true;
          }
        });
        return modified ? { ...theme, selectedTokenSets: sets } : theme;
      });
    }

    const newActiveSet = renameMap[activeSet] || activeSet;
    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, newActiveSet, updatedGroups, get().activeThemeOptionIds);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      activeSet: newActiveSet,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().logUserActivity({
      type: "token",
      title: "Folder Renamed",
      description: `Renamed folder "${cleanOld}" to "${cleanNew}" (${matchingSets.length} sets updated).`,
      metadata: {
        oldFolder: cleanOld,
        newFolder: cleanNew,
      },
    });

    get().addToast({
      type: "success",
      title: "Folder Renamed",
      message: `Renamed folder "${cleanOld}" to "${cleanNew}".`,
    });
  },

  deleteFolder: (folderPrefix) => {
    if (!get().canUserEdit()) {
      get().addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot delete folders.",
      });
      return;
    }
    const cleanPrefix = folderPrefix.trim();
    if (!cleanPrefix) return;

    const { rawTokens, activeSet } = get();
    const updatedRawDoc = { ...rawTokens };

    const matchingSets = Object.keys(updatedRawDoc).filter(
      (k) => !k.startsWith("$") && (k === cleanPrefix || k.startsWith(`${cleanPrefix}/`))
    );

    if (matchingSets.length === 0) return;

    matchingSets.forEach((setName) => {
      delete updatedRawDoc[setName];
    });

    const metaKey = updatedRawDoc["$metadata.json"] ? "$metadata.json" : "$metadata";
    if (updatedRawDoc[metaKey] && Array.isArray(updatedRawDoc[metaKey].tokenSetOrder)) {
      updatedRawDoc[metaKey] = {
        ...updatedRawDoc[metaKey],
        tokenSetOrder: updatedRawDoc[metaKey].tokenSetOrder.filter(
          (s: string) => !matchingSets.includes(s)
        ),
      };
    }

    const themesKey = updatedRawDoc["$themes.json"] ? "$themes.json" : "$themes";
    if (Array.isArray(updatedRawDoc[themesKey])) {
      updatedRawDoc[themesKey] = updatedRawDoc[themesKey].map((theme: any) => {
        if (!theme.selectedTokenSets) return theme;
        const sets = { ...theme.selectedTokenSets };
        matchingSets.forEach((s) => delete sets[s]);
        return { ...theme, selectedTokenSets: sets };
      });
    }

    const remainingSets = Object.keys(updatedRawDoc).filter((k) => !k.startsWith("$"));
    const newActiveSet = matchingSets.includes(activeSet)
      ? remainingSets[0] || "ALL"
      : activeSet;

    const updatedGroups = extractThemeGroups(updatedRawDoc);
    const updatedResolved = resolveTokensWithActiveThemes(updatedRawDoc, newActiveSet, updatedGroups, get().activeThemeOptionIds);

    set({
      rawTokens: updatedRawDoc,
      resolvedTokens: updatedResolved,
      themeGroups: updatedGroups,
      activeSet: newActiveSet,
      isDirty: true,
    });

    persistTokensChange(updatedRawDoc, updatedGroups);

    get().logUserActivity({
      type: "token",
      title: "Folder Deleted",
      description: `Deleted folder "${cleanPrefix}" and its ${matchingSets.length} sets.`,
      metadata: {
        folder: cleanPrefix,
      },
    });

    get().addToast({
      type: "info",
      title: "Folder Deleted",
      message: `Deleted folder "${cleanPrefix}" and ${matchingSets.length} sets.`,
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
    const { currentUser, currentOrg, currentProject } = get();
    const role = get().getCurrentUserRole();
    const roleDef = ROLE_DEFINITIONS[role];

    const actor = {
      uid: act.actor?.uid || currentUser?.uid,
      name: act.actor?.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "Collaborator",
      email: act.actor?.email || currentUser?.email || "anonymous@team.com",
      role: act.actor?.role || roleDef?.title || "Editor",
      avatarUrl: act.actor?.avatarUrl || currentUser?.avatarUrl,
    };

    const newActivity: UserActivityItem = {
      ...act,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor,
      orgId: act.orgId || currentOrg?.id,
      projectId: act.projectId || currentProject?.id,
      projectName: act.projectName || currentProject?.name,
    };

    set((state) => {
      const updated = [newActivity, ...state.userActivities].slice(0, 100);
      if (typeof window !== "undefined") {
        try {
          const key = getScopedKey("ts_user_activities", state.currentOrg?.id, state.currentProject?.id);
          localStorage.setItem(key, JSON.stringify(updated));
        } catch {}
      }
      return { userActivities: updated };
    });

    // Asynchronously persist remotely for team visibility.
    const targetOrgId = act.orgId || currentOrg?.id;
    if (targetOrgId) {
      logOrganizationActivity(targetOrgId, newActivity).catch(() => {});
    }
  },

  loadOrganizationActivities: async (orgId: string) => {
    if (!orgId) return;
    try {
      const remoteActs = await getOrganizationActivities(orgId, 80);
      if (remoteActs && remoteActs.length > 0) {
        set((state) => {
          // Merge remote activities with any immediate local-only activities
          const existingIds = new Set(remoteActs.map((a) => a.id));
          const localOnly = state.userActivities.filter((a) => !existingIds.has(a.id));
          const combined = [...localOnly, ...remoteActs]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 100);

          if (typeof window !== "undefined") {
            try {
              const key = getScopedKey("ts_user_activities", state.currentOrg?.id, state.currentProject?.id);
              localStorage.setItem(key, JSON.stringify(combined));
            } catch {}
          }
          return { userActivities: combined };
        });
      }
    } catch (e) {
      console.warn("Failed to load organization activities:", e);
    }
  },

  clearUserActivities: () => {
    if (typeof window !== "undefined") {
      try {
        const { currentOrg, currentProject } = get();
        const key = getScopedKey("ts_user_activities", currentOrg?.id, currentProject?.id);
        localStorage.removeItem(key);
      } catch {}
    }
    set({ userActivities: [] });
  },

  // Living Documentation Actions
  addDocFolder: async (title: string) => {
    const { documentation, currentProject, currentOrg } = get();
    const currentDoc = documentation || createEmptyDocumentation();
    const newFolder: DocFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim() || "New Section",
      order: currentDoc.folders.length,
      isOpen: true,
    };
    const updatedDoc: ProjectDocumentation = {
      ...currentDoc,
      folders: [...currentDoc.folders, newFolder],
      updatedAt: new Date().toISOString(),
    };
    set({ documentation: updatedDoc, activeDocFolderId: newFolder.id });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch((err) => {
        console.error("Failed to save documentation folder:", err);
      });
      get().logUserActivity({
        type: "doc",
        title: "Created documentation section",
        description: `Created documentation section "${newFolder.title}"`,
      });
    }
    return newFolder;
  },

  updateDocFolder: async (folderId: string, updates: Partial<DocFolder>) => {
    const { documentation, currentProject, currentOrg } = get();
    if (!documentation) return;
    const updatedFolders = documentation.folders.map((f) =>
      f.id === folderId ? { ...f, ...updates } : f
    );
    const updatedDoc: ProjectDocumentation = {
      ...documentation,
      folders: updatedFolders,
      updatedAt: new Date().toISOString(),
    };
    set({ documentation: updatedDoc });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
    }
  },

  deleteDocFolder: async (folderId: string) => {
    const { documentation, currentProject, currentOrg, activeDocFolderId } = get();
    if (!documentation) return;
    const deletedFolder = documentation.folders.find((f) => f.id === folderId);
    const updatedFolders = documentation.folders.filter((f) => f.id !== folderId);
    const updatedPages = documentation.pages.map((p) =>
      p.folderId === folderId ? { ...p, folderId: null } : p
    );
    const updatedDoc: ProjectDocumentation = {
      ...documentation,
      folders: updatedFolders,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    set({
      documentation: updatedDoc,
      activeDocFolderId: activeDocFolderId === folderId ? null : activeDocFolderId,
    });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
      if (deletedFolder) {
        get().logUserActivity({
          type: "doc",
          title: "Deleted documentation section",
          description: `Deleted documentation section "${deletedFolder.title}"`,
        });
      }
    }
  },

  addDocPage: async (title: string, folderId?: string | null) => {
    const { documentation, currentProject, currentOrg } = get();
    const currentDoc = documentation || createEmptyDocumentation();
    const cleanTitle = title.trim() || "Untitled Page";
    const slug = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const newPage: DocPage = {
      id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: cleanTitle,
      slug: slug || "untitled",
      description: "",
      folderId: folderId ?? null,
      order: currentDoc.pages.filter((p) => p.folderId === (folderId ?? null)).length,
      blocks: [
        {
          id: `b_${Date.now()}_intro`,
          type: "paragraph",
          content: "Welcome to this page. Type `/` anywhere to insert design token blocks, color swatches, variables, or callouts.",
        },
      ],
      layout: "classic",
      headerBackground: "transparent",
      showTableOfContents: true,
      isPublished: true,
      updatedAt: new Date().toISOString(),
    };

    const updatedDoc: ProjectDocumentation = {
      ...currentDoc,
      pages: [...currentDoc.pages, newPage],
      updatedAt: new Date().toISOString(),
    };

    set({
      documentation: updatedDoc,
      activeDocPageId: newPage.id,
      isDocEditing: true,
      selectedDocBlockId: null,
    });

    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
      get().logUserActivity({
        type: "doc",
        title: "Created documentation page",
        description: `Created documentation page "${newPage.title}"`,
      });
    }
    return newPage;
  },

  updateDocPage: async (pageId: string, updates: Partial<DocPage>) => {
    const { documentation, currentProject, currentOrg } = get();
    if (!documentation) return;
    const updatedPages = documentation.pages.map((p) => {
      if (p.id === pageId) {
        const merged = { ...p, ...updates, updatedAt: new Date().toISOString() };
        if (updates.title && !updates.slug) {
          merged.slug = updates.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        }
        return merged;
      }
      return p;
    });
    const updatedDoc: ProjectDocumentation = {
      ...documentation,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    set({ documentation: updatedDoc });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
    }
  },

  deleteDocPage: async (pageId: string) => {
    const { documentation, currentProject, currentOrg, activeDocPageId } = get();
    if (!documentation) return;
    const deletedPage = documentation.pages.find((p) => p.id === pageId);
    const updatedPages = documentation.pages.filter((p) => p.id !== pageId);
    const nextActiveId =
      activeDocPageId === pageId ? (updatedPages[0]?.id || null) : activeDocPageId;
    const updatedDoc: ProjectDocumentation = {
      ...documentation,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    set({ documentation: updatedDoc, activeDocPageId: nextActiveId });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
      if (deletedPage) {
        get().logUserActivity({
          type: "doc",
          title: "Deleted documentation page",
          description: `Deleted documentation page "${deletedPage.title}"`,
        });
      }
    }
  },

  addDocBlock: async (pageId: string, block: Omit<DocBlock, "id">, insertIndex?: number) => {
    const { documentation, currentProject, currentOrg } = get();
    if (!documentation) throw new Error("No documentation initialized");
    const newBlock: DocBlock = {
      ...block,
      id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    const updatedPages = documentation.pages.map((p) => {
      if (p.id !== pageId) return p;
      const blocks = [...p.blocks];
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= blocks.length) {
        blocks.splice(insertIndex, 0, newBlock);
      } else {
        blocks.push(newBlock);
      }
      return { ...p, blocks, updatedAt: new Date().toISOString() };
    });
    const updatedDoc: ProjectDocumentation = {
      ...documentation,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    set({ documentation: updatedDoc, selectedDocBlockId: newBlock.id });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
    }
    return newBlock;
  },

  updateDocBlock: async (pageId: string, blockId: string, updates: Partial<DocBlock>) => {
    const { documentation, currentProject, currentOrg } = get();
    if (!documentation) return;
    const updatedPages = documentation.pages.map((p) => {
      if (p.id !== pageId) return p;
      const updatedBlocks = p.blocks.map((b) => {
        if (b.id !== blockId) return b;
        return {
          ...b,
          ...updates,
          settings: {
            ...b.settings,
            ...updates.settings,
          },
        };
      });
      return { ...p, blocks: updatedBlocks, updatedAt: new Date().toISOString() };
    });
    const updatedDoc: ProjectDocumentation = {
      ...documentation,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    set({ documentation: updatedDoc });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
    }
  },

  deleteDocBlock: async (pageId: string, blockId: string) => {
    const { documentation, currentProject, currentOrg, selectedDocBlockId } = get();
    if (!documentation) return;
    const updatedPages = documentation.pages.map((p) => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        blocks: p.blocks.filter((b) => b.id !== blockId),
        updatedAt: new Date().toISOString(),
      };
    });
    const updatedDoc: ProjectDocumentation = {
      ...documentation,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    set({
      documentation: updatedDoc,
      selectedDocBlockId: selectedDocBlockId === blockId ? null : selectedDocBlockId,
    });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
    }
  },

  reorderDocBlocks: async (pageId: string, blocks: DocBlock[]) => {
    const { documentation, currentProject, currentOrg } = get();
    if (!documentation) return;
    const updatedPages = documentation.pages.map((p) => {
      if (p.id !== pageId) return p;
      return { ...p, blocks, updatedAt: new Date().toISOString() };
    });
    const updatedDoc: ProjectDocumentation = {
      ...documentation,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    set({ documentation: updatedDoc });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
    }
  },

  publishDocPage: async (pageId: string, isPublished: boolean) => {
    const { documentation, currentProject, currentOrg } = get();
    if (!documentation) return;
    let targetPageTitle = "";
    const updatedPages = documentation.pages.map((p) => {
      if (p.id === pageId) {
        targetPageTitle = p.title;
        return {
          ...p,
          isPublished,
          publishedAt: isPublished ? new Date().toISOString() : p.publishedAt,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    const updatedDoc: ProjectDocumentation = {
      ...documentation,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    set({ documentation: updatedDoc });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
      get().logUserActivity({
        type: "doc",
        title: isPublished ? "Published documentation page" : "Unpublished documentation page",
        description: isPublished
          ? `Published documentation page "${targetPageTitle}"`
          : `Unpublished documentation page "${targetPageTitle}"`,
      });
    }
  },

  publishEntireDocumentation: async (isPublishedGlobally: boolean, allowPublicAccess: boolean = true) => {
    const { documentation, currentProject, currentOrg, rawTokens, figmaVariables } = get();
    if (!documentation) return;
    const cleanSlug =
      documentation.publishedUrlSlug ||
      currentProject?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
      "docs";
    const updatedDoc: ProjectDocumentation = {
      ...documentation,
      isPublishedGlobally,
      allowPublicAccess:
        allowPublicAccess !== undefined ? allowPublicAccess : documentation.allowPublicAccess,
      publishedUrlSlug: cleanSlug,
      publishedTokens: rawTokens || {},
      publishedVariables: figmaVariables || {},
      updatedAt: new Date().toISOString(),
    };
    set({ documentation: updatedDoc });
    if (currentOrg && currentProject) {
      saveProjectDocumentation(currentOrg.id, currentProject.id, updatedDoc).catch(console.error);
      get().logUserActivity({
        type: "doc",
        title: isPublishedGlobally ? "Published live documentation" : "Unpublished live documentation",
        description: isPublishedGlobally
          ? `Published live documentation for project "${currentProject.name}"`
          : `Unpublished live documentation for project "${currentProject.name}"`,
      });
    }
  },

  // -------------------------------------------------------------
  // NATIVE BRANCH SYSTEM ACTIONS
  // -------------------------------------------------------------

  createBranchAction: async ({ title, name, description, basedOn }) => {
    const { branches, activeBranch, rawTokens, themeGroups, currentOrg, currentProject, currentUser, credentials } = get();
    const hasSyncProvider = Boolean(credentials.provider && credentials.owner && credentials.repo);
    if (hasSyncProvider) {
      throw new Error("Sync provider is active. Native branch creation is disabled.");
    }
    const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "-");
    if (!cleanName) throw new Error("Branch name cannot be empty");
    if (branches.some((b) => b.name === cleanName)) {
      throw new Error(`Branch "${cleanName}" already exists`);
    }

    const baseBranchName = basedOn || activeBranch || "main";
    const baseBranch = branches.find((b) => b.name === baseBranchName);
    const baseTokens =
      baseBranch?.rawTokens && Object.keys(baseBranch.rawTokens).length > 0
        ? baseBranch.rawTokens
        : rawTokens && Object.keys(rawTokens).length > 0
        ? rawTokens
        : currentProject?.rawTokens && Object.keys(currentProject.rawTokens).length > 0
        ? currentProject.rawTokens
        : {};
    const baseThemes =
      baseBranch?.themeGroups && baseBranch.themeGroups.length > 0
        ? baseBranch.themeGroups
        : themeGroups && themeGroups.length > 0
        ? themeGroups
        : currentProject?.themeGroups && currentProject.themeGroups.length > 0
        ? currentProject.themeGroups
        : extractThemeGroups(baseTokens);

    const initialRaw = JSON.parse(JSON.stringify(baseTokens));
    const initialThemes = JSON.parse(JSON.stringify(baseThemes));

    const newBranch: ProjectBranch = {
      id: `branch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      title: title || cleanName,
      description: description || "",
      isDefault: false,
      basedOn: baseBranchName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: {
        uid: currentUser?.uid,
        name: currentUser?.displayName || currentUser?.email || "Team Member",
        email: currentUser?.email || "user@example.com",
        avatarUrl: currentUser?.avatarUrl,
      },
      rawTokens: initialRaw,
      themeGroups: initialThemes,
      commits: [
        {
          id: `commit_${Date.now()}`,
          sha: "br-" + Math.random().toString(36).substring(2, 8),
          message: `Branch created from ${baseBranchName}`,
          timestamp: new Date().toISOString(),
          author: {
            uid: currentUser?.uid,
            name: currentUser?.displayName || currentUser?.email || "Team Member",
            email: currentUser?.email || "user@example.com",
            avatarUrl: currentUser?.avatarUrl,
          },
          totalAdded: 0,
          totalModified: 0,
          totalDeleted: 0,
          changes: [],
        },
      ],
      comments: [],
    };

    const updatedBranches = [...branches, newBranch];
    set({
      branches: updatedBranches,
      activeBranch: cleanName,
      rawTokens: initialRaw,
      originalTokens: JSON.parse(JSON.stringify(initialRaw)),
      isDirty: false,
      themeGroups: initialThemes,
      activeThemeGroupId: initialThemes[0]?.id || "",
      activeThemeOptionId: initialThemes[0]?.options?.[0]?.id || "",
    });

    const resolved = resolveTokensWithActiveThemes(initialRaw, get().activeSet || "ALL", initialThemes, get().activeThemeOptionIds);
    set({ resolvedTokens: resolved });

    if (currentOrg && currentProject) {
      saveProjectBranches(currentOrg.id, currentProject.id, updatedBranches, cleanName).catch(console.error);
      saveProjectTokens(currentOrg.id, currentProject.id, initialRaw, initialThemes).catch(console.error);
      updateProjectInMemoryAndCache(updatedBranches, initialRaw, initialThemes, cleanName);
      get().logUserActivity({
        type: "git",
        title: `Created branch "${cleanName}"`,
        description: `Created branch "${title}" based on "${baseBranchName}".`,
      });
    }

    if (typeof window !== "undefined") {
      try {
        if (currentProject) {
          localStorage.setItem(`ts_project_branch_${currentProject.id}`, cleanName);
        }
        localStorage.setItem("ts_active_branch", cleanName);
      } catch {}
    }

    if (!credentials.provider || !credentials.owner || !credentials.repo) {
      set({ credentials: { ...get().credentials, branch: cleanName } });
    }

    get().addToast({
      type: "success",
      title: "Branch Created",
      message: `Switched to newly created branch "${cleanName}".`,
    });

    return newBranch;
  },

  switchBranchAction: async (targetBranchName: string) => {
    const { branches, activeBranch, rawTokens, themeGroups, currentOrg, currentProject, credentials } = get();
    const hasSyncProvider = Boolean(credentials.provider && credentials.owner && credentials.repo);
    if (hasSyncProvider) {
      get().setCredentials({ branch: targetBranchName });
      await get().fetchLiveTokens();
      return;
    }
    if (targetBranchName === activeBranch) return;

    const targetBranch = branches.find((b) => b.name === targetBranchName);
    if (!targetBranch) {
      get().addToast({
        type: "error",
        title: "Switch Branch Failed",
        message: `Branch "${targetBranchName}" was not found.`,
      });
      return;
    }

    // Save working draft of current branch if dirty
    const updatedBranches = branches.map((b) =>
      b.name === activeBranch
        ? {
            ...b,
            rawTokens: rawTokens,
            themeGroups: themeGroups,
            updatedAt: new Date().toISOString(),
          }
        : b
    );

    const targetRaw = targetBranch.rawTokens || {};
    const targetThemes = targetBranch.themeGroups || extractThemeGroups(targetRaw);

    set({
      branches: updatedBranches,
      activeBranch: targetBranchName,
      rawTokens: targetRaw,
      originalTokens: JSON.parse(JSON.stringify(targetRaw)),
      isDirty: false,
      themeGroups: targetThemes,
      activeThemeGroupId: targetThemes[0]?.id || "",
      activeThemeOptionId: targetThemes[0]?.options?.[0]?.id || "",
    });

    if (!credentials.provider || !credentials.owner || !credentials.repo) {
      set({ credentials: { ...get().credentials, branch: targetBranchName } });
    }

    const resolved = resolveTokensWithActiveThemes(targetRaw, get().activeSet || "ALL", targetThemes, get().activeThemeOptionIds);
    set({ resolvedTokens: resolved });

    if (typeof window !== "undefined") {
      try {
        if (currentProject) {
          localStorage.setItem(`ts_project_branch_${currentProject.id}`, targetBranchName);
        }
        localStorage.setItem("ts_active_branch", targetBranchName);
      } catch {}
    }

    if (currentOrg && currentProject) {
      saveProjectBranches(currentOrg.id, currentProject.id, updatedBranches, targetBranchName).catch(console.error);
      saveProjectTokens(currentOrg.id, currentProject.id, targetRaw, targetThemes).catch(console.error);
      updateProjectInMemoryAndCache(updatedBranches, targetRaw, targetThemes, targetBranchName);
      get().logUserActivity({
        type: "git",
        title: `Switched to branch "${targetBranchName}"`,
        description: `Active branch is now "${targetBranchName}".`,
      });
    }

    get().addToast({
      type: "info",
      title: "Active Branch Switched",
      message: `Now working on branch "${targetBranchName}".`,
    });
  },

  deleteBranchAction: async (branchName: string) => {
    const { branches, activeBranch, currentOrg, currentProject, credentials } = get();
    const hasSyncProvider = Boolean(credentials.provider && credentials.owner && credentials.repo);
    if (hasSyncProvider) {
      get().addToast({
        type: "info",
        title: "Sync Provider Active",
        message: "Branch deletion must be managed directly in your Git repository.",
      });
      return;
    }
    const target = branches.find((b) => b.name === branchName);
    if (!target) return;
    if (target.isDefault || branchName === "main") {
      get().addToast({
        type: "error",
        title: "Cannot Delete Default Branch",
        message: "The default main branch cannot be deleted.",
      });
      return;
    }

    const filtered = branches.filter((b) => b.name !== branchName);
    let newActive = activeBranch;
    if (activeBranch === branchName) {
      newActive = "main";
      const mainBranch = filtered.find((b) => b.name === "main") || filtered[0];
      if (mainBranch) {
        set({
          activeBranch: mainBranch.name,
          rawTokens: mainBranch.rawTokens || {},
          originalTokens: JSON.parse(JSON.stringify(mainBranch.rawTokens || {})),
          isDirty: false,
          themeGroups: mainBranch.themeGroups || [],
        });
        const resolved = flattenAndResolveTokens(mainBranch.rawTokens || {}, get().activeSet || "ALL");
        set({ resolvedTokens: resolved });
      }
    }

    set({ branches: filtered });

    if (currentOrg && currentProject) {
      saveProjectBranches(currentOrg.id, currentProject.id, filtered, newActive).catch(console.error);
      const activeBranchObj = filtered.find((b) => b.name === newActive);
      updateProjectInMemoryAndCache(
        filtered,
        activeBranchObj?.rawTokens,
        activeBranchObj?.themeGroups,
        newActive
      );
      get().logUserActivity({
        type: "git",
        title: `Deleted branch "${branchName}"`,
        description: `Branch "${target.title || branchName}" was deleted.`,
      });
    }

    get().addToast({
      type: "success",
      title: "Branch Deleted",
      message: `Branch "${branchName}" has been removed.`,
    });
  },

  mergeBranchAction: async (sourceBranchName: string, targetBranchName: string) => {
    const { branches, currentOrg, currentProject, currentUser, activeBranch, credentials } = get();
    const hasSyncProvider = Boolean(credentials.provider && credentials.owner && credentials.repo);
    if (hasSyncProvider) {
      get().addToast({
        type: "info",
        title: "Sync Provider Active",
        message: "Branch merges are managed via Pull Requests in your Git repository.",
      });
      return;
    }
    const source = branches.find((b) => b.name === sourceBranchName);
    const target = branches.find((b) => b.name === targetBranchName);
    if (!source || !target) throw new Error("Branch not found");

    // Deep merge source rawTokens into target rawTokens
    const mergedTokens = {
      ...(target.rawTokens || {}),
      ...(source.rawTokens || {}),
    };

    const mergeCommit: BranchCommit = {
      id: `commit_merge_${Date.now()}`,
      sha: "merge-" + Math.random().toString(36).substring(2, 8),
      message: `Merge branch '${sourceBranchName}' into '${targetBranchName}'`,
      timestamp: new Date().toISOString(),
      author: {
        uid: currentUser?.uid,
        name: currentUser?.displayName || currentUser?.email || "Team Member",
        email: currentUser?.email || "user@example.com",
        avatarUrl: currentUser?.avatarUrl,
      },
      totalAdded: 0,
      totalModified: Object.keys(source.rawTokens || {}).length,
      totalDeleted: 0,
      changes: [
        {
          id: `chg_merge_${Date.now()}`,
          category: "tokens",
          action: "modified",
          key: `Merged ${sourceBranchName}`,
          label: "Branch Merge",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const updatedBranches = branches.map((b) => {
      if (b.name === targetBranchName) {
        return {
          ...b,
          rawTokens: mergedTokens,
          themeGroups: source.themeGroups || b.themeGroups,
          updatedAt: new Date().toISOString(),
          commits: [mergeCommit, ...(b.commits || [])],
        };
      }
      return b;
    });

    set({ branches: updatedBranches });

    if (activeBranch === targetBranchName) {
      set({
        rawTokens: mergedTokens,
        originalTokens: JSON.parse(JSON.stringify(mergedTokens)),
        isDirty: false,
        themeGroups: source.themeGroups || target.themeGroups,
      });
      const resolved = flattenAndResolveTokens(mergedTokens, get().activeSet || "ALL");
      set({ resolvedTokens: resolved });
    }

    if (currentOrg && currentProject) {
      saveProjectBranches(currentOrg.id, currentProject.id, updatedBranches, activeBranch).catch(console.error);
      saveProjectTokens(currentOrg.id, currentProject.id, mergedTokens, source.themeGroups || target.themeGroups).catch(console.error);
      updateProjectInMemoryAndCache(
        updatedBranches,
        mergedTokens,
        source.themeGroups || target.themeGroups,
        activeBranch
      );
      get().logUserActivity({
        type: "git",
        title: `Merged "${sourceBranchName}" into "${targetBranchName}"`,
        description: `Successfully merged tokens from ${sourceBranchName} to ${targetBranchName}.`,
      });
    }

    get().addToast({
      type: "success",
      title: "Branch Merged",
      message: `Successfully merged '${sourceBranchName}' into '${targetBranchName}'.`,
    });
  },

  commitToActiveBranchAction: async (message: string) => {
    const { branches, activeBranch, rawTokens, currentOrg, currentProject, currentUser, getDiffSummary, credentials } = get();
    const hasSyncProvider = Boolean(credentials.provider && credentials.owner && credentials.repo);
    if (hasSyncProvider) {
      return;
    }
    const diff = getDiffSummary();
    const totalAdded = diff.totalAdded;
    const totalModified = diff.totalModified;
    const totalDeleted = diff.totalDeleted;

    const changes: BranchChangeItem[] = [];
    diff.files.forEach((f) => {
      f.tokens?.forEach((t) => {
        changes.push({
          id: `chg_${Math.random().toString(36).substring(2, 9)}`,
          category: "tokens",
          action: t.changeType,
          key: t.key,
          label: t.name || t.key,
          oldValue: t.oldValue,
          newValue: t.newValue,
          timestamp: new Date().toISOString(),
        });
      });
    });

    const newCommit: BranchCommit = {
      id: `commit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sha: Math.random().toString(36).substring(2, 10),
      message: message || `Update tokens on branch ${activeBranch}`,
      timestamp: new Date().toISOString(),
      author: {
        uid: currentUser?.uid,
        name: currentUser?.displayName || currentUser?.email || "Team Member",
        email: currentUser?.email || "user@example.com",
        avatarUrl: currentUser?.avatarUrl,
      },
      totalAdded,
      totalModified,
      totalDeleted,
      changes,
    };

    const updatedBranches = branches.map((b) =>
      b.name === activeBranch
        ? {
            ...b,
            rawTokens,
            updatedAt: new Date().toISOString(),
            commits: [newCommit, ...(b.commits || [])],
          }
        : b
    );

    set({
      branches: updatedBranches,
      originalTokens: JSON.parse(JSON.stringify(rawTokens)),
      isDirty: false,
    });

    if (currentOrg && currentProject) {
      saveProjectBranches(currentOrg.id, currentProject.id, updatedBranches, activeBranch).catch(console.error);
      saveProjectTokens(currentOrg.id, currentProject.id, rawTokens, get().themeGroups).catch(console.error);
      updateProjectInMemoryAndCache(
        updatedBranches,
        rawTokens,
        get().themeGroups,
        activeBranch
      );
      get().logUserActivity({
        type: "git",
        title: `Committed to branch "${activeBranch}"`,
        description: message || `Committed ${totalAdded + totalModified + totalDeleted} changes.`,
      });
    }

    get().addToast({
      type: "success",
      title: "Committed to Branch",
      message: `Changes saved to branch "${activeBranch}".`,
    });
  },

  addBranchCommentAction: async (branchName: string, text: string) => {
    const { branches, currentOrg, currentProject, currentUser } = get();
    if (!text.trim()) return;

    const newComment: BranchComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      author: {
        uid: currentUser?.uid,
        name: currentUser?.displayName || currentUser?.email || "Team Member",
        email: currentUser?.email || "user@example.com",
        avatarUrl: currentUser?.avatarUrl,
      },
      resolved: false,
    };

    const updatedBranches = branches.map((b) =>
      b.name === branchName
        ? {
            ...b,
            comments: [...(b.comments || []), newComment],
          }
        : b
    );

    set({ branches: updatedBranches });

    if (currentOrg && currentProject) {
      saveProjectBranches(currentOrg.id, currentProject.id, updatedBranches).catch(console.error);
    }
  },

  resolveBranchCommentAction: async (branchName: string, commentId: string) => {
    const { branches, currentOrg, currentProject, currentUser } = get();
    const updatedBranches = branches.map((b) => {
      if (b.name !== branchName) return b;
      const updatedComments = (b.comments || []).map((c) =>
        c.id === commentId
          ? {
              ...c,
              resolved: !c.resolved,
              resolvedAt: !c.resolved ? new Date().toISOString() : undefined,
              resolvedBy: !c.resolved
                ? {
                    name: currentUser?.displayName || currentUser?.email || "Team Member",
                    email: currentUser?.email || "user@example.com",
                  }
                : undefined,
            }
          : c
      );
      return { ...b, comments: updatedComments };
    });

    set({ branches: updatedBranches });

    if (currentOrg && currentProject) {
      saveProjectBranches(currentOrg.id, currentProject.id, updatedBranches).catch(console.error);
    }
  },

  toggleSchemaAction: async (schemaId: string) => {
    const { enabledSchemas, currentOrg, currentProject, orgProjects, addToast } = get();
    const isCurrentlyEnabled = enabledSchemas.includes(schemaId);
    const updated = isCurrentlyEnabled
      ? enabledSchemas.filter((id) => id !== schemaId)
      : [...enabledSchemas, schemaId];

    set({ enabledSchemas: updated });

    if (currentOrg && currentProject) {
      const updatedProj: Project = { ...currentProject, enabledSchemas: updated };
      set({
        currentProject: updatedProj,
        orgProjects: orgProjects.map((p) => (p.id === currentProject.id ? updatedProj : p)),
      });
      await saveProjectSchemas(currentOrg.id, currentProject.id, updated);
    }

    addToast({
      type: "success",
      title: isCurrentlyEnabled ? "Extension Disabled" : "Extension Enabled",
      message: `${isCurrentlyEnabled ? "Disabled" : "Enabled"} schema "${schemaId}".`,
    });
  },

  setSchemasEnabledAction: async (schemaIds, enabled) => {
    const { enabledSchemas, currentOrg, currentProject, orgProjects, addToast } = get();
    const requestedIds = new Set(schemaIds);
    const changedIds = enabled
      ? schemaIds.filter((id) => !enabledSchemas.includes(id))
      : enabledSchemas.filter((id) => requestedIds.has(id));

    if (changedIds.length === 0) return;

    const updated = enabled
      ? [...enabledSchemas, ...changedIds]
      : enabledSchemas.filter((id) => !requestedIds.has(id));
    set({ enabledSchemas: updated });

    if (currentOrg && currentProject) {
      const updatedProj: Project = { ...currentProject, enabledSchemas: updated };
      set({
        currentProject: updatedProj,
        orgProjects: orgProjects.map((project) => (project.id === currentProject.id ? updatedProj : project)),
      });
      await saveProjectSchemas(currentOrg.id, currentProject.id, updated);
    }

    addToast({
      type: "success",
      title: enabled ? "Extensions Enabled" : "Extensions Disabled",
      message: `${enabled ? "Enabled" : "Disabled"} ${changedIds.length} extension${changedIds.length === 1 ? "" : "s"}.`,
    });
  },

  enableSchemaAction: async (schemaId: string) => {
    const { enabledSchemas, toggleSchemaAction } = get();
    if (!enabledSchemas.includes(schemaId)) {
      await toggleSchemaAction(schemaId);
    }
  },

  disableSchemaAction: async (schemaId: string) => {
    const { enabledSchemas, toggleSchemaAction } = get();
    if (enabledSchemas.includes(schemaId)) {
      await toggleSchemaAction(schemaId);
    }
  },

  isSchemaEnabled: (schemaId: string) => {
    return get().enabledSchemas.includes(schemaId);
  },
};
});
