"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Lock,
  Archive,
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

export const ProjectSettingsView: React.FC = () => {
  const {
    currentOrg,
    currentProject,
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
  const [requireBranchApproval, setRequireBranchApproval] = useState(false);
  const [releaseExports, setReleaseExports] = useState("all");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
      setProjectSlug(currentProject.slug || currentProject.name.toLowerCase().replace(/\s+/g, "-"));
      setProjectDescription(currentProject.description || "");
    }
  }, [currentProject]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !currentProject || !projectName.trim()) return;

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

  const handleArchive = () => {
    if (confirm("Are you sure you want to archive this project? Archiving makes it read-only.")) {
      addToast({
        type: "info",
        title: "Project Archived",
        message: "Project archived successfully. You can unarchive it anytime.",
      });
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

          {/* Require branch approval */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-foreground">Require branch approval</div>
              <p className="text-[11px] text-muted-foreground">
                When on, a branch must be approved and have no unresolved blocking comments before it can be merged into main.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={requireBranchApproval}
              onClick={() => setRequireBranchApproval(!requireBranchApproval)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                requireBranchApproval ? "bg-[#6366f1]" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  requireBranchApproval ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Release exports */}
          <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-foreground">Release exports</div>
              <p className="text-[11px] text-muted-foreground">
                Which exports are generated and stored when a release is created. Raw JSON and a manifest are always included.
              </p>
            </div>
            <Select value={releaseExports} onValueChange={setReleaseExports}>
              <SelectTrigger className="w-48 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All saved exports</SelectItem>
                <SelectItem value="css">CSS Variables only</SelectItem>
                <SelectItem value="json">Raw JSON only</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              disabled={isSaving || !canEditSettings}
              className="h-8 text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white cursor-pointer shadow-2xs"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>

        {/* Danger Zone: Archive Project Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Archive className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-foreground">Archive project</div>
              <p className="text-[11px] text-muted-foreground">
                Archiving makes this project read-only. You can unarchive it later to restore full access.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleArchive}
            className="h-8 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 cursor-pointer shrink-0"
          >
            Archive project
          </Button>
        </div>
      </div>
    </div>
  );
};
