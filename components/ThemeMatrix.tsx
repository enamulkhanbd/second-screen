"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  buildThemeMatrix,
  MatrixRowData,
  MatrixCellData,
  TokenCategory,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getCategoryForType,
  buildTokenGroupTree,
  TokenGroupNode,
} from "@/utils/themeHelpers";
import { formatTypographySummary } from "@/utils/transformTokens";
import { AddThemeOptionModal } from "@/components/AddThemeOptionModal";
import { EditThemeGroupModal } from "@/components/EditThemeGroupModal";
import { EditTokenDrawer } from "@/components/EditTokenDrawer";
import { FlattenedToken } from "@/types/tokens";
import {
  Folder,
  MoreVertical,
  Plus,
  Settings,
  FolderGit2,
  RefreshCw,
  Sparkles,
  Search,
  Type,
  X,
  Check,
  Palette,
  MoveHorizontal,
  Ruler,
  Square,
  Layers,
  Eye,
  Tag,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Pencil,
  Copy,
  Trash2,
  Download,
  AlertTriangle,
  MoreHorizontal,
  Edit2,
  FolderTree,
  List,
  ChevronsUpDown,
  ChevronsDownUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ThemeMatrixProps {
  onOpenSettings?: () => void;
}

const CATEGORY_CONFIG: Record<
  TokenCategory,
  {
    label: string;
    icon: React.ElementType;
    badgeStyle: string;
    iconColor: string;
    dotColor: string;
  }
> = {
  color: {
    label: "Color",
    icon: Palette,
    badgeStyle: "bg-amber-500/10 border-amber-500/20 text-amber-500",
    iconColor: "text-amber-500",
    dotColor: "bg-amber-500",
  },
  typography: {
    label: "Typography",
    icon: Type,
    badgeStyle: "bg-violet-500/10 border-violet-500/20 text-violet-500",
    iconColor: "text-violet-500",
    dotColor: "bg-violet-500",
  },
  spacing: {
    label: "Spacing",
    icon: MoveHorizontal,
    badgeStyle: "bg-blue-500/10 border-blue-500/20 text-blue-500",
    iconColor: "text-blue-500",
    dotColor: "bg-blue-500",
  },
  sizing: {
    label: "Sizing",
    icon: Ruler,
    badgeStyle: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
    iconColor: "text-emerald-500",
    dotColor: "bg-emerald-500",
  },
  borderRadius: {
    label: "Border & Radius",
    icon: Square,
    badgeStyle: "bg-rose-500/10 border-rose-500/20 text-rose-500",
    iconColor: "text-rose-500",
    dotColor: "bg-rose-500",
  },
  boxShadow: {
    label: "Shadow",
    icon: Layers,
    badgeStyle: "bg-cyan-500/10 border-cyan-500/20 text-cyan-500",
    iconColor: "text-cyan-500",
    dotColor: "bg-cyan-500",
  },
  opacity: {
    label: "Opacity",
    icon: Eye,
    badgeStyle: "bg-yellow-500/10 border-yellow-500/20 text-yellow-500",
    iconColor: "text-yellow-500",
    dotColor: "bg-yellow-500",
  },
  other: {
    label: "Other",
    icon: Tag,
    badgeStyle: "bg-muted text-muted-foreground",
    iconColor: "text-muted-foreground",
    dotColor: "bg-muted-foreground",
  },
};

export const ThemeMatrix: React.FC<ThemeMatrixProps> = ({ onOpenSettings }) => {
  const {
    rawTokens,
    themeGroups,
    activeThemeGroupId,
    updateSingleToken,
    credentials,
    setRawTokens,
    setSyncStatus,
    addToast,
    duplicateThemeGroup,
    deleteThemeGroup,
    deleteToken,
    highlightedTokenKey,
    setHighlightedTokenKey,
    canUserEdit,
  } = useTokenStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingToken, setEditingToken] = useState<FlattenedToken | null>(null);
  const [showAddOptionModal, setShowAddOptionModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Grouping state for multi-level hierarchical tree view
  const [isGroupedView, setIsGroupedView] = useState<boolean>(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Pagination state for ultra-fast rendering with large token sets
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Auto-scroll and flash row if highlightedTokenKey changes
  useEffect(() => {
    if (!highlightedTokenKey) return;

    const rowId = `token-row-${highlightedTokenKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const el = document.getElementById(rowId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const timer = setTimeout(() => {
      setHighlightedTokenKey(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [highlightedTokenKey, setHighlightedTokenKey]);

  // Reset to page 1 when search or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, activeThemeGroupId]);

  const activeGroup = useMemo(() => {
    return (
      themeGroups.find((g) => g.id === activeThemeGroupId) ||
      themeGroups[0] ||
      null
    );
  }, [themeGroups, activeThemeGroupId]);

  const matrixRows = useMemo(() => {
    if (!activeGroup) return [];
    return buildThemeMatrix(rawTokens, activeGroup);
  }, [rawTokens, activeGroup]);

  // Compute token category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    matrixRows.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [matrixRows]);

  const availableCategories = useMemo(() => {
    return CATEGORY_ORDER.filter((c) => Boolean(categoryCounts[c]));
  }, [categoryCounts]);

  const filteredRows = useMemo(() => {
    let list = matrixRows;
    if (selectedCategory !== "all") {
      list = list.filter((r) => r.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          String(r.tokenKey || "").toLowerCase().includes(q) ||
          Object.values(r.cells).some(
            (c) =>
              String(c?.rawValue || "").toLowerCase().includes(q) ||
              String(c?.resolvedValue || "").toLowerCase().includes(q)
          )
      );
    }
    return list;
  }, [matrixRows, selectedCategory, searchQuery]);

  // Multi-level recursive group tree from filtered rows
  const groupTree = useMemo(() => {
    return buildTokenGroupTree(filteredRows, (row) => row.tokenKey.split("."));
  }, [filteredRows]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const expandAllGroups = () => {
    setCollapsedGroups({});
  };

  const collapseAllGroups = () => {
    const allCollapsed: Record<string, boolean> = {};
    const traverse = (node: TokenGroupNode<MatrixRowData>) => {
      allCollapsed[node.id] = true;
      node.subgroups.forEach(traverse);
    };
    groupTree.forEach(traverse);
    setCollapsedGroups(allCollapsed);
  };

  const totalFilteredCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  // Slice rows for the current page in flat mode
  const displayRows = useMemo(() => {
    if (pageSize === 0) return filteredRows; // 0 = show all
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const isConfigured = Boolean(credentials.repo && credentials.owner);
  const hasTokens = Object.keys(rawTokens).length > 0;

  const handleSyncPull = async () => {
    if (!credentials.pat) {
      if (onOpenSettings) onOpenSettings();
      return;
    }

    setIsPulling(true);
    setSyncStatus("fetching");

    try {
      const res = await fetch("/api/git/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Fetch failed (${res.status})`);
      }

      setRawTokens(data.tokens, data.syncMeta);
      setSyncStatus("success");
      addToast({
        type: "success",
        title: "Tokens Synced from Git",
        message: `Updated tokens from branch ${credentials.branch || "main"}.`,
      });
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: "Git Pull Failed",
        message: err.message,
      });
    } finally {
      setIsPulling(false);
    }
  };

  const renderMatrixRow = (row: MatrixRowData, level: number = 0) => {
    const config = CATEGORY_CONFIG[row.category] || CATEGORY_CONFIG.other;
    const isHighlighted = highlightedTokenKey === row.tokenKey;
    const rowId = `token-row-${String(row.tokenKey || "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const tokenParts = String(row.tokenKey || "").split(".");
    const leafName = tokenParts[tokenParts.length - 1] || row.tokenKey;

    return (
      <tr
        key={row.tokenKey}
        id={rowId}
        className={`transition-all duration-200 group ${
          isHighlighted
            ? "bg-primary/15 ring-1 ring-primary shadow-xs"
            : "hover:bg-muted/40"
        }`}
      >
        {/* Token Key Name + Type Icon */}
        <td
          className="py-2.5 px-6 text-foreground text-[13px] font-mono select-text align-middle leading-relaxed"
          style={{ paddingLeft: isGroupedView ? `${Math.max(24, (level + 1) * 20 + 16)}px` : "24px" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotColor}`}
              title={`Type: ${config.label}`}
            />
            <div className="flex flex-col min-w-0">
              <span className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                {isGroupedView ? leafName : typeof row.tokenKey === "string" ? row.tokenKey : String(row.tokenKey || "")}
              </span>
              {isGroupedView && tokenParts.length > 1 && (
                <span className="text-[10px] text-muted-foreground font-mono truncate opacity-60">
                  {row.tokenKey}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Option Columns */}
        {activeGroup?.options.map((option) => {
          const cellData = row.cells[option.name];

          return (
            <td key={option.id} className="py-2 px-6 align-middle">
              <MatrixPillCell
                cellData={cellData}
                rawTokens={rawTokens}
                tokenType={row.type}
                tokenCategory={row.category}
                tokenKey={row.tokenKey}
                optionName={option.name}
                onUpdate={updateSingleToken}
              />
            </td>
          );
        })}

        {/* Far Right Action Menu Column */}
        <td className="py-2 px-4 text-right align-middle w-12">
          <div className="flex items-center justify-end">
            <MatrixRowActionMenu
              row={row}
              activeGroup={activeGroup}
              onEdit={(token) => {
                if (!canUserEdit()) {
                  addToast({
                    type: "info",
                    title: "Read-Only Access",
                    message: "Viewer role cannot edit design tokens.",
                  });
                  return;
                }
                setEditingToken(token);
              }}
              onDelete={(token) => {
                if (!canUserEdit()) {
                  addToast({
                    type: "info",
                    title: "Read-Only Access",
                    message: "Viewer role cannot delete design tokens.",
                  });
                  return;
                }
                deleteToken(token.setName, token.name.split("."));
              }}
            />
          </div>
        </td>
      </tr>
    );
  };

  const renderGroupTree = (node: TokenGroupNode<MatrixRowData>): React.ReactNode => {
    const isCollapsed = Boolean(collapsedGroups[node.id]);
    const totalCols = (activeGroup?.options?.length || 0) + 2;

    const levelBg = [
      "bg-muted/70 text-foreground font-bold border-t border-b border-border/80", // Level 1
      "bg-muted/50 text-foreground font-semibold border-t border-b border-border/60", // Level 2
      "bg-muted/30 text-foreground/90 font-medium border-t border-b border-border/40", // Level 3
      "bg-muted/15 text-foreground/80 font-medium border-t border-border/20", // Level 4+
    ];
    const headerClass = levelBg[Math.min(node.level - 1, levelBg.length - 1)];

    return (
      <React.Fragment key={node.id}>
        {/* Group Header Row */}
        <tr
          onClick={() => toggleGroup(node.id)}
          className={`${headerClass} hover:bg-muted/90 transition-colors cursor-pointer select-none`}
        >
          <td
            colSpan={totalCols}
            className="py-2.5 px-6 align-middle"
            style={{ paddingLeft: `${Math.max(20, (node.level - 1) * 20 + 20)}px` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground p-0.5 rounded transition-transform">
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </span>

                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-background/80 border border-border/60 text-muted-foreground uppercase flex-shrink-0">
                  L{node.level}
                </span>

                <span className="font-mono text-xs font-semibold text-foreground tracking-tight truncate">
                  {node.name}
                </span>

                {node.level > 1 && (
                  <span className="text-[11px] text-muted-foreground font-mono truncate hidden md:inline opacity-60">
                    ({node.fullPath})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-[10px] font-mono py-0 px-2 bg-background/60">
                  {node.totalTokenCount} {node.totalTokenCount === 1 ? "token" : "tokens"}
                </Badge>
              </div>
            </div>
          </td>
        </tr>

        {/* Group Contents */}
        {!isCollapsed && (
          <>
            {node.subgroups.map((sub) => renderGroupTree(sub))}
            {node.items.map((row) => renderMatrixRow(row, node.level))}
          </>
        )}
      </React.Fragment>
    );
  };

  // Empty state if no tokens loaded
  if (!hasTokens) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xl space-y-6 text-foreground">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FolderGit2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">No Tokens Loaded</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect to your Git repository (GitHub / Azure DevOps) or load sample data to explore multi-theme token matrix.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {isConfigured ? (
              <Button
                onClick={handleSyncPull}
                disabled={isPulling}
                className="gap-2 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? "animate-spin" : ""}`} />
                <span>Pull from Git</span>
              </Button>
            ) : (
              <Button
                onClick={onOpenSettings}
                className="gap-2 text-xs"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Connect Repository</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden select-none">
      {/* Top Controls Sub-Header Bar */}
      <div className="h-12 px-6 border-b border-border bg-muted/20 flex items-center justify-between flex-shrink-0 transition-colors">
        {/* Left: Active Theme Group Badge & Actions */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">{typeof activeGroup?.name === "string" ? activeGroup.name : String(activeGroup?.name || "Theme")}</span>
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: activeGroup?.color || "#7c3aed" }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Theme Group Actions"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2.5 py-1.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: activeGroup?.color || "#7c3aed" }}
                  />
                  <span className="font-semibold text-xs text-foreground truncate">
                    {typeof activeGroup?.name === "string" ? activeGroup.name : String(activeGroup?.name || "")}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {activeGroup?.options.length} options
                </span>
              </div>

              <DropdownMenuItem
                onClick={() => setShowAddOptionModal(true)}
                className="gap-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Add theme option</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setShowEditGroupModal(true)}
                className="gap-2 text-xs"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-500" />
                <span>Rename & edit color</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => activeGroup && duplicateThemeGroup(activeGroup.id)}
                className="gap-2 text-xs"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-500" />
                <span>Duplicate theme group</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  if (activeGroup) {
                    const jsonStr = JSON.stringify(activeGroup, null, 2);
                    navigator.clipboard.writeText(jsonStr);
                    addToast({
                      type: "success",
                      title: "Theme Group JSON Copied",
                      message: `Copied "${activeGroup.name}" definition to clipboard.`,
                    });
                  }
                }}
                className="gap-2 text-xs"
              >
                <Download className="w-3.5 h-3.5 text-amber-500" />
                <span>Copy group JSON</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setShowDeleteConfirm(true)}
                disabled={themeGroups.length <= 1}
                className="gap-2 text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete theme group</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Search Filter & + Add option Button */}
        <div className="flex items-center gap-3">
          {/* Sync Provider Badge */}
          {credentials.repo && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/60 text-[11px] font-mono text-muted-foreground">
              <FolderGit2 className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground truncate max-w-[120px]">{credentials.repo}</span>
              <span className="text-[10px]">@{credentials.branch || "main"}</span>
            </div>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Filter tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs font-mono w-52"
            />
          </div>

          <Button
            size="sm"
            onClick={() => setShowAddOptionModal(true)}
            className="gap-1.5 h-8 text-xs font-semibold"
            title={`Add option to ${activeGroup?.name || "Theme"}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add option</span>
          </Button>
        </div>
      </div>

      {/* Sync Provider Notification Banner when unlinked */}
      {!credentials.repo && (
        <div className="px-6 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>
              Connect a <strong>Git Sync Provider</strong> (GitHub, GitLab, Azure DevOps, Bitbucket) to version and sync multi-theme tokens with your repository.
            </span>
          </div>
          {onOpenSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              className="h-6 text-[11px] px-2 font-medium"
            >
              Connect Provider
            </Button>
          )}
        </div>
      )}

      {/* Minimal Token Type Filter, Grouping Switcher & Actions Sub-Bar */}
      <div className="h-11 px-6 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0 select-none overflow-x-auto scrollbar-none transition-colors">
        {/* Left: Minimal Type Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Type:</span>
          </span>

          {/* All Chips */}
          <button
            onClick={() => setSelectedCategory("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              selectedCategory === "all"
                ? "bg-background text-foreground font-semibold shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <span>All Types</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedCategory === "all"
                  ? "bg-muted text-foreground"
                  : "bg-muted/80 text-muted-foreground"
              }`}
            >
              {filteredRows.length}
            </span>
          </button>

          {/* Individual Type Chips */}
          {availableCategories.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-background text-foreground font-semibold shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? config.iconColor : "text-muted-foreground"}`} />
                <span>{config.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? "bg-muted text-foreground"
                      : "bg-muted/80 text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Grouped vs Flat View Toggle & Expand/Collapse Controls */}
        <div className="flex items-center gap-2">
          {isGroupedView && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAllGroups}
                className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1"
                title="Expand All Groups"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Expand All</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAllGroups}
                className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1"
                title="Collapse All Groups"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Collapse All</span>
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
            </div>
          )}

          {/* Grouped / Flat View Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-[11px]">
            <button
              onClick={() => setIsGroupedView(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                isGroupedView
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grouped View (Hierarchical Tree)"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Grouped</span>
            </button>
            <button
              onClick={() => setIsGroupedView(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                !isGroupedView
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Flat List View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Flat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Matrix */}
      <div className="flex-1 overflow-auto bg-background transition-colors">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center select-none">
            <p className="text-base font-semibold text-foreground">No matching tokens found</p>
            <p className="text-xs text-muted-foreground mt-1.5">Try adjusting your search filter or selected token type.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header: TOKEN | OPTION_A | OPTION_B | (ACTIONS) */}
            <thead className="sticky top-0 z-20 bg-muted/80 border-b border-border text-xs font-bold text-foreground tracking-wider shadow-xs backdrop-blur-md">
              <tr>
                <th className="py-3 px-6 w-1/3 font-bold uppercase text-muted-foreground">
                  TOKEN {isGroupedView && <span className="text-[10px] font-normal lowercase">({groupTree.length} groups)</span>}
                </th>
                {activeGroup?.options.map((option) => (
                  <th
                    key={option.id}
                    className="py-3 px-6 font-bold uppercase text-foreground"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{typeof option.name === "string" ? option.name : String(option.name || "")}</span>
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 w-12 text-right"></th>
              </tr>
            </thead>

            {/* Table Body: Grouped Hierarchical View vs Flat View */}
            <tbody className="divide-y divide-border font-mono">
              {isGroupedView ? (
                groupTree.map((node) => renderGroupTree(node))
              ) : (
                displayRows.map((row) => renderMatrixRow(row, 0))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination & Token Count Status Bar */}
      {totalFilteredCount > 0 && (
        <div className="h-10 px-6 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-foreground font-semibold font-mono">{displayRows.length}</strong> of{" "}
              <strong className="text-foreground font-semibold font-mono">{totalFilteredCount}</strong> tokens
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 border-l border-border pl-3">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground font-mono outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={0}>All</option>
              </select>
            </div>
          </div>

          {/* Page Navigation Buttons */}
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="font-mono text-xs text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Token Slide-Over Drawer */}
      <EditTokenDrawer
        token={editingToken}
        isOpen={Boolean(editingToken)}
        onClose={() => setEditingToken(null)}
        onSave={updateSingleToken}
      />

      {/* Add Theme Option Modal */}
      <AddThemeOptionModal
        isOpen={showAddOptionModal}
        onClose={() => setShowAddOptionModal(false)}
        defaultGroupId={activeGroup?.id}
      />

      {/* Edit Theme Group Modal */}
      {activeGroup && (
        <EditThemeGroupModal
          isOpen={showEditGroupModal}
          onClose={() => setShowEditGroupModal(false)}
          groupId={activeGroup.id}
        />
      )}

      {/* Delete Group Confirmation Modal */}
      {activeGroup && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <DialogTitle>Delete Theme Group</DialogTitle>
              </div>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  "{typeof activeGroup.name === "string" ? activeGroup.name : String(activeGroup.name || "")}"
                </span>
                ? This will remove all {activeGroup.options.length} options configured for this group.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  deleteThemeGroup(activeGroup.id);
                  setShowDeleteConfirm(false);
                }}
              >
                Delete Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

interface MatrixRowActionMenuProps {
  row: MatrixRowData;
  activeGroup: any;
  onEdit: (token: FlattenedToken) => void;
  onDelete: (token: FlattenedToken) => void;
}

const MatrixRowActionMenu: React.FC<MatrixRowActionMenuProps> = ({
  row,
  activeGroup,
  onEdit,
  onDelete,
}) => {
  const { resolvedTokens, addToast } = useTokenStore();
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const targetToken: FlattenedToken = useMemo(() => {
    const existing = resolvedTokens.find((t) => t.name === row.tokenKey);
    if (existing) return existing;

    const firstCell = Object.values(row.cells)[0];
    const setName = firstCell?.tokenPath?.[0] || "global";
    const path = row.tokenKey.split(".");
    return {
      id: `${setName}.${row.tokenKey}`,
      name: row.tokenKey,
      path: [setName, ...path],
      group: path[0] || "other",
      setName,
      type: row.type as any,
      rawValue: firstCell?.rawValue || "",
      resolvedValue: firstCell?.resolvedValue || "",
      isAlias: Boolean(firstCell?.rawValue?.startsWith("{")),
    };
  }, [resolvedTokens, row]);

  const handleCopy = (text: string, type: "name" | "css") => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => {
        setCopiedType(null);
      }, 800);
      addToast({
        type: "info",
        title: "Copied to Clipboard",
        message: text,
      });
    }
  };

  const cssVarName = `var(--${row.tokenKey.replace(/\./g, "-")})`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Token Actions (Edit, Copy, Delete)"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => onEdit(targetToken)}
          className="gap-2 text-xs"
        >
          <Edit2 className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold">Edit token</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleCopy(row.tokenKey, "name")}
          className="gap-2 text-xs font-mono justify-between"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3 h-3 text-muted-foreground" />
            <span>Copy Name</span>
          </div>
          {copiedType === "name" && <Check className="w-3 h-3 text-emerald-500" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleCopy(cssVarName, "css")}
          className="gap-2 text-xs font-mono justify-between"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3 h-3 text-muted-foreground" />
            <span>Copy CSS Var</span>
          </div>
          {copiedType === "css" && <Check className="w-3 h-3 text-emerald-500" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            if (confirm(`Delete token "${row.tokenKey}"?`)) {
              onDelete(targetToken);
            }
          }}
          className="gap-2 text-xs text-destructive focus:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete token</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface MatrixPillCellProps {
  cellData?: MatrixCellData;
  rawTokens?: any;
  tokenType: string;
  tokenCategory: TokenCategory;
  tokenKey: string;
  optionName: string;
  onUpdate: (path: string[], newValue: any) => void;
}

const MatrixPillCell: React.FC<MatrixPillCellProps> = React.memo(({
  cellData,
  rawTokens,
  tokenType,
  tokenCategory,
  tokenKey,
  optionName,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(cellData?.rawValue || "");
  const [showTypographyModal, setShowTypographyModal] = useState(false);

  React.useEffect(() => {
    setVal(cellData?.rawValue || "");
  }, [cellData?.rawValue]);

  if (!cellData) {
    return (
      <div className="text-muted-foreground text-[11px] font-mono italic px-3 py-1">
        -
      </div>
    );
  }

  // Check if cell is a composite typography object
  const isCompositeTypography =
    tokenCategory === "typography" &&
    (tokenType === "typography" ||
      (typeof cellData.rawValue === "string" &&
        cellData.rawValue.includes("fontFamily") &&
        cellData.rawValue.startsWith("{")));

  const isColor =
    tokenCategory === "color" ||
    tokenType === "color" ||
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(cellData.resolvedValue.trim()) ||
    /^rgba?\(.+\)$/i.test(cellData.resolvedValue.trim()) ||
    /^hsla?\(.+\)$/i.test(cellData.resolvedValue.trim());

  const isBorderRadius = tokenCategory === "borderRadius";
  const isSpacingOrSizing = tokenCategory === "spacing" || tokenCategory === "sizing";

  const handleBlur = () => {
    setIsEditing(false);
    if (val !== cellData.rawValue) {
      onUpdate(cellData.tokenPath, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setVal(cellData.rawValue);
      setIsEditing(false);
    }
  };

  if (isCompositeTypography) {
    let typoObj: Record<string, string> = {};
    try {
      typoObj = JSON.parse(cellData.rawValue);
    } catch {
      typoObj = {};
    }

    const summaryText = formatTypographySummary(
      cellData.rawValue,
      rawTokens,
      cellData.tokenPath?.[0]
    );

    return (
      <>
        <div
          onClick={() => setShowTypographyModal(true)}
          className="group inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-all max-w-sm w-full cursor-pointer shadow-xs min-h-[34px]"
          title="Click to inspect/edit typography token properties"
        >
          {/* Left: Aa Badge */}
          <div className="w-5 h-5 rounded flex items-center justify-center bg-primary/10 text-primary border border-primary/20 text-xs font-serif font-bold flex-shrink-0">
            Aa
          </div>

          {/* Right: Typography Summary */}
          <span className="flex-1 font-mono text-[13px] text-foreground group-hover:text-primary truncate">
            {summaryText}
          </span>
        </div>

        {/* Typography Inspector / Editor Modal */}
        {showTypographyModal && (
          <TypographyModal
            tokenKey={tokenKey}
            optionName={optionName}
            typoObj={typoObj}
            onClose={() => setShowTypographyModal(false)}
            onSave={(newObj) => {
              onUpdate(cellData.tokenPath, JSON.stringify(newObj));
              setShowTypographyModal(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div
      className={`group inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all max-w-sm w-full min-h-[34px] ${
        isEditing
          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
          : "border-border bg-card hover:bg-accent/40 shadow-xs"
      }`}
    >
      {/* Left: Swatch / Type Indicator */}
      {isColor ? (
        <div
          className="w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex-shrink-0 border border-black/20 dark:border-white/20 shadow-xs"
          style={{ backgroundColor: cellData.resolvedValue }}
          title={`Computed: ${cellData.resolvedValue}`}
        />
      ) : isBorderRadius ? (
        <div
          className="w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center flex-shrink-0"
          title={`Border Radius: ${cellData.resolvedValue}`}
        >
          <div
            className="w-2.5 h-2.5 border border-rose-500 dark:border-rose-400 bg-rose-400/30"
            style={{
              borderRadius: cellData.resolvedValue.includes("px") || cellData.resolvedValue.includes("rem")
                ? cellData.resolvedValue
                : "2px",
            }}
          />
        </div>
      ) : isSpacingOrSizing ? (
        <div
          className="w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex-shrink-0"
          title={`Dimension: ${cellData.resolvedValue}`}
        >
          {tokenCategory === "spacing" ? (
            <MoveHorizontal className="w-3 h-3" />
          ) : (
            <Ruler className="w-3 h-3" />
          )}
        </div>
      ) : (
        <div
          className="w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded flex items-center justify-center bg-muted border border-border text-muted-foreground text-[10px] font-mono flex-shrink-0 font-bold"
        >
          #
        </div>
      )}

      {/* Right: Editable Monospace Alias Text */}
      {isEditing ? (
        <input
          type="text"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[13px] text-primary outline-none font-mono min-w-0 font-medium"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className="flex-1 font-mono text-[13px] text-foreground group-hover:text-primary truncate cursor-text select-text font-medium"
          title={`Raw: ${cellData.rawValue} | Computed: ${cellData.resolvedValue}`}
        >
          {typeof cellData.rawValue === "object" ? JSON.stringify(cellData.rawValue) : String(cellData.rawValue ?? "")}
        </span>
      )}
    </div>
  );
});

interface TypographyModalProps {
  tokenKey: string;
  optionName: string;
  typoObj: Record<string, string>;
  onClose: () => void;
  onSave: (newObj: Record<string, string>) => void;
}

const TypographyModal: React.FC<TypographyModalProps> = ({
  tokenKey,
  optionName,
  typoObj,
  onClose,
  onSave,
}) => {
  const extractField = (v: any): string => {
    if (!v && v !== 0) return "";
    while (typeof v === "object" && v !== null && ("value" in v || "$value" in v)) {
      v = v.value !== undefined ? v.value : v.$value;
    }
    return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
  };

  const [form, setForm] = useState<Record<string, string>>({
    fontFamily: extractField(typoObj.fontFamily),
    fontWeight: extractField(typoObj.fontWeight),
    fontSize: extractField(typoObj.fontSize),
    lineHeight: extractField(typoObj.lineHeight),
    letterSpacing: extractField(typoObj.letterSpacing),
    paragraphSpacing: extractField(typoObj.paragraphSpacing),
    textCase: extractField(typoObj.textCase),
    textDecoration: extractField(typoObj.textDecoration),
  });

  const fields = [
    { key: "fontFamily", label: "Font Family", placeholder: "e.g. {font-families.primary}" },
    { key: "fontWeight", label: "Font Weight", placeholder: "e.g. {font-weights.regular} or 400" },
    { key: "fontSize", label: "Font Size", placeholder: "e.g. {font-sizes.base} or 16px" },
    { key: "lineHeight", label: "Line Height", placeholder: "e.g. {line-heights.base} or 24px" },
    { key: "letterSpacing", label: "Letter Spacing", placeholder: "e.g. 0% or 0.5px" },
    { key: "paragraphSpacing", label: "Paragraph Spacing", placeholder: "e.g. 0px" },
    { key: "textCase", label: "Text Case", placeholder: "none, uppercase, lowercase" },
    { key: "textDecoration", label: "Text Decoration", placeholder: "none, underline" },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="font-mono text-sm">{tokenKey}</DialogTitle>
              <DialogDescription className="text-xs">
                Typography composite token for {optionName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1 font-mono text-xs">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className="grid grid-cols-3 items-center gap-3">
              <Label className="font-sans text-xs">{label}</Label>
              <Input
                type="text"
                value={form[key] || ""}
                placeholder={placeholder}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="col-span-2 text-xs"
              />
            </div>
          ))}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border bg-muted/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(form)}
            className="gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Save Typography
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
