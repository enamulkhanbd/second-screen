"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  TokenRawValueCell,
  TokenVisualPreviewCell,
} from "@/components/TokenValueFormatter";
import { EditTokenDrawer } from "@/components/EditTokenDrawer";
import { FlattenedToken } from "@/types/tokens";
import {
  FileCode,
  Search,
  Check,
  Sparkles,
  RotateCcw,
  Save,
  AlertCircle,
  CheckCircle2,
  Layers,
  SearchX,
  SlidersHorizontal,
  AlignLeft,
  Braces,
  MoreHorizontal,
  Edit2,
  Copy,
  Plus,
  CopyPlus,
  Trash2,
  FolderGit2,
  GitBranch,
  RefreshCw,
  FolderTree,
  List,
  ChevronsUpDown,
  ChevronsDownUp,
  ChevronDown,
  ChevronRight,
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
}

export const TokensWorkspace: React.FC<TokensWorkspaceProps> = ({ onOpenSettings }) => {
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
    fetchLiveTokens,
    syncStatus,
    canUserEdit,
    addToast,
  } = useTokenStore();

  const allSetKeys = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  }, [rawTokens]);

  const currentSetKey = activeSet && activeSet !== "ALL" ? activeSet : allSetKeys[0] || "";

  // -------------------------------------------------------------
  // PREVIEW MODE STATE & FILTERING
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [editingToken, setEditingToken] = useState<FlattenedToken | null>(null);
  const [isAddTokenOpen, setIsAddTokenOpen] = useState(false);

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
    };
    for (const t of setTokens) {
      const typeStr = String(t.type || "").toLowerCase();
      if (t.type === "color") counts.color++;
      else if (t.type === "typography" || typeStr.includes("font")) counts.typography++;
      else if (t.type === "spacing" || t.type === "sizing" || t.type === "dimension") counts.spacing++;
      else if (t.type === "borderRadius") counts.borderRadius++;
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

  // Grouping state for multi-level hierarchical tree view
  const [isGroupedView, setIsGroupedView] = useState<boolean>(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Multi-level recursive group tree from displayed tokens
  const groupTree = useMemo(() => {
    return buildTokenGroupTree(displayedTokens, (token) => token.name.split("."));
  }, [displayedTokens]);

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

  const renderWorkspaceGroupTree = (node: TokenGroupNode<FlattenedToken>): React.ReactNode => {
    const isCollapsed = Boolean(collapsedGroups[node.id]);
    const levelBg = [
      "bg-muted/70 text-foreground font-bold border-t border-b border-border/80", // Level 1
      "bg-muted/50 text-foreground font-semibold border-t border-b border-border/60", // Level 2
      "bg-muted/30 text-foreground/90 font-medium border-t border-b border-border/40", // Level 3
      "bg-muted/15 text-foreground/80 font-medium border-t border-border/20", // Level 4+
    ];
    const headerClass = levelBg[Math.min(node.level - 1, levelBg.length - 1)];

    return (
      <React.Fragment key={node.id}>
        <tr
          onClick={() => toggleGroup(node.id)}
          className={`${headerClass} hover:bg-muted/90 transition-colors cursor-pointer select-none`}
        >
          <td
            colSpan={4}
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

        {!isCollapsed && (
          <>
            {node.subgroups.map((sub) => renderWorkspaceGroupTree(sub))}
            {node.items.map((token) => (
              <TokenPreviewRow
                key={token.id}
                token={token}
                level={node.level}
                isGrouped={isGroupedView}
                onUpdate={updateSingleToken}
                onEdit={() => setEditingToken(token)}
                onDuplicate={(name) => duplicateToken(token.setName, token.name.split("."), name)}
                onDelete={() => deleteToken(token.setName, token.name.split("."))}
              />
            ))}
          </>
        )}
      </React.Fragment>
    );
  };

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

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const lineCount = useMemo(() => code.split("\n").length, [code]);
  const relativeFileName = `${currentSetKey}.json`;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background font-sans select-none">
      {/* 1. Main Workspace Top Header Toolbar with View Switcher (Matches Themes tab design) */}
      <div className="h-12 px-6 border-b border-border bg-muted/20 flex items-center justify-between flex-shrink-0 transition-colors">
        {/* Left: Active Set Title & Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-semibold text-sm text-foreground truncate">
            {activeSet === "ALL" ? "All Token Sets" : relativeFileName}
          </span>

          <Badge variant="outline" className="text-[11px] font-mono py-0 px-2">
            {displayedTokens.length} tokens
          </Badge>

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

        {/* Right: Actions + Switcher aligned on the right */}
        <div className="flex items-center gap-3">
          {/* Sync Provider Badge */}
          {credentials.repo && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/60 text-[11px] font-mono text-muted-foreground">
              <FolderGit2 className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground truncate max-w-[120px]">{credentials.repo}</span>
              <span className="text-[10px]">@{credentials.branch || "main"}</span>
            </div>
          )}

          {tokensViewMode === "preview" ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs font-mono w-52"
                />
              </div>

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
                className="gap-1.5 h-8 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Token</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFormat}
                className="gap-1.5 h-8 text-xs font-semibold"
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
                  className="gap-1 h-8 text-xs font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="gap-1.5 h-8 text-xs font-bold"
                title="Save JSON (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </Button>
            </div>
          )}

          {/* Divider */}
          <div className="h-5 w-px bg-border mx-0.5" />

          {/* Switcher Button [ Lines (Preview) | {} (JSON) ] */}
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
        </div>
      </div>

      {/* Sync Provider Notification Banner when unlinked */}
      {!credentials.repo && (
        <div className="px-6 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>
              Connect a <strong>Git Sync Provider</strong> (GitHub, GitLab, Azure DevOps, Bitbucket) to version and sync design tokens with your repository.
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

      {/* 2. Workspace Body: PREVIEW vs JSON */}
      {tokensViewMode === "preview" ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Category Filter Chips Bar & Grouping Switcher */}
          <div className="h-11 px-6 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0 select-none overflow-x-auto scrollbar-none transition-colors">
            {/* Left: Type Chips */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Type:</span>
              </span>

              {[
                { id: "all", label: "All Types", count: setTokens.length },
                { id: "color", label: "Color", count: typeCounts.color },
                { id: "typography", label: "Typography", count: typeCounts.typography },
                { id: "spacing", label: "Spacing & Sizing", count: typeCounts.spacing },
                { id: "borderRadius", label: "Border Radius", count: typeCounts.borderRadius },
                { id: "boxShadow", label: "Shadow", count: typeCounts.boxShadow },
              ].map((cat) => {
                const isSelected = selectedType === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedType(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-background text-foreground font-semibold shadow-2xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? "bg-muted text-foreground"
                          : "bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {cat.count}
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

          {/* Table Content with generous top/bottom padding */}
          <div className="flex-1 overflow-y-auto pb-8">
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-6 w-64 min-w-[200px]">
                        Token Name {isGroupedView && <span className="text-[10px] font-normal lowercase">({groupTree.length} groups)</span>}
                      </th>
                      <th className="py-3.5 px-6 min-w-[360px]">Raw Value / Properties</th>
                      <th className="py-3.5 px-6 min-w-[280px]">Visual Preview</th>
                      <th className="py-3.5 px-6 w-44 min-w-[130px] text-right">Set / Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {isGroupedView
                      ? groupTree.map((node) => renderWorkspaceGroupTree(node))
                      : displayedTokens.map((token) => (
                          <TokenPreviewRow
                            key={token.id}
                            token={token}
                            level={0}
                            isGrouped={false}
                            onUpdate={updateSingleToken}
                            onEdit={() => setEditingToken(token)}
                            onDuplicate={(name) => duplicateToken(token.setName, token.name.split("."), name)}
                            onDelete={() => deleteToken(token.setName, token.name.split("."))}
                          />
                        ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* JSON Mode View */
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Syntax Error Banner */}
          {jsonError && (
            <div className="px-6 py-2 bg-destructive/10 border-b border-destructive/30 text-destructive text-xs flex items-center gap-2 font-mono select-text flex-shrink-0">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{jsonError}</span>
            </div>
          )}

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
              className="w-full h-full p-6 font-mono text-xs leading-relaxed bg-background text-foreground resize-none focus:outline-hidden selection:bg-primary/20 border-none select-text"
              placeholder="// Select a token set to view and edit its raw JSON representation..."
            />
          </div>
        </div>
      )}

      {/* Edit Token Drawer */}
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

      {/* Add Token Modal */}
      {isAddTokenOpen && (
        <AddTokenModal
          isOpen={isAddTokenOpen}
          onClose={() => setIsAddTokenOpen(false)}
          defaultSetName={activeSet !== "ALL" ? activeSet : undefined}
        />
      )}
    </div>
  );
};

interface TokenPreviewRowProps {
  token: FlattenedToken;
  level?: number;
  isGrouped?: boolean;
  onUpdate: (path: string[], newValue: any) => void;
  onEdit: () => void;
  onDuplicate: (newName: string) => void;
  onDelete: () => void;
}

const TokenPreviewRow: React.FC<TokenPreviewRowProps> = ({
  token,
  level = 0,
  isGrouped = false,
  onUpdate,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => {
        setCopiedType(null);
      }, 900);
    }
  };

  const cssVarName = `var(--${token.name.replace(/\./g, "-")})`;
  const tokenParts = String(token.name || "").split(".");
  const leafName = tokenParts[tokenParts.length - 1] || token.name;

  return (
    <tr className="hover:bg-muted/40 transition-colors group">
      {/* Token Name & Description */}
      <td
        className="py-3 px-6 align-middle w-64 min-w-[200px]"
        style={{ paddingLeft: isGrouped ? `${Math.max(24, (level + 1) * 20 + 16)}px` : "24px" }}
      >
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
            {isGrouped ? leafName : typeof token.name === "string" ? token.name : String(token.name || "")}
          </span>
          {isGrouped && tokenParts.length > 1 && (
            <span className="text-[10px] text-muted-foreground font-mono truncate opacity-60">
              {token.name}
            </span>
          )}
          {token.description && (
            <span className="text-[11px] text-muted-foreground font-sans truncate max-w-xs mt-0.5">
              {typeof token.description === "object" ? JSON.stringify(token.description) : String(token.description)}
            </span>
          )}
        </div>
      </td>

      {/* Raw Value / Structured Composite Properties */}
      <td className="py-3 px-6 align-middle min-w-[360px]">
        <TokenRawValueCell token={token} onUpdate={onUpdate} />
      </td>

      {/* Rich Visual Specimen / Swatch Preview */}
      <td className="py-3 px-6 align-middle min-w-[280px]">
        <TokenVisualPreviewCell token={token} />
      </td>

      {/* Set, Type Badges & 3-Dots Context Menu */}
      <td className="py-3 px-6 align-middle text-right w-48 min-w-[150px]">
        <div className="flex items-center justify-end gap-2 relative">
          <Badge variant="outline" className="text-[10px] font-mono">
            {typeof token.setName === "string" ? token.setName : String(token.setName || "")}
          </Badge>
          <Badge variant="violet" className="text-[10px] font-mono">
            {typeof token.type === "string" ? token.type : String(token.type || "")}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={onEdit}
                className="gap-2 text-xs"
              >
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
                className="gap-2 text-xs"
              >
                <CopyPlus className="w-3.5 h-3.5 text-emerald-500" />
                <span>Duplicate token</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCopy(cssVarName, "var")}
                className="gap-2 text-xs"
              >
                <Copy className="w-3.5 h-3.5 text-blue-500" />
                <span>Copy CSS Var ({cssVarName})</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCopy(token.name, "name")}
                className="gap-2 text-xs"
              >
                <Copy className="w-3.5 h-3.5 text-amber-500" />
                <span>Copy token name</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  if (confirm(`Are you sure you want to delete token "${token.name}"?`)) {
                    onDelete();
                  }
                }}
                className="gap-2 text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete token</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
};
