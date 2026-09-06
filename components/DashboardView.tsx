"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Project, Organization } from "@/types/tenant";
import {
  Building2,
  FolderGit2,
  Plus,
  Search,
  Layers,
  Sparkles,
  ArrowRight,
  Settings,
  Users,
  CheckCircle2,
  ExternalLink,
  Trash2,
  GitBranch,
  Zap,
  MoreVertical,
  Edit2,
  Share2,
  Clock,
  Shield,
  Palette,
  Sliders,
  Check,
  ChevronDown,
  RefreshCw,
  Save,
} from "lucide-react";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { ManageOrgModal } from "@/components/ManageOrgModal";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface DashboardViewProps {
  onOpenSettings?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenSettings }) => {
  const {
    currentUser,
    userOrgs,
    currentOrg,
    orgProjects,
    currentProject,
    setCurrentOrg,
    setCurrentProject,
    createOrgAction,
    updateOrgAction,
    updateProjectAction,
    deleteProjectAction,
    getCurrentUserRole,
    setSidebarTab,
    addToast,
  } = useTokenStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showManageOrg, setShowManageOrg] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // Edit Workspace State
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [editOrgName, setEditOrgName] = useState("");
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);

  // Edit Project State
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  // Project deletion confirmation
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const userRole = getCurrentUserRole();
  const canEdit = userRole === "owner" || userRole === "admin";

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return orgProjects;
    const q = searchQuery.toLowerCase();
    return orgProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.slug && p.slug.toLowerCase().includes(q))
    );
  }, [orgProjects, searchQuery]);

  // Handle creating a new Workspace (Organization)
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsCreatingOrg(true);
    try {
      const org = await createOrgAction(newOrgName.trim());
      if (org) {
        addToast({
          type: "success",
          title: "Workspace Created",
          message: `Created workspace "${org.name}".`,
        });
        setNewOrgName("");
        setShowCreateOrgModal(false);
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Creation Failed",
        message: err.message || "Failed to create workspace.",
      });
    } finally {
      setIsCreatingOrg(false);
    }
  };

  // Handle updating Workspace name
  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !editOrgName.trim()) return;

    setIsUpdatingOrg(true);
    try {
      await updateOrgAction(currentOrg.id, { name: editOrgName.trim() });
      addToast({
        type: "success",
        title: "Workspace Renamed",
        message: `Workspace renamed to "${editOrgName.trim()}".`,
      });
      setShowEditOrgModal(false);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Could not update workspace name.",
      });
    } finally {
      setIsUpdatingOrg(false);
    }
  };

  // Handle opening a project
  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    setSidebarTab("tokens");
    addToast({
      type: "success",
      title: "Project Opened",
      message: `Active project: ${project.name}`,
    });
  };

  // Handle project settings navigation
  const handleOpenProjectSettings = (project: Project) => {
    setCurrentProject(project);
    setSidebarTab("project-settings");
    if (onOpenSettings) onOpenSettings();
  };

  // Handle editing a project details
  const handleOpenEditProject = (project: Project) => {
    setProjectToEdit(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || "");
  };

  const handleUpdateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !projectToEdit || !editProjectName.trim()) return;

    setIsUpdatingProject(true);
    try {
      await updateProjectAction(currentOrg.id, projectToEdit.id, {
        name: editProjectName.trim(),
        description: editProjectDescription.trim(),
      });
      addToast({
        type: "success",
        title: "Project Updated",
        message: `Updated project "${editProjectName.trim()}".`,
      });
      setProjectToEdit(null);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Could not update project.",
      });
    } finally {
      setIsUpdatingProject(false);
    }
  };

  // Handle project deletion
  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete || !currentOrg) return;
    setIsDeletingProject(true);

    try {
      await deleteProjectAction(currentOrg.id, projectToDelete.id);
      addToast({
        type: "info",
        title: "Project Deleted",
        message: `Removed project "${projectToDelete.name}".`,
      });
      setProjectToDelete(null);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: err.message || "Could not delete project.",
      });
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Format relative time helper
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) return `${diffDays}d ago`;
      if (diffHours > 0) return `${diffHours}h ago`;
      return "Just now";
    } catch {
      return "Recently";
    }
  };

  // Count active stats across current workspace
  const totalProjectsCount = orgProjects.length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto select-none">
      {/* Top Workspace Header & Actions Banner */}
      <div className="border-b border-border bg-card/60 backdrop-blur-md px-4 lg:px-6 2xl:px-8 py-5 lg:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 transition-colors">
        {/* Left: Active Workspace Brand & Switcher */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
            {currentOrg?.name?.[0]?.toUpperCase() || "W"}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                {currentOrg?.name || "My Workspace"}
              </h1>

              {/* Edit Workspace Pencil Button */}
              {canEdit && currentOrg && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditOrgName(currentOrg.name);
                    setShowEditOrgModal(true);
                  }}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Rename Workspace"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              )}

              {/* Workspace Selector Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title="Switch Workspace"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Workspaces
                  </div>
                  {userOrgs.map((org) => {
                    const isSelected = org.id === currentOrg?.id;
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => setCurrentOrg(org)}
                        className="flex items-center justify-between text-xs py-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                            {org.name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium truncate">{org.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => setShowCreateOrgModal(true)}
                    className="gap-2 text-xs text-primary font-semibold py-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Workspace</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Role Badge */}
              <Badge variant="outline" className="text-[10px] font-mono capitalize px-2 py-0.5">
                {userRole}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {currentOrg?.members?.length || 1} {currentOrg?.members?.length === 1 ? "member" : "members"}
              </span>
              <span>•</span>
              <span>{totalProjectsCount} {totalProjectsCount === 1 ? "project" : "projects"}</span>
            </div>
          </div>
        </div>

        {/* Right: Workspace Management & Project Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManageOrg(true)}
            className="gap-1.5 text-xs font-medium"
          >
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Manage Team</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCreateProject(true)}
            className="gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 p-4 lg:p-6 2xl:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Workspace Summary Stats & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground tracking-tight">Projects</h2>
            <Badge variant="secondary" className="font-mono text-xs">
              {filteredProjects.length}
            </Badge>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 bg-card border-border"
              />
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          /* Empty State for Projects */
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderGit2 className="w-7 h-7" />
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-bold text-foreground">
                {searchQuery ? "No matching projects found" : "No projects in this workspace yet"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {searchQuery
                  ? "Try searching for a different project name or clear the filter."
                  : "Create a project to manage tokens, configure Git sync providers, or pair with the Figma Companion Plugin."}
              </p>
            </div>

            {!searchQuery && (
              <Button
                onClick={() => setShowCreateProject(true)}
                size="sm"
                className="gap-2 text-xs font-semibold mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First Project</span>
              </Button>
            )}
          </div>
        ) : (
          /* Responsive Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredProjects.map((proj) => {
              const hasGit = Boolean(proj.gitConfig?.repo);
              const hasFigma = Boolean(
                proj.figmaVariables && Object.keys(proj.figmaVariables).length > 0
              );
              const rawTokensCount = proj.rawTokens
                ? Object.keys(proj.rawTokens).filter((k) => !k.startsWith("$")).length
                : 0;
              const themeGroupsCount = proj.themeGroups?.length || 0;
              const isActive = currentProject?.id === proj.id;

              return (
                <div
                  key={proj.id}
                  className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-card hover:shadow-md ${
                    isActive
                      ? "border-primary/60 ring-1 ring-primary/40 shadow-xs"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  {/* Top: Project Info & Menu */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                          {proj.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {proj.name}
                          </h3>
                          <span className="text-[10px] font-mono text-muted-foreground block truncate">
                            {proj.slug || proj.id}
                          </span>
                        </div>
                      </div>

                      {/* Project Options Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleOpenEditProject(proj)}
                            className="gap-2 text-xs cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Edit Project Details</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleOpenProjectSettings(proj)}
                            className="gap-2 text-xs cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Project Settings</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setProjectToDelete(proj)}
                            className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Project</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[32px]">
                      {proj.description || "Design tokens and multi-theme configuration."}
                    </p>

                    {/* Sync Providers Status Chips */}
                    <div className="space-y-1.5 pt-1">
                      {/* Git Provider Chip */}
                      <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-muted/40 border border-border/50">
                        <div className="flex items-center gap-1.5 truncate">
                          <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          {hasGit ? (
                            <span className="font-mono truncate text-foreground font-medium">
                              {proj.gitConfig?.repo}
                              <span className="text-muted-foreground">@{proj.gitConfig?.branch || "main"}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No Git Sync</span>
                          )}
                        </div>

                        {hasGit ? (
                          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Connected" />
                        ) : (
                          <button
                            onClick={() => handleOpenProjectSettings(proj)}
                            className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                          >
                            Connect
                          </button>
                        )}
                      </div>

                      {/* Figma Companion Sync Chip */}
                      <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-muted/40 border border-border/50">
                        <div className="flex items-center gap-1.5 truncate">
                          <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          {hasFigma ? (
                            <span className="font-mono truncate text-foreground font-medium">
                              Figma Synced
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No Figma Variables</span>
                          )}
                        </div>

                        {hasFigma ? (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatTimeAgo(proj.figmaUpdatedAt)}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setCurrentProject(proj);
                              setSidebarTab("integrations");
                            }}
                            className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                          >
                            Pair Plugin
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Stats & Open Button */}
                  <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                      <span>{rawTokensCount} {rawTokensCount === 1 ? "set" : "sets"}</span>
                      <span>•</span>
                      <span>{themeGroupsCount} {themeGroupsCount === 1 ? "theme" : "themes"}</span>
                    </div>

                    <Button
                      onClick={() => handleOpenProject(proj)}
                      size="sm"
                      className="gap-1 text-xs font-semibold h-7 px-3 shadow-xs cursor-pointer"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />

      {/* Manage Workspace / Members Modal */}
      <ManageOrgModal
        isOpen={showManageOrg}
        onClose={() => setShowManageOrg(false)}
      />

      {/* Edit Workspace (Organization) Modal */}
      <Dialog open={showEditOrgModal} onOpenChange={setShowEditOrgModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <DialogTitle>Rename Workspace</DialogTitle>
            </div>
            <DialogDescription>
              Update your workspace identity.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateWorkspace} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Workspace Name</Label>
              <Input
                placeholder="e.g. JustGo, Core Design, Studio"
                value={editOrgName}
                onChange={(e) => setEditOrgName(e.target.value)}
                autoFocus
                required
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditOrgModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdatingOrg || !editOrgName.trim()}
                className="gap-1.5"
              >
                <span>{isUpdatingOrg ? "Saving..." : "Save Changes"}</span>
                <Save className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      {projectToEdit && (
        <Dialog open={Boolean(projectToEdit)} onOpenChange={(open) => !open && setProjectToEdit(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <DialogTitle>Edit Project Details</DialogTitle>
              </div>
              <DialogDescription>
                Update project name and description.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateProjectSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project Name</Label>
                <Input
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  placeholder="e.g. Core Design System, Web Tokens"
                  autoFocus
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Input
                  value={editProjectDescription}
                  onChange={(e) => setEditProjectDescription(e.target.value)}
                  placeholder="e.g. Multi-brand cross-platform tokens"
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProjectToEdit(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdatingProject || !editProjectName.trim()}
                  className="gap-1.5"
                >
                  <span>{isUpdatingProject ? "Saving..." : "Save Project"}</span>
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Create New Workspace Modal */}
      <Dialog open={showCreateOrgModal} onOpenChange={setShowCreateOrgModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <DialogTitle>Create Workspace</DialogTitle>
            </div>
            <DialogDescription>
              Create a new workspace (e.g. JustGo, Design Team) to manage isolated projects.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Input
                placeholder="e.g. JustGo, Core Systems, Acme"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                autoFocus
                required
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateOrgModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingOrg || !newOrgName.trim()}
                className="gap-1.5"
              >
                <span>{isCreatingOrg ? "Creating..." : "Create Workspace"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <Dialog open={Boolean(projectToDelete)} onOpenChange={(open) => !open && setProjectToDelete(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <DialogTitle>Delete Project</DialogTitle>
              </div>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  &ldquo;{projectToDelete.name}&rdquo;
                </span>
                ? All associated tokens, sync credentials, and Figma variable mappings for this project will be removed.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setProjectToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeletingProject}
                onClick={handleConfirmDeleteProject}
              >
                {isDeletingProject ? "Deleting..." : "Delete Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};
