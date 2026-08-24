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
  X,
  Link2,
  Image as ImageIcon,
  Smile,
  Crown,
  AlertTriangle,
} from "lucide-react";
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
import { ManageOrgModal } from "@/components/ManageOrgModal";

// Preset icon choices
const ICON_PRESETS = [
  "🏢", "🚀", "⚡", "💎", "🎨", "🎯", "🔮", "📱",
  "💻", "🌐", "📦", "🔥", "🌈", "🛡️", "⚙️", "🦄",
  "✨", "🌿", "💡", "🪐"
];

// Preset color choices
const COLOR_PRESETS = [
  { name: "Indigo", value: "#6366f1", bgClass: "bg-indigo-500" },
  { name: "Violet", value: "#8b5cf6", bgClass: "bg-violet-500" },
  { name: "Pink", value: "#ec4899", bgClass: "bg-pink-500" },
  { name: "Rose", value: "#f43f5e", bgClass: "bg-rose-500" },
  { name: "Amber", value: "#f59e0b", bgClass: "bg-amber-500" },
  { name: "Emerald", value: "#10b981", bgClass: "bg-emerald-500" },
  { name: "Cyan", value: "#06b6d4", bgClass: "bg-cyan-500" },
  { name: "Blue", value: "#3b82f6", bgClass: "bg-blue-500" },
  { name: "Slate", value: "#64748b", bgClass: "bg-slate-500" },
];

export const WorkspacesProjectsView: React.FC = () => {
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
    deleteOrgAction,
    createProjectAction,
    updateProjectAction,
    deleteProjectAction,
    getCurrentUserRole,
    setSidebarTab,
    addToast,
  } = useTokenStore();

  const [activeTab, setActiveTab] = useState<"projects" | "workspaces">("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManageTeamModal, setShowManageTeamModal] = useState(false);

  // -------------------------------------------------------------
  // Workspace Form State (Create / Edit in-page)
  // -------------------------------------------------------------
  const [isWorkspaceFormOpen, setIsWorkspaceFormOpen] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgFormName, setOrgFormName] = useState("");
  const [orgFormIcon, setOrgFormIcon] = useState("🏢");
  const [orgFormColor, setOrgFormColor] = useState("#6366f1");
  const [orgFormLogoUrl, setOrgFormLogoUrl] = useState("");
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // -------------------------------------------------------------
  // Project Form State (Create / Edit in-page)
  // -------------------------------------------------------------
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectFormName, setProjectFormName] = useState("");
  const [projectFormDescription, setProjectFormDescription] = useState("");
  const [projectFormIcon, setProjectFormIcon] = useState("🎯");
  const [projectFormColor, setProjectFormColor] = useState("#6366f1");
  const [projectFormLogoUrl, setProjectFormLogoUrl] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Delete Confirmations
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const userRole = getCurrentUserRole();
  const canManage = userRole === "owner" || userRole === "admin";

  // Filter projects by search
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

  // Filter workspaces by search
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return userOrgs;
    const q = searchQuery.toLowerCase();
    return userOrgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.slug && o.slug.toLowerCase().includes(q))
    );
  }, [userOrgs, searchQuery]);

  // -------------------------------------------------------------
  // Workspace Handlers
  // -------------------------------------------------------------
  const handleOpenCreateWorkspace = () => {
    setEditingOrgId(null);
    setOrgFormName("");
    setOrgFormIcon("🏢");
    setOrgFormColor("#6366f1");
    setOrgFormLogoUrl("");
    setIsWorkspaceFormOpen(true);
  };

  const handleOpenEditWorkspace = (org: Organization) => {
    setEditingOrgId(org.id);
    setOrgFormName(org.name);
    setOrgFormIcon(org.icon || "🏢");
    setOrgFormColor(org.color || "#6366f1");
    setOrgFormLogoUrl(org.logoUrl || "");
    setIsWorkspaceFormOpen(true);
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgFormName.trim()) return;

    setIsSavingOrg(true);
    try {
      if (editingOrgId) {
        // Edit existing workspace
        await updateOrgAction(editingOrgId, {
          name: orgFormName.trim(),
          icon: orgFormIcon,
          color: orgFormColor,
          logoUrl: orgFormLogoUrl.trim(),
        });
        addToast({
          type: "success",
          title: "Workspace Updated",
          message: `Saved changes to "${orgFormName.trim()}".`,
        });
      } else {
        // Create new workspace
        const newOrg = await createOrgAction(
          orgFormName.trim(),
          orgFormIcon,
          orgFormColor,
          orgFormLogoUrl.trim()
        );
        if (newOrg) {
          addToast({
            type: "success",
            title: "Workspace Created",
            message: `Created workspace "${newOrg.name}".`,
          });
        }
      }
      setIsWorkspaceFormOpen(false);
      setEditingOrgId(null);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Action Failed",
        message: err.message || "Failed to save workspace.",
      });
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleDeleteWorkspace = async (orgId: string) => {
    try {
      await deleteOrgAction(orgId);
      addToast({
        type: "info",
        title: "Workspace Deleted",
        message: "The workspace and its projects have been removed.",
      });
      setDeletingOrgId(null);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: err.message || "Could not delete workspace.",
      });
    }
  };

  // -------------------------------------------------------------
  // Project Handlers
  // -------------------------------------------------------------
  const handleOpenCreateProject = () => {
    setEditingProjectId(null);
    setProjectFormName("");
    setProjectFormDescription("");
    setProjectFormIcon("🎯");
    setProjectFormColor("#6366f1");
    setProjectFormLogoUrl("");
    setIsProjectFormOpen(true);
  };

  const handleOpenEditProject = (proj: Project) => {
    setEditingProjectId(proj.id);
    setProjectFormName(proj.name);
    setProjectFormDescription(proj.description || "");
    setProjectFormIcon(proj.icon || "🎯");
    setProjectFormColor(proj.color || "#6366f1");
    setProjectFormLogoUrl(proj.logoUrl || "");
    setIsProjectFormOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !projectFormName.trim()) return;

    setIsSavingProject(true);
    try {
      if (editingProjectId) {
        // Edit project
        await updateProjectAction(currentOrg.id, editingProjectId, {
          name: projectFormName.trim(),
          description: projectFormDescription.trim(),
          icon: projectFormIcon,
          color: projectFormColor,
          logoUrl: projectFormLogoUrl.trim(),
        });
        addToast({
          type: "success",
          title: "Project Updated",
          message: `Saved changes to "${projectFormName.trim()}".`,
        });
      } else {
        // Create project
        const newProj = await createProjectAction(
          projectFormName.trim(),
          projectFormDescription.trim(),
          projectFormIcon,
          projectFormColor,
          projectFormLogoUrl.trim()
        );
        if (newProj) {
          addToast({
            type: "success",
            title: "Project Created",
            message: `Created project "${newProj.name}".`,
          });
        }
      }
      setIsProjectFormOpen(false);
      setEditingProjectId(null);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Action Failed",
        message: err.message || "Failed to save project.",
      });
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!currentOrg) return;
    try {
      await deleteProjectAction(currentOrg.id, projectId);
      addToast({
        type: "info",
        title: "Project Deleted",
        message: "Project removed successfully.",
      });
      setDeletingProjectId(null);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: err.message || "Could not delete project.",
      });
    }
  };

  const handleOpenProjectInStudio = (project: Project) => {
    setCurrentProject(project);
    setSidebarTab("tokens");
    addToast({
      type: "success",
      title: "Project Opened",
      message: `Active project: ${project.name}`,
    });
  };

  const handleConfigureSync = (project: Project) => {
    setCurrentProject(project);
    setSidebarTab("integrations");
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

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-y-auto select-none">
      {/* Top Banner Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Active Org Avatar with Custom Color / Icon */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-md flex-shrink-0"
            style={{ backgroundColor: currentOrg?.color || "#6366f1" }}
          >
            {currentOrg?.logoUrl ? (
              <img
                src={currentOrg.logoUrl}
                alt={currentOrg.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <span>{currentOrg?.icon || currentOrg?.name?.[0]?.toUpperCase() || "🏢"}</span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                {currentOrg?.name || "Workspace Hub"}
              </h1>

              {/* Fast Workspace Switcher */}
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
                    Switch Workspace
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
                          <div
                            className="w-5 h-5 rounded-md text-white flex items-center justify-center font-bold text-[10px]"
                            style={{ backgroundColor: org.color || "#6366f1" }}
                          >
                            {org.icon || org.name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium truncate">{org.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge variant="outline" className="text-[10px] font-mono capitalize px-2 py-0.5">
                {userRole}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {currentOrg?.members?.length || 1} members
              </span>
              <span>•</span>
              <span>{orgProjects.length} projects</span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManageTeamModal(true)}
            className="gap-1.5 text-xs font-medium"
          >
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Manage Team</span>
          </Button>

          {activeTab === "projects" ? (
            <Button
              size="sm"
              onClick={handleOpenCreateProject}
              className="gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleOpenCreateWorkspace}
              className="gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Workspace</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Navigation Tabs (In-Page) & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => {
                setActiveTab("projects");
                setIsWorkspaceFormOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "projects"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-primary" />
              <span>Projects ({orgProjects.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("workspaces");
                setIsProjectFormOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "workspaces"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-violet-500" />
              <span>All Workspaces ({userOrgs.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={activeTab === "projects" ? "Search projects..." : "Search workspaces..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 bg-card border-border"
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: PROJECTS SECTION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "projects" && (
          <div className="space-y-6">
            {/* In-Page Create / Edit Project Form */}
            {isProjectFormOpen && (
              <form
                onSubmit={handleSaveProject}
                className="p-6 rounded-2xl border-2 border-primary/40 bg-card/90 shadow-md space-y-5 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-base shadow-xs"
                      style={{ backgroundColor: projectFormColor }}
                    >
                      {projectFormLogoUrl ? (
                        <img src={projectFormLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span>{projectFormIcon}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">
                        {editingProjectId ? "Edit Project Details" : "Create New Project"}
                      </h2>
                      <p className="text-[11px] text-muted-foreground">
                        Under workspace: <span className="font-semibold text-foreground">{currentOrg?.name}</span>
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setIsProjectFormOpen(false);
                      setEditingProjectId(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Project Name *</Label>
                    <Input
                      value={projectFormName}
                      onChange={(e) => setProjectFormName(e.target.value)}
                      placeholder="e.g. Web Tokens, Mobile Palette, Brand Core"
                      required
                      autoFocus
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Project Description</Label>
                    <Input
                      value={projectFormDescription}
                      onChange={(e) => setProjectFormDescription(e.target.value)}
                      placeholder="e.g. Cross-platform tokens and theme variants"
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Icon / Emoji Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Smile className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Choose Project Icon / Emoji</span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/40 border border-border">
                      {ICON_PRESETS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setProjectFormIcon(emoji)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                            projectFormIcon === emoji
                              ? "bg-primary/20 ring-2 ring-primary scale-110"
                              : "hover:bg-muted"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Accent Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Choose Accent Color</span>
                    </Label>
                    <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-muted/40 border border-border items-center">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setProjectFormColor(c.value)}
                          className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${c.bgClass} ${
                            projectFormColor === c.value
                              ? "ring-3 ring-offset-2 ring-primary scale-110"
                              : "hover:scale-105"
                          }`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Optional Custom Logo URL */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Custom Logo URL (Optional)</span>
                    </Label>
                    <Input
                      value={projectFormLogoUrl}
                      onChange={(e) => setProjectFormLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsProjectFormOpen(false);
                      setEditingProjectId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSavingProject || !projectFormName.trim()}
                    className="gap-1.5 font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingProject ? "Saving..." : editingProjectId ? "Save Changes" : "Create Project"}</span>
                  </Button>
                </div>
              </form>
            )}

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <FolderGit2 className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-base font-bold text-foreground">
                    {searchQuery ? "No matching projects found" : "No projects in this workspace"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery
                      ? "Try searching for a different project name."
                      : "Create your first project to organize tokens and configure synchronization."}
                  </p>
                </div>
                {!searchQuery && (
                  <Button onClick={handleOpenCreateProject} size="sm" className="gap-1.5 mt-2">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Project</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  const projColor = proj.color || "#6366f1";

                  return (
                    <div
                      key={proj.id}
                      className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-card hover:shadow-md ${
                        isActive
                          ? "border-primary/60 ring-1 ring-primary/40 shadow-xs"
                          : "border-border hover:border-border/80"
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top: Custom Project Badge & Menu */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform"
                              style={{ backgroundColor: projColor }}
                            >
                              {proj.logoUrl ? (
                                <img src={proj.logoUrl} alt={proj.name} className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <span>{proj.icon || proj.name[0]?.toUpperCase() || "🎯"}</span>
                              )}
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

                          {/* Options Menu */}
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
                                onClick={() => handleConfigureSync(proj)}
                                className="gap-2 text-xs cursor-pointer"
                              >
                                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Configure Sync</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => setDeletingProjectId(proj.id)}
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

                        {/* Sync Status Chips */}
                        <div className="space-y-1.5 pt-1">
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
                                onClick={() => handleConfigureSync(proj)}
                                className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                              >
                                Connect
                              </button>
                            )}
                          </div>

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
                                onClick={() => handleConfigureSync(proj)}
                                className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                              >
                                Pair Plugin
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom: Stats & Open Studio Button */}
                      <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                          <span>{rawTokensCount} sets</span>
                          <span>•</span>
                          <span>{themeGroupsCount} themes</span>
                        </div>

                        <Button
                          onClick={() => handleOpenProjectInStudio(proj)}
                          size="sm"
                          className="gap-1 text-xs font-semibold h-7 px-3 shadow-xs cursor-pointer"
                        >
                          <span>Open Studio</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* In-Card Delete Confirmation */}
                      {deletingProjectId === proj.id && (
                        <div className="absolute inset-0 bg-background/95 rounded-2xl p-5 flex flex-col justify-between z-20 border border-destructive/50 animate-in fade-in">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Delete &ldquo;{proj.name}&rdquo;?</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              All tokens, variables, and sync credentials for this project will be permanently removed.
                            </p>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingProjectId(null)}
                              className="text-xs h-7"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProject(proj.id)}
                              className="text-xs h-7"
                            >
                              Confirm Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: ALL WORKSPACES SECTION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "workspaces" && (
          <div className="space-y-6">
            {/* In-Page Create / Edit Workspace Form */}
            {isWorkspaceFormOpen && (
              <form
                onSubmit={handleSaveWorkspace}
                className="p-6 rounded-2xl border-2 border-violet-500/40 bg-card/90 shadow-md space-y-5 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-base shadow-xs"
                      style={{ backgroundColor: orgFormColor }}
                    >
                      {orgFormLogoUrl ? (
                        <img src={orgFormLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span>{orgFormIcon}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">
                        {editingOrgId ? "Edit Workspace Identity" : "Create New Workspace"}
                      </h2>
                      <p className="text-[11px] text-muted-foreground">
                        Configure brand color, icon, and name for this organization.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setIsWorkspaceFormOpen(false);
                      setEditingOrgId(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold">Workspace Name *</Label>
                    <Input
                      value={orgFormName}
                      onChange={(e) => setOrgFormName(e.target.value)}
                      placeholder="e.g. JustGo, Core Systems, Acme Design"
                      required
                      autoFocus
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Icon / Emoji Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Smile className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Choose Workspace Icon</span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/40 border border-border">
                      {ICON_PRESETS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setOrgFormIcon(emoji)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                            orgFormIcon === emoji
                              ? "bg-violet-500/20 ring-2 ring-violet-500 scale-110"
                              : "hover:bg-muted"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Accent Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Choose Brand Color</span>
                    </Label>
                    <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-muted/40 border border-border items-center">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setOrgFormColor(c.value)}
                          className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${c.bgClass} ${
                            orgFormColor === c.value
                              ? "ring-3 ring-offset-2 ring-violet-500 scale-110"
                              : "hover:scale-105"
                          }`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Custom Logo URL */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Custom Organization Logo URL (Optional)</span>
                    </Label>
                    <Input
                      value={orgFormLogoUrl}
                      onChange={(e) => setOrgFormLogoUrl(e.target.value)}
                      placeholder="https://example.com/org-logo.png"
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsWorkspaceFormOpen(false);
                      setEditingOrgId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSavingOrg || !orgFormName.trim()}
                    className="gap-1.5 font-semibold bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingOrg ? "Saving..." : editingOrgId ? "Save Workspace" : "Create Workspace"}</span>
                  </Button>
                </div>
              </form>
            )}

            {/* Workspaces Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredWorkspaces.map((org) => {
                const isActive = currentOrg?.id === org.id;
                const isOwner = org.ownerUid === currentUser?.uid;
                const orgColor = org.color || "#6366f1";

                return (
                  <div
                    key={org.id}
                    className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-card hover:shadow-md ${
                      isActive
                        ? "border-violet-500/60 ring-1 ring-violet-500/40 shadow-xs"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Card Top: Brand Icon & Switcher */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: orgColor }}
                          >
                            {org.logoUrl ? (
                              <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <span>{org.icon || org.name[0]?.toUpperCase() || "🏢"}</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-sm text-foreground truncate group-hover:text-violet-500 transition-colors">
                                {org.name}
                              </h3>
                              {isActive && (
                                <Badge variant="secondary" className="text-[9px] py-0 px-1 font-semibold text-violet-600 dark:text-violet-400">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground block truncate">
                              {org.slug || org.id}
                            </span>
                          </div>
                        </div>

                        {/* Options Menu */}
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
                              onClick={() => handleOpenEditWorkspace(org)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>Edit Workspace</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setCurrentOrg(org);
                                setShowManageTeamModal(true);
                              }}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>Manage Members</span>
                            </DropdownMenuItem>

                            {isOwner && userOrgs.length > 1 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingOrgId(org.id)}
                                  className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Workspace</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Metadata Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                          <span className="text-[10px] text-muted-foreground block">Members</span>
                          <span className="font-bold text-foreground mt-0.5 block">
                            {org.members?.length || 1} team {org.members?.length === 1 ? "member" : "members"}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                          <span className="text-[10px] text-muted-foreground block">Your Role</span>
                          <span className="font-bold text-foreground mt-0.5 capitalize block flex items-center gap-1">
                            {isOwner && <Crown className="w-3 h-3 text-amber-500" />}
                            <span>{isOwner ? "Owner" : "Member"}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Created {new Date(org.createdAt).toLocaleDateString()}
                      </span>

                      {isActive ? (
                        <Badge variant="outline" className="text-xs text-violet-600 border-violet-500/40">
                          Current Workspace
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => {
                            setCurrentOrg(org);
                            addToast({
                              type: "success",
                              title: "Workspace Switched",
                              message: `Active workspace: ${org.name}`,
                            });
                          }}
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs h-7 px-3 cursor-pointer hover:border-violet-500 hover:text-violet-600"
                        >
                          <span>Switch To</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {/* In-Card Delete Confirmation */}
                    {deletingOrgId === org.id && (
                      <div className="absolute inset-0 bg-background/95 rounded-2xl p-5 flex flex-col justify-between z-20 border border-destructive/50 animate-in fade-in">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Delete &ldquo;{org.name}&rdquo;?</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            This will permanently delete the workspace and all projects contained within it.
                          </p>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingOrgId(null)}
                            className="text-xs h-7"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteWorkspace(org.id)}
                            className="text-xs h-7"
                          >
                            Confirm Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Team Management Modal */}
      <ManageOrgModal
        isOpen={showManageTeamModal}
        onClose={() => setShowManageTeamModal(false)}
      />
    </div>
  );
};
