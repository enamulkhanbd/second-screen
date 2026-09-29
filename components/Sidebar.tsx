"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Project } from "@/types/tenant";
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
  Code2,
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
  Monitor,
  ArrowLeftRight,
} from "lucide-react";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { LATEST_VERSION } from "@/data/systemChangelog";
import { supabase } from "@/lib/supabase/client";

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
import { TokensPlatformMark } from "@/components/TokensPlatformLogo";

function FigmaVariableIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface SidebarProps {
  onOpenSettings?: () => void;
  onNavigateWorkspaceTab: (tab: "dashboard" | "projects" | "members" | "org-settings") => void;
  onSelectProject: (project: Project) => void;
  mode?: "docked" | "drawer";
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, onNavigateWorkspaceTab, onSelectProject, mode = "docked", className }) => {
  const {
    currentUser,
    setCurrentUser,
    signOutUser,
    userOrgs,
    currentOrg,
    setCurrentOrg,
    orgProjects,
    isLoadingProjects,
    currentProject,
    syncTargetProject,
    setCurrentProject,
    themeGroups,
    rawTokens,
    figmaResolvedVariables,
    sidebarTab,
    setSidebarTab,
    setProjectSettingsTab,
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
  const isWorkspaceNavigation = !currentProject;
  const sidebarProject = isWorkspaceNavigation ? null : currentProject;

  // Extract all valid set names based on $metadata.json ($themes.json or valid token sets)
  const allSetNames = useMemo(() => {
    return getValidTokenSetNames(rawTokens);
  }, [rawTokens]);

  const isGitConfigured = Boolean(
    credentials.provider && credentials.owner && credentials.repo
  );

  const isCustomOrgColor = useMemo(() => {
    if (!currentOrg?.color) return false;
    const trimmed = currentOrg.color.trim().toLowerCase();
    return !["#171717", "#0a0a0a", "#2e9401", "#2d9401", "#6366f1", "neutral"].includes(trimmed);
  }, [currentOrg?.color]);

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
    await signOutUser();
    addToast({
      type: "info",
      title: "Signed Out",
      message: "You have been safely signed out.",
    });
  };

  return (
    <aside
      className={cn(`flex-shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-full select-none text-xs font-sans transition-all duration-200 ${mode === "drawer" ? "w-full" : isCollapsed ? "w-16" : "w-[18rem]"
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
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs hover:scale-105 transition-transform cursor-pointer overflow-hidden"
                  style={
                    sidebarProject
                      ? (sidebarProject.logoUrl
                          ? undefined
                          : sidebarProject.color
                          ? { backgroundColor: sidebarProject.color, color: "#fff" }
                          : isCustomOrgColor
                          ? { backgroundColor: `${currentOrg?.color}20`, color: currentOrg?.color }
                          : { backgroundColor: "#ecfdf5", color: "#15803d" })
                      : (currentOrg?.logoUrl
                          ? undefined
                          : { backgroundColor: currentOrg?.color || "hsl(var(--primary))", color: currentOrg?.color ? "#fff" : "hsl(var(--primary-foreground))" })
                  }
                  title={sidebarProject ? `${sidebarProject.name} · ${currentOrg?.name || "Workspace"}` : (currentOrg?.name || "Workspace")}
                >
                  {sidebarProject ? (
                    sidebarProject.logoUrl ? (
                      <img src={sidebarProject.logoUrl} alt={sidebarProject.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span>{sidebarProject.icon || sidebarProject.name?.charAt(0)?.toUpperCase() || "P"}</span>
                    )
                  ) : currentOrg?.logoUrl ? (
                    <img src={currentOrg.logoUrl} alt={currentOrg.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span>{currentOrg?.icon || currentOrg?.name?.charAt(0)?.toUpperCase() || "🏢"}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-xl p-1.5 font-sans shadow-xl" align="start" side="right" sideOffset={8}>
                {/* 1. RECENT PROJECTS SECTION */}
                <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  <span>RECENT PROJECTS</span>
                  {canUserEdit() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateProj(true);
                      }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Create Project"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {orgProjects.map((proj) => {
                    const isSelected = proj.id === sidebarProject?.id;
                    return (
                      <DropdownMenuItem
                        key={proj.id}
                        onClick={() => onSelectProject(proj)}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-foreground hover:bg-muted/70 font-medium"
                      >
                        <div
                          className={`size-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ${
                            isCustomOrgColor ? "" : "bg-muted text-foreground"
                          }`}
                          style={isCustomOrgColor ? { backgroundColor: `${currentOrg?.color}20`, color: currentOrg?.color } : undefined}
                        >
                          {proj.logoUrl ? (
                            <img src={proj.logoUrl} alt={proj.name} className="w-full h-full object-cover rounded-md" />
                          ) : (
                            <span className="text-[11px] font-semibold">{proj.name?.[0]?.toUpperCase() || "P"}</span>
                          )}
                        </div>
                        <span className="truncate flex-1 font-medium">{proj.name}</span>
                        {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  {isLoadingProjects && orgProjects.length === 0 ? (
                    <div className="space-y-1.5 px-2 py-1.5">
                      <div className="flex items-center gap-2.5 animate-pulse">
                        <div className="size-5 rounded-md bg-muted/80 shrink-0" />
                        <div className="h-3 w-24 bg-muted/70 rounded" />
                      </div>
                      <div className="flex items-center gap-2.5 animate-pulse">
                        <div className="size-5 rounded-md bg-muted/80 shrink-0" />
                        <div className="h-3 w-16 bg-muted/70 rounded" />
                      </div>
                    </div>
                  ) : orgProjects.length === 0 ? (
                    <div className="px-2.5 py-2 text-[11px] text-muted-foreground text-center">
                      No projects yet
                    </div>
                  ) : null}
                </div>

                <DropdownMenuSeparator className="my-1.5" />

                {/* 2. CURRENT WORKSPACE SECTION */}
                <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  <span>CURRENT WORKSPACE</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentProject(null);
                      setSidebarTab("workspaces");
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Go to Workspaces List"
                  >
                    <ArrowLeftRight className="size-3.5" />
                  </button>
                </div>

                <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
                  {userOrgs.map((org) => {
                    const isSelected = currentOrg?.id === org.id;
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => {
                          setCurrentOrg(org);
                          setCurrentProject(null);
                          setSidebarTab("dashboard");
                        }}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isSelected
                            ? "bg-primary/10 text-foreground font-semibold"
                            : "text-foreground hover:bg-muted/70 font-medium"
                          }`}
                      >
                        <div
                          className="size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs"
                          style={{ backgroundColor: org.color || "hsl(var(--primary))", color: org.color ? "#fff" : "hsl(var(--primary-foreground))" }}
                        >
                          {org.logoUrl ? (
                            <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span>{org.name?.charAt(0)?.toUpperCase() || "W"}</span>
                          )}
                        </div>
                        <span className="truncate flex-1 font-semibold">{org.name}</span>
                        {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  {userOrgs.length === 0 && (
                    <div className="px-2.5 py-1.5 text-[11px] text-muted-foreground text-center">
                      No workspace selected
                    </div>
                  )}
                  {currentOrg && (
                    <>
                      <DropdownMenuSeparator className="my-1.5" />
                      <DropdownMenuItem
                        onClick={() => {
                          setCurrentProject(null);
                          setSidebarTab("org-settings");
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer text-muted-foreground hover:text-foreground font-medium"
                      >
                        <Settings className="size-3.5" />
                        <span>Workspace Settings</span>
                      </DropdownMenuItem>
                    </>
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
                    className="flex size-7 items-center justify-center rounded-lg font-bold text-xs flex-shrink-0 overflow-hidden bg-muted/40"
                    style={
                      sidebarProject
                        ? (sidebarProject.logoUrl
                            ? undefined
                            : sidebarProject.color
                            ? { backgroundColor: sidebarProject.color, color: "#fff" }
                            : isCustomOrgColor
                            ? { backgroundColor: `${currentOrg?.color}20`, color: currentOrg?.color }
                            : { backgroundColor: "#ecfdf5", color: "#15803d" })
                        : (currentOrg?.logoUrl
                            ? undefined
                            : { backgroundColor: currentOrg?.color || "hsl(var(--primary))", color: currentOrg?.color ? "#fff" : "hsl(var(--primary-foreground))" })
                    }
                  >
                    {sidebarProject ? (
                      sidebarProject.logoUrl ? (
                        <img src={sidebarProject.logoUrl} alt={sidebarProject.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{sidebarProject.icon || sidebarProject.name?.charAt(0)?.toUpperCase() || "P"}</span>
                      )
                    ) : currentOrg?.logoUrl ? (
                      <img src={currentOrg.logoUrl} alt={currentOrg.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{currentOrg?.icon || currentOrg?.name?.charAt(0)?.toUpperCase() || "W"}</span>
                    )}
                  </div>

                  {/* Project and Workspace Info */}
                  <div className="flex-1 min-w-0 leading-tight">
                    <div className="font-semibold text-xs truncate text-sidebar-foreground">
                      {sidebarProject?.name || currentOrg?.name || "Workspace"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {sidebarProject ? currentOrg?.name || "Workspace" : "Workspace"}
                    </div>
                  </div>

                  <ChevronsUpDown className="size-3.5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-64 rounded-xl p-1.5 font-sans shadow-xl" align="start">
                {/* 1. RECENT PROJECTS SECTION */}
                <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  <span>RECENT PROJECTS</span>
                  {canUserEdit() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateProj(true);
                      }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Create Project"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {orgProjects.map((proj) => {
                    const isSelected = proj.id === sidebarProject?.id;
                    return (
                      <DropdownMenuItem
                        key={proj.id}
                        onClick={() => onSelectProject(proj)}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-foreground hover:bg-muted/70 font-medium"
                      >
                        <div
                          className={`size-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ${
                            isCustomOrgColor ? "" : "bg-muted text-foreground"
                          }`}
                          style={isCustomOrgColor ? { backgroundColor: `${currentOrg?.color}20`, color: currentOrg?.color } : undefined}
                        >
                          {proj.logoUrl ? (
                            <img src={proj.logoUrl} alt={proj.name} className="w-full h-full object-cover rounded-md" />
                          ) : (
                            <span className="text-[11px] font-semibold">{proj.name?.[0]?.toUpperCase() || "P"}</span>
                          )}
                        </div>
                        <span className="truncate flex-1 font-medium">{proj.name}</span>
                        {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  {isLoadingProjects && orgProjects.length === 0 ? (
                    <div className="space-y-1.5 px-2 py-1.5">
                      <div className="flex items-center gap-2.5 animate-pulse">
                        <div className="size-5 rounded-md bg-muted/80 shrink-0" />
                        <div className="h-3 w-24 bg-muted/70 rounded" />
                      </div>
                      <div className="flex items-center gap-2.5 animate-pulse">
                        <div className="size-5 rounded-md bg-muted/80 shrink-0" />
                        <div className="h-3 w-16 bg-muted/70 rounded" />
                      </div>
                    </div>
                  ) : orgProjects.length === 0 ? (
                    <div className="px-2.5 py-2 text-[11px] text-muted-foreground text-center">
                      No projects yet
                    </div>
                  ) : null}
                </div>

                <DropdownMenuSeparator className="my-1.5" />

                {/* 2. CURRENT WORKSPACE SECTION */}
                <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  <span>CURRENT WORKSPACE</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentProject(null);
                      setSidebarTab("workspaces");
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Go to Workspaces List"
                  >
                    <ArrowLeftRight className="size-3.5" />
                  </button>
                </div>

                <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
                  {userOrgs.map((org) => {
                    const isSelected = currentOrg?.id === org.id;
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => {
                          setCurrentOrg(org);
                          setCurrentProject(null);
                          setSidebarTab("dashboard");
                        }}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isSelected
                            ? "bg-primary/10 text-foreground font-semibold"
                            : "text-foreground hover:bg-muted/70 font-medium"
                          }`}
                      >
                        <div
                          className="size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs"
                          style={{ backgroundColor: org.color || "hsl(var(--primary))", color: org.color ? "#fff" : "hsl(var(--primary-foreground))" }}
                        >
                          {org.logoUrl ? (
                            <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span>{org.name?.charAt(0)?.toUpperCase() || "W"}</span>
                          )}
                        </div>
                        <span className="truncate flex-1 font-semibold">{org.name}</span>
                        {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  {userOrgs.length === 0 && (
                    <div className="px-2.5 py-1.5 text-[11px] text-muted-foreground text-center">
                      No workspace selected
                    </div>
                  )}
                  {currentOrg && (
                    <>
                      <DropdownMenuSeparator className="my-1.5" />
                      <DropdownMenuItem
                        onClick={() => {
                          setCurrentProject(null);
                          setSidebarTab("org-settings");
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer text-muted-foreground hover:text-foreground font-medium"
                      >
                        <Settings className="size-3.5" />
                        <span>Workspace Settings</span>
                      </DropdownMenuItem>
                    </>
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
        {/* 1. WORKSPACE SECTION — Visible for workspace routes and sync setup */}
        {/* ============================================================= */}
        {isWorkspaceNavigation && (
          <div className="space-y-0.5">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                WORKSPACE
              </div>
            )}

            {/* Overview */}
            <button
              onClick={() => onNavigateWorkspaceTab("dashboard")}
              title="Overview"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "dashboard" && !currentProject
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                }`}
            >
              <Home className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Overview</span>}
            </button>

            {/* Members */}
            <button
              onClick={() => {
                onNavigateWorkspaceTab("members");
                setMembersSubTab("members");
              }}
              title="Members"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "members" && !currentProject
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
              onClick={() => onNavigateWorkspaceTab("org-settings")}
              title="Workspace Settings"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "org-settings" && !currentProject
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                }`}
            >
              <Settings className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Workspace Settings</span>}
            </button>

            {syncTargetProject && (
              <button
                onClick={() => {
                  setProjectSettingsTab("details");
                  setSidebarTab("project-settings");
                }}
                title={`Project Settings: ${syncTargetProject.name}`}
                className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "project-settings"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                  }`}
              >
                <Settings className="size-4 flex-shrink-0" />
                {!isCollapsed && <span>Project Settings</span>}
              </button>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* 2. STUDIO SECTION — Hidden during workspace-level sync setup */}
        {/* ============================================================= */}
        {!isWorkspaceNavigation && currentProject && (
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
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "tokens"
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
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "themes"
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

            {/* Variables */}
            <button
              onClick={() => setSidebarTab("variables")}
              title="Variables"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "variables"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <FigmaVariableIcon className="size-4 flex-shrink-0" />
                {!isCollapsed && <span>Variables</span>}
              </div>
            </button>

            {/* Assets */}
            <button
              onClick={() => setSidebarTab("assets")}
              title="Assets"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "assets"
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

            {/* Documentation */}
            <button
              onClick={() => setSidebarTab("documentation")}
              title="Documentation"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "documentation"
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

            {/* Schema Marketplace */}
            <button
              onClick={() => setSidebarTab("extensions")}
              title="Schema Marketplace"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "extensions"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                }`}
            >
              <Lightbulb className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Schema Marketplace</span>}
            </button>

            {/* Exports */}
            <button
              onClick={() => setSidebarTab("exports")}
              title="Exports"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "exports"
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
                className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "branches"
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
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "releases"
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

            {/* Git Log (Activity) */}
            <button
              onClick={() => setSidebarTab("activity")}
              title="Git Log"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "activity"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                }`}
            >
              <Clock className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Git Log</span>}
            </button>
          </div>
        )}

        {/* ============================================================= */}
        {/* 3. SETTINGS SECTION — Only visible when a project is selected */}
        {/* ============================================================= */}
        {!isWorkspaceNavigation && currentProject && (
          <div className="space-y-0.5 pt-2 border-t border-sidebar-border">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                SETTINGS
              </div>
            )}

            {/* Project Settings */}
            <button
              onClick={() => {
                setProjectSettingsTab("details");
                setSidebarTab("project-settings");
              }}
              title="Project Settings"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "project-settings"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                }`}
            >
              <Settings className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Project Settings</span>}
            </button>

            {/* MCP & CLI */}
            <button
              onClick={() => setSidebarTab("mcp")}
              title="MCP & CLI"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "mcp"
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
      <div className="px-2 py-1 space-y-0.5 text-xs text-muted-foreground border-t border-sidebar-border mt-auto">
        <button
          onClick={() => setSidebarTab("system-docs")}
          title="System Guidelines & Docs"
          className={`w-full flex items-center ${isCollapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5"} rounded-lg transition-colors text-left cursor-pointer ${sidebarTab === "system-docs"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
              : "hover:text-foreground hover:bg-sidebar-accent/50"
            }`}
        >
          <BookOpen className="size-4 flex-shrink-0" />
          {!isCollapsed && <span>Docs</span>}
        </button>

        <button
          onClick={() => setSidebarTab("changelog")}
          title="Changelog"
          className={`w-full flex items-center ${isCollapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5"} rounded-lg transition-colors text-left cursor-pointer ${sidebarTab === "changelog"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
              : "hover:text-foreground hover:bg-sidebar-accent/50"
            }`}
        >
          <Sparkles className="size-4 flex-shrink-0" />
          {!isCollapsed && <span>Changelog</span>}
        </button>
      </div>

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

              {/* Theme Section (Vertical list matching design) */}
              <div className="py-1">
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground tracking-wider uppercase select-none">
                  THEME
                </div>
                <DropdownMenuItem
                  onClick={() => setThemeMode("light")}
                  className="flex items-center gap-2.5 px-2 py-1.5 text-xs cursor-pointer"
                >
                  <div className="size-3.5 flex items-center justify-center shrink-0">
                    {themeMode === "light" && <Check className="size-3.5 text-foreground stroke-[2.5]" />}
                  </div>
                  <Sun className="size-4 text-foreground/80 shrink-0" />
                  <span className={cn(themeMode === "light" ? "font-medium text-foreground" : "text-muted-foreground")}>
                    Light
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setThemeMode("dark")}
                  className="flex items-center gap-2.5 px-2 py-1.5 text-xs cursor-pointer"
                >
                  <div className="size-3.5 flex items-center justify-center shrink-0">
                    {themeMode === "dark" && <Check className="size-3.5 text-foreground stroke-[2.5]" />}
                  </div>
                  <Moon className="size-4 text-foreground/80 shrink-0" />
                  <span className={cn(themeMode === "dark" ? "font-medium text-foreground" : "text-muted-foreground")}>
                    Dark
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setThemeMode("system")}
                  className="flex items-center gap-2.5 px-2 py-1.5 text-xs cursor-pointer"
                >
                  <div className="size-3.5 flex items-center justify-center shrink-0">
                    {themeMode === "system" && <Check className="size-3.5 text-foreground stroke-[2.5]" />}
                  </div>
                  <Monitor className="size-4 text-foreground/80 shrink-0" />
                  <span className={cn(themeMode === "system" ? "font-medium text-foreground" : "text-muted-foreground")}>
                    System
                  </span>
                </DropdownMenuItem>
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
            <div className="flex items-center gap-1.5">
              <TokensPlatformMark className="w-3.5 h-3.5 text-primary" strokeWidth={2.2} />
              <span>Tokens Platform</span>
            </div>
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
