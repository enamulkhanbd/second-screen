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
  LayoutGrid,
  Workflow,
  Sun,
  Moon,
  Layers,
  User,
  Users,
  LogOut,
} from "lucide-react";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { AuthModal } from "@/components/AuthModal";
import { AcceptInviteModal } from "@/components/AcceptInviteModal";
import { ROLE_DEFINITIONS } from "@/types/tenant";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
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
    setCurrentUser,
    getCurrentUserRole,
    figmaVariables,
    figmaResolvedVariables,
    figmaUpdatedAt,
    // Remote Git updates tracking
    hasRemoteChanges,
    checkRemoteUpdates,
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

  // Specific Showing Logic:
  // 1. Git Sync is configured -> show Git Pull, Push, and Branch dropdown
  const isGitConfigured = Boolean(
    currentUser && credentials.repo && credentials.owner
  );

  // 2. Figma Plugin is connected -> show Sync Figma button
  const isFigmaConnected = Boolean(
    currentUser &&
      (figmaUpdatedAt ||
        (figmaVariables && Object.keys(figmaVariables).length > 0) ||
        (figmaResolvedVariables && figmaResolvedVariables.length > 0))
  );

  // Periodically check for remote updates in Git repository
  useEffect(() => {
    if (!isGitConfigured || !credentials.pat) return;

    // Initial check
    checkRemoteUpdates();

    // Periodic poll every 45s
    const interval = setInterval(() => {
      checkRemoteUpdates();
    }, 45000);

    // Immediate check on tab focus
    const handleFocus = () => {
      checkRemoteUpdates();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isGitConfigured, credentials.owner, credentials.repo, credentials.branch, credentials.pat, checkRemoteUpdates]);

  // Fetch branch list whenever branch dropdown is opened
  useEffect(() => {
    if (!showBranchMenu || !isGitConfigured || !credentials.pat) return;

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
  }, [showBranchMenu, isGitConfigured, credentials]);

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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch from branch");
      }

      const data = await res.json();
      setRawTokens(data.tokens);
      resetDirtyState();
      useTokenStore.setState({
        lastFetchedSha: data.commitSha || null,
        hasRemoteChanges: false,
      });
      setShowBranchMenu(false);
      setSyncStatus("success");
      addToast({
        type: "success",
        title: "Switched & Pulled Branch",
        message: `Active branch is now ${targetBranch}.`,
      });
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: "Switch Branch Failed",
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch tokens");
      }

      const data = await res.json();
      setRawTokens(data.tokens);
      resetDirtyState();
      useTokenStore.setState({
        lastFetchedSha: data.commitSha || null,
        hasRemoteChanges: false,
      });
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
      const res = await fetch(`/api/v1/tokens${query}`, {
        headers: { "x-internal-client": "tokens-platform" },
      });
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
          ...credentials,
          tokens: rawTokens,
          syncMeta,
          commitMessage: commitMessage || `chore(tokens): sync via tokens platform [${new Date().toLocaleTimeString()}]`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to push tokens directly");
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

  const handleSignOut = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch { }
    setCurrentUser(null);
    addToast({
      type: "info",
      title: "Signed Out",
      message: "You have been safely signed out.",
    });
  };

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 text-xs select-none transition-colors">
        {/* Left: Brand + Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Tokens Platform Logo & Brand -> Redirects to Dashboard */}
          <button
            onClick={() => setSidebarTab("dashboard")}
            className="flex items-center gap-2 cursor-pointer group focus-visible:outline-none"
            title="Dashboard (Home)"
          >
            <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-foreground text-xs tracking-tight group-hover:text-primary transition-colors hidden md:inline">
              Tokens Platform
            </span>
          </button>

          {/* Breadcrumb Hierarchy */}
          {Boolean(currentUser) && (
            <>
              <Separator orientation="vertical" className="h-4 mx-1 hidden sm:block opacity-60" />

              <Breadcrumb className="hidden sm:flex">
                <BreadcrumbList>
                  {/* Org / Project Switcher as Breadcrumb Item */}
                  <BreadcrumbItem>
                    <OrgSwitcher onOpenAuth={() => setIsAuthOpen(true)} />
                  </BreadcrumbItem>

                  {/* Git Repo Name if configured */}
                  {credentials.repo && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink onClick={onOpenSettings} className="font-medium text-foreground/80 hover:text-foreground">
                          {credentials.repo}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </>
                  )}

                  {/* Active Page / Section */}
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {sidebarTab === "dashboard" && <BreadcrumbPage>Dashboard</BreadcrumbPage>}
                    {sidebarTab === "documentation" && <BreadcrumbPage>Documentation</BreadcrumbPage>}
                    {sidebarTab === "assets" && <BreadcrumbPage>Assets</BreadcrumbPage>}
                    {sidebarTab === "exports" && <BreadcrumbPage>Exports</BreadcrumbPage>}
                    {sidebarTab === "releases" && <BreadcrumbPage>Releases</BreadcrumbPage>}
                    {sidebarTab === "activity" && <BreadcrumbPage>Activity</BreadcrumbPage>}
                    {sidebarTab === "integrations" && <BreadcrumbPage>Integrations</BreadcrumbPage>}
                    {sidebarTab === "mcp" && <BreadcrumbPage>MCP &amp; CLI</BreadcrumbPage>}
                    {sidebarTab === "members" && <BreadcrumbPage>Team Members</BreadcrumbPage>}
                    {sidebarTab === "org-settings" && <BreadcrumbPage>Organization Settings</BreadcrumbPage>}
                    {sidebarTab === "project-settings" && <BreadcrumbPage>Project Settings</BreadcrumbPage>}

                    {(sidebarTab === "variables" || sidebarTab === "tokens") && (
                      <div className="flex items-center gap-1.5">
                        <BreadcrumbLink onClick={() => setSidebarTab("tokens")}>Tokens</BreadcrumbLink>
                        <span className="text-muted-foreground/40 font-normal">/</span>
                        <BreadcrumbPage className="truncate max-w-[140px]">{activeSet}</BreadcrumbPage>
                      </div>
                    )}

                    {sidebarTab === "themes" && (
                      <div className="flex items-center gap-1.5">
                        <BreadcrumbLink onClick={() => setSidebarTab("themes")}>Themes</BreadcrumbLink>
                        <span className="text-muted-foreground/40 font-normal">/</span>
                        <div className="relative">
                          <button
                            onClick={() => setShowThemeGroupMenu(!showThemeGroupMenu)}
                            className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors py-0.5 px-1.5 rounded hover:bg-muted/70 cursor-pointer"
                          >
                            <span>{activeGroup?.name || "Theme"}</span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          </button>
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
                                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                                      grp.id === activeThemeGroupId
                                        ? "bg-primary/10 text-primary font-semibold"
                                        : "text-foreground hover:bg-muted"
                                    }`}
                                  >
                                    <span>{grp.name}</span>
                                    {grp.id === activeThemeGroupId && (
                                      <Check className="w-3 h-3 text-primary" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </>
          )}
        </div>

        {/* Right: Conditional Controls */}
        <div className="flex items-center gap-2">
          {/* Unsaved changes badge */}
          {isDirty && (
            <Badge variant="warning" className="animate-pulse text-[10px] py-0 px-2">
              unsaved changes
            </Badge>
          )}

          {/* Matrix vs Flow Switcher */}
          {hasTokens && sidebarTab === "themes" && (
            <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/60 text-[11px] font-medium">
              <button
                onClick={() => setViewMode("matrix")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "matrix"
                    ? "bg-background text-foreground font-semibold shadow-2xs"
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
                    ? "bg-background text-primary font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visual Token Flow & Dependency Graph"
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>Flow Graph</span>
              </button>
            </div>
          )}

          {/* 1. Sync from Figma Cloud Button - ONLY if Figma Plugin is connected */}
          {isFigmaConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloudSync}
              disabled={isPulling}
              className="h-8 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer shadow-2xs"
              title="Pull changes pushed from Figma Plugin"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? "animate-spin" : ""}`} />
              <span>Sync Figma</span>
            </Button>
          )}

          {/* 2. Git Pull & Push & Branch Switcher - ONLY if Git Sync is configured */}
          {isGitConfigured && (
            <>
              {/* Git Pull Button with Remote Changes Indicator */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePull}
                  disabled={isPulling}
                  className={`h-8 gap-1.5 text-xs cursor-pointer shadow-2xs transition-colors ${
                    hasRemoteChanges
                      ? "border-blue-500/50 bg-blue-500/10 text-foreground font-semibold"
                      : ""
                  }`}
                  title={
                    hasRemoteChanges
                      ? "Remote changes detected on repository branch - click to pull"
                      : "Pull latest tokens from current branch"
                  }
                >
                  <DownloadCloud
                    className={`w-3.5 h-3.5 ${
                      hasRemoteChanges ? "text-blue-500" : "text-muted-foreground"
                    } ${isPulling ? "animate-bounce" : ""}`}
                  />
                  <span>Git Pull</span>
                </Button>

                {/* Pulsating Remote Updates Notification Badge */}
                {hasRemoteChanges && (
                  <span
                    className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none"
                    title="Remote updates available"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 ring-2 ring-background" />
                  </span>
                )}
              </div>

              {/* Push Button - Disabled when there are no local changes */}
              <Button
                variant={isDirty ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPushModal(true)}
                disabled={!isDirty || isPushing}
                className={`h-8 gap-1.5 text-xs shadow-2xs font-medium transition-all ${
                  !isDirty
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                title={
                  isDirty
                    ? `Push changes directly to ${credentials.branch || "branch"}`
                    : "No local changes to push"
                }
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Push</span>
              </Button>

              {/* Branch Pill Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBranchMenu(!showBranchMenu)}
                  className="h-8 gap-1.5 font-mono text-xs cursor-pointer shadow-2xs"
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
                      <div className="px-2.5 py-2 bg-muted/60 border border-border rounded-lg">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Repository Name
                        </div>
                        <div className="font-mono text-xs text-foreground font-semibold truncate mt-0.5">
                          {credentials.repo || "Not Connected"}
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search branch..."
                          value={branchSearch}
                          onChange={(e) => setBranchSearch(e.target.value)}
                          className="h-8 pl-8 text-xs font-mono"
                          autoFocus
                        />
                      </div>

                      <div className="flex-1 overflow-y-auto max-h-48 space-y-0.5 pr-0.5">
                        {loadingBranches ? (
                          <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span className="text-xs">Fetching branches...</span>
                          </div>
                        ) : filteredBranches.length === 0 ? (
                          <div className="py-4 text-center text-xs text-muted-foreground">
                            {branches.length === 0 ? "No branches available" : "No matching branch"}
                          </div>
                        ) : (
                          filteredBranches.map((b) => {
                            const isCurrent = b === credentials.branch;
                            return (
                              <button
                                key={b}
                                onClick={() => handlePullForBranch(b)}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-mono transition-colors text-left cursor-pointer ${
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
                  </>
                )}
              </div>
            </>
          )}

          {/* Subtle Vertical Divider */}
          <Separator orientation="vertical" className="h-4 mx-1 opacity-60" />

          {/* Theme Mode Toggle (Light/Dark) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
              >
                {themeMode === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-primary" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {themeMode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </TooltipContent>
          </Tooltip>

          {/* User Profile Avatar Dropdown Menu */}
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center rounded-lg border border-border/80 bg-muted/40 hover:bg-muted p-1 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  title={`Signed in as ${currentUser.displayName || currentUser.email}`}
                >
                  <div className="relative">
                    <Avatar className="h-7 w-7 rounded-md">
                      {currentUser.avatarUrl && (
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName || "User"} />
                      )}
                      <AvatarFallback className="rounded-md bg-primary text-primary-foreground text-[11px] font-bold">
                        {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online Status Indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-background" />
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-60 p-1.5 text-xs shadow-xl">
                {/* User Header Profile Card */}
                <div className="flex items-center gap-3 p-2">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-9 w-9 rounded-lg">
                      {currentUser.avatarUrl && (
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName || "User"} />
                      )}
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                        {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-background" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-foreground text-xs truncate">
                        {currentUser.displayName || currentUser.email.split("@")[0]}
                      </span>
                      <Badge variant="secondary" className="text-[9px] font-mono py-0 px-1 capitalize">
                        {ROLE_DEFINITIONS[getCurrentUserRole()].title}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {currentUser.email}
                    </span>
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Team Members */}
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setSidebarTab("members")}
                    className="gap-2.5 px-2.5 py-2 cursor-pointer text-xs text-foreground"
                  >
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>Team members</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="gap-2.5 px-2.5 py-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-xs font-medium"
                >
                  <LogOut className="w-4 h-4 text-destructive" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuthOpen(true)}
              className="h-8 gap-1.5 px-2.5 rounded-md shadow-2xs cursor-pointer font-medium"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Sign In</span>
            </Button>
          )}
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
