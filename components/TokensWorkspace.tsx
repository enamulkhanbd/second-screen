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
  GitBranch,
  FolderTree,
  List,
  ChevronsUpDown,
  ChevronsDownUp,
  ChevronDown,
  ChevronRight,
  PanelLeftOpen,
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
import { naturalCompareTokenKeys } from "@/utils/transformTokens";
import { cn } from "@/lib/utils";

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
    branches,
    activeBranch,
    switchBranchAction,
    addNewToken,
  } = useTokenStore();

  const isGitConfigured = Boolean(
    credentials.provider && credentials.owner && credentials.repo
  );

  const allSetKeys = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  }, [rawTokens]);

  const currentSetKey = activeSet && activeSet !== "ALL" ? activeSet : allSetKeys[0] || "";

  // -------------------------------------------------------------
  // PREVIEW MODE STATE & FILTERING
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<FlattenedToken | null>(null);
  const [isAddTokenOpen, setIsAddTokenOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  // Column resizing state with persistent storage
  const [colWidths, setColWidths] = useState({
    name: 260,
    type: 90,
    value: 240,
    resolved: 190,
    description: 260,
    set: 140,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ts_tokens_col_widths");
      if (saved) {
        const parsed = JSON.parse(saved);
        setColWidths((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  const startResizing = (colKey: keyof typeof colWidths, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey];
    const minW = colKey === "type" ? 60 : colKey === "set" ? 80 : 100;
    let currentNewWidth = startWidth;

    const tableEl = tableRef.current;
    if (!tableEl) return;

    const colEl = tableEl.querySelector<HTMLTableColElement>(`col[data-col="${colKey}"]`);
    const thEl = tableEl.querySelector<HTMLTableCellElement>(`th[data-col="${colKey}"]`);

    tableEl.setAttribute("data-resizing-col", colKey);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      if (moveEvent.buttons === 0) {
        onMouseUp();
        return;
      }
      const deltaX = moveEvent.clientX - startX;
      currentNewWidth = Math.max(minW, startWidth + deltaX);

      // Instant 1:1 hardware-accelerated layout update with zero frame lag
      if (colEl) {
        colEl.style.width = `${currentNewWidth}px`;
      }
      if (thEl) {
        thEl.style.width = `${currentNewWidth}px`;
      }
      tableEl.style.setProperty(`--col-width-${colKey}`, `${currentNewWidth}px`);
    };

    const onMouseUp = () => {
      tableEl.removeAttribute("data-resizing-col");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      // Commit final width to state and localStorage once at end of drag
      setColWidths((prev) => {
        const updated = { ...prev, [colKey]: currentNewWidth };
        try {
          localStorage.setItem("ts_tokens_col_widths", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };

    window.addEventListener("mousemove", onMouseMove, { passive: false });
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

  // Filter tokens strictly for the active set (or all sets if 'ALL')
  const displayedTokens = useMemo(() => {
    return setTokens.filter((token) => {
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
  }, [setTokens, searchQuery]);

  // Grouping depth state (default to 0: All Levels)
  const [groupDepth, setGroupDepth] = useState<number>(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Sorting & Multi-select states
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());

  // Multi-level recursive group tree from displayed tokens with chosen grouping depth
  const groupTree = useMemo(() => {
    return buildTokenGroupTree(displayedTokens, (token) => token.name.split("."), groupDepth, sortDirection);
  }, [displayedTokens, groupDepth, sortDirection]);

  const sortedTokens = useMemo(() => {
    const list = [...displayedTokens];
    list.sort((a, b) => {
      const cmp = naturalCompareTokenKeys(a.name, b.name);
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
                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Set history</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete the set "${activeSet}"?`)) {
                      deleteToken(activeSet, []);
                      addToast({
                        type: "info",
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

          {/* Active Branch Pill & Quick Switcher (Native branches when no Git; Git branch badge when Git configured) */}
          {!isGitConfigured ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-colors cursor-pointer"
                  title={`Active branch: ${activeBranch || "main"}`}
                >
                  <GitBranch className="w-3.5 h-3.5 text-primary" />
                  <span className="max-w-[120px] truncate">{activeBranch || "main"}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60 text-xs">
                <div className="px-2 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Switch Branch
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {(branches && branches.length > 0 ? branches : [{ id: "main", name: "main", title: "Main branch" }]).map((b) => {
                    const bName = typeof b === "string" ? b : b.name;
                    const isCurrent = bName === (activeBranch || "main");
                    return (
                      <DropdownMenuItem
                        key={bName}
                        onClick={() => switchBranchAction(bName)}
                        className={cn(
                          "flex items-center justify-between font-mono cursor-pointer",
                          isCurrent && "font-semibold text-primary bg-primary/10"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="truncate">{bName}</span>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSidebarTab("branches")}
                  className="gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>Manage all branches</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium border border-border/80 bg-muted/40 text-foreground select-none"
              title={`Git branch: ${credentials.branch || "main"}`}
            >
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              <span className="max-w-[120px] truncate">{credentials.branch || "main"}</span>
            </div>
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
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs border-border bg-background hover:bg-muted/80"
              title="Search tokens"
            >
              <Search className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Grouping Level Dropdown Selector (Minimal Icon-Only) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs border-border bg-background hover:bg-muted/80"
                title={`Grouping: ${
                  groupDepth === 1
                    ? "Level 1 (Flat)"
                    : groupDepth === 2
                    ? "Level 2 (1 Group)"
                    : groupDepth === 3
                    ? "Level 3 (2 Groups)"
                    : groupDepth === 4
                    ? "Level 4 (3 Groups)"
                    : "All Levels (Deepest)"
                }`}
                aria-label="Grouping level"
              >
                {groupDepth === 1 ? (
                  <List className="w-3.5 h-3.5 text-muted-foreground" />
                ) : groupDepth === 2 ? (
                  <FolderTree className="w-3.5 h-3.5 text-blue-500" />
                ) : groupDepth === 3 ? (
                  <FolderTree className="w-3.5 h-3.5 text-emerald-500" />
                ) : groupDepth === 4 ? (
                  <FolderTree className="w-3.5 h-3.5 text-purple-500" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-border">
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Group By Level
              </div>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => setGroupDepth(1)}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <List className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">Level 1 (Flat)</span>
                    <span className="text-[10px] text-muted-foreground">No groups, flat token names</span>
                  </div>
                </div>
                {groupDepth === 1 && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-2 flex-shrink-0" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setGroupDepth(2)}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FolderTree className="w-3.5 h-3.5 text-blue-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Level 2 (1 Group)</span>
                    <span className="text-[10px] text-muted-foreground">Break by 1st segment</span>
                  </div>
                </div>
                {groupDepth === 2 && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-2 flex-shrink-0" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setGroupDepth(3)}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FolderTree className="w-3.5 h-3.5 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Level 3 (2 Groups)</span>
                    <span className="text-[10px] text-muted-foreground">Break by 1st & 2nd segments</span>
                  </div>
                </div>
                {groupDepth === 3 && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-2 flex-shrink-0" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setGroupDepth(4)}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FolderTree className="w-3.5 h-3.5 text-purple-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Level 4 (3 Groups)</span>
                    <span className="text-[10px] text-muted-foreground">Break by 1st, 2nd & 3rd</span>
                  </div>
                </div>
                {groupDepth === 4 && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-2 flex-shrink-0" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={() => setGroupDepth(0)}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">All Levels (Deepest)</span>
                    <span className="text-[10px] text-muted-foreground">Fully nested hierarchy</span>
                  </div>
                </div>
                {groupDepth === 0 && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-2 flex-shrink-0" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Expand / Collapse All Controls */}
          {groupDepth !== 1 && (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={expandAllGroups}
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Expand All Groups"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={collapseAllGroups}
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Collapse All Groups"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

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
            <>
              <style>{`
                table[data-resizing-col] {
                  cursor: col-resize !important;
                  user-select: none !important;
                }
                table[data-resizing-col="name"] [data-resizer="name"] > div,
                table[data-resizing-col="type"] [data-resizer="type"] > div,
                table[data-resizing-col="value"] [data-resizer="value"] > div,
                table[data-resizing-col="resolved"] [data-resizer="resolved"] > div,
                table[data-resizing-col="description"] [data-resizer="description"] > div,
                table[data-resizing-col="set"] [data-resizer="set"] > div {
                  background-color: #6366f1 !important;
                  opacity: 1 !important;
                }
              `}</style>
              <table
                ref={tableRef}
                className="w-full table-fixed text-left border-collapse text-xs select-none"
                style={{
                  minWidth: "100%",
                  ["--col-width-name" as any]: `${colWidths.name}px`,
                  ["--col-width-type" as any]: `${colWidths.type}px`,
                  ["--col-width-value" as any]: `${colWidths.value}px`,
                  ["--col-width-resolved" as any]: `${colWidths.resolved}px`,
                  ["--col-width-description" as any]: `${colWidths.description}px`,
                  ["--col-width-set" as any]: `${colWidths.set}px`,
                }}
              >
                <colgroup>
                  <col style={{ width: "40px" }} />
                  <col data-col="name" style={{ width: `${colWidths.name}px` }} />
                  <col data-col="type" style={{ width: `${colWidths.type}px` }} />
                  <col data-col="value" style={{ width: `${colWidths.value}px` }} />
                  <col data-col="resolved" style={{ width: `${colWidths.resolved}px` }} />
                  <col data-col="description" style={{ width: `${colWidths.description}px` }} />
                  <col data-col="set" style={{ width: `${colWidths.set}px` }} />
                  <col style={{ width: "40px", minWidth: "40px", maxWidth: "40px" }} />
                </colgroup>
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
                      data-col="name"
                      style={{ width: `${colWidths.name}px` }}
                      className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background overflow-hidden"
                    >
                      <div
                        onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                        className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors truncate min-w-0"
                      >
                        <span>NAME</span>
                        <span className="text-xs font-normal">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      </div>
                      {/* Resizer Divider */}
                      <div
                        data-resizer="name"
                        onMouseDown={(e) => startResizing("name", e)}
                        className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-20 select-none flex items-center justify-center group/resizer hover:bg-primary/20 transition-colors"
                        title="Drag to resize NAME column"
                      >
                        <div className="w-[2px] h-full bg-transparent group-hover/resizer:bg-primary/60 transition-colors" />
                      </div>
                    </th>

                    {/* TYPE Column with Resizer */}
                    <th
                      data-col="type"
                      style={{ width: `${colWidths.type}px` }}
                      className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background overflow-hidden"
                    >
                      <span className="truncate">TYPE</span>
                      <div
                        data-resizer="type"
                        onMouseDown={(e) => startResizing("type", e)}
                        className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-20 select-none flex items-center justify-center group/resizer hover:bg-primary/20 transition-colors"
                        title="Drag to resize TYPE column"
                      >
                        <div className="w-[2px] h-full bg-transparent group-hover/resizer:bg-primary/60 transition-colors" />
                      </div>
                    </th>

                    {/* VALUE Column with Resizer */}
                    <th
                      data-col="value"
                      style={{ width: `${colWidths.value}px` }}
                      className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background overflow-hidden"
                    >
                      <span className="truncate">VALUE</span>
                      <div
                        data-resizer="value"
                        onMouseDown={(e) => startResizing("value", e)}
                        className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-20 select-none flex items-center justify-center group/resizer hover:bg-primary/20 transition-colors"
                        title="Drag to resize VALUE column"
                      >
                        <div className="w-[2px] h-full bg-transparent group-hover/resizer:bg-primary/60 transition-colors" />
                      </div>
                    </th>

                    {/* RESOLVED Column with Resizer */}
                    <th
                      data-col="resolved"
                      style={{ width: `${colWidths.resolved}px` }}
                      className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background overflow-hidden"
                    >
                      <span className="truncate">RESOLVED</span>
                      <div
                        data-resizer="resolved"
                        onMouseDown={(e) => startResizing("resolved", e)}
                        className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-20 select-none flex items-center justify-center group/resizer hover:bg-primary/20 transition-colors"
                        title="Drag to resize RESOLVED column"
                      >
                        <div className="w-[2px] h-full bg-transparent group-hover/resizer:bg-primary/60 transition-colors" />
                      </div>
                    </th>

                    {/* DESCRIPTION Column with Resizer */}
                    <th
                      data-col="description"
                      style={{ width: `${colWidths.description}px` }}
                      className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background overflow-hidden"
                    >
                      <span className="truncate">DESCRIPTION</span>
                      <div
                        data-resizer="description"
                        onMouseDown={(e) => startResizing("description", e)}
                        className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-20 select-none flex items-center justify-center group/resizer hover:bg-primary/20 transition-colors"
                        title="Drag to resize DESCRIPTION column"
                      >
                        <div className="w-[2px] h-full bg-transparent group-hover/resizer:bg-primary/60 transition-colors" />
                      </div>
                    </th>

                    {/* SET Column with Resizer */}
                    <th
                      data-col="set"
                      style={{ width: `${colWidths.set}px` }}
                      className="relative px-4 py-2.5 text-left border-r border-border/30 group bg-background overflow-hidden"
                    >
                      <span className="truncate">SET</span>
                      <div
                        data-resizer="set"
                        onMouseDown={(e) => startResizing("set", e)}
                        className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-20 select-none flex items-center justify-center group/resizer hover:bg-primary/20 transition-colors"
                        title="Drag to resize SET column"
                      >
                        <div className="w-[2px] h-full bg-transparent group-hover/resizer:bg-primary/60 transition-colors" />
                      </div>
                    </th>

                    {/* Row actions - Sticky Right Edge */}
                    <th className="sticky right-0 top-0 z-30 w-10 min-w-[40px] max-w-[40px] px-2 py-2.5 text-center bg-background border-l border-border/30 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.3)]"></th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-border/30 font-mono text-xs">
                {groupDepth !== 1
                  ? groupTree.map((node) => (
                      <WorkspaceGroupNode
                        key={node.id}
                        node={node}
                        collapsedGroups={collapsedGroups}
                        onToggleGroup={toggleGroup}
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
                        startResizing={startResizing}
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
                        startResizing={startResizing}
                      />
                    ))}
              </tbody>
            </table>
            </>
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
  startResizing?: (colKey: "name" | "type" | "value" | "resolved" | "description" | "set", e: React.MouseEvent) => void;
}

const TokenTableRow: React.FC<TokenTableRowProps> = ({
  token,
  isSelected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
  startResizing,
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
      <td className="relative px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs align-middle overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            onClick={onEdit}
            className="font-medium text-foreground group-hover:text-primary transition-colors truncate cursor-pointer"
            title={token.name}
          >
            {token.name}
          </span>
        </div>
        {startResizing && (
          <div
            data-resizer="name"
            onMouseDown={(e) => startResizing("name", e)}
            className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 select-none flex items-center justify-center group/cell-resizer hover:bg-primary/20 transition-colors"
            title="Drag to resize NAME column"
          >
            <div className="w-[2px] h-full bg-transparent group-hover/cell-resizer:bg-primary/60 transition-colors" />
          </div>
        )}
      </td>

      {/* 3. TYPE */}
      <td className="relative px-4 py-2.5 text-left border-r border-border/30 font-sans text-xs text-muted-foreground lowercase align-middle overflow-hidden">
        <span className="truncate block">{token.type}</span>
        {startResizing && (
          <div
            data-resizer="type"
            onMouseDown={(e) => startResizing("type", e)}
            className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 select-none flex items-center justify-center group/cell-resizer hover:bg-primary/20 transition-colors"
            title="Drag to resize TYPE column"
          >
            <div className="w-[2px] h-full bg-transparent group-hover/cell-resizer:bg-primary/60 transition-colors" />
          </div>
        )}
      </td>

      {/* 4. VALUE */}
      <td className="relative px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs align-middle overflow-hidden">
        <div className="truncate min-w-0 pr-1">
          {renderValueCell()}
        </div>
        {startResizing && (
          <div
            data-resizer="value"
            onMouseDown={(e) => startResizing("value", e)}
            className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 select-none flex items-center justify-center group/cell-resizer hover:bg-primary/20 transition-colors"
            title="Drag to resize VALUE column"
          >
            <div className="w-[2px] h-full bg-transparent group-hover/cell-resizer:bg-primary/60 transition-colors" />
          </div>
        )}
      </td>

      {/* 5. RESOLVED */}
      <td className="relative px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs align-middle overflow-hidden">
        <div className="truncate min-w-0 pr-1">
          {renderResolvedCell()}
        </div>
        {startResizing && (
          <div
            data-resizer="resolved"
            onMouseDown={(e) => startResizing("resolved", e)}
            className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 select-none flex items-center justify-center group/cell-resizer hover:bg-primary/20 transition-colors"
            title="Drag to resize RESOLVED column"
          >
            <div className="w-[2px] h-full bg-transparent group-hover/cell-resizer:bg-primary/60 transition-colors" />
          </div>
        )}
      </td>

      {/* 6. DESCRIPTION */}
      <td className="relative px-4 py-2.5 text-left border-r border-border/30 font-sans text-xs text-muted-foreground truncate align-middle overflow-hidden">
        {token.description ? (
          <span title={String(token.description)} className="truncate block">{String(token.description)}</span>
        ) : (
          <span className="opacity-40">—</span>
        )}
        {startResizing && (
          <div
            data-resizer="description"
            onMouseDown={(e) => startResizing("description", e)}
            className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 select-none flex items-center justify-center group/cell-resizer hover:bg-primary/20 transition-colors"
            title="Drag to resize DESCRIPTION column"
          >
            <div className="w-[2px] h-full bg-transparent group-hover/cell-resizer:bg-primary/60 transition-colors" />
          </div>
        )}
      </td>

      {/* 7. SET */}
      <td className="relative px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs text-muted-foreground truncate align-middle overflow-hidden">
        <span className="truncate block">{token.setName}</span>
        {startResizing && (
          <div
            data-resizer="set"
            onMouseDown={(e) => startResizing("set", e)}
            className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 select-none flex items-center justify-center group/cell-resizer hover:bg-primary/20 transition-colors"
            title="Drag to resize SET column"
          >
            <div className="w-[2px] h-full bg-transparent group-hover/cell-resizer:bg-primary/60 transition-colors" />
          </div>
        )}
      </td>

      {/* 8. ACTIONS ⋮ - Sticky Right Edge */}
      <td
        className={`sticky right-0 z-10 w-10 min-w-[40px] max-w-[40px] px-2 py-2.5 text-center align-middle border-l border-border/30 transition-colors ${
          isSelected
            ? "bg-muted/90 group-hover:bg-muted"
            : "bg-background group-hover:bg-muted/30"
        } shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.3)]`}
      >
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
  collapsedGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string) => void;
  groupDepth: number;
  selectedTokenIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (token: FlattenedToken) => void;
  onUpdate: (path: string[], newValue: any) => void;
  onDuplicate: (setName: string, nameSegments: string[], newName: string) => void;
  onDelete: (setName: string, nameSegments: string[]) => void;
  startResizing?: (colKey: "name" | "type" | "value" | "resolved" | "description" | "set", e: React.MouseEvent) => void;
}

const WorkspaceGroupNode: React.FC<WorkspaceGroupNodeProps> = ({
  node,
  collapsedGroups,
  onToggleGroup,
  groupDepth,
  selectedTokenIds,
  onToggleSelect,
  onEdit,
  onUpdate,
  onDuplicate,
  onDelete,
  startResizing,
}) => {
  if (node.isRoot) {
    return (
      <React.Fragment>
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
            startResizing={startResizing}
          />
        ))}
      </React.Fragment>
    );
  }

  const isCollapsed = Boolean(collapsedGroups[node.id]);

  return (
    <React.Fragment>
      <tr
        onClick={() => onToggleGroup(node.id)}
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
              collapsedGroups={collapsedGroups}
              onToggleGroup={onToggleGroup}
              groupDepth={groupDepth}
              selectedTokenIds={selectedTokenIds}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onUpdate={onUpdate}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              startResizing={startResizing}
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
              startResizing={startResizing}
            />
          ))}
        </>
      )}
    </React.Fragment>
  );
};
