"use client";

import React, { useState, useMemo } from "react";
import { DocBlock } from "@/types/documentation";
import { useTokenStore } from "@/store/useTokenStore";
import { Search, Copy, Check, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VariableSwatchesBlockProps {
  block: DocBlock;
  isEditing: boolean;
  onUpdate: (updates: Partial<DocBlock>) => void;
  onDelete?: () => void;
}

export const VariableSwatchesBlock: React.FC<VariableSwatchesBlockProps> = ({
  block,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const { figmaResolvedVariables, resolvedTokens, addToast } = useTokenStore();
  const [search, setSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const settings = block.settings || {};
  const {
    collection,
    filterQuery = "",
    filterCondition = "includes",
    showSearchBox = true,
  } = settings;

  // Filter color tokens/variables
  const colorItems = useMemo(() => {
    const source = figmaResolvedVariables.length > 0 ? figmaResolvedVariables : resolvedTokens;
    return source.filter((item) => {
      const isColor =
        item.type === "color" ||
        /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(item.resolvedValue || "").trim()) ||
        /^(rgba?|hsla?|oklch|lch|color|lab)\(/i.test(String(item.resolvedValue || "").trim()) ||
        Boolean(item.resolvedHex);

      if (!isColor) return false;

      // Collection filter (case-insensitive & slash/dot-agnostic matching)
      if (collection && collection !== "all") {
        const normCol = collection.trim().toLowerCase().replace(/[\\/.]/g, "/");
        const normSet = (item.setName || "").trim().toLowerCase().replace(/[\\/.]/g, "/");
        const normGroup = (item.group || "").trim().toLowerCase().replace(/[\\/.]/g, "/");
        const normId = (item.id || "").trim().toLowerCase().replace(/[\\/.]/g, "/");

        const matches =
          normSet === normCol ||
          normSet.endsWith("/" + normCol) ||
          normCol.endsWith("/" + normSet) ||
          normGroup === normCol ||
          normId.startsWith(normCol + "/") ||
          normId.includes("/" + normCol + "/");

        if (!matches) {
          return false;
        }
      }

      // Block filter query
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const name = (item.name || "").toLowerCase();
        if (filterCondition === "startsWith") {
          if (!name.startsWith(q)) return false;
        } else {
          if (!name.includes(q)) return false;
        }
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = String(item.name || "").toLowerCase().includes(q);
        const matchVal = String(item.resolvedValue || item.rawValue || item.resolvedHex || "").toLowerCase().includes(q);
        if (!matchName && !matchVal) return false;
      }

      return true;
    });
  }, [figmaResolvedVariables, resolvedTokens, collection, filterQuery, filterCondition, search]);

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast({
      type: "success",
      title: "Copied Color Value",
      message: `${label} (${text}) copied to clipboard.`,
    });
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="my-6 space-y-4 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              {collection && collection !== "all" ? `Color Swatches: ${collection}` : "Color Swatches"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {colorItems.length} color{colorItems.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Search */}
        {showSearchBox && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter swatches..."
              className="h-8 w-44 rounded-lg border border-border/60 bg-background/80 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:w-52"
            />
          </div>
        )}
      </div>

      {/* Grid */}
      {colorItems.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No color variables found for the selected configuration.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {colorItems.map((c, i) => {
            const rawVal = String(c.resolvedValue || c.rawValue || "#000000");
            const cssVar = `--${c.name.replace(/\//g, "-").replace(/\./g, "-")}`;
            const key = `swatch-${c.setName}-${c.name}-${i}`;
            const isCopied = copiedKey === key;

            return (
              <div
                key={key}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-background/70 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40"
              >
                {/* Swatch Color Preview */}
                <div
                  className="relative h-20 w-full border-b border-border/40 transition-transform group-hover:scale-102"
                  style={{
                    backgroundColor: c.resolvedHex || rawVal,
                    backgroundImage:
                      "linear-gradient(45deg, #00000008 25%, transparent 25%), linear-gradient(-45deg, #00000008 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #00000008 75%), linear-gradient(-45deg, transparent 75%, #00000008 75%)",
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleCopy(c.resolvedHex || rawVal, key, c.name)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                    title={`Click to copy: ${c.resolvedHex || rawVal}`}
                  >
                    {isCopied ? (
                      <span className="flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        <Check className="h-3 w-3" /> Copied
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white">
                        <Copy className="h-3 w-3" /> Copy
                      </span>
                    )}
                  </button>
                </div>

                {/* Details */}
                <div className="flex flex-col p-2.5">
                  <span className="truncate text-xs font-semibold text-foreground" title={c.name}>
                    {c.name}
                  </span>
                  <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                    <span className="truncate uppercase" title={rawVal}>
                      {c.resolvedHex || rawVal}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`var(${cssVar})`, `${key}-var`, cssVar)}
                      className="text-[10px] text-primary/70 hover:text-primary hover:underline"
                      title="Copy CSS var"
                    >
                      var
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
