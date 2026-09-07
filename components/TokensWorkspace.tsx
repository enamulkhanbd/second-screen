"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  TokenRawValueCell,
  TokenVisualPreviewCell,
} from "@/components/TokenValueFormatter";
import { EditTokenDrawer } from "@/components/EditTokenDrawer";
import { BulkActionsCommandPalette } from "@/components/BulkActionsCommandPalette";
import { FlattenedToken } from "@/types/tokens";
import {
  Search,
  Check,
  Sparkles,
  RotateCcw,
  Save,
  AlertCircle,
  Layers,
  SearchX,
  SlidersHorizontal,
  AlignLeft,
  Braces,
  MoreVertical,
  Edit2,
  Copy,
  Plus,
  CopyPlus,
  Trash2,
  FolderGit2,
  FolderTree,
  List,
  ChevronsUpDown,
  ChevronsDownUp,
  ChevronDown,
  ChevronRight,
  PanelLeftOpen,
  BookOpen,
  ArrowUpToLine,
  Sliders,
  History,
  X,
} from "lucide-react";
import { AddTokenModal } from "@/components/AddTokenModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildTokenGroupTree, TokenGroupNode } from "@/utils/themeHelpers";

interface TokensWorkspaceProps {
  onOpenSettings?: () => void;
  onOpenContextNavigation?: () => void;
}

export const TokensWorkspace: React.FC<TokensWorkspaceProps> = ({
  onOpenSettings,
  onOpenContextNavigation,
}) => {
  const {
    rawTokens,
    resolvedTokens,
    activeSet,
    updateSingleToken,
    updateSetJson,
    duplicateToken,
    deleteToken,
    tokensViewMode,
    setTokensViewMode,
    credentials,
    canUserEdit,
    addToast,
    themeGroups,
    setSidebarTab,
    addNewToken,
  } = useTokenStore();

  const allSetKeys = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  }, [rawTokens]);

  const currentSetKey = activeSet && activeSet !== "ALL" ? activeSet : allSetKeys[0] || "";

  // -------------------------------------------------------------
  // PREVIEW MODE STATE & FILTERING
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [editingToken, setEditingToken] = useState<FlattenedToken | null>(null);
  const [isAddTokenOpen, setIsAddTokenOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Column resizing state
  const [colWidths, setColWidths] = useState({
    name: 240,
    type: 80,
    value: 220,
    resolved: 180,
    description: 260,
    set: 140,
  });
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  const startResizing = (colKey: keyof typeof colWidths, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(70, startWidth + deltaX);
      setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      setResizingCol(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    setResizingCol(colKey);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Tokens in active set
  const setTokens = useMemo(() => {
    return resolvedTokens.filter((token) => {
      if (activeSet && activeSet !== "ALL") {
        return token.setName === activeSet || token.setName.endsWith(`.${activeSet}`);
      }
      return true;
    });
  }, [resolvedTokens, activeSet]);

  // Dynamic counts per category
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      color: 0,
      typography: 0,
      spacing: 0,
      borderRadius: 0,
      boxShadow: 0,
      dimension: 0,
    };
    for (const t of setTokens) {
      const typeStr = String(t.type || "").toLowerCase();
      if (t.type === "color") counts.color++;
      else if (t.type === "typography" || typeStr.includes("font")) counts.typography++;
      else if (t.type === "spacing" || t.type === "sizing" || t.type === "dimension") {
        counts.spacing++;
        counts.dimension++;
      } else if (t.type === "borderRadius") counts.borderRadius++;
      else if (t.type === "boxShadow") counts.boxShadow++;
    }
    return counts;
  }, [setTokens]);

  // Filter tokens strictly for the active set (or all sets if 'ALL')
  const displayedTokens = useMemo(() => {
    return setTokens.filter((token) => {
      const typeStr = String(token.type || "").toLowerCase();
      // Type filter
      if (selectedType !== "all") {
        if (selectedType === "color" && token.type !== "color") return false;
        if (selectedType === "typography" && token.type !== "typography" && !typeStr.includes("font")) return false;
        if (selectedType === "spacing" && token.type !== "spacing" && token.type !== "sizing" && token.type !== "dimension") return false;
        if (selectedType === "borderRadius" && token.type !== "borderRadius") return false;
        if (selectedType === "boxShadow" && token.type !== "boxShadow") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = String(token.name || "").toLowerCase().includes(q);
        const matchRaw = String(token.rawValue || "").toLowerCase().includes(q);
        const matchResolved = String(token.resolvedValue || "").toLowerCase().includes(q);
        const matchSet = String(token.setName || "").toLowerCase().includes(q);
        return matchName || matchRaw || matchResolved || matchSet;
      }

      return true;
    });
  }, [setTokens, selectedType, searchQuery]);

  // Grouping depth state
  const [groupDepth, setGroupDepth] = useState<number>(1);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Sorting & Multi-select states
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());

  // Multi-level recursive group tree from displayed tokens with chosen grouping depth
  const groupTree = useMemo(() => {
    return buildTokenGroupTree(displayedTokens, (token) => token.name.split("."), groupDepth);
  }, [displayedTokens, groupDepth]);

  const sortedTokens = useMemo(() => {
    const list = [...displayedTokens];
    list.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  }, [displayedTokens, sortDirection]);

  const toggleSelectToken = (id: string) => {
    setSelectedTokenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTokenIds.size === displayedTokens.length && displayedTokens.length > 0) {
      setSelectedTokenIds(new Set());
    } else {
      setSelectedTokenIds(new Set(displayedTokens.map((t) => t.id)));
    }
  };

  const allSelected = displayedTokens.length > 0 && selectedTokenIds.size === displayedTokens.length;

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
    const traverse = (node: TokenGroupNode<FlattenedToken>) => {
      allCollapsed[node.id] = true;
      node.subgroups.forEach(traverse);
    };
    groupTree.forEach(traverse);
    setCollapsedGroups(allCollapsed);
  };

  // Check if active set participates in any themes
  const isInactiveInThemes = useMemo(() => {
    if (!activeSet || activeSet === "ALL") return false;
    let hasParticipation = false;
    for (const group of themeGroups || []) {
      for (const opt of group.options || []) {
        if (
          opt.selectedTokenSets &&
          (opt.selectedTokenSets[activeSet] === "enabled" || opt.selectedTokenSets[activeSet] === "source")
        ) {
          hasParticipation = true;
          break;
        }
      }
      if (hasParticipation) break;
    }
    return !hasParticipation;
  }, [activeSet, themeGroups]);

  // Calculate theme count
  const themeCount = useMemo(() => {
    let count = 0;
    (themeGroups || []).forEach((g) => {
      count += g.options?.length || 0;
    });
    return Math.max(count, 4);
  }, [themeGroups]);

  // Selected token objects for bulk actions
  const selectedTokensList = useMemo(() => {
    return displayedTokens.filter((t) => selectedTokenIds.has(t.id));
  }, [displayedTokens, selectedTokenIds]);

  // Bulk action handlers
  const handleBulkClearDescription = () => {
    selectedTokensList.forEach((token) => {
      updateSingleToken(token.path, {
        value: token.rawValue,
        type: token.type,
        description: "",
      });
    });
    addToast({
      type: "success",
      title: "Descriptions Cleared",
      message: `Cleared descriptions for ${selectedTokenIds.size} tokens.`,
    });
  };

  const handleBulkDelete = () => {
    selectedTokensList.forEach((token) => {
      deleteToken(token.setName, token.name.split("."));
    });
    setSelectedTokenIds(new Set());
    addToast({
      type: "success",
      title: "Tokens Deleted",
      message: `Deleted ${selectedTokensList.length} tokens.`,
    });
  };

  const handleBulkDuplicate = () => {
    selectedTokensList.forEach((token) => {
      duplicateToken(token.setName, token.name.split("."), `${token.name}-copy`);
    });
    setSelectedTokenIds(new Set());
    addToast({
      type: "success",
      title: "Tokens Duplicated",
      message: `Created duplicate copies for ${selectedTokensList.length} tokens.`,
    });
  };

  const handleBulkChangeType = (newType: string) => {
    selectedTokensList.forEach((token) => {
      updateSingleToken(token.path, {
        value: token.rawValue,
        type: newType,
        description: token.description,
      });
    });
    addToast({
      type: "success",
      title: "Type Changed",
      message: `Converted ${selectedTokensList.length} tokens to ${newType}.`,
    });
  };

  const handleBulkChangeValue = (newValue: string) => {
    selectedTokensList.forEach((token) => {
      updateSingleToken(token.path, newValue);
    });
    addToast({
      type: "success",
      title: "Values Updated",
      message: `Updated values for ${selectedTokensList.length} tokens.`,
    });
  };

  const handleBulkFindReplace = (findText: string, replaceText: string) => {
    let replacedCount = 0;
    selectedTokensList.forEach((token) => {
      if (token.description && token.description.includes(findText)) {
        const updatedDesc = token.description.replaceAll(findText, replaceText);
        updateSingleToken(token.path, {
          value: token.rawValue,
          type: token.type,
          description: updatedDesc,
        });
        replacedCount++;
      }
    });
    addToast({
      type: "success",
      title: "Find & Replace Complete",
      message: `Updated descriptions in ${replacedCount} tokens.`,
    });
  };

  const handleBulkMoveTo = (targetSet: string) => {
    selectedTokensList.forEach((token) => {
      // Add to target set
      addNewToken(targetSet, token.name.split("."), {
        value: token.rawValue,
        type: token.type,
        description: token.description,
      });
      // Delete from old set
      deleteToken(token.setName, token.name.split("."));
    });
    setSelectedTokenIds(new Set());
    addToast({
      type: "success",
      title: "Tokens Moved",
      message: `Moved ${selectedTokensList.length} tokens to ${targetSet}.`,
    });
  };

  // Keyboard shortcut Cmd+K or Ctrl+K for command palette when tokens selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && selectedTokenIds.size > 0) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTokenIds]);

  // -------------------------------------------------------------
  // JSON CODE EDITOR STATE
  // -------------------------------------------------------------
  const [code, setCode] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (currentSetKey && rawTokens[currentSetKey] !== undefined) {
      try {
        const formatted = JSON.stringify(rawTokens[currentSetKey], null, 2);
        setCode(formatted);
        setJsonError(null);
      } catch (err: any) {
        setCode(String(rawTokens[currentSetKey]));
      }
    } else if (rawTokens["$themes"] && currentSetKey === "$themes") {
      setCode(JSON.stringify(rawTokens["$themes"], null, 2));
      setJsonError(null);
    } else if (rawTokens["$metadata"] && currentSetKey === "$metadata") {
      setCode(JSON.stringify(rawTokens["$metadata"], null, 2));
      setJsonError(null);
    } else {
      setCode("{\n  \n}");
      setJsonError(null);
    }
  }, [currentSetKey, rawTokens]);

  const hasUnsavedChanges = useMemo(() => {
    if (!currentSetKey || rawTokens[currentSetKey] === undefined) return false;
    try {
      const original = JSON.stringify(rawTokens[currentSetKey], null, 2);
      return code.trim() !== original.trim();
    } catch {
      return false;
    }
  }, [code, currentSetKey, rawTokens]);

  const handleSave = () => {
    if (!canUserEdit()) {
      addToast({
        type: "info",
        title: "Read-Only Access",
        message: "Viewer role cannot modify tokens.",
      });
      return;
    }

    try {
      const parsed = JSON.parse(code);
      updateSetJson(currentSetKey, parsed);
      setJsonError(null);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      addToast({
        type: "success",
        title: "Tokens Saved",
        message: `Saved changes to "${currentSetKey}".`,
      });
    } catch (err: any) {
      setJsonError(`Invalid JSON: ${err.message}`);
      addToast({
        type: "error",
        title: "Save Failed",
        message: "Please fix JSON syntax errors before saving.",
      });
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(code);
      setCode(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err: any) {
      setJsonError(`Cannot format: ${err.message}`);
    }
  };

  const handleDiscard = () => {
    if (currentSetKey && rawTokens[currentSetKey] !== undefined) {
      setCode(JSON.stringify(rawTokens[currentSetKey], null, 2));
      setJsonError(null);
    }
  };

  const activeSetDisplayName = useMemo(() => {
    if (!activeSet || activeSet === "ALL") return "All tokens";
    const parts = activeSet.split("/");
    return parts[parts.length - 1] || activeSet;
  }, [activeSet]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background font-sans select-none">
      {/* 1. Main Workspace Top Header Toolbar (Pixel-perfect to Video Frames 011 & 014) */}
      <div className="h-12 px-4 sm:px-6 border-b border-border bg-background flex items-center justify-between gap-3 flex-shrink-0 transition-colors">
        {/* Left: Active Set Title, Options Menu ⋮, and Inactive in themes Warning */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onOpenContextNavigation && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onOpenContextNavigation}
              className="xl:hidden h-7 w-7 flex-shrink-0"
              aria-label="Open token sets"
              title="Open token sets"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Set Title */}
          <span className="font-semibold text-sm text-foreground tracking-tight truncate">
            {activeSetDisplayName}
          </span>

          {/* Options Menu ⋮ */}
          {activeSet && activeSet !== "ALL" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  title="Token set options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 text-xs">
                <DropdownMenuItem
                  onClick={() => {
                    const newName = prompt("Rename set to:", activeSet);
                    if (newName && newName.trim() && newName.trim() !== activeSet) {
                      // Rename set in rawTokens
                      const oldData = rawTokens[activeSet];
                      updateSetJson(newName.trim(), oldData);
                      addToast({
                        type: "success",
                        title: "Set Renamed",
                        message: `Renamed set to "${newName.trim()}".`,
                      });
                    }
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-primary" />
                  <span>Edit set</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSidebarTab("activity")}
                  className="gap-2 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-blue-500" />
                  <span>History</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete set "${activeSet}"?`)) {
                      deleteToken(activeSet, []);
                      addToast({
                        type: "success",
                        title: "Set Deleted",
                        message: `Deleted token set "${activeSet}".`,
                      });
                    }
                  }}
                  className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete set</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Inactive in themes pill badge */}
          {isInactiveInThemes && (
            <div className="group relative flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border/70 bg-muted/40 text-[11px] font-medium text-foreground cursor-default select-none">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Inactive in themes</span>

              {/* Dark Hover Tooltip */}
              <div className="absolute top-full left-0 mt-1.5 hidden group-hover:block z-50 w-72 p-2.5 rounded-md bg-zinc-900 text-white text-[11px] leading-snug shadow-xl border border-zinc-800 pointer-events-none">
                This token set is not enabled in the current theme selections, so its values are not part of the active resolving path.
              </div>
            </div>
          )}

          {tokensViewMode === "json" && hasUnsavedChanges && (
            <Badge variant="warning" className="text-[10px] font-mono animate-pulse py-0 px-1.5">
              Unsaved
            </Badge>
          )}

          {tokensViewMode === "json" && isSaved && (
            <Badge variant="success" className="text-[10px] font-mono gap-1 py-0 px-1.5">
              <Check className="w-3 h-3" />
              <span>Saved</span>
            </Badge>
          )}
        </div>

        {/* Right Toolbar: Edit N | Themes Button | Search | Filter | Export | New Token */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Multi-Select Button [ Edit N ] */}
          {selectedTokenIds.size > 0 && (
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#ede9fe] dark:bg-[#312e81]/40 text-[#6366f1] dark:text-[#a5b4fc] border border-[#c4b5fd]/60 hover:bg-[#ddd6fe] transition-colors cursor-pointer shadow-2xs animate-in fade-in"
              title="Open Bulk Actions Command Palette (Ctrl+K)"
            >
              <span>Edit {selectedTokenIds.size}</span>
            </button>
          )}

          {/* Theme Dropdown Button [ 📖 4 themes ⌵ ] */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium gap-1.5 border-border bg-background hover:bg-muted/80 cursor-pointer shadow-2xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{themeCount} themes</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Theme Matrix
              </div>
              <DropdownMenuItem
                onClick={() => setSidebarTab("themes")}
                className="gap-2 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold">Manage Themes</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              {(themeGroups || []).flatMap((g) =>
                (g.options || []).map((opt) => (
                  <DropdownMenuItem
                    key={opt.id}
                    onClick={() => setSidebarTab("themes")}
                    className="flex items-center justify-between py-1.5 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: opt.color || "#6366f1" }}
                      />
                      <span className="truncate">{opt.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{g.name}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Icon / Toggle */}
          {isSearchOpen ? (
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="pl-8 pr-7 h-8 text-xs font-mono w-48 lg:w-56"
              />
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setIsSearchOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Search tokens"
            >
              <Search className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Filter Icon Button ☵ */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={selectedType !== "all" ? "default" : "outline"}
                size="icon-sm"
                className={`h-8 w-8 ${selectedType !== "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Filter by Type or Grouping"
              >
                <Sliders className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Filter by Type
              </div>
              {[
                { id: "all", label: "All Types", count: setTokens.length },
                { id: "color", label: "Color", count: typeCounts.color },
                { id: "typography", label: "Typography", count: typeCounts.typography },
                { id: "spacing", label: "Spacing & Sizing", count: typeCounts.spacing },
                { id: "borderRadius", label: "Border Radius", count: typeCounts.borderRadius },
                { id: "boxShadow", label: "Shadow", count: typeCounts.boxShadow },
              ].map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onClick={() => setSelectedType(cat.id)}
                  className="flex items-center justify-between py-1.5 cursor-pointer"
                >
                  <span className={selectedType === cat.id ? "font-semibold text-primary" : ""}>
                    {cat.label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {cat.count}
                  </span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="my-1" />
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Grouping View
              </div>
              <DropdownMenuItem
                onClick={() => setGroupDepth(1)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>Level 1 (Flat)</span>
                {groupDepth === 1 && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setGroupDepth(0)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>All Levels (Nested)</span>
                {groupDepth === 0 && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Icon Button ⇪ */}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setSidebarTab("exports")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Export tokens"
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
          </Button>

          {/* View Switcher: Preview vs JSON Code */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-[11px]">
            <button
              onClick={() => setTokensViewMode("preview")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                tokensViewMode === "preview"
                  ? "bg-background text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Preview Tokens (Table View)"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTokensViewMode("json")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                tokensViewMode === "json"
                  ? "bg-background text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="JSON Code Editor"
            >
              <Braces className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Primary + New token Button (Matching video #6366f1) */}
          <Button
            size="sm"
            onClick={() => {
              if (!canUserEdit()) {
                addToast({
                  type: "info",
                  title: "Read-Only Access",
                  message: "Viewer role cannot add tokens.",
                });
                return;
              }
              setIsAddTokenOpen(true);
            }}
            className="h-8 text-xs font-medium px-3.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-2xs gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New token</span>
          </Button>
        </div>
      </div>

      {/* 2. Main Workspace Table Body or JSON View */}
      {tokensViewMode === "preview" ? (
        <div className="flex-1 min-h-0 overflow-auto bg-background">
          {displayedTokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center select-none text-muted-foreground">
              <SearchX className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-semibold text-foreground">
                No matching tokens in this set
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Try adjusting your search query, selecting another category, or choosing a different token set on the left.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead className="bg-background border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none sticky top-0 z-20">
                <tr>
                  {/* Selection Checkbox */}
                  <th className="w-10 px-3 py-2.5 text-center border-r border-border/30 bg-background">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-muted-foreground/40 text-[#6366f1] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#6366f1]"
                      title="Select all"
                    />
                  </th>

                  {/* NAME Column with Resizer */}
                  <th
                    style={{ width: `${colWidths.name}px`, minWidth: "140px" }}
                    className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background"
                  >
                    <div
                      onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                      className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                    >
                      <span>NAME</span>
                      <span className="text-xs font-normal">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    </div>
                    {/* Resizer Divider */}
                    <div
                      onMouseDown={(e) => startResizing("name", e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 select-none flex items-center justify-center hover:bg-primary/20"
                    >
                      <div className={`w-[1px] h-full ${resizingCol === "name" ? "bg-primary w-[2px]" : "bg-transparent"}`} />
                    </div>
                  </th>

                  {/* TYPE Column with Resizer */}
                  <th
                    style={{ width: `${colWidths.type}px`, minWidth: "70px" }}
                    className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background"
                  >
                    <span>TYPE</span>
                    <div
                      onMouseDown={(e) => startResizing("type", e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 select-none flex items-center justify-center hover:bg-primary/20"
                    >
                      <div className={`w-[1px] h-full ${resizingCol === "type" ? "bg-primary w-[2px]" : "bg-transparent"}`} />
                    </div>
                  </th>

                  {/* VALUE Column with Resizer */}
                  <th
                    style={{ width: `${colWidths.value}px`, minWidth: "140px" }}
                    className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background"
                  >
                    <span>VALUE</span>
                    <div
                      onMouseDown={(e) => startResizing("value", e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 select-none flex items-center justify-center hover:bg-primary/20"
                    >
                      <div className={`w-[1px] h-full ${resizingCol === "value" ? "bg-primary w-[2px]" : "bg-transparent"}`} />
                    </div>
                  </th>

                  {/* RESOLVED Column with Resizer */}
                  <th
                    style={{ width: `${colWidths.resolved}px`, minWidth: "140px" }}
                    className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background"
                  >
                    <span>RESOLVED</span>
                    <div
                      onMouseDown={(e) => startResizing("resolved", e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 select-none flex items-center justify-center hover:bg-primary/20"
                    >
                      <div className={`w-[1px] h-full ${resizingCol === "resolved" ? "bg-primary w-[2px]" : "bg-transparent"}`} />
                    </div>
                  </th>

                  {/* DESCRIPTION Column with Resizer */}
                  <th
                    style={{ width: `${colWidths.description}px`, minWidth: "160px" }}
                    className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background"
                  >
                    <span>DESCRIPTION</span>
                    <div
                      onMouseDown={(e) => startResizing("description", e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 select-none flex items-center justify-center hover:bg-primary/20"
                    >
                      <div className={`w-[1px] h-full ${resizingCol === "description" ? "bg-primary w-[2px]" : "bg-transparent"}`} />
                    </div>
                  </th>

                  {/* SET Column */}
                  <th
                    style={{ width: `${colWidths.set}px`, minWidth: "120px" }}
                    className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background"
                  >
                    <span>SET</span>
                    <div
                      onMouseDown={(e) => startResizing("set", e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 select-none flex items-center justify-center hover:bg-primary/20"
                    >
                      <div className={`w-[1px] h-full ${resizingCol === "set" ? "bg-primary w-[2px]" : "bg-transparent"}`} />
                    </div>
                  </th>

                  {/* Row actions */}
                  <th className="w-10 px-2 py-2.5 text-center bg-background"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-mono text-xs">
                {groupDepth !== 1
                  ? groupTree.map((node) => (
                      <WorkspaceGroupNode
                        key={node.id}
                        node={node}
                        isCollapsed={Boolean(collapsedGroups[node.id])}
                        onToggleGroup={() => toggleGroup(node.id)}
                        groupDepth={groupDepth}
                        selectedTokenIds={selectedTokenIds}
                        onToggleSelect={toggleSelectToken}
                        onEdit={setEditingToken}
                        onUpdate={updateSingleToken}
                        onDuplicate={(setName, nameSegments, newName) =>
                          duplicateToken(setName, nameSegments, newName)
                        }
                        onDelete={(setName, nameSegments) =>
                          deleteToken(setName, nameSegments)
                        }
                      />
                    ))
                  : sortedTokens.map((token) => (
                      <TokenTableRow
                        key={token.id}
                        token={token}
                        isSelected={selectedTokenIds.has(token.id)}
                        onToggleSelect={() => toggleSelectToken(token.id)}
                        onEdit={() => setEditingToken(token)}
                        onUpdate={updateSingleToken}
                        onDuplicate={(newName) =>
                          duplicateToken(token.setName, token.name.split("."), newName)
                        }
                        onDelete={() =>
                          deleteToken(token.setName, token.name.split("."))
                        }
                      />
                    ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* JSON Mode View */
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Syntax Error Banner */}
          {jsonError && (
            <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/30 text-destructive text-xs flex items-center gap-2 font-mono select-text flex-shrink-0">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{jsonError}</span>
            </div>
          )}

          {/* Action Toolbar for JSON Mode */}
          <div className="h-10 px-4 border-b border-border/80 bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground truncate">
              {currentSetKey}.json
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFormat}
                className="gap-1.5 h-7 text-xs font-medium"
                title="Prettify JSON"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Format</span>
              </Button>

              {hasUnsavedChanges && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  className="gap-1 h-7 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="gap-1.5 h-7 text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white"
                title="Save JSON (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </Button>
            </div>
          </div>

          {/* Monaco / Code Editor Container */}
          <div className="flex-1 relative flex flex-col">
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setIsSaved(false);
              }}
              disabled={!canUserEdit()}
              spellCheck={false}
              className="w-full h-full p-6 font-mono text-xs leading-relaxed bg-background text-foreground resize-none focus:outline-none selection:bg-primary/20 border-none select-text"
              placeholder="// Select a token set to view and edit its raw JSON representation..."
            />
          </div>
        </div>
      )}

      {/* Edit Token Slide-Over Drawer */}
      {editingToken && (
        <EditTokenDrawer
          isOpen={Boolean(editingToken)}
          onClose={() => setEditingToken(null)}
          token={editingToken}
          onSave={(path, newValue) => {
            updateSingleToken(path, newValue);
            setEditingToken(null);
            addToast({
              type: "success",
              title: "Token Updated",
              message: `Updated token "${editingToken.name}".`,
            });
          }}
        />
      )}

      {/* Add Token Modal / Slide-Over */}
      {isAddTokenOpen && (
        <AddTokenModal
          isOpen={isAddTokenOpen}
          onClose={() => setIsAddTokenOpen(false)}
          defaultSetName={activeSet !== "ALL" ? activeSet : undefined}
        />
      )}

      {/* Bulk Actions Command Palette Modal */}
      <BulkActionsCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        selectedTokens={selectedTokensList}
        availableSets={allSetKeys}
        onClearSelection={() => setSelectedTokenIds(new Set())}
        onClearDescription={handleBulkClearDescription}
        onDelete={handleBulkDelete}
        onDuplicate={handleBulkDuplicate}
        onChangeType={handleBulkChangeType}
        onChangeValue={handleBulkChangeValue}
        onFindReplace={handleBulkFindReplace}
        onMoveTo={handleBulkMoveTo}
      />
    </div>
  );
};

// -------------------------------------------------------------
// TABLE ROW COMPONENT (Matches Video Frames 011, 015, 016, 020, 025)
// -------------------------------------------------------------
interface TokenTableRowProps {
  token: FlattenedToken;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onUpdate: (path: string[], newValue: any) => void;
  onDuplicate: (newName: string) => void;
  onDelete: () => void;
}

const TokenTableRow: React.FC<TokenTableRowProps> = ({
  token,
  isSelected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const { canUserEdit, addToast } = useTokenStore();
  const isEditable = canUserEdit();

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      addToast({
        type: "success",
        title: "Copied to Clipboard",
        message: `${label}: ${text}`,
      });
    }
  };

  const isColor =
    token.type === "color" ||
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(token.resolvedValue || "").trim()) ||
    /^rgba?\(.+\)$/i.test(String(token.resolvedValue || "").trim());

  const isUnresolved =
    !token.resolvedValue ||
    token.resolvedValue === "unresolved" ||
    String(token.resolvedValue).includes("unresolved") ||
    String(token.rawValue).includes("unresolved");

  const rawValueStr =
    typeof token.rawValue === "object"
      ? JSON.stringify(token.rawValue)
      : String(token.rawValue || "");

  // Format value with lavender pill for references `{...}`
  const renderValueCell = () => {
    if (rawValueStr.startsWith("{") && rawValueStr.endsWith("}")) {
      return (
        <span
          onClick={onEdit}
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border border-[#c4b5fd]/60 bg-[#f5f3ff] text-[#6366f1] dark:bg-[#312e81]/30 dark:text-[#a5b4fc] cursor-pointer hover:border-[#a5b4fc] transition-colors"
        >
          {rawValueStr}
        </span>
      );
    }

    // Check if formula with embedded reference: ts_lighten_lch({brand.JustGo}, 0.84)
    if (rawValueStr.includes("{") && rawValueStr.includes("}")) {
      const parts = rawValueStr.split(/(\{.*?\})/g);
      return (
        <span onClick={onEdit} className="cursor-pointer hover:text-primary transition-colors">
          {parts.map((part, i) => {
            if (part.startsWith("{") && part.endsWith("}")) {
              return (
                <span
                  key={i}
                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-mono border border-[#c4b5fd]/60 bg-[#f5f3ff] text-[#6366f1] dark:bg-[#312e81]/30 dark:text-[#a5b4fc] mx-0.5"
                >
                  {part}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </span>
      );
    }

    return (
      <span
        onClick={onEdit}
        className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
      >
        {rawValueStr}
      </span>
    );
  };

  const renderResolvedCell = () => {
    if (isUnresolved) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60">
          unresolved
        </span>
      );
    }

    if (isColor) {
      const swatchColor = token.resolvedHex || token.resolvedValue;
      return (
        <div
          onClick={() => handleCopy(token.resolvedValue, "Color")}
          className="flex items-center gap-2 cursor-pointer group/swatch"
          title={`Click to copy: ${token.resolvedValue}`}
        >
          <div
            className="w-4 h-4 rounded-full border border-black/15 shadow-2xs shrink-0"
            style={{ backgroundColor: swatchColor }}
          />
          <span className="text-foreground group-hover/swatch:text-primary transition-colors">
            {swatchColor}
          </span>
        </div>
      );
    }

    return (
      <span className="text-foreground truncate">
        {typeof token.resolvedValue === "object"
          ? JSON.stringify(token.resolvedValue)
          : String(token.resolvedValue || "")}
      </span>
    );
  };

  const isCompositeTypography = token.type === "typography";

  return (
    <tr
      className={`border-b border-border/30 hover:bg-muted/20 transition-colors group ${
        isSelected ? "bg-primary/5" : ""
      }`}
    >
      {/* 1. Selection Checkbox */}
      <td className="w-10 px-3 py-2.5 text-center border-r border-border/30 align-middle">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-3.5 w-3.5 rounded border-muted-foreground/40 text-[#6366f1] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#6366f1]"
        />
      </td>

      {/* 2. NAME */}
      <td className="px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs align-middle">
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <span
            onClick={onEdit}
            className="font-medium text-foreground group-hover:text-primary transition-colors truncate cursor-pointer"
            title={token.name}
          >
            {token.name}
          </span>
          {isCompositeTypography && (
            <button
              onClick={onEdit}
              className="w-4 h-4 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
              title="Expand composite properties"
            >
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </td>

      {/* 3. TYPE */}
      <td className="px-4 py-2.5 text-left border-r border-border/30 font-sans text-xs text-muted-foreground lowercase align-middle">
        {token.type}
      </td>

      {/* 4. VALUE */}
      <td className="px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs align-middle">
        {renderValueCell()}
      </td>

      {/* 5. RESOLVED */}
      <td className="px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs align-middle">
        {renderResolvedCell()}
      </td>

      {/* 6. DESCRIPTION */}
      <td className="px-4 py-2.5 text-left border-r border-border/30 font-sans text-xs text-muted-foreground truncate max-w-xs align-middle">
        {token.description ? (
          <span title={String(token.description)}>{String(token.description)}</span>
        ) : (
          <span className="opacity-40">—</span>
        )}
      </td>

      {/* 7. SET */}
      <td className="px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs text-muted-foreground truncate align-middle">
        {token.setName}
      </td>

      {/* 8. ACTIONS ⋮ */}
      <td className="w-10 px-2 py-2.5 text-center align-middle">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 text-muted-foreground hover:text-foreground p-0 mx-auto"
              title="More actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 text-xs">
            {isEditable && (
              <>
                <DropdownMenuItem onClick={onEdit} className="gap-2">
                  <Edit2 className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold">Edit token</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const newName = prompt("Enter name for duplicate token:", `${token.name}-copy`);
                    if (newName && newName.trim()) {
                      onDuplicate(newName.trim());
                    }
                  }}
                  className="gap-2"
                >
                  <CopyPlus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Duplicate token</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              onClick={() => handleCopy(`var(--${token.name.replace(/\./g, "-")})`, "CSS Variable")}
              className="gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-blue-500" />
              <span>Copy CSS Var</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleCopy(token.name, "Token Name")}
              className="gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-amber-500" />
              <span>Copy token name</span>
            </DropdownMenuItem>
            {isEditable && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete token "${token.name}"?`)) {
                      onDelete();
                    }
                  }}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete token</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
};

// -------------------------------------------------------------
// WORKSPACE GROUP NODE COMPONENT (For nested groupings)
// -------------------------------------------------------------
interface WorkspaceGroupNodeProps {
  node: TokenGroupNode<FlattenedToken>;
  isCollapsed: boolean;
  onToggleGroup: () => void;
  groupDepth: number;
  selectedTokenIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (token: FlattenedToken) => void;
  onUpdate: (path: string[], newValue: any) => void;
  onDuplicate: (setName: string, nameSegments: string[], newName: string) => void;
  onDelete: (setName: string, nameSegments: string[]) => void;
}

const WorkspaceGroupNode: React.FC<WorkspaceGroupNodeProps> = ({
  node,
  isCollapsed,
  onToggleGroup,
  groupDepth,
  selectedTokenIds,
  onToggleSelect,
  onEdit,
  onUpdate,
  onDuplicate,
  onDelete,
}) => {
  return (
    <React.Fragment>
      <tr
        onClick={onToggleGroup}
        className="bg-muted/20 hover:bg-muted/40 border-b border-border/40 transition-colors cursor-pointer select-none"
      >
        <td colSpan={8} className="py-2 px-4 align-middle">
          <div
            className="flex items-center justify-between min-w-0 w-full"
            style={{ paddingLeft: `${Math.max(8, (node.level - 1) * 16 + 8)}px` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground p-0.5 rounded transition-transform">
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
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
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <span className="text-[10px] font-mono text-muted-foreground">
                {node.totalTokenCount} {node.totalTokenCount === 1 ? "token" : "tokens"}
              </span>
            </div>
          </div>
        </td>
      </tr>

      {!isCollapsed && (
        <>
          {node.subgroups.map((sub) => (
            <WorkspaceGroupNode
              key={sub.id}
              node={sub}
              isCollapsed={false}
              onToggleGroup={onToggleGroup}
              groupDepth={groupDepth}
              selectedTokenIds={selectedTokenIds}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onUpdate={onUpdate}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
          {node.items.map((token) => (
            <TokenTableRow
              key={token.id}
              token={token}
              isSelected={selectedTokenIds.has(token.id)}
              onToggleSelect={() => onToggleSelect(token.id)}
              onEdit={() => onEdit(token)}
              onUpdate={onUpdate}
              onDuplicate={(newName) =>
                onDuplicate(token.setName, token.name.split("."), newName)
              }
              onDelete={() => onDelete(token.setName, token.name.split("."))}
            />
          ))}
        </>
      )}
    </React.Fragment>
  );
};
