"use client";

import React, { useState, useMemo } from "react";
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
  Settings,
  Users,
  Building2,
  Link2,
  Code2,
  ChevronsUpDown,
  Check,
  Crown,
  LogOut,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { ROLE_DEFINITIONS } from "@/types/tenant";
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
import { getValidTokenSetNames } from "@/utils/themeHelpers";

interface SidebarProps {
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
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
    addToast,
    getCurrentUserRole,
    canUserEdit,
  } = useTokenStore();

  const [showCreateProj, setShowCreateProj] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const userRole = getCurrentUserRole();
  const roleDef = ROLE_DEFINITIONS[userRole];

  // Extract all valid set names based on $metadata.json ($themes.json or valid token sets)
  const allSetNames = useMemo(() => {
    return getValidTokenSetNames(rawTokens);
  }, [rawTokens]);

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
      className={`flex-shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-full select-none text-xs font-sans transition-all duration-200 ${
        isCollapsed ? "w-16" : "w-[18rem]"
      }`}
    >
      {/* 1. Header: Workspace & Project Selector + Collapse/Expand Toggle */}
      <div className="p-2.5 border-b border-sidebar-border flex items-center justify-between gap-1.5">
        {isCollapsed ? (
          /* Collapsed View Header */
          <div className="w-full flex flex-col items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs hover:scale-105 transition-transform cursor-pointer"
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
              <DropdownMenuContent className="w-60 rounded-xl p-1.5 font-sans" align="start" side="right" sideOffset={8}>
                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
                  Workspaces ({userOrgs.length})
                </DropdownMenuLabel>
                {userOrgs.map((org) => {
                  const isSelected = org.id === currentOrg?.id;
                  return (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => setCurrentOrg(org)}
                      className="gap-2 px-2 py-1.5 cursor-pointer"
                    >
                      <div
                        className="flex size-6 items-center justify-center rounded-md text-white font-semibold text-xs"
                        style={{ backgroundColor: org.color || "#6366f1" }}
                      >
                        {org.icon || org.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-medium flex-1 text-xs">{org.name}</span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Expand Button */}
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
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
                  {/* Organization Avatar */}
                  <div
                    className="flex size-8 items-center justify-center rounded-lg text-white font-bold text-xs flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: currentOrg?.color || "#6366f1" }}
                  >
                    {currentOrg?.logoUrl ? (
                      <img src={currentOrg.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span>{currentOrg?.icon || currentOrg?.name?.charAt(0)?.toUpperCase() || "🏢"}</span>
                    )}
                  </div>

                  {/* Org and Project Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs truncate text-sidebar-foreground">
                        {currentOrg?.name || "Select Workspace"}
                      </span>
                      {userRole === "owner" && (
                        <Crown className="size-3 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                      <span className="truncate font-medium">{currentProject?.name || "Project"}</span>
                      {userRole && (
                        <>
                          <span>•</span>
                          <span className="capitalize text-[10px]">{userRole}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronsUpDown className="size-3.5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-64 rounded-xl p-1.5 font-sans" align="start">
                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
                  Workspaces ({userOrgs.length})
                </DropdownMenuLabel>
                {userOrgs.map((org) => {
                  const isSelected = org.id === currentOrg?.id;
                  return (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => setCurrentOrg(org)}
                      className="gap-2 px-2 py-1.5 cursor-pointer"
                    >
                      <div
                        className="flex size-6 items-center justify-center rounded-md text-white font-semibold text-xs"
                        style={{ backgroundColor: org.color || "#6366f1" }}
                      >
                        {org.icon || org.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-medium flex-1 text-xs">{org.name}</span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}

                <DropdownMenuSeparator className="my-1" />

                {/* Projects List */}
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Projects ({orgProjects.length})
                  </span>
                  {canUserEdit() && (
                    <button
                      onClick={() => setShowCreateProj(true)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="size-3" />
                      <span>New</span>
                    </button>
                  )}
                </div>
                {orgProjects.map((proj) => {
                  const isSelected = proj.id === currentProject?.id;
                  return (
                    <DropdownMenuItem
                      key={proj.id}
                      onClick={() => setCurrentProject(proj)}
                      className="gap-2 px-2 py-1.5 cursor-pointer"
                    >
                      <div
                        className="flex size-5 items-center justify-center rounded text-white text-[10px]"
                        style={{ backgroundColor: proj.color || "#6366f1" }}
                      >
                        {proj.icon || "🎯"}
                      </div>
                      <span className="truncate text-xs flex-1">{proj.name}</span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Collapse Toggle Button */}
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </>
        )}
      </div>

      {/* 2. Main Navigation Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 font-sans">
        {/* ------------------------------------------------------------- */}
        {/* 1. DESIGN TOKENS GROUP */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Design Token
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
              <Layers className={`size-4 flex-shrink-0 ${sidebarTab === "tokens" ? "text-primary" : "text-muted-foreground"}`} />
              {!isCollapsed && <span>Tokens</span>}
            </div>
            {!isCollapsed && allSetNames.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {allSetNames.length}
              </span>
            )}
          </button>

          {/* Themes & Modes */}
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
              <Palette className={`size-4 flex-shrink-0 ${sidebarTab === "themes" ? "text-violet-500" : "text-muted-foreground"}`} />
              {!isCollapsed && <span>Themes</span>}
            </div>
            {!isCollapsed && themeGroups.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {themeGroups.length}
              </span>
            )}
          </button>

          {/* Variables (Figma Native) */}
          <button
            onClick={() => setSidebarTab("variables")}
            title="Variables"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "variables"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Sparkles className={`size-4 flex-shrink-0 ${sidebarTab === "variables" ? "text-violet-500" : "text-muted-foreground"}`} />
              {!isCollapsed && <span>Variables</span>}
            </div>
            {!isCollapsed && (
              figmaResolvedVariables.length > 0 ? (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
                  {figmaResolvedVariables.length}
                </span>
              ) : (
                <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground">Figma</Badge>
              )
            )}
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. OUTPUTS & TOOLS GROUP */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Outputs &amp; Tools
            </div>
          )}

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
            <Download className="size-4 flex-shrink-0 text-muted-foreground" />
            {!isCollapsed && <span>Exports</span>}
          </button>

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
              <Package className="size-4 flex-shrink-0 text-muted-foreground" />
              {!isCollapsed && <span>Releases</span>}
            </div>
            {!isCollapsed && releases.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {releases.length}
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
              <FileText className="size-4 flex-shrink-0 text-muted-foreground" />
              {!isCollapsed && <span>Documentation</span>}
            </div>
            {!isCollapsed && <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">Beta</Badge>}
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
              <ImageIcon className="size-4 flex-shrink-0 text-muted-foreground" />
              {!isCollapsed && <span>Assets</span>}
            </div>
            {!isCollapsed && <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">Beta</Badge>}
          </button>

          {/* Git Log */}
          <button
            onClick={() => setSidebarTab("activity")}
            title="Git Log"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "activity"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <GitBranch className="size-4 flex-shrink-0 text-muted-foreground" />
            {!isCollapsed && <span>Git Log</span>}
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. PLATFORM GROUP */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Platform
            </div>
          )}

          {/* Workspaces & Projects Management */}
          <button
            onClick={() => setSidebarTab("dashboard")}
            title="Workspaces & Projects"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "dashboard" || (sidebarTab as string) === "workspaces"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Building2 className="size-4 flex-shrink-0 text-muted-foreground" />
              {!isCollapsed && <span>Workspaces &amp; Projects</span>}
            </div>
            {!isCollapsed && (
              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                {orgProjects.length}
              </Badge>
            )}
          </button>

          {/* Sync Providers (Git + Figma Plugin) */}
          <button
            onClick={() => setSidebarTab("integrations")}
            title="Sync Providers"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "integrations" || (sidebarTab as string) === "sync"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Link2 className="size-4 flex-shrink-0 text-muted-foreground" />
              {!isCollapsed && <span>Sync Providers</span>}
            </div>
            {credentials.owner && credentials.repo ? (
              <span className="size-2 rounded-full bg-emerald-500 flex-shrink-0" title="Git Connected" />
            ) : !isCollapsed ? (
              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">Connect</Badge>
            ) : null}
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. SETTINGS & TEAM GROUP */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-1 pt-2 border-t border-sidebar-border">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Settings &amp; Team
            </div>
          )}

          {/* Members */}
          <button
            onClick={() => {
              setSidebarTab("members");
              setMembersSubTab("members");
            }}
            title="Team Members"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "members"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Users className="size-4 flex-shrink-0 text-muted-foreground" />
              {!isCollapsed && <span>Team Members</span>}
            </div>
            {!isCollapsed && currentOrg?.members && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {currentOrg.members.length}
              </span>
            )}
          </button>

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
            <Settings className="size-4 flex-shrink-0 text-muted-foreground" />
            {!isCollapsed && <span>Project Settings</span>}
          </button>

          {/* Organization Settings */}
          <button
            onClick={() => setSidebarTab("org-settings")}
            title="Workspace Settings"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "org-settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <Building2 className="size-4 flex-shrink-0 text-muted-foreground" />
            {!isCollapsed && <span>Workspace Settings</span>}
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
            <Code2 className="size-4 flex-shrink-0 text-muted-foreground" />
            {!isCollapsed && <span>MCP &amp; CLI</span>}
          </button>
        </div>
      </div>

      {/* 3. Footer: User Account & Logout */}
      <div className="p-2 border-t border-sidebar-border">
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center ${isCollapsed ? "justify-center p-1" : "gap-2.5 p-2"} rounded-lg hover:bg-sidebar-accent transition-colors text-left group`}>
                <Avatar className="size-8 rounded-lg flex-shrink-0">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="grid flex-1 text-left leading-tight truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-xs text-sidebar-foreground">
                          {currentUser.displayName}
                        </span>
                        {userRole === "owner" && <Crown className="size-3 text-amber-500 flex-shrink-0" />}
                      </div>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {currentUser.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-hover:text-sidebar-foreground flex-shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 rounded-xl p-1.5 font-sans"
              side={isCollapsed ? "right" : "top"}
              align={isCollapsed ? "end" : "end"}
              sideOffset={8}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2.5 px-2 py-1.5 text-left text-xs">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                      {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 leading-tight truncate">
                    <span className="truncate font-semibold text-foreground">
                      {currentUser.displayName}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {currentUser.email}
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
              v0.1.0-beta
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
