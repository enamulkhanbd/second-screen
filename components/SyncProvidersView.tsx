"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { GitProvider } from "@/types/tokens";
import { saveProjectGitConfig, saveProjectTokens } from "@/services/organizationService";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";
import {
  FolderGit2,
  GitBranch,
  ShieldCheck,
  Zap,
  Key,
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
} from "lucide-react";
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

const PROVIDERS: { id: GitProvider; label: string; icon: string; docsUrl: string }[] = [
  {
    id: "github",
    label: "GitHub",
    icon: "🐙",
    docsUrl: "https://github.com/settings/tokens/new?scopes=repo",
  },
  {
    id: "gitlab",
    label: "GitLab",
    icon: "🦊",
    docsUrl: "https://gitlab.com/-/user_settings/personal_access_tokens",
  },
  {
    id: "azure",
    label: "Azure DevOps",
    icon: "🔷",
    docsUrl: "https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate",
  },
  {
    id: "bitbucket",
    label: "Bitbucket",
    icon: "🪣",
    docsUrl: "https://bitbucket.org/account/settings/app-passwords/",
  },
];

export const SyncProvidersView: React.FC = () => {
  const {
    currentOrg,
    currentProject,
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
    addToast,
    getCurrentUserRole,
    setSidebarTab,
  } = useTokenStore();

  const [activeSyncTab, setActiveSyncTab] = useState<"git" | "figma" | "webhooks" | "history">("git");

  const userRole = getCurrentUserRole();
  const canEdit = userRole === "owner" || userRole === "admin" || userRole === "editor";

  // -------------------------------------------------------------
  // Git State
  // -------------------------------------------------------------
  const [provider, setProvider] = useState<GitProvider>(credentials.provider || "github");
  const [owner, setOwner] = useState(credentials.owner || "");
  const [gitProject, setGitProject] = useState(credentials.project || "");
  const [repo, setRepo] = useState(credentials.repo || "");
  const [branch, setBranch] = useState(credentials.branch || "");
  const [filePath, setFilePath] = useState(credentials.filePath || credentials.path || "");
  const [pat, setPat] = useState(credentials.pat || "");
  const [showPat, setShowPat] = useState(false);
  const [rememberPat, setRememberPat] = useState(true);
  const [isSavingGit, setIsSavingGit] = useState(false);
  const [isTestingGit, setIsTestingGit] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [showDisconnectGitModal, setShowDisconnectGitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState("Update design tokens via Second Screen");
  const [isPushingGit, setIsPushingGit] = useState(false);

  // -------------------------------------------------------------
  // Figma Companion Plugin State
  // -------------------------------------------------------------
  const [pairCode, setPairCode] = useState("");
  const [isPairing, setIsPairing] = useState(false);
  const [copiedPairCode, setCopiedPairCode] = useState(false);
  const [activePluginKey, setActivePluginKey] = useState<any | null>(null);
  const [isLoadingPluginStatus, setIsLoadingPluginStatus] = useState(false);
  const [isUnlinkingPlugin, setIsUnlinkingPlugin] = useState(false);

  useEffect(() => {
    setProvider(credentials.provider || "github");
    setOwner(credentials.owner || "");
    setGitProject(credentials.project || "");
    setRepo(credentials.repo || "");
    setBranch(credentials.branch || "");
    setFilePath(credentials.filePath || credentials.path || "");
    setPat(credentials.pat || "");
  }, [credentials]);

  const activeProvider = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
  const isGitConnected = Boolean(credentials.owner && credentials.repo);

  // Generate pair code
  const handleGeneratePairCode = () => {
    const code = `TK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setPairCode(code);
  };

  useEffect(() => {
    if (!pairCode) {
      handleGeneratePairCode();
    }
  }, []);

  const handleCopyPairCode = () => {
    navigator.clipboard.writeText(pairCode);
    setCopiedPairCode(true);
    setTimeout(() => setCopiedPairCode(false), 2000);
    addToast({
      type: "success",
      title: "Pair Code Copied",
      message: `Code ${pairCode} copied. Paste into the Figma companion plugin.`,
    });
  };

  // -------------------------------------------------------------
  // Git Actions
  // -------------------------------------------------------------
  const handleTestConnection = async () => {
    if (!owner || !repo || !pat) {
      addToast({
        type: "error",
        title: "Incomplete Details",
        message: "Please provide Repository Owner, Repo Name, and a valid PAT.",
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
        pat: pat.trim(),
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
    if (!currentOrg || !currentProject) return;

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
        pat: pat.trim(),
      };
      const updatedCreds = sanitizeGitCredentials(rawCreds);

      setCredentials(updatedCreds, rememberPat);
      await saveProjectGitConfig(currentOrg.id, currentProject.id, updatedCreds);

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

  const handleDisconnectGit = async () => {
    if (!currentOrg || !currentProject) return;
    try {
      clearCredentials();
      await saveProjectGitConfig(currentOrg.id, currentProject.id, null);
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
      await fetchLiveTokens();
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

  if (!currentProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background select-none">
        <Link2 className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <h2 className="text-base font-bold text-foreground">No Project Selected</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Please select a project to configure Git synchronization and Figma Companion plugin.
        </p>
        <Button
          onClick={() => setSidebarTab("dashboard")}
          size="sm"
          className="mt-4 text-xs font-semibold"
        >
          Go to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-y-auto select-none">
      {/* Top Banner Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
            <Link2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{currentOrg?.name || "Workspace"}</span>
              <span>/</span>
              <span className="text-foreground font-semibold flex items-center gap-1.5">
                <span>{currentProject.icon || "🎯"}</span>
                <span>{currentProject.name}</span>
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Sync Providers &amp; Companion Connect
            </h1>
            <p className="text-xs text-muted-foreground">
              Version control, Figma variable pipelines, and automated distribution targets.
            </p>
          </div>
        </div>

        {/* Quick Studio Shortcut */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarTab("tokens")}
            className="text-xs h-8"
          >
            Back to Studio
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-8 space-y-6 max-w-5xl w-full mx-auto">
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
            {/* Git Status Card */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  isGitConnected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                }`}>
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {isGitConnected ? `${credentials.owner}/${credentials.repo}` : "No Git Provider Connected"}
                    </span>
                    <Badge variant={isGitConnected ? "success" : "outline"} className="text-[10px]">
                      {isGitConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isGitConnected
                      ? `Branch: ${credentials.branch || "main"} · File: ${credentials.filePath || credentials.path || "root"}`
                      : "Configure credentials below to commit and sync tokens directly to your Git repository."}
                  </p>
                </div>
              </div>

              {/* Quick Git Operations */}
              {isGitConnected && (
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
              <div className="border-b border-border/80 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Repository Credentials &amp; Target</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tokens are written to and read from your repository in W3C DTCG standard JSON format.
                  </p>
                </div>
                <a
                  href={activeProvider.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <span>{activeProvider.label} Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

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
                  <Label className="text-xs font-semibold">
                    {provider === "azure" ? "Azure Organization" : "Repository Owner / Org *"}
                  </Label>
                  <Input
                    placeholder="e.g. acme-corp or username"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </div>

                {provider === "azure" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Azure Project Name *</Label>
                    <Input
                      placeholder="e.g. DesignSystem"
                      value={gitProject}
                      onChange={(e) => setGitProject(e.target.value)}
                      required
                      className="text-xs h-9"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Repository Name *</Label>
                  <Input
                    placeholder="e.g. design-tokens or brand-ui"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Branch</Label>
                  <Input
                    placeholder="main or develop"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">File / Directory Path in Repo</Label>
                  <Input
                    placeholder="e.g. tokens.json or tokens/"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Personal Access Token (PAT) *</Label>
                  <div className="relative">
                    <Input
                      type={showPat ? "text" : "password"}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      required
                      className="text-xs h-9 font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPat(!showPat)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isTestingGit || !owner || !repo || !pat}
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
                  disabled={isSavingGit || !owner || !repo || !pat}
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
            {/* Figma Pairing Card */}
            <div className="p-6 rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/5 to-card shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold text-lg">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Figma Companion Plugin</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sync Figma native variables, modes, and typography straight to this project.
                    </p>
                  </div>
                </div>

                <Badge variant="violet" className="font-mono text-xs">
                  {figmaResolvedVariables.length > 0 ? "Synced & Ready" : "Pairing Ready"}
                </Badge>
              </div>

              {/* Magic 6-Character Pair Code Display */}
              <div className="p-5 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Project Pair Code
                  </span>
                  <div className="text-2xl font-extrabold font-mono text-primary tracking-widest">
                    {pairCode}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Enter this code inside the companion plugin window in Figma.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCopyPairCode}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-9 font-semibold"
                  >
                    {copiedPairCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPairCode ? "Copied" : "Copy Code"}</span>
                  </Button>

                  <Button
                    onClick={handleGeneratePairCode}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-9 text-muted-foreground hover:text-foreground"
                    title="Generate New Code"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Step-by-step Setup */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quick 3-Step Setup
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <span className="font-bold text-foreground block">Download Manifest</span>
                    <p className="text-[11px] text-muted-foreground">
                      Download the companion plugin manifest bundle to install in Figma.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <span className="font-bold text-foreground block">Load in Figma Desktop</span>
                    <p className="text-[11px] text-muted-foreground">
                      Plugins &rarr; Development &rarr; Import plugin from manifest...
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <span className="font-bold text-foreground block">Paste Pair Code</span>
                    <p className="text-[11px] text-muted-foreground">
                      Paste <code className="font-bold text-primary">{pairCode}</code> to link variables.
                    </p>
                  </div>
                </div>
              </div>

              {/* Download Plugin Button */}
              <div className="flex justify-end pt-3 border-t border-border">
                <Button
                  onClick={handleDownloadManifest}
                  size="sm"
                  className="gap-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Plugin Bundle</span>
                </Button>
              </div>
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
