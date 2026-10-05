"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { GitProvider } from "@/types/tokens";
import { saveProjectGitConfig, saveProjectTokens } from "@/services/organizationService";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";
import {
  FolderGit2,
  GitBranch,
  Shield,
  ShieldCheck,
  ShieldOff,
  Lock,
  Zap,
  Key,
  KeyRound,
  FolderTree,
  FileCode,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  Unlink,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Layers,
  Save,
  CheckCircle2,
  Sparkles,
  Link2,
  Globe,
  Radio,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  Figma,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const PROVIDERS: { id: GitProvider; label: string; icon: string; docsUrl: string; patPlaceholder: string }[] = [
  {
    id: "github",
    label: "GitHub",
    icon: "🐙",
    docsUrl: "https://github.com/settings/tokens/new?scopes=repo",
    patPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
  },
  {
    id: "gitlab",
    label: "GitLab",
    icon: "🦊",
    docsUrl: "https://gitlab.com/-/user_settings/personal_access_tokens",
    patPlaceholder: "glpat-xxxxxxxxxxxxxxxxxxxx",
  },
  {
    id: "azure",
    label: "Azure DevOps",
    icon: "🔷",
    docsUrl: "https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate",
    patPlaceholder: "Azure DevOps Personal Access Token",
  },
  {
    id: "bitbucket",
    label: "Bitbucket",
    icon: "🪣",
    docsUrl: "https://bitbucket.org/account/settings/app-passwords/",
    patPlaceholder: "Bitbucket App Password or PAT",
  },
];

export const SyncProvidersView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    currentOrg,
    currentProject,
    setCurrentProject,
    syncTargetProject,
    setSyncTargetProject,
    credentials,
    setCredentials,
    clearCredentials,
    rawTokens,
    setRawTokens,
    syncMeta,
    resetDirtyState,
    figmaResolvedVariables,
    fetchLiveTokens,
    syncStatus,
    setSyncStatus,
    assetFigmaConfig,
    setFigmaPat,
    addToast,
    getCurrentUserRole,
    setSidebarTab,
    cloudSaveStatus,
    activeBranch,
  } = useTokenStore();
  const syncProject = syncTargetProject || currentProject;
  const projectCredentials = syncProject?.gitConfig ?? credentials;
  const projectFigmaConfig = syncProject?.assetFigmaConfig ?? assetFigmaConfig;

  const [activeSyncTab, setActiveSyncTab] = useState<"git" | "figma" | "webhooks" | "history">("git");

  const userRole = getCurrentUserRole();
  const canEdit = userRole === "owner" || userRole === "admin" || userRole === "editor";

  // -------------------------------------------------------------
  // Shield / Privacy Mode (presentation & screen-share protection)
  // -------------------------------------------------------------
  const [shieldMode, setShieldMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ts_privacy_shield_mode") === "true";
    }
    return false;
  });

  const toggleShieldMode = () => {
    setShieldMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("ts_privacy_shield_mode", String(next));
      }
      return next;
    });
  };

  // -------------------------------------------------------------
  // Git State & Write-Only PAT Vault
  // -------------------------------------------------------------
  const [provider, setProvider] = useState<GitProvider>(projectCredentials.provider || "github");
  const [owner, setOwner] = useState(projectCredentials.owner || "");
  const [gitProject, setGitProject] = useState(projectCredentials.project || "");
  const [repo, setRepo] = useState(projectCredentials.repo || "");
  const [branch, setBranch] = useState(projectCredentials.branch || "");
  const [filePath, setFilePath] = useState(projectCredentials.filePath || projectCredentials.path || "");

  // Write-Only PAT Pattern: stored secret is never placed in editable DOM input value
  const configuredGitPat = projectCredentials.pat || credentials.pat || "";
  const hasConfiguredGitPat = Boolean(configuredGitPat);
  const gitPatLast4 = configuredGitPat.length >= 4 ? configuredGitPat.slice(-4) : "";
  const [isReplacingGitPat, setIsReplacingGitPat] = useState(false);
  const [newGitPatInput, setNewGitPatInput] = useState("");
  const [showNewGitPat, setShowNewGitPat] = useState(false);

  const [rememberPat, setRememberPat] = useState(true);
  const [isSavingGit, setIsSavingGit] = useState(false);
  const [isTestingGit, setIsTestingGit] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [showDisconnectGitModal, setShowDisconnectGitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState("Update design tokens via Second Screen");
  const [isPushingGit, setIsPushingGit] = useState(false);

  // Helper to obtain the effective PAT for test/save actions without exposing it in the DOM
  const getEffectiveGitPat = () => {
    if (isReplacingGitPat) return newGitPatInput.trim();
    return newGitPatInput.trim() || configuredGitPat;
  };

  // -------------------------------------------------------------
  // Figma Companion Plugin State & Write-Only Figma PAT
  // -------------------------------------------------------------
  const [pairCodeInput, setPairCodeInput] = useState("");
  const [showPairInput, setShowPairInput] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [isPairSuccess, setIsPairSuccess] = useState(false);
  const [copiedPairCode, setCopiedPairCode] = useState(false);
  const [activePluginKey, setActivePluginKey] = useState<any | null>(null);
  const [isLoadingPluginStatus, setIsLoadingPluginStatus] = useState(false);
  const [isUnlinkingPlugin, setIsUnlinkingPlugin] = useState(false);

  // Write-Only Figma PAT State
  const configuredFigmaPat = projectFigmaConfig?.pat || "";
  const hasConfiguredFigmaPat = Boolean(configuredFigmaPat);
  const figmaPatLast4 = configuredFigmaPat.length >= 4 ? configuredFigmaPat.slice(-4) : "";
  const [isReplacingFigmaPat, setIsReplacingFigmaPat] = useState(false);
  const [newFigmaPatInput, setNewFigmaPatInput] = useState("");
  const [showNewFigmaPat, setShowNewFigmaPat] = useState(false);
  const [isSavingFigmaPat, setIsSavingFigmaPat] = useState(false);

  useEffect(() => {
    setIsReplacingFigmaPat(false);
    setNewFigmaPatInput("");
    setShowNewFigmaPat(false);
  }, [syncProject?.id, projectFigmaConfig?.pat]);

  const saveTargetFigmaPat = async (value: string) => {
    if (!syncProject) return;
    const config = projectFigmaConfig || { pat: "", sources: [] };
    const updatedConfig = await setFigmaPat(value, { ...syncProject, assetFigmaConfig: config });
    setSyncTargetProject({ ...syncProject, assetFigmaConfig: updatedConfig });
  };

  const handleSaveFigmaPat = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenToSave = isReplacingFigmaPat
      ? newFigmaPatInput.trim()
      : (newFigmaPatInput.trim() || configuredFigmaPat);
    setIsSavingFigmaPat(true);
    try {
      await saveTargetFigmaPat(tokenToSave);
      setIsReplacingFigmaPat(false);
      setNewFigmaPatInput("");
      setShowNewFigmaPat(false);
      addToast({
        type: "success",
        title: "Figma PAT Saved",
        message: "Unified Figma PAT updated successfully in vault.",
      });
    } finally {
      setIsSavingFigmaPat(false);
    }
  };

  const fetchPluginStatus = async () => {
    if (!syncProject) return;
    setIsLoadingPluginStatus(true);
    try {
      const res = await fetch("/api/v1/auth/pat");
      if (res.ok) {
        const data = await res.json();
        const keys = data.keys || [];
        const match = keys.find(
          (k: any) => k.projectId === syncProject.id
        );
        setActivePluginKey(match || null);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingPluginStatus(false);
    }
  };

  useEffect(() => {
    fetchPluginStatus();
  }, [syncProject?.id]);

  useEffect(() => {
    setProvider(projectCredentials.provider || "github");
    setOwner(projectCredentials.owner || "");
    setGitProject(projectCredentials.project || "");
    setRepo(projectCredentials.repo || "");
    setBranch(projectCredentials.branch || "");
    setFilePath(projectCredentials.filePath || projectCredentials.path || "");
    setIsReplacingGitPat(false);
    setNewGitPatInput("");
    setShowNewGitPat(false);
  }, [
    syncProject?.id,
    projectCredentials.provider,
    projectCredentials.owner,
    projectCredentials.project,
    projectCredentials.repo,
    projectCredentials.branch,
    projectCredentials.filePath,
    projectCredentials.path,
  ]);

  const activeProvider = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
  const isGitConnected = Boolean(projectCredentials.owner && projectCredentials.repo);

  // Generate pair code
  const handleApprovePairCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = pairCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (!currentOrg || !syncProject) {
      addToast({
        type: "error",
        title: "No Active Project",
        message: "Please select an organization and project before pairing.",
      });
      return;
    }

    setIsPairing(true);
    try {
      const res = await fetch("/api/v1/auth/pair", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          orgId: currentOrg.id,
          projectId: syncProject.id,
          orgName: currentOrg.name,
          projectName: syncProject.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Pairing code not found or expired.");
      }

      setIsPairSuccess(true);
      setPairCodeInput("");
      setShowPairInput(false);
      await fetchPluginStatus();
      addToast({
        type: "success",
        title: "Figma Plugin Paired Successfully!",
        message: `Connected to ${syncProject.name}. You can now push tokens from Figma!`,
      });
      setTimeout(() => setIsPairSuccess(false), 5000);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Pairing Failed",
        message: err.message || "Invalid pairing code. Please try again.",
      });
    } finally {
      setIsPairing(false);
    }
  };

  const handleUnlinkPlugin = async () => {
    if (!activePluginKey?.id) return;
    setIsUnlinkingPlugin(true);
    try {
      const res = await fetch(`/api/v1/auth/pat?id=${encodeURIComponent(activePluginKey.id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActivePluginKey(null);
        addToast({
          type: "success",
          title: "Plugin Unlinked",
          message: "Figma Companion Plugin disconnected successfully.",
        });
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Unlink Failed",
        message: err.message || "Failed to disconnect plugin.",
      });
    } finally {
      setIsUnlinkingPlugin(false);
    }
  };

  // -------------------------------------------------------------
  // Git Actions
  // -------------------------------------------------------------
  const handleTestConnection = async () => {
    const effectivePat = getEffectiveGitPat();
    if (!owner || !repo || !effectivePat) {
      addToast({
        type: "error",
        title: "Incomplete Details",
        message: "Please provide Repository Owner, Repo Name, and a valid Personal Access Token.",
      });
      return;
    }

    setIsTestingGit(true);
    try {
      const rawCreds = {
        provider,
        owner: owner.trim(),
        project: gitProject.trim(),
        repo: repo.trim(),
        branch: branch.trim(),
        path: filePath.trim(),
        filePath: filePath.trim(),
        pat: effectivePat,
      };
      const testCreds = sanitizeGitCredentials(rawCreds);

      const res = await fetch("/api/git/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testCreds),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Git connection failed (${res.status})`);
      }

      setAvailableBranches(data.branches || []);
      addToast({
        type: "success",
        title: "Git Connection Verified!",
        message: `Successfully reached ${repo}. Found ${data.branches?.length || 0} branches.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Connection Failed",
        message: err.message || "Failed to reach Git provider.",
      });
    } finally {
      setIsTestingGit(false);
    }
  };

  const handleSaveGitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !syncProject) return;

    const effectivePat = getEffectiveGitPat();
    if (!owner || !repo || !effectivePat) {
      addToast({
        type: "error",
        title: "Incomplete Details",
        message: "Please provide Repository Owner, Repo Name, and a Personal Access Token.",
      });
      return;
    }

    setIsSavingGit(true);
    try {
      const rawCreds = {
        provider,
        owner: owner.trim(),
        project: gitProject.trim(),
        repo: repo.trim(),
        branch: branch.trim(),
        path: filePath.trim(),
        filePath: filePath.trim(),
        pat: effectivePat,
      };
      const updatedCreds = sanitizeGitCredentials(rawCreds);

      setCredentials(updatedCreds, rememberPat);
      await saveProjectGitConfig(currentOrg.id, syncProject.id, updatedCreds);
      const updatedProject = { ...syncProject, gitConfig: updatedCreds };
      if (syncTargetProject) {
        setSyncTargetProject(updatedProject);
      }
      if (currentProject && currentProject.id === syncProject.id) {
        setCurrentProject(updatedProject);
      }

      setIsReplacingGitPat(false);
      setNewGitPatInput("");
      setShowNewGitPat(false);

      addToast({
        type: "success",
        title: "Git Configuration Saved",
        message: `Project connected to ${updatedCreds.repo}@${updatedCreds.branch || "main"}.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Failed to Save Git Config",
        message: err.message || "An error occurred.",
      });
    } finally {
      setIsSavingGit(false);
    }
  };

  const handleRemoveGitPat = async () => {
    if (!currentOrg || !syncProject) return;
    try {
      const updatedCreds = {
        ...(syncProject.gitConfig || credentials),
        pat: "",
      };
      setCredentials(updatedCreds);
      await saveProjectGitConfig(currentOrg.id, syncProject.id, updatedCreds);
      const updatedProject = { ...syncProject, gitConfig: updatedCreds };
      if (syncTargetProject) {
        setSyncTargetProject(updatedProject);
      }
      if (currentProject && currentProject.id === syncProject.id) {
        setCurrentProject(updatedProject);
      }
      setIsReplacingGitPat(false);
      setNewGitPatInput("");
      setShowNewGitPat(false);
      addToast({
        type: "info",
        title: "PAT Removed",
        message: "Personal Access Token has been removed from this project.",
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Failed to Remove Token",
        message: err.message || "An error occurred.",
      });
    }
  };

  const handleDisconnectGit = async () => {
    if (!currentOrg || !syncProject) return;
    try {
      clearCredentials();
      await saveProjectGitConfig(currentOrg.id, syncProject.id, null);
      const updatedProject = { ...syncProject, gitConfig: null };
      if (syncTargetProject) {
        setSyncTargetProject(updatedProject);
      }
      if (currentProject && currentProject.id === syncProject.id) {
        setCurrentProject(updatedProject);
      }
      setShowDisconnectGitModal(false);
      addToast({
        type: "info",
        title: "Git Disconnected",
        message: "Repository credentials removed for this project.",
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Error Disconnecting",
        message: err.message || "Could not disconnect repository.",
      });
    }
  };

  const handlePullTokensNow = async () => {
    try {
      await fetchLiveTokens(undefined, { force: true });
      addToast({
        type: "success",
        title: "Tokens Pulled",
        message: "Successfully synchronized latest tokens from remote repository.",
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Pull Failed",
        message: err.message || "Failed to pull tokens.",
      });
    }
  };

  const handlePushTokensNow = async () => {
    if (!credentials.pat) {
      addToast({
        type: "error",
        title: "PAT Required",
        message: "Please provide a valid Personal Access Token.",
      });
      return;
    }

    setIsPushingGit(true);
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
      addToast({
        type: "success",
        title: "Tokens Pushed Successfully",
        message: `Committed and pushed to ${credentials.branch || "main"}.`,
      });
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: "Push Failed",
        message: err.message || "Failed to push tokens.",
      });
    } finally {
      setIsPushingGit(false);
    }
  };

  const handleDownloadManifest = () => {
    window.open("/api/v1/plugin/download", "_blank");
  };

  if (!syncProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background select-none">
        <Link2 className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <h2 className="text-base font-bold text-foreground">No Project Selected</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Please select a project to configure Git synchronization and Figma Companion plugin.
        </p>
        <Button
          onClick={() => setSidebarTab("projects")}
          size="sm"
          className="mt-4 text-xs font-semibold"
        >
          Go to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className={embedded ? "w-full space-y-6" : "flex-1 flex flex-col h-full overflow-y-auto bg-background font-sans select-none"}>
      {!embedded && (
      <div className="w-full px-6 md:px-8 py-5 border-b border-border/60 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Configure Sync
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono capitalize px-2 py-0.5 text-muted-foreground border-border/80">
                {syncProject.name}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configure repository access, Figma connections, and delivery targets for this project.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isGitConnected ? "success" : "outline"} className="text-xs px-2.5 py-1 gap-1.5 font-medium">
              <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{isGitConnected ? "Git Connected" : "Git Not Connected"}</span>
            </Badge>
          </div>
        </div>
      </div>
      )}

      <div className={embedded ? "space-y-6" : "max-w-[960px] w-full mx-auto p-6 md:p-8 space-y-6 flex-1"}>
        {/* Navigation Tabs (In-Page) */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border w-fit">
          <button
            onClick={() => setActiveSyncTab("git")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSyncTab === "git"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 text-primary" />
            <span>Git Version Control</span>
            {isGitConnected && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </button>

          <button
            onClick={() => setActiveSyncTab("figma")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSyncTab === "figma"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Figma Companion Plugin</span>
            {figmaResolvedVariables.length > 0 && (
              <Badge variant="violet" className="text-[9px] py-0 px-1 font-mono">
                {figmaResolvedVariables.length}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveSyncTab("webhooks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSyncTab === "webhooks"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-blue-500" />
            <span>Webhooks &amp; CI/CD</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: GIT VERSION CONTROL */}
        {/* ------------------------------------------------------------- */}
        {activeSyncTab === "git" && (
          <div className="space-y-6">
            {/* Storage & Architecture Overview */}
            <div className="p-5 rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Storage &amp; Sync Architecture</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  3-Tier Token Pipeline
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Tier 1: Supabase Cloud DB */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-background/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Database className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Supabase Cloud DB</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                        {cloudSaveStatus === "saving" ? "Saving..." : cloudSaveStatus === "error" ? "Error" : "Always Active"}
                      </Badge>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Tokens are persistently stored in your project&apos;s cloud database (<code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">raw_tokens</code>). Changes auto-save in real-time.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>No Git required</span>
                    <span className="font-mono text-emerald-500">● Live Auto-Save</span>
                  </div>
                </div>

                {/* Tier 2: App Native Branching */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-background/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                        <span>Native Branching</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10">
                        {currentProject?.branches && currentProject.branches.length > 0 ? `${currentProject.branches.length} branches` : "Built-in"}
                      </Badge>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Create, switch, and merge token branches natively within Second Screen without requiring a remote repository.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Active: <span className="font-semibold text-foreground">{activeBranch || currentProject?.activeBranch || "main"}</span></span>
                    <span className="font-mono text-blue-500">Cloud Stored</span>
                  </div>
                </div>

                {/* Tier 3: Remote Git Provider */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-background/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <FolderGit2 className="w-3.5 h-3.5 text-primary" />
                        <span>External Git Mirror</span>
                      </div>
                      <Badge variant={isGitConnected ? "success" : "outline"} className="text-[10px] px-1.5 py-0">
                        {isGitConnected ? activeProvider.label : "Optional (Unlinked)"}
                      </Badge>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {isGitConnected ? (
                        <>
                          Mirrors tokens to{" "}
                          <span
                            className={cn(
                              "font-mono font-medium text-foreground",
                              shieldMode && "filter blur-xs select-none hover:blur-none transition-all cursor-pointer"
                            )}
                            title={shieldMode ? "Shield Mode: Hover to unmask" : undefined}
                          >
                            {credentials.owner}/{credentials.repo}
                          </span>{" "}
                          on branch{" "}
                          <span
                            className={cn(
                              "font-mono font-medium text-foreground",
                              shieldMode && "filter blur-xs select-none hover:blur-none transition-all cursor-pointer"
                            )}
                            title={shieldMode ? "Shield Mode: Hover to unmask" : undefined}
                          >
                            {credentials.branch || "main"}
                          </span>
                          .
                        </>
                      ) : (
                        "Connect GitHub, GitLab, Bitbucket, or Azure DevOps to sync tokens directly into your dev codebase & CI/CD."
                      )}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Codebase bridge</span>
                    <span className={isGitConnected ? "font-mono text-emerald-500" : "font-mono text-muted-foreground"}>
                      {isGitConnected ? "● Linked" : "○ Cloud Only"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Git Status Card */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  isGitConnected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                }`}>
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "font-bold text-sm text-foreground",
                        shieldMode && isGitConnected && "filter blur-xs select-none hover:blur-none transition-all cursor-pointer"
                      )}
                      title={shieldMode && isGitConnected ? "Shield Mode: Hover to unmask" : undefined}
                    >
                      {isGitConnected ? `${credentials.owner}/${credentials.repo}` : "No Git Provider Connected"}
                    </span>
                    <Badge variant={isGitConnected ? "success" : "outline"} className="text-[10px]">
                      {isGitConnected ? "Connected" : "Disconnected"}
                    </Badge>
                    {shieldMode && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>Shielded</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isGitConnected ? (
                      <>
                        Branch:{" "}
                        <span
                          className={cn(
                            "font-mono font-medium text-foreground",
                            shieldMode && "filter blur-xs select-none hover:blur-none transition-all cursor-pointer"
                          )}
                          title={shieldMode ? "Shield Mode: Hover to unmask" : undefined}
                        >
                          {credentials.branch || "main"}
                        </span>{" "}
                        · File:{" "}
                        <span
                          className={cn(
                            "font-mono font-medium text-foreground",
                            shieldMode && "filter blur-xs select-none hover:blur-none transition-all cursor-pointer"
                          )}
                          title={shieldMode ? "Shield Mode: Hover to unmask" : undefined}
                        >
                          {credentials.filePath || credentials.path || "root"}
                        </span>
                      </>
                    ) : (
                      "Configure credentials below to commit and sync tokens directly to your Git repository."
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Git Operations */}
              {isGitConnected && currentProject?.id === syncProject?.id && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={handlePullTokensNow}
                    variant="outline"
                    size="sm"
                    disabled={syncStatus === "fetching"}
                    className="gap-1.5 text-xs h-8"
                  >
                    <ArrowDownToLine className={`w-3.5 h-3.5 ${syncStatus === "fetching" ? "animate-spin" : ""}`} />
                    <span>Pull Remote</span>
                  </Button>

                  <Button
                    onClick={handlePushTokensNow}
                    size="sm"
                    disabled={isPushingGit}
                    className="gap-1.5 text-xs h-8 font-semibold"
                  >
                    <ArrowUpFromLine className={`w-3.5 h-3.5 ${isPushingGit ? "animate-spin" : ""}`} />
                    <span>Push Tokens</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Git Configuration Form */}
            <form onSubmit={handleSaveGitConfig} className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-6">
              <div className="border-b border-border/80 pb-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground">Repository Credentials &amp; Target</h2>
                    {shieldMode && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Shield Active</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tokens are written to and read from your repository in W3C DTCG standard JSON format.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleShieldMode}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs",
                      shieldMode
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                        : "bg-muted/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title={shieldMode ? "Shield Mode Active: Click to show details" : "Enable Shield Mode to blur sensitive info for screen sharing"}
                  >
                    {shieldMode ? <ShieldOff className="w-3.5 h-3.5 text-emerald-500" /> : <Shield className="w-3.5 h-3.5 text-primary" />}
                    <span>{shieldMode ? "Disable Shield" : "Privacy Shield"}</span>
                  </button>

                  <a
                    href={activeProvider.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium pl-1"
                  >
                    <span>{activeProvider.label} Docs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Shield Mode Banner when active */}
              {shieldMode && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>
                      <strong>Presentation Shield Mode Active:</strong> Organization, repository, and branch paths are obscured to protect your infrastructure during demos, video calls, and screen shares. Hover over any field to unblur.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleShieldMode}
                    className="text-xs underline hover:no-underline font-medium shrink-0 ml-3 cursor-pointer"
                  >
                    Turn Off
                  </button>
                </div>
              )}

              {/* Provider Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      provider === p.id
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-lg">{p.icon}</span>
                    <span className="text-xs">{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      {provider === "azure" ? "Azure Organization" : "Repository Owner / Org *"}
                    </Label>
                    {shieldMode && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Obscured</span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g. acme-corp or username"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    required
                    className={cn(
                      "text-xs h-9 transition-all duration-200",
                      shieldMode && "filter blur-sm select-none hover:blur-none focus:blur-none cursor-pointer"
                    )}
                    title={shieldMode ? "Shield Mode: Hover or click to reveal" : undefined}
                  />
                </div>

                {provider === "azure" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Azure Project Name *</Label>
                      {shieldMode && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Obscured</span>
                      )}
                    </div>
                    <Input
                      placeholder="e.g. DesignSystem"
                      value={gitProject}
                      onChange={(e) => setGitProject(e.target.value)}
                      required
                      className={cn(
                        "text-xs h-9 transition-all duration-200",
                        shieldMode && "filter blur-sm select-none hover:blur-none focus:blur-none cursor-pointer"
                      )}
                      title={shieldMode ? "Shield Mode: Hover or click to reveal" : undefined}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Repository Name *</Label>
                    {shieldMode && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Obscured</span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g. design-tokens or brand-ui"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    required
                    className={cn(
                      "text-xs h-9 transition-all duration-200",
                      shieldMode && "filter blur-sm select-none hover:blur-none focus:blur-none cursor-pointer"
                    )}
                    title={shieldMode ? "Shield Mode: Hover or click to reveal" : undefined}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Target Branch</Label>
                    {shieldMode && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Obscured</span>
                    )}
                  </div>
                  <Input
                    placeholder="main or develop"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className={cn(
                      "text-xs h-9 transition-all duration-200",
                      shieldMode && "filter blur-sm select-none hover:blur-none focus:blur-none cursor-pointer"
                    )}
                    title={shieldMode ? "Shield Mode: Hover or click to reveal" : undefined}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">File / Directory Path in Repo</Label>
                    {shieldMode && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Obscured</span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g. tokens.json or tokens/"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    className={cn(
                      "text-xs h-9 font-mono transition-all duration-200",
                      shieldMode && "filter blur-sm select-none hover:blur-none focus:blur-none cursor-pointer"
                    )}
                    title={shieldMode ? "Shield Mode: Hover or click to reveal" : undefined}
                  />
                </div>

                {/* Write-Only Personal Access Token (PAT) Vault Area */}
                {hasConfiguredGitPat && !isReplacingGitPat ? (
                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Personal Access Token (PAT)</span>
                      </Label>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1 py-0 font-medium">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span>Write-Only Secret Vault</span>
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 w-full">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <span className="font-mono text-xs text-foreground tracking-widest select-none truncate">
                              ••••••••••••••••••••••••••••••••
                            </span>
                            {gitPatLast4 && (
                              <span className="text-[10px] font-mono text-muted-foreground bg-background/80 border border-border px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                                ending in ••••{gitPatLast4}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Secret stored securely. Plaintext is protected and never rendered in the DOM.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsReplacingGitPat(true);
                            setNewGitPatInput("");
                          }}
                          className="h-8 text-xs gap-1.5 font-medium"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Replace Token</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveGitPat}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          title="Remove Saved Token"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-primary" />
                        <span>{hasConfiguredGitPat ? "New Personal Access Token (PAT) *" : "Personal Access Token (PAT) *"}</span>
                      </Label>
                      {hasConfiguredGitPat && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsReplacingGitPat(false);
                            setNewGitPatInput("");
                            setShowNewGitPat(false);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                        >
                          Cancel &amp; Keep Current Token
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type={showNewGitPat ? "text" : "password"}
                        placeholder={hasConfiguredGitPat ? "Paste new token to rotate credentials..." : activeProvider.patPlaceholder}
                        value={newGitPatInput}
                        onChange={(e) => setNewGitPatInput(e.target.value)}
                        required={!hasConfiguredGitPat}
                        autoComplete="new-password"
                        className="text-xs h-9 font-mono pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewGitPat(!showNewGitPat)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        title={showNewGitPat ? "Hide token" : "Show token while typing"}
                      >
                        {showNewGitPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {hasConfiguredGitPat
                        ? "Enter a new token to rotate credentials. Token is write-only and cannot be viewed once saved."
                        : `Token is protected with write-only encryption. Scope: repo read & write.`}
                    </p>
                  </div>
                )}
              </div>

              {/* Form Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isTestingGit || !owner || !repo || !getEffectiveGitPat()}
                    onClick={handleTestConnection}
                    className="gap-1.5 text-xs h-9"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingGit ? "animate-spin" : ""}`} />
                    <span>{isTestingGit ? "Testing..." : "Test Connection"}</span>
                  </Button>

                  {isGitConnected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDisconnectGitModal(true)}
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-9"
                    >
                      <Unlink className="w-3.5 h-3.5 mr-1" />
                      <span>Disconnect</span>
                    </Button>
                  )}
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingGit || !owner || !repo || !getEffectiveGitPat()}
                  className="gap-1.5 text-xs h-9 font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingGit ? "Saving..." : "Save Git Provider"}</span>
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: FIGMA COMPANION PLUGIN */}
        {/* ------------------------------------------------------------- */}
        {activeSyncTab === "figma" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Figma Companion Plugin</span>
                    </h2>

                    {/* Saved project credential status */}
                    {activePluginKey ? (
                      <Badge variant="success" className="gap-1.5 text-[10px] px-2 py-0.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Credential Saved</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 text-[10px] px-2 py-0.5 text-muted-foreground font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                        <span>No Credential</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pair your desktop Figma canvas to push &amp; pull 2,400+ variables with zero manual exports.
                  </p>
                </div>
                <a
                  href="/api/v1/plugin/download"
                  download="tokens-platform-figma-plugin.zip"
                  className="inline-flex"
                >
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Plugin (.ZIP)</span>
                  </Button>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Active Bridge Card or Plugin Pair Form */}
                {activePluginKey && !showPairInput ? (
                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <span>Saved Companion Credential</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {activePluginKey.name || "Figma Desktop Companion"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {activePluginKey.keyPrefix || "sec_pat_..."}
                      </Badge>
                    </div>

                    <div className="p-3 rounded-lg bg-background/80 border border-border/80 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Target Project:</span>
                        <span className="font-semibold text-foreground">{syncProject.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Credential Status:</span>
                        <span className="text-emerald-500 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Available for this project
                        </span>
                      </div>
                      {activePluginKey.createdAt && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Paired Date:</span>
                          <span className="font-mono text-[10px]">
                            {new Date(activePluginKey.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPairInput(true)}
                        className="flex-1 h-8 text-xs font-medium"
                      >
                        Pair Another Canvas
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleUnlinkPlugin}
                        disabled={isUnlinkingPlugin}
                        className="h-8 text-xs px-3"
                      >
                        {isUnlinkingPlugin ? "Unlinking..." : "Unlink"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleApprovePairCode} className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span>Pair Figma Companion</span>
                      </span>
                      {activePluginKey && (
                        <button
                          type="button"
                          onClick={() => setShowPairInput(false)}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline"
                        >
                          Back to status
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      In the Figma plugin, click Connect to Tokens Platform, then paste its pairing code here:
                    </p>

                    <div className="flex items-center gap-2">
                      <Input
                        value={pairCodeInput}
                        onChange={(e) => setPairCodeInput(e.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX"
                        maxLength={9}
                        className="h-9 text-xs font-mono uppercase tracking-wider"
                      />
                      <Button
                        type="submit"
                        disabled={isPairing || pairCodeInput.trim().length !== 9}
                        className="h-9 text-xs font-bold gap-1.5 px-4"
                      >
                        <span>{isPairing ? "Pairing..." : "Pair"}</span>
                      </Button>
                    </div>

                    {isPairSuccess && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Plugin paired to {syncProject.name}!</span>
                      </div>
                    )}
                  </form>
                )}

                {/* Quick Instructions */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">How to Install Plugin in Figma:</div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                    <li>Download and extract <strong>tokens-platform-figma-plugin.zip</strong>.</li>
                    <li>In Figma Desktop, go to <strong>Plugins &gt; Development &gt; Import plugin from manifest...</strong></li>
                    <li>Select the <code>manifest.json</code> file inside the extracted folder.</li>
                    <li>Click <strong>Run</strong>, then paste the pairing code shown by the plugin into the form.</li>
                                      <li>Click <strong>Run</strong>, then paste the pairing code shown by the plugin into the form.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Unified Figma REST API & Asset Sync PAT Vault */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                      <Figma className="w-3.5 h-3.5" />
                    </div>
                    <h2 className="text-sm font-bold text-foreground">
                      Unified Figma Personal Access Token (PAT Vault)
                    </h2>
                    {projectFigmaConfig?.pat ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono border-emerald-500/30">
                        Token Saved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400">
                        No Token Set
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Centralized access token used to fetch component frames, variant SVGs, and automated asset syncing.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (syncProject && currentProject?.id !== syncProject.id) setCurrentProject(syncProject);
                    setSidebarTab("assets");
                  }}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <span>Go to Assets Manager</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>

              <form onSubmit={handleSaveFigmaPat} className="space-y-3 w-full">
                <div className="space-y-1.5 w-full">
                  <Label htmlFor="figmaPatVaultInput" className="text-xs font-semibold">
                    Figma Personal Access Token (PAT)
                  </Label>
                  {hasConfiguredFigmaPat && !isReplacingFigmaPat ? (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 w-full">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <span className="font-mono text-xs text-foreground tracking-widest select-none truncate">
                              ••••••••••••••••••••••••••••••••
                            </span>
                            {figmaPatLast4 && (
                              <span className="text-[10px] font-mono text-muted-foreground bg-background/80 border border-border px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                                ending in ••••{figmaPatLast4}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Write-only secret stored securely in project vault.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsReplacingFigmaPat(true);
                            setNewFigmaPatInput("");
                          }}
                          className="h-8 text-xs gap-1.5 font-medium"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Replace Token</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await saveTargetFigmaPat("");
                            setIsReplacingFigmaPat(false);
                            setNewFigmaPatInput("");
                          }}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          title="Remove Token"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="figmaPatVaultInput"
                          type={showNewFigmaPat ? "text" : "password"}
                          placeholder={hasConfiguredFigmaPat ? "Paste new token to rotate..." : "figd_..."}
                          value={newFigmaPatInput}
                          onChange={(e) => setNewFigmaPatInput(e.target.value)}
                          className="h-9 text-xs font-mono pr-8"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewFigmaPat(!showNewFigmaPat)}
                          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showNewFigmaPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSavingFigmaPat || !newFigmaPatInput.trim()}
                        className="h-9 text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1.5 font-semibold"
                      >
                        {isSavingFigmaPat ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save Token</span>
                      </Button>

                      {hasConfiguredFigmaPat && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsReplacingFigmaPat(false);
                            setNewFigmaPatInput("");
                            setShowNewFigmaPat(false);
                          }}
                          className="h-9 text-xs"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Generate via Figma: <strong>Profile &gt; Settings &gt; Security &gt; Personal access tokens</strong>.
                  </p>
                </div>

                {projectFigmaConfig?.sources && projectFigmaConfig.sources.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">
                        {projectFigmaConfig.sources.length} Linked Figma Source{projectFigmaConfig.sources.length === 1 ? "" : "s"}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        Using this unified token for automatic asset updates.
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (syncProject && currentProject?.id !== syncProject.id) setCurrentProject(syncProject);
                        setSidebarTab("assets");
                      }}
                      className="h-7 text-xs"
                    >
                      Manage Links
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: WEBHOOKS & CI/CD */}
        {/* ------------------------------------------------------------- */}
        {activeSyncTab === "webhooks" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
              <div className="border-b border-border/80 pb-3">
                <h2 className="text-sm font-bold text-foreground">Automated Webhooks &amp; Build Triggers</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trigger automated Style Dictionary builds, NPM publishing, and iOS/Android pipelines on token publish.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Webhook Target URL</Label>
                  <Input
                    placeholder="https://api.github.com/repos/org/repo/dispatches"
                    className="text-xs h-9 font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    A POST payload containing the latest tokens and release metadata will be sent when you publish.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Custom Webhook Secret</Label>
                  <Input
                    type="password"
                    placeholder="whsec_xxxxxxxxxxxxxxxxxxxx"
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border">
                <Button size="sm" className="gap-1.5 text-xs font-semibold">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Webhook Settings</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect Git Confirmation Modal */}
      <Dialog open={showDisconnectGitModal} onOpenChange={setShowDisconnectGitModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="gap-1">
            <DialogTitle>Disconnect Repository</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect Git sync for this project? Your local design tokens will remain intact.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowDisconnectGitModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDisconnectGit}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
