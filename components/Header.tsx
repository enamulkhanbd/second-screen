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
  FileCode,
  Sparkles,
  Activity,
  Rocket,
  PanelLeftOpen,
  Save,
  Undo2,
  Plus,
  GitMerge,
  GitCommit,
} from "lucide-react";
import { CreateBranchModal } from "@/components/CreateBranchModal";
import { AuthModal } from "@/components/AuthModal";
import { AcceptInviteModal } from "@/components/AcceptInviteModal";
import { TokenDiffViewer } from "@/components/TokenDiffViewer";
import { UserActivityDrawer } from "@/components/UserActivityDrawer";
import { ROLE_DEFINITIONS } from "@/types/tenant";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  onOpenNavigation?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenNavigation }) => {
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
    membersSubTab,
    setMembersSubTab,
    activeSet,
    currentUser,
    setCurrentUser,
    getCurrentUserRole,
    canUserEdit,
    figmaVariables,
    figmaResolvedVariables,
    figmaUpdatedAt,
    // Remote Git updates tracking
    hasRemoteChanges,
    checkRemoteUpdates,
    getDiffSummary,
    logUserActivity,
    setFigmaVariables,
    // Native Branches
    branches: nativeBranches,
    activeBranch,
    switchBranchAction,
    commitToActiveBranchAction,
  } = useTokenStore();

  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [isCreateBranchOpen, setIsCreateBranchOpen] = useState(false);
  const [showThemeGroupMenu, setShowThemeGroupMenu] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [showPushModal, setShowPushModal] = useState(false);
  const [showPullModal, setShowPullModal] = useState(false);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);

  // Branch list state
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");

  const hasTokens = Object.keys(rawTokens).length > 0;
  const activeGroup = themeGroups.find((g) => g.id === activeThemeGroupId) || themeGroups[0];

  // Compute live diff summary between baseline and current state
  const diffSummary = useMemo(() => {
    return getDiffSummary();
  }, [getDiffSummary, rawTokens, isDirty]);

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

  // Auto-generate commit message when opening push modal
  useEffect(() => {
    if (showPushModal && !commitMessage) {
      if (diffSummary.files.length > 0) {
        const fileNames = diffSummary.files.map((f) => f.fileName).join(", ");
        if (diffSummary.totalModified > 0 || diffSummary.totalAdded > 0 || diffSummary.totalDeleted > 0) {
          setCommitMessage(
            `chore(tokens): update ${diffSummary.totalAdded + diffSummary.totalModified} tokens in ${fileNames}`
          );
        } else {
          setCommitMessage(`chore(tokens): sync design tokens on ${credentials.branch || "main"}`);
        }
      } else {
        setCommitMessage(`chore(tokens): update tokens on ${credentials.branch || "main"}`);
      }
    }
  }, [showPushModal, commitMessage, diffSummary, credentials.branch]);

  // Periodically check for remote updates in Git repository
  useEffect(() => {
    if (!isGitConfigured || !credentials.pat) return;

    // Initial check
    checkRemoteUpdates();

    // Periodic poll every 45s
    const interval = setInterval(() => {
      checkRemoteUpdates();
    }, 45000);

    // Throttled check on tab focus (minimum 30s)
    let lastFocusCheck = 0;
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusCheck > 30000) {
        lastFocusCheck = now;
        checkRemoteUpdates();
      }
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
      logUserActivity({
        type: "git",
        title: `Switched Branch to ${targetBranch}`,
        description: `Pulled latest tokens from branch "${targetBranch}" on ${credentials.repo || "repository"}.`,
        actor: {
          name: currentUser?.displayName || "User",
          email: currentUser?.email || "user@example.com",
          avatarUrl: currentUser?.avatarUrl,
        },
        metadata: { branch: targetBranch, repo: credentials.repo },
      });
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
      const currentOrg = useTokenStore.getState().currentOrg;
      const currentProj = useTokenStore.getState().currentProject;
      const orgId = currentOrg?.id;
      const projectId = currentProj?.id;
      const query = orgId && projectId ? `?orgId=${encodeURIComponent(orgId)}&projectId=${encodeURIComponent(projectId)}` : "";
      const res = await fetch(`/api/v1/tokens${query}`, {
        headers: { "x-internal-client": "tokens-platform" },
      });
      const data = await res.json();
      if (data.success && data.rawTokens) {
        setRawTokens(data.rawTokens);
        if (data.figmaVariables && Object.keys(data.figmaVariables).length > 0) {
          setFigmaVariables(data.figmaVariables, data.metadata);
        }
        logUserActivity({
          type: "figma",
          title: "Synced Tokens from Cloud",
          description: `Synced ${data.resolvedTokens?.length || 0} tokens (${currentProj?.name || "Project"}) from Cloud Workspace.`,
          actor: {
            name: currentUser?.displayName || "User",
            email: currentUser?.email || "user@example.com",
            avatarUrl: currentUser?.avatarUrl,
          },
          metadata: { orgId, projectId, tokenCount: data.resolvedTokens?.length || 0 },
        });
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
    setIsPushing(true);
    const userCommitMsg =
      commitMessage ||
      `Update tokens on branch ${isGitConfigured ? credentials.branch : activeBranch || "main"}`;

    try {
      if (isGitConfigured && credentials.pat) {
        // External sync provider configured: push directly to remote Git
        setSyncStatus("pushing");
        const res = await fetch("/api/git/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credentials,
            rawTokens,
            syncMeta,
            commitMessage: userCommitMsg,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to push tokens to Git");
        }
      } else {
        // No sync provider configured: our native branch system handles the commit
        await commitToActiveBranchAction(userCommitMsg);
      }

      resetDirtyState();
      setSyncStatus("success");
      setShowPushModal(false);
      setShowBranchMenu(false);
      setCommitMessage("");

      if (isGitConfigured) {
        addToast({
          type: "success",
          title: "Pushed to Git",
          message: `Changes pushed to ${credentials.repo}@${credentials.branch}.`,
        });
      }
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: isGitConfigured ? "Push Failed" : "Commit Failed",
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
        {/* Left: Mobile Navigation Button */}
        <div className="flex items-center gap-2 min-w-0">
          {onOpenNavigation && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenNavigation}
              className="lg:hidden h-8 w-8 flex-shrink-0"
              aria-label="Open navigation"
              title="Open navigation"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Right: Conditional Controls */}
        <div className="flex items-center gap-2">


          {/* Matrix vs Flow Switcher */}
          {hasTokens && sidebarTab === "themes" && (
            <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/60 text-[11px] font-medium">
              <button
                onClick={() => setViewMode("matrix")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${viewMode === "matrix"
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${viewMode === "flow"
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

          {/* Git Pull Button with Remote Changes Indicator - ONLY if Git Sync is configured */}
          {isGitConfigured && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (hasRemoteChanges) {
                    setShowPullModal(true);
                  } else {
                    handlePull();
                  }
                }}
                disabled={isPulling}
                className={`h-8 gap-1.5 text-xs cursor-pointer shadow-2xs transition-colors ${hasRemoteChanges
                    ? "border-blue-500/50 bg-blue-500/10 text-foreground font-semibold"
                    : ""
                  }`}
                title={
                  hasRemoteChanges
                    ? "Remote changes detected on repository branch - click to review and pull"
                    : "Pull latest tokens from current branch"
                }
              >
                <DownloadCloud
                  className={`w-3.5 h-3.5 ${hasRemoteChanges ? "text-blue-500" : "text-muted-foreground"
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
          )}

          {/* Commit / Push Button - Works natively on active branch, pushes to Git if connected */}
          <Button
            variant={isDirty && canUserEdit() ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPushModal(true)}
            disabled={!isDirty || isPushing || !canUserEdit()}
            className={`h-8 gap-1.5 text-xs shadow-2xs font-medium transition-all ${!isDirty || !canUserEdit()
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
              }`}
            title={
              !canUserEdit()
                ? "Viewer role cannot commit changes"
                : isDirty
                ? isGitConfigured
                  ? `Review diff and push changes directly to ${credentials.branch || activeBranch}`
                  : `Review diff and commit changes to branch "${activeBranch}"`
                : "No local changes to commit"
            }
          >
            {isGitConfigured ? (
              <UploadCloud className="w-3.5 h-3.5" />
            ) : (
              <GitCommit className="w-3.5 h-3.5" />
            )}
            <span>{isGitConfigured ? "Push" : "Commit"}</span>
            {isDirty && (diffSummary.totalAdded + diffSummary.totalModified + diffSummary.totalDeleted > 0) && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-primary-foreground/20 text-primary-foreground font-semibold">
                {diffSummary.totalAdded + diffSummary.totalModified + diffSummary.totalDeleted}
              </span>
            )}
          </Button>

          {/* Branch Pill Dropdown - Native branches + Git remote branches */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBranchMenu(!showBranchMenu)}
              className="h-8 gap-1.5 font-mono text-xs cursor-pointer shadow-2xs"
              title={
                isGitConfigured
                  ? `Git branch: ${credentials.branch || "main"}`
                  : `Active branch: ${activeBranch || "main"}`
              }
            >
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              <span className="max-w-[130px] truncate">
                {isGitConfigured ? credentials.branch || "main" : activeBranch || "main"}
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
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2.5 max-h-[85vh] flex flex-col">
                  {isGitConfigured ? (
                    /* External Sync Provider Branches */
                    <>
                      <div className="px-2.5 py-2 bg-muted/60 border border-border rounded-lg">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Git Repository
                        </div>
                        <div className="font-mono text-xs text-foreground font-semibold truncate mt-0.5">
                          {credentials.repo} @ {credentials.branch || "main"}
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search remote branch..."
                          value={branchSearch}
                          onChange={(e) => setBranchSearch(e.target.value)}
                          className="h-8 pl-8 text-xs font-mono"
                          autoFocus
                        />
                      </div>

                      <div className="flex-1 overflow-y-auto max-h-52 space-y-0.5 pr-0.5">
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
                                onClick={() => {
                                  handlePullForBranch(b);
                                  setShowBranchMenu(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors text-left cursor-pointer ${
                                  isCurrent
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-foreground hover:bg-muted"
                                }`}
                              >
                                <span className="truncate">{b}</span>
                                {isCurrent && (
                                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  ) : (
                    /* Native Branch System (Only when NO sync provider is set up) */
                    <>
                      <div className="px-2.5 py-2 bg-muted/60 border border-border rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            Active Branch
                          </div>
                          <div className="font-mono text-xs text-foreground font-semibold truncate mt-0.5 flex items-center gap-1.5">
                            <GitBranch className="w-3 h-3 text-primary" />
                            <span>{activeBranch || "main"}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowBranchMenu(false);
                            setIsCreateBranchOpen(true);
                          }}
                          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md transition-colors cursor-pointer"
                          title="Create new branch"
                        >
                          <Plus className="w-3 h-3" />
                          <span>New</span>
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search branches..."
                          value={branchSearch}
                          onChange={(e) => setBranchSearch(e.target.value)}
                          className="h-8 pl-8 text-xs font-mono"
                          autoFocus
                        />
                      </div>

                      <div className="flex-1 overflow-y-auto max-h-52 space-y-1 pr-0.5">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-1">
                          Project Branches ({nativeBranches.length})
                        </div>
                        {nativeBranches
                          .filter(
                            (b) =>
                              b.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
                              b.title.toLowerCase().includes(branchSearch.toLowerCase())
                          )
                          .map((b) => {
                            const isCurrent = b.name === (activeBranch || "main");
                            return (
                              <button
                                key={b.id}
                                onClick={async () => {
                                  await switchBranchAction(b.name);
                                  setShowBranchMenu(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors text-left cursor-pointer ${
                                  isCurrent
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-foreground hover:bg-muted"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <GitBranch
                                    className={`w-3 h-3 flex-shrink-0 ${
                                      isCurrent ? "text-primary" : "text-muted-foreground"
                                    }`}
                                  />
                                  <span className="truncate">{b.name}</span>
                                  {b.isDefault && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-sans">
                                      default
                                    </span>
                                  )}
                                </div>
                                {isCurrent && (
                                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-1.5" />
                                )}
                              </button>
                            );
                          })}
                      </div>

                      <div className="pt-1.5 border-t border-border flex items-center justify-between text-xs">
                        <button
                          onClick={() => {
                            setSidebarTab("branches");
                            setShowBranchMenu(false);
                          }}
                          className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <span>View Branches &amp; History &rarr;</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

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

                {/* Activity Log & Team Members */}
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      setSidebarTab("members");
                      setMembersSubTab("activity");
                    }}
                    className="gap-2.5 px-2.5 py-2 cursor-pointer text-xs text-foreground"
                  >
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span>Activity log</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setSidebarTab("changelog")}
                    className="gap-2.5 px-2.5 py-2 cursor-pointer text-xs text-foreground"
                  >
                    <Rocket className="w-4 h-4 text-primary" />
                    <span>What&apos;s New &amp; Releases</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      setSidebarTab("members");
                      setMembersSubTab("members");
                    }}
                    className="gap-2.5 px-2.5 py-2 cursor-pointer text-xs text-foreground"
                  >
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>Manage Team</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="gap-2.5 px-2.5 py-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-xs font-medium"
                >
                  <LogOut className="w-4 h-4 text-destructive" />
                  <span>Log Out</span>
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

      {/* User Activity Log Right Drawer */}
      <UserActivityDrawer
        isOpen={showActivityDrawer}
        onClose={() => setShowActivityDrawer(false)}
      />

      {/* Accept Invite Modal (Triggered automatically on invite detection) */}
      <AcceptInviteModal />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Incoming Remote Changes & Pull Modal */}
      <Dialog open={showPullModal} onOpenChange={setShowPullModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <DownloadCloud className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Incoming Remote Changes</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {credentials.repo} @ {credentials.branch || "main"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  New Remote Commits Detected
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">Remote Branch</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your remote branch has fresh updates. Pulling will load the latest design tokens and theme sets into your active workspace.
              </p>
            </div>

            <div className="bg-muted/60 p-3 rounded-lg border border-border text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5 text-foreground font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Safe Merge
              </p>
              <p className="text-[11px] leading-relaxed">
                Tokens will be cleanly fetched and alias dependencies recalculated automatically.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPullModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setShowPullModal(false);
                handlePull();
              }}
              disabled={isPulling}
              className="gap-1.5 font-semibold"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Pull &amp; Apply Changes</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Push Direct Commit & Diff Review Modal */}
      <Dialog open={showPushModal} onOpenChange={setShowPushModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="gap-1 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {isGitConfigured ? (
                    <UploadCloud className="w-5 h-5" />
                  ) : (
                    <GitCommit className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <DialogTitle>
                    {isGitConfigured ? "Review & Push Token Changes" : "Review & Commit Token Changes"}
                  </DialogTitle>
                  <DialogDescription className="font-mono text-xs">
                    {isGitConfigured
                      ? `${credentials.repo} @ ${credentials.branch || activeBranch || "main"}`
                      : `Native Branch: ${activeBranch || "main"}`}
                  </DialogDescription>
                </div>
              </div>

              {diffSummary.files.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  {diffSummary.totalAdded > 0 && (
                    <Badge variant="success" className="text-[10px] py-0 px-1.5">
                      +{diffSummary.totalAdded}
                    </Badge>
                  )}
                  {diffSummary.totalModified > 0 && (
                    <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                      ~{diffSummary.totalModified}
                    </Badge>
                  )}
                  {diffSummary.totalDeleted > 0 && (
                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                      -{diffSummary.totalDeleted}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 flex-1 overflow-y-auto">
            {/* Visual Token Diff Viewer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-primary" />
                  <span>Changed Files &amp; Tokens ({diffSummary.files.length})</span>
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {isGitConfigured ? "Review before pushing" : "Review before committing"}
                </span>
              </div>
              <TokenDiffViewer diff={diffSummary} maxHeight="max-h-[240px]" />
            </div>

            {/* Commit Message Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-foreground">
                  Commit Message
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (diffSummary.files.length > 0) {
                      const fileNames = diffSummary.files.map((f) => f.fileName).join(", ");
                      setCommitMessage(
                        `chore(tokens): update ${diffSummary.totalAdded + diffSummary.totalModified} tokens in ${fileNames}`
                      );
                    }
                  }}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-generate</span>
                </button>
              </div>
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
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{" "}
                {isGitConfigured ? "Direct Branch & Push Rule" : "Native Branch Commit"}
              </p>
              <p className="text-[11px] leading-relaxed">
                Tokens will be committed directly to{" "}
                <span className="font-mono text-primary">{activeBranch || "main"}</span> preserving all raw alias references.
                {isGitConfigured && ` And pushed to remote repository ${credentials.repo}.`}
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2 flex-shrink-0 flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const { originalTokens } = useTokenStore.getState();
                if (originalTokens && Object.keys(originalTokens).length > 0) {
                  setRawTokens(JSON.parse(JSON.stringify(originalTokens)));
                  resetDirtyState();
                  setShowPushModal(false);
                  addToast({
                    type: "info",
                    title: "Changes Discarded",
                    message: "Reverted all tokens back to baseline.",
                  });
                }
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1.5 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Discard Changes</span>
            </Button>
            <div className="flex items-center gap-2">
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
                className="gap-1.5 font-semibold"
              >
                {isGitConfigured ? (
                  <UploadCloud className="w-3.5 h-3.5" />
                ) : (
                  <GitCommit className="w-3.5 h-3.5" />
                )}
                <span>
                  {isPushing
                    ? isGitConfigured
                      ? "Pushing..."
                      : "Committing..."
                    : isGitConfigured
                    ? "Confirm & Push"
                    : "Confirm & Commit"}
                </span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Branch Modal */}
      <CreateBranchModal
        isOpen={isCreateBranchOpen}
        onClose={() => setIsCreateBranchOpen(false)}
        defaultBasedOn={activeBranch || "main"}
      />
    </TooltipProvider>
  );
};
