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
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORY_CONFIG: Record<
  TokenCategory,
  { label: string; icon: React.ElementType; iconColor: string }
> = {
  color: { label: "Color", icon: Palette, iconColor: "text-amber-500" },
  typography: { label: "Typography", icon: Type, iconColor: "text-primary" },
  spacing: { label: "Spacing", icon: MoveHorizontal, iconColor: "text-blue-500" },
  sizing: { label: "Sizing", icon: Ruler, iconColor: "text-emerald-500" },
  borderRadius: { label: "Radius", icon: Square, iconColor: "text-rose-500" },
  boxShadow: { label: "Shadow", icon: Layers, iconColor: "text-cyan-500" },
  opacity: { label: "Opacity", icon: Eye, iconColor: "text-yellow-500" },
  other: { label: "Other", icon: Tag, iconColor: "text-muted-foreground" },
};

export const TokenFlow: React.FC = () => {
  const {
    rawTokens,
    themeGroups,
    activeThemeGroupId,
    activeThemeOptionId,
    setActiveThemeOption,
    updateSingleToken,
  } = useTokenStore();

  const [searchQuery] = useState("");
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
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden text-xs select-none relative transition-colors">
      {/* Top Controls Toolbar */}
      <div className="h-12 border-b border-border bg-card px-6 flex items-center justify-between flex-shrink-0 z-20 transition-colors">
        {/* Left: Active Theme & Option Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-foreground">
              {activeGroup?.name || "Theme"}
            </span>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activeGroup?.color || "#7c3aed" }}
            />
          </div>

          {/* Theme Option Pill Selector */}
          {activeGroup && activeGroup.options.length > 0 && (
            <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg border border-border">
              {activeGroup.options.map((opt) => {
                const isSel = opt.id === activeOption?.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setActiveThemeOption(opt.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      isSel
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: opt.color || "#7c3aed" }}
                    />
                    <span>{opt.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            {graphData.allTokens.length} Nodes
          </Badge>
          <Badge variant="violet" className="font-mono text-[11px]">
            {graphData.edges.length} Aliases
          </Badge>
        </div>
      </div>

      {/* Secondary Filter Sub-bar */}
      {availableCategories.length > 1 && (
        <div className="h-9 px-6 border-b border-border bg-muted/30 flex items-center gap-1.5 overflow-x-auto z-10">
          <button
            onClick={() => setSelectedType("all")}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
              selectedType === "all"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            All Types
          </button>
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
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className={`w-3 h-3 ${isSel ? "text-primary-foreground" : config.iconColor}`} />
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
    <div className="w-[460px] max-w-[90vw] h-full border-l border-border bg-card/98 backdrop-blur-2xl flex flex-col justify-between z-30 shadow-2xl animate-in slide-in-from-right duration-200 select-none transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-start justify-between bg-muted/40">
        <div className="min-w-0 pr-3 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="violet" className="text-xs uppercase font-mono">
              {token.category}
            </Badge>
            <Badge variant="outline" className="text-xs uppercase font-mono">
              {token.tier}
            </Badge>
            {token.isAlias && (
              <Badge variant="warning" className="text-xs uppercase font-mono gap-1">
                <Link2 className="w-3 h-3" />
                <span>Alias</span>
              </Badge>
            )}
          </div>
          <h4 className="text-base font-bold text-foreground font-mono break-all pt-0.5">
            {token.name}
          </h4>
          <p className="text-xs text-muted-foreground font-mono break-all line-clamp-2" title={token.setName}>
            {token.setName}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5 flex-1 overflow-y-auto font-sans text-sm">
        {/* Full Path */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Full Key Path</label>
          <div className="p-3 rounded-lg bg-muted border border-border text-foreground select-text text-[13px] break-all leading-relaxed font-mono font-medium">
            {token.key}
          </div>
        </div>

        {/* Live Swatch / Composite Preview */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Computed Value</label>
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
            <div className="flex items-center gap-3.5">
              {token.category === "color" ? (
                <div
                  className="w-11 h-11 rounded-xl border border-black/20 dark:border-white/20 shadow-inner flex-shrink-0"
                  style={{ backgroundColor: token.resolvedValue }}
                />
              ) : token.category === "typography" ? (
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-serif font-bold text-xl flex-shrink-0">
                  Aa
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-sm flex-shrink-0 font-mono font-bold">
                  #
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-xs text-muted-foreground uppercase font-bold block">Resolved:</span>
                <span className="text-sm font-semibold text-foreground font-mono break-all block select-text">
                  {typeof token.resolvedValue === "string" && !isComposite
                    ? token.resolvedValue
                    : token.name}
                </span>
              </div>
            </div>

            {/* Structured Composite Fields */}
            {isComposite && (
              <div className="pt-3 border-t border-border space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(isComposite).map(([prop, propVal]) => (
                    <div key={prop} className="p-2.5 rounded-lg bg-card border border-border">
                      <span className="text-[11px] text-muted-foreground block uppercase font-bold">{prop}</span>
                      <span className="text-foreground font-mono break-all select-text font-medium text-xs">
                        {String(propVal)}
                      </span>
                    </div>
                  ))}
                </div>

                {token.category === "typography" && (
                  <div
                    className="mt-2 p-3.5 rounded-xl bg-card border border-border text-foreground select-text leading-relaxed"
                    style={{
                      fontFamily: isComposite.fontFamily || "inherit",
                      fontSize: isComposite.fontSize || "15px",
                      fontWeight: isComposite.fontWeight || "400",
                      lineHeight: isComposite.lineHeight || "1.5",
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
            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Raw / Alias Value
            </label>
            {val !== token.rawValue && (
              <Badge variant="warning" className="text-xs font-semibold animate-pulse">Unsaved</Badge>
            )}
          </div>

          <div className="space-y-2">
            {isRawComposite ? (
              <textarea
                rows={4}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-transparent border border-input focus:border-ring text-xs text-foreground outline-none font-mono resize-none leading-relaxed"
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
                className="w-full px-3 py-2 rounded-md bg-transparent border border-input focus:border-ring text-xs text-foreground outline-none font-mono"
              />
            )}

            {val !== token.rawValue && (
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVal(token.rawValue)}
                  className="text-xs h-7"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onUpdateToken(val)}
                  className="gap-1.5 text-xs h-7 font-bold"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Value</span>
                </Button>
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

        {/* Upstream Ancestors */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>Upstream Sources</span>
            </span>
            <span className="text-xs text-muted-foreground font-mono font-semibold">({upstreamCount})</span>
          </div>

          {upstreamTokens.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">
              Direct seed token (no aliases).
            </p>
          ) : (
            <div className="space-y-2">
              {upstreamTokens.map((ut) => (
                <div
                  key={ut.id}
                  onClick={() => onSelectToken(ut)}
                  className="p-3 rounded-lg bg-card hover:bg-muted border border-border cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs text-muted-foreground block truncate" title={ut.setName}>
                      {ut.setName}
                    </span>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 truncate block font-mono font-semibold">
                      {ut.name}
                    </span>
                  </div>
                  <span className="text-xs text-foreground font-mono truncate max-w-[150px] text-right bg-muted px-2.5 py-1 rounded border border-border font-medium">
                    {ut.resolvedValue}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Downstream Consumers */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>Downstream Consumers</span>
            </span>
            <span className="text-xs text-muted-foreground font-mono font-semibold">({downstreamCount})</span>
          </div>

          {downstreamTokens.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">
              No dependent tokens in active set.
            </p>
          ) : (
            <div className="space-y-2">
              {downstreamTokens.map((dt) => (
                <div
                  key={dt.id}
                  onClick={() => onSelectToken(dt)}
                  className="p-3 rounded-lg bg-card hover:bg-muted border border-border cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs text-muted-foreground block truncate" title={dt.setName}>
                      {dt.setName}
                    </span>
                    <span className="text-sm text-amber-600 dark:text-amber-400 truncate block font-mono font-semibold">
                      {dt.name}
                    </span>
                  </div>
                  <span className="text-xs text-foreground font-mono truncate max-w-[150px] text-right bg-muted px-2.5 py-1 rounded border border-border font-medium">
                    {typeof dt.rawValue === "object" ? JSON.stringify(dt.rawValue) : String(dt.rawValue ?? "")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="p-3.5 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
        <span>Tokens Studio Flow</span>
        <span className="uppercase font-bold text-foreground">{token.tier}</span>
      </div>
    </div>
  );
};
