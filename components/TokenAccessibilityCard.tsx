"use client";

import React, { useState, useMemo } from "react";
import {
  calculateContrastRatio,
  simulateColorVisionDeficiency,
  CvdType,
  WcagCompliance,
} from "@/utils/accessibility";
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers,
  Sliders,
  ArrowRight,
} from "lucide-react";

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
  onOpenMatrix,
}) => {
  const [selectedCvd, setSelectedCvd] = useState<CvdType | "normal">("normal");
  const [buttonHovered, setButtonHovered] = useState(false);
  const [optionHovered, setOptionHovered] = useState(false);
  const [canvasHovered, setCanvasHovered] = useState(false);

  // Default theme backgrounds to check contrast against
  const LIGHT_BG = "#ffffff";
  const DARK_BG = "#18181b"; // Tailwind zinc-900 / dark canvas surface

  // Display simulated color if CVD selected
  const displayColor = useMemo(() => {
    if (selectedCvd === "normal") return resolvedValue;
    return simulateColorVisionDeficiency(resolvedValue, selectedCvd);
  }, [resolvedValue, selectedCvd]);

  // Contrast calculations
  const lightContrast = useMemo(() => {
    return calculateContrastRatio(displayColor, LIGHT_BG);
  }, [displayColor]);

  const darkContrast = useMemo(() => {
    return calculateContrastRatio(displayColor, DARK_BG);
  }, [displayColor]);

  // If this token is not a color (or unparseable color), we show typography/sizing accessibility advice instead
  const isColor = tokenCategory === "color" || (lightContrast !== null && darkContrast !== null);

  if (!isColor || !lightContrast || !darkContrast) {
    return null;
  }

  // Check how many themes fail contrast (AA normal text < 4.5:1)
  const failsLight = !lightContrast.aaNormal;
  const failsDark = !darkContrast.aaNormal;
  const issueCount = (failsLight ? 1 : 0) + (failsDark ? 1 : 0);

  return (
    <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 font-sans">
      {/* Section Header: Context Badge + Issues count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono text-xs font-semibold border border-zinc-200 dark:border-zinc-700">
            --{tokenName}
          </span>
          <span className="text-xs text-zinc-500 font-medium">on</span>
          <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono text-xs font-semibold border border-zinc-200 dark:border-zinc-700">
            --theme-surface
          </span>
        </div>

        {issueCount > 0 ? (
          <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 font-mono">
            <span>{issueCount} {issueCount === 1 ? "issue" : "issues"}</span>
          </span>
        ) : (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>Passed</span>
          </span>
        )}
      </div>

      {/* 1. Rendered Multi-Theme Contrast Cards */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-600 dark:text-zinc-400 uppercase font-bold tracking-wider block">
          Rendered
        </label>

        <div className="grid grid-cols-2 gap-3">
          {/* Base Light Box */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white shadow-sm overflow-hidden flex flex-col">
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
            <div className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">base-light</span>
              <span
                className={`font-bold text-[13px] ${
                  lightContrast.aaNormal
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {lightContrast.formattedRatio}
              </span>
            </div>
          </div>

          {/* Base Dark Box */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[#121217] shadow-sm overflow-hidden flex flex-col">
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
            <div className="px-3.5 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-medium">base-dark</span>
              <span
                className={`font-bold text-[13px] ${
                  darkContrast.aaNormal
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {darkContrast.formattedRatio}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Where It Renders (Interactive Component Simulations) */}
      <div className="space-y-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-600 dark:text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1">
            <span>Where it renders</span>
          </label>
        </div>

        {/* Component 1: Floating Toolbar Button */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              FloatingToolbar <span className="text-zinc-500 font-normal">(Button, hover)</span>
            </span>
            <span className="text-xs text-zinc-500 italic">hover it</span>
          </div>

          <div
            onMouseEnter={() => setButtonHovered(true)}
            onMouseLeave={() => setButtonHovered(false)}
            className="w-full py-2.5 px-4 rounded-lg flex items-center justify-center text-sm font-semibold shadow-sm transition-all cursor-pointer select-none"
            style={{
              backgroundColor: buttonHovered ? displayColor : "#e4e4e7",
              color: buttonHovered
                ? calculateContrastRatio("#ffffff", displayColor)?.ratio! >
                  calculateContrastRatio("#000000", displayColor)?.ratio!
                  ? "#ffffff"
                  : "#000000"
                : "#18181b",
            }}
          >
            Button
          </div>
        </div>

        {/* Component 2: Floating Toolbar Option */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              FloatingToolbar <span className="text-zinc-500 font-normal">(Option, hover)</span>
            </span>
            <span className="text-xs text-zinc-500 italic">hover it</span>
          </div>

          <div className="flex items-center justify-center py-1">
            <div
              onMouseEnter={() => setOptionHovered(true)}
              onMouseLeave={() => setOptionHovered(false)}
              className="px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer select-none"
              style={{
                backgroundColor: optionHovered ? displayColor : "#ffffff",
                color: optionHovered
                  ? calculateContrastRatio("#ffffff", displayColor)?.ratio! >
                    calculateContrastRatio("#000000", displayColor)?.ratio!
                    ? "#ffffff"
                    : "#000000"
                  : "#18181b",
                border: optionHovered ? "1px solid transparent" : "1px solid #cbd5e1",
              }}
            >
              Option
            </div>
          </div>
        </div>

        {/* Component 3: Canvas Controls */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                CanvasControls <span className="text-zinc-500 font-normal">(Button, hover)</span>
              </span>
              <span className="text-[11px] text-zinc-500">In the prototype on 4 screens</span>
            </div>
            <span className="text-xs text-zinc-500 italic">hover it</span>
          </div>

          <div
            onMouseEnter={() => setCanvasHovered(true)}
            onMouseLeave={() => setCanvasHovered(false)}
            className="w-full py-2.5 px-4 rounded-lg flex items-center justify-center text-sm font-semibold shadow-sm transition-all cursor-pointer select-none"
            style={{
              backgroundColor: canvasHovered ? displayColor : "#e4e4e7",
              color: canvasHovered
                ? calculateContrastRatio("#ffffff", displayColor)?.ratio! >
                  calculateContrastRatio("#000000", displayColor)?.ratio!
                  ? "#ffffff"
                  : "#000000"
                : "#18181b",
            }}
          >
            Button
          </div>
        </div>
      </div>

      {/* 3. Contrast Issues Banner (if failing on 1 or both themes) */}
      {issueCount > 0 && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/70 text-red-700 dark:text-red-300 font-mono">
              CONTRAST
            </span>
            <span className="text-xs font-bold text-red-900 dark:text-red-200">
              Fails contrast in {issueCount} {issueCount === 1 ? "theme" : "themes"}
            </span>
          </div>

          <p className="text-xs text-red-800 dark:text-red-300/90 leading-relaxed font-sans font-medium">
            Re-value one side against the other — the matrix picks the token to satisfy WCAG AA (min 4.5:1).
          </p>

          {onOpenMatrix && (
            <button
              onClick={onOpenMatrix}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:text-black dark:hover:text-white rounded-lg text-xs font-bold border border-zinc-300 dark:border-zinc-700 shadow-sm transition-all cursor-pointer mt-1"
            >
              <span>Fix in matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 4. Color Vision Deficiency (CVD) Simulation Bar */}
      <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-600 dark:text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Color Blindness Filter</span>
          </label>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-xs font-mono font-medium">
          {[
            { id: "normal", label: "Normal" },
            { id: "protanopia", label: "Protan" },
            { id: "deuteranopia", label: "Deutan" },
            { id: "tritanopia", label: "Tritan" },
          ].map((cvd) => {
            const isSelected = selectedCvd === cvd.id;
            const simHex =
              cvd.id === "normal"
                ? resolvedValue
                : simulateColorVisionDeficiency(resolvedValue, cvd.id as CvdType);

            return (
              <button
                key={cvd.id}
                onClick={() => setSelectedCvd(cvd.id as any)}
                className={`py-2 px-1 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-violet-50 dark:bg-violet-950/60 border-violet-500 text-violet-900 dark:text-violet-200 shadow-sm font-bold"
                    : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shadow-inner"
                  style={{ backgroundColor: simHex }}
                />
                <span className="truncate text-[11px]">{cvd.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
