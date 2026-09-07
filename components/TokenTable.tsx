"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ColorSwatch } from "@/components/ColorSwatch";
import { FlattenedToken } from "@/types/tokens";
import { EditTokenDrawer } from "@/components/EditTokenDrawer";
import {
  Link2,
  SearchX,
  RefreshCw,
  FolderGit2,
  Sparkles,
  Check,
  MoreHorizontal,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  CopyPlus,
} from "lucide-react";
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

interface TokenTableProps {
  onOpenSettings?: () => void;
}

export const TokenTable: React.FC<TokenTableProps> = ({ onOpenSettings }) => {
  const {
    resolvedTokens,
    rawTokens,
    activeGroup,
    searchQuery,
    updateSingleToken,
    deleteToken,
    duplicateToken,
    activeSet,
    credentials,
    setRawTokens,
    setSyncStatus,
    addToast,
  } = useTokenStore();

  const [isFetching, setIsFetching] = useState(false);
  const [editingToken, setEditingToken] = useState<FlattenedToken | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());

  const hasCredentials = Boolean(credentials.owner && credentials.repo && credentials.pat);
  const isTotallyEmpty = Object.keys(rawTokens).length === 0;

  const handleFetchNow = async () => {
    if (!hasCredentials) {
      if (onOpenSettings) onOpenSettings();
      return;
    }

    setIsFetching(true);
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
        title: "Tokens Synced Successfully",
        message: `Discovered and loaded tokens from ${credentials.provider === "github" ? "GitHub" : "Azure DevOps"} (${credentials.repo}@${credentials.branch}).`,
      });
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: "Git Sync Failed",
        message: err.message,
      });
    } finally {
      setIsFetching(false);
    }
  };

  const filteredTokens = useMemo(() => {
    return resolvedTokens.filter((token) => {
      const groupStr = String(token.group || "").toLowerCase();
      // Group filter
      if (activeGroup !== "all") {
        if (activeGroup === "colors" && token.type !== "color" && !groupStr.includes("color")) {
          return false;
        }
        if (
          activeGroup === "spacing" &&
          token.type !== "spacing" &&
          token.type !== "sizing" &&
          !groupStr.includes("spacing")
        ) {
          return false;
        }
        if (
          activeGroup === "borderRadius" &&
          token.type !== "borderRadius" &&
          !groupStr.includes("radius")
        ) {
          return false;
        }
        if (
          activeGroup === "typography" &&
          token.type !== "typography" &&
          token.type !== "fontFamilies" &&
          token.type !== "fontSizes" &&
          !groupStr.includes("typography")
        ) {
          return false;
        }
        if (activeGroup === "components" && !groupStr.includes("component")) {
          return false;
        }
        if (activeGroup === "semantic" && !groupStr.includes("semantic")) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = String(token.name || "").toLowerCase().includes(q);
        const matchRaw = String(token.rawValue || "").toLowerCase().includes(q);
        const matchResolved = String(token.resolvedValue || "").toLowerCase().includes(q);
        const matchSet = String(token.setName || "").toLowerCase().includes(q);
        const matchDesc = token.description ? String(token.description).toLowerCase().includes(q) : false;
        return matchName || matchRaw || matchResolved || matchSet || matchDesc;
      }

      return true;
    });
  }, [resolvedTokens, activeGroup, searchQuery]);

  const sortedTokens = useMemo(() => {
    const list = [...filteredTokens];
    list.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filteredTokens, sortDirection]);

  const toggleSelectToken = (id: string) => {
    setSelectedTokenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTokenIds.size === filteredTokens.length && filteredTokens.length > 0) {
      setSelectedTokenIds(new Set());
    } else {
      setSelectedTokenIds(new Set(filteredTokens.map((t) => t.id)));
    }
  };

  const allSelected = filteredTokens.length > 0 && selectedTokenIds.size === filteredTokens.length;

  if (isTotallyEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xl space-y-6 text-foreground">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FolderGit2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">No Tokens Loaded</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect to your Git repository or load sample data to get started.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {hasCredentials ? (
              <Button
                onClick={handleFetchNow}
                disabled={isFetching}
                className="gap-2 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
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
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Table Header Bar */}
      <div className="px-6 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground capitalize">
            {activeGroup === "all" ? "All Tokens" : activeGroup}
          </h2>
          <Badge variant="outline" className="text-[11px] font-mono">
            {filteredTokens.length} tokens
          </Badge>
          {activeSet !== "ALL" && (
            <Badge variant="violet" className="text-[11px] font-mono">
              Set: {activeSet}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredTokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center p-6 text-muted-foreground">
            <SearchX className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium text-foreground">No matching tokens</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Try adjusting your search query, selecting another category, or choosing a different token set.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              <tr>
                <th className="w-10 px-3 py-2.5 text-center border-r border-border/30">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded-full border-muted-foreground/40 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-primary"
                    title="Select all"
                  />
                </th>
                <th
                  onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="px-4 py-2.5 text-left border-r border-border/30 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NAME</span>
                    <span className="text-xs font-normal">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  </div>
                </th>
                <th className="w-24 px-4 py-2.5 text-left border-r border-border/30">TYPE</th>
                <th className="px-4 py-2.5 text-left border-r border-border/30 min-w-[140px]">VALUE</th>
                <th className="px-4 py-2.5 text-left border-r border-border/30 min-w-[160px]">RESOLVED</th>
                <th className="px-4 py-2.5 text-left border-r border-border/30 min-w-[180px]">DESCRIPTION</th>
                <th className="w-32 px-4 py-2.5 text-left border-r border-border/30">SET</th>
                <th className="w-10 px-2 py-2.5 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-mono">
              {sortedTokens.map((token) => (
                <TokenRow
                  key={token.id}
                  token={token}
                  isSelected={selectedTokenIds.has(token.id)}
                  onToggleSelect={() => toggleSelectToken(token.id)}
                  onUpdate={updateSingleToken}
                  onEdit={() => setEditingToken(token)}
                  onDuplicate={(newName) => duplicateToken(token.setName, token.name.split("."), newName)}
                  onDelete={() => deleteToken(token.setName, token.name.split("."))}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Token Slide-Over Drawer */}
      <EditTokenDrawer
        token={editingToken}
        isOpen={Boolean(editingToken)}
        onClose={() => setEditingToken(null)}
        onSave={updateSingleToken}
      />
    </div>
  );
};

interface TokenRowProps {
  token: FlattenedToken;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onUpdate: (path: string[], newValue: string) => void;
  onEdit: () => void;
  onDuplicate: (newName: string) => void;
  onDelete: () => void;
}

const TokenRow: React.FC<TokenRowProps> = ({
  token,
  isSelected = false,
  onToggleSelect,
  onUpdate,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const { addToast, canUserEdit } = useTokenStore();
  const isEditable = canUserEdit ? canUserEdit() : true;
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
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

  const cssVarName = `var(--${token.name.replace(/\./g, "-")})`;

  const isColor =
    token.type === "color" ||
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(token.resolvedValue || "").trim()) ||
    /^rgba?\(.+\)$/i.test(String(token.resolvedValue || "").trim()) ||
    /^hsla?\(.+\)$/i.test(String(token.resolvedValue || "").trim()) ||
    /^(oklch|lch|color|lab)\(.+\)$/i.test(String(token.resolvedValue || "").trim());

  const isAlias =
    token.isAlias ||
    (typeof token.rawValue === "string" && token.rawValue.startsWith("{") && token.rawValue.endsWith("}"));

  const isOverridden =
    token.resolvedValue === "overridden" ||
    (typeof token.rawValue === "string" && token.rawValue.includes("overridden"));

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      {/* 1. Checkbox */}
      <td className="w-10 px-3 py-2.5 text-center border-r border-border/30 align-middle">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-3.5 w-3.5 rounded-full border-muted-foreground/40 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-primary"
        />
      </td>

      {/* 2. NAME */}
      <td className="px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs align-middle">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            onClick={onEdit}
            className="font-medium text-foreground group-hover:text-primary transition-colors truncate cursor-pointer"
            title={token.name}
          >
            {token.name}
          </span>
          {isOverridden && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
              title="Overridden value"
            />
          )}
        </div>
      </td>

      {/* 3. TYPE */}
      <td className="w-24 px-4 py-2.5 text-left border-r border-border/30 font-sans text-xs text-muted-foreground lowercase align-middle">
        {token.type}
      </td>

      {/* 4. VALUE */}
      <td className="px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs align-middle">
        {isAlias ? (
          <span
            onClick={onEdit}
            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 cursor-pointer hover:border-blue-300 transition-colors"
          >
            {token.rawValue}
          </span>
        ) : (
          <span
            onClick={onEdit}
            className="font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
          >
            {typeof token.rawValue === "object" ? JSON.stringify(token.rawValue) : String(token.rawValue || "")}
          </span>
        )}
      </td>

      {/* 5. RESOLVED */}
      <td className="px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs align-middle">
        {isOverridden ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60">
            overridden
          </span>
        ) : isColor ? (
          <div
            onClick={() => handleCopy(token.resolvedValue, "resolved")}
            className="flex items-center gap-2 cursor-pointer group/swatch"
            title={`Click to copy: ${token.resolvedValue}`}
          >
            <div
              className="w-4 h-4 rounded-full border border-black/15 shadow-2xs shrink-0"
              style={{ backgroundColor: token.resolvedHex || token.resolvedValue }}
            />
            <span className="text-foreground group-hover/swatch:text-primary transition-colors">
              {token.resolvedHex || token.resolvedValue}
            </span>
          </div>
        ) : (
          <span className="text-foreground">
            {typeof token.resolvedValue === "object" ? JSON.stringify(token.resolvedValue) : String(token.resolvedValue || "")}
          </span>
        )}
      </td>

      {/* 6. DESCRIPTION */}
      <td className="px-4 py-2.5 text-left border-r border-border/30 font-sans text-xs text-muted-foreground truncate max-w-xs align-middle">
        {token.description ? (
          <span title={typeof token.description === "object" ? JSON.stringify(token.description) : String(token.description)}>
            {typeof token.description === "object" ? JSON.stringify(token.description) : String(token.description)}
          </span>
        ) : (
          <span className="opacity-40">—</span>
        )}
      </td>

      {/* 7. SET */}
      <td className="w-32 px-4 py-2.5 text-left border-r border-border/30 font-mono text-xs text-muted-foreground align-middle">
        {token.setName}
      </td>

      {/* 8. ACTIONS (⋮) */}
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
          <DropdownMenuContent align="end" className="w-48">
            {isEditable && (
              <>
                <DropdownMenuItem onClick={onEdit} className="gap-2 text-xs">
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
              </>
            )}
            <DropdownMenuItem onClick={() => handleCopy(cssVarName, "var")} className="gap-2 text-xs">
              <Copy className="w-3.5 h-3.5 text-blue-500" />
              <span>Copy CSS Var</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCopy(token.name, "name")} className="gap-2 text-xs">
              <Copy className="w-3.5 h-3.5 text-amber-500" />
              <span>Copy token name</span>
            </DropdownMenuItem>
            {isEditable && (
              <>
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
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
};
