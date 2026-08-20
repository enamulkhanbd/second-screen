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
    loadSampleData,
  } = useTokenStore();

  const [isFetching, setIsFetching] = useState(false);
  const [editingToken, setEditingToken] = useState<FlattenedToken | null>(null);

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
      // Group filter
      if (activeGroup !== "all") {
        if (activeGroup === "colors" && token.type !== "color" && !token.group.toLowerCase().includes("color")) {
          return false;
        }
        if (
          activeGroup === "spacing" &&
          token.type !== "spacing" &&
          token.type !== "sizing" &&
          !token.group.toLowerCase().includes("spacing")
        ) {
          return false;
        }
        if (
          activeGroup === "borderRadius" &&
          token.type !== "borderRadius" &&
          !token.group.toLowerCase().includes("radius")
        ) {
          return false;
        }
        if (
          activeGroup === "typography" &&
          token.type !== "typography" &&
          token.type !== "fontFamilies" &&
          token.type !== "fontSizes" &&
          !token.group.toLowerCase().includes("typography")
        ) {
          return false;
        }
        if (activeGroup === "components" && !token.group.toLowerCase().includes("component")) {
          return false;
        }
        if (activeGroup === "semantic" && !token.group.toLowerCase().includes("semantic")) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = token.name.toLowerCase().includes(q);
        const matchRaw = token.rawValue.toLowerCase().includes(q);
        const matchResolved = token.resolvedValue.toLowerCase().includes(q);
        const matchSet = token.setName.toLowerCase().includes(q);
        const matchDesc = token.description ? token.description.toLowerCase().includes(q) : false;
        return matchName || matchRaw || matchResolved || matchSet || matchDesc;
      }

      return true;
    });
  }, [resolvedTokens, activeGroup, searchQuery]);

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

            <Button
              variant="outline"
              onClick={loadSampleData}
              className="gap-2 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Load Sample Data</span>
            </Button>
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
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5 w-1/4">Token Name</th>
                <th className="py-3 px-5 w-1/3">Raw Value (Editable)</th>
                <th className="py-3 px-5 w-1/4">Visual Preview</th>
                <th className="py-3 px-5 text-right">Set / Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTokens.map((token) => (
                <TokenRow
                  key={token.id}
                  token={token}
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
  onUpdate: (path: string[], newValue: string) => void;
  onEdit: () => void;
  onDuplicate: (newName: string) => void;
  onDelete: () => void;
}

const TokenRow: React.FC<TokenRowProps> = ({
  token,
  onUpdate,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const { addToast } = useTokenStore();
  const [localVal, setLocalVal] = React.useState(token.rawValue);
  const [isSaved, setIsSaved] = React.useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalVal(token.rawValue);
  }, [token.rawValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);
    onUpdate(token.path, newVal);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1200);
  };

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

  return (
    <tr className="hover:bg-muted/40 transition-colors group">
      {/* Token Name & Group */}
      <td className="py-3 px-5 align-middle">
        <div className="flex flex-col">
          <span className="font-mono text-xs font-medium text-foreground group-hover:text-primary transition-colors">
            {token.name}
          </span>
          {token.description && (
            <span className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">
              {token.description}
            </span>
          )}
        </div>
      </td>

      {/* Raw Value Input (Preserves Aliases) */}
      <td className="py-2.5 px-5 align-middle">
        <div className="flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={localVal}
              onChange={handleChange}
              placeholder="e.g. #3b82f6 or {colors.brand.500}"
              className={`w-full font-mono text-xs px-3 py-1.5 rounded-md border transition-all outline-none ${
                token.isAlias
                  ? "border-primary/40 text-primary bg-primary/5 focus:border-primary focus:ring-1 focus:ring-primary"
                  : "border-input bg-transparent text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
              }`}
            />
            {token.isAlias && (
              <span
                title={`Resolves to: ${token.resolvedValue}`}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-primary font-mono pointer-events-none"
              >
                <Link2 className="w-3 h-3" />
                alias
              </span>
            )}
          </div>
          {isSaved && (
            <span className="text-emerald-500 flex items-center text-[10px]" title="Value updated in raw state">
              <Check className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </td>

      {/* Visual Swatch / Preview */}
      <td className="py-2.5 px-5 align-middle">
        <ColorSwatch value={token.resolvedValue} type={token.type} name={token.name} />
      </td>

      {/* Set, Type Badges & 3-Dots Action Menu */}
      <td className="py-2.5 px-5 align-middle text-right">
        <div className="flex items-center justify-end gap-1.5 relative">
          <Badge variant="outline" className="text-[10px] font-mono">
            {token.setName}
          </Badge>
          <Badge variant="violet" className="text-[10px] font-mono">
            {token.type}
          </Badge>

          {/* 3-Dots Action Button & Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="More actions"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
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
                onClick={() => handleCopy(token.name, "name")}
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
