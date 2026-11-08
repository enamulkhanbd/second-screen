"use client";

import React, { useMemo } from "react";
import { DocBlock } from "@/types/documentation";
import { useTokenStore } from "@/store/useTokenStore";
import { Type, Copy, Check } from "lucide-react";

interface VariableTypographyBlockProps {
  block: DocBlock;
  isEditing: boolean;
  onUpdate: (updates: Partial<DocBlock>) => void;
  onDelete?: () => void;
}

export const VariableTypographyBlock: React.FC<VariableTypographyBlockProps> = ({
  block,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const resolvedTokens = useTokenStore((s) => s.resolvedTokens);
  const figmaResolvedVariables = useTokenStore((s) => s.figmaResolvedVariables);
  const addToast = useTokenStore((s) => s.addToast);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Extract font size or typography tokens
  const typeTokens = useMemo(() => {
    const all = [...figmaResolvedVariables, ...resolvedTokens];
    const filtered = all.filter((t) => {
      const type = t.type.toLowerCase();
      const name = t.name.toLowerCase();
      return (
        type === "typography" ||
        type === "fontfamily" ||
        type === "fontsize" ||
        type === "lineheight" ||
        name.includes("font") ||
        name.includes("text") ||
        name.includes("heading")
      );
    });

    // Remove duplicates by name
    const map = new Map<string, typeof all[0]>();
    filtered.forEach((t) => {
      if (!map.has(t.name)) map.set(t.name, t);
    });

    const list = Array.from(map.values());

    // If no typography tokens in store, provide standard typographic scale fallback
    if (list.length === 0) {
      return [
        { name: "text.display", rawValue: "48px", resolvedValue: "48px", type: "fontSize" },
        { name: "text.heading.1", rawValue: "36px", resolvedValue: "36px", type: "fontSize" },
        { name: "text.heading.2", rawValue: "28px", resolvedValue: "28px", type: "fontSize" },
        { name: "text.heading.3", rawValue: "20px", resolvedValue: "20px", type: "fontSize" },
        { name: "text.body.large", rawValue: "18px", resolvedValue: "18px", type: "fontSize" },
        { name: "text.body.default", rawValue: "16px", resolvedValue: "16px", type: "fontSize" },
        { name: "text.body.small", rawValue: "14px", resolvedValue: "14px", type: "fontSize" },
        { name: "text.caption", rawValue: "12px", resolvedValue: "12px", type: "fontSize" },
      ] as any[];
    }

    return list;
  }, [resolvedTokens, figmaResolvedVariables]);

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
    <div className="my-6 space-y-4 rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
          <Type className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold tracking-tight text-foreground">Typography Scale</h4>
          <p className="text-xs text-muted-foreground">Type hierarchy and specimen preview</p>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {typeTokens.map((t, idx) => {
          const val = String(t.resolvedValue || t.rawValue || "16px");
          // Check if value is numeric or includes px/rem
          let sizeStyle = "16px";
          if (val.match(/^[0-9]+(\.[0-9]+)?(px|rem|em|pt)$/i)) {
            sizeStyle = val;
          } else if (val.match(/^[0-9]+$/)) {
            sizeStyle = `${val}px`;
          }

          const key = `type-${t.name}-${idx}`;
          const isCopied = copiedKey === key;
          const cssVar = `--${t.name.replace(/\//g, "-").replace(/\./g, "-")}`;

          return (
            <div key={key} className="group flex flex-col gap-2 py-4 sm:flex-row sm:items-baseline sm:justify-between">
              <div className="min-w-[160px] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-foreground">{t.name}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`var(${cssVar})`, key)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                    title="Copy CSS var"
                  >
                    {isCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{val}</span>
              </div>

              <div className="min-w-0 flex-1 overflow-hidden">
                <p
                  className="truncate text-foreground font-sans transition-[font-size]"
                  style={{ fontSize: sizeStyle }}
                >
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
