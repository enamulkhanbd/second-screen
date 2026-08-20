"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  GitBranch,
  ChevronDown,
  UploadCloud,
  DownloadCloud,
  Settings,
  Layers,
  CheckCircle2,
  Search,
  Check,
  RefreshCw,
  FolderGit2,
  LayoutGrid,
  Workflow,
  Sun,
  Moon,
  AlignLeft,
  Braces,
  User,
} from "lucide-react";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { AuthModal } from "@/components/AuthModal";

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const {
    credentials,
    setCredentials,
    rawTokens,
    syncMeta,
    themeGroups,
    activeThemeGroupId,
    setActiveThemeGroup,
    userProfile,
    isDirty,
    viewMode,
    setViewMode,
    setSyncStatus,
    setRawTokens,
    resetDirtyState,
    addToast,
    // Theme mode
    themeMode,
    setThemeMode,
    // Active tab and set
    sidebarTab,
    setSidebarTab,
    activeSet,
    tokensViewMode,
    setTokensViewMode,
    currentUser,
  } = useTokenStore();

  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showThemeGroupMenu, setShowThemeGroupMenu] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [showPushModal, setShowPushModal] = useState(false);

  // Branch list state
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");

  const isConfigured = Boolean(credentials.repo && credentials.owner);
  const activeGroup = themeGroups.find((g) => g.id === activeThemeGroupId) || themeGroups[0];
  const hasTokens = Object.keys(rawTokens).length > 0;

  // Fetch branch list whenever branch dropdown is opened
  useEffect(() => {
    if (!showBranchMenu || !isConfigured || !credentials.pat) return;

    let isMounted = true;
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const res = await fetch("/api/git/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.branches)) {
            setBranches(data.branches);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) setLoadingBranches(false);
      }
    };

    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, [showBranchMenu, isConfigured, credentials]);

  const filteredBranches = useMemo(() => {
    if (!branchSearch.trim()) return branches;
    return branches.filter((b) =>
      b.toLowerCase().includes(branchSearch.toLowerCase())
    );
  }, [branches, branchSearch]);

  const handlePullForBranch = async (targetBranch: string) => {
    if (!credentials.pat) {
      onOpenSettings();
      return;
    }

    setIsPulling(true);
    setSyncStatus("fetching");

    const updatedCreds = { ...credentials, branch: targetBranch };
    setCredentials({ branch: targetBranch });

    try {
      const res = await fetch("/api/git/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCreds),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Fetch failed (${res.status})`);
      }

      if (data.userProfile) {
        useTokenStore.getState().setUserProfile(data.userProfile);
      }
      setRawTokens(data.tokens, data.syncMeta);
      setSyncStatus("success");
      addToast({
        type: "success",
        title: `Switched to branch '${targetBranch}'`,
        message: `Fetched tokens from ${credentials.repo}@${targetBranch}.`,
      });
      setShowBranchMenu(false);
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: "Branch Switch Failed",
        message: err.message,
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleCloudSync = async () => {
    setIsPulling(true);
    setSyncStatus("fetching");
    try {
      const res = await fetch("/api/v1/tokens", {
        headers: { "x-internal-client": "second-screen" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch from Cloud API");
      }
      setRawTokens(data.rawTokens);
      setSyncStatus("success");
      addToast({
        type: "success",
        title: "Synced from Figma / Cloud",
        message: `Loaded ${data.resolvedTokens?.length || 0} tokens synchronized from Figma!`,
      });
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: "Cloud Sync Failed",
        message: err.message,
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handlePull = () => handlePullForBranch(credentials.branch || "main");

  const handleDirectPush = async () => {
    if (!credentials.pat) {
      onOpenSettings();
      return;
    }

    setIsPushing(true);
    setSyncStatus("pushing");

    try {
      const res = await fetch("/api/git/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials,
          rawTokens,
          syncMeta,
          commitMessage: commitMessage.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Push failed (${res.status})`);
      }

      resetDirtyState();
      setSyncStatus("success");
      setShowPushModal(false);
      setShowBranchMenu(false);
      setCommitMessage("");
      addToast({
        type: "success",
        title: `Pushed to ${credentials.branch}`,
        message: `Committed changes to ${credentials.repo}.`,
      });
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: "Push Commit Failed",
        message: err.message,
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <>
      <header className="h-12 border-b border-zinc-200 dark:border-zinc-900 bg-white dark:bg-[#0d0d11] px-4 flex items-center justify-between text-xs select-none relative z-30 transition-colors">
        {/* Left: App Logo & System Name */}
        <div className="flex items-center gap-3">
          {/* Second Screen Logo & Brand -> Redirects to Dashboard */}
          <div
            onClick={() => setSidebarTab("dashboard")}
            className="flex items-center gap-2 cursor-pointer group"
            title="Dashboard (Home)"
          >
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs tracking-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors hidden md:inline">
              Second Screen
            </span>
          </div>

          <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

          {/* Multi-Tenant Organization & Project Switcher */}
          <OrgSwitcher onOpenAuth={() => setIsAuthOpen(true)} />

          {/* Interactive Breadcrumb Hierarchy */}
          {isConfigured && (
            <>
              <span className="text-zinc-400 dark:text-zinc-700 font-mono text-[11px]">/</span>
              <nav className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                <span
                  onClick={onOpenSettings}
                  className="hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer transition-colors font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {credentials.repo}
                </span>

                <span className="text-zinc-300 dark:text-zinc-600">/</span>

                {sidebarTab === "dashboard" && (
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Dashboard
                  </span>
                )}

                {sidebarTab === "releases" && (
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Releases
                  </span>
                )}

                {sidebarTab === "tokens" && (
                  <>
                    <button
                      onClick={() => setSidebarTab("tokens")}
                      className="hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer font-medium"
                    >
                      Tokens
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-600">/</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">
                      {activeSet}
                    </span>
                  </>
                )}

                {sidebarTab === "themes" && (
                  <>
                    <button
                      onClick={() => setSidebarTab("themes")}
                      className="hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer font-medium"
                    >
                      Themes
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-600">/</span>

                    {/* Active Theme Group Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowThemeGroupMenu(!showThemeGroupMenu)}
                        className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors py-0.5 px-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                      >
                        <span>{activeGroup?.name || "Theme"}</span>
                        <ChevronDown className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                      </button>

                      {/* Theme Group Menu Dropdown */}
                      {showThemeGroupMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowThemeGroupMenu(false)}
                          />
                          <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-3 py-1 text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
                              Theme Groups
                            </div>
                            {themeGroups.map((grp) => (
                              <button
                                key={grp.id}
                                onClick={() => {
                                  setActiveThemeGroup(grp.id);
                                  setShowThemeGroupMenu(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors ${
                                  grp.id === activeGroup?.id
                                    ? "bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-200 font-semibold"
                                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                                }`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: grp.color }}
                                />
                                <span className="truncate">{grp.name}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </nav>
            </>
          )}
        </div>

        {/* Right: Conditional Controls + Dark/Light Theme Switcher on Far Right */}
        <div className="flex items-center gap-2">
          {/* Dirty changes indicator tag */}
          {isDirty && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/50 mr-1 animate-pulse">
              unsaved changes
            </span>
          )}

          {/* View Mode Switcher: Matrix vs Flow (Shown when in Themes tab) */}
          {hasTokens && sidebarTab === "themes" && (
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium">
              <button
                onClick={() => setViewMode("matrix")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "matrix"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs ring-1 ring-zinc-200 dark:ring-zinc-700"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
                title="Theme Matrix Comparison Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Matrix</span>
              </button>

              <button
                onClick={() => setViewMode("flow")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "flow"
                    ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs ring-1 ring-zinc-200 dark:ring-zinc-700"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
                title="Visual Token Flow & Dependency Graph"
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>Flow Graph</span>
              </button>
            </div>
          )}

          {isConfigured ? (
            <>
              {/* Sync from Figma Cloud Button */}
              <button
                onClick={handleCloudSync}
                disabled={isPulling}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer font-medium text-[11px] disabled:opacity-50"
                title="Pull changes pushed from Figma Plugin"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isPulling ? "animate-spin" : ""}`} />
                <span>Sync Figma</span>
              </button>

              {/* 1. Pull Button */}
              <button
                onClick={handlePull}
                disabled={isPulling}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer font-medium text-[11px] disabled:opacity-50"
                title="Pull latest tokens from current branch"
              >
                <DownloadCloud className={`w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 ${isPulling ? "animate-bounce" : ""}`} />
                <span>Git Pull</span>
              </button>

              {/* 2. Push Button */}
              <button
                onClick={() => setShowPushModal(true)}
                disabled={isPushing}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all cursor-pointer font-medium text-[11px] disabled:opacity-50 ${
                  isDirty
                    ? "bg-violet-50 dark:bg-violet-600/20 border-violet-300 dark:border-violet-500/60 text-violet-700 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-600/30"
                    : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                }`}
                title="Push changes directly to branch"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isDirty ? "text-violet-600 dark:text-violet-400" : "text-zinc-500 dark:text-zinc-400"}`} />
                <span>Push</span>
              </button>

              {/* 3. Branch Pill Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isConfigured) {
                      onOpenSettings();
                    } else {
                      setShowBranchMenu(!showBranchMenu);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer font-mono text-[11px]"
                >
                  <GitBranch className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span className="max-w-[130px] truncate">
                    {credentials.branch || "Branch"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                </button>

                {/* Branch Switcher Dropdown */}
                {showBranchMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowBranchMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2 max-h-[85vh] flex flex-col">
                      {/* Repository Name Information */}
                      <div className="px-2.5 py-2 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-lg">
                        <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                          Repository Name
                        </div>
                        <div className="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-semibold truncate mt-0.5">
                          {credentials.repo || "Not Connected"}
                        </div>
                      </div>

                      {/* Switch Branch Section */}
                      <div className="flex-1 flex flex-col min-h-0 pt-0.5">
                        <div className="flex items-center justify-between px-1 py-1 text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                          <span>Switch Branch</span>
                          {loadingBranches && (
                            <RefreshCw className="w-3 h-3 animate-spin text-zinc-400 dark:text-zinc-500" />
                          )}
                        </div>

                        {/* Search Branch Input */}
                        {branches.length > 5 && (
                          <div className="py-1">
                            <div className="relative">
                              <Search className="w-3 h-3 text-zinc-400 dark:text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Filter branches..."
                                value={branchSearch}
                                onChange={(e) => setBranchSearch(e.target.value)}
                                className="w-full pl-6 pr-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-violet-500 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {/* Branch List */}
                        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 mt-0.5">
                          {filteredBranches.length === 0 && !loadingBranches ? (
                            <div className="px-2.5 py-2 text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                              {branches.length === 0
                                ? `Current: ${credentials.branch || "main"}`
                                : "No matching branches"}
                            </div>
                          ) : (
                            filteredBranches.map((b) => {
                              const isCurrent = b === (credentials.branch || "main");

                              return (
                                <button
                                  key={b}
                                  onClick={() => handlePullForBranch(b)}
                                  disabled={isPulling}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-mono transition-colors ${
                                    isCurrent
                                      ? "bg-violet-50 dark:bg-violet-600/20 text-violet-700 dark:text-violet-200 font-semibold"
                                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                                  }`}
                                >
                                  <span className="truncate">{b}</span>
                                  {isCurrent && <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 flex-shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Connect Repository</span>
            </button>
          )}

          {/* Divider before far-right theme switcher */}
          <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

          {/* Theme Mode Toggle on the Far Right */}
          <button
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer shadow-sm flex-shrink-0"
            title={themeMode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {themeMode === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-violet-600" />
            )}
          </button>

          {/* User Account / Profile Button */}
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer shadow-sm flex-shrink-0"
            title={currentUser ? `Signed in as ${currentUser.displayName || currentUser.email}` : "Sign In / Profile"}
          >
            {currentUser ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email[0].toUpperCase()}
              </div>
            ) : (
              <User className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Push Direct Commit Modal */}
      {showPushModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/20">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Direct Commit to Branch</h3>
                <p className="text-xs text-zinc-400 font-mono">
                  {credentials.repo} @ {credentials.branch}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Commit Message
              </label>
              <textarea
                rows={2}
                placeholder="chore(tokens): update theme matrix tokens"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-violet-500 text-xs text-zinc-100 placeholder-zinc-500 outline-none font-mono"
              />
            </div>

            <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 text-xs text-zinc-400 space-y-1">
              <p className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Direct Branch Rule
              </p>
              <p className="text-[11px] leading-relaxed">
                Tokens will be committed directly to <span className="font-mono text-violet-300">{credentials.branch}</span> preserving all raw alias references.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPushModal(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDirectPush}
                disabled={isPushing}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPushing ? "Pushing..." : "Confirm & Commit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
