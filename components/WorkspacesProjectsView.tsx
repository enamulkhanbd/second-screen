"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Project, Organization } from "@/types/tenant";
import {
  Building2,
  FolderGit2,
  Plus,
  Sparkles,
  ArrowRight,
  Settings,
  Users,
  CheckCircle2,
  ExternalLink,
  Trash2,
  GitBranch,
  MoreVertical,
  Share2,
  Clock,
  Shield,
  Sliders,
  Check,
  RefreshCw,
  Save,
  X,
  Link2,
  Image as ImageIcon,
  Smile,
  Crown,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Upload,
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
import { ColorPickerWithShades } from "@/components/ColorPickerWithShades";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";


// Preset color choices
const COLOR_PRESETS = [
  { name: "Neutral", value: "#171717", bgClass: "bg-neutral-900" },
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

export interface WorkspacesProjectsViewProps {
  onSelectProject: (project: Project) => void;
  onOpenProjectSettings?: (project: Project, tab?: "details" | "sync") => void;
}

export const WorkspacesProjectsView: React.FC<WorkspacesProjectsViewProps> = ({
  onSelectProject,
  onOpenProjectSettings,
}) => {
  const {
    currentUser,
    userOrgs,
    currentOrg,
    orgProjects,
    isLoadingProjects,
    currentProject,
    setCurrentOrg,
    setCurrentProject,
    setSyncTargetProject,
    setProjectSettingsTab,
    createOrgAction,
    updateOrgAction,
    deleteOrgAction,
    createProjectAction,
    updateProjectAction,
    deleteProjectAction,
    getCurrentUserRole,
    sidebarTab,
    setSidebarTab,
    addToast,
  } = useTokenStore();

  const [activeTab, setActiveTab] = useState<"projects" | "workspaces">(
    sidebarTab === "workspaces" ? "workspaces" : "projects"
  );
  const [projectStatusFilter, setProjectStatusFilter] = useState<"active" | "archived">("active");
  const [projectLayoutMode, setProjectLayoutMode] = useState<"grid" | "list">("list");
  const [workspaceLayoutMode, setWorkspaceLayoutMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManageTeamModal, setShowManageTeamModal] = useState(false);

  // Sync tab with sidebar selection
  useEffect(() => {
    if (sidebarTab === "workspaces") {
      setActiveTab("workspaces");
    } else if (sidebarTab === "projects") {
      setActiveTab("projects");
    }
  }, [sidebarTab]);

  // -------------------------------------------------------------
  // Workspace Form State (Create / Edit in-page)
  // -------------------------------------------------------------
  const [isWorkspaceFormOpen, setIsWorkspaceFormOpen] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgFormName, setOrgFormName] = useState("");
  const [orgFormIcon, setOrgFormIcon] = useState("🏢");
  const [orgFormColor, setOrgFormColor] = useState("#171717");
  const [orgFormLogoUrl, setOrgFormLogoUrl] = useState("");
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // -------------------------------------------------------------
  // Project Form State (Create / Edit in-page)
  // -------------------------------------------------------------
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectFormName, setProjectFormName] = useState("");
  const [projectFormDescription, setProjectFormDescription] = useState("");
  const [projectFormLogoUrl, setProjectFormLogoUrl] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const orgFileInputRef = React.useRef<HTMLInputElement>(null);

  const isCustomOrgColor = useMemo(() => {
    if (!currentOrg?.color) return false;
    const trimmed = currentOrg.color.trim().toLowerCase();
    return !["#171717", "#0a0a0a", "#2e9401", "#2d9401", "#6366f1", "neutral"].includes(trimmed);
  }, [currentOrg?.color]);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast({
        type: "error",
        title: "File Too Large",
        message: "Please select an image smaller than 2MB.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setProjectFormLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleOrgLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast({
        type: "error",
        title: "File Too Large",
        message: "Please select an image smaller than 2MB.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setOrgFormLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Delete Confirmations
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const projectPendingDelete = orgProjects.find((project) => project.id === deletingProjectId) || null;

  // Duplicate name validation
  const isOrgNameDuplicate = useMemo(() => {
    const trimmed = orgFormName.trim().toLowerCase();
    if (!trimmed) return false;
    return userOrgs.some(
      (org) =>
        org.id !== editingOrgId &&
        org.name.trim().toLowerCase() === trimmed
    );
  }, [orgFormName, userOrgs, editingOrgId]);

  const isProjectNameDuplicate = useMemo(() => {
    const trimmed = projectFormName.trim().toLowerCase();
    if (!trimmed) return false;
    return orgProjects.some(
      (proj) =>
        proj.id !== editingProjectId &&
        proj.name.trim().toLowerCase() === trimmed
    );
  }, [projectFormName, orgProjects, editingProjectId]);

  const userRole = getCurrentUserRole();
  const canManage = userRole === "owner" || userRole === "admin";

  // Project status counts
  const activeProjectsCount = useMemo(() => {
    return orgProjects.filter((p) => !p.isArchived).length;
  }, [orgProjects]);

  const archivedProjectsCount = useMemo(() => {
    return orgProjects.filter((p) => p.isArchived === true).length;
  }, [orgProjects]);

  // Filter projects by search & active/archived
  const filteredProjects = useMemo(() => {
    let list = orgProjects;
    if (projectStatusFilter === "archived") {
      list = list.filter((p) => p.isArchived === true);
    } else {
      list = list.filter((p) => !p.isArchived);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.slug && p.slug.toLowerCase().includes(q))
    );
  }, [orgProjects, projectStatusFilter, searchQuery]);

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
    setOrgFormColor("#171717");
    setOrgFormLogoUrl("");
    setIsWorkspaceFormOpen(true);
  };

  const handleOpenEditWorkspace = (org: Organization) => {
    setCurrentOrg(org);
    setCurrentProject(null);
    setSidebarTab("org-settings");
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgFormName.trim() || isOrgNameDuplicate) return;

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
    setProjectFormLogoUrl("");
    setIsProjectFormOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !projectFormName.trim() || isProjectNameDuplicate) return;

    setIsSavingProject(true);
    try {
      if (editingProjectId) {
        // Edit project
        await updateProjectAction(currentOrg.id, editingProjectId, {
          name: projectFormName.trim(),
          description: projectFormDescription.trim(),
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
          undefined,
          undefined,
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
    setIsDeletingProject(true);
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
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleOpenProjectInStudio = (project: Project) => {
    onSelectProject(project);
    addToast({
      type: "success",
      title: "Project Opened",
      message: `Active project: ${project.name}`,
    });
  };

  const handleOpenProjectSettings = (project: Project, tab: "details" | "sync" = "details") => {
    setSyncTargetProject(project);
    setCurrentProject(project);
    setProjectSettingsTab(tab);
    setSidebarTab("project-settings");
    onOpenProjectSettings?.(project, tab);
  };

  const handleConfigureSync = (project: Project) => handleOpenProjectSettings(project, "sync");

  const handleToggleArchiveProject = async (project: Project) => {
    if (!currentOrg) return;
    try {
      const updated = !project.isArchived;
      await updateProjectAction(currentOrg.id, project.id, {
        isArchived: updated,
      });
      addToast({
        type: "success",
        title: updated ? "Project Archived" : "Project Restored",
        message: `"${project.name}" has been ${updated ? "moved to archived" : "restored to active"}.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Action Failed",
        message: err.message || "Could not update project status.",
      });
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

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-y-auto select-none">
      {/* Top Workspace Header - Spans full width from far left to far right */}
      <div className="w-full px-6 md:px-8 py-5 border-b border-border/60 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Active Org Avatar */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-2xs shrink-0 overflow-hidden"
              style={{ backgroundColor: currentOrg?.color || "#171717" }}
            >
              {currentOrg?.logoUrl ? (
                <img
                  src={currentOrg.logoUrl}
                  alt={currentOrg.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <span>{currentOrg?.icon || currentOrg?.name?.[0]?.toUpperCase() || "🏢"}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Projects &amp; Workspaces
                </h1>
                <Badge variant="outline" className="text-[10px] font-mono capitalize px-2 py-0.5 text-muted-foreground border-border/80">
                  {currentOrg?.name || "Workspace Hub"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Manage design token projects, repositories, and workspace releases.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-2.5 py-1 gap-1.5 font-medium">
              <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{orgProjects.length} {orgProjects.length === 1 ? "project" : "projects"}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Container - Sized to 960px */}
      <div className="max-w-[960px] w-full mx-auto p-6 md:p-8 space-y-6 flex-1">
        {/* Navigation Tabs (In-Page) */}
        <div className="flex items-center justify-between border-b border-border pb-4">
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
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: PROJECTS SECTION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "projects" && (
          <div className="space-y-6">
            {/* Modal for Create / Edit Project */}
            <Dialog
              open={isProjectFormOpen}
              onOpenChange={(open) => {
                setIsProjectFormOpen(open);
                if (!open) setEditingProjectId(null);
              }}
            >
              <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
                <form onSubmit={handleSaveProject} className="flex flex-col">
                  <DialogHeader className="px-6 py-5 border-b border-border/80 bg-card/40 flex-shrink-0">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shadow-xs shrink-0 overflow-hidden border border-border/80 ${
                          isCustomOrgColor ? "text-white" : "bg-primary text-primary-foreground"
                        }`}
                        style={isCustomOrgColor ? { backgroundColor: currentOrg?.color } : undefined}
                      >
                        {projectFormLogoUrl ? (
                          <img
                            src={projectFormLogoUrl}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                            onError={() => setProjectFormLogoUrl("")}
                          />
                        ) : (
                          <span>{projectFormName.trim() ? projectFormName.trim()[0].toUpperCase() : "P"}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <DialogTitle className="text-base font-bold text-foreground">
                          {editingProjectId ? "Edit Project" : "New Project"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                          Workspace: <span className="font-semibold text-foreground">{currentOrg?.name}</span>
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="p-6 space-y-4">
                    {/* Project Name * */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        Project Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={projectFormName}
                        onChange={(e) => setProjectFormName(e.target.value)}
                        placeholder="e.g. Web, Mobile App, Core Tokens"
                        required
                        autoFocus
                        className="h-9 text-xs"
                      />
                      {isProjectNameDuplicate && (
                        <p className="text-[11px] text-destructive font-medium">
                          A project with this name already exists in {currentOrg?.name}.
                        </p>
                      )}
                    </div>

                    {/* Description (Optional) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        Description <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <textarea
                        rows={3}
                        value={projectFormDescription}
                        onChange={(e) => setProjectFormDescription(e.target.value)}
                        placeholder="Short summary of this project..."
                        className="w-full text-xs p-3 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none transition-colors"
                      />
                    </div>

                    {/* Custom Logo URL or Upload Logo (Optional) */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Custom Logo URL or Upload Logo <span className="text-muted-foreground font-normal">(Optional)</span></span>
                        </Label>
                        {projectFormLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setProjectFormLogoUrl("")}
                            className="text-[11px] text-destructive hover:underline cursor-pointer font-medium"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          value={projectFormLogoUrl}
                          onChange={(e) => setProjectFormLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="h-9 text-xs font-mono flex-1"
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                          onChange={handleLogoFileUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-9 px-3 text-xs gap-1.5 shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Upload</span>
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Provide a logo URL or upload from your device. Colors inherit from the workspace branding.
                      </p>
                    </div>
                  </div>

                  <DialogFooter className="px-6 py-3.5 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
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
                      disabled={isSavingProject || !projectFormName.trim() || isProjectNameDuplicate}
                      className="gap-1.5 font-semibold shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingProject ? "Saving..." : editingProjectId ? "Save Changes" : "Create Project"}</span>
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Filter Toolbar: Active / Archived Tabs & Grid/List View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/40 p-2.5 rounded-xl border border-border">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setProjectStatusFilter("active")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    projectStatusFilter === "active"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <span>Active</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      projectStatusFilter === "active"
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {activeProjectsCount}
                  </span>
                </button>

                <button
                  onClick={() => setProjectStatusFilter("archived")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    projectStatusFilter === "archived"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archived</span>
                  {archivedProjectsCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        projectStatusFilter === "archived"
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {archivedProjectsCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleOpenCreateProject}
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Project</span>
                </Button>
              </div>
            </div>

            {/* Projects Container (Loading Skeletons vs Empty State vs List vs Grid) */}
            {isLoadingProjects && filteredProjects.length === 0 ? (
              projectLayoutMode === "list" ? (
                <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border shadow-2xs">
                  <div className="grid grid-cols-12 items-center px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                    <div className="col-span-5 sm:col-span-4">Project</div>
                    <div className="col-span-3 sm:col-span-3">Content</div>
                    <div className="hidden sm:block sm:col-span-3">Sync &amp; Status</div>
                    <div className="col-span-4 sm:col-span-2 text-right">Actions</div>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="grid grid-cols-12 items-center px-5 py-4 gap-3 animate-pulse">
                      <div className="col-span-5 sm:col-span-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-muted/80 shrink-0" />
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="h-3.5 w-28 bg-muted/80 rounded" />
                          <div className="h-2.5 w-44 bg-muted/60 rounded" />
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-3 flex items-center gap-2">
                        <div className="h-4 w-16 bg-muted/60 rounded-full" />
                        <div className="h-4 w-12 bg-muted/60 rounded-full" />
                      </div>
                      <div className="hidden sm:flex sm:col-span-3 items-center gap-2">
                        <div className="h-3 w-20 bg-muted/60 rounded" />
                      </div>
                      <div className="col-span-4 sm:col-span-2 flex justify-end gap-1.5">
                        <div className="h-7 w-16 bg-muted/70 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-border rounded-2xl p-5 bg-card space-y-4 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-xl bg-muted/80" />
                        <div className="h-5 w-16 bg-muted/60 rounded-full" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted/80 rounded" />
                        <div className="h-3 w-48 bg-muted/60 rounded" />
                      </div>
                      <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                        <div className="h-3 w-24 bg-muted/50 rounded" />
                        <div className="h-7 w-16 bg-muted/70 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  {projectStatusFilter === "archived" ? (
                    <Archive className="w-7 h-7" />
                  ) : (
                    <FolderGit2 className="w-7 h-7" />
                  )}
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-base font-bold text-foreground">
                    {searchQuery
                      ? "No matching projects found"
                      : projectStatusFilter === "archived"
                      ? "No archived projects"
                      : "No active projects in this workspace"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery
                      ? "Try searching for a different project name or slug."
                      : projectStatusFilter === "archived"
                      ? "Projects you archive will appear here."
                      : "Create your first project to organize tokens and configure synchronization."}
                  </p>
                </div>
                {!searchQuery && projectStatusFilter === "active" && (
                  <Button onClick={handleOpenCreateProject} size="sm" className="gap-1.5 mt-2">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Project</span>
                  </Button>
                )}
              </div>
            ) : projectLayoutMode === "list" ? (
              /* ======================================================= */
              /* LIST / ROW VIEW (Matches Video Style)                   */
              /* ======================================================= */
              <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border shadow-2xs">
                {/* List Header */}
                <div className="grid grid-cols-12 items-center px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  <div className="col-span-8 sm:col-span-7">Project</div>
                  <div className="hidden sm:block sm:col-span-3">Sync &amp; Status</div>
                  <div className="col-span-4 sm:col-span-2 text-right">Actions</div>
                </div>

                {/* List Rows */}
                {filteredProjects.map((proj) => {
                  const hasGit = Boolean(proj.gitConfig?.repo);
                  const isActive = currentProject?.id === proj.id;

                  return (
                    <div
                      key={proj.id}
                      className={`relative grid grid-cols-12 items-center px-5 py-3.5 hover:bg-muted/40 transition-colors gap-3 group ${
                        isActive ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Col 1: Project Identity */}
                      <div className="col-span-8 sm:col-span-7 flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden ${
                            isCustomOrgColor ? "text-white" : "bg-primary text-primary-foreground"
                          }`}
                          style={isCustomOrgColor ? { backgroundColor: currentOrg?.color } : undefined}
                        >
                          {proj.logoUrl ? (
                            <img
                              src={proj.logoUrl}
                              alt={proj.name || "Project Logo"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{proj.name?.[0]?.toUpperCase() || "P"}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3
                              onClick={() => handleOpenProjectInStudio(proj)}
                              className="font-bold text-xs text-foreground truncate hover:text-primary transition-colors cursor-pointer"
                            >
                              {proj.name || "Untitled Project"}
                            </h3>
                            {isActive && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-primary border-primary/40">
                                Active
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground block truncate">
                            {proj.slug || proj.id}
                          </span>
                        </div>
                      </div>

                      {/* Col 3: Sync & Status */}
                      <div className="hidden sm:flex sm:col-span-3 items-center gap-2 flex-wrap">
                        {hasGit ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="truncate max-w-[120px]">{proj.gitConfig?.repo}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">
                            No Git Sync
                          </span>
                        )}

                      </div>

                      {/* Col 4: Actions */}
                      <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-1.5">
                        <Button
                          onClick={() => handleOpenProjectInStudio(proj)}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2.5 text-xs font-semibold gap-1 hover:bg-primary/10 hover:text-primary cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleOpenProjectSettings(proj)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>Project Settings</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleToggleArchiveProject(proj)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              {proj.isArchived ? (
                                <>
                                  <ArchiveRestore className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Restore to Active</span>
                                </>
                              ) : (
                                <>
                                  <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Archive Project</span>
                                </>
                              )}
                            </DropdownMenuItem>

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

                    </div>
                  );
                })}
              </div>
            ) : (
              /* ======================================================= */
              /* GRID / CARD VIEW                                        */
              /* ======================================================= */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProjects.map((proj) => {
                  const hasGit = Boolean(proj.gitConfig?.repo);
                  const isActive = currentProject?.id === proj.id;
                  return (
                    <div
                      key={proj.id}
                      className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-card hover:shadow-md ${
                        isActive
                          ? "border-primary/60 ring-1 ring-primary/40 shadow-xs"
                          : "border-border"
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top: Custom Project Badge & Menu */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden ${
                                isCustomOrgColor ? "text-white" : "bg-primary text-primary-foreground"
                              }`}
                              style={isCustomOrgColor ? { backgroundColor: currentOrg?.color } : undefined}
                            >
                              {proj.logoUrl ? (
                                <img src={proj.logoUrl} alt={proj.name || "Project Logo"} className="w-full h-full object-cover" />
                              ) : (
                                <span>{proj.name?.[0]?.toUpperCase() || "P"}</span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {proj.name || "Untitled Project"}
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
                                onClick={() => handleOpenProjectSettings(proj)}
                                className="gap-2 text-xs cursor-pointer"
                              >
                                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Project Settings</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleToggleArchiveProject(proj)}
                                className="gap-2 text-xs cursor-pointer"
                              >
                                {proj.isArchived ? (
                                  <>
                                    <ArchiveRestore className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Restore to Active</span>
                                  </>
                                ) : (
                                  <>
                                    <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Archive Project</span>
                                  </>
                                )}
                              </DropdownMenuItem>

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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfigureSync(proj);
                                }}
                                className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                              >
                                Connect
                              </button>
                            )}
                          </div>

                        </div>
                      </div>

                      {/* Card Bottom: Stats & Open Studio Button */}
                      <div className="pt-4 border-t border-border mt-4 flex items-center justify-end">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProjectInStudio(proj);
                          }}
                          size="sm"
                          className="gap-1 text-xs font-semibold h-7 px-3 shadow-xs cursor-pointer"
                        >
                          <span>Open Studio</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>

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
            {/* Right Drawer for Create / Edit Workspace */}
            <Sheet
              open={isWorkspaceFormOpen}
              onOpenChange={(open) => {
                setIsWorkspaceFormOpen(open);
                if (!open) setEditingOrgId(null);
              }}
            >
              <SheetContent side="right" className="flex flex-col h-full bg-background border-l border-border sm:max-w-md md:max-w-lg p-0">
                <form onSubmit={handleSaveWorkspace} className="flex flex-col h-full overflow-hidden">
                  <SheetHeader className="px-6 py-5 border-b border-border/80 bg-card/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-xs flex-shrink-0 transition-colors overflow-hidden"
                        style={{ backgroundColor: orgFormColor }}
                      >
                        {orgFormLogoUrl ? (
                          <img src={orgFormLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span>{orgFormName?.trim() ? orgFormName.trim()[0].toUpperCase() : "W"}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <SheetTitle className="text-base font-bold text-foreground">
                          {editingOrgId ? "Edit Workspace" : "New Workspace"}
                        </SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground truncate">
                          Configure workspace brand and identity
                        </SheetDescription>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Basic Info */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">Workspace Name *</Label>
                      <Input
                        value={orgFormName}
                        onChange={(e) => setOrgFormName(e.target.value)}
                        placeholder="e.g. JustGo, Core Systems, Acme Design"
                        required
                        autoFocus
                        className="h-9 text-xs"
                      />
                      {isOrgNameDuplicate && (
                        <p className="text-[11px] text-destructive font-medium">
                          An organization with this name already exists.
                        </p>
                      )}
                    </div>


                    {/* Color Accent Selection */}
                    <div className="pt-1 border-t border-border/60">
                      <ColorPickerWithShades
                        value={orgFormColor}
                        onChange={setOrgFormColor}
                      />
                    </div>

                    {/* Custom Logo URL & Upload */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Workspace Logo <span className="text-muted-foreground font-normal">(Optional)</span></span>
                        </Label>
                        {orgFormLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setOrgFormLogoUrl("")}
                            className="text-[11px] text-destructive hover:underline cursor-pointer font-medium"
                          >
                            Remove logo
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          value={orgFormLogoUrl}
                          onChange={(e) => setOrgFormLogoUrl(e.target.value)}
                          placeholder="Paste image URL (https://...) or upload"
                          className="h-9 text-xs font-mono flex-1"
                        />
                        <input
                          ref={orgFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                          onChange={handleOrgLogoFileUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => orgFileInputRef.current?.click()}
                          className="h-9 px-3 text-xs gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Upload</span>
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Square SVG, PNG, or JPG recommended (max 2MB).
                      </p>
                    </div>
                  </div>

                  <SheetFooter className="px-6 py-3.5 border-t border-border/80 bg-muted/20 flex-shrink-0 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
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
                      disabled={isSavingOrg || !orgFormName.trim() || isOrgNameDuplicate}
                      className="gap-1.5 font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingOrg ? "Saving..." : editingOrgId ? "Save Changes" : "Create Workspace"}</span>
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>

            {/* Filter Toolbar: Workspaces Count & Grid/List View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/40 p-2.5 rounded-xl border border-border">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-2xs">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Workspaces</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-primary-foreground/20 text-primary-foreground">
                    {filteredWorkspaces.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleOpenCreateWorkspace}
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </Button>
              </div>
            </div>

            {/* Workspaces Container: Empty State vs List vs Grid */}
            {filteredWorkspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-base font-bold text-foreground">
                    {searchQuery ? "No matching workspaces found" : "No workspaces"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery
                      ? "Try searching for a different workspace name or slug."
                      : "Create your first workspace to start collaborating on design tokens."}
                  </p>
                </div>
                {!searchQuery && (
                  <Button onClick={handleOpenCreateWorkspace} size="sm" className="gap-1.5 mt-2">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Workspace</span>
                  </Button>
                )}
              </div>
            ) : workspaceLayoutMode === "list" ? (
              /* ======================================================= */
              /* WORKSPACES LIST / ROW VIEW                               */
              /* ======================================================= */
              <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border shadow-2xs">
                {/* List Header */}
                <div className="grid grid-cols-12 items-center px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  <div className="col-span-5 sm:col-span-4">Workspace</div>
                  <div className="col-span-3 sm:col-span-3">Members</div>
                  <div className="hidden sm:block sm:col-span-3">Role &amp; Details</div>
                  <div className="col-span-4 sm:col-span-2 text-right">Actions</div>
                </div>

                {/* List Rows */}
                {filteredWorkspaces.map((org) => {
                  const isActive = currentOrg?.id === org.id;
                  const isOwner = org.ownerUid === currentUser?.uid;
                  const orgColor = org.color || "#171717";
                  const membersCount = org.members?.length || 1;

                  return (
                    <div
                      key={org.id}
                      className={`relative grid grid-cols-12 items-center px-5 py-3.5 hover:bg-muted/40 transition-colors gap-3 group ${
                        isActive ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Col 1: Workspace Identity */}
                      <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden text-white"
                          style={{ backgroundColor: orgColor }}
                        >
                          {org.logoUrl ? (
                            <img
                              src={org.logoUrl}
                              alt={org.name || "Workspace Logo"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{org.icon || org.name?.[0]?.toUpperCase() || "🏢"}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3
                              onClick={() => {
                                setCurrentOrg(org);
                                if (!isActive) {
                                  addToast({
                                    type: "success",
                                    title: "Workspace Switched",
                                    message: `Active workspace: ${org.name}`,
                                  });
                                }
                              }}
                              className="font-bold text-xs text-foreground truncate hover:text-primary transition-colors cursor-pointer"
                            >
                              {org.name || "Untitled Workspace"}
                            </h3>
                            {isActive && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-primary border-primary/40">
                                Active
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground block truncate">
                            {org.slug || org.id}
                          </span>
                        </div>
                      </div>

                      {/* Col 2: Members Count */}
                      <div className="col-span-3 sm:col-span-3 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono text-foreground">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span>{membersCount} {membersCount === 1 ? "member" : "members"}</span>
                        </span>
                      </div>

                      {/* Col 3: Role & Details */}
                      <div className="hidden sm:flex sm:col-span-3 items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono ${
                            isOwner
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isOwner && <Crown className="w-3 h-3 text-amber-500" />}
                          <span>{isOwner ? "Owner" : "Member"}</span>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Created {new Date(org.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Col 4: Actions */}
                      <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-1.5">
                        {isActive ? (
                          <Button
                            onClick={() => handleOpenEditWorkspace(org)}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2.5 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Settings className="w-3 h-3" />
                            <span>Settings</span>
                          </Button>
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
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2.5 text-xs font-semibold gap-1 hover:bg-primary/10 hover:text-primary cursor-pointer"
                          >
                            <span>Switch</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleOpenEditWorkspace(org)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>Workspace Settings</span>
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

                      {/* In-Row Delete Confirmation */}
                      {deletingOrgId === org.id && (
                        <div className="absolute inset-0 bg-background/95 rounded-xl px-5 py-2 flex items-center justify-between z-20 border border-destructive/50 animate-in fade-in">
                          <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Delete &ldquo;{org.name}&rdquo;?</span>
                          </div>
                          <div className="flex items-center gap-2">
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
                              Confirm
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ======================================================= */
              /* WORKSPACES GRID / CARD VIEW                             */
              /* ======================================================= */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWorkspaces.map((org) => {
                  const isActive = currentOrg?.id === org.id;
                  const isOwner = org.ownerUid === currentUser?.uid;
                  const orgColor = org.color || "#171717";

                  return (
                    <div
                      key={org.id}
                      className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-card hover:shadow-md ${
                        isActive
                          ? "border-primary/60 ring-1 ring-primary/40 shadow-xs"
                          : "border-border"
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Card Top: Brand Icon & Switcher */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden"
                              style={{ backgroundColor: orgColor }}
                            >
                              {org.logoUrl ? (
                                <img src={org.logoUrl} alt={org.name || "Organization Logo"} className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <span>{org.icon || org.name?.[0]?.toUpperCase() || "🏢"}</span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-sm text-foreground truncate group-hover:text-violet-500 transition-colors">
                                  {org.name || "Untitled Organization"}
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
                                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Workspace Settings</span>
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
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs text-violet-600 border-violet-500/40">
                              Current Workspace
                            </Badge>
                            <Button
                              onClick={() => handleOpenEditWorkspace(org)}
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs h-7 px-2 cursor-pointer text-muted-foreground hover:text-foreground"
                              title="Open Workspace Settings"
                            >
                              <Settings className="w-3 h-3" />
                              <span>Settings</span>
                            </Button>
                          </div>
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
                            className="gap-1 text-xs h-7 px-3 cursor-pointer hover:text-violet-600"
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
            )}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(deletingProjectId)}
        onOpenChange={(open) => {
          if (!open && !isDeletingProject) setDeletingProjectId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle>Delete Project</DialogTitle>
            </div>
            <DialogDescription>
              Permanently delete <strong className="text-foreground">{projectPendingDelete?.name}</strong> and its tokens, variables, and sync settings? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingProjectId(null)}
              disabled={isDeletingProject}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (deletingProjectId) void handleDeleteProject(deletingProjectId);
              }}
              disabled={!projectPendingDelete || isDeletingProject}
            >
              {isDeletingProject ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Management Modal */}
      <ManageOrgModal
        isOpen={showManageTeamModal}
        onClose={() => setShowManageTeamModal(false)}
      />
    </div>
  );
};
