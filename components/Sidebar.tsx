"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Folder,
  FolderOpen,
  File,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Home,
  Layers,
  Palette,
  FileText,
  Image as ImageIcon,
  Download,
  Package,
  Clock,
  Settings,
  Users,
  Link2,
  Code2,
} from "lucide-react";
import { AddThemeOptionModal } from "@/components/AddThemeOptionModal";
import { AddSetModal } from "@/components/AddSetModal";
import { ManageOrgModal } from "@/components/ManageOrgModal";
import { buildSetFolderTree, SetTreeNode } from "@/utils/themeHelpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface SidebarProps {
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const {
    themeGroups,
    activeThemeGroupId,
    activeThemeOptionId,
    setActiveThemeGroup,
    setActiveThemeOption,
    rawTokens,
    sidebarTab,
    setSidebarTab,
    activeSet,
    setActiveSet,
    releases,
    currentOrg,
  } = useTokenStore();

  const [addModalGroupId, setAddModalGroupId] = useState<string | null>(null);
  const [isAddSetOpen, setIsAddSetOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [searchFilter, setSearchFilter] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Extract all non-metadata set names from rawTokens
  const allSetNames = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  }, [rawTokens]);

  // Build folder-wise hierarchical tree for the Tokens tab
  const setTree = useMemo(() => {
    return buildSetFolderTree(allSetNames);
  }, [allSetNames]);

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const renderTreeNode = (node: SetTreeNode, depth: number = 0) => {
    if (node.isFolder) {
      const isCollapsed = Boolean(collapsedFolders[node.id]);

      if (searchFilter) {
        const matchesName = node.name.toLowerCase().includes(searchFilter.toLowerCase());
        const hasMatchingChild = node.children?.some((c) =>
          c.fullPath.toLowerCase().includes(searchFilter.toLowerCase())
        );
        if (!matchesName && !hasMatchingChild) return null;
      }

      return (
        <div key={node.id} className="space-y-0.5">
          <div
            onClick={() => toggleFolder(node.id)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/80 text-foreground cursor-pointer font-semibold text-xs transition-colors group select-none"
            style={{ paddingLeft: `${Math.max(depth * 14 + 6, 6)}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
              className="p-0.5 text-muted-foreground group-hover:text-foreground"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {isCollapsed ? (
              <Folder className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}

            <span className="truncate text-xs font-semibold text-foreground">
              {node.name}
            </span>
          </div>

          {!isCollapsed && node.children && (
            <div className="space-y-0.5">
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf token set file
    if (searchFilter && !node.name.toLowerCase().includes(searchFilter.toLowerCase())) {
      return null;
    }

    const isSelected = activeSet === node.fullPath;

    return (
      <button
        key={node.id}
        onClick={() => setActiveSet(node.fullPath)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all cursor-pointer select-none text-left ${
          isSelected
            ? "bg-primary text-primary-foreground font-bold shadow-xs"
            : "text-foreground hover:bg-muted font-medium"
        }`}
        style={{ paddingLeft: `${Math.max(depth * 14 + 18, 18)}px` }}
      >
        <File
          className={`w-3.5 h-3.5 flex-shrink-0 stroke-[1.5] ${
            isSelected ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        />
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full border-r border-border font-sans select-none flex-shrink-0">
      {/* 1. PRIMARY LEFT NAVIGATION RAIL */}
      <aside className="w-[18rem] bg-background border-r border-border flex flex-col justify-between p-3 select-none flex-shrink-0">
        <div className="space-y-4">
          {/* Main App Navigation Section */}
          <nav className="space-y-0.5">
            {/* 1. Dashboard */}
            <button
              onClick={() => setSidebarTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "dashboard"
                  ? "bg-muted text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <Home className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span>Dashboard</span>
            </button>

            {/* 2. Tokens */}
            <button
              onClick={() => setSidebarTab("tokens")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "tokens"
                  ? "bg-muted text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span>Tokens</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {allSetNames.length}
              </span>
            </button>

            {/* 3. Theme */}
            <button
              onClick={() => setSidebarTab("themes")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "themes"
                  ? "bg-muted text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <div className="flex items-center gap-3">
                <Palette className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span>Theme</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                {themeGroups.length}
              </span>
            </button>

            {/* 4. Documentation (Beta) */}
            <button
              onClick={() => setSidebarTab("documentation")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "documentation"
                  ? "bg-muted text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span>Documentation</span>
              </div>
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-normal text-muted-foreground bg-muted/40">
                Beta
              </Badge>
            </button>

            {/* 5. Assets (Beta) */}
            <button
              onClick={() => setSidebarTab("assets")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "assets"
                  ? "bg-muted text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span>Assets</span>
              </div>
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-normal text-muted-foreground bg-muted/40">
                Beta
              </Badge>
            </button>

            {/* 6. Exports */}
            <button
              onClick={() => setSidebarTab("exports")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "exports"
                  ? "bg-muted text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <Download className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span>Exports</span>
            </button>

            {/* 7. Releases */}
            <button
              onClick={() => setSidebarTab("releases")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "releases"
                  ? "bg-muted text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span>Releases</span>
              </div>
              {releases.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                  {releases.length}
                </span>
              )}
            </button>

            {/* 8. Activity */}
            <button
              onClick={() => setSidebarTab("activity")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "activity"
                  ? "bg-muted text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span>Activity</span>
            </button>
          </nav>

          {/* SETTINGS Category Section */}
          <div className="space-y-1 pt-2 border-t border-border/70">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              SETTINGS
            </div>

            {/* Project Settings */}
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span>Project Settings</span>
            </button>

            {/* Members */}
            <button
              onClick={() => setIsManageMembersOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span>Members</span>
              </div>
              {currentOrg?.members && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {currentOrg.members.length}
                </span>
              )}
            </button>

            {/* Integrations */}
            <button
              onClick={() => setSidebarTab("integrations")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "integrations"
                  ? "bg-muted text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <Link2 className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span>Integrations</span>
            </button>

            {/* MCP & CLI */}
            <button
              onClick={() => setSidebarTab("mcp")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "mcp"
                  ? "bg-muted text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <Code2 className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span>MCP &amp; CLI</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-3 py-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono select-none border-t border-border/70 pt-2">
          <span>Tokens Platform</span>
          <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
            v0.1.0-beta
          </Badge>
        </div>
      </aside>

      {/* 2. SECONDARY CONTEXTUAL DRAWER (For Tokens or Themes) */}
      {(sidebarTab === "tokens" || sidebarTab === "themes") && (
        <aside className="w-60 bg-muted/20 flex flex-col flex-shrink-0 overflow-hidden select-none animate-in fade-in duration-150">
          {/* Header depending on active tab */}
          <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-muted/40 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {sidebarTab === "tokens" ? "Sets" : "Theme Groups"}
              </span>
              <Badge variant="secondary" className="text-[10px] font-mono font-semibold px-1.5 py-0">
                {sidebarTab === "tokens" ? allSetNames.length : themeGroups.length}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowSearch(!showSearch)}
                className={`h-7 w-7 ${showSearch ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                title="Search"
              >
                <Search className="w-3.5 h-3.5" />
              </Button>

              {sidebarTab === "tokens" ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsAddSetOpen(true)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Add Token Set"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setAddModalGroupId(activeThemeGroupId || themeGroups[0]?.id || "new")}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Add Theme Option"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Optional Search Input */}
          {showSearch && (
            <div className="p-2 border-b border-border bg-background/60">
              <div className="relative">
                <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder={sidebarTab === "tokens" ? "Filter sets..." : "Filter themes..."}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-7 pl-6 text-xs"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Drawer Body: Sets Tree OR Theme Groups List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sidebarTab === "tokens" ? (
              <>
                {/* "All Sets" special filter button */}
                <button
                  onClick={() => setActiveSet("ALL")}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer select-none text-left mb-1 ${
                    activeSet === "ALL"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-foreground hover:bg-muted font-medium"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 flex-shrink-0 stroke-[1.5]" />
                  <span>All Token Sets</span>
                </button>

                {setTree.map((node) => renderTreeNode(node))}
              </>
            ) : (
              themeGroups.map((group) => {
                const isGroupActive = group.id === activeThemeGroupId;
                return (
                  <div key={group.id} className="space-y-1 mb-3">
                    <div
                      onClick={() => setActiveThemeGroup(group.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                        isGroupActive
                          ? "text-primary bg-primary/10"
                          : "text-foreground hover:bg-muted/80"
                      }`}
                    >
                      <span className="truncate uppercase tracking-wider text-[11px]">
                        {group.name}
                      </span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                        {group.options.length}
                      </Badge>
                    </div>

                    <div className="space-y-0.5 pl-2">
                      {group.options.map((opt) => {
                        const isSelected =
                          isGroupActive && activeThemeOptionId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setActiveThemeGroup(group.id);
                              setActiveThemeOption(opt.id);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                            }`}
                          >
                            <span className="truncate">{opt.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Modals */}
      <AddSetModal
        isOpen={isAddSetOpen}
        onClose={() => setIsAddSetOpen(false)}
      />
      <AddThemeOptionModal
        isOpen={Boolean(addModalGroupId)}
        onClose={() => setAddModalGroupId(null)}
        defaultGroupId={addModalGroupId || undefined}
      />
      <ManageOrgModal
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
      />
    </div>
  );
};
