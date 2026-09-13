"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Lock,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const ProjectSettingsView: React.FC = () => {
  const {
    currentOrg,
    currentProject,
    orgProjects,
    updateProjectAction,
    deleteProjectAction,
    addToast,
    getCurrentUserRole,
    setSidebarTab,
  } = useTokenStore();

  const userRole = getCurrentUserRole();
  const canEditSettings = userRole === "owner" || userRole === "admin";

  const [projectName, setProjectName] = useState(currentProject?.name || "Planet-JustGo");
  const [projectSlug, setProjectSlug] = useState(currentProject?.slug || "planet-justgo");
  const [projectDescription, setProjectDescription] = useState(currentProject?.description || "");
  const [basePermission, setBasePermission] = useState("write");
  const [isSaving, setIsSaving] = useState(false);

  const isDuplicateName = Boolean(
    projectName.trim() &&
    currentProject &&
    orgProjects.some(
      (p) =>
        p.id !== currentProject.id &&
        p.name.trim().toLowerCase() === projectName.trim().toLowerCase()
    )
  );

  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
      setProjectSlug(currentProject.slug || currentProject.name.toLowerCase().replace(/\s+/g, "-"));
      setProjectDescription(currentProject.description || "");
    }
  }, [currentProject]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !currentProject || !projectName.trim() || isDuplicateName) return;

    setIsSaving(true);
    try {
      await updateProjectAction(currentOrg.id, currentProject.id, {
        name: projectName.trim(),
        description: projectDescription.trim(),
      });
      addToast({
        type: "success",
        title: "Project Updated",
        message: "Your project details and settings have been saved.",
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update project settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState("");

  const handleArchive = async () => {
    if (!currentOrg || !currentProject) return;
    const willArchive = !currentProject.isArchived;
    const confirmMsg = willArchive
      ? `Are you sure you want to archive "${currentProject.name}"? It will become read-only and move to the Archived projects tab.`
      : `Are you sure you want to restore "${currentProject.name}" to active status?`;
    if (!confirm(confirmMsg)) return;

    try {
      await updateProjectAction(currentOrg.id, currentProject.id, {
        isArchived: willArchive,
      });
      addToast({
        type: "success",
        title: willArchive ? "Project Archived" : "Project Restored",
        message: willArchive
          ? `"${currentProject.name}" has been moved to archived.`
          : `"${currentProject.name}" has been restored to active status.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Action Failed",
        message: err.message || "Failed to update project archive status.",
      });
    }
  };

  const handleDelete = async () => {
    if (!currentOrg || !currentProject) return;
    setIsDeleting(true);
    try {
      const projName = currentProject.name;
      await deleteProjectAction(currentOrg.id, currentProject.id);
      addToast({
        type: "success",
        title: "Project Deleted",
        message: `Project "${projName}" has been permanently deleted.`,
      });
      setSidebarTab("tokens");
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: err.message || "Failed to delete project.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setConfirmNameInput("");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background text-foreground font-sans select-none p-6 md:p-10">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header (Matching Video Frame 007) */}
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Project details</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your project profile and default settings.
          </p>
        </div>

        {/* Main Settings Card */}
        <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          {/* Name * */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Name <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-[#ecfdf5] dark:bg-[#064e3b]/40 border border-[#a7f3d0] dark:border-[#065f46] text-[#059669] flex items-center justify-center font-bold text-xs shrink-0">
                {projectName?.[0]?.toUpperCase() || "P"}
              </div>
              <Input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={!canEditSettings}
                required
                className="h-9 text-xs flex-1 bg-background"
              />
            </div>
            {isDuplicateName && (
              <p className="text-[11px] text-destructive font-medium mt-1">
                A project with this name already exists in {currentOrg?.name}.
              </p>
            )}
          </div>

          {/* Slug * */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              value={projectSlug}
              onChange={(e) => setProjectSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              disabled={!canEditSettings}
              required
              className="h-9 text-xs font-mono bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              URL-friendly identifier (lowercase letters, numbers, and hyphens only)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Description
            </Label>
            <textarea
              rows={3}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              disabled={!canEditSettings}
              placeholder="Add project description..."
              className="w-full text-xs p-3 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Base Permission */}
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-semibold text-foreground">Base Permission</Label>
                <p className="text-[11px] text-muted-foreground">
                  Controls implicit access for workspace members without explicit project invites.
                </p>
              </div>
              <Select value={basePermission} onValueChange={setBasePermission}>
                <SelectTrigger className="w-36 h-9 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="write">Write</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project ID */}
          {currentProject?.id && (
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <Label className="text-xs font-semibold text-foreground">Project ID</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={currentProject.id}
                  readOnly
                  className="h-9 text-xs font-mono bg-muted/40 text-muted-foreground select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(currentProject.id);
                    addToast({
                      type: "success",
                      title: "Copied",
                      message: "Project ID copied to clipboard.",
                    });
                  }}
                  className="h-9 px-3 text-xs shrink-0 cursor-pointer"
                >
                  Copy
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSidebarTab("tokens")}
              className="h-8 text-xs font-medium cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !canEditSettings || isDuplicateName || !projectName.trim()}
              className="h-8 text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white cursor-pointer shadow-2xs"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>

        {/* Danger Zone: Archive Project Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {currentProject?.isArchived ? (
              <ArchiveRestore className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            ) : (
              <Archive className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div>
              <div className="text-xs font-semibold text-foreground">
                {currentProject?.isArchived ? "Restore project" : "Archive project"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {currentProject?.isArchived
                  ? "Restore this project to active status. Members will be able to edit tokens and publish changes again."
                  : "Archiving hides the project from active workspace views and makes it read-only. You can unarchive it anytime."}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={!canEditSettings}
            className="h-8 text-xs font-medium cursor-pointer shrink-0"
          >
            {currentProject?.isArchived ? "Restore project" : "Archive project"}
          </Button>
        </div>

        {/* Danger Zone: Delete Project Card */}
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Trash2 className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-destructive">Delete project</div>
              <p className="text-[11px] text-muted-foreground">
                Permanently delete this project and all its tokens, branches, themes, and configuration. This action cannot be undone.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={!canEditSettings}
            className="h-8 text-xs font-medium cursor-pointer shrink-0"
          >
            Delete project
          </Button>
        </div>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md font-sans">
            <DialogHeader>
              <div className="flex items-center gap-2 text-destructive mb-1">
                <AlertTriangle className="w-5 h-5" />
                <DialogTitle className="text-base font-bold">Delete Project</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Are you sure you want to permanently delete <strong className="text-foreground">{currentProject?.name}</strong>?
                This action is irreversible and all tokens, theme configurations, releases, and branches will be lost.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-3">
              <p className="text-xs text-muted-foreground">
                Please type <span className="font-mono font-semibold text-foreground">{currentProject?.name}</span> to confirm:
              </p>
              <Input
                type="text"
                placeholder={currentProject?.name}
                value={confirmNameInput}
                onChange={(e) => setConfirmNameInput(e.target.value)}
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setConfirmNameInput("");
                }}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={confirmNameInput !== currentProject?.name || isDeleting}
                onClick={handleDelete}
                className="h-8 text-xs cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
