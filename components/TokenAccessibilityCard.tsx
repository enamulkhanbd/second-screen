"use client";

import React, { useState, useMemo } from "react";
import {
  calculateContrastRatio,
  simulateColorVisionDeficiency,
  CvdType,
} from "@/utils/accessibility";
import {
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TokenAccessibilityCardProps {
  tokenName: string;
  tokenKey: string;
  resolvedValue: string;
  tokenCategory: string;
  onOpenMatrix?: () => void;
}

export const TokenAccessibilityCard: React.FC<TokenAccessibilityCardProps> = ({
  tokenName,
  tokenKey,
  resolvedValue,
  tokenCategory,
}) => {
  const [selectedCvd, setSelectedCvd] = useState<CvdType | "normal">("normal");

  const LIGHT_BG = "#ffffff";
  const DARK_BG = "#18181b";

  const displayColor = useMemo(() => {
    if (selectedCvd === "normal") return resolvedValue;
    return simulateColorVisionDeficiency(resolvedValue, selectedCvd);
  }, [resolvedValue, selectedCvd]);

  const lightContrast = useMemo(() => {
    return calculateContrastRatio(displayColor, LIGHT_BG);
  }, [displayColor]);

  const darkContrast = useMemo(() => {
    return calculateContrastRatio(displayColor, DARK_BG);
  }, [displayColor]);

  const isColor = tokenCategory === "color" || (lightContrast !== null && darkContrast !== null);

  if (!isColor || !lightContrast || !darkContrast) {
    return null;
  }

  const failsLight = !lightContrast.aaNormal;
  const failsDark = !darkContrast.aaNormal;
  const issueCount = (failsLight ? 1 : 0) + (failsDark ? 1 : 0);

  return (
    <div className="space-y-4 pt-4 border-t border-border font-sans">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-xs">
            --{tokenName}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">on</span>
          <Badge variant="outline" className="font-mono text-xs">
            --theme-surface
          </Badge>
        </div>

        {issueCount > 0 ? (
          <Badge variant="destructive" className="font-mono text-xs font-bold">
            {issueCount} {issueCount === 1 ? "issue" : "issues"}
          </Badge>
        ) : (
          <Badge variant="success" className="font-mono text-xs font-bold gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Passed</span>
          </Badge>
        )}
      </div>

      {/* 1. Rendered Multi-Theme Contrast Cards */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider block">
          Rendered
        </label>

        <div className="grid grid-cols-2 gap-3">
          {/* Base Light Box */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
            <div
              className="h-16 flex items-center justify-center p-3 transition-colors select-none"
              style={{ backgroundColor: LIGHT_BG }}
            >
              <span
                className="text-xl font-bold font-sans tracking-wide"
                style={{ color: displayColor }}
              >
                Aa
              </span>
            </div>
            <div className="px-3.5 py-2 bg-muted/60 border-t border-border flex items-center justify-between text-xs font-mono">
              <span className="text-foreground font-medium">base-light</span>
              <span
                className={`font-bold text-[13px] ${
                  lightContrast.aaNormal
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }`}
              >
                {lightContrast.formattedRatio}
              </span>
            </div>
          </div>

          {/* Base Dark Box */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
            <div
              className="h-16 flex items-center justify-center p-3 transition-colors select-none"
              style={{ backgroundColor: DARK_BG }}
            >
              <span
                className="text-xl font-bold font-sans tracking-wide"
                style={{ color: displayColor }}
              >
                Aa
              </span>
            </div>
            <div className="px-3.5 py-2 bg-muted/60 border-t border-border flex items-center justify-between text-xs font-mono">
              <span className="text-foreground font-medium">base-dark</span>
              <span
                className={`font-bold text-[13px] ${
                  darkContrast.aaNormal
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }`}
              >
                {darkContrast.formattedRatio}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CVD Simulation Selector */}
      <div className="space-y-1.5 pt-1">
        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-primary" />
          <span>Color Blindness Simulation</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: "normal", label: "Normal Vision" },
            { id: "protanopia", label: "Protanopia (Red-blind)" },
            { id: "deuteranopia", label: "Deuteranopia (Green-blind)" },
            { id: "tritanopia", label: "Tritanopia (Blue-blind)" },
          ].map((cvd) => (
            <button
              key={cvd.id}
              onClick={() => setSelectedCvd(cvd.id as any)}
              className={`p-2 rounded-lg border text-left text-xs font-medium transition-all ${
                selectedCvd === cvd.id
                  ? "bg-primary/10 border-primary text-primary font-semibold shadow-xs"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}
            >
              {cvd.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
