"use client";

import React, { useState, useMemo, useEffect, startTransition } from "react";
import Link from "next/link";
import { useTokenStore } from "@/store/useTokenStore";
import { useShallow } from "zustand/react/shallow";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface SidebarNavItemProps {
  href: string;
  label: string;
  active: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
  count?: number;
  badge?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

function SidebarNavItem({
  href,
  label,
  active,
  collapsed,
  icon,
  count,
  badge,
  onClick,
}: SidebarNavItemProps) {
  const link = (
    <Link
      href={href}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? undefined : label}
      onClick={(event) => {
        if (
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          if (onClick) {
            event.preventDefault();
            onClick(event);
          }
        }
      }}
      className={cn(
        "w-full flex items-center rounded-lg text-xs transition-colors",
        collapsed ? "justify-center px-2 py-2.5" : "justify-between gap-2.5 px-2.5 py-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
      )}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        {icon}
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
      {!collapsed && count !== undefined && (
        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums bg-muted text-muted-foreground">
          {count}
        </span>
      )}
      {!collapsed && badge && (
        <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground">
          {badge}
        </Badge>
      )}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
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
  } = useTokenStore(
    useShallow((state) => ({
      currentUser: state.currentUser,
      setCurrentUser: state.setCurrentUser,
      signOutUser: state.signOutUser,
      userOrgs: state.userOrgs,
      currentOrg: state.currentOrg,
      setCurrentOrg: state.setCurrentOrg,
      orgProjects: state.orgProjects,
      isLoadingProjects: state.isLoadingProjects,
      currentProject: state.currentProject,
      syncTargetProject: state.syncTargetProject,
      setCurrentProject: state.setCurrentProject,
      themeGroups: state.themeGroups,
      rawTokens: state.rawTokens,
      figmaResolvedVariables: state.figmaResolvedVariables,
      sidebarTab: state.sidebarTab,
      setSidebarTab: state.setSidebarTab,
      setMembersSubTab: state.setMembersSubTab,
      credentials: state.credentials,
      releases: state.releases,
      documentation: state.documentation,
      addToast: state.addToast,
      getCurrentUserRole: state.getCurrentUserRole,
      canUserEdit: state.canUserEdit,
      branches: state.branches,
      activeBranch: state.activeBranch,
      createOrgAction: state.createOrgAction,
      themeMode: state.themeMode,
      setThemeMode: state.setThemeMode,
    }))
  );

  const [showCreateProj, setShowCreateProj] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCollapsedState, setIsCollapsed] = useState(false);
  const isCollapsed = mode === "docked" && isCollapsedState;

  const userRole = getCurrentUserRole();
  const isWorkspaceNavigation = !currentProject || sidebarTab === "project-settings";
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
          title: "Workspace Created",
          message: `Created workspace "${org.name}".`,
        });
        setNewOrgName("");
        setShowCreateOrg(false);
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Failed to Create Workspace",
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
    <TooltipProvider>
    <aside
      className={cn(`flex-shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-full select-none text-xs font-sans transition-[width] duration-200 ${mode === "drawer" ? "w-full" : isCollapsed ? "w-16" : "w-[18rem]"
        }`, className)}
    >
      {/* 1. Header: Workspace & Project Selector + Collapse/Expand Toggle */}
      <div
        className={cn(
          "border-b border-sidebar-border flex flex-shrink-0 transition-[padding,height]",
          isCollapsed
            ? "py-3 px-2 flex-col items-center justify-center gap-2"
            : "h-14 px-2.5 items-center justify-between gap-1.5"
        )}
      >
        {isCollapsed ? (
          /* Collapsed View Header */
          <div className="w-full flex flex-col items-center gap-2">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label={sidebarProject?.name || currentOrg?.name || "Workspace"}
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs hover:opacity-90 transition-opacity cursor-pointer overflow-hidden"
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
                          <img src={sidebarProject.logoUrl} alt={sidebarProject.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span>{sidebarProject.icon || sidebarProject.name?.charAt(0)?.toUpperCase() || "P"}</span>
                        )
                      ) : currentOrg?.logoUrl ? (
                        <img src={currentOrg.logoUrl} alt={currentOrg.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <span>{currentOrg?.icon || currentOrg?.name?.charAt(0)?.toUpperCase() || "W"}</span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {sidebarProject?.name || currentOrg?.name || "Workspace"}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent className="w-64 rounded-xl p-1.5 font-sans shadow-xl overflow-x-hidden" align="start" side="right" sideOffset={8}>
                {/* Projects section */}
                <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground tracking-wider select-none">
                  <span>Projects</span>
                  {canUserEdit() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateProj(true);
                      }}
                      className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      aria-label="Create project"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-0.5 overflow-x-hidden">
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

                <DropdownMenuSeparator className="my-1.5 mx-0" />

                {/* Workspaces section */}
                <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground tracking-wider select-none">
                  <span>Workspaces</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentProject(null);
                      setSidebarTab("workspaces");
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Go to workspaces list"
                  >
                    <ArrowLeftRight className="size-3.5" />
                  </button>
                </div>

                <div className="space-y-0.5 max-h-[180px] overflow-x-hidden overflow-y-auto">
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
                      <DropdownMenuSeparator className="my-1.5 mx-0" />
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsCollapsed(false)}
                  aria-label="Expand sidebar"
                  className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
                >
                  <PanelLeftOpen className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          /* Expanded View Header */
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-sidebar-accent transition-colors text-left flex-1 min-w-0 group cursor-pointer">
                  {/* Workspace/Project Avatar */}
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

              <DropdownMenuContent className="w-64 rounded-xl p-1.5 font-sans shadow-xl overflow-x-hidden" align="start">
                {/* Projects section */}
                <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground tracking-wider select-none">
                  <span>Projects</span>
                  {canUserEdit() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateProj(true);
                      }}
                      className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      aria-label="Create project"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-0.5 overflow-x-hidden">
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

                <DropdownMenuSeparator className="my-1.5 mx-0" />

                {/* Workspaces section */}
                <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground tracking-wider select-none">
                  <span>Workspaces</span>
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

                <div className="space-y-0.5 max-h-[180px] overflow-x-hidden overflow-y-auto">
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
                      <DropdownMenuSeparator className="my-1.5 mx-0" />
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
                aria-label="Collapse sidebar"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
              >
                <PanelLeftClose className="size-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* 2. Main Navigation Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 font-sans">
        {/* Workspace navigation */}
        {isWorkspaceNavigation && (
          <div className="space-y-0.5">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground/80">
                Workspace
              </div>
            )}
            <SidebarNavItem
              href={currentOrg ? `/${encodeURIComponent(currentOrg.slug)}/overview` : "/"}
              label="Overview"
              active={sidebarTab === "dashboard"}
              collapsed={isCollapsed}
              icon={<Home className="size-4 shrink-0" />}
              onClick={() => onNavigateWorkspaceTab("dashboard")}
            />
            <SidebarNavItem
              href={currentOrg ? `/${encodeURIComponent(currentOrg.slug)}/projects` : "/"}
              label="Projects"
              active={sidebarTab === "projects" || sidebarTab === "project-settings"}
              collapsed={isCollapsed}
              icon={<FolderGit2 className="size-4 shrink-0" />}
              count={orgProjects.length || undefined}
              onClick={() => onNavigateWorkspaceTab("projects")}
            />
            <SidebarNavItem
              href={currentOrg ? `/${encodeURIComponent(currentOrg.slug)}/members` : "/"}
              label="Members"
              active={sidebarTab === "members"}
              collapsed={isCollapsed}
              icon={<Users className="size-4 shrink-0" />}
              count={currentOrg?.members?.length || undefined}
              onClick={() => {
                onNavigateWorkspaceTab("members");
                setMembersSubTab("members");
              }}
            />
            <SidebarNavItem
              href={currentOrg ? `/${encodeURIComponent(currentOrg.slug)}/settings` : "/"}
              label="Workspace settings"
              active={sidebarTab === "org-settings"}
              collapsed={isCollapsed}
              icon={<Settings className="size-4 shrink-0" />}
              onClick={() => onNavigateWorkspaceTab("org-settings")}
            />
          </div>
        )}

        {/* Project navigation */}
        {!isWorkspaceNavigation && currentProject && (
          <div className="space-y-4">
            {(() => {
              const projectHref = (tab: string) =>
                currentOrg
                  ? `/${encodeURIComponent(currentOrg.slug)}/${encodeURIComponent(currentProject.slug)}/${tab}`
                  : "/";
              const selectProjectTab = (tab: typeof sidebarTab) => () => {
                startTransition(() => {
                  setSidebarTab(tab);
                });
              };
              const groupTitle = "px-2.5 py-1 text-[11px] font-medium text-muted-foreground/80";
              return (
                <>
                  <section className="space-y-0.5" aria-label="Design">
                    {!isCollapsed && <div className={groupTitle}>Design</div>}
                    <SidebarNavItem href={projectHref("tokens")} label="Tokens" active={sidebarTab === "tokens"} collapsed={isCollapsed} icon={<Layers className="size-4 shrink-0" />} count={allSetNames.length || undefined} onClick={selectProjectTab("tokens")} />
                    <SidebarNavItem href={projectHref("themes")} label="Themes" active={sidebarTab === "themes"} collapsed={isCollapsed} icon={<Palette className="size-4 shrink-0" />} count={themeGroups.length || undefined} onClick={selectProjectTab("themes")} />
                  </section>
                  <section className="space-y-0.5" aria-label="Connect">
                    {!isCollapsed && <div className={groupTitle}>Connect</div>}
                    <SidebarNavItem href={projectHref("variables")} label="Figma Variables" active={sidebarTab === "variables"} collapsed={isCollapsed} icon={<FigmaVariableIcon className="size-4 shrink-0" />} onClick={selectProjectTab("variables")} />
                    <SidebarNavItem href={projectHref("branches")} label="Branches" active={sidebarTab === "branches"} collapsed={isCollapsed} icon={<GitBranch className="size-4 shrink-0" />} count={branches.length || 1} onClick={selectProjectTab("branches")} />
                  </section>
                  <section className="space-y-0.5" aria-label="Publish">
                    {!isCollapsed && <div className={groupTitle}>Publish</div>}
                    <SidebarNavItem href={projectHref("documentation")} label="Documentation" active={sidebarTab === "documentation"} collapsed={isCollapsed} icon={<FileText className="size-4 shrink-0" />} badge="Beta" onClick={selectProjectTab("documentation")} />
                    <SidebarNavItem href={projectHref("assets")} label="Assets" active={sidebarTab === "assets"} collapsed={isCollapsed} icon={<ImageIcon className="size-4 shrink-0" />} badge="Beta" onClick={selectProjectTab("assets")} />
                    <SidebarNavItem href={projectHref("exports")} label="Exports" active={sidebarTab === "exports"} collapsed={isCollapsed} icon={<Download className="size-4 shrink-0" />} onClick={selectProjectTab("exports")} />
                    <SidebarNavItem href={projectHref("releases")} label="Releases" active={sidebarTab === "releases"} collapsed={isCollapsed} icon={<Package className="size-4 shrink-0" />} count={releases.length || undefined} onClick={selectProjectTab("releases")} />
                  </section>
                  <section className="space-y-0.5" aria-label="Advanced">
                    {!isCollapsed && <div className={groupTitle}>Advanced</div>}
                    <SidebarNavItem href={projectHref("extensions")} label="Extensions" active={sidebarTab === "extensions"} collapsed={isCollapsed} icon={<Lightbulb className="size-4 shrink-0" />} onClick={selectProjectTab("extensions")} />
                    <SidebarNavItem href={projectHref("mcp")} label={"Developers (MCP & CLI)"} active={sidebarTab === "mcp"} collapsed={isCollapsed} icon={<Code2 className="size-4 shrink-0" />} onClick={selectProjectTab("mcp")} />
                  </section>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="px-2 py-1 space-y-0.5 text-xs text-muted-foreground border-t border-sidebar-border mt-auto">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={isCollapsed ? "Help" : undefined}
                  className={cn(
                    "w-full flex items-center rounded-lg transition-colors text-left cursor-pointer hover:text-foreground hover:bg-sidebar-accent/50",
                    isCollapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5"
                  )}
                >
                  <BookOpen className="size-4 shrink-0" />
                  {!isCollapsed && <span>Help</span>}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Help</TooltipContent>}
          </Tooltip>
          <DropdownMenuContent side={isCollapsed ? "right" : "top"} align={isCollapsed ? "end" : "start"} className="w-48">
            <DropdownMenuItem onClick={() => setSidebarTab("system-docs")} className="gap-2 cursor-pointer">
              <BookOpen className="size-3.5 text-muted-foreground" />
              <span>Product docs</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSidebarTab("changelog")} className="gap-2 cursor-pointer">
              <Layers className="size-3.5 text-muted-foreground" />
              <span>Changelog</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 4. Footer: User Account */}
      <div className="p-2 border-t border-sidebar-border">
        {currentUser ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={isCollapsed ? "Account menu" : undefined}
                    className={`w-full flex items-center ${isCollapsed ? "justify-center p-1" : "gap-2.5 p-2"} rounded-lg hover:bg-sidebar-accent transition-colors text-left group cursor-pointer`}
                  >
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
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Account menu</TooltipContent>}
            </Tooltip>
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
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground tracking-wider select-none">
                  Theme
                </div>
                <DropdownMenuItem
                  onClick={() => setThemeMode("light")}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-foreground hover:bg-muted/70 font-medium",
                    themeMode === "light" && "bg-muted/80 text-foreground font-semibold"
                  )}
                >
                  <div className="size-3.5 flex items-center justify-center shrink-0">
                    {themeMode === "light" && <Check className="size-3.5 text-foreground stroke-[2.5]" />}
                  </div>
                  <Sun className="size-4 text-foreground/80 shrink-0" />
                  <span className={cn(themeMode === "light" ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    Light
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setThemeMode("dark")}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-foreground hover:bg-muted/70 font-medium",
                    themeMode === "dark" && "bg-muted/80 text-foreground font-semibold"
                  )}
                >
                  <div className="size-3.5 flex items-center justify-center shrink-0">
                    {themeMode === "dark" && <Check className="size-3.5 text-foreground stroke-[2.5]" />}
                  </div>
                  <Moon className="size-4 text-foreground/80 shrink-0" />
                  <span className={cn(themeMode === "dark" ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    Dark
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setThemeMode("system")}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-foreground hover:bg-muted/70 font-medium",
                    themeMode === "system" && "bg-muted/80 text-foreground font-semibold"
                  )}
                >
                  <div className="size-3.5 flex items-center justify-center shrink-0">
                    {themeMode === "system" && <Check className="size-3.5 text-foreground stroke-[2.5]" />}
                  </div>
                  <Monitor className="size-4 text-foreground/80 shrink-0" />
                  <span className={cn(themeMode === "system" ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    System
                  </span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="gap-2 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors"
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
    </TooltipProvider>
  );
};
