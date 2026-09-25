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
import { Check, Pipette, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const [activeFamily, setActiveFamily] = useState<ColorFamily>(() => findMatchingColorFamily(value));
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => {
    if (value && value.toLowerCase() !== selectedHex.toLowerCase()) {
      setSelectedHex(value);
      setHexInput(value);
      setActiveFamily(findMatchingColorFamily(value));
    }
  }, [value]);

  const currentShades = useMemo(() => {
    const familyShades = activeFamily.shades;
    const isStandardFamily = Object.values(familyShades).some(
      (s) => s.toLowerCase() === selectedHex.toLowerCase()
    );

    if (isStandardFamily) {
      return familyShades;
    }
    return generateDynamicShades(selectedHex);
  }, [activeFamily, selectedHex]);

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

  return (
    <div className="space-y-3.5 w-full">
      {/* 1. Primary Hue Swatches (Clean, neatly wrapped grid) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Color Palette</span>
          <span className="text-[11px] font-semibold text-foreground">{activeFamily.name}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/30 border border-border/70">
          {COLOR_FAMILIES.map((family) => {
            const isSelected = activeFamily.id === family.id;
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
              const isShadeSelected = selectedHex.toLowerCase() === shadeHex.toLowerCase();
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
                  title={`${activeFamily.name} ${step} (${shadeHex})`}
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

        {/* Hex input */}
        <div className="relative flex-1">
          <Hash className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={hexInput}
            onChange={(e) => handleHexInputChange(e.target.value)}
            placeholder="#171717"
            className="h-8 pl-7 text-xs font-mono uppercase bg-background"
            maxLength={7}
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
    </div>
  );
};
