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
  Layers,
  Palette,
  X,
} from "lucide-react";
import { AddThemeOptionModal } from "@/components/AddThemeOptionModal";
import { AddSetModal } from "@/components/AddSetModal";
import { buildSetFolderTree, getValidTokenSetNames, SetTreeNode } from "@/utils/themeHelpers";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const SecondarySidebar: React.FC = () => {
  const {
    sidebarTab,
    rawTokens,
    activeSet,
    setActiveSet,
    themeGroups,
    activeThemeGroupId,
    activeThemeOptionId,
    setActiveThemeGroup,
    setActiveThemeOption,
    canUserEdit,
  } = useTokenStore();

  const isEditable = canUserEdit();
  const [addModalGroupId, setAddModalGroupId] = useState<string | null>(null);
  const [isAddSetOpen, setIsAddSetOpen] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [searchFilter, setSearchFilter] = useState("");

  // Extract all valid set names based on $metadata.json (tokenSetOrder), $themes.json, or valid token sets
  const allSetNames = useMemo(() => {
    return getValidTokenSetNames(rawTokens);
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
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/70 text-foreground cursor-pointer font-medium text-xs transition-colors group select-none"
            style={{ paddingLeft: `${Math.max(depth * 12 + 6, 6)}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
              className="p-0.5 text-muted-foreground group-hover:text-foreground"
            >
              {isCollapsed ? (
                <ChevronRight className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>

            {isCollapsed ? (
              <Folder className="size-3.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <FolderOpen className="size-3.5 text-muted-foreground flex-shrink-0" />
            )}

            <span className="truncate text-xs font-medium text-foreground">
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
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
          isSelected
            ? "bg-primary/10 text-primary font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
        }`}
        style={{ paddingLeft: `${Math.max(depth * 12 + 18, 18)}px` }}
      >
        <div className="flex items-center gap-2 truncate">
          <File className={`size-3.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
          <span className="truncate">{node.name}</span>
        </div>
        {isSelected && (
          <span className="size-1.5 rounded-full bg-primary flex-shrink-0" />
        )}
      </button>
    );
  };

  if (sidebarTab !== "tokens" && sidebarTab !== "themes") {
    return null;
  }

  return (
    <aside className="w-60 flex-shrink-0 border-r border-border bg-sidebar/50 dark:bg-[#0c0c10] flex flex-col h-full select-none text-xs font-sans">
      {/* ================= TOKENS SECONDARY SIDEBAR ================= */}
      {sidebarTab === "tokens" && (
        <>
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span className="font-bold text-xs text-foreground">Token Sets</span>
              {allSetNames.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                  {allSetNames.length}
                </Badge>
              )}
            </div>
            {isEditable && (
              <button
                onClick={() => setIsAddSetOpen(true)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Add Token Set"
              >
                <Plus className="size-3.5" />
              </button>
            )}
          </div>

          {/* Search Filter */}
          <div className="p-2 border-b border-border/60">
            <div className="relative">
              <Search className="size-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter token sets..."
                className="h-8 text-xs pl-7 pr-6 bg-background/60"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Sets Tree List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {setTree.map((node) => renderTreeNode(node, 0))}
          </div>

          {/* Bottom Add Set Button */}
          {isEditable && (
            <div className="p-2 border-t border-border">
              <button
                onClick={() => setIsAddSetOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed border-border hover:border-primary/50 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
              >
                <Plus className="size-3.5" />
                <span>Add Token Set</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* ================= THEMES SECONDARY SIDEBAR ================= */}
      {sidebarTab === "themes" && (
        <>
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-violet-500" />
              <span className="font-bold text-xs text-foreground">Theme Groups</span>
              {themeGroups.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                  {themeGroups.length}
                </Badge>
              )}
            </div>
          </div>

          {/* Theme Groups List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {themeGroups.map((grp) => {
              const isGroupActive = activeThemeGroupId === grp.id;
              return (
                <div key={grp.id} className="space-y-1.5">
                  <div
                    onClick={() => setActiveThemeGroup(grp.id)}
                    className={`flex items-center justify-between text-xs font-bold rounded-md px-1.5 py-1 cursor-pointer transition-colors ${
                      isGroupActive ? "bg-muted/70 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="size-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: grp.color }}
                      />
                      <span className="truncate uppercase tracking-wider text-[11px] font-bold">
                        {grp.name}
                      </span>
                    </div>
                    {isEditable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddModalGroupId(grp.id);
                        }}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Add Theme Option / Mode"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {grp.options.map((opt) => {
                      const isSelected = activeThemeGroupId === grp.id && activeThemeOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setActiveThemeGroup(grp.id);
                            setActiveThemeOption(opt.id);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                          }`}
                        >
                          <span className="truncate">{opt.name}</span>
                          {isSelected && (
                            <span className="size-1.5 rounded-full bg-primary-foreground flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modals */}
      {isEditable && (
        <>
          <AddSetModal
            isOpen={isAddSetOpen}
            onClose={() => setIsAddSetOpen(false)}
          />

          <AddThemeOptionModal
            isOpen={Boolean(addModalGroupId)}
            defaultGroupId={addModalGroupId || undefined}
            onClose={() => setAddModalGroupId(null)}
          />
        </>
      )}
    </aside>
  );
};
