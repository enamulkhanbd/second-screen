"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  COLOR_FAMILIES,
  SHADE_STEPS,
  findMatchingColorFamily,
  generateDynamicShades,
  getContrastTextColor,
  ColorShade,
  ColorFamily,
} from "@/utils/colorPalettes";
import { Check, Pipette, Sparkles, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ColorPickerWithShadesProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  compact?: boolean;
}

export const ColorPickerWithShades: React.FC<ColorPickerWithShadesProps> = ({
  value = "#6366f1",
  onChange,
  label,
  compact = false,
}) => {
  const [selectedHex, setSelectedHex] = useState(value);
  const [activeFamily, setActiveFamily] = useState<ColorFamily>(() => findMatchingColorFamily(value));
  const [hexInput, setHexInput] = useState(value);

  // Sync internal state when prop changes
  useEffect(() => {
    if (value && value !== selectedHex) {
      setSelectedHex(value);
      setHexInput(value);
      setActiveFamily(findMatchingColorFamily(value));
    }
  }, [value]);

  // Compute active shades ramp based on active family
  const currentShades = useMemo(() => {
    // If selected hex is within active family shades
    const familyShades = activeFamily.shades;
    const isStandardFamily = Object.values(familyShades).some(
      (s) => s.toLowerCase() === selectedHex.toLowerCase()
    );

    if (isStandardFamily) {
      return familyShades;
    }

    // Otherwise compute dynamic shade ramp for the custom color
    return generateDynamicShades(selectedHex);
  }, [activeFamily, selectedHex]);

  // Determine current active shade step (50..950) if any
  const currentStep = useMemo(() => {
    const clean = selectedHex.toLowerCase();
    for (const [stepStr, hex] of Object.entries(currentShades)) {
      if (hex.toLowerCase() === clean) {
        return Number(stepStr) as ColorShade["step"];
      }
    }
    return null;
  }, [currentShades, selectedHex]);

  const handleSelectFamily = (family: ColorFamily) => {
    setActiveFamily(family);
    // Keep corresponding shade step if possible, otherwise default to 500
    const targetStep = currentStep || 500;
    const newHex = family.shades[targetStep] || family.baseHex;
    setSelectedHex(newHex);
    setHexInput(newHex);
    onChange(newHex);
  };

  const handleSelectShade = (step: ColorShade["step"], hex: string) => {
    setSelectedHex(hex);
    setHexInput(hex);
    onChange(hex);
  };

  const handleHexInputChange = (newHex: string) => {
    setHexInput(newHex);
    const clean = newHex.trim();
    if (/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clean)) {
      const formatted = clean.startsWith("#") ? clean : `#${clean}`;
      setSelectedHex(formatted);
      setActiveFamily(findMatchingColorFamily(formatted));
      onChange(formatted);
    }
  };

  const contrastColor = getContrastTextColor(selectedHex);

  return (
    <div className="space-y-3 w-full">
      {/* 1. Hue Swatches Row */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
          <span>Hue Family ({COLOR_FAMILIES.length} colors)</span>
          <span className="font-semibold text-foreground">{activeFamily.name}</span>
        </div>

        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-muted/40 border border-border overflow-x-auto scrollbar-none">
          {COLOR_FAMILIES.map((family) => {
            const isSelected = activeFamily.id === family.id;
            return (
              <button
                key={family.id}
                type="button"
                onClick={() => handleSelectFamily(family)}
                style={{ backgroundColor: family.baseHex }}
                className={`w-7 h-7 rounded-full flex-shrink-0 transition-all cursor-pointer relative shadow-2xs flex items-center justify-center ${
                  isSelected
                    ? "ring-3 ring-offset-2 ring-primary scale-110 z-10"
                    : "hover:scale-105 opacity-90 hover:opacity-100"
                }`}
                title={`${family.name} (${family.baseHex})`}
              >
                {isSelected && (
                  <Check
                    className="w-3.5 h-3.5 drop-shadow-sm"
                    style={{ color: getContrastTextColor(family.baseHex) }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tint & Shade Scale Strip (50 -> 950) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <span>Tints &amp; Shades</span>
            <span className="text-[10px] opacity-70 font-mono">(50 &rarr; 950)</span>
          </span>
          {currentStep && (
            <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5">
              Shade: {currentStep}
            </Badge>
          )}
        </div>

        <div className="p-2 rounded-xl bg-muted/40 border border-border space-y-2">
          {/* Visual Swatch Strip */}
          <div className="grid grid-cols-11 gap-1">
            {SHADE_STEPS.map((step) => {
              const shadeHex = currentShades[step];
              const isShadeSelected = selectedHex.toLowerCase() === shadeHex.toLowerCase();
              const isBase = step === 500;
              const shadeContrast = getContrastTextColor(shadeHex);

              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => handleSelectShade(step, shadeHex)}
                  style={{ backgroundColor: shadeHex }}
                  className={`h-8 rounded-md transition-all cursor-pointer relative flex flex-col items-center justify-between p-0.5 border border-black/10 dark:border-white/10 ${
                    isShadeSelected
                      ? "ring-2 ring-offset-1 ring-primary scale-105 z-10 shadow-sm"
                      : "hover:scale-105 hover:z-10 opacity-95 hover:opacity-100"
                  }`}
                  title={`${activeFamily.name}-${step}: ${shadeHex}`}
                >
                  <span
                    className="text-[8px] font-mono font-bold leading-none select-none"
                    style={{ color: shadeContrast, opacity: isShadeSelected || isBase ? 1 : 0.7 }}
                  >
                    {step}
                  </span>
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

          {/* Scale Labels */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono px-1">
            <span>Light Tints (50-400)</span>
            <span className="font-bold text-foreground">Base (500)</span>
            <span>Dark Shades (600-950)</span>
          </div>
        </div>
      </div>

      {/* 3. Color Preview & Hex Controls */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border">
        {/* Large Color Preview Swatch */}
        <div
          className="w-10 h-10 rounded-lg border border-border shadow-inner flex items-center justify-center flex-shrink-0 relative overflow-hidden group cursor-pointer"
          style={{ backgroundColor: selectedHex }}
        >
          <input
            type="color"
            value={selectedHex.startsWith("#") ? selectedHex : "#6366f1"}
            onChange={(e) => handleHexInputChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Pick custom color"
          />
          <Pipette
            className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: contrastColor }}
          />
        </div>

        {/* Hex Text Input */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="relative flex-1">
            <Hash className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={hexInput}
              onChange={(e) => handleHexInputChange(e.target.value)}
              placeholder="#6366f1"
              className="h-8 pl-7 font-mono text-xs uppercase"
              maxLength={7}
            />
          </div>

          <label className="flex items-center gap-1 px-2.5 h-8 rounded-md bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors flex-shrink-0">
            <Pipette className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px]">Picker</span>
            <input
              type="color"
              value={selectedHex.startsWith("#") ? selectedHex : "#6366f1"}
              onChange={(e) => handleHexInputChange(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
