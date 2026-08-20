"use client";

import React, { useState, useMemo } from "react";
import { FlattenedToken, TokenType } from "@/types/tokens";
import {
  Type,
  Palette,
  Square,
  MoveHorizontal,
  Layers,
  Check,
  Copy,
  Link2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Sparkles,
} from "lucide-react";
import { calculateContrastRatio } from "@/utils/accessibility";
import { evaluateTokenMath } from "@/utils/transformTokens";

/**
 * Safely parse a JSON string or return an object
 */
export function safeParseObject(val: any): Record<string, any> | null {
  if (!val) return null;
  if (typeof val === "object") return val;
  if (typeof val === "string" && val.trim().startsWith("{") && val.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Capitalizes a token path nicely for the specimen preview
 * e.g. "title.xl.semibold" -> "Title XL Semibold"
 */
function formatSpecimenName(name: string): string {
  if (!name) return "Sample Text";
  return name
    .split(".")
    .map((part) => {
      if (part.toLowerCase() === "xl") return "XL";
      if (part.toLowerCase() === "lg") return "LG";
      if (part.toLowerCase() === "md") return "MD";
      if (part.toLowerCase() === "sm") return "SM";
      if (part.toLowerCase() === "xs") return "XS";
      if (part.toLowerCase() === "2xl") return "2XL";
      if (part.toLowerCase() === "3xl") return "3XL";
      if (part.toLowerCase() === "4xl") return "4XL";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

/**
 * Renders the Raw Value column with flexible, generous space for composite tokens and aliases.
 */
export const TokenRawValueCell: React.FC<{
  token: FlattenedToken;
  onUpdate: (path: string[], newValue: string | Record<string, any>) => void;
}> = ({ token, onUpdate }) => {
  const [localVal, setLocalVal] = useState(token.rawValue);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditingComposite, setIsEditingComposite] = useState(false);

  React.useEffect(() => {
    setLocalVal(token.rawValue);
  }, [token.rawValue]);

  const rawObj = useMemo(() => safeParseObject(token.rawValue), [token.rawValue]);
  const isTypographyComposite = token.type === "typography" && rawObj !== null;

  // Handle single string value input change
  const handleStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);
    onUpdate(token.path, newVal);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1200);
  };

  // Handle sub-property update for composite typography
  const handleSubPropChange = (propKey: string, propVal: string) => {
    if (!rawObj) return;
    const updated = { ...rawObj, [propKey]: propVal };
    setLocalVal(JSON.stringify(updated));
    onUpdate(token.path, updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1200);
  };

  // If it is a composite Typography token, render clean structured object text (no chips)
  if (isTypographyComposite && rawObj) {
    const entries = Object.entries(rawObj);

    return (
      <div className="font-mono text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300 py-1">
        <div className="text-zinc-400 dark:text-zinc-500">{"{"}</div>
        <div className="pl-3 space-y-0.5">
          {entries.map(([key, val], idx) => {
            const isLast = idx === entries.length - 1;
            const strVal = String(val);
            const isAlias = strVal.startsWith("{") && strVal.endsWith("}");

            return (
              <div key={key} className="flex items-center gap-1.5 flex-wrap">
                <span className="text-zinc-500 dark:text-zinc-400">{key}:</span>
                <span
                  className={
                    isAlias
                      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-zinc-800 dark:text-zinc-200"
                  }
                >
                  {strVal}
                  {!isLast ? "," : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-zinc-400 dark:text-zinc-500">{"}"}</div>
      </div>
    );
  }

  // Primitive value input (color, spacing, single string, etc.)
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <input
          type="text"
          value={localVal}
          onChange={handleStringChange}
          placeholder="e.g. #3b82f6 or {colors.brand.500}"
          className={`w-full font-mono text-xs px-3.5 py-2 rounded-xl border transition-all outline-none ${
            token.isAlias
              ? "border-emerald-500/40 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600"
          }`}
        />
        {token.isAlias && (
          <span
            title={`Resolves to: ${token.resolvedValue}`}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono pointer-events-none font-semibold"
          >
            <Link2 className="w-3.5 h-3.5" />
            alias
          </span>
        )}
      </div>
      {isSaved && (
        <span className="text-emerald-500 flex items-center text-xs font-semibold" title="Saved">
          <Check className="w-4 h-4" />
        </span>
      )}
    </div>
  );
};

/**
 * Visual Preview Cell that renders real live typography specimens, solid color swatches,
 * border radius boxes, elevation shadows, and spacing dimensions.
 */
export const TokenVisualPreviewCell: React.FC<{
  token: FlattenedToken;
}> = ({ token }) => {
  const [copied, setCopied] = useState(false);

  const resolvedObj = useMemo(
    () => safeParseObject(token.resolvedValue),
    [token.resolvedValue]
  );

  const isColor =
    token.type === "color" ||
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(token.resolvedValue.trim()) ||
    /^rgba?\(.+\)$/i.test(token.resolvedValue.trim()) ||
    /^hsla?\(.+\)$/i.test(token.resolvedValue.trim());

  const handleCopy = (valToCopy: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(valToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // 1. TYPOGRAPHY COMPOSITE (Font Name - Font Weight - Font Size - Line Height)
  if (token.type === "typography" && resolvedObj) {
    const rawFamily = resolvedObj.fontFamily || "inherit";
    const family = rawFamily.replace(/[{}]/g, "");
    const weight = resolvedObj.fontWeight || "normal";
    const rawSize = String(resolvedObj.fontSize || "16");
    const rawLineHeight = String(resolvedObj.lineHeight || "normal");

    // Evaluate any nested math expressions
    const size = evaluateTokenMath(rawSize);
    const lineHeight = evaluateTokenMath(rawLineHeight);

    const cleanSize = size.replace(/px/g, "");
    const cleanLineHeight = lineHeight.replace(/px/g, "");

    return (
      <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-700 dark:text-zinc-300">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{family}</span>
        <span className="text-zinc-400">-</span>
        <span>{weight}</span>
        <span className="text-zinc-400">-</span>
        <span>{cleanSize}</span>
        <span className="text-zinc-400">-</span>
        <span>{cleanLineHeight}</span>
      </div>
    );
  }

  // 2. SINGLE FONT PROPERTY (fontFamilies, fontWeights, fontSizes)
  if (token.type === "typography") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {token.resolvedValue}
        </span>
      </div>
    );
  }

  // 3. COLOR TOKEN SWATCH + CONTRAST INDICATOR
  if (isColor) {
    const whiteCompliance = calculateContrastRatio(token.resolvedValue, "#ffffff");
    const blackCompliance = calculateContrastRatio(token.resolvedValue, "#000000");
    const bestRatio = Math.max(whiteCompliance?.ratio || 1, blackCompliance?.ratio || 1);

    return (
      <div
        onClick={() => handleCopy(token.resolvedValue)}
        className="group relative flex items-center gap-3 cursor-pointer select-none"
        title={`Click to copy: ${token.resolvedValue} (Contrast: ${bestRatio}:1)`}
      >
        <div
          className="w-7 h-7 rounded-lg border border-black/15 dark:border-white/20 shadow-xs flex-shrink-0 transition-transform group-hover:scale-105"
          style={{ backgroundColor: token.resolvedValue }}
        />
        <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white transition-colors truncate">
          {token.resolvedValue}
        </span>

        {bestRatio >= 4.5 && (
          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 font-semibold">
            {bestRatio}:1
          </span>
        )}

        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-white rounded-md"
          tabIndex={-1}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  // 4. BORDER RADIUS TOKEN
  if (token.type === "borderRadius") {
    return (
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 border-2 border-violet-500/70 bg-violet-500/10 flex-shrink-0"
          style={{ borderRadius: token.resolvedValue || "0px" }}
          title={`Radius: ${token.resolvedValue}`}
        />
        <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 truncate">
          {token.resolvedValue}
        </span>
      </div>
    );
  }

  // 5. SPACING / SIZING / DIMENSION TOKEN
  if (token.type === "spacing" || token.type === "sizing" || token.type === "dimension") {
    const pxNum = parseInt(token.resolvedValue) || 12;
    const clampedPx = Math.min(Math.max(pxNum, 4), 24);

    return (
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700/60 flex-shrink-0">
          <div
            className="bg-blue-500 rounded-xs"
            style={{
              width: `${clampedPx}px`,
              height: `${clampedPx}px`,
            }}
          />
        </div>
        <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 truncate">
          {token.resolvedValue}
        </span>
      </div>
    );
  }

  // 6. BOX SHADOW / ELEVATION TOKEN
  if (token.type === "boxShadow") {
    return (
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex-shrink-0"
          style={{ boxShadow: token.resolvedValue }}
          title={`Shadow: ${token.resolvedValue}`}
        />
        <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 truncate">
          {token.resolvedValue}
        </span>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-zinc-800 dark:text-zinc-200 truncate">
      <span>{token.resolvedValue}</span>
    </div>
  );
};
