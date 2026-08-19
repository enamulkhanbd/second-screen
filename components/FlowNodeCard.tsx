"use client";

import React from "react";
import { FlowNodeGroup, FlowTokenItem } from "@/utils/tokenFlowBuilder";
import { TokenCategory } from "@/utils/themeHelpers";
import {
  Palette,
  Type,
  MoveHorizontal,
  Ruler,
  Square,
  Layers,
  Eye,
  Tag,
  Link2,
} from "lucide-react";

interface FlowNodeCardProps {
  node: FlowNodeGroup;
  position?: { x: number; y: number };
  selectedTokenId: string | null;
  upstreamTokenIds: Set<string>;
  downstreamTokenIds: Set<string>;
  onSelectToken: (token: FlowTokenItem) => void;
  onStartDrag?: (e: React.MouseEvent, nodeId: string) => void;
}

const CATEGORY_ICONS: Record<TokenCategory, React.ElementType> = {
  color: Palette,
  typography: Type,
  spacing: MoveHorizontal,
  sizing: Ruler,
  borderRadius: Square,
  boxShadow: Layers,
  opacity: Eye,
  other: Tag,
};

const TIER_BADGES = {
  foundation: {
    label: "Foundation",
    badge: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  },
  alias: {
    label: "Semantic Alias",
    badge: "bg-violet-500/10 border-violet-500/30 text-violet-400",
  },
  component: {
    label: "Component",
    badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  },
};

export const FlowNodeCard: React.FC<FlowNodeCardProps> = ({
  node,
  position,
  selectedTokenId,
  upstreamTokenIds,
  downstreamTokenIds,
  onSelectToken,
  onStartDrag,
}) => {
  const Icon = CATEGORY_ICONS[node.category] || Tag;
  const tierInfo = TIER_BADGES[node.tier] || TIER_BADGES.foundation;

  const posX = position ? position.x : node.x;
  const posY = position ? position.y : node.y;

  const hasAnySelection = selectedTokenId !== null;

  return (
    <div
      style={{
        transform: `translate(${posX}px, ${posY}px)`,
        width: `${node.width}px`,
      }}
      className="absolute top-0 left-0 bg-white/95 dark:bg-[#121218]/95 border border-zinc-200 dark:border-zinc-800/90 rounded-2xl shadow-xl dark:shadow-2xl backdrop-blur-md overflow-hidden select-none transition-shadow hover:border-zinc-300 dark:hover:border-zinc-700 z-10"
    >
      {/* Node Header (Draggable Handle) */}
      <div
        onMouseDown={(e) => {
          if (onStartDrag) onStartDrag(e, node.id);
        }}
        className="h-11 px-3.5 bg-zinc-50 dark:bg-[#0d0d12] border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-colors"
        title="Click and drag to move node"
      >
        <div className="flex items-center gap-2 min-w-0 pointer-events-none">
          <div className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/50 flex-shrink-0">
            <Icon className="w-3 h-3" />
          </div>
          <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate font-mono" title={node.setName}>
            {node.setName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full border ${tierInfo.badge}`}
          >
            {tierInfo.label}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            {node.tokens.length}
          </span>
        </div>
      </div>

      {/* Token Items List */}
      <div className="p-1.5 space-y-1">
        {node.tokens.map((token) => {
          const isSelected = token.id === selectedTokenId;
          const isUpstream = upstreamTokenIds.has(token.id);
          const isDownstream = downstreamTokenIds.has(token.id);
          const isDimmed =
            hasAnySelection && !isSelected && !isUpstream && !isDownstream;

          let itemHighlight =
            "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300";

          if (isSelected) {
            itemHighlight =
              "bg-violet-50 dark:bg-violet-950/70 border-violet-500 ring-1 ring-violet-500/80 text-violet-900 dark:text-white shadow-lg shadow-violet-600/20";
          } else if (isUpstream) {
            itemHighlight =
              "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500/70 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/40";
          } else if (isDownstream) {
            itemHighlight =
              "bg-amber-50 dark:bg-amber-950/50 border-amber-500/70 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500/40";
          } else if (isDimmed) {
            itemHighlight = "opacity-35 hover:opacity-100 bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/50 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500";
          }

          return (
            <div
              key={token.id}
              onClick={() => onSelectToken(token)}
              className={`relative group flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${itemHighlight}`}
              title={`Key: ${token.key}\nRaw: ${token.rawValue}\nResolved: ${token.resolvedValue}`}
            >
              {/* Left Pin (Target handle) */}
              <div
                className={`absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black/30 dark:border-black transition-colors ${
                  token.isAlias
                    ? isSelected || isDownstream
                      ? "bg-violet-500 dark:bg-violet-400 ring-2 ring-violet-400/40"
                      : "bg-zinc-400 dark:bg-zinc-500"
                    : "bg-transparent border-transparent"
                }`}
              />

              {/* Left: Swatch / Icon + Token Name */}
              <div className="flex items-center gap-2 min-w-0 pr-2">
                {/* Swatch preview */}
                {token.category === "color" ? (
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-black/20 dark:border-white/20 shadow-xs"
                    style={{ backgroundColor: token.resolvedValue }}
                  />
                ) : token.category === "typography" ? (
                  <div className="w-3.5 h-3.5 rounded bg-violet-50 dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 text-[9px] font-serif font-bold flex items-center justify-center flex-shrink-0">
                    Aa
                  </div>
                ) : token.category === "spacing" ? (
                  <div className="w-3.5 h-3.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <MoveHorizontal className="w-2.5 h-2.5" />
                  </div>
                ) : token.category === "sizing" ? (
                  <div className="w-3.5 h-3.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Ruler className="w-2.5 h-2.5" />
                  </div>
                ) : (
                  <div className="w-3.5 h-3.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[9px] font-mono flex items-center justify-center flex-shrink-0">
                    #
                  </div>
                )}

                <span className="font-mono text-xs truncate">
                  {token.name}
                </span>
              </div>

              {/* Right: Value Pill / Alias Indicator */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {token.isAlias && (
                  <Link2 className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                )}
                <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 truncate max-w-[85px]">
                  {token.rawValue}
                </span>
              </div>

              {/* Right Pin (Source handle) */}
              <div
                className={`absolute -right-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black/30 dark:border-black transition-colors ${
                  isSelected || isUpstream
                    ? "bg-emerald-500 dark:bg-emerald-400 ring-2 ring-emerald-400/40"
                    : "bg-zinc-400 dark:bg-zinc-600"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
