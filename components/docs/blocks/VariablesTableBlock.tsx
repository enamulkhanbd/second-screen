"use client";

import React, { useState, useMemo } from "react";
import { DocBlock } from "@/types/documentation";
import { useTokenStore } from "@/store/useTokenStore";
import { useDocsTokens } from "@/components/docs/DocsTokensContext";
import {
  Search,
  Copy,
  Check,
  SlidersHorizontal,
  Variable,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUp01,
  ArrowDown01,
} from "lucide-react";
import { compareTokens } from "@/utils/transformTokens";
import { Badge } from "@/components/ui/badge";

interface VariablesTableBlockProps {
  block: DocBlock;
  isEditing: boolean;
  onUpdate: (updates: Partial<DocBlock>) => void;
  onDelete?: () => void;
}

export const VariablesTableBlock: React.FC<VariablesTableBlockProps> = ({
  block,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const docsTokens = useDocsTokens();
  const storeFigmaResolvedVariables = useTokenStore((s) => s.figmaResolvedVariables);
  const storeFigmaVariables = useTokenStore((s) => s.figmaVariables);
  const storeResolvedTokens = useTokenStore((s) => s.resolvedTokens);
  const figmaResolvedVariables = docsTokens ? docsTokens.figmaResolvedVariables : storeFigmaResolvedVariables;
  const figmaVariables = docsTokens ? docsTokens.figmaVariables : storeFigmaVariables;
  const resolvedTokens = docsTokens ? docsTokens.resolvedTokens : storeResolvedTokens;
  const addToast = useTokenStore((s) => s.addToast);
  const [visibleCount, setVisibleCount] = useState(60);
  const [localSearch, setLocalSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const settings = block.settings || {};
  const {
    collection,
    selectedModes,
    filterType = "all",
    filterQuery = "",
    filterCondition = "includes",
    sortField = "value",
    sortOrder = "asc",
    showSearchBox = true,
  } = settings;

  // Source list: prioritize figmaResolvedVariables, fallback to resolvedTokens
  const sourceItems = useMemo(() => {
    if (figmaResolvedVariables && figmaResolvedVariables.length > 0) {
      return figmaResolvedVariables;
    }
    return resolvedTokens;
  }, [figmaResolvedVariables, resolvedTokens]);

  // Available collections / sets
  const availableCollections = useMemo(() => {
    const sets = new Set<string>();
    sourceItems.forEach((item) => {
      if (item.setName) sets.add(item.setName);
    });
    return Array.from(sets);
  }, [sourceItems]);

  // Available modes (if multi-mode variables exist)
  const availableModes = useMemo(() => {
    const modes = new Set<string>();
    if (figmaVariables) {
      Object.entries(figmaVariables).forEach(([setName, setObj]) => {
        if (setObj && typeof setObj === "object") {
          // Check mode keys
          const keys = Object.keys(setObj).filter((k) => !k.startsWith("$"));
          keys.forEach((k) => {
            if (typeof setObj[k] === "object" && setObj[k] !== null && !setObj[k].value) {
              modes.add(k);
            }
          });
        }
      });
    }
    return Array.from(modes);
  }, [figmaVariables]);

  // Filtered and sorted variables
  const processedVariables = useMemo(() => {
    let result = sourceItems.filter((item) => {
      // 1. Collection filter (case-insensitive & slash/dot-agnostic matching)
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

      // 2. Type filter
      if (filterType !== "all") {
        const itemTypeStr = (item.type as string).toLowerCase();
        if (filterType === "color" && itemTypeStr !== "color") return false;
        if (
          filterType === "float" &&
          itemTypeStr !== "dimension" &&
          itemTypeStr !== "number" &&
          itemTypeStr !== "spacing" &&
          itemTypeStr !== "sizing"
        )
          return false;
        if (
          filterType === "dimension" &&
          itemTypeStr !== "dimension" &&
          itemTypeStr !== "spacing" &&
          itemTypeStr !== "sizing"
        )
          return false;
        if (
          filterType === "string" &&
          itemTypeStr !== "string" &&
          itemTypeStr !== "fontfamily" &&
          itemTypeStr !== "fontfamilies"
        )
          return false;
        if (
          filterType === "boolean" &&
          itemTypeStr !== "boolean" &&
          itemTypeStr !== "other"
        )
          return false;
      }

      // 3. Settings Filter Query
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const target = (item.name || "").toLowerCase();
        if (filterCondition === "startsWith") {
          if (!target.startsWith(q)) return false;
        } else {
          if (!target.includes(q)) return false;
        }
      }

      // 4. Interactive Local Search
      if (localSearch.trim()) {
        const q = localSearch.toLowerCase();
        const matchName = String(item.name || "").toLowerCase().includes(q);
        const matchVal = String(item.resolvedValue || item.rawValue || "").toLowerCase().includes(q);
        const matchSet = String(item.setName || "").toLowerCase().includes(q);
        if (!matchName && !matchVal && !matchSet) return false;
      }

      return true;
    });

    // Sort using robust A-Z, 0-9 comparator
    result.sort((a, b) =>
      compareTokens(a, b, sortField === "value" ? "resolved" : "name", sortOrder as "asc" | "desc")
    );

    return result;
  }, [sourceItems, collection, filterType, filterQuery, filterCondition, localSearch, sortField, sortOrder]);

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    addToast({
      type: "success",
      title: "Copied to clipboard",
      message: `${val} copied.`,
    });
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="my-6 space-y-3 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Variable className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              {collection && collection !== "all" ? `Variables: ${collection}` : "Connected Variables"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {processedVariables.length} variable{processedVariables.length === 1 ? "" : "s"} resolved
            </p>
          </div>
        </div>

        {/* Search & Badges */}
        <div className="flex items-center gap-2">
          {showSearchBox && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search variables..."
                className="h-8 w-44 rounded-lg border border-border/60 bg-background/80 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:w-56"
              />
            </div>
          )}
          {collection && collection !== "all" && (
            <Badge variant="outline" className="text-[11px] font-medium">
              {collection}
            </Badge>
          )}
          {filterType !== "all" && (
            <Badge variant="secondary" className="text-[11px] capitalize">
              {filterType}
            </Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/50">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/60 bg-muted/40 font-medium text-muted-foreground">
            <tr>
              <th
                onClick={() => {
                  const next = sortField === "name" && sortOrder === "asc" ? "desc" : "asc";
                  onUpdate({ settings: { ...settings, sortField: "name", sortOrder: next } });
                }}
                className="px-4 py-2.5 cursor-pointer hover:text-foreground transition-colors group/th select-none"
                title={`Sort by Variable Name (${sortField === "name" && sortOrder === "asc" ? "Descending" : "Ascending"})`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === "name" ? "text-foreground font-semibold" : "text-muted-foreground"}>
                    Variable Name
                  </span>
                  {sortField === "name" ? (
                    sortOrder === "asc" ? (
                      <ArrowUpAZ className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <ArrowDownAZ className="w-3.5 h-3.5 text-primary shrink-0" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/th:text-muted-foreground transition-colors shrink-0" />
                  )}
                </div>
              </th>
              <th className="px-4 py-2.5">Collection</th>
              <th className="px-4 py-2.5">Type</th>
              <th
                onClick={() => {
                  const next = sortField === "value" && sortOrder === "asc" ? "desc" : "asc";
                  onUpdate({ settings: { ...settings, sortField: "value", sortOrder: next } });
                }}
                className="px-4 py-2.5 cursor-pointer hover:text-foreground transition-colors group/th select-none"
                title={`Sort by Value (${sortField === "value" && sortOrder === "asc" ? "Descending" : "Ascending"})`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === "value" ? "text-foreground font-semibold" : "text-muted-foreground"}>
                    Value
                  </span>
                  {sortField === "value" ? (
                    sortOrder === "asc" ? (
                      <ArrowUp01 className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <ArrowDown01 className="w-3.5 h-3.5 text-primary shrink-0" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/th:text-muted-foreground transition-colors shrink-0" />
                  )}
                </div>
              </th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono">
            {processedVariables.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs font-sans text-muted-foreground">
                  No variables found matching the configured filters.
                </td>
              </tr>
            ) : (
              processedVariables.slice(0, visibleCount).map((item, idx) => {
                const itemKey = `${item.setName}-${item.name}-${idx}`;
                const isColor = item.type === "color";
                const displayVal = String(item.resolvedValue || item.rawValue || "");
                const cssVarName = `--${item.name.replace(/\//g, "-").replace(/\./g, "-")}`;

                return (
                  <tr key={itemKey} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-sans font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {isColor && (
                          <div
                            className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 shadow-sm"
                            style={{ backgroundColor: displayVal }}
                          />
                        )}
                        <span className="font-mono text-xs">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-sans text-muted-foreground">
                      {item.setName || "-"}
                    </td>
                    <td className="px-4 py-2.5 font-sans">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground uppercase">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[200px] text-foreground" title={displayVal}>
                          {displayVal}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => handleCopy(cssVarName, itemKey)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                        title={`Copy CSS var: ${cssVarName}`}
                      >
                        {copiedKey === itemKey ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>var()</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {processedVariables.length > visibleCount && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-t border-border/40 text-xs text-muted-foreground">
            <span>Showing {visibleCount} of {processedVariables.length} variables</span>
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + 60, processedVariables.length))}
              className="px-2.5 py-1 text-xs font-medium rounded hover:bg-muted text-foreground transition-colors"
            >
              Load more (+60)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
