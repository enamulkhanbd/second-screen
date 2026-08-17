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

  const isColor =
    type === "color" ||
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim()) ||
    /^rgba?\(.+\)$/i.test(value.trim()) ||
    /^hsla?\(.+\)$/i.test(value.trim());

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (isColor) {
    return (
      <div
        onClick={handleCopy}
        title={`Click to copy: ${value}`}
        className="group relative flex items-center gap-2 cursor-pointer select-none"
      >
        <div className="relative w-6 h-6 rounded-md overflow-hidden border border-white/10 shadow-inner flex-shrink-0 bg-[conic-gradient(#333_25%,#222_0_50%,#333_0_75%,#222_0)] bg-[length:8px_8px]">
          <div
            className="w-full h-full transition-transform group-hover:scale-110"
            style={{ backgroundColor: value }}
          />
        </div>
        <span className="font-mono text-xs text-zinc-300 group-hover:text-white transition-colors truncate max-w-[130px]">
          {value}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-zinc-400 hover:text-white"
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
          style={{ borderRadius: value || "0px" }}
          title={`Radius: ${value}`}
        />
        <span className="font-mono text-xs text-zinc-300 truncate max-w-[120px]">{value}</span>
      </div>
    );
  }

  if (type === "spacing" || type === "sizing" || type === "dimension") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded border border-zinc-700/60 flex-shrink-0">
          <div
            className="bg-violet-400 max-w-[18px] max-h-[18px] min-w-[2px] min-h-[2px] rounded-sm"
            style={{
              width: value.includes("px") ? Math.min(parseInt(value) || 6, 18) : "10px",
              height: value.includes("px") ? Math.min(parseInt(value) || 6, 18) : "10px",
            }}
          />
        </div>
        <span className="font-mono text-xs text-zinc-300 truncate max-w-[120px]">{value}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-300 truncate max-w-[150px]">
      <span>{value}</span>
    </div>
  );
};
