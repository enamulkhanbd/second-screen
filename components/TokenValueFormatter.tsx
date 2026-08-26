"use client";

import React, { useState, useMemo } from "react";
import { FlattenedToken } from "@/types/tokens";
import {
  Check,
  Copy,
  Link2,
} from "lucide-react";
import { calculateContrastRatio } from "@/utils/accessibility";
import { evaluateTokenMath } from "@/utils/transformTokens";
import { Badge } from "@/components/ui/badge";

export function safeParseObject(val: any): Record<string, any> | null {
  if (!val) return null;
  let parsed: any = val;
  if (typeof val === "string" && val.trim().startsWith("{") && val.trim().endsWith("}")) {
    try {
      parsed = JSON.parse(val);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  while (
    typeof parsed === "object" &&
    parsed !== null &&
    ("$value" in parsed || "value" in parsed) &&
    !("fontFamily" in parsed) &&
    !("fontSize" in parsed) &&
    !("fontWeight" in parsed) &&
    !("lineHeight" in parsed)
  ) {
    parsed = parsed.value !== undefined ? parsed.value : parsed.$value;
    if (typeof parsed === "string" && parsed.trim().startsWith("{") && parsed.trim().endsWith("}")) {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return null;
      }
    }
  }
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    return parsed;
  }
  return null;
}

export const TokenRawValueCell: React.FC<{
  token: FlattenedToken;
  onUpdate: (path: string[], newValue: string | Record<string, any>) => void;
}> = ({ token, onUpdate }) => {
  const [localVal, setLocalVal] = useState(token.rawValue);
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    setLocalVal(token.rawValue);
  }, [token.rawValue]);

  const rawObj = useMemo(() => safeParseObject(token.rawValue), [token.rawValue]);
  const isTypographyComposite = token.type === "typography" && rawObj !== null;

  const handleStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);
    onUpdate(token.path, newVal);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1200);
  };

  if (isTypographyComposite && rawObj) {
    const entries = Object.entries(rawObj);

    return (
      <div className="font-mono text-[11px] leading-relaxed text-foreground py-1">
        <div className="text-muted-foreground">{"{"}</div>
        <div className="pl-3 space-y-0.5">
          {entries.map(([key, val], idx) => {
            const isLast = idx === entries.length - 1;
            let rawScalar = val;
            while (typeof rawScalar === "object" && rawScalar !== null && ("value" in rawScalar || "$value" in rawScalar)) {
              rawScalar = rawScalar.value !== undefined ? rawScalar.value : rawScalar.$value;
            }
            const strVal = typeof rawScalar === "object" && rawScalar !== null ? JSON.stringify(rawScalar) : String(rawScalar ?? "");
            const isAlias = strVal.startsWith("{") && strVal.endsWith("}");

            return (
              <div key={key} className="flex items-center gap-1.5 flex-wrap">
                <span className="text-muted-foreground">{key}:</span>
                <span
                  className={
                    isAlias
                      ? "text-primary font-semibold"
                      : "text-foreground"
                  }
                >
                  {strVal}
                  {!isLast ? "," : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-muted-foreground">{"}"}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <input
          type="text"
          value={localVal}
          onChange={handleStringChange}
          placeholder="e.g. #3b82f6 or {colors.brand.500}"
          className={`w-full font-mono text-xs px-3 py-1.5 rounded-md border transition-all outline-none ${
            token.isAlias
              ? "border-primary/40 text-primary bg-primary/5 focus:border-primary focus:ring-1 focus:ring-primary"
              : "border-input bg-transparent text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          }`}
        />
        {token.isAlias && (
          <span
            title={`Resolves to: ${token.resolvedValue}`}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-primary font-mono pointer-events-none font-semibold"
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

  // 1. TYPOGRAPHY COMPOSITE
  if (token.type === "typography" && resolvedObj) {
    const getScalar = (v: any): string => {
      if (!v && v !== 0) return "";
      while (typeof v === "object" && v !== null && ("value" in v || "$value" in v)) {
        v = v.value !== undefined ? v.value : v.$value;
      }
      return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
    };

    const rawFamily = getScalar(resolvedObj.fontFamily || "inherit");
    const family = rawFamily.replace(/[{}]/g, "");
    const weight = getScalar(resolvedObj.fontWeight || "normal");
    const rawSize = getScalar(resolvedObj.fontSize || "16");
    const rawLineHeight = getScalar(resolvedObj.lineHeight || "normal");

    const size = evaluateTokenMath(rawSize);
    const lineHeight = evaluateTokenMath(rawLineHeight);

    const cleanSize = size.replace(/px/g, "");
    const cleanLineHeight = lineHeight.replace(/px/g, "");

    return (
      <div className="flex items-center gap-1.5 text-xs font-mono text-foreground">
        <span className="font-semibold text-foreground">{family}</span>
        <span className="text-muted-foreground">-</span>
        <span>{weight}</span>
        <span className="text-muted-foreground">-</span>
        <span>{cleanSize}</span>
        <span className="text-muted-foreground">-</span>
        <span>{cleanLineHeight}</span>
      </div>
    );
  }

  // 2. SINGLE FONT PROPERTY
  if (token.type === "typography") {
    const textVal = typeof token.resolvedValue === "object" && token.resolvedValue !== null
      ? JSON.stringify(token.resolvedValue)
      : String(token.resolvedValue ?? "");
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {textVal}
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
        <span className="font-mono text-xs text-foreground group-hover:text-primary transition-colors truncate">
          {token.resolvedValue}
        </span>

        {bestRatio >= 4.5 && (
          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
            {bestRatio}:1
          </Badge>
        )}

        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground rounded-md"
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
          className="w-7 h-7 border-2 border-primary/70 bg-primary/10 flex-shrink-0"
          style={{ borderRadius: token.resolvedValue || "0px" }}
          title={`Radius: ${token.resolvedValue}`}
        />
        <span className="font-mono text-xs text-foreground truncate">
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
        <div className="w-7 h-7 flex items-center justify-center bg-muted rounded-lg border border-border flex-shrink-0">
          <div
            className="bg-primary rounded-xs"
            style={{
              width: `${clampedPx}px`,
              height: `${clampedPx}px`,
            }}
          />
        </div>
        <span className="font-mono text-xs text-foreground truncate">
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
          className="w-7 h-7 rounded-lg bg-card border border-border flex-shrink-0"
          style={{ boxShadow: token.resolvedValue }}
          title={`Shadow: ${token.resolvedValue}`}
        />
        <span className="font-mono text-xs text-foreground truncate">
          {token.resolvedValue}
        </span>
      </div>
    );
  }

  // Default fallback
  const fallbackVal = typeof token.resolvedValue === "object" && token.resolvedValue !== null
    ? JSON.stringify(token.resolvedValue)
    : String(token.resolvedValue ?? "");
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-foreground truncate">
      <span>{fallbackVal}</span>
    </div>
  );
};
