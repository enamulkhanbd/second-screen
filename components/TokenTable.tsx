"use client";

import React, { useMemo, useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ColorSwatch } from "@/components/ColorSwatch";
import { FlattenedToken } from "@/types/tokens";
import {
  Link2,
  SearchX,
  RefreshCw,
  FolderGit2,
  Settings,
  Sparkles,
  GitBranch,
  Check,
} from "lucide-react";

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
    activeSet,
    credentials,
    setRawTokens,
    setSyncStatus,
    addToast,
    loadSampleData,
  } = useTokenStore();

  const [isFetching, setIsFetching] = useState(false);

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

  // If no tokens loaded at all in the app
  if (isTotallyEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950/40 text-center">
        {hasCredentials ? (
          /* Configured Provider Empty State */
          <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 p-8 rounded-2xl shadow-xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  credentials.provider === "github" ? "bg-violet-400" : "bg-blue-400"
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {credentials.provider === "github" ? "GitHub" : "Azure DevOps"} Configured
              </span>
            </div>
            <h3 className="text-base font-semibold text-white">Ready to Sync Design Tokens</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Connected to <span className="font-mono text-zinc-200 font-medium">{credentials.owner}/{credentials.repo}</span> on branch <span className="font-mono text-violet-300 font-medium">{credentials.branch}</span>.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full">
              <button
                onClick={handleFetchNow}
                disabled={isFetching}
                className="w-full flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                {isFetching ? "Syncing..." : "Fetch Tokens Now"}
              </button>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Unconfigured Empty State */
          <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 p-8 rounded-2xl shadow-xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Connect Your Design Tokens</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Connect to your GitHub or Azure DevOps repository using a Personal Access Token (PAT) to view, edit, and push design tokens directly.
            </p>

            <div className="flex flex-col gap-3 mt-6 w-full">
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
                >
                  <FolderGit2 className="w-4 h-4" />
                  Configure Git Repository
                </button>
              )}
              <button
                onClick={loadSampleData}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Load Sample Demo Tokens
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950/40 overflow-hidden">
      {/* Table Header Bar */}
      <div className="px-6 py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white capitalize">
            {activeGroup === "all" ? "All Tokens" : activeGroup}
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/80 text-[11px] font-mono text-zinc-400">
            {filteredTokens.length} tokens
          </span>
          {activeSet !== "ALL" && (
            <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] font-mono text-violet-300">
              Set: {activeSet}
            </span>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredTokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center p-6 text-zinc-500">
            <SearchX className="w-10 h-10 mb-3 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">No matching tokens</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Try adjusting your search query, selecting another category, or choosing a different token set.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5 w-1/4">Token Name</th>
                <th className="py-3 px-5 w-1/3">Raw Value (Editable)</th>
                <th className="py-3 px-5 w-1/4">Visual Preview</th>
                <th className="py-3 px-5 text-right">Set / Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredTokens.map((token) => (
                <TokenRow key={token.id} token={token} onUpdate={updateSingleToken} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

interface TokenRowProps {
  token: FlattenedToken;
  onUpdate: (path: string[], newValue: string) => void;
}

const TokenRow: React.FC<TokenRowProps> = ({ token, onUpdate }) => {
  const [localVal, setLocalVal] = React.useState(token.rawValue);
  const [isSaved, setIsSaved] = React.useState(false);

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

  return (
    <tr className="hover:bg-zinc-900/40 transition-colors group">
      {/* Token Name & Group */}
      <td className="py-3 px-5 align-middle">
        <div className="flex flex-col">
          <span className="font-mono text-xs font-medium text-zinc-200 group-hover:text-white transition-colors">
            {token.name}
          </span>
          {token.description && (
            <span className="text-[11px] text-zinc-500 truncate max-w-xs mt-0.5">
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
              className={`w-full font-mono text-xs px-3 py-1.5 rounded-lg bg-zinc-900/90 border transition-all outline-none ${
                token.isAlias
                  ? "border-violet-500/40 text-violet-200 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 bg-violet-950/20"
                  : "border-zinc-700/70 text-zinc-100 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              }`}
            />
            {token.isAlias && (
              <span
                title={`Resolves to: ${token.resolvedValue}`}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-violet-400 font-mono pointer-events-none"
              >
                <Link2 className="w-3 h-3" />
                alias
              </span>
            )}
          </div>
          {isSaved && (
            <span className="text-emerald-400 flex items-center text-[10px]" title="Value updated in raw state">
              <Check className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </td>

      {/* Visual Swatch / Preview */}
      <td className="py-2.5 px-5 align-middle">
        <ColorSwatch value={token.resolvedValue} type={token.type} name={token.name} />
      </td>

      {/* Set & Type Badges */}
      <td className="py-2.5 px-5 align-middle text-right">
        <div className="flex items-center justify-end gap-1.5">
          <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-[10px] font-mono text-zinc-400">
            {token.setName}
          </span>
          <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 text-[10px] font-mono border border-violet-500/20">
            {token.type}
          </span>
        </div>
      </td>
    </tr>
  );
};
