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
  Sparkles,
  Eye,
  SlidersHorizontal,
  FolderPlus,
  Package,
} from "lucide-react";
import { AddThemeOptionModal } from "@/components/AddThemeOptionModal";
import { AddSetModal } from "@/components/AddSetModal";
import { buildSetFolderTree, SetTreeNode } from "@/utils/themeHelpers";

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
    credentials,
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

  // Helper to count enabled sets for each theme option
  const getEnabledSetCount = (option: any) => {
    if (!option?.selectedTokenSets) return 0;
    return Object.values(option.selectedTokenSets).filter(
      (status) => status === "enabled"
    ).length;
  };

  // Recursive Tree Node Renderer matching the reference visual style
  const renderTreeNode = (node: SetTreeNode, depth: number = 0) => {
    if (node.isFolder) {
      const isCollapsed = Boolean(collapsedFolders[node.id]);

      // If search filter is active, check if any child matches
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
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 cursor-pointer font-semibold text-xs transition-colors group select-none"
            style={{ paddingLeft: `${Math.max(depth * 14 + 6, 6)}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
              className="p-0.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {isCollapsed ? (
              <Folder className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
            )}

            <span className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
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
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer select-none text-left ${
          isSelected
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 font-medium"
        }`}
        style={{ paddingLeft: `${Math.max(depth * 14 + 18, 18)}px` }}
      >
        <File
          className={`w-3.5 h-3.5 flex-shrink-0 stroke-[1.5] ${
            isSelected ? "text-white dark:text-zinc-900" : "text-zinc-400"
          }`}
        />
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full border-r border-zinc-200 dark:border-zinc-800/80 font-sans select-none flex-shrink-0">
      {/* 1. PRIMARY LEFT NAVIGATION RAIL */}
      <aside className="w-52 bg-white dark:bg-[#0c0c10] border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between p-3 select-none flex-shrink-0">
        <div className="space-y-3">
          {/* Primary Navigation Tabs */}
          <nav className="space-y-1">
            {/* Tab: Dashboard */}
            <button
              onClick={() => setSidebarTab("dashboard")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                sidebarTab === "dashboard"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* Tab: Tokens */}
            <button
              onClick={() => setSidebarTab("tokens")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                sidebarTab === "tokens"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 flex-shrink-0" />
                <span>Tokens</span>
              </div>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-semibold ${
                  sidebarTab === "tokens"
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                }`}
              >
                {allSetNames.length}
              </span>
            </button>

            {/* Tab: Themes */}
            <button
              onClick={() => setSidebarTab("themes")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                sidebarTab === "themes"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 flex-shrink-0" />
                <span>Themes</span>
              </div>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-semibold ${
                  sidebarTab === "themes"
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                }`}
              >
                {themeGroups.length}
              </span>
            </button>

            {/* Tab: Releases */}
            <button
              onClick={() => setSidebarTab("releases")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                sidebarTab === "releases"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium"
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
                      ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                  }`}
                >
                  {releases.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Bottom: Project Settings & Web App Version */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 space-y-1">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>Project settings</span>
          </button>

          <div className="px-3 py-1 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-600 font-mono select-none">
            <span>Second Screen</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-500 dark:text-zinc-400">
              v0.1.0-beta
            </span>
          </div>
        </div>
      </aside>

      {/* 2. SECONDARY CONTEXTUAL DRAWER (Only for Tokens and Themes) */}
      {(sidebarTab === "tokens" || sidebarTab === "themes") && (
        <aside className="w-60 bg-zinc-50/70 dark:bg-[#09090d] flex flex-col flex-shrink-0 overflow-hidden select-none animate-in fade-in duration-150">
          {/* Header depending on active tab */}
          <div className="h-12 border-b border-zinc-200 dark:border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-50/90 dark:bg-[#0b0b10] flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                {sidebarTab === "tokens" ? "Sets" : "Theme Groups"}
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-mono font-semibold">
                {sidebarTab === "tokens" ? allSetNames.length : themeGroups.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                  showSearch ? "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : ""
                }`}
                title="Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {sidebarTab === "tokens" && (
                <button
                  onClick={() => setIsAddSetOpen(true)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Add New Token Set"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}

              {sidebarTab === "themes" && (
                <button
                  onClick={() => setAddModalGroupId(themeGroups[0]?.id || "new")}
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Add Theme Option"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Filter Bar (if open) */}
          {showSearch && (
            <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-emerald-500"
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer text-left mb-1 ${
                    activeSet === "ALL"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 font-medium"
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
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors text-left ${
                        activeThemeGroupId === group.id
                          ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color || "#10b981" }}
                        />
                        <span className="truncate">{group.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
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
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer text-left ${
                              isOptionActive
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 font-medium"
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
                                isOptionActive ? "opacity-90" : "text-zinc-400"
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
