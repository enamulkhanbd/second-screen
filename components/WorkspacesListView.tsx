"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTokenStore } from "@/store/useTokenStore";
import { useShallow } from "zustand/react/shallow";
import { Organization } from "@/types/tenant";
import { getOrgProjectCounts } from "@/services/organizationService";
import { Plus, Folder, Users, Building2, ChevronRight } from "lucide-react";
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
  "#0d9488", // Teal (Arogga)
  "#22c55e", // Green (UX Studio)
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia / Magenta
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#3b82f6", // Blue
  "#f59e0b", // Amber
];

export const WorkspacesListView: React.FC = () => {
  const router = useRouter();
  const {
    userOrgs,
    currentOrg,
    setCurrentOrg,
    setCurrentProject,
    setSidebarTab,
    createOrgAction,
    addToast,
    orgProjects,
  } = useTokenStore(
    useShallow((s) => ({
      userOrgs: s.userOrgs,
      currentOrg: s.currentOrg,
      setCurrentOrg: s.setCurrentOrg,
      setCurrentProject: s.setCurrentProject,
      setSidebarTab: s.setSidebarTab,
      createOrgAction: s.createOrgAction,
      addToast: s.addToast,
      orgProjects: s.orgProjects,
    }))
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgColor, setNewOrgColor] = useState("#171717");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});

  // One lightweight query for all counts instead of loading full project summaries per workspace
  useEffect(() => {
    if (userOrgs.length === 0) return;
    let isCancelled = false;

    getOrgProjectCounts(userOrgs.map((org) => org.id)).then((counts) => {
      if (!isCancelled && Object.keys(counts).length > 0) {
        setProjectCounts(counts);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [userOrgs]);

  // Helper to get project count for a given org
  const getProjectCount = (orgId: string) => {
    if (projectCounts[orgId] !== undefined) {
      return projectCounts[orgId];
    }
    if (orgId === currentOrg?.id && orgProjects.length > 0) {
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
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createOrgAction(
        newOrgName.trim(),
        newOrgName.trim().charAt(0).toUpperCase(),
        newOrgColor
      );
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
        router.push(`/${encodeURIComponent(created.slug)}/overview`);
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
    <div className="flex-1 flex flex-col h-full bg-background text-foreground font-sans overflow-y-auto select-none">
      <div className="max-w-4xl w-full mx-auto px-6 py-12 sm:py-16 space-y-6">
        {/* Header matching Screenshot */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Workspaces
          </h1>
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create workspace</span>
          </Button>
        </div>

        {/* Workspaces List matching Screenshot */}
        <div className="space-y-3.5">
          {userOrgs.map((org, index) => {
            const projectCount = getProjectCount(org.id);
            const memberCount = org.members?.length || org.memberUids?.length || 1;
            const isPlanetOrg =
              org.name?.toLowerCase().includes("planet") || org.slug?.includes("planet");
            const isAroggaOrg =
              org.name?.toLowerCase().includes("arogga") || org.slug?.includes("arogga");
            const isUxStudioOrg =
              org.name?.toLowerCase().includes("ux studio") || org.slug?.includes("ux-studio");

            const orgColor =
              org.color ||
              (isAroggaOrg
                ? "#0d9488"
                : isUxStudioOrg
                ? "#22c55e"
                : index % 2 === 0
                ? "#171717"
                : "#525252");

            const logoImgUrl = org.logoUrl || (isPlanetOrg ? "/logo-app.png" : "");
            const initialLetter = org.name ? org.name.charAt(0).toUpperCase() : "W";

            return (
              <Link
                key={org.id}
                href={`/${encodeURIComponent(org.slug)}/overview`}
                onClick={(event) => {
                  if (
                    event.button === 0 &&
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.shiftKey &&
                    !event.altKey
                  ) {
                    handleSelectWorkspace(org);
                  }
                }}
                className="group p-4 sm:p-5 rounded-xl border border-border bg-card hover:bg-muted/35 hover:border-border/90 transition-colors shadow-2xs flex items-center justify-between gap-4"
              >
                {/* Left side: Avatar + Name + Slug */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-base shadow-2xs shrink-0 overflow-hidden"
                    style={{
                      backgroundColor: logoImgUrl
                        ? isPlanetOrg
                          ? "#dcfce7"
                          : "transparent"
                        : orgColor,
                    }}
                  >
                    {logoImgUrl ? (
                      <img
                        src={logoImgUrl}
                        alt={org.name}
                        className={
                          isPlanetOrg
                            ? "w-8 h-8 object-contain"
                            : "w-full h-full object-cover"
                        }
                      />
                    ) : (
                      <span>{initialLetter}</span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <h2 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {org.name || "Untitled Workspace"}
                    </h2>

                    <p className="text-xs text-muted-foreground font-mono truncate">
                      /{org.slug}
                    </p>
                  </div>
                </div>

                {/* Right side: Project Count & Member Count */}
                <div className="flex items-center gap-5 sm:gap-6 text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                  <div className="flex items-center gap-1.5" title={`${projectCount} Projects`}>
                    <Folder className="w-3.5 h-3.5 text-muted-foreground/80" strokeWidth={1.75} />
                    <span>{projectCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title={`${memberCount} Members`}>
                    <Users className="w-3.5 h-3.5 text-muted-foreground/80" strokeWidth={1.75} />
                    <span>{memberCount}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            );
          })}

          {userOrgs.length === 0 && (
            <div className="text-center p-12 border border-dashed border-border rounded-2xl bg-card/60 space-y-3">
              <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="font-semibold text-sm text-foreground">No workspaces found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Get started by creating your first workspace to organize design tokens and projects.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="mt-2 text-xs font-semibold"
              >
                Create workspace
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md font-sans bg-card border-border text-card-foreground">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted text-foreground">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">Create New Workspace</DialogTitle>
                <DialogDescription className="text-xs mt-0.5 text-muted-foreground">
                  Set up a shared space for your design tokens, themes, and projects.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="workspace-name" className="text-xs font-semibold text-foreground">Workspace Name *</Label>
              <Input
                id="workspace-name"
                type="text"
                required
                placeholder="e.g. Acme Design System, Planet2"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="text-xs h-9 bg-background border-input text-foreground"
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
                    className={`w-7 h-7 rounded-lg transition cursor-pointer ${
                      newOrgColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:opacity-90"
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
                className="text-xs border-border text-muted-foreground hover:bg-muted"
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
