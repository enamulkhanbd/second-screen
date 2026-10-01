"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTokenStore } from "@/store/useTokenStore";
import { Organization } from "@/types/tenant";
import { getOrgProjectSummaries } from "@/services/organizationService";
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
  } = useTokenStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgColor, setNewOrgColor] = useState("#171717");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});

  // Dynamically load real project counts for all user organizations
  useEffect(() => {
    if (userOrgs.length === 0) return;
    let isCancelled = false;

    userOrgs.forEach(async (org) => {
      try {
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem(`ts_cached_org_projects_${org.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && !isCancelled) {
              setProjectCounts((prev) => ({ ...prev, [org.id]: parsed.length }));
            }
          }
        }
        const projects = await getOrgProjectSummaries(org.id);
        if (!isCancelled && projects) {
          setProjectCounts((prev) => ({ ...prev, [org.id]: projects.length }));
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`ts_cached_org_projects_${org.id}`, JSON.stringify(projects));
            } catch {}
          }
        }
      } catch {}
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
    router.push(`/${encodeURIComponent(org.slug)}/overview`);
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
    <div className="flex-1 flex flex-col h-full bg-[#09090d] text-zinc-100 font-sans overflow-y-auto select-none">
      <div className="max-w-4xl w-full mx-auto px-6 py-12 sm:py-16 space-y-6">
        {/* Header matching Screenshot */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
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
              <div
                key={org.id}
                onClick={() => handleSelectWorkspace(org)}
                className="group p-5 sm:p-6 rounded-2xl border border-[#1f2126] bg-[#0e0e11] hover:bg-[#131418] hover:border-zinc-700/80 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-4"
              >
                {/* Left side: Avatar + Name + Subtitle */}
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0 overflow-hidden"
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
                            ? "w-10 h-10 object-contain"
                            : "w-full h-full object-cover"
                        }
                      />
                    ) : (
                      <span>{initialLetter}</span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h2 className="font-bold text-base sm:text-lg text-white group-hover:text-primary transition-colors truncate">
                      {org.name || "Untitled Workspace"}
                    </h2>

                    <p className="text-xs text-zinc-400 font-normal">
                      Workspace
                    </p>
                  </div>
                </div>

                {/* Right side: Project Count & Member Count matching Screenshot */}
                <div className="flex items-center gap-5 sm:gap-7 text-xs sm:text-sm text-zinc-400 font-mono shrink-0">
                  <div className="flex items-center gap-2" title={`${projectCount} Projects`}>
                    <Folder className="w-4 h-4 text-zinc-400/80" strokeWidth={1.75} />
                    <span>{projectCount}</span>
                  </div>
                  <div className="flex items-center gap-2" title={`${memberCount} Members`}>
                    <Users className="w-4 h-4 text-zinc-400/80" strokeWidth={1.75} />
                    <span>{memberCount}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {userOrgs.length === 0 && (
            <div className="text-center p-12 border border-dashed border-[#1f2126] rounded-2xl bg-[#0e0e11]/60 space-y-3">
              <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="font-semibold text-sm text-white">No workspaces found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Get started by creating your first workspace to organize design tokens and projects.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="mt-2 text-xs bg-[#22c55e] text-zinc-950 hover:bg-[#16a34a] font-semibold"
              >
                Create workspace
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md font-sans bg-[#121316] border-[#1f2126] text-white">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Create New Workspace</DialogTitle>
                <DialogDescription className="text-xs mt-0.5 text-zinc-400">
                  Set up a shared space for your design tokens, themes, and projects.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-200">Workspace Name *</Label>
              <Input
                type="text"
                required
                placeholder="e.g. Acme Design System, Planet2"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="text-xs h-9 bg-[#0c0d10] border-[#27292e] text-white"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-200">Workspace Color</Label>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewOrgColor(color)}
                    className={`w-7 h-7 rounded-lg transition-all cursor-pointer ${
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
                className="text-xs border-[#27292e] text-zinc-300 hover:bg-[#1f2126]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !newOrgName.trim()}
                className="text-xs font-semibold bg-[#22c55e] text-zinc-950 hover:bg-[#16a34a]"
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
