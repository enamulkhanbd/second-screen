"use client";

import React, { useState, useMemo, useEffect, useDeferredValue } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { useShallow } from "zustand/react/shallow";
import { FlattenedToken, TokenType } from "@/types/tokens";
import {
  Layers,
  Sparkles,
  Search,
  Copy,
  Check,
  Trash2,
  Unlink,
  RefreshCw,
  Download,
  Upload,
  FolderGit2,
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Tag,
  Hash,
  Sliders,
  Sun,
  Moon,
  Palette,
  Eye,
  MoreHorizontal,
  ChevronDown,
  LayoutGrid,
  List,
  Flame,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUp01,
  ArrowDown01,
} from "lucide-react";
import { compareTokens, compareTokenNames, sortFlattenedTokens } from "@/utils/transformTokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface VariablesViewProps {
  onOpenSettings?: () => void;
}

export const VariablesView: React.FC<VariablesViewProps> = ({ onOpenSettings }) => {
  const {
    currentOrg,
    currentProject,
    figmaVariables,
    figmaResolvedVariables,
    figmaUpdatedAt,
  } = useTokenStore(
    useShallow((s) => ({
      currentOrg: s.currentOrg,
      currentProject: s.currentProject,
      figmaVariables: s.figmaVariables,
      figmaResolvedVariables: s.figmaResolvedVariables,
      figmaUpdatedAt: s.figmaUpdatedAt,
    }))
  );
  const setFigmaVariables = useTokenStore((s) => s.setFigmaVariables);
  const desyncFigmaVariablesAction = useTokenStore((s) => s.desyncFigmaVariablesAction);
  const deleteFigmaVariableAction = useTokenStore((s) => s.deleteFigmaVariableAction);
  const deleteFigmaCollectionAction = useTokenStore((s) => s.deleteFigmaCollectionAction);
  const canUserEdit = useTokenStore((s) => s.canUserEdit);
  const addToast = useTokenStore((s) => s.addToast);
  const setSidebarTab = useTokenStore((s) => s.setSidebarTab);
  const setProjectSettingsTab = useTokenStore((s) => s.setProjectSettingsTab);
  const [visibleCount, setVisibleCount] = useState(100);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedCollection, setSelectedCollection] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [viewLayout, setViewLayout] = useState<"grid" | "table">("table");
  const [sortField, setSortField] = useState<"name" | "resolved" | "collection">("resolved");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rowMenuState, setRowMenuState] = useState<{
    item: FlattenedToken;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    setVisibleCount(100);
  }, [deferredSearchQuery, selectedCollection, selectedType]);

  const handleSortToggle = (field: "name" | "resolved" | "collection") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const [isRefreshing, setIsRefreshing] = useState(false);

  // De-sync confirmation modal
  const [isDesyncModalOpen, setIsDesyncModalOpen] = useState(false);
  const [isDesyncing, setIsDesyncing] = useState(false);

  // Delete variable modal
  const [variableToDelete, setVariableToDelete] = useState<FlattenedToken | null>(null);
  const [isDeletingVar, setIsDeletingVar] = useState(false);

  // Delete collection modal
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);

  // Variables are hydrated with the project; this runs only from the manual Refresh button.
  const fetchVariables = async () => {
    if (!currentOrg?.id || !currentProject?.id) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `/api/v1/tokens?orgId=${encodeURIComponent(currentOrg.id)}&projectId=${encodeURIComponent(currentProject.id)}`,
      );
      const data = await res.json();
      if (data.success && data.figmaVariables && Object.keys(data.figmaVariables).length > 0) {
        setFigmaVariables(data.figmaVariables, data.metadata);
      }
    } catch (e) {
      console.warn("Could not fetch fresh figma variables:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Extract all Figma collection set names
  const collections = useMemo(() => {
    if (!figmaVariables) return [];
    return Object.keys(figmaVariables).filter((k) => !k.startsWith("$"));
  }, [figmaVariables]);

  // Flattened resolved Figma variables
  const allVariables = figmaResolvedVariables;

  // Filtered variables
  const filteredVariables = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    if (selectedCollection === "ALL" && selectedType === "ALL" && !q) {
      return allVariables;
    }

    return allVariables.filter((item) => {
      // Collection filter
      if (selectedCollection !== "ALL" && item.setName !== selectedCollection) {
        return false;
      }

      // Type filter
      if (selectedType !== "ALL") {
        if (selectedType === "color" && item.type !== "color") return false;
        if (selectedType === "dimension" && item.type !== "dimension" && item.type !== "spacing" && item.type !== "sizing") return false;
        if (selectedType === "boolean" && item.type !== "other" && item.type !== "composition") return false;
        if (selectedType === "alias" && !item.isAlias) return false;
      }

      // Search Query
      if (q) {
        const matchName = String(item.name || "").toLowerCase().includes(q);
        const matchValue = String(item.resolvedValue || item.rawValue || "").toLowerCase().includes(q);
        const matchSet = String(item.setName || "").toLowerCase().includes(q);
        const matchAlias = String(item.aliasTarget || "").toLowerCase().includes(q);
        if (!matchName && !matchValue && !matchSet && !matchAlias) return false;
      }

      return true;
    });
  }, [allVariables, selectedCollection, selectedType, deferredSearchQuery]);

  // Sorted variables
  const sortedVariables = useMemo(() => {
    if (sortField !== "collection") {
      return sortFlattenedTokens(filteredVariables, sortField, sortDirection);
    }
    const list = [...filteredVariables];
    list.sort((a, b) => {
      const cmp = compareTokenNames(a.setName, b.setName, sortDirection);
      if (cmp !== 0) return cmp;
      return compareTokenNames(a.name, b.name, sortDirection);
    });
    return list;
  }, [filteredVariables, sortField, sortDirection]);

  // Statistics
  const stats = useMemo(() => {
    let colors = 0;
    let dimensions = 0;
    let aliases = 0;
    let others = 0;

    allVariables.forEach((v) => {
      if (v.type === "color") colors++;
      else if (v.type === "dimension" || v.type === "spacing" || v.type === "sizing") dimensions++;
      else if (v.isAlias) aliases++;
      else others++;
    });

    return {
      total: allVariables.length,
      collectionsCount: collections.length,
      colors,
      dimensions,
      aliases,
      others,
    };
  }, [allVariables, collections]);

  const handleCopyValue = (text: string, id: string, label: string = "Value") => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast({
      type: "success",
      title: "Copied to Clipboard",
      message: `${label} copied: ${text}`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCssVar = (name: string, id: string) => {
    const cssName = `var(--${name.replace(/[\.\s\/]+/g, "-")})`;
    handleCopyValue(cssName, id, "CSS Variable");
  };

  const handleConfirmDesync = async () => {
    setIsDesyncing(true);
    try {
      await desyncFigmaVariablesAction();
      setIsDesyncModalOpen(false);
    } finally {
      setIsDesyncing(false);
    }
  };

  const handleConfirmDeleteVar = async () => {
    if (!variableToDelete) return;
    setIsDeletingVar(true);
    try {
      await deleteFigmaVariableAction(variableToDelete.setName, variableToDelete.path);
      setVariableToDelete(null);
    } finally {
      setIsDeletingVar(false);
    }
  };

  const handleConfirmDeleteCollection = async () => {
    if (!collectionToDelete) return;
    setIsDeletingCollection(true);
    try {
      await deleteFigmaCollectionAction(collectionToDelete);
      if (selectedCollection === collectionToDelete) {
        setSelectedCollection("ALL");
      }
      setCollectionToDelete(null);
    } finally {
      setIsDeletingCollection(false);
    }
  };

  const hasVariables = allVariables.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground font-sans select-none">
      {/* 1. Header with Stats & Actions */}
      <header className="px-6 py-3.5 border-b border-border bg-background flex-shrink-0 flex items-center justify-between z-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted border border-border text-foreground flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-foreground leading-tight">Figma Variables</h1>
                {hasVariables ? (
                  <Badge variant="success" className="text-[10px] gap-1 px-2 py-0.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Synced</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground font-medium">
                    Not connected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Figma Variables mapped from this project&apos;s tokens. Tokens remain the source of truth.
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {hasVariables && (
            <>
              {canUserEdit() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDesyncModalOpen(true)}
                  className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>De-sync Figma</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const jsonStr = JSON.stringify(figmaVariables, null, 2);
                  const blob = new Blob([jsonStr], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${currentProject?.slug || "figma"}-variables.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="h-8 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchVariables}
            disabled={isRefreshing}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Pull latest</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setProjectSettingsTab("sync");
              setSidebarTab("project-settings");
            }}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Figma settings</span>
          </Button>
        </div>
      </header>

      {/* Main Body */}
      {!hasVariables ? (
        /* Empty State: Prompt to sync from Figma */
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
          <div className="max-w-md w-full p-7 rounded-xl bg-card border border-border shadow-2xs space-y-5">
            <div className="mx-auto w-11 h-11 rounded-xl bg-muted border border-border text-foreground flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-foreground">No Figma Variables synced</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pull Figma Variables into this project while keeping your DTCG tokens as the source of truth.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-muted/40 border border-border/80 text-left space-y-2 text-xs">
              <div className="font-medium text-foreground">How to sync from Figma:</div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <li>Open the <strong>Tokens Platform</strong> companion plugin in Figma.</li>
                <li>Select <strong>Push Figma to Cloud</strong> to sync your variable collections.</li>
              </ol>
            </div>

            <div className="pt-1 flex items-center justify-center gap-3">
              <Button
                onClick={() => {
                  setProjectSettingsTab("sync");
                  setSidebarTab("project-settings");
                }}
                size="sm"
                className="text-xs font-semibold gap-1.5 h-8"
              >
                <span>Configure Figma sync</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Variables Workspace */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-6 py-3 border-b border-border/70 bg-muted/15 flex-shrink-0 text-xs tabular-nums">
            <div className="px-3 py-2 rounded-lg bg-card border border-border flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Total variables</span>
              <span className="text-sm font-semibold text-foreground font-mono">{stats.total}</span>
            </div>

            <div className="px-3 py-2 rounded-lg bg-card border border-border flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Collections</span>
              <span className="text-sm font-semibold text-foreground font-mono">{stats.collectionsCount}</span>
            </div>

            <div className="px-3 py-2 rounded-lg bg-card border border-border flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Colors</span>
              <span className="text-sm font-semibold text-foreground font-mono">{stats.colors}</span>
            </div>

            <div className="px-3 py-2 rounded-lg bg-card border border-border flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Dimensions</span>
              <span className="text-sm font-semibold text-foreground font-mono">{stats.dimensions}</span>
            </div>

            <div className="px-3 py-2 rounded-lg bg-card border border-border flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Bound aliases</span>
              <span className="text-sm font-semibold text-foreground font-mono">{stats.aliases}</span>
            </div>
          </div>

          {/* Controls Bar: Search, Collection Dropdown, Type Pills & Layout Toggle */}
          <div className="p-4 px-6 border-b border-border/60 bg-card/40 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Search Bar */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search variables, values, aliases..."
                  className="h-8 text-xs pl-8 bg-background"
                />
              </div>

              {/* Collection Dropdown */}
              <div className="flex items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span>{selectedCollection === "ALL" ? "All Collections" : selectedCollection}</span>
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 text-xs">
                    <DropdownMenuItem onClick={() => setSelectedCollection("ALL")}>
                      <span>All Collections</span>
                      {selectedCollection === "ALL" && <Check className="w-3 h-3 ml-auto text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {collections.map((col) => (
                      <DropdownMenuItem
                        key={col}
                        onClick={() => setSelectedCollection(col)}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate">{col}</span>
                        {selectedCollection === col && <Check className="w-3 h-3 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedCollection !== "ALL" && canUserEdit() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollectionToDelete(selectedCollection)}
                    title={`Delete collection ${selectedCollection}`}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/60 text-xs">
                <button
                  onClick={() => setSelectedType("ALL")}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition  ${
                    selectedType === "ALL"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({allVariables.length})
                </button>
                <button
                  onClick={() => setSelectedType("color")}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition  ${
                    selectedType === "color"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Colors ({stats.colors})
                </button>
                <button
                  onClick={() => setSelectedType("dimension")}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition  ${
                    selectedType === "dimension"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Numbers ({stats.dimensions})
                </button>
                <button
                  onClick={() => setSelectedType("alias")}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition  ${
                    selectedType === "alias"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Aliases ({stats.aliases})
                </button>
              </div>
            </div>

            {/* Layout Toggle (Grid / Table) */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/60">
              <button
                onClick={() => setViewLayout("grid")}
                                className={`p-1.5 rounded-md transition  ${
                  viewLayout === "grid"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewLayout("table")}
                                className={`p-1.5 rounded-md transition  ${
                  viewLayout === "table"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Variables Content View */}
          <div
            className={viewLayout === "table" ? "flex-1 min-h-0 overflow-auto" : "flex-1 min-h-0 overflow-auto p-3 sm:p-4 lg:p-6"}
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              if (scrollHeight - scrollTop - clientHeight < 500) {
                setVisibleCount((prev) =>
                  prev < sortedVariables.length ? Math.min(prev + 100, sortedVariables.length) : prev
                );
              }
            }}
          >
            {filteredVariables.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-foreground">No variables match your filters</p>
                <p className="text-[11px] mt-1">Try searching for a different name or clearing selected type.</p>
              </div>
            ) : viewLayout === "grid" ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {sortedVariables.slice(0, visibleCount).map((item) => {
                  const isColor = item.type === "color";

                  return (
                    <Card
                      key={item.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setRowMenuState({ item, x: e.clientX, y: e.clientY });
                      }}
                      className="border-border transition-colors shadow-xs group flex flex-col justify-between cursor-default"
                    >
                      <CardHeader className="p-3.5 pb-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                            {item.setName}
                          </Badge>

                          <button
                            type="button"
                            aria-label={`Actions for variable ${item.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setRowMenuState({ item, x: rect.right, y: rect.bottom + 4 });
                            }}
                            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <div
                            onClick={() => handleCopyCssVar(item.name, item.id)}
                            className="font-mono font-bold text-xs text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                            title={`Click to copy CSS var for ${item.name}`}
                          >
                            {item.name}
                          </div>
                          {item.description && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="p-3.5 pt-0 space-y-2">
                        {isColor ? (
                          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/80">
                            <div
                              className="w-7 h-7 rounded-md border border-black/10 shadow-xs flex-shrink-0"
                              style={{ backgroundColor: typeof (item.resolvedValue || item.rawValue) === "string" ? (item.resolvedValue || item.rawValue) : undefined }}
                            />
                            <div className="truncate font-mono text-xs font-semibold text-foreground">
                              {typeof (item.resolvedValue || item.rawValue) === "object" ? JSON.stringify(item.resolvedValue || item.rawValue) : String(item.resolvedValue || item.rawValue || "")}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/80 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {item.type}
                            </span>
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {typeof (item.resolvedValue || item.rawValue) === "object" ? JSON.stringify(item.resolvedValue || item.rawValue) : String(item.resolvedValue || item.rawValue || "")}
                            </span>
                          </div>
                        )}

                        {item.isAlias && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono truncate">
                            <span className="text-primary font-bold">↳</span>
                            <span className="truncate">{typeof (item.aliasTarget || item.rawValue) === "object" ? JSON.stringify(item.aliasTarget || item.rawValue) : String(item.aliasTarget || item.rawValue || "")}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* SIMPLE STUDIO TABLE VIEW */
              <table className="w-full min-w-[640px] text-left border-collapse text-xs font-sans select-none">
                <thead className="sticky top-0 z-10 bg-background border-b border-border text-[11px] font-medium text-muted-foreground">
                  <tr className="h-9 bg-muted/20">
                    <th
                      onClick={() => handleSortToggle("name")}
                      className="py-2 px-4 cursor-pointer hover:text-foreground transition-colors group/th"
                      title={`Sort by Variable Name (${sortField === "name" && sortDirection === "asc" ? "Descending" : "Ascending"})`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={sortField === "name" ? "text-foreground font-semibold" : "text-muted-foreground"}>
                          Variable
                        </span>
                        {sortField === "name" ? (
                          sortDirection === "asc" ? (
                            <ArrowUpAZ className="w-3.5 h-3.5 text-primary shrink-0" />
                          ) : (
                            <ArrowDownAZ className="w-3.5 h-3.5 text-primary shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/th:text-muted-foreground transition-colors shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="py-2 px-4 w-28">Type</th>
                    <th
                      onClick={() => handleSortToggle("resolved")}
                      className="py-2 px-4 cursor-pointer hover:text-foreground transition-colors group/th"
                      title={`Sort by Value (${sortField === "resolved" && sortDirection === "asc" ? "Descending" : "Ascending"})`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={sortField === "resolved" ? "text-foreground font-semibold" : "text-muted-foreground"}>
                          Resolved Value
                        </span>
                        {sortField === "resolved" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp01 className="w-3.5 h-3.5 text-primary shrink-0" />
                          ) : (
                            <ArrowDown01 className="w-3.5 h-3.5 text-primary shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/th:text-muted-foreground transition-colors shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="py-2 px-4">Alias</th>
                    <th
                      onClick={() => handleSortToggle("collection")}
                      className="py-2 px-4 cursor-pointer hover:text-foreground transition-colors group/th"
                      title={`Sort by Collection (${sortField === "collection" && sortDirection === "asc" ? "Descending" : "Ascending"})`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={sortField === "collection" ? "text-foreground font-semibold" : "text-muted-foreground"}>
                          Collection
                        </span>
                        {sortField === "collection" ? (
                          sortDirection === "asc" ? (
                            <ArrowUpAZ className="w-3.5 h-3.5 text-primary shrink-0" />
                          ) : (
                            <ArrowDownAZ className="w-3.5 h-3.5 text-primary shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/th:text-muted-foreground transition-colors shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="py-2 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVariables.slice(0, visibleCount).map((item) => {
                    const isColor = item.type === "color";
                    const valStr =
                      typeof (item.resolvedValue || item.rawValue) === "object"
                        ? JSON.stringify(item.resolvedValue || item.rawValue)
                        : String(item.resolvedValue || item.rawValue || "");

                    return (
                      <tr
                        key={item.id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setRowMenuState({ item, x: e.clientX, y: e.clientY });
                        }}
                        className="h-10 border-b border-border/40 hover:bg-muted/25 group cursor-default"
                      >
                        <td className="py-2 px-4 font-mono font-medium text-foreground truncate max-w-[260px]">
                          <span
                            onClick={() => handleCopyCssVar(item.name, item.id)}
                            className="cursor-pointer hover:text-primary transition-colors"
                            title={`Click to copy CSS variable for ${item.name}`}
                          >
                            {item.name}
                          </span>
                        </td>
                        <td className="py-2 px-4 font-sans text-xs text-muted-foreground lowercase">
                          {item.type}
                        </td>
                        <td className="py-2 px-4 font-mono text-foreground">
                          <div
                            onClick={() => handleCopyValue(valStr, item.id)}
                            className="inline-flex items-center gap-2 cursor-pointer hover:text-primary transition-colors max-w-[220px]"
                            title={`Click to copy: ${valStr}`}
                          >
                            {isColor && (
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                                style={{ backgroundColor: valStr }}
                              />
                            )}
                            <span className="truncate">{valStr}</span>
                          </div>
                        </td>
                        <td className="py-2 px-4 font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                          {item.isAlias ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono border border-border bg-secondary text-secondary-foreground">
                              {typeof (item.aliasTarget || item.rawValue) === "object"
                                ? JSON.stringify(item.aliasTarget || item.rawValue)
                                : String(item.aliasTarget || item.rawValue || "")}
                            </span>
                          ) : (
                            <span className="opacity-40">—</span>
                          )}
                        </td>
                        <td className="py-2 px-4 font-mono text-xs text-muted-foreground truncate max-w-[160px]">
                          {item.setName}
                        </td>
                        <td className="py-2 px-2 w-10 text-center">
                          <button
                            type="button"
                            aria-label={`Actions for variable ${item.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setRowMenuState({ item, x: rect.right, y: rect.bottom + 4 });
                            }}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                            title="More actions"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {sortedVariables.length > visibleCount && (
              <div className="py-3 px-4 flex items-center justify-center gap-2.5 border-t border-border/40 bg-muted/10 text-xs font-mono text-muted-foreground">
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>
                  Loaded {Math.min(visibleCount, sortedVariables.length).toLocaleString()} of {sortedVariables.length.toLocaleString()} variables (scroll down to auto-load)
                </span>
              </div>
            )}
          </div>

          {/* Shared Variable Actions Menu (1 instance instead of 200 per-row menus) */}
          {rowMenuState && (
            <DropdownMenu
              open={true}
              onOpenChange={(open) => {
                if (!open) setRowMenuState(null);
              }}
            >
              <DropdownMenuTrigger asChild>
                <span
                  aria-hidden="true"
                  style={{
                    position: "fixed",
                    left: rowMenuState.x,
                    top: rowMenuState.y,
                    width: 1,
                    height: 1,
                    pointerEvents: "none",
                  }}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs font-sans">
                <DropdownMenuItem
                  onClick={() => {
                    const item = rowMenuState.item;
                    setRowMenuState(null);
                    handleCopyValue(
                      typeof (item.resolvedValue || item.rawValue) === "object"
                        ? JSON.stringify(item.resolvedValue || item.rawValue)
                        : String(item.resolvedValue || item.rawValue || ""),
                      item.id,
                      "Value"
                    );
                  }}
                  className="cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  <span>Copy Value</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const item = rowMenuState.item;
                    setRowMenuState(null);
                    handleCopyCssVar(item.name, item.id);
                  }}
                  className="cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5 mr-2" />
                  <span>Copy CSS Var</span>
                </DropdownMenuItem>
                {canUserEdit() && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        const item = rowMenuState.item;
                        setRowMenuState(null);
                        setVariableToDelete(item);
                      }}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      <span>Delete Variable</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* MODAL 1: De-sync Confirmation */}
      <Dialog open={isDesyncModalOpen} onOpenChange={setIsDesyncModalOpen}>
        <DialogContent className="sm:max-w-md font-sans">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-sm font-bold">De-sync Figma Variables?</DialogTitle>
            <DialogDescription className="text-xs">
              This will remove all currently synced Figma variables ({allVariables.length} items) from this cloud project. You can re-sync anytime by clicking <strong>Push Figma to Cloud</strong> in your Figma plugin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsDesyncModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDesync}
              disabled={isDesyncing}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDesyncing ? "De-syncing..." : "Confirm De-sync"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Delete Variable Confirmation */}
      <Dialog open={Boolean(variableToDelete)} onOpenChange={() => setVariableToDelete(null)}>
        <DialogContent className="sm:max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Delete Variable?</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete <code className="font-mono text-primary">{variableToDelete?.name}</code> from collection <code className="font-mono">{variableToDelete?.setName}</code>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setVariableToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteVar}
              disabled={isDeletingVar}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeletingVar ? "Deleting..." : "Delete Variable"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Delete Collection Confirmation */}
      <Dialog open={Boolean(collectionToDelete)} onOpenChange={() => setCollectionToDelete(null)}>
        <DialogContent className="sm:max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Delete Entire Collection?</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete the entire Figma collection <code className="font-mono text-primary font-bold">{collectionToDelete}</code>? All variables in this collection will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCollectionToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteCollection}
              disabled={isDeletingCollection}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeletingCollection ? "Deleting..." : "Delete Collection"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
