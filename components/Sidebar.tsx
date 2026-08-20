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
  LayoutDashboard,
  Layers,
  Palette,
  Settings,
  Package,
} from "lucide-react";
import { AddThemeOptionModal } from "@/components/AddThemeOptionModal";
import { AddSetModal } from "@/components/AddSetModal";
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
  } = useTokenStore();

  const [addModalGroupId, setAddModalGroupId] = useState<string | null>(null);
  const [isAddSetOpen, setIsAddSetOpen] = useState(false);
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

  const getEnabledSetCount = (option: any) => {
    if (!option?.selectedTokenSets) return 0;
    return Object.values(option.selectedTokenSets).filter(
      (status) => status === "enabled"
    ).length;
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
      <aside className="w-52 bg-background border-r border-border flex flex-col justify-between p-3 select-none flex-shrink-0">
        <div className="space-y-3">
          {/* Primary Navigation Tabs */}
          <nav className="space-y-1">
            {/* Tab: Dashboard */}
            <button
              onClick={() => setSidebarTab("dashboard")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "dashboard"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* Tab: Tokens */}
            <button
              onClick={() => setSidebarTab("tokens")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "tokens"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 flex-shrink-0" />
                <span>Tokens</span>
              </div>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-semibold ${
                  sidebarTab === "tokens"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {allSetNames.length}
              </span>
            </button>

            {/* Tab: Themes */}
            <button
              onClick={() => setSidebarTab("themes")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "themes"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 flex-shrink-0" />
                <span>Themes</span>
              </div>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-semibold ${
                  sidebarTab === "themes"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {themeGroups.length}
              </span>
            </button>

            {/* Tab: Releases */}
            <button
              onClick={() => setSidebarTab("releases")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                sidebarTab === "releases"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 flex-shrink-0" />
                <span>Releases</span>
              </div>
              {releases.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-semibold ${
                    sidebarTab === "releases"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {releases.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Bottom: Project Settings & Web App Version */}
        <div className="pt-3 border-t border-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="w-full justify-start gap-2.5 text-xs text-muted-foreground hover:text-foreground h-8 font-medium"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span>Project settings</span>
          </Button>

          <div className="px-3 py-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono select-none">
            <span>Second Screen</span>
            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
              v0.1.0-beta
            </Badge>
          </div>
        </div>
      </aside>

      {/* 2. SECONDARY CONTEXTUAL DRAWER (Only for Tokens and Themes) */}
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

              {sidebarTab === "tokens" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsAddSetOpen(true)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Add New Token Set"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}

              {sidebarTab === "themes" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setAddModalGroupId(themeGroups[0]?.id || "new")}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Add Theme Option"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Search Filter Bar (if open) */}
          {showSearch && (
            <div className="px-3 py-2 border-b border-border bg-background">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Filter..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-7 pl-8 text-xs"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* View 1: Tokens Hierarchical Sets Tree */}
            {sidebarTab === "tokens" && (
              <div className="space-y-0.5">
                {/* Option to select ALL Sets */}
                <button
                  onClick={() => setActiveSet("ALL")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer text-left mb-1 ${
                    activeSet === "ALL"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-foreground hover:bg-muted font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>All Sets</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">
                    {allSetNames.length}
                  </span>
                </button>

                {/* Tree View */}
                {setTree.map((node) => renderTreeNode(node, 0))}
              </div>
            )}

            {/* View 2: Themes Explorer */}
            {sidebarTab === "themes" && (
              <div className="space-y-3 p-1">
                {themeGroups.map((group) => (
                  <div key={group.id} className="space-y-1">
                    <button
                      onClick={() => setActiveThemeGroup(group.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors text-left ${
                        activeThemeGroupId === group.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color || "#7c3aed" }}
                        />
                        <span className="truncate">{group.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {group.options.length}
                      </span>
                    </button>

                    {/* Theme Options */}
                    <div className="space-y-0.5 pl-3">
                      {group.options.map((option) => {
                        const isOptionActive = activeThemeOptionId === option.id;
                        const enabledCount = getEnabledSetCount(option);

                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              setActiveThemeGroup(group.id);
                              setActiveThemeOption(option.id);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-all cursor-pointer text-left ${
                              isOptionActive
                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: option.color || group.color }}
                              />
                              <span className="truncate">{option.name}</span>
                            </div>
                            <span
                              className={`text-[10px] font-mono ${
                                isOptionActive ? "opacity-90" : "text-muted-foreground"
                              }`}
                            >
                              {enabledCount} sets
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Add Theme Option Modal */}
      {addModalGroupId && (
        <AddThemeOptionModal
          isOpen={Boolean(addModalGroupId)}
          defaultGroupId={addModalGroupId}
          onClose={() => setAddModalGroupId(null)}
        />
      )}

      {/* Add Token Set Modal */}
      {isAddSetOpen && (
        <AddSetModal
          isOpen={isAddSetOpen}
          onClose={() => setIsAddSetOpen(false)}
        />
      )}
    </div>
  );
};
