"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  FolderGit2,
  GitBranch,
  Zap,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  Layers,
  Save,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const ProjectSettingsView: React.FC = () => {
  const {
    currentOrg,
    currentProject,
    updateProjectAction,
    credentials,
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
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Figma Companion Key Status
  const [activePluginKey, setActivePluginKey] = useState<any | null>(null);

  // Danger Zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleSaveGeneralInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !currentProject || !projectName.trim()) return;

    setIsSavingGeneral(true);
    try {
      await updateProjectAction(currentOrg.id, currentProject.id, {
        name: projectName.trim(),
        description: projectDescription.trim(),
      });
      addToast({
        type: "success",
        title: "Project Updated",
        message: `Saved project as "${projectName.trim()}".`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update project details.",
      });
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const fetchPluginStatus = async () => {
    if (!currentProject) return;
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
    } catch {}
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

  const isGitConnected = Boolean(credentials.owner && credentials.repo);

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
            onClick={() => setSidebarTab("integrations")}
            className="text-xs h-8 gap-1.5"
          >
            <GitBranch className="w-3.5 h-3.5 text-primary" />
            <span>Sync Providers</span>
          </Button>
          <Button
            variant="ghost"
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
        <form onSubmit={handleSaveGeneralInfo} className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
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
                required
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
                  type="button"
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

          {canEditSettings && (
            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button
                type="submit"
                size="sm"
                disabled={isSavingGeneral || !projectName.trim()}
                className="gap-1.5 text-xs font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingGeneral ? "Saving..." : "Save Project Details"}</span>
              </Button>
            </div>
          )}
        </form>

        {/* Section 2: Sync Providers & Integrations Quick Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                <span>Sync Providers &amp; Companion Connect</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Git repository integration, Figma desktop variable bridge, and CI/CD webhooks.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setSidebarTab("integrations")}
              className="gap-1.5 text-xs font-semibold"
            >
              <span>Manage in Sync Providers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Git Sync Status Pill */}
            <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isGitConnected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                }`}>
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    {isGitConnected ? `${credentials.owner}/${credentials.repo}` : "Git Repository"}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {isGitConnected ? `Branch: ${credentials.branch || "main"}` : "Not configured"}
                  </p>
                </div>
              </div>
              <Badge variant={isGitConnected ? "success" : "outline"} className="text-[10px]">
                {isGitConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>

            {/* Figma Bridge Status Pill */}
            <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  activePluginKey ? "bg-violet-500/10 text-violet-500" : "bg-muted text-muted-foreground"
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Figma Companion Plugin</div>
                  <p className="text-[11px] text-muted-foreground">
                    {activePluginKey ? "Canvas variable bridge live" : "Not connected"}
                  </p>
                </div>
              </div>
              <Badge variant={activePluginKey ? "violet" : "outline"} className="text-[10px]">
                {activePluginKey ? "Active" : "Not Paired"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Section 3: Danger Zone */}
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
