"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  buildTokenFlowGraph,
  traceTokenDependencies,
  FlowTokenItem,
  FlowGraphData,
} from "@/utils/tokenFlowBuilder";
import { FlowCanvas } from "@/components/FlowCanvas";
import { TokenAccessibilityCard } from "@/components/TokenAccessibilityCard";
import { TokenCategory, CATEGORY_ORDER } from "@/utils/themeHelpers";
import {
  Folder,
  Search,
  SlidersHorizontal,
  Palette,
  Type,
  MoveHorizontal,
  Ruler,
  Square,
  Layers,
  Eye,
  Tag,
  X,
  Link2,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react";

const CATEGORY_CONFIG: Record<
  TokenCategory,
  { label: string; icon: React.ElementType; iconColor: string }
> = {
  color: { label: "Color", icon: Palette, iconColor: "text-amber-400" },
  typography: { label: "Typography", icon: Type, iconColor: "text-violet-400" },
  spacing: { label: "Spacing", icon: MoveHorizontal, iconColor: "text-blue-400" },
  sizing: { label: "Sizing", icon: Ruler, iconColor: "text-emerald-400" },
  borderRadius: { label: "Radius", icon: Square, iconColor: "text-rose-400" },
  boxShadow: { label: "Shadow", icon: Layers, iconColor: "text-cyan-400" },
  opacity: { label: "Opacity", icon: Eye, iconColor: "text-yellow-400" },
  other: { label: "Other", icon: Tag, iconColor: "text-zinc-400" },
};

export const TokenFlow: React.FC = () => {
  const {
    rawTokens,
    themeGroups,
    activeThemeGroupId,
    activeThemeOptionId,
    setActiveThemeGroup,
    setActiveThemeOption,
    updateSingleToken,
  } = useTokenStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | TokenCategory>("all");
  const [selectedToken, setSelectedToken] = useState<FlowTokenItem | null>(null);

  // Active theme group & active option
  const activeGroup = useMemo(() => {
    return (
      themeGroups.find((g) => g.id === activeThemeGroupId) ||
      themeGroups[0] ||
      null
    );
  }, [themeGroups, activeThemeGroupId]);

  const activeOption = useMemo(() => {
    if (!activeGroup) return null;
    return (
      activeGroup.options.find((o) => o.id === activeThemeOptionId) ||
      activeGroup.options[0] ||
      null
    );
  }, [activeGroup, activeThemeOptionId]);

  // Build the flow graph data
  const graphData = useMemo(() => {
    return buildTokenFlowGraph(rawTokens, activeOption, selectedType, searchQuery);
  }, [rawTokens, activeOption, selectedType, searchQuery]);

  // Trace active dependency chain when a token is selected
  const { upstreamTokenIds, downstreamTokenIds, activeEdgeIds } = useMemo(() => {
    if (!selectedToken) {
      return {
        upstreamTokenIds: new Set<string>(),
        downstreamTokenIds: new Set<string>(),
        activeEdgeIds: new Set<string>(),
      };
    }
    return traceTokenDependencies(
      selectedToken.id,
      graphData.edgesBySource,
      graphData.edgesByTarget
    );
  }, [selectedToken, graphData.edgesBySource, graphData.edgesByTarget]);

  // Available token types in current graph
  const availableCategories = useMemo(() => {
    const set = new Set<TokenCategory>();
    graphData.allTokens.forEach((t) => set.add(t.category));
    return CATEGORY_ORDER.filter((c) => set.has(c));
  }, [graphData.allTokens]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#09090d] overflow-hidden text-xs select-none relative transition-colors">
      {/* Top Controls Toolbar */}
      <div className="h-12 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50/80 dark:bg-[#0d0d11] px-6 flex items-center justify-between flex-shrink-0 z-20 transition-colors">
        {/* Left: Active Theme & Option Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-zinc-400 dark:text-zinc-400" />
            <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
              {activeGroup?.name || "Theme"}
            </span>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activeGroup?.color || "#f97316" }}
            />
          </div>

          {/* Theme Option Pill Selector */}
          {activeGroup && activeGroup.options.length > 0 && (
            <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              {activeGroup.options.map((opt) => {
                const isSel = opt.id === activeOption?.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setActiveThemeOption(opt.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      isSel
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700 font-semibold"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: opt.color || "#ffffff" }}
                    />
                    <span>{opt.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Search & Stats */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search token flows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-[11px] text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-700 w-52 font-mono transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500 border-l border-zinc-200 dark:border-zinc-800 pl-3">
            <span>{graphData.allTokens.length} tokens</span>
            <span>•</span>
            <span>{graphData.edges.length} wires</span>
          </div>
        </div>
      </div>

      {/* Sub-Header: Token Type Filter Chips */}
      {availableCategories.length > 0 && (
        <div className="h-9 px-6 border-b border-zinc-200 dark:border-zinc-900/80 bg-zinc-50/50 dark:bg-[#0b0b10] flex items-center gap-1.5 flex-shrink-0 overflow-x-auto scrollbar-none z-10 transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
            <span>Type:</span>
          </span>

          {/* All */}
          <button
            onClick={() => setSelectedType("all")}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
              selectedType === "all"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700/80 font-semibold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
            }`}
          >
            <span>All Types</span>
          </button>

          {/* Individual types */}
          {availableCategories.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const isSel = selectedType === cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedType(cat)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  isSel
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700/80 font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
                }`}
              >
                <Icon className={`w-3 h-3 ${isSel ? config.iconColor : "text-zinc-400 dark:text-zinc-500"}`} />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Flow Canvas & Inspector Container */}
      <div className="flex-1 relative flex overflow-hidden">
        <FlowCanvas
          graphData={graphData}
          selectedToken={selectedToken}
          upstreamTokenIds={upstreamTokenIds}
          downstreamTokenIds={downstreamTokenIds}
          activeEdgeIds={activeEdgeIds}
          onSelectToken={setSelectedToken}
        />

        {/* Right Token Inspector Drawer */}
        {selectedToken && (
          <TokenInspectorDrawer
            token={selectedToken}
            graphData={graphData}
            upstreamCount={upstreamTokenIds.size}
            downstreamCount={downstreamTokenIds.size}
            onClose={() => setSelectedToken(null)}
            onSelectToken={setSelectedToken}
            onUpdateToken={(newVal) => {
              updateSingleToken([selectedToken.setName, ...selectedToken.pathSegments], newVal);
              setSelectedToken((prev) => (prev ? { ...prev, rawValue: newVal } : null));
            }}
          />
        )}
      </div>
    </div>
  );
};

interface TokenInspectorDrawerProps {
  token: FlowTokenItem;
  graphData: FlowGraphData;
  upstreamCount: number;
  downstreamCount: number;
  onClose: () => void;
  onSelectToken: (token: FlowTokenItem) => void;
  onUpdateToken: (newValue: string) => void;
}

const TokenInspectorDrawer: React.FC<TokenInspectorDrawerProps> = ({
  token,
  graphData,
  upstreamCount,
  downstreamCount,
  onClose,
  onSelectToken,
  onUpdateToken,
}) => {
  const { focusTokenInMatrix } = useTokenStore();
  const [val, setVal] = useState(token.rawValue);

  React.useEffect(() => {
    setVal(token.rawValue);
  }, [token.rawValue]);

  const upstreamTokens = useMemo(() => {
    const list: FlowTokenItem[] = [];
    const incoming = graphData.edgesByTarget.get(token.id) || [];
    incoming.forEach((e) => {
      const t = graphData.tokensById.get(e.sourceTokenId);
      if (t) list.push(t);
    });
    return list;
  }, [token.id, graphData]);

  const downstreamTokens = useMemo(() => {
    const list: FlowTokenItem[] = [];
    const outgoing = graphData.edgesBySource.get(token.id) || [];
    outgoing.forEach((e) => {
      const t = graphData.tokensById.get(e.targetTokenId);
      if (t) list.push(t);
    });
    return list;
  }, [token.id, graphData]);

  const isComposite = useMemo(() => {
    try {
      if (
        typeof token.resolvedValue === "string" &&
        token.resolvedValue.startsWith("{") &&
        token.resolvedValue.endsWith("}")
      ) {
        return JSON.parse(token.resolvedValue);
      }
    } catch {}
    return null;
  }, [token.resolvedValue]);

  const isRawComposite = useMemo(() => {
    try {
      if (typeof val === "string" && val.startsWith("{") && val.endsWith("}")) {
        return true;
      }
    } catch {}
    return false;
  }, [val]);

  return (
    <div className="w-[460px] max-w-[90vw] h-full border-l border-zinc-200 dark:border-zinc-800 bg-white/98 dark:bg-[#101016]/98 backdrop-blur-2xl flex flex-col justify-between z-30 shadow-2xl animate-in slide-in-from-right duration-200 select-none transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between bg-zinc-50/90 dark:bg-[#0d0d12]/90">
        <div className="min-w-0 pr-3 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400 font-mono bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded border border-violet-200 dark:border-violet-800/40">
              {token.category}
            </span>
            <span className="text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
              {token.tier}
            </span>
            {token.isAlias && (
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40 flex items-center gap-1">
                <Link2 className="w-2.5 h-2.5" />
                <span>Alias</span>
              </span>
            )}
          </div>
          <h4 className="text-base font-semibold text-zinc-900 dark:text-white font-mono break-all pt-1">
            {token.name}
          </h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono break-all line-clamp-2" title={token.setName}>
            {token.setName}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5 flex-1 overflow-y-auto font-mono text-xs">
        {/* Full Path */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">Full Key Path</label>
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 select-text text-xs break-all leading-relaxed font-mono">
            {token.key}
          </div>
        </div>

        {/* Live Swatch / Composite Preview */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">Computed Value</label>
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
            <div className="flex items-center gap-3">
              {token.category === "color" ? (
                <div
                  className="w-10 h-10 rounded-xl border border-black/20 dark:border-black/60 shadow-inner flex-shrink-0"
                  style={{ backgroundColor: token.resolvedValue }}
                />
              ) : token.category === "typography" ? (
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center font-serif font-bold text-lg flex-shrink-0">
                  Aa
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-xs flex-shrink-0">
                  #
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block">Resolved:</span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white font-mono break-all block select-text">
                  {typeof token.resolvedValue === "string" && !isComposite
                    ? token.resolvedValue
                    : token.name}
                </span>
              </div>
            </div>

            {/* Structured Composite Fields (Typography, Shadows, etc.) */}
            {isComposite && (
              <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800/80 space-y-1.5">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(isComposite).map(([prop, propVal]) => (
                    <div key={prop} className="p-2 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/50">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block uppercase font-bold">{prop}</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-mono break-all select-text font-medium">
                        {String(propVal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Typography live sample preview */}
                {token.category === "typography" && (
                  <div
                    className="mt-2 p-3 rounded-xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 text-zinc-800 dark:text-zinc-100 select-text"
                    style={{
                      fontFamily: isComposite.fontFamily || "inherit",
                      fontSize: isComposite.fontSize || "14px",
                      fontWeight: isComposite.fontWeight || "400",
                      lineHeight: isComposite.lineHeight || "1.4",
                      letterSpacing: isComposite.letterSpacing || "normal",
                    }}
                  >
                    The quick brown fox jumps over the lazy dog.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Editable Raw Value */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">
              Raw / Alias Value
            </label>
            {val !== token.rawValue && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium animate-pulse">Unsaved</span>
            )}
          </div>

          <div className="space-y-2">
            {isRawComposite ? (
              <textarea
                rows={4}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-violet-500 text-xs text-violet-700 dark:text-violet-200 outline-none font-mono resize-none leading-relaxed"
                placeholder='e.g. { "fontFamily": "{font-families.primary}" }'
              />
            ) : (
              <input
                type="text"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (val !== token.rawValue) onUpdateToken(val);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-violet-500 text-xs text-violet-700 dark:text-violet-200 outline-none font-mono"
              />
            )}

            {val !== token.rawValue && (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVal(token.rawValue)}
                  className="px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateToken(val)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Value</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Accessibility & Contrast Suite */}
        <TokenAccessibilityCard
          tokenName={token.name}
          tokenKey={token.key}
          resolvedValue={token.resolvedValue}
          tokenCategory={token.category}
          onOpenMatrix={() => focusTokenInMatrix(token.key)}
        />

        {/* Upstream Ancestors (Where value comes from) */}
        <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>Upstream Sources</span>
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({upstreamCount})</span>
          </div>

          {upstreamTokens.length === 0 ? (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1">
              Direct seed token (no aliases).
            </p>
          ) : (
            <div className="space-y-1.5">
              {upstreamTokens.map((ut) => (
                <div
                  key={ut.id}
                  onClick={() => onSelectToken(ut)}
                  className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate" title={ut.setName}>
                      {ut.setName}
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 truncate block font-mono font-medium">
                      {ut.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-mono truncate max-w-[140px] text-right bg-white dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800">
                    {ut.resolvedValue}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Downstream Consumers (Where this token is used) */}
        <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>Downstream Consumers</span>
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({downstreamCount})</span>
          </div>

          {downstreamTokens.length === 0 ? (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1">
              No dependent tokens in active set.
            </p>
          ) : (
            <div className="space-y-1.5">
              {downstreamTokens.map((dt) => (
                <div
                  key={dt.id}
                  onClick={() => onSelectToken(dt)}
                  className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate" title={dt.setName}>
                      {dt.setName}
                    </span>
                    <span className="text-xs text-amber-700 dark:text-amber-300 truncate block font-mono font-medium">
                      {dt.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-mono truncate max-w-[140px] text-right bg-white dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800">
                    {dt.rawValue}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0d0d12] text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
        <span>Tokens Studio Flow</span>
        <span className="uppercase font-bold text-zinc-600 dark:text-zinc-400">{token.tier}</span>
      </div>
    </div>
  );
};
