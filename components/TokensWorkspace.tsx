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

  // Filter tokens strictly for the active set (or all sets if 'ALL')
  const displayedTokens = useMemo(() => {
    return resolvedTokens.filter((token) => {
      // Set filter
      if (activeSet && activeSet !== "ALL") {
        if (token.setName !== activeSet && !token.setName.endsWith(`.${activeSet}`)) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== "all") {
        if (selectedType === "color" && token.type !== "color") return false;
        if (selectedType === "typography" && token.type !== "typography" && !token.type.toLowerCase().includes("font")) return false;
        if (selectedType === "spacing" && token.type !== "spacing" && token.type !== "sizing" && token.type !== "dimension") return false;
        if (selectedType === "borderRadius" && token.type !== "borderRadius") return false;
        if (selectedType === "boxShadow" && token.type !== "boxShadow") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = token.name.toLowerCase().includes(q);
        const matchRaw = token.rawValue.toLowerCase().includes(q);
        const matchResolved = token.resolvedValue.toLowerCase().includes(q);
        const matchSet = token.setName.toLowerCase().includes(q);
        return matchName || matchRaw || matchResolved || matchSet;
      }

      return true;
    });
  }, [resolvedTokens, activeSet, selectedType, searchQuery]);

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
    try {
      const parsed = JSON.parse(code);
      updateSetJson(currentSetKey, parsed);
      setJsonError(null);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON syntax");
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(code);
      const pretty = JSON.stringify(parsed, null, 2);
      setCode(pretty);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message || "Cannot format invalid JSON");
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background font-sans">
      {/* 1. Main Workspace Top Header Toolbar with View Switcher */}
      <div className="h-13 border-b border-border px-5 flex items-center justify-between bg-card select-none flex-shrink-0">
        {/* Left: Active Set Title & Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 font-mono">
            {tokensViewMode === "preview" ? (
              <Layers className="w-4 h-4 text-primary flex-shrink-0" />
            ) : (
              <FileCode className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <span className="text-sm font-bold text-foreground truncate">
              {activeSet === "ALL" ? "All Token Sets" : relativeFileName}
            </span>
          </div>

          <Badge variant="outline" className="text-xs font-mono">
            {displayedTokens.length} tokens
          </Badge>

          {tokensViewMode === "json" && hasUnsavedChanges && (
            <Badge variant="warning" className="text-[11px] font-mono animate-pulse">
              Unsaved
            </Badge>
          )}

          {tokensViewMode === "json" && isSaved && (
            <Badge variant="success" className="text-[11px] font-mono gap-1">
              <Check className="w-3 h-3" />
              <span>Saved</span>
            </Badge>
          )}
        </div>

        {/* Right: Actions + Switcher aligned on the right */}
        <div className="flex items-center gap-4">
          {tokensViewMode === "preview" ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs w-44"
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
          <div className="h-5 w-px bg-border" />

          {/* Switcher Button [ Lines (Preview) | {} (JSON) ] */}
          <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setTokensViewMode("preview")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                tokensViewMode === "preview"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Preview Tokens (Table View)"
            >
              <AlignLeft className="w-4 h-4 stroke-[2.2]" />
            </button>

            <button
              onClick={() => setTokensViewMode("json")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                tokensViewMode === "json"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="JSON Code Editor"
            >
              <Braces className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Workspace Body: PREVIEW vs JSON */}
      {tokensViewMode === "preview" ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Category Filter Chips Bar */}
          <div className="h-10 px-5 border-b border-border bg-muted/30 flex items-center gap-1.5 overflow-x-auto select-none flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground mr-1 flex-shrink-0" />
            {[
              { id: "all", label: "All Types" },
              { id: "color", label: "Color" },
              { id: "typography", label: "Typography" },
              { id: "spacing", label: "Spacing & Sizing" },
              { id: "borderRadius", label: "Border Radius" },
              { id: "boxShadow", label: "Shadow" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedType(cat.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedType === cat.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-y-auto">
            {displayedTokens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-center p-6 text-muted-foreground">
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
                      <th className="py-3 px-5 w-64 min-w-[200px]">Token Name</th>
                      <th className="py-3 px-5 min-w-[360px]">Raw Value / Properties</th>
                      <th className="py-3 px-5 min-w-[280px]">Visual Preview</th>
                      <th className="py-3 px-5 w-44 min-w-[130px] text-right">Set / Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {displayedTokens.map((token) => (
                      <TokenPreviewRow
                        key={token.id}
                        token={token}
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
            <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/30 text-destructive text-xs flex items-center gap-2 font-mono select-text flex-shrink-0">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{jsonError}</span>
            </div>
          )}

          {/* Code Editor Area */}
          <div className="flex-1 flex overflow-hidden font-mono text-[13px]">
            {/* Line Numbers Bar */}
            <div className="w-12 py-4 select-none text-right pr-3 bg-muted/40 border-r border-border text-muted-foreground text-xs font-mono flex-shrink-0 overflow-hidden leading-[22px]">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1}>{i + 1}</div>
              ))}
            </div>

            {/* Code Textarea */}
            <div className="flex-1 relative overflow-hidden bg-background">
              <textarea
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  try {
                    JSON.parse(e.target.value);
                    setJsonError(null);
                  } catch (err: any) {
                    setJsonError(err.message);
                  }
                }}
                onKeyDown={handleTextareaKeyDown}
                spellCheck={false}
                className="w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-[13px] leading-[22px] text-foreground selection:bg-primary/20 selection:text-primary"
                placeholder="{\n  \n}"
              />
            </div>
          </div>

          {/* Footer Status */}
          <div className="h-8 border-t border-border px-4 flex items-center justify-between text-xs text-muted-foreground bg-muted/40 select-none flex-shrink-0 font-mono">
            <div className="flex items-center gap-3">
              <span>JSON</span>
              <span>•</span>
              <span>{lineCount} lines</span>
              <span>•</span>
              <span>{new Blob([code]).size} bytes</span>
            </div>

            <div className="flex items-center gap-2">
              {jsonError ? (
                <span className="text-destructive flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Syntax Error</span>
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid JSON</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Token Slide-Over Right Drawer */}
      <EditTokenDrawer
        token={editingToken}
        isOpen={Boolean(editingToken)}
        onClose={() => setEditingToken(null)}
        onSave={updateSingleToken}
      />

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
  onUpdate: (path: string[], newValue: any) => void;
  onEdit: () => void;
  onDuplicate: (newName: string) => void;
  onDelete: () => void;
}

const TokenPreviewRow: React.FC<TokenPreviewRowProps> = ({
  token,
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

  return (
    <tr className="hover:bg-muted/40 transition-colors group">
      {/* Token Name & Description */}
      <td className="py-3 px-5 align-middle w-64 min-w-[200px]">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
            {token.name}
          </span>
          {token.description && (
            <span className="text-[11px] text-muted-foreground font-sans truncate max-w-xs mt-0.5">
              {token.description}
            </span>
          )}
        </div>
      </td>

      {/* Raw Value / Structured Composite Properties */}
      <td className="py-2.5 px-5 align-middle min-w-[360px]">
        <TokenRawValueCell token={token} onUpdate={onUpdate} />
      </td>

      {/* Rich Visual Specimen / Swatch Preview */}
      <td className="py-2.5 px-5 align-middle min-w-[280px]">
        <TokenVisualPreviewCell token={token} />
      </td>

      {/* Set, Type Badges & 3-Dots Context Menu */}
      <td className="py-2.5 px-5 align-middle text-right w-48 min-w-[150px]">
        <div className="flex items-center justify-end gap-2 relative">
          <Badge variant="outline" className="text-[10px] font-mono">
            {token.setName}
          </Badge>
          <Badge variant="violet" className="text-[10px] font-mono">
            {token.type}
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
                <CopyPlus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Duplicate token</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCopy(cssVarName, "css")}
                className="gap-2 text-xs font-mono justify-between"
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-3 h-3 text-muted-foreground" />
                  <span>Copy CSS Var</span>
                </div>
                {copiedType === "css" && (
                  <Check className="w-3 h-3 text-emerald-500" />
                )}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCopy(token.resolvedValue, "resolved")}
                className="gap-2 text-xs font-mono justify-between"
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-3 h-3 text-muted-foreground" />
                  <span>Copy Value</span>
                </div>
                {copiedType === "resolved" && (
                  <Check className="w-3 h-3 text-emerald-500" />
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  if (confirm(`Delete token "${token.name}" from set "${token.setName}"?`)) {
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
