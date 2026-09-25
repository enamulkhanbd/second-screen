"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Organization } from "@/types/tenant";
import { Plus, Folder, Users, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const COLOR_PRESETS = [
  "#171717", // Neutral
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia / Magenta
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f59e0b", // Amber
];

export const WorkspacesListView: React.FC = () => {
  const {
    userOrgs,
    currentOrg,
    setCurrentOrg,
    setCurrentProject,
    setSidebarTab,
    createOrgAction,
    addToast,
    orgProjects,
  } = useTokenStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgColor, setNewOrgColor] = useState("#171717");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to get project count for a given org
  const getProjectCount = (orgId: string) => {
    if (orgId === currentOrg?.id) {
      return orgProjects.length;
    }
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`ts_cached_org_projects_${orgId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed.length;
        }
      } catch {}
    }
    return 0;
  };

  const handleSelectWorkspace = (org: Organization) => {
    setCurrentOrg(org);
    setCurrentProject(null);
    setSidebarTab("dashboard");
    addToast({
      type: "info",
      title: "Workspace Switched",
      message: `Opened "${org.name}".`,
    });
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createOrgAction(newOrgName.trim(), "🏢", newOrgColor);
      if (created) {
        addToast({
          type: "success",
          title: "Workspace Created",
          message: `Created workspace "${created.name}".`,
        });
        setNewOrgName("");
        setIsCreateOpen(false);
        // Navigate to the newly created workspace
        setCurrentOrg(created);
        setCurrentProject(null);
        setSidebarTab("dashboard");
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Creation Failed",
        message: err.message || "Failed to create workspace.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-y-auto select-none">
      <div className="max-w-3xl w-full mx-auto px-6 py-12 sm:py-16 space-y-6">
        {/* Header matching Screenshot 1 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Workspaces
          </h1>
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create workspace</span>
          </Button>
        </div>

        {/* Workspaces List matching Screenshot 1 */}
        <div className="space-y-3">
          {userOrgs.map((org, index) => {
            const projectCount = getProjectCount(org.id);
            const memberCount = org.members?.length || 1;
            const orgColor = org.color || (index % 2 === 0 ? "#171717" : "#525252");
            const initialLetter = org.name ? org.name.charAt(0).toUpperCase() : "W";

            return (
              <div
                key={org.id}
                onClick={() => handleSelectWorkspace(org)}
                className="group p-4 sm:p-5 rounded-2xl border border-border/80 hover:border-primary/40 bg-card hover:bg-muted/30 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-4"
              >
                {/* Left side: Avatar + Name + Subtitle */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: orgColor }}
                  >
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={org.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <span>{initialLetter}</span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h2 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {org.name || "Untitled Workspace"}
                    </h2>

                    <p className="text-xs text-muted-foreground">
                      Workspace
                    </p>
                  </div>
                </div>

                {/* Right side: Project Count & Member Count matching Screenshot 1 */}
                <div className="flex items-center gap-4 sm:gap-6 text-xs text-muted-foreground/80 font-mono shrink-0">
                  <div className="flex items-center gap-1.5" title={`${projectCount} Projects`}>
                    <Folder className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>{projectCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title={`${memberCount} Members`}>
                    <Users className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>{memberCount}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {userOrgs.length === 0 && (
            <div className="text-center p-12 border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
              <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="font-semibold text-sm text-foreground">No workspaces found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Get started by creating your first workspace to organize design tokens and projects.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="mt-2 text-xs"
              >
                Create workspace
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md font-sans">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Create New Workspace</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Set up a shared space for your design tokens, themes, and projects.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Workspace Name *</Label>
              <Input
                type="text"
                required
                placeholder="e.g. Acme Design System, Planet2"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="text-xs h-9"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Workspace Color</Label>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewOrgColor(color)}
                    className={`w-7 h-7 rounded-lg transition-transform cursor-pointer ${
                      newOrgColor === color ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !newOrgName.trim()}
                className="text-xs font-semibold"
              >
                {isSubmitting ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
