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
  setCredentials: (creds: Partial<GitCredentials>) => void;
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

  // View Filters
  activeSet: string;
  activeGroup: string;
  searchQuery: string;

  // Status & Notifications
  syncStatus: SyncStatus;
  syncError: string | null;
  syncMeta: SyncMeta | null;
  toasts: ToastMessage[];

  // Actions
  setRawTokens: (doc: RawTokensDocument, meta?: SyncMeta) => void;
  setSyncMeta: (meta: SyncMeta | null) => void;
  setResolvedTokens: (tokens: FlattenedToken[]) => void;
  updateSingleToken: (path: string[], newValue: string) => void;
  setActiveSet: (setName: string) => void;
  setActiveGroup: (group: string) => void;
  setSearchQuery: (query: string) => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  addToast: (toast: Omit<ToastMessage, "id" | "timestamp">) => void;
  removeToast: (id: string) => void;
  resetDirtyState: () => void;
  loadSampleData: () => void;
}

const DEFAULT_CREDENTIALS: GitCredentials = {
  provider: "azure",
  owner: "",
  project: "",
  repo: "",
  branch: "main",
  path: "tokens.json",
  pat: "",
};

export const useTokenStore = create<TokenStoreState>((set, get) => ({
  credentials: DEFAULT_CREDENTIALS,
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),

  setCredentials: (newCreds) =>
    set((state) => {
      const updated = { ...state.credentials, ...newCreds };
      if (typeof window !== "undefined") {
        try {
          const { pat, ...safeCreds } = updated;
          localStorage.setItem("ts_second_screen_creds", JSON.stringify(safeCreds));
        } catch {
          // LocalStorage save error
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
  },

  setActiveThemeOption: (optionId) => set({ activeThemeOptionId: optionId }),

  activeSet: "ALL",
  activeGroup: "all",
  searchQuery: "",

  syncStatus: "idle",
  syncError: null,
  syncMeta: null,
  toasts: [],

  setRawTokens: (doc, meta) => {
    const { activeSet } = get();
    const resolved = flattenAndResolveTokens(doc, activeSet);
    const groups = extractThemeGroups(doc);
    const defaultGroup =
      groups.find((g) => g.name.toLowerCase() === "theme") || groups[0];

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
