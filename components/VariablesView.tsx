"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
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
import { compareTokens, compareTokenNames } from "@/utils/transformTokens";
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
    setFigmaVariables,
    desyncFigmaVariablesAction,
    deleteFigmaVariableAction,
    deleteFigmaCollectionAction,
    canUserEdit,
    addToast,
    setSidebarTab,
  } = useTokenStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [viewLayout, setViewLayout] = useState<"grid" | "table">("grid");
  const [sortField, setSortField] = useState<"name" | "resolved" | "collection">("resolved");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Auto-fetch fresh Figma variables on mount or project switch
  const fetchVariables = async () => {
    if (!currentOrg?.id || !currentProject?.id) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `/api/v1/tokens?orgId=${encodeURIComponent(currentOrg.id)}&projectId=${encodeURIComponent(currentProject.id)}`,
        { headers: { "x-internal-client": "tokens-platform" } }
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

  useEffect(() => {
    fetchVariables();
  }, [currentOrg?.id, currentProject?.id]);

  // Extract all Figma collection set names
  const collections = useMemo(() => {
    if (!figmaVariables) return [];
    return Object.keys(figmaVariables).filter((k) => !k.startsWith("$"));
  }, [figmaVariables]);

  // Flattened resolved Figma variables
  const allVariables = figmaResolvedVariables;

  // Filtered variables
  const filteredVariables = useMemo(() => {
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = String(item.name || "").toLowerCase().includes(q);
        const matchValue = String(item.resolvedValue || item.rawValue || "").toLowerCase().includes(q);
        const matchSet = String(item.setName || "").toLowerCase().includes(q);
        const matchAlias = String(item.aliasTarget || "").toLowerCase().includes(q);
        if (!matchName && !matchValue && !matchSet && !matchAlias) return false;
      }

      return true;
    });
  }, [allVariables, selectedCollection, selectedType, searchQuery]);

  // Sorted variables
  const sortedVariables = useMemo(() => {
    const list = [...filteredVariables];
    list.sort((a, b) => {
      if (sortField === "collection") {
        const cmp = compareTokenNames(a.setName, b.setName, sortDirection);
        if (cmp !== 0) return cmp;
        return compareTokenNames(a.name, b.name, sortDirection);
      }
      return compareTokens(a, b, sortField, sortDirection);
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
      <header className="px-6 py-4 border-b border-border/80 bg-card/60 backdrop-blur flex-shrink-0 flex items-center justify-between z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground leading-tight">Figma Variables</h1>
                {hasVariables ? (
                  <Badge variant="success" className="text-[10px] gap-1 px-2 py-0.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Synced</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground font-medium">
                    Not Synced
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Native variable collections &amp; modes synced directly from Figma companion plugin.
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
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setSidebarTab("project-settings")}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Plugin Settings</span>
          </Button>
        </div>
      </header>

      {/* Main Body */}
      {!hasVariables ? (
        /* Empty State: Prompt to sync from Figma */
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
          <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-border shadow-sm space-y-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-500/20 to-indigo-500/20 text-violet-500 flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-foreground">No Figma Variables Synced Yet</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your desktop Figma file with our companion plugin to push your variable collections, color modes, and typography styles directly into this workspace.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 text-left space-y-2 text-xs">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>Quick 2-Step Sync:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <li>Run <strong>Tokens Platform</strong> plugin inside your Figma desktop canvas.</li>
                <li>Click <strong>Push Figma to Cloud</strong> to automatically export all variables.</li>
              </ol>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                onClick={() => setSidebarTab("project-settings")}
                className="text-xs font-bold gap-1.5 h-9"
              >
                <span>Pair Figma Plugin</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Variables Workspace */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 px-6 border-b border-border/60 bg-muted/20 flex-shrink-0 text-xs">
            <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Total Variables
              </span>
              <div className="text-lg font-black text-foreground font-mono">{stats.total}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Collections
              </span>
              <div className="text-lg font-black text-violet-500 font-mono">{stats.collectionsCount}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Color Variables
              </span>
              <div className="text-lg font-black text-emerald-500 font-mono">{stats.colors}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Dimensions / Numbers
              </span>
              <div className="text-lg font-black text-blue-500 font-mono">{stats.dimensions}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Bound Aliases
              </span>
              <div className="text-lg font-black text-amber-500 font-mono">{stats.aliases}</div>
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
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    selectedType === "ALL"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({allVariables.length})
                </button>
                <button
                  onClick={() => setSelectedType("color")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    selectedType === "color"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Colors ({stats.colors})
                </button>
                <button
                  onClick={() => setSelectedType("dimension")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    selectedType === "dimension"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Numbers ({stats.dimensions})
                </button>
                <button
                  onClick={() => setSelectedType("alias")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
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
                className={`p-1.5 rounded-md transition-all ${
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
                className={`p-1.5 rounded-md transition-all ${
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
          <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4 lg:p-6">
            {filteredVariables.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-foreground">No variables match your filters</p>
                <p className="text-[11px] mt-1">Try searching for a different name or clearing selected type.</p>
              </div>
            ) : viewLayout === "grid" ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {sortedVariables.map((item) => {
                  const isColor = item.type === "color";
                  const isCopied = copiedId === item.id;

                  return (
                    <Card
                      key={item.id}
                      className="border-border hover:border-primary/50 transition-all shadow-xs group flex flex-col justify-between"
                    >
                      <CardHeader className="p-3.5 pb-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0">
                            {item.setName}
                          </Badge>

                          {/* Quick Variable Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 text-xs font-sans">
                              <DropdownMenuItem
                                onClick={() => handleCopyValue(item.resolvedValue || item.rawValue, item.id, "Value")}
                              >
                                <Copy className="w-3.5 h-3.5 mr-2" />
                                <span>Copy Value</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyCssVar(item.name, item.id)}>
                                <Code2 className="w-3.5 h-3.5 mr-2" />
                                <span>Copy CSS Var</span>
                              </DropdownMenuItem>
                              {canUserEdit() && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setVariableToDelete(item)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    <span>Delete Variable</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                        {/* Visual Swatch / Dimension Box */}
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
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">
                              {item.type}
                            </span>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {typeof (item.resolvedValue || item.rawValue) === "object" ? JSON.stringify(item.resolvedValue || item.rawValue) : String(item.resolvedValue || item.rawValue || "")}
                            </span>
                          </div>
                        )}

                        {/* Alias Badge if bound */}
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
              /* TABLE VIEW */
              <div className="w-full min-w-0 sm:min-w-[640px] rounded-xl border border-border bg-card shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    <tr>
                      <th
                        onClick={() => handleSortToggle("collection")}
                        className="py-2.5 px-4 border-r border-border/30 cursor-pointer hover:text-foreground transition-colors group/th select-none"
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
                      <th
                        onClick={() => handleSortToggle("name")}
                        className="py-2.5 px-4 border-r border-border/30 cursor-pointer hover:text-foreground transition-colors group/th select-none"
                        title={`Sort by Variable Name (${sortField === "name" && sortDirection === "asc" ? "Descending" : "Ascending"})`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={sortField === "name" ? "text-foreground font-semibold" : "text-muted-foreground"}>
                            Variable Name
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
                      <th className="py-2.5 px-4 border-r border-border/30">Preview</th>
                      <th
                        onClick={() => handleSortToggle("resolved")}
                        className="py-2.5 px-4 border-r border-border/30 cursor-pointer hover:text-foreground transition-colors group/th select-none"
                        title={`Sort by Resolved Value (${sortField === "resolved" && sortDirection === "asc" ? "Descending" : "Ascending"})`}
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
                      <th className="py-2.5 px-4 border-r border-border/30">Type</th>
                      <th className="py-2.5 px-4 border-r border-border/30">Alias Binding</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {sortedVariables.map((item) => {
                      const isColor = item.type === "color";

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-2.5 px-4 border-r border-border/30 font-mono text-xs text-muted-foreground">
                            {item.setName}
                          </td>
                          <td className="py-2.5 px-4 border-r border-border/30 font-mono font-medium text-foreground truncate max-w-[200px]">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-4 border-r border-border/30">
                            {isColor ? (
                              <div
                                className="w-4 h-4 rounded-full border border-black/15 shadow-2xs"
                                style={{ backgroundColor: typeof (item.resolvedValue || item.rawValue) === "string" ? (item.resolvedValue || item.rawValue) : undefined }}
                              />
                            ) : (
                              <span className="font-mono text-[11px] text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 border-r border-border/30 font-mono text-foreground">
                            {typeof (item.resolvedValue || item.rawValue) === "object" ? JSON.stringify(item.resolvedValue || item.rawValue) : String(item.resolvedValue || item.rawValue || "")}
                          </td>
                          <td className="py-2.5 px-4 border-r border-border/30 font-sans text-xs text-muted-foreground lowercase">
                            {item.type}
                          </td>
                          <td className="py-2.5 px-4 border-r border-border/30 font-mono text-xs text-muted-foreground truncate max-w-[150px]">
                            {item.isAlias ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                                {typeof (item.aliasTarget || item.rawValue) === "object" ? JSON.stringify(item.aliasTarget || item.rawValue) : String(item.aliasTarget || item.rawValue || "")}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyCssVar(item.name, item.id)}
                                title="Copy CSS Variable"
                                className="h-7 w-7"
                              >
                                <Code2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyValue(item.resolvedValue || item.rawValue, item.id)}
                                title="Copy Value"
                                className="h-7 w-7"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              {canUserEdit() && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setVariableToDelete(item)}
                                  title="Delete Variable"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
