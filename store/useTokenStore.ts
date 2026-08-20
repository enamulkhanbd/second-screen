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
} from "@/types/tokens";
import { flattenAndResolveTokens, setTokenAtKeyPath } from "@/utils/transformTokens";
import { extractThemeGroups } from "@/utils/themeHelpers";
import { SAMPLE_TOKENS_DATA } from "@/data/sampleTokens";

interface TokenStoreState {
  // Git Credentials
  credentials: GitCredentials;
  setCredentials: (creds: Partial<GitCredentials>, rememberPat?: boolean) => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;

  // Dual State
  rawTokens: RawTokensDocument;
  resolvedTokens: FlattenedToken[];
  isDirty: boolean;

  // Theme Groups Architecture
  themeGroups: ThemeGroup[];
  activeThemeGroupId: string;
  activeThemeOptionId: string;
  setActiveThemeGroup: (groupId: string) => void;
  setActiveThemeOption: (optionId: string) => void;

  // Theme Mode (light/dark)
  themeMode: "light" | "dark";
  setThemeMode: (mode: "light" | "dark") => void;

  // Sidebar Tab (dashboard, tokens, or themes)
  sidebarTab: "dashboard" | "tokens" | "themes";
  setSidebarTab: (tab: "dashboard" | "tokens" | "themes") => void;

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
  loadSampleData: () => void;
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

export const useTokenStore = create<TokenStoreState>((set, get) => ({
  credentials: DEFAULT_CREDENTIALS,
  userProfile: null,
  setUserProfile: (profile) => {
    set({ userProfile: profile });
    if (typeof window !== "undefined" && profile) {
      try {
        localStorage.setItem("ts_second_screen_user", JSON.stringify(profile));
      } catch {}
    }
  },

  setCredentials: (newCreds, rememberPat = true) =>
    set((state) => {
      const updated = { ...state.credentials, ...newCreds };
      if (typeof window !== "undefined") {
        try {
          const { pat, ...safeCreds } = updated;
          localStorage.setItem("ts_second_screen_creds", JSON.stringify(safeCreds));

          // Save PAT in sessionStorage (secure tab lifecycle) and localStorage if requested
          if (updated.pat) {
            sessionStorage.setItem("ts_second_screen_pat", updated.pat);
            if (rememberPat) {
              localStorage.setItem("ts_second_screen_pat_enc", updated.pat);
            }
          }
        } catch {
          // Storage error
        }
      }
      return { credentials: updated };
    }),

  rawTokens: {},
  resolvedTokens: [],
  isDirty: false,

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
      } catch {}
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
      } catch {}
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
      } catch {}
    }
  },

  sidebarTab: "dashboard",
  setSidebarTab: (tab) => {
    set({ sidebarTab: tab });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_sidebar_tab", tab);
      } catch {}
    }
  },

  tokensViewMode: "preview",
  setTokensViewMode: (mode) => {
    set({ tokensViewMode: mode });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ts_tokens_view_mode", mode);
      } catch {}
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
      set({ syncStatus: "success", syncError: null });
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
      const savedCreds = localStorage.getItem("ts_second_screen_creds");
      const sessionPat =
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
      const savedUser = localStorage.getItem("ts_second_screen_user");
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

      // 5. Restore Active Sidebar Tab (defaults to themes) and Tokens View Mode
      const savedTab = localStorage.getItem("ts_sidebar_tab") as
        | "dashboard"
        | "tokens"
        | "themes"
        | null;
      const initialTab: "dashboard" | "tokens" | "themes" =
        savedTab && ["dashboard", "tokens", "themes"].includes(savedTab)
          ? savedTab
          : "dashboard";

      const savedTokensViewMode =
        (localStorage.getItem("ts_tokens_view_mode") as "preview" | "json") ||
        "preview";

      set({
        credentials: parsedCreds,
        userProfile,
        viewMode: savedViewMode,
        themeMode: initialTheme,
        sidebarTab: initialTab,
        tokensViewMode: savedTokensViewMode,
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

      // 5. Automatically fetch fresh live tokens from remote git repository if credentials exist
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

    // NOTE: Tokens remain strictly in-memory (Zustand) with ZERO local cache persistence

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
      } catch {}
    }

    set({
      rawTokens: updatedRawDoc,
      themeGroups: updatedGroups,
      resolvedTokens: updatedResolved,
      activeThemeGroupId: targetGroup.id,
      activeThemeOptionId: optionId,
      isDirty: true,
    });

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
      } catch {}
    }

    set({
      rawTokens: updatedRawDoc,
      themeGroups: updatedGroups,
      resolvedTokens: updatedResolved,
      activeThemeGroupId: newMatchedGroup?.id || "",
      isDirty: true,
    });

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
      } catch {}
    }

    set({
      rawTokens: updatedRawDoc,
      themeGroups: updatedGroups,
      resolvedTokens: updatedResolved,
      activeThemeGroupId: newMatchedGroup?.id || "",
      activeThemeOptionId: newMatchedGroup?.options[0]?.id || "",
      isDirty: true,
    });

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
      } catch {}
    }

    set({
      rawTokens: updatedRawDoc,
      themeGroups: updatedGroups,
      resolvedTokens: updatedResolved,
      activeThemeGroupId: remainingGroup?.id || "",
      activeThemeOptionId: remainingGroup?.options[0]?.id || "",
      isDirty: true,
    });

    get().addToast({
      type: "info",
      title: "Theme Group Deleted",
      message: `Deleted "${targetGroup.name}".`,
    });
  },

  loadSampleData: () => {
    const resolved = flattenAndResolveTokens(SAMPLE_TOKENS_DATA, "ALL");
    const groups = extractThemeGroups(SAMPLE_TOKENS_DATA);
    const themeGroup =
      groups.find((g) => g.name.toLowerCase() === "theme") || groups[0];

    set({
      rawTokens: SAMPLE_TOKENS_DATA,
      resolvedTokens: resolved,
      themeGroups: groups,
      activeThemeGroupId: themeGroup?.id || "grp-theme",
      activeThemeOptionId: themeGroup?.options[0]?.id || "opt-dark",
      activeSet: "ALL",
      activeGroup: "all",
      isDirty: false,
    });
    get().addToast({
      type: "info",
      title: "Sample Theme Matrix Loaded",
      message: "Loaded Tokens Studio multi-theme matrix with Dark & Light modes.",
    });
  },
}));
