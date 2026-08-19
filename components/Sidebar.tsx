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
  Droplet,
  Layers,
  LayoutDashboard,
  Palette,
} from "lucide-react";
import { AddThemeOptionModal } from "@/components/AddThemeOptionModal";
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
  } = useTokenStore();

  const [addModalGroupId, setAddModalGroupId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [searchFilter, setSearchFilter] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const isEmpty = Object.keys(rawTokens).length === 0;

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

  // Recursive Tree Node Renderer for Tokens Tab
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
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 cursor-pointer font-medium text-[13px] transition-colors group"
            style={{ paddingLeft: `${Math.max(depth * 12 + 8, 8)}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
              className="p-0.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {isCollapsed ? (
              <Folder className="w-4 h-4 text-zinc-500 dark:text-zinc-400 fill-zinc-400/20" />
            ) : (
              <FolderOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-300 fill-zinc-400/20" />
            )}

            <span className="truncate font-semibold">{node.name}</span>
          </div>

          {!isCollapsed && node.children && (
            <div className="space-y-0.5">
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf Set Item
    if (
      searchFilter &&
      !node.name.toLowerCase().includes(searchFilter.toLowerCase()) &&
      !node.fullPath.toLowerCase().includes(searchFilter.toLowerCase())
    ) {
      return null;
    }

    const isSelected = activeSet === node.fullPath;

    return (
      <div
        key={node.id}
        onClick={() => setActiveSet(node.fullPath)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-[13px] transition-all ${
          isSelected
            ? "bg-[#e6f4ea] dark:bg-[#1a382b]/80 text-[#137333] dark:text-[#81c995] font-semibold"
            : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40 font-medium"
        }`}
        style={{ paddingLeft: `${Math.max(depth * 12 + 20, 20)}px` }}
      >
        <File className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-[#137333] dark:text-[#81c995]" : "text-zinc-400 dark:text-zinc-500"}`} />
        <span className="truncate">{node.name}</span>
      </div>
    );
  };

  return (
    <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0d0d11] flex flex-col justify-between select-none overflow-hidden font-sans transition-colors">
      {/* 1. Primary Vertical Navigation Tabs */}
      <div className="p-3 space-y-1 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30">
        {/* Dashboard Tab */}
        <button
          onClick={() => setSidebarTab("dashboard")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-all cursor-pointer ${
            sidebarTab === "dashboard"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850/60 font-medium border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <LayoutDashboard
              className={`w-4 h-4 flex-shrink-0 ${
                sidebarTab === "dashboard"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            />
            <span className="truncate">Dashboard</span>
          </div>
        </button>

        {/* Tokens Tab */}
        <button
          onClick={() => setSidebarTab("tokens")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-all cursor-pointer ${
            sidebarTab === "tokens"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850/60 font-medium border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Layers
              className={`w-4 h-4 flex-shrink-0 ${
                sidebarTab === "tokens"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            />
            <span className="truncate">Tokens</span>
          </div>
          {allSetNames.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
                sidebarTab === "tokens"
                  ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {allSetNames.length}
            </span>
          )}
        </button>

        {/* Themes Tab */}
        <button
          onClick={() => setSidebarTab("themes")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-all cursor-pointer ${
            sidebarTab === "themes"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850/60 font-medium border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Palette
              className={`w-4 h-4 flex-shrink-0 ${
                sidebarTab === "themes"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            />
            <span className="truncate">Themes</span>
          </div>
          {themeGroups.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
                sidebarTab === "themes"
                  ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {themeGroups.length}
            </span>
          )}
        </button>
      </div>

      {/* 2. Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* ======================= DASHBOARD TAB ======================= */}
        {sidebarTab === "dashboard" && (
          <div className="space-y-4">
            <div className="px-1 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Overview & Shortcuts
            </div>
            <div className="space-y-2">
              <div
                onClick={() => setSidebarTab("themes")}
                className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800/60 cursor-pointer transition-all text-xs space-y-1"
              >
                <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Themes Matrix</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  {themeGroups.length} theme groups configured
                </p>
              </div>

              <div
                onClick={() => setSidebarTab("tokens")}
                className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800/60 cursor-pointer transition-all text-xs space-y-1"
              >
                <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Token Sets</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  {allSetNames.length} sets in workspace
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TOKENS TAB ======================= */}
        {sidebarTab === "tokens" && (
          <div className="space-y-3">
            {/* Header: Sets {count} + Search + Add */}
            <div className="flex items-center justify-between px-1 text-zinc-800 dark:text-zinc-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Sets
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold font-mono">
                  {allSetNames.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    showSearch
                      ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                  title="Search sets"
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setAddModalGroupId("new")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Add new set"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Search Input */}
            {showSearch && (
              <div className="px-1">
                <input
                  type="text"
                  placeholder="Filter sets..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-emerald-500 font-sans"
                  autoFocus
                />
              </div>
            )}

            {/* "All Sets" Filter Option */}
            <div
              onClick={() => setActiveSet("ALL")}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-[13px] transition-all ${
                activeSet === "ALL"
                  ? "bg-[#e6f4ea] dark:bg-[#1a382b]/80 text-[#137333] dark:text-[#81c995] font-semibold"
                  : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40 font-medium"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>All Sets</span>
            </div>

            {/* Folder-wise Hierarchical Tree */}
            {isEmpty || setTree.length === 0 ? (
              <div className="px-3 py-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                No token sets found
              </div>
            ) : (
              <div className="space-y-0.5 pt-1">
                {setTree.map((node) => renderTreeNode(node, 0))}

                {/* Special configuration files if present ($themes, $metadata) */}
                {rawTokens["$themes"] && (
                  <div
                    onClick={() => setActiveSet("$themes")}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-[13px] transition-all mt-2 border-t border-zinc-100 dark:border-zinc-850 pt-2 ${
                      activeSet === "$themes"
                        ? "bg-[#e6f4ea] dark:bg-[#1a382b]/80 text-[#137333] dark:text-[#81c995] font-semibold"
                        : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40 font-medium"
                    }`}
                  >
                    <File className={`w-3.5 h-3.5 flex-shrink-0 ${activeSet === "$themes" ? "text-[#137333] dark:text-[#81c995]" : "text-amber-500"}`} />
                    <span className="truncate">$themes.json</span>
                  </div>
                )}
                {rawTokens["$metadata"] && (
                  <div
                    onClick={() => setActiveSet("$metadata")}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-[13px] transition-all ${
                      activeSet === "$metadata"
                        ? "bg-[#e6f4ea] dark:bg-[#1a382b]/80 text-[#137333] dark:text-[#81c995] font-semibold"
                        : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40 font-medium"
                    }`}
                  >
                    <File className={`w-3.5 h-3.5 flex-shrink-0 ${activeSet === "$metadata" ? "text-[#137333] dark:text-[#81c995]" : "text-amber-500"}`} />
                    <span className="truncate">$metadata.json</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================= THEMES TAB ======================= */}
        {sidebarTab === "themes" && (
          <div className="space-y-4">
            {/* Header: Themes + Create group button */}
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                Themes
              </span>
              <button
                onClick={() => setAddModalGroupId(activeThemeGroupId || themeGroups[0]?.id || "new")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create group</span>
              </button>
            </div>

            {/* Theme Groups List (Screenshot 2: Green Pill Header + Option list with droplet and set counts) */}
            {isEmpty || themeGroups.length === 0 ? (
              <div className="px-3 py-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                No theme groups configured
              </div>
            ) : (
              <div className="space-y-4">
                {themeGroups.map((group) => {
                  const isGroupActive = group.id === activeThemeGroupId;

                  return (
                    <div key={group.id} className="space-y-2">
                      {/* Theme Group Header Card */}
                      <div
                        onClick={() => setActiveThemeGroup(group.id)}
                        className="group/header flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-100/90 dark:bg-zinc-900/90 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 cursor-pointer transition-all border border-zinc-200/60 dark:border-zinc-800/80"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Green Vertical Pill Accent */}
                          <span
                            className="w-1.5 h-4 rounded-full flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: group.color || "#22c55e" }}
                          />
                          <span className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {group.name}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveThemeGroup(group.id);
                            setAddModalGroupId(group.id);
                          }}
                          className="opacity-0 group-hover/header:opacity-100 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                          title={`Add option to ${group.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Theme Options (light, dark) with droplet icon and set count badge */}
                      {group.options.length > 0 && (
                        <div className="space-y-1 pl-2">
                          {group.options.map((option) => {
                            const isOptionActive =
                              isGroupActive && option.id === activeThemeOptionId;
                            const setCount = getEnabledSetCount(option);

                            return (
                              <div
                                key={option.id}
                                onClick={() => {
                                  setActiveThemeGroup(group.id);
                                  setActiveThemeOption(option.id);
                                }}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-sm transition-all ${
                                  isOptionActive
                                    ? "bg-[#e6f4ea] dark:bg-[#1a382b]/80 text-[#137333] dark:text-[#81c995] font-semibold"
                                    : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 font-medium"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Droplet
                                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                                      isOptionActive
                                        ? "text-[#137333] dark:text-[#81c995] fill-[#137333]/20"
                                        : "text-zinc-500 dark:text-zinc-400"
                                    }`}
                                  />
                                  <span className="truncate">{option.name}</span>
                                </div>

                                {/* Enabled Sets Badge (e.g. '19 sets', '21 sets') */}
                                <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-xs font-mono border border-zinc-200/60 dark:border-zinc-700/60 font-medium">
                                  {setCount} sets
                                </span>
                              </div>
                            );
                          })}
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

      {/* 3. Bottom Footer Info */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#0b0b0f] text-xs text-zinc-400 dark:text-zinc-500 flex items-center justify-between font-mono">
        <span>Tokens Studio</span>
        <span className="text-[11px]">v2.0</span>
      </div>

      {/* Add Theme Option Modal */}
      <AddThemeOptionModal
        isOpen={Boolean(addModalGroupId)}
        onClose={() => setAddModalGroupId(null)}
        defaultGroupId={addModalGroupId || undefined}
      />
    </aside>
  );
};
