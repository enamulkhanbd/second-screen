"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { GitCredentials, GitProvider } from "@/types/tokens";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";
import { saveProjectGitConfig, saveProjectTokens } from "@/services/organizationService";
import {
  Key,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { ApiKeysManager } from "@/components/ApiKeysManager";
import { PluginDistributionModal } from "@/components/PluginDistributionModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({ isOpen, onClose }) => {
  const {
    currentOrg,
    currentProject,
    credentials,
    setCredentials,
    clearCredentials,
    setRawTokens,
    setSyncStatus,
    addToast,
  } = useTokenStore();
  const [modalTab, setModalTab] = useState<"git" | "apikeys" | "plugin">("git");
  const [form, setForm] = useState<GitCredentials>({ ...credentials, pat: "" });
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Write-Only PAT state
  const configuredPat = credentials.pat || "";
  const hasConfiguredPat = Boolean(configuredPat);
  const patLast4 = configuredPat.length >= 4 ? configuredPat.slice(-4) : "";
  const [isReplacingPat, setIsReplacingPat] = useState(false);
  const [newPatInput, setNewPatInput] = useState("");
  const [showNewPat, setShowNewPat] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setForm({ ...credentials, pat: "" });
      setIsReplacingPat(false);
      setNewPatInput("");
      setShowNewPat(false);
      setStatusMessage(null);
    }
  }, [isOpen, credentials]);

  const handleDisconnect = async () => {
    clearCredentials();
    if (currentOrg && currentProject) {
      await saveProjectGitConfig(currentOrg.id, currentProject.id, null);
      await saveProjectTokens(currentOrg.id, currentProject.id, {});
    }
    setIsReplacingPat(false);
    setNewPatInput("");
    setShowNewPat(false);
    setForm({
      provider: "github",
      owner: "",
      project: "",
      repo: "",
      branch: "main",
      path: "",
      pat: "",
    });
    addToast({
      type: "info",
      title: "Repository Disconnected",
      message: "Cleared Git credentials and tokens from active workspace.",
    });
    onClose();
  };

  const handleProviderChange = (provider: GitProvider) => {
    setForm((prev) => ({
      ...prev,
      provider,
      path: prev.path || "",
      branch: prev.branch || "main",
    }));
    setStatusMessage(null);
  };

  const handleSaveAndFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setLoading(true);

    const effectivePat = isReplacingPat ? newPatInput.trim() : (newPatInput.trim() || configuredPat);
    const formToSubmit = { ...form, pat: effectivePat };
    const sanitized = sanitizeGitCredentials(formToSubmit);

    if (sanitized.provider === "github" && (!sanitized.repo || !sanitized.pat)) {
      setLoading(false);
      setStatusMessage({
        type: "error",
        text: "Please provide Repository (owner/repo) and Personal Access Token (PAT).",
      });
      return;
    }

    if (sanitized.provider === "azure" && (!sanitized.owner || !sanitized.repo || !sanitized.pat)) {
      setLoading(false);
      setStatusMessage({
        type: "error",
        text: "Please provide Azure Organization, Repository Name, and PAT.",
      });
      return;
    }

    setCredentials(sanitized);
    setSyncStatus("fetching");

    try {
      const res = await fetch("/api/git/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitized),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Fetch failed with status ${res.status}`);
      }

      if (!data.tokens || typeof data.tokens !== "object") {
        throw new Error("Received empty or invalid token structure from Git provider.");
      }

      const { setUserProfile } = useTokenStore.getState();
      if (data.userProfile) {
        setUserProfile(data.userProfile);
      }
      setRawTokens(data.tokens, data.syncMeta);
      setSyncStatus("success");
      const modeText = data.syncMeta?.mode === "folder" ? "folder sets" : "file";
      addToast({
        type: "success",
        title: "Tokens Auto-Discovered & Synced",
        message: `Discovered and loaded ${modeText} from ${form.provider === "github" ? "GitHub" : "Azure DevOps"} (${sanitized.repo}@${sanitized.branch}).`,
      });
      onClose();
    } catch (err: any) {
      setSyncStatus("error", err.message);
      setStatusMessage({ type: "error", text: err.message });
      addToast({
        type: "error",
        title: "Git Sync Failed",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40 text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base">Project Settings & Sync</DialogTitle>
              <DialogDescription className="text-xs">
                Configure Git repositories and Tokens Platform Cloud API access
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-border">
          <Tabs value={modalTab} onValueChange={(val) => setModalTab(val as any)}>
            <TabsList className="bg-muted">
              <TabsTrigger value="git" className="gap-1.5 text-xs">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Git Synchronization</span>
              </TabsTrigger>
              <TabsTrigger value="apikeys" className="gap-1.5 text-xs">
                <Key className="w-3.5 h-3.5" />
                <span>Personal API Tokens</span>
              </TabsTrigger>
              <TabsTrigger value="plugin" className="gap-1.5 text-xs">
                <Globe className="w-3.5 h-3.5" />
                <span>Figma Plugin Setup</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {modalTab === "git" && (
            <form onSubmit={handleSaveAndFetch} className="space-y-4">
              {/* Provider Selector */}
              <div className="space-y-1.5">
                <Label>Git Provider</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleProviderChange("github")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                      form.provider === "github"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>GitHub</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProviderChange("azure")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                      form.provider === "azure"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>Azure DevOps</span>
                  </button>
                </div>
              </div>

              {/* Provider Inputs */}
              {form.provider === "github" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="gh-repo">Repository (owner/repo)</Label>
                    <Input
                      id="gh-repo"
                      type="text"
                      placeholder="e.g. your-org/design-tokens"
                      value={form.repo}
                      onChange={(e) => setForm({ ...form, repo: e.target.value })}
                      required
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="gh-branch">Branch</Label>
                      <Input
                        id="gh-branch"
                        type="text"
                        placeholder="e.g. main"
                        value={form.branch}
                        onChange={(e) => setForm({ ...form, branch: e.target.value })}
                        required
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gh-path">Path (Optional)</Label>
                      <Input
                        id="gh-path"
                        type="text"
                        placeholder="e.g. tokens.json or tokens/"
                        value={form.path}
                        onChange={(e) => setForm({ ...form, path: e.target.value })}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  {hasConfiguredPat && !isReplacingPat ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-500" />
                          <span>GitHub Personal Access Token (PAT)</span>
                        </Label>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Write-Only Vault</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-emerald-500" />
                          <span className="font-mono text-xs tracking-wider text-foreground select-none">
                            ••••••••••••••••••••••••••••••••
                          </span>
                          {patLast4 && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                              ••••{patLast4}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsReplacingPat(true);
                            setNewPatInput("");
                          }}
                          className="h-7 text-xs"
                        >
                          Replace
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="gh-pat">
                          {hasConfiguredPat ? "New GitHub PAT *" : "GitHub Personal Access Token (PAT) *"}
                        </Label>
                        {hasConfiguredPat && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsReplacingPat(false);
                              setNewPatInput("");
                              setShowNewPat(false);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="gh-pat"
                          type={showNewPat ? "text" : "password"}
                          placeholder={hasConfiguredPat ? "Paste new token to rotate..." : "ghp_..."}
                          value={newPatInput}
                          onChange={(e) => setNewPatInput(e.target.value)}
                          required={!hasConfiguredPat}
                          autoComplete="new-password"
                          className="font-mono text-xs pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPat(!showNewPat)}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showNewPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="az-org">Azure Organization</Label>
                      <Input
                        id="az-org"
                        type="text"
                        placeholder="e.g. your-organization"
                        value={form.owner}
                        onChange={(e) => setForm({ ...form, owner: e.target.value })}
                        required
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="az-project">Project Name</Label>
                      <Input
                        id="az-project"
                        type="text"
                        placeholder="e.g. your-project-name"
                        value={form.project}
                        onChange={(e) => setForm({ ...form, project: e.target.value })}
                        required
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="az-repo">Repository Name</Label>
                      <Input
                        id="az-repo"
                        type="text"
                        placeholder="e.g. design-tokens or repo-name"
                        value={form.repo}
                        onChange={(e) => setForm({ ...form, repo: e.target.value })}
                        required
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="az-branch">Branch</Label>
                      <Input
                        id="az-branch"
                        type="text"
                        placeholder="e.g. main"
                        value={form.branch}
                        onChange={(e) => setForm({ ...form, branch: e.target.value })}
                        required
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  {hasConfiguredPat && !isReplacingPat ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Azure Personal Access Token (PAT)</span>
                        </Label>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Write-Only Vault</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-emerald-500" />
                          <span className="font-mono text-xs tracking-wider text-foreground select-none">
                            ••••••••••••••••••••••••••••••••
                          </span>
                          {patLast4 && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                              ••••{patLast4}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsReplacingPat(true);
                            setNewPatInput("");
                          }}
                          className="h-7 text-xs"
                        >
                          Replace
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="az-pat">
                          {hasConfiguredPat ? "New Azure DevOps PAT *" : "Azure Personal Access Token (PAT) *"}
                        </Label>
                        {hasConfiguredPat && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsReplacingPat(false);
                              setNewPatInput("");
                              setShowNewPat(false);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="az-pat"
                          type={showNewPat ? "text" : "password"}
                          placeholder={hasConfiguredPat ? "Paste new token to rotate..." : "Paste your Azure DevOps PAT here..."}
                          value={newPatInput}
                          onChange={(e) => setNewPatInput(e.target.value)}
                          required={!hasConfiguredPat}
                          autoComplete="new-password"
                          className="font-mono text-xs pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPat(!showNewPat)}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showNewPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Status Message */}
              {statusMessage && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    statusMessage.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  {statusMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                <div>
                  {(credentials.repo || credentials.owner) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDisconnect}
                      className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Disconnect Repository
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading}
                    className="gap-1.5"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{loading ? "Connecting & Syncing..." : "Save & Sync Tokens"}</span>
                  </Button>
                </div>
              </div>
            </form>
          )}

          {modalTab === "apikeys" && <ApiKeysManager />}
          {modalTab === "plugin" && <PluginDistributionModal />}
        </div>
      </DialogContent>
    </Dialog>
  );
};
