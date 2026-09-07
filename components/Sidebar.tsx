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
  Link2,
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
  } = useTokenStore();

  const [showCreateProj, setShowCreateProj] = useState(false);
  const [isCollapsedState, setIsCollapsed] = useState(false);
  const isCollapsed = mode === "docked" && isCollapsedState;

  const userRole = getCurrentUserRole();
  const roleDef = ROLE_DEFINITIONS[userRole];

  // Extract all valid set names based on $metadata.json ($themes.json or valid token sets)
  const allSetNames = useMemo(() => {
    return getValidTokenSetNames(rawTokens);
  }, [rawTokens]);

  const isGitConfigured = Boolean(
    currentUser && credentials.provider && credentials.owner && credentials.repo
  );

  useEffect(() => {
    if (isGitConfigured && sidebarTab === "branches") {
      setSidebarTab("tokens");
    }
  }, [isGitConfigured, sidebarTab, setSidebarTab]);

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
                  {/* Organization/Project Avatar */}
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex-shrink-0">
                    {currentProject?.name?.charAt(0)?.toUpperCase() || "P"}
                  </div>

                  {/* Project and Workspace Info */}
                  <div className="flex-1 min-w-0 leading-tight">
                    <div className="font-semibold text-xs truncate text-sidebar-foreground">
                      {currentProject?.name || "Planet"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {currentOrg?.name || "JustGo"}
                    </div>
                  </div>

                  <ChevronsUpDown className="size-3.5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-64 rounded-xl p-1.5 font-sans" align="start">
                <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <span>RECENT PROJECTS</span>
                  {canUserEdit() && (
                    <button
                      onClick={() => setShowCreateProj(true)}
                      className="p-0.5 hover:text-foreground transition-colors cursor-pointer"
                      title="Add project"
                    >
                      <Plus className="size-3" />
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
                      <div className="flex size-5 items-center justify-center rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {proj.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-xs flex-1">{proj.name}</span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}

                <DropdownMenuSeparator className="my-1" />

                <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <span>CURRENT WORKSPACE</span>
                </div>
                <DropdownMenuItem
                  onClick={() => setSidebarTab("org-settings")}
                  className="gap-2 px-2 py-1.5 cursor-pointer"
                >
                  <div
                    className="flex size-5 items-center justify-center rounded text-white text-[10px] font-bold"
                    style={{ backgroundColor: currentOrg?.color || "#6366f1" }}
                  >
                    {currentOrg?.name?.charAt(0)?.toUpperCase() || "J"}
                  </div>
                  <span className="truncate text-xs flex-1">{currentOrg?.name || "JustGo"}</span>
                </DropdownMenuItem>
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
        <div className="space-y-0.5">
          {/* Dashboard */}
          <button
            onClick={() => setSidebarTab("dashboard")}
            title="Dashboard"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "dashboard"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <Home className="size-4 flex-shrink-0" />
            {!isCollapsed && <span>Dashboard</span>}
          </button>

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

          {/* Schema Marketplace */}
          <button
            onClick={() => setSidebarTab("variables")}
            title="Schema Marketplace"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "variables"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <Lightbulb className="size-4 flex-shrink-0 text-muted-foreground" />
            {!isCollapsed && <span>Schema Marketplace</span>}
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

          {/* Branches */}
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

        {/* ------------------------------------------------------------- */}
        {/* SETTINGS SECTION */}
        {/* ------------------------------------------------------------- */}
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

          {/* Members */}
          <button
            onClick={() => {
              setSidebarTab("members");
              setMembersSubTab("members");
            }}
            title="Members"
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-2.5 py-2"} rounded-lg text-xs transition-all cursor-pointer ${
              sidebarTab === "members"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Users className="size-4 flex-shrink-0" />
              {!isCollapsed && <span>Members</span>}
            </div>
            {!isCollapsed && currentOrg?.members && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {currentOrg.members.length}
              </span>
            )}
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
      </div>

      {/* 3. Trial Notice Card (When Expanded) */}
      {!isCollapsed && (
        <div className="px-2 pt-1">
          <div className="p-3 rounded-xl bg-[#FEFCE8] border border-[#FEF08A] text-foreground">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="font-semibold text-xs text-amber-900 leading-tight">13 days left in trial</div>
                <div className="text-[11px] text-amber-700/90 leading-tight">Add a payment method to keep access</div>
                <button
                  onClick={() => setSidebarTab("org-settings")}
                  className="mt-2 w-full py-1.5 px-2.5 rounded-lg bg-[#FDE047] hover:bg-[#FACC15] text-amber-950 font-semibold text-xs transition-colors cursor-pointer text-center"
                >
                  Add billing details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Support & Utility Links */}
      {!isCollapsed && (
        <div className="px-2 py-1 space-y-0.5 text-xs text-muted-foreground border-t border-sidebar-border mt-2">
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

          <button
            onClick={() =>
              addToast({
                type: "info",
                title: "Support",
                message: "Connecting to Tokens Studio support team...",
              })
            }
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:text-foreground hover:bg-sidebar-accent/50 transition-colors text-left cursor-pointer"
          >
            <MessageSquare className="size-4 flex-shrink-0" />
            <span>Chat with Support</span>
          </button>
        </div>
      )}

      {/* 5. Footer: User Account */}
      <div className="p-2 border-t border-sidebar-border">
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center ${isCollapsed ? "justify-center p-1" : "gap-2.5 p-2"} rounded-lg hover:bg-sidebar-accent transition-colors text-left group cursor-pointer`}>
                <div className="size-7 rounded-full bg-fuchsia-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                  {currentUser.displayName
                    ? currentUser.displayName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : "EK"}
                </div>
                {!isCollapsed && (
                  <>
                    <div className="grid flex-1 text-left leading-tight truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-xs text-sidebar-foreground">
                          {currentUser.displayName || "Enamul Khan"}
                        </span>
                        {userRole === "owner" && <Crown className="size-3 text-amber-500 flex-shrink-0" />}
                      </div>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {currentUser.email || "enamulkhanbd@yahoo.com"}
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
                  <div className="size-7 rounded-full bg-fuchsia-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {currentUser.displayName
                      ? currentUser.displayName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : "EK"}
                  </div>
                  <div className="grid flex-1 leading-tight truncate">
                    <span className="truncate font-semibold text-foreground">
                      {currentUser.displayName || "Enamul Khan"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {currentUser.email || "enamulkhanbd@yahoo.com"}
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
