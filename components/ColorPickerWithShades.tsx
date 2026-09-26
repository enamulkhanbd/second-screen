"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  COLOR_FAMILIES,
  SHADE_STEPS,
  findMatchingColorFamily,
  findExactColorFamily,
  getBestMatchingShadeStep,
  generateDynamicShades,
  getContrastTextColor,
  resolveAccessibleBrandTokens,
  ColorShade,
  ColorFamily,
} from "@/utils/colorPalettes";
import { Check, Pipette, Hash, ShieldCheck, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ColorPickerWithShadesProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

export const ColorPickerWithShades: React.FC<ColorPickerWithShadesProps> = ({
  value = "#171717",
  onChange,
}) => {
  const [selectedHex, setSelectedHex] = useState(value);
  const [hexInput, setHexInput] = useState(() => value.replace(/^#/, ""));

  useEffect(() => {
    if (value && value.toLowerCase() !== selectedHex.toLowerCase()) {
      setSelectedHex(value);
      setHexInput(value.replace(/^#/, ""));
    }
  }, [value]);

  const exactFamily = useMemo(() => findExactColorFamily(selectedHex), [selectedHex]);

  const currentShades = useMemo(() => {
    if (exactFamily) {
      return exactFamily.shades;
    }
    return generateDynamicShades(selectedHex);
  }, [exactFamily, selectedHex]);

  const currentStep = useMemo(() => {
    const clean = selectedHex.toLowerCase().trim();
    for (const [stepStr, hex] of Object.entries(currentShades)) {
      if (hex.toLowerCase() === clean) {
        return Number(stepStr) as ColorShade["step"];
      }
    }
    return getBestMatchingShadeStep(selectedHex);
  }, [currentShades, selectedHex]);

  const brandTokens = useMemo(() => resolveAccessibleBrandTokens(selectedHex), [selectedHex]);

  const handleSelectFamily = (family: ColorFamily) => {
    const targetStep = currentStep || 500;
    const newHex = family.shades[targetStep] || family.baseHex;
    setSelectedHex(newHex);
    setHexInput(newHex.replace(/^#/, ""));
    onChange(newHex);
  };

  const handleSelectShade = (step: ColorShade["step"], hex: string) => {
    setSelectedHex(hex);
    setHexInput(hex.replace(/^#/, ""));
    onChange(hex);
  };

  const handleHexInputChange = (raw: string) => {
    const clean = raw.trim().replace(/^#/, "");
    setHexInput(clean);
    if (/^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clean)) {
      const fullHex = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
      const formatted = `#${fullHex.toLowerCase()}`;
      setSelectedHex(formatted);
      onChange(formatted);
    }
  };

  return (
    <div className="space-y-3.5 w-full select-none font-sans">
      {/* 1. Primary Hue Swatches */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Color Palette</span>
          <span className="text-[11px] font-semibold text-foreground">
            {exactFamily ? exactFamily.name : "Custom Color"}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/30 border border-border/70 items-center">
          {COLOR_FAMILIES.map((family) => {
            const isSelected = exactFamily?.id === family.id;
            return (
              <button
                key={family.id}
                type="button"
                onClick={() => handleSelectFamily(family)}
                style={{ backgroundColor: family.baseHex }}
                className={`w-6 h-6 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-primary scale-110 shadow-xs z-10"
                    : "opacity-85 hover:opacity-100 hover:scale-110"
                }`}
                title={family.name}
              >
                {isSelected && (
                  <Check
                    className="w-3 h-3 drop-shadow-xs"
                    style={{ color: getContrastTextColor(family.baseHex) }}
                  />
                )}
              </button>
            );
          })}

          {/* Dynamic Custom Color Indicator Swatch when not in a standard preset */}
          {!exactFamily && (
            <div
              className="w-6 h-6 rounded-full ring-2 ring-offset-2 ring-primary scale-110 shadow-xs z-10 relative flex items-center justify-center border border-border/70 transition-all cursor-default"
              style={{ backgroundColor: selectedHex }}
              title={`Custom Accent Color (${selectedHex})`}
            >
              <Check
                className="w-3 h-3 drop-shadow-xs"
                style={{ color: getContrastTextColor(selectedHex) }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Sleek Connected Tint & Shade Ramp */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Tonal Shades</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {currentStep ? `Shade ${currentStep}` : "Custom Tone"}
          </span>
        </div>

        <div className="space-y-1">
          {/* Continuous segmented pill bar */}
          <div className="flex items-center h-7 rounded-lg overflow-hidden border border-border/80 p-0.5 bg-muted/40 gap-0.5">
            {SHADE_STEPS.map((step) => {
              const shadeHex = currentShades[step];
              const isShadeSelected = currentStep === step;
              const shadeContrast = getContrastTextColor(shadeHex);

              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => handleSelectShade(step, shadeHex)}
                  style={{ backgroundColor: shadeHex }}
                  className={`flex-1 h-full rounded-[4px] transition-all cursor-pointer relative flex items-center justify-center ${
                    isShadeSelected
                      ? "ring-2 ring-primary ring-offset-1 scale-105 z-10 shadow-xs"
                      : "hover:scale-105 hover:z-10 opacity-90 hover:opacity-100"
                  }`}
                  title={`${exactFamily?.name || "Custom"} ${step} (${shadeHex})`}
                >
                  {isShadeSelected && (
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: shadeContrast }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
            <span>50 Light</span>
            <span>500 Pure</span>
            <span>950 Deep</span>
          </div>
        </div>
      </div>

      {/* 3. Compact Hex & Eyedropper Row */}
      <div className="flex items-center gap-2 pt-1">
        {/* Color preview indicator with hidden native picker trigger */}
        <label
          className="relative w-8 h-8 rounded-lg border border-border/80 shadow-xs cursor-pointer overflow-hidden flex-shrink-0 flex items-center justify-center group"
          style={{ backgroundColor: selectedHex }}
          title="Click to open color picker"
        >
          <input
            type="color"
            value={selectedHex.startsWith("#") ? selectedHex : "#171717"}
            onChange={(e) => handleHexInputChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <Pipette
            className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-xs"
            style={{ color: getContrastTextColor(selectedHex) }}
          />
        </label>

        {/* Hex input without duplicate # prefix */}
        <div className="relative flex-1">
          <Hash className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={hexInput.replace(/^#/, "")}
            onChange={(e) => handleHexInputChange(e.target.value)}
            placeholder="171717"
            className="h-8 pl-7 text-xs font-mono uppercase bg-background"
            maxLength={6}
          />
        </div>

        {/* Native eyedropper button */}
        <label className="flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-muted/60 hover:bg-muted border border-border text-xs font-medium text-foreground cursor-pointer transition-colors flex-shrink-0">
          <Pipette className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px]">Pick</span>
          <input
            type="color"
            value={selectedHex.startsWith("#") ? selectedHex : "#171717"}
            onChange={(e) => handleHexInputChange(e.target.value)}
            className="sr-only"
          />
        </label>
      </div>

      {/* 4. Live Accessibility & Dual-Theme Contrast Indicator */}
      <div className="pt-2.5 border-t border-border/70 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Dual-Theme Accessibility</span>
          </span>
          <Badge
            variant="outline"
            className={`text-[9px] font-mono px-1.5 py-0 h-4 border ${
              brandTokens.light.contrastRatio >= 4.5 && brandTokens.dark.contrastRatio >= 4.5
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
            }`}
          >
            {brandTokens.light.contrastRatio >= 7.0 && brandTokens.dark.contrastRatio >= 7.0
              ? "WCAG AAA Pass"
              : "WCAG AA Pass"}
          </Badge>
        </div>

        {/* Dual Mode Preview Cards */}
        <div className="grid grid-cols-2 gap-2">
          {/* Light Theme Preview */}
          <div className="p-2 rounded-lg bg-white text-zinc-900 border border-zinc-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[9px] text-zinc-500">
              <span className="font-semibold flex items-center gap-1">
                <Sun className="w-2.5 h-2.5 text-amber-500" />
                <span>Light</span>
              </span>
              <span className="font-mono font-bold text-zinc-700">{brandTokens.light.contrastRatio}:1</span>
            </div>
            <div
              className={`h-6 rounded-md flex items-center justify-center text-[10px] font-semibold transition-all shadow-2xs ${
                brandTokens.light.isUltraLight ? "border" : ""
              }`}
              style={{
                backgroundColor: brandTokens.light.primaryHex,
                color: brandTokens.light.foregroundHex,
                borderColor: brandTokens.light.borderHex,
              }}
            >
              Primary Action
            </div>
          </div>

          {/* Dark Theme Preview */}
          <div className="p-2 rounded-lg bg-zinc-950 text-zinc-100 border border-zinc-800 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[9px] text-zinc-400">
              <span className="font-semibold flex items-center gap-1">
                <Moon className="w-2.5 h-2.5 text-indigo-400" />
                <span>Dark</span>
              </span>
              <span className="font-mono font-bold text-zinc-200">{brandTokens.dark.contrastRatio}:1</span>
            </div>
            <div
              className="h-6 rounded-md flex items-center justify-center text-[10px] font-semibold transition-all shadow-2xs"
              style={{
                backgroundColor: brandTokens.dark.primaryHex,
                color: brandTokens.dark.foregroundHex,
              }}
            >
              Primary Action
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
