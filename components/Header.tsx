"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  GitBranch,
  ChevronDown,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  Search,
  Check,
  RefreshCw,
  FolderGit2,
  LayoutGrid,
  Workflow,
  Sun,
  Moon,
  Layers,
  User,
} from "lucide-react";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { AuthModal } from "@/components/AuthModal";
import { AcceptInviteModal } from "@/components/AcceptInviteModal";
import { ROLE_DEFINITIONS } from "@/types/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    currentUser,
    getCurrentUserRole,
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

  const hasTokens = Object.keys(rawTokens).length > 0;
  const activeGroup = themeGroups.find((g) => g.id === activeThemeGroupId) || themeGroups[0];
  const isConfigured = Boolean(
    (credentials.repo && credentials.owner) ||
    hasTokens ||
    currentUser
  );

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

      setRawTokens(data.tokens, data.syncMeta);
      setSyncStatus("success");
      setShowBranchMenu(false);

      addToast({
        type: "success",
        title: `Switched & Fetched ${targetBranch}`,
        message: `Loaded tokens from branch "${targetBranch}".`,
      });
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

  const handlePull = async () => {
    if (!credentials.pat) {
      onOpenSettings();
      return;
    }

    setIsPulling(true);
    setSyncStatus("fetching");

    try {
      const res = await fetch("/api/git/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Fetch failed (${res.status})`);
      }

      setRawTokens(data.tokens, data.syncMeta);
      setSyncStatus("success");
      addToast({
        type: "success",
        title: "Tokens Pulled from Git",
        message: `Synced with ${credentials.repo}@${credentials.branch}.`,
      });
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: "Git Pull Failed",
        message: err.message,
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleCloudSync = async () => {
    setIsPulling(true);
    try {
      const orgId = useTokenStore.getState().currentOrg?.id;
      const projectId = useTokenStore.getState().currentProject?.id;
      const query = orgId && projectId ? `?orgId=${encodeURIComponent(orgId)}&projectId=${encodeURIComponent(projectId)}` : "";
      const res = await fetch(`/api/v1/tokens${query}`);
      const data = await res.json();
      if (data.success && data.rawTokens) {
        setRawTokens(data.rawTokens);
        addToast({
          type: "success",
          title: "Figma Cloud Synced",
          message: `Loaded ${data.resolvedTokens?.length || 0} tokens from cloud.`,
        });
      } else {
        throw new Error(data.error || "No tokens found in cloud");
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Cloud Sync Failed",
        message: err.message,
      });
    } finally {
      setIsPulling(false);
    }
  };

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
    <TooltipProvider>
      <header className="h-12 border-b border-border bg-background/95 backdrop-blur px-4 flex items-center justify-between text-xs select-none relative z-30 transition-colors">
        {/* Left: App Logo & System Name */}
        <div className="flex items-center gap-3">
          {/* Tokens Platform Logo & Brand -> Redirects to Dashboard */}
          <div
            onClick={() => setSidebarTab("dashboard")}
            className="flex items-center gap-2 cursor-pointer group"
            title="Dashboard (Home)"
          >
            <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-sm group-hover:opacity-90 transition-opacity">
              <Layers className="w-3 h-3" />
            </div>
            <span className="font-semibold text-foreground text-xs tracking-tight group-hover:text-primary transition-colors hidden md:inline">
              Tokens Platform
            </span>
          </div>

          {/* Multi-Tenant Organization & Project Switcher & Breadcrumbs (Only when configured / logged in) */}
          {isConfigured && (
            <>
              <div className="w-[1px] h-4 bg-border mx-0.5" />
              <OrgSwitcher onOpenAuth={() => setIsAuthOpen(true)} />

              {/* Interactive Breadcrumb Hierarchy */}
              <span className="text-muted-foreground font-mono text-[11px]">/</span>
              <nav className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
                {credentials.repo && (
                  <>
                    <span
                      onClick={onOpenSettings}
                      className="hover:text-foreground cursor-pointer transition-colors font-medium text-foreground"
                    >
                      {credentials.repo}
                    </span>
                    <span className="text-muted-foreground/50">/</span>
                  </>
                )}

                {sidebarTab === "dashboard" && (
                  <span className="font-semibold text-foreground">
                    Dashboard
                  </span>
                )}

                {sidebarTab === "documentation" && (
                  <span className="font-semibold text-foreground">
                    Documentation
                  </span>
                )}

                {sidebarTab === "assets" && (
                  <span className="font-semibold text-foreground">
                    Assets
                  </span>
                )}

                {sidebarTab === "exports" && (
                  <span className="font-semibold text-foreground">
                    Exports
                  </span>
                )}

                {sidebarTab === "releases" && (
                  <span className="font-semibold text-foreground">
                    Releases
                  </span>
                )}

                {sidebarTab === "activity" && (
                  <span className="font-semibold text-foreground">
                    Activity
                  </span>
                )}

                {sidebarTab === "integrations" && (
                  <span className="font-semibold text-foreground">
                    Integrations
                  </span>
                )}

                {sidebarTab === "mcp" && (
                  <span className="font-semibold text-foreground">
                    MCP &amp; CLI
                  </span>
                )}

                {(sidebarTab === "variables" || sidebarTab === "tokens") && (
                  <>
                    <button
                      onClick={() => setSidebarTab("tokens")}
                      className="hover:text-foreground cursor-pointer font-medium"
                    >
                      Tokens
                    </button>
                    <span className="text-muted-foreground/50">/</span>
                    <span className="font-semibold text-foreground truncate max-w-[140px]">
                      {activeSet}
                    </span>
                  </>
                )}

                {sidebarTab === "themes" && (
                  <>
                    <button
                      onClick={() => setSidebarTab("themes")}
                      className="hover:text-foreground cursor-pointer font-medium"
                    >
                      Themes
                    </button>
                    <span className="text-muted-foreground/50">/</span>

                    {/* Active Theme Group Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowThemeGroupMenu(!showThemeGroupMenu)}
                        className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors py-0.5 px-1 rounded hover:bg-muted"
                      >
                        <span>{activeGroup?.name || "Theme"}</span>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </button>

                      {/* Theme Group Menu Dropdown */}
                      {showThemeGroupMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowThemeGroupMenu(false)}
                          />
                          <div className="absolute left-0 top-full mt-1 w-48 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-3 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
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
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-foreground hover:bg-muted"
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

        {/* Right: Conditional Controls */}
        <div className="flex items-center gap-2">
          {/* Dirty changes indicator tag */}
          {isDirty && (
            <Badge variant="warning" className="animate-pulse">
              unsaved changes
            </Badge>
          )}

          {/* View Mode Switcher: Matrix vs Flow */}
          {hasTokens && sidebarTab === "themes" && (
            <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border text-[11px] font-medium">
              <button
                onClick={() => setViewMode("matrix")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "matrix"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
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
                    ? "bg-background text-primary font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloudSync}
                disabled={isPulling}
                className="h-8 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                title="Pull changes pushed from Figma Plugin"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? "animate-spin" : ""}`} />
                <span>Sync Figma</span>
              </Button>

              {/* 1. Pull Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePull}
                disabled={isPulling}
                className="h-8 gap-1.5 text-xs"
                title="Pull latest tokens from current branch"
              >
                <DownloadCloud className={`w-3.5 h-3.5 text-muted-foreground ${isPulling ? "animate-bounce" : ""}`} />
                <span>Git Pull</span>
              </Button>

              {/* 2. Push Button */}
              <Button
                variant={isDirty ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPushModal(true)}
                disabled={isPushing}
                className="h-8 gap-1.5 text-xs"
                title="Push changes directly to branch"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Push</span>
              </Button>

              {/* 3. Branch Pill Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!isConfigured) {
                      onOpenSettings();
                    } else {
                      setShowBranchMenu(!showBranchMenu);
                    }
                  }}
                  className="h-8 gap-1.5 font-mono text-xs"
                >
                  <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="max-w-[130px] truncate">
                    {credentials.branch || "Branch"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </Button>

                {/* Branch Switcher Dropdown */}
                {showBranchMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowBranchMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2 max-h-[85vh] flex flex-col">
                      {/* Repository Name Information */}
                      <div className="px-2.5 py-2 bg-muted/60 border border-border rounded-lg">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Repository Name
                        </div>
                        <div className="font-mono text-xs text-foreground font-semibold truncate mt-0.5">
                          {credentials.repo || "Not Connected"}
                        </div>
                      </div>

                      {/* Switch Branch Section */}
                      <div className="flex-1 flex flex-col min-h-0 pt-0.5">
                        <div className="flex items-center justify-between px-1 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          <span>Switch Branch</span>
                          {loadingBranches && (
                            <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                          )}
                        </div>

                        {/* Search Branch Input */}
                        {branches.length > 5 && (
                          <div className="py-1">
                            <div className="relative">
                              <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                              <Input
                                type="text"
                                placeholder="Filter branches..."
                                value={branchSearch}
                                onChange={(e) => setBranchSearch(e.target.value)}
                                className="h-7 pl-6 text-xs font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {/* Branch List */}
                        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 mt-0.5">
                          {filteredBranches.length === 0 && !loadingBranches ? (
                            <div className="px-2.5 py-2 text-[11px] text-muted-foreground italic">
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
                                      ? "bg-primary/10 text-primary font-semibold"
                                      : "text-foreground hover:bg-muted"
                                  }`}
                                >
                                  <span className="truncate">{b}</span>
                                  {isCurrent && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
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
          ) : null}

          {/* Divider before far-right theme switcher */}
          <div className="w-[1px] h-4 bg-border mx-0.5" />

          {/* Theme Mode Toggle on the Far Right */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
              >
                {themeMode === "dark" ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-primary" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {themeMode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </TooltipContent>
          </Tooltip>

          {/* User Account / Profile Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAuthOpen(true)}
                className="h-8 gap-1.5 px-2"
              >
                {currentUser ? (
                  <>
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center shadow-xs">
                      {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email[0].toUpperCase()}
                    </div>
                    <Badge variant="violet" className="text-[10px] py-0 px-1.5 font-bold gap-1 capitalize hidden sm:inline-flex">
                      <span>{ROLE_DEFINITIONS[getCurrentUserRole()].icon}</span>
                      <span>{ROLE_DEFINITIONS[getCurrentUserRole()].title}</span>
                    </Badge>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline text-xs">Sign In</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {currentUser
                ? `Signed in as ${currentUser.displayName || currentUser.email} (${ROLE_DEFINITIONS[getCurrentUserRole()].title})`
                : "Sign In / Free Workspace Setup"}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Accept Invite Modal (Triggered automatically on invite detection) */}
      <AcceptInviteModal />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Push Direct Commit Modal */}
      <Dialog open={showPushModal} onOpenChange={setShowPushModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Direct Commit to Branch</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {credentials.repo} @ {credentials.branch}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Commit Message
              </label>
              <textarea
                rows={2}
                placeholder="chore(tokens): update theme matrix tokens"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full p-2.5 rounded-md border border-input bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
              />
            </div>

            <div className="bg-muted/60 p-3 rounded-lg border border-border text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5 text-foreground font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Direct Branch Rule
              </p>
              <p className="text-[11px] leading-relaxed">
                Tokens will be committed directly to <span className="font-mono text-primary">{credentials.branch}</span> preserving all raw alias references.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPushModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDirectPush}
              disabled={isPushing}
            >
              {isPushing ? "Pushing..." : "Confirm & Commit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
