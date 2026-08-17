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
} from "lucide-react";

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
    setSyncStatus,
    setRawTokens,
    resetDirtyState,
    addToast,
  } = useTokenStore();

  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
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

  const getInitials = (name?: string) => {
    if (!name) return "TS";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="h-12 border-b border-zinc-900 bg-[#0d0d11] px-4 flex items-center justify-between text-xs select-none relative z-30">
        {/* Left: App Logo & Conditional Breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Tokens Studio Logo */}
          <div
            onClick={onOpenSettings}
            className="flex items-center gap-2 cursor-pointer group"
            title="Tokens Studio Second Screen"
          >
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-sm">
              <Layers className="w-3 h-3 text-white" />
            </div>
            {!isConfigured && (
              <span className="font-semibold text-zinc-200 text-xs tracking-tight">
                Tokens Studio
              </span>
            )}
          </div>

          {/* Interactive Breadcrumb Hierarchy (Only rendered when configured or tokens loaded) */}
          {isConfigured && hasTokens && (
            <nav className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
              <span
                onClick={onOpenSettings}
                className="hover:text-zinc-200 cursor-pointer transition-colors font-medium text-zinc-300"
              >
                {credentials.repo}: Tokens
              </span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">Themes</span>
              <span className="text-zinc-600">/</span>

              {/* Active Theme Group Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowThemeGroupMenu(!showThemeGroupMenu)}
                  className="flex items-center gap-1 font-semibold text-zinc-100 hover:text-violet-300 transition-colors py-0.5 px-1 rounded hover:bg-zinc-800/60"
                >
                  <span>{activeGroup?.name || "Theme"}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>

                {/* Theme Group Menu Dropdown */}
                {showThemeGroupMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowThemeGroupMenu(false)}
                    />
                    <div className="absolute left-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
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
                              ? "bg-violet-600/20 text-violet-200 font-semibold"
                              : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
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
            </nav>
          )}
        </div>

        {/* Right: Conditional Controls */}
        <div className="flex items-center gap-2">
          {/* Dirty changes indicator tag */}
          {isDirty && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-400 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50 mr-1 animate-pulse">
              unsaved changes
            </span>
          )}

          {isConfigured ? (
            <>
              {/* 1. Avatar */}
              <div
                onClick={onOpenSettings}
                className="w-6 h-6 rounded-full overflow-hidden border border-zinc-700/80 cursor-pointer bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm hover:scale-105 transition-transform"
                title={credentials.owner ? `Connected as: ${credentials.owner}` : "Configure Git Profile"}
              >
                {userProfile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.displayName || "Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials(credentials.owner || "TS")}</span>
                )}
              </div>

              {/* 2. Pull Button */}
              <button
                onClick={handlePull}
                disabled={isPulling}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer font-medium text-[11px] disabled:opacity-50"
                title="Pull latest tokens from current branch"
              >
                <DownloadCloud className={`w-3.5 h-3.5 text-zinc-400 ${isPulling ? "animate-bounce" : ""}`} />
                <span>{isPulling ? "Pulling..." : "Pull"}</span>
              </button>

              {/* 3. Push Button */}
              <button
                onClick={() => setShowPushModal(true)}
                disabled={isPushing}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all cursor-pointer font-medium text-[11px] disabled:opacity-50 ${
                  isDirty
                    ? "bg-violet-600/20 border-violet-500/60 text-violet-200 hover:bg-violet-600/30"
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white"
                }`}
                title="Push changes directly to branch"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isDirty ? "text-violet-400" : "text-zinc-400"}`} />
                <span>Push</span>
              </button>

              {/* 4. Branch Pill Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowBranchMenu(!showBranchMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer font-mono text-[11px]"
                >
                  <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="max-w-[130px] truncate">{credentials.branch || "main"}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                </button>

                {/* Branch Switcher Dropdown */}
                {showBranchMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowBranchMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2 max-h-[85vh] flex flex-col">
                      {/* Repository Name Information */}
                      <div className="px-2.5 py-2 bg-zinc-950/60 border border-zinc-800/80 rounded-lg">
                        <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                          Repository Name
                        </div>
                        <div className="font-mono text-xs text-zinc-100 font-semibold truncate mt-0.5">
                          {credentials.repo || "planet"}
                        </div>
                      </div>

                      {/* Switch Branch Section */}
                      <div className="flex-1 flex flex-col min-h-0 pt-0.5">
                        <div className="flex items-center justify-between px-1 py-1 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                          <span>Switch Branch</span>
                          {loadingBranches && (
                            <RefreshCw className="w-3 h-3 animate-spin text-zinc-500" />
                          )}
                        </div>

                        {/* Search Branch Input */}
                        {branches.length > 5 && (
                          <div className="py-1">
                            <div className="relative">
                              <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Filter branches..."
                                value={branchSearch}
                                onChange={(e) => setBranchSearch(e.target.value)}
                                className="w-full pl-6 pr-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {/* Branch List */}
                        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 mt-0.5">
                          {filteredBranches.length === 0 && !loadingBranches ? (
                            <div className="px-2.5 py-2 text-[11px] text-zinc-500 italic">
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
                                      ? "bg-violet-600/20 text-violet-200 font-semibold"
                                      : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                  }`}
                                >
                                  <span className="truncate">{b}</span>
                                  {isCurrent && <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />}
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
        </div>
      </header>

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
