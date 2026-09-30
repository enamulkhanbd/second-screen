"use client";

import React, { useState } from "react";
import { TokenType } from "@/types/tokens";
import { Check, Copy } from "lucide-react";

interface ColorSwatchProps {
  value: string;
  type: TokenType;
  name: string;
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({ value, type, name }) => {
  const [copied, setCopied] = useState(false);

  const valStr = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");

  const isColor =
    type === "color" ||
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(valStr.trim()) ||
    /^rgba?\(.+\)$/i.test(valStr.trim()) ||
    /^hsla?\(.+\)$/i.test(valStr.trim()) ||
    /^(oklch|lch|color|lab)\(.+\)$/i.test(valStr.trim());

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(valStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (isColor) {
    return (
      <div
        onClick={handleCopy}
        title={`Click to copy: ${valStr}`}
        className="group relative flex items-center gap-2 cursor-pointer select-none"
      >
        <div
          className="relative w-6 h-6 rounded-md border border-black/20 dark:border-white/20 shadow-inner flex-shrink-0 transition-opacity group-hover:opacity-90"
          style={{ backgroundColor: valStr }}
        />
        <span className="font-mono text-xs text-foreground group-hover:text-primary transition-colors truncate max-w-[130px]">
          {valStr}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  if (type === "borderRadius") {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 border-2 border-violet-400/70 bg-violet-500/10 flex-shrink-0"
          style={{ borderRadius: valStr || "0px" }}
          title={`Radius: ${valStr}`}
        />
        <span className="font-mono text-xs text-foreground truncate max-w-[120px]">{valStr}</span>
      </div>
    );
  }

  if (type === "spacing" || type === "sizing" || type === "dimension") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 flex items-center justify-center bg-muted/70 dark:bg-zinc-800 rounded border border-border dark:border-zinc-700/60 flex-shrink-0">
          <div
            className="bg-violet-400 max-w-[18px] max-h-[18px] min-w-[2px] min-h-[2px] rounded-sm"
            style={{
              width: valStr.includes("px") ? Math.min(parseInt(valStr) || 6, 18) : "10px",
              height: valStr.includes("px") ? Math.min(parseInt(valStr) || 6, 18) : "10px",
            }}
          />
        </div>
        <span className="font-mono text-xs text-foreground truncate max-w-[120px]">{valStr}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-foreground truncate max-w-[150px]">
      <span>{valStr}</span>
    </div>
  );
};
