"use client";

import React, { useState, useMemo } from "react";
import { DocBlock } from "@/types/documentation";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Layers,
  Search,
  Copy,
  Check,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUp01,
  ArrowDown01,
} from "lucide-react";
import { compareTokens } from "@/utils/transformTokens";
import { Badge } from "@/components/ui/badge";

interface TokensTableBlockProps {
  block: DocBlock;
  isEditing: boolean;
  onUpdate: (updates: Partial<DocBlock>) => void;
  onDelete?: () => void;
}

export const TokensTableBlock: React.FC<TokensTableBlockProps> = ({
  block,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const { resolvedTokens, addToast } = useTokenStore();
  const [search, setSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"name" | "value">("value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const settings = block.settings || {};
  const { tokenSetName, filterType = "all", showSearchBox = true } = settings;

  const handleSortToggle = (field: "name" | "value") => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filtered = useMemo(() => {
    const list = resolvedTokens.filter((t) => {
      if (tokenSetName && tokenSetName !== "all") {
        const normTarget = tokenSetName.trim().toLowerCase().replace(/[\\/.]/g, "/");
        const normSet = (t.setName || "").trim().toLowerCase().replace(/[\\/.]/g, "/");
        const matches =
          normSet === normTarget ||
          normSet.endsWith("/" + normTarget) ||
          normTarget.endsWith("/" + normSet);
        if (!matches) return false;
      }
      if (filterType !== "all" && t.type !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          String(t.resolvedValue || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    return list.sort((a, b) =>
      compareTokens(a, b, sortField === "value" ? "resolved" : "name", sortOrder)
    );
  }, [resolvedTokens, tokenSetName, filterType, search, sortField, sortOrder]);

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    addToast({
      type: "success",
      title: "Copied Token",
      message: `${val} copied.`,
    });
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="my-6 space-y-3 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground">Design Tokens Table</h4>
            <p className="text-xs text-muted-foreground">
              {filtered.length} token{filtered.length === 1 ? "" : "s"} resolved
            </p>
          </div>
        </div>

        {showSearchBox && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tokens..."
              className="h-8 w-44 rounded-lg border border-border/60 bg-background/80 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:w-56"
            />
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/50">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/60 bg-muted/40 font-medium text-muted-foreground">
            <tr>
              <th
                onClick={() => handleSortToggle("name")}
                className="px-4 py-2.5 cursor-pointer hover:text-foreground transition-colors group/th select-none"
                title={`Sort by Token Name (${sortField === "name" && sortOrder === "asc" ? "Descending" : "Ascending"})`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === "name" ? "text-foreground font-semibold" : "text-muted-foreground"}>
                    Token Name
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
              <th className="px-4 py-2.5">Type</th>
              <th
                onClick={() => handleSortToggle("value")}
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs font-sans text-muted-foreground">
                  No tokens matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const itemKey = `token-${item.name}-${idx}`;
                const displayVal = String(item.resolvedValue || item.rawValue || "");
                const isColor = item.type === "color";
                const cssVar = `--${item.name.replace(/\//g, "-").replace(/\./g, "-")}`;

                return (
                  <tr key={itemKey} className="hover:bg-muted/30 transition-colors">
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
                    <td className="px-4 py-2.5 font-sans">
                      <Badge variant="outline" className="text-[10px] font-medium uppercase">
                        {item.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-foreground truncate max-w-[200px]" title={displayVal}>
                      {displayVal}
                    </td>
                    <td className="px-4 py-2.5 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => handleCopy(`var(${cssVar})`, itemKey)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
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
      </div>
    </div>
  );
};
