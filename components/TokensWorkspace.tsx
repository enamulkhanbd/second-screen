"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ColorSwatch } from "@/components/ColorSwatch";
import { FlattenedToken, TokenType } from "@/types/tokens";
import {
  FileCode,
  FileJson,
  Eye,
  Search,
  Check,
  Link2,
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
} from "lucide-react";

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
    syncMeta,
    addToast,
    tokensViewMode,
    setTokensViewMode,
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

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(code);
      const formatted = JSON.stringify(parsed, null, 2);
      setCode(formatted);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(`Invalid JSON syntax: ${err.message}`);
    }
  };

  const handleDiscard = () => {
    if (currentSetKey && rawTokens[currentSetKey] !== undefined) {
      setCode(JSON.stringify(rawTokens[currentSetKey], null, 2));
      setJsonError(null);
    }
  };

  const handleSave = () => {
    if (!currentSetKey) return;
    try {
      const parsed = JSON.parse(code);
      updateSetJson(currentSetKey, parsed);
      setJsonError(null);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      addToast({
        type: "success",
        title: "JSON Saved",
        message: `Saved changes to ${currentSetKey}.json`,
      });
    } catch (err: any) {
      setJsonError(`Cannot save invalid JSON: ${err.message}`);
      addToast({
        type: "error",
        title: "Invalid JSON Syntax",
        message: err.message,
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        if (tokensViewMode === "json") {
          e.preventDefault();
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, currentSetKey, tokensViewMode]);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  const repoFilePath = syncMeta?.files?.[currentSetKey] || relativeFileName;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#0c0c10] font-sans">
      {/* 1. Main Workspace Top Header Toolbar with View Switcher */}
      <div className="h-13 border-b border-zinc-200 dark:border-zinc-800/80 px-5 flex items-center justify-between bg-zinc-50/90 dark:bg-[#0e0e13] select-none flex-shrink-0">
        {/* Left: Active Set Title & Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 font-mono">
            {tokensViewMode === "preview" ? (
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            )}
            <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
              {activeSet === "ALL" ? "All Token Sets" : relativeFileName}
            </span>
          </div>

          <span className="px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono font-medium">
            {displayedTokens.length} tokens
          </span>

          {tokensViewMode === "json" && hasUnsavedChanges && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[11px] font-semibold font-mono animate-pulse border border-amber-300 dark:border-amber-800/60">
              Unsaved
            </span>
          )}

          {tokensViewMode === "json" && isSaved && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold font-mono flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Saved</span>
            </span>
          )}
        </div>

        {/* Right: Actions + Switcher aligned on the right */}
        <div className="flex items-center gap-3">
          {tokensViewMode === "preview" ? (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-emerald-500 w-44 transition-all"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleFormat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-xs"
                title="Prettify JSON"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Format</span>
              </button>

              {hasUnsavedChanges && (
                <button
                  onClick={handleDiscard}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  hasUnsavedChanges
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                }`}
                title="Save JSON (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="h-5 w-px bg-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800" />

          {/* Switcher Button [ Lines (Preview) | {} (JSON) ] matching app theme style */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setTokensViewMode("preview")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                tokensViewMode === "preview"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs ring-1 ring-zinc-200 dark:ring-zinc-700"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
              title="Preview Tokens (Table View)"
            >
              <AlignLeft className="w-4 h-4 stroke-[2.2]" />
            </button>

            <button
              onClick={() => setTokensViewMode("json")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                tokensViewMode === "json"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs ring-1 ring-zinc-200 dark:ring-zinc-700"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
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
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-[#09090d]">
          {/* Category Filter Chips Bar */}
          <div className="h-10 px-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-[#0b0b10] flex items-center gap-1.5 overflow-x-auto select-none flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 mr-1 flex-shrink-0" />
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
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-y-auto">
            {displayedTokens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-center p-6 text-zinc-500">
                <SearchX className="w-10 h-10 mb-3 text-zinc-400 dark:text-zinc-600 opacity-60" />
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  No matching tokens in this set
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Try adjusting your search query, selecting another category, or choosing a different token set on the left.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-5 w-1/4">Token Name</th>
                    <th className="py-3 px-5 w-1/3">Raw Value (Editable)</th>
                    <th className="py-3 px-5 w-1/4">Visual Preview</th>
                    <th className="py-3 px-5 text-right">Set / Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/60 font-mono">
                  {displayedTokens.map((token) => (
                    <TokenPreviewRow
                      key={token.id}
                      token={token}
                      onUpdate={updateSingleToken}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* JSON Mode View */
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0c0c10]">
          {/* Syntax Error Banner */}
          {jsonError && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 font-mono select-text flex-shrink-0">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
              <span className="truncate">{jsonError}</span>
            </div>
          )}

          {/* Code Editor Area */}
          <div className="flex-1 flex overflow-hidden font-mono text-[13px]">
            {/* Line Numbers Bar */}
            <div className="w-12 py-4 select-none text-right pr-3 bg-zinc-50/60 dark:bg-[#0a0a0d] border-r border-zinc-200 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-600 text-xs font-mono flex-shrink-0 overflow-hidden leading-[22px]">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1}>{i + 1}</div>
              ))}
            </div>

            {/* Code Textarea */}
            <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#0c0c10]">
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
                className="w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-[13px] leading-[22px] text-zinc-900 dark:text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-200"
                placeholder="{\n  \n}"
              />
            </div>
          </div>

          {/* Footer Status */}
          <div className="h-8 border-t border-zinc-200 dark:border-zinc-800/80 px-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/60 dark:bg-[#0a0a0d] select-none flex-shrink-0 font-mono">
            <div className="flex items-center gap-3">
              <span>JSON</span>
              <span>•</span>
              <span>{lineCount} lines</span>
              <span>•</span>
              <span>{new Blob([code]).size} bytes</span>
            </div>

            <div className="flex items-center gap-2">
              {jsonError ? (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-semibold">
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
    </div>
  );
};

interface TokenPreviewRowProps {
  token: FlattenedToken;
  onUpdate: (path: string[], newValue: string) => void;
}

const TokenPreviewRow: React.FC<TokenPreviewRowProps> = ({ token, onUpdate }) => {
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
    <tr className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 transition-colors group">
      {/* Token Name & Description */}
      <td className="py-3 px-5 align-middle">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors">
            {token.name}
          </span>
          {token.description && (
            <span className="text-[11px] text-zinc-500 font-sans truncate max-w-xs mt-0.5">
              {token.description}
            </span>
          )}
        </div>
      </td>

      {/* Raw Value Input (Editable, Preserves Aliases) */}
      <td className="py-2.5 px-5 align-middle">
        <div className="flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={localVal}
              onChange={handleChange}
              placeholder="e.g. #3b82f6 or {colors.brand.500}"
              className={`w-full font-mono text-xs px-3 py-1.5 rounded-lg border transition-all outline-none ${
                token.isAlias
                  ? "border-emerald-500/40 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600"
              }`}
            />
            {token.isAlias && (
              <span
                title={`Resolves to: ${token.resolvedValue}`}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono pointer-events-none font-semibold"
              >
                <Link2 className="w-3 h-3" />
                alias
              </span>
            )}
          </div>
          {isSaved && (
            <span
              className="text-emerald-500 flex items-center text-[10px]"
              title="Saved to state"
            >
              <Check className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </td>

      {/* Visual Swatch / Preview */}
      <td className="py-2.5 px-5 align-middle">
        <ColorSwatch
          value={token.resolvedValue}
          type={token.type}
          name={token.name}
        />
      </td>

      {/* Set & Type Badges */}
      <td className="py-2.5 px-5 align-middle text-right">
        <div className="flex items-center justify-end gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 font-medium">
            {token.setName}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono border border-emerald-200 dark:border-emerald-800/50 font-medium">
            {token.type}
          </span>
        </div>
      </td>
    </tr>
  );
};
