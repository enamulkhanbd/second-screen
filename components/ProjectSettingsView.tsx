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
    docsUrl: "https://gitlab.com/-/profile/personal_access_tokens",
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

export const ProjectSettingsView: React.FC = () => {
  const {
    currentOrg,
    currentProject,
    credentials,
    setCredentials,
    clearCredentials,
    addToast,
    getCurrentUserRole,
    setSidebarTab,
  } = useTokenStore();

  const userRole = getCurrentUserRole();
  const canEditSettings = userRole === "owner" || userRole === "admin";

  // Project General State
  const [projectName, setProjectName] = useState(currentProject?.name || "");
  const [projectDescription, setProjectDescription] = useState(currentProject?.description || "");
  const [copiedId, setCopiedId] = useState(false);

  // Git State
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
  const [showDisconnectGitModal, setShowDisconnectGitModal] = useState(false);
  const [isDisconnectingGit, setIsDisconnectingGit] = useState(false);

  // Quick Pair State for Figma Plugin
  const [pairCodeInput, setPairCodeInput] = useState("");
  const [isPairing, setIsPairing] = useState(false);
  const [isPairSuccess, setIsPairSuccess] = useState(false);
  const [activePluginKey, setActivePluginKey] = useState<any | null>(null);
  const [isLoadingPluginStatus, setIsLoadingPluginStatus] = useState(false);
  const [isUnlinkingPlugin, setIsUnlinkingPlugin] = useState(false);
  const [showPairInput, setShowPairInput] = useState(false);

  // Danger Zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const fetchPluginStatus = async () => {
    if (!currentProject) return;
    setIsLoadingPluginStatus(true);
    try {
      const res = await fetch("/api/v1/auth/pat");
      if (res.ok) {
        const data = await res.json();
        const keys = data.keys || [];
        const match = keys.find(
          (k: any) =>
            k.projectId === currentProject.id ||
            (k.name && k.name.toLowerCase().includes("figma"))
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
  }, [currentProject?.id]);

  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
      setProjectDescription(currentProject.description || "");
    }
  }, [currentProject]);

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

  const handleCopyProjectId = () => {
    if (currentProject) {
      navigator.clipboard.writeText(currentProject.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      addToast({
        type: "success",
        title: "Project ID Copied",
        message: "Copied project identifier to clipboard.",
      });
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
        message: `Project connected to ${updatedCreds.repo}@${updatedCreds.branch}.`,
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

      addToast({
        type: "success",
        title: "Git Connection Verified!",
        message: `Successfully reached ${repo}. Found ${data.branches?.length || 0} branches.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Connection Failed",
        message: err.message || "Could not reach Git repository.",
      });
    } finally {
      setIsTestingGit(false);
    }
  };

  const handleConfirmDisconnectGit = async () => {
    if (!currentOrg || !currentProject) return;
    setIsDisconnectingGit(true);
    try {
      clearCredentials();
      await saveProjectGitConfig(currentOrg.id, currentProject.id, null);
      await saveProjectTokens(currentOrg.id, currentProject.id, {});
      setOwner("");
      setGitProject("");
      setRepo("");
      setBranch("");
      setFilePath("");
      setPat("");
      setShowDisconnectGitModal(false);
      addToast({
        type: "info",
        title: "Sync Provider Disconnected",
        message: "Successfully unlinked Git repository from this project.",
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Disconnection Failed",
        message: err.message || "Failed to disconnect Git provider.",
      });
    } finally {
      setIsDisconnectingGit(false);
    }
  };

  const handleApprovePairCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = pairCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (!currentOrg || !currentProject) {
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
          projectId: currentProject.id,
          orgName: currentOrg.name,
          projectName: currentProject.name,
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
        message: `Connected to ${currentProject.name}. You can now push tokens from Figma!`,
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

  if (!currentProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <FolderGit2 className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <h2 className="text-base font-bold text-foreground">No Project Selected</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Please select or create a project from the Organization Switcher above to view project settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background text-foreground font-sans">
      {/* Top Header */}
      <div className="px-8 py-6 border-b border-border/80 bg-card/40 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>{currentOrg?.name || "Organization"}</span>
            <span>/</span>
            <span className="text-foreground font-medium">{currentProject.name}</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Project Settings</span>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-primary" />
            <span>Project Settings</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarTab("tokens")}
            className="text-xs h-8"
          >
            Back to Tokens
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto p-8 space-y-8">
        {/* Section 1: General Project Information */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>General Information</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Core identity and metadata for this design tokens workspace.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Created {new Date(currentProject.createdAt).toLocaleDateString()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={!canEditSettings}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Project Slug</Label>
              <Input
                value={currentProject.slug}
                readOnly
                disabled
                className="h-9 text-xs bg-muted/50 font-mono"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                disabled={!canEditSettings}
                placeholder="e.g. Brand tokens, color palette, typography and multi-theme modes"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Project Unique Identifier (ID)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={currentProject.id}
                  readOnly
                  disabled
                  className="h-9 text-xs font-mono bg-muted/50 flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyProjectId}
                  className="h-9 text-xs gap-1.5 px-3"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? "Copied" : "Copy ID"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Git Provider Synchronization */}
        <form onSubmit={handleSaveGitConfig} className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                <span>Git Synchronization</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your repository to commit, pull, and version tokens automatically.
              </p>
            </div>
            {credentials.owner && credentials.repo ? (
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Connected</span>
                </Badge>
                {canEditSettings && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisconnectGitModal(true)}
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 px-2.5 gap-1.5"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </Button>
                )}
              </div>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                Not Configured
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            {/* Provider Grid */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Git Provider</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    disabled={!canEditSettings}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                      provider === p.id
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                        : "border-border bg-card hover:bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    <span className="text-base">{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Repo Owner, Azure Project (if Azure), and Repo Name */}
            <div className={`grid grid-cols-1 ${provider === "azure" ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {provider === "azure" ? "Azure Organization" : "Repository Owner / Organization"}
                </Label>
                <Input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder={
                    provider === "azure"
                      ? "e.g. your-organization"
                      : "e.g. your-org or username"
                  }
                  disabled={!canEditSettings}
                  required
                  className="h-9 text-xs"
                />
              </div>

              {provider === "azure" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Project Name</Label>
                  <Input
                    value={gitProject}
                    onChange={(e) => setGitProject(e.target.value)}
                    placeholder="e.g. your-project-name"
                    disabled={!canEditSettings}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Repository Name</Label>
                <Input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="e.g. design-tokens or repository-name"
                  disabled={!canEditSettings}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Branch & Path */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Branch</Label>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. main"
                  disabled={!canEditSettings}
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tokens JSON File Path</Label>
                <Input
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="e.g. assets/tokens/platforms/web or tokens.json"
                  disabled={!canEditSettings}
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* PAT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-primary" />
                  <span>Personal Access Token (PAT)</span>
                </Label>
                <a
                  href={activeProvider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <span>Generate {activeProvider.label} Token</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <Input
                  type={showPat ? "text" : "password"}
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder={`Paste your ${activeProvider.label} access token here...`}
                  disabled={!canEditSettings}
                  required
                  className="h-9 text-xs font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPat(!showPat)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  {showPat ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/70">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTestingGit || !pat || !repo}
                  className="h-9 text-xs gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingGit ? "animate-spin" : ""}`} />
                  <span>{isTestingGit ? "Testing..." : "Test Connection"}</span>
                </Button>

                {(credentials.owner || credentials.repo) && canEditSettings && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisconnectGitModal(true)}
                    disabled={isDisconnectingGit}
                    className="h-9 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect Provider</span>
                  </Button>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSavingGit || !canEditSettings}
                className="h-9 text-xs font-bold gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingGit ? "Saving..." : "Save Git Settings"}</span>
              </Button>
            </div>
          </div>
        </form>

        {/* Section 3: Figma Companion Plugin Integration */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Figma Companion Plugin</span>
                </h2>

                {/* Live Connection Status Badge */}
                {activePluginKey ? (
                  <Badge variant="success" className="gap-1.5 text-[10px] px-2 py-0.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5 text-[10px] px-2 py-0.5 text-muted-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    <span>Not Connected</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pair your desktop Figma canvas to push & pull 2,400+ variables with zero manual exports.
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
            {/* Left Box: Active Bridge Card or Quick 6-Digit Pair Widget */}
            {activePluginKey && !showPairInput ? (
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>Active Companion Bridge</span>
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
                    <span className="font-semibold text-foreground">{currentProject.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Connection Status:</span>
                    <span className="text-emerald-500 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live &amp; Ready
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
                    <span>Quick 6-Digit Code Pairing</span>
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
                  Open the plugin in Figma, grab the 6-character code (e.g. <code>TK-8492</code>), and approve it below:
                </p>

                <div className="flex items-center gap-2">
                  <Input
                    value={pairCodeInput}
                    onChange={(e) => setPairCodeInput(e.target.value.toUpperCase())}
                    placeholder="TK-XXXX"
                    maxLength={7}
                    className="h-9 text-xs font-mono uppercase tracking-wider"
                  />
                  <Button
                    type="submit"
                    disabled={isPairing || pairCodeInput.length < 4}
                    className="h-9 text-xs font-bold gap-1.5 px-4"
                  >
                    <span>{isPairing ? "Pairing..." : "Connect"}</span>
                  </Button>
                </div>

                {isPairSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Plugin paired to {currentProject.name}!</span>
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
                <li>Click <strong>Run</strong> and enter the 6-digit code above!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Section 4: Danger Zone */}
        {canEditSettings && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-destructive/20 pb-3">
              <div>
                <h2 className="text-sm font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Danger Zone</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Irreversible actions for this project.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">Delete this Project</div>
                <div className="text-[11px] text-muted-foreground">
                  Permanently delete <strong>{currentProject.name}</strong> and all its token collections.
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-8 text-xs gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Project</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect Git Provider Confirmation Dialog */}
      <Dialog open={showDisconnectGitModal} onOpenChange={setShowDisconnectGitModal}>
        <DialogContent className="max-w-md p-6 gap-4 font-sans">
          <DialogHeader className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
              <Unlink className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold">Disconnect Git Provider?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will unlink repository <strong className="text-foreground">{credentials.repo || "active"}</strong> from this project and clear saved synchronization credentials. You can reconnect anytime.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisconnectGitModal(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDisconnectGit}
              disabled={isDisconnectingGit}
              className="text-xs h-9 font-bold gap-1.5"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>{isDisconnectingGit ? "Disconnecting..." : "Confirm Disconnect"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md p-6 gap-4 font-sans">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete Project</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This action cannot be undone. This will permanently delete the <strong>{currentProject.name}</strong> project and remove all associated design tokens, theme modes, and releases.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">
              Type <span className="font-mono text-destructive">{currentProject.name}</span> to confirm:
            </Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={currentProject.name}
              className="h-9 text-xs font-mono"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText("");
              }}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteConfirmText !== currentProject.name}
              onClick={() => {
                setShowDeleteConfirm(false);
                addToast({
                  type: "success",
                  title: "Project Deleted",
                  message: `Project ${currentProject.name} was removed.`,
                });
                setSidebarTab("dashboard");
              }}
              className="text-xs h-9 font-bold gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>I understand, delete this project</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
