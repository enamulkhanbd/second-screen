"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Home,
  Sparkles,
  Layers,
  Palette,
  FileText,
  Image as ImageIcon,
  Download,
  Package,
  Clock,
  GitBranch,
  Rocket,
  Settings,
  Users,
  Building2,
  FolderGit2,
  Link2,
  Code2,
  Variable,
  ChevronsUpDown,
  Check,
  Crown,
  LogOut,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Lightbulb,
  MessageSquare,
  BookOpen,
  AlertTriangle,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { ROLE_DEFINITIONS } from "@/types/tenant";
import { LATEST_VERSION } from "@/data/systemChangelog";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getValidTokenSetNames } from "@/utils/themeHelpers";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onOpenSettings?: () => void;
  mode?: "docked" | "drawer";
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, mode = "docked", className }) => {
  const {
    currentUser,
    setCurrentUser,
    userOrgs,
    currentOrg,
    setCurrentOrg,
    orgProjects,
    currentProject,
    setCurrentProject,
    themeGroups,
    rawTokens,
    figmaResolvedVariables,
    sidebarTab,
    setSidebarTab,
    setMembersSubTab,
    credentials,
    releases,
    documentation,
    addToast,
    getCurrentUserRole,
    canUserEdit,
    branches,
    activeBranch,
    createOrgAction,
    themeMode,
    setThemeMode,
  } = useTokenStore();

  const [showCreateProj, setShowCreateProj] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCollapsedState, setIsCollapsed] = useState(false);
  const isCollapsed = mode === "docked" && isCollapsedState;

  const userRole = getCurrentUserRole();
  const roleDef = ROLE_DEFINITIONS[userRole];

  // Extract all valid set names based on $metadata.json ($themes.json or valid token sets)
  const allSetNames = useMemo(() => {
    return getValidTokenSetNames(rawTokens);
  }, [rawTokens]);

  const isGitConfigured = Boolean(
    credentials.provider && credentials.owner && credentials.repo
  );

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      const org = await createOrgAction(newOrgName.trim());
      if (org) {
        addToast({
          type: "success",
          title: "Organization Created",
          message: `Created organization "${org.name}".`,
        });
        setNewOrgName("");
        setShowCreateOrg(false);
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Failed to Create Organization",
        message: err.message || "An error occurred.",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch { }
    setCurrentUser(null);
    addToast({
      type: "info",
      title: "Signed Out",
      message: "You have been safely signed out.",
    });
  };

  return (
    <aside
      className={cn(`flex-shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-full select-none text-xs font-sans transition-all duration-200 ${
        mode === "drawer" ? "w-full" : isCollapsed ? "w-16" : "w-[18rem]"
      }`, className)}
    >
      {/* 1. Header: Workspace & Project Selector + Collapse/Expand Toggle */}
      <div
        className={cn(
          "border-b border-sidebar-border flex flex-shrink-0 transition-all",
          isCollapsed
            ? "py-3 px-2 flex-col items-center justify-center gap-2"
            : "h-14 px-2.5 items-center justify-between gap-1.5"
        )}
      >
        {isCollapsed ? (
          /* Collapsed View Header */
          <div className="w-full flex flex-col items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs hover:scale-105 transition-transform cursor-pointer"
                  style={{ backgroundColor: currentOrg?.color || "#6366f1" }}
                  title={`${currentOrg?.name || "Workspace"} · ${currentProject?.name || "Project"}`}
                >
                  {currentOrg?.logoUrl ? (
                    <img src={currentOrg.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span>{currentOrg?.icon || currentOrg?.name?.charAt(0)?.toUpperCase() || "🏢"}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 rounded-xl p-2 font-sans shadow-xl" align="start" side="right" sideOffset={8}>
                {/* 1. Organizations / Workspaces Section */}
                <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <span>ORGANIZATIONS</span>
                  {canUserEdit() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateOrg((prev) => !prev);
                      }}
                      className="text-[#15803d] dark:text-[#22c55e] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer text-[11px] capitalize"
                      title="Create Organization"
                    >
                      <Plus className="size-3" />
                      <span>New Org</span>
                    </button>
                  )}
                </div>

                {showCreateOrg && (
                  <form onSubmit={handleCreateOrg} className="px-2 py-1.5 flex gap-1.5 animate-in fade-in duration-150">
                    <Input
                      type="text"
                      required
                      placeholder="Org name..."
                      value={newOrgName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgName(e.target.value)}
                      className="h-7 text-xs flex-1 bg-background"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-7 px-2.5 text-xs bg-[#15803d] hover:bg-[#166534] text-white cursor-pointer shadow-2xs"
                    >
                      Add
                    </Button>
                  </form>
                )}

                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {userOrgs.map((org) => {
                    const isSelected = org.id === currentOrg?.id && !currentProject;
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => {
                          setCurrentOrg(org);
                          setCurrentProject(null);
                          setSidebarTab("dashboard");
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#ecfdf5] dark:bg-[#064e3b]/40 text-[#15803d] dark:text-[#4ade80] font-semibold"
                            : "text-foreground hover:bg-muted/70 font-medium"
                        }`}
                      >
                        <span className="truncate flex-1">{org.name}</span>
                        {isSelected && <Check className="size-4 text-[#15803d] dark:text-[#4ade80] shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>

                <DropdownMenuSeparator className="my-2" />

                {/* 2. Projects Section */}
                <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <span>PROJECTS ({orgProjects.length})</span>
                  {canUserEdit() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateProj(true);
                      }}
                      className="text-[#15803d] dark:text-[#22c55e] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer text-[11px] capitalize"
                      title="Create Project"
                    >
                      <Plus className="size-3" />
                      <span>New Project</span>
                    </button>
                  )}
                </div>

                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {orgProjects.map((proj) => {
                    const isSelected = proj.id === currentProject?.id;
                    return (
                      <DropdownMenuItem
                        key={proj.id}
                        onClick={() => {
                          setCurrentProject(proj);
                          if (
                            sidebarTab === "dashboard" ||
                            sidebarTab === "projects" ||
                            sidebarTab === "members" ||
                            (sidebarTab as string) === "workspaces"
                          ) {
                            setSidebarTab("tokens");
                          }
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#ecfdf5] dark:bg-[#064e3b]/40 text-[#15803d] dark:text-[#4ade80] font-semibold"
                            : "text-foreground hover:bg-muted/70 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Layers className="size-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="truncate flex-1">{proj.name}</span>
                        </div>
                        {isSelected && <Check className="size-4 text-[#15803d] dark:text-[#4ade80] shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  {orgProjects.length === 0 && (
                    <div className="px-2.5 py-2 text-[11px] text-muted-foreground text-center">
                      No projects in this organization yet
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Expand Button */}
            <button
              onClick={() => setIsCollapsed(false)}
              className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          </div>
        ) : (
          /* Expanded View Header */
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-sidebar-accent transition-all text-left flex-1 min-w-0 group cursor-pointer">
                  {/* Organization/Project Avatar */}
                  <div
                    className="flex size-7 items-center justify-center rounded-lg font-bold text-xs flex-shrink-0"
                    style={currentProject
                      ? { backgroundColor: '#ecfdf5', color: '#15803d' }
                      : { backgroundColor: currentOrg?.color || '#6366f1', color: '#fff' }
                    }
                  >
                    {currentProject
                      ? currentProject.name?.charAt(0)?.toUpperCase() || "P"
                      : currentOrg?.icon || currentOrg?.name?.charAt(0)?.toUpperCase() || "W"
                    }
                  </div>

                  {/* Project and Workspace Info */}
                  <div className="flex-1 min-w-0 leading-tight">
                    <div className="font-semibold text-xs truncate text-sidebar-foreground">
                      {currentProject?.name || currentOrg?.name || "Workspace"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {currentProject ? currentOrg?.name || "Workspace" : "Workspace"}
                    </div>
                  </div>

                  <ChevronsUpDown className="size-3.5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-72 rounded-xl p-2 font-sans shadow-xl" align="start">
                {/* 1. Organizations / Workspaces Section */}
                <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <span>ORGANIZATIONS</span>
                  {canUserEdit() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateOrg((prev) => !prev);
                      }}
                      className="text-[#15803d] dark:text-[#22c55e] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer text-[11px] capitalize"
                      title="Create Organization"
                    >
                      <Plus className="size-3" />
                      <span>New Org</span>
                    </button>
                  )}
                </div>

                {showCreateOrg && (
                  <form onSubmit={handleCreateOrg} className="px-2 py-1.5 flex gap-1.5 animate-in fade-in duration-150">
                    <Input
                      type="text"
                      required
                      placeholder="Org name..."
                      value={newOrgName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgName(e.target.value)}
                      className="h-7 text-xs flex-1 bg-background"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-7 px-2.5 text-xs bg-[#15803d] hover:bg-[#166534] text-white cursor-pointer shadow-2xs"
                    >
                      Add
                    </Button>
                  </form>
                )}

                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {userOrgs.map((org) => {
                    const isSelected = org.id === currentOrg?.id && !currentProject;
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => {
                          setCurrentOrg(org);
                          setCurrentProject(null);
                          setSidebarTab("dashboard");
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#ecfdf5] dark:bg-[#064e3b]/40 text-[#15803d] dark:text-[#4ade80] font-semibold"
                            : "text-foreground hover:bg-muted/70 font-medium"
                        }`}
                      >
                        <span className="truncate flex-1">{org.name}</span>
                        {isSelected && <Check className="size-4 text-[#15803d] dark:text-[#4ade80] shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>

                <DropdownMenuSeparator className="my-2" />

                {/* 2. Projects Section */}
                <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <span>PROJECTS ({orgProjects.length})</span>
                  {canUserEdit() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateProj(true);
                      }}
                      className="text-[#15803d] dark:text-[#22c55e] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer text-[11px] capitalize"
                      title="Create Project"
                    >
                      <Plus className="size-3" />
                      <span>New Project</span>
                    </button>
                  )}
                </div>

                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {orgProjects.map((proj) => {
                    const isSelected = proj.id === currentProject?.id;
                    return (
                      <DropdownMenuItem
                        key={proj.id}
                        onClick={() => {
                          setCurrentProject(proj);
                          if (
                            sidebarTab === "dashboard" ||
                            sidebarTab === "projects" ||
                            sidebarTab === "members" ||
                            (sidebarTab as string) === "workspaces"
                          ) {
                            setSidebarTab("tokens");
                          }
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#ecfdf5] dark:bg-[#064e3b]/40 text-[#15803d] dark:text-[#4ade80] font-semibold"
                            : "text-foreground hover:bg-muted/70 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Layers className="size-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="truncate flex-1">{proj.name}</span>
                        </div>
                        {isSelected && <Check className="size-4 text-[#15803d] dark:text-[#4ade80] shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  {orgProjects.length === 0 && (
                    <div className="px-2.5 py-2 text-[11px] text-muted-foreground text-center">
                      No projects in this organization yet
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Collapse Toggle Button */}
            {mode === "docked" && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="size-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* 2. Main Navigation Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 font-sans">
        {/* ============================================================= */}
        {/* 1. WORKSPACE SECTION — Only visible when NO project is selected */}
        {/* ============================================================= */}
        {!currentProject && (
          <div className="space-y-0.5">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                WORKSPACE
              </div>
            )}

            {/* Overview */}
            <button
              onClick={() => {
                setCurrentProject(null);
                setSidebarTab("dashboard");
              }}
              title="Overview"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "dashboard" && !currentProject
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
            >
              <Home className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Overview</span>}
            </button>

            {/* Projects */}
            <button
              onClick={() => {
                setCurrentProject(null);
                setSidebarTab("projects");
              }}
              title="Projects"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "projects" && !currentProject
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <FolderGit2 className="size-4 flex-shrink-0" />
                {!isCollapsed && <span>Projects</span>}
              </div>
              {!isCollapsed && orgProjects.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                  {orgProjects.length}
                </span>
              )}
            </button>

            {/* Members */}
            <button
              onClick={() => {
                setCurrentProject(null);
                setSidebarTab("members");
                setMembersSubTab("members");
              }}
              title="Members"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "members" && !currentProject
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Users className="size-4 flex-shrink-0" />
                {!isCollapsed && <span>Members</span>}
              </div>
              {!isCollapsed && currentOrg?.members && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                  {currentOrg.members.length}
                </span>
              )}
            </button>

            {/* Settings (Workspace / Org Settings) */}
            <button
              onClick={() => {
                setCurrentProject(null);
                setSidebarTab("org-settings");
              }}
              title="Settings"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "org-settings" && !currentProject
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
            >
              <Settings className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Settings</span>}
            </button>
          </div>
        )}

        {/* ============================================================= */}
        {/* 2. STUDIO SECTION — Only visible when a project is selected */}
        {/* ============================================================= */}
        {currentProject && (
        <div className="space-y-0.5">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              STUDIO
            </div>
          )}

          {/* Tokens */}
          <button
            onClick={() => setSidebarTab("tokens")}
            title="Tokens"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "tokens"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Layers className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Tokens</span>}
            </div>
            {!isCollapsed && allSetNames.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {allSetNames.length}
              </span>
            )}
          </button>

          {/* Themes */}
          <button
            onClick={() => setSidebarTab("themes")}
            title="Themes"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "themes"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Palette className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Themes</span>}
            </div>
            {!isCollapsed && themeGroups.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {themeGroups.length}
              </span>
            )}
          </button>

          {/* Documentation */}
          <button
            onClick={() => setSidebarTab("documentation")}
            title="Documentation"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "documentation"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <FileText className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Documentation</span>}
            </div>
            {!isCollapsed && (
              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground">
                Beta
              </Badge>
            )}
          </button>

          {/* Assets */}
          <button
            onClick={() => setSidebarTab("assets")}
            title="Assets"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "assets"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <ImageIcon className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Assets</span>}
            </div>
            {!isCollapsed && (
              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground">
                Beta
              </Badge>
            )}
          </button>

          {/* Variables */}
          <button
            onClick={() => setSidebarTab("variables")}
            title="Variables"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "variables"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <Variable className="size-4 flex-shrink-0" />
            {!isCollapsed && <span>Variables</span>}
          </button>

          {/* Exports */}
          <button
            onClick={() => setSidebarTab("exports")}
            title="Exports"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "exports"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <Download className="size-4 flex-shrink-0" />
            {!isCollapsed && <span>Exports</span>}
          </button>

          {/* Branches (Only visible when native branch mode is active / no Git provider configured) */}
          {!isGitConfigured && (
            <button
              onClick={() => setSidebarTab("branches")}
              title="Branches"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "branches"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <GitBranch className="size-4 flex-shrink-0" />
                {!isCollapsed && <span>Branches</span>}
              </div>
              {!isCollapsed && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                  {branches.length > 0 ? branches.length : 1}
                </span>
              )}
            </button>
          )}

          {/* Releases */}
          <button
            onClick={() => setSidebarTab("releases")}
            title="Releases"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "releases"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Package className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Releases</span>}
            </div>
            {!isCollapsed && releases.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {releases.length}
              </span>
            )}
          </button>

          {/* Activity */}
          <button
            onClick={() => setSidebarTab("activity")}
            title="Activity"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "activity"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <Clock className="size-4 flex-shrink-0" />
            {!isCollapsed && <span>Activity</span>}
          </button>
        </div>
        )}

        {/* ============================================================= */}
        {/* 3. SETTINGS SECTION — Only visible when a project is selected */}
        {/* ============================================================= */}
        {currentProject && (
        <div className="space-y-0.5 pt-2 border-t border-sidebar-border">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              SETTINGS
            </div>
          )}

          {/* Project Settings */}
          <button
            onClick={() => setSidebarTab("project-settings")}
            title="Project Settings"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "project-settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <Settings className="size-4 flex-shrink-0" />
            {!isCollapsed && <span>Project Settings</span>}
          </button>

          {/* Integrations */}
          <button
            onClick={() => setSidebarTab("integrations")}
            title="Integrations"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "integrations" || (sidebarTab as string) === "sync"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <Link2 className="size-4 flex-shrink-0" />
            {!isCollapsed && <span>Integrations</span>}
          </button>

          {/* MCP & CLI */}
          <button
            onClick={() => setSidebarTab("mcp")}
            title="MCP & CLI"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "mcp"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <Code2 className="size-4 flex-shrink-0" />
            {!isCollapsed && <span>MCP &amp; CLI</span>}
          </button>
        </div>
        )}
      </div>

      {/* 3. Support & Utility Links */}
      {!isCollapsed && (
        <div className="px-2 py-1 space-y-0.5 text-xs text-muted-foreground border-t border-sidebar-border mt-auto">
          <button
            onClick={() => setSidebarTab("documentation")}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:text-foreground hover:bg-sidebar-accent/50 transition-colors text-left cursor-pointer"
          >
            <BookOpen className="size-4 flex-shrink-0" />
            <span>Docs</span>
          </button>

          <button
            onClick={() => setSidebarTab("changelog")}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:text-foreground hover:bg-sidebar-accent/50 transition-colors text-left cursor-pointer"
          >
            <Sparkles className="size-4 flex-shrink-0" />
            <span>Changelog</span>
          </button>
        </div>
      )}

      {/* 4. Footer: User Account */}
      <div className="p-2 border-t border-sidebar-border">
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center ${isCollapsed ? "justify-center p-1" : "gap-2.5 p-2"} rounded-lg hover:bg-sidebar-accent transition-colors text-left group cursor-pointer`}>
                <div className="size-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                  {currentUser.displayName
                    ? currentUser.displayName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : currentUser.email
                    ? currentUser.email.charAt(0).toUpperCase()
                    : "U"}
                </div>
                {!isCollapsed && (
                  <>
                    <div className="grid flex-1 text-left leading-tight truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-xs text-sidebar-foreground">
                          {currentUser.displayName || currentUser.email?.split("@")[0] || "User"}
                        </span>
                        {userRole === "owner" && <Crown className="size-3 text-amber-500 flex-shrink-0" />}
                      </div>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {currentUser.email || ""}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-hover:text-sidebar-foreground flex-shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn(
                "rounded-xl p-1.5 font-sans shadow-xl",
                isCollapsed
                  ? "w-64"
                  : "w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
              )}
              side={isCollapsed ? "right" : "top"}
              align={isCollapsed ? "end" : "start"}
              sideOffset={8}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2.5 px-2 py-1.5 text-left text-xs">
                  <div className="size-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {currentUser.displayName
                      ? currentUser.displayName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : currentUser.email
                      ? currentUser.email.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  <div className="grid flex-1 leading-tight truncate">
                    <span className="truncate font-semibold text-foreground">
                      {currentUser.displayName || currentUser.email?.split("@")[0] || "User"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {currentUser.email || ""}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setSidebarTab("org-settings")}
                  className="gap-2 cursor-pointer"
                >
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <span>{currentOrg?.name || "Organization"}</span>
                  <Badge variant="violet" className="ml-auto text-[9px] px-1 py-0 capitalize">
                    {roleDef.title}
                  </Badge>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSidebarTab("members")}
                  className="gap-2 cursor-pointer"
                >
                  <Users className="size-3.5 text-muted-foreground" />
                  <span>Manage Team</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1.5 px-0.5 select-none">
                  <span>Theme</span>
                  <span className="text-[10px] capitalize text-muted-foreground/70 font-mono">
                    {themeMode}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                  <button
                    type="button"
                    onClick={() => setThemeMode("light")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                      themeMode === "light"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Light theme"
                  >
                    <Sun className="size-3.5" />
                    <span className="text-[10px]">Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode("dark")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                      themeMode === "dark"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Dark theme"
                  >
                    <Moon className="size-3.5" />
                    <span className="text-[10px]">Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode("system")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                      themeMode === "system"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="System default"
                  >
                    <Laptop className="size-3.5" />
                    <span className="text-[10px]">System</span>
                  </button>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : !isCollapsed ? (
          <div className="px-3 py-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono select-none">
            <span>Tokens Platform</span>
            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
              {LATEST_VERSION}
            </Badge>
          </div>
        ) : null}
      </div>

      <CreateProjectModal
        isOpen={showCreateProj}
        onClose={() => setShowCreateProj(false)}
      />
    </aside>
  );
};
