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
    releases,
    addToast,
    getCurrentUserRole,
  } = useTokenStore();

  const [showCreateProj, setShowCreateProj] = useState(false);

  const userRole = getCurrentUserRole();
  const roleDef = ROLE_DEFINITIONS[userRole];

  // Extract all non-metadata set names from rawTokens
  const allSetNames = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
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
    <aside className="w-56 flex-shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-full select-none text-xs font-sans">
      {/* 1. Header: Organization & Project Selector (shadcn team-switcher) */}
      <div className="p-3 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left group">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-xs">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight truncate">
                <span className="truncate font-bold text-xs text-sidebar-foreground">
                  {currentOrg?.name || "Select Organization"}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {currentProject?.name || "Select Project"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-hover:text-sidebar-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-60 rounded-xl p-1.5 font-sans"
            align="start"
            sideOffset={6}
          >
            {/* Organizations List */}
            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
              Organizations ({userOrgs.length})
            </DropdownMenuLabel>
            {userOrgs.map((org) => {
              const isSelected = org.id === currentOrg?.id;
              return (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setCurrentOrg(org)}
                  className="gap-2 px-2 py-1.5 cursor-pointer"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background font-semibold text-xs text-foreground">
                    {org.name.charAt(0).toUpperCase()}
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
              <button
                onClick={() => setShowCreateProj(true)}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                <Plus className="size-3" />
                <span>New</span>
              </button>
            </div>
            {orgProjects.map((proj) => {
              const isSelected = proj.id === currentProject?.id;
              return (
                <DropdownMenuItem
                  key={proj.id}
                  onClick={() => setCurrentProject(proj)}
                  className="gap-2 px-2 py-1.5 cursor-pointer"
                >
                  <Layers className="size-3.5 text-muted-foreground" />
                  <span className="truncate text-xs flex-1">{proj.name}</span>
                  {isSelected && <Check className="size-3.5 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. Main Navigation Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 font-sans">
        {/* PLATFORM GROUP */}
        <div className="space-y-1">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Platform
          </div>

          {/* Dashboard */}
          <button
            onClick={() => setSidebarTab("dashboard")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "dashboard"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <Home className="size-4 flex-shrink-0 text-muted-foreground" />
            <span>Dashboard</span>
          </button>

          {/* Variables (Figma Native) */}
          <button
            onClick={() => setSidebarTab("variables")}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "variables"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className={`size-4 flex-shrink-0 ${sidebarTab === "variables" ? "text-violet-500" : "text-muted-foreground"}`} />
              <span>Variables</span>
            </div>
            {figmaResolvedVariables.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
                {figmaResolvedVariables.length}
              </span>
            ) : (
              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground">Figma</Badge>
            )}
          </button>

          {/* Tokens */}
          <button
            onClick={() => setSidebarTab("tokens")}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "tokens"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className={`size-4 flex-shrink-0 ${sidebarTab === "tokens" ? "text-primary" : "text-muted-foreground"}`} />
              <span>Tokens</span>
            </div>
            {allSetNames.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {allSetNames.length}
              </span>
            )}
          </button>

          {/* Themes & Modes */}
          <button
            onClick={() => setSidebarTab("themes")}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "themes"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Palette className={`size-4 flex-shrink-0 ${sidebarTab === "themes" ? "text-violet-500" : "text-muted-foreground"}`} />
              <span>Themes</span>
            </div>
            {themeGroups.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {themeGroups.length}
              </span>
            )}
          </button>

          {/* Documentation */}
          <button
            onClick={() => setSidebarTab("documentation")}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "documentation"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="size-4 flex-shrink-0 text-muted-foreground" />
              <span>Documentation</span>
            </div>
            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">Beta</Badge>
          </button>

          {/* Assets */}
          <button
            onClick={() => setSidebarTab("assets")}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "assets"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <div className="flex items-center gap-2.5">
              <ImageIcon className="size-4 flex-shrink-0 text-muted-foreground" />
              <span>Assets</span>
            </div>
            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">Beta</Badge>
          </button>

          {/* Exports */}
          <button
            onClick={() => setSidebarTab("exports")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "exports"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <Download className="size-4 flex-shrink-0 text-muted-foreground" />
            <span>Exports</span>
          </button>

          {/* Releases */}
          <button
            onClick={() => setSidebarTab("releases")}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "releases"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Package className="size-4 flex-shrink-0 text-muted-foreground" />
              <span>Releases</span>
            </div>
            {releases.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {releases.length}
              </span>
            )}
          </button>

          {/* Activity */}
          <button
            onClick={() => setSidebarTab("activity")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "activity"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <Clock className="size-4 flex-shrink-0 text-muted-foreground" />
            <span>Activity</span>
          </button>
        </div>

        {/* SETTINGS GROUP */}
        <div className="space-y-1 pt-2 border-t border-sidebar-border">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Settings &amp; Workspace
          </div>

          {/* Project Settings */}
          <button
            onClick={() => setSidebarTab("project-settings")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "project-settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <Settings className="size-4 flex-shrink-0 text-muted-foreground" />
            <span>Project Settings</span>
          </button>

          {/* Members */}
          <button
            onClick={() => setSidebarTab("members")}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "members"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="size-4 flex-shrink-0 text-muted-foreground" />
              <span>Members</span>
            </div>
            {currentOrg?.members && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {currentOrg.members.length}
              </span>
            )}
          </button>

          {/* Organization Settings */}
          <button
            onClick={() => setSidebarTab("org-settings")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "org-settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <Building2 className="size-4 flex-shrink-0 text-muted-foreground" />
            <span>Organization Settings</span>
          </button>

          {/* Integrations */}
          <button
            onClick={() => setSidebarTab("integrations")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "integrations"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <Link2 className="size-4 flex-shrink-0 text-muted-foreground" />
            <span>Integrations</span>
          </button>

          {/* MCP & CLI */}
          <button
            onClick={() => setSidebarTab("mcp")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${sidebarTab === "mcp"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
              }`}
          >
            <Code2 className="size-4 flex-shrink-0 text-muted-foreground" />
            <span>MCP &amp; CLI</span>
          </button>
        </div>
      </div>

      {/* 3. Footer: User Account & Logout */}
      <div className="p-2 border-t border-sidebar-border">
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left group">
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
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
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-hover:text-sidebar-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 rounded-xl p-1.5 font-sans"
              side="top"
              align="end"
              sideOffset={6}
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
        ) : (
          <div className="px-3 py-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono select-none">
            <span>Tokens Platform</span>
            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
              v0.1.0-beta
            </Badge>
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={showCreateProj}
        onClose={() => setShowCreateProj(false)}
      />
    </aside>
  );
};
