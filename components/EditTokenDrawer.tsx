"use client";

import React, { useState, useEffect, useMemo } from "react";
import { FlattenedToken, TokenType } from "@/types/tokens";
import {
  X,
  Save,
  RotateCcw,
  Type,
  Palette,
  Square,
  MoveHorizontal,
  Layers,
  Sparkles,
  Link2,
  Check,
  Eye,
} from "lucide-react";
import { safeParseObject } from "@/components/TokenValueFormatter";
import { evaluateTokenMath } from "@/utils/transformTokens";
import { TokenAliasInput } from "@/components/TokenAliasInput";

interface EditTokenDrawerProps {
  token: FlattenedToken | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (path: string[], newValue: any) => void;
}

export const EditTokenDrawer: React.FC<EditTokenDrawerProps> = ({
  token,
  isOpen,
  onClose,
  onSave,
}) => {
  const [description, setDescription] = useState("");
  const [rawValue, setRawValue] = useState("");
  const [typographyFields, setTypographyFields] = useState({
    fontFamily: "",
    fontWeight: "",
    fontSize: "",
    lineHeight: "",
    letterSpacing: "",
    paragraphSpacing: "",
    textCase: "",
    textDecoration: "",
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state on token change
  useEffect(() => {
    if (!token) return;
    setDescription(token.description || "");
    setRawValue(token.rawValue);

    if (token.type === "typography") {
      const parsed = safeParseObject(token.rawValue) || {};
      setTypographyFields({
        fontFamily: String(parsed.fontFamily || ""),
        fontWeight: String(parsed.fontWeight || ""),
        fontSize: String(parsed.fontSize || ""),
        lineHeight: String(parsed.lineHeight || ""),
        letterSpacing: String(parsed.letterSpacing || ""),
        paragraphSpacing: String(parsed.paragraphSpacing || ""),
        textCase: String(parsed.textCase || "none"),
        textDecoration: String(parsed.textDecoration || "none"),
      });
    }
  }, [token]);

  if (!isOpen || !token) return null;

  const isTypography = token.type === "typography";

  const handleSave = () => {
    if (isTypography) {
      // Build clean composite object
      const obj: Record<string, any> = {};
      if (typographyFields.fontFamily) obj.fontFamily = typographyFields.fontFamily;
      if (typographyFields.fontWeight) obj.fontWeight = typographyFields.fontWeight;
      if (typographyFields.fontSize) obj.fontSize = typographyFields.fontSize;
      if (typographyFields.lineHeight) obj.lineHeight = typographyFields.lineHeight;
      if (typographyFields.letterSpacing) obj.letterSpacing = typographyFields.letterSpacing;
      if (typographyFields.paragraphSpacing) obj.paragraphSpacing = typographyFields.paragraphSpacing;
      if (typographyFields.textCase && typographyFields.textCase !== "none") obj.textCase = typographyFields.textCase;
      if (typographyFields.textDecoration && typographyFields.textDecoration !== "none") obj.textDecoration = typographyFields.textDecoration;

      onSave(token.path, obj);
    } else {
      onSave(token.path, rawValue);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  // Compute live preview values
  const previewFamily = typographyFields.fontFamily.replace(/[{}]/g, "") || "Inter";
  const previewSize = evaluateTokenMath(typographyFields.fontSize || "16px");
  const previewLineHeight = evaluateTokenMath(typographyFields.lineHeight || "normal");
  const previewWeight = typographyFields.fontWeight || "normal";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-Over Drawer Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#0e0e13] border-l border-zinc-200 dark:border-zinc-800/80 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-250 font-sans">
        {/* Drawer Header */}
        <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/80 dark:bg-[#0b0b0f] flex-shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                Edit Token
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono border border-emerald-200 dark:border-emerald-800/60 font-semibold uppercase">
                {token.type}
              </span>
            </div>
            <div className="text-xs font-mono text-zinc-500 truncate mt-0.5">
              {token.name}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Live Preview Specimen Box */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              <span>Live Preview</span>
              <span className="font-mono text-[10px] text-zinc-500">{token.setName}</span>
            </div>

            {isTypography ? (
              <div className="space-y-1.5 pt-1">
                <div
                  style={{
                    fontFamily: previewFamily.includes(" ") ? `"${previewFamily}", sans-serif` : previewFamily,
                    fontSize: previewSize.endsWith("px") ? `${Math.min(parseInt(previewSize) || 16, 28)}px` : previewSize,
                    fontWeight: previewWeight,
                    lineHeight: previewLineHeight,
                    letterSpacing: typographyFields.letterSpacing || "normal",
                  }}
                  className="text-zinc-900 dark:text-white font-medium truncate py-1 leading-tight"
                >
                  The quick brown fox jumps
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  {previewFamily} • {previewWeight} • {previewSize} / {previewLineHeight}
                </div>
              </div>
            ) : token.type === "color" ? (
              <div className="flex items-center gap-3 pt-1">
                <div
                  className="w-10 h-10 rounded-xl border border-black/15 dark:border-white/20 shadow-inner"
                  style={{ backgroundColor: rawValue }}
                />
                <div>
                  <div className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                    {rawValue}
                  </div>
                  <div className="text-[11px] text-zinc-400">Solid Color Swatch</div>
                </div>
              </div>
            ) : (
              <div className="font-mono text-zinc-800 dark:text-zinc-200 py-1">
                {rawValue}
              </div>
            )}
          </div>

          {/* Form Fields: Typography Composite Fields */}
          {isTypography ? (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Font Family
                </label>
                <TokenAliasInput
                  value={typographyFields.fontFamily}
                  onChange={(val) =>
                    setTypographyFields((p) => ({ ...p, fontFamily: val }))
                  }
                  categoryFilter={["fontFamilies", "font", "family"]}
                  placeholder="e.g. {font-families.primary} or 'Inter', sans-serif"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Font Weight
                  </label>
                  <TokenAliasInput
                    value={typographyFields.fontWeight}
                    onChange={(val) =>
                      setTypographyFields((p) => ({ ...p, fontWeight: val }))
                    }
                    categoryFilter={["fontWeights", "weight"]}
                    placeholder="e.g. 500 or {font-weights.medium}"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Font Size
                  </label>
                  <TokenAliasInput
                    value={typographyFields.fontSize}
                    onChange={(val) =>
                      setTypographyFields((p) => ({ ...p, fontSize: val }))
                    }
                    categoryFilter={["fontSizes", "fontSize", "size", "dimension"]}
                    placeholder="e.g. 32px or {font-sizes.32}"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Line Height
                  </label>
                  <TokenAliasInput
                    value={typographyFields.lineHeight}
                    onChange={(val) =>
                      setTypographyFields((p) => ({ ...p, lineHeight: val }))
                    }
                    categoryFilter={["lineHeights", "lineHeight", "dimension"]}
                    placeholder="e.g. 40px or roundTo(...)"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Letter Spacing
                  </label>
                  <TokenAliasInput
                    value={typographyFields.letterSpacing}
                    onChange={(val) =>
                      setTypographyFields((p) => ({ ...p, letterSpacing: val }))
                    }
                    categoryFilter={["letterSpacing", "tracking", "dimension"]}
                    placeholder="e.g. -0.02em or 0"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Primitive Value input */
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Token Value
              </label>
              <TokenAliasInput
                value={rawValue}
                onChange={(val) => setRawValue(val)}
                categoryFilter={token.type}
                placeholder="e.g. #3b82f6 or {colors.brand.500}"
              />
            </div>
          )}

          {/* Description field */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about usage, design intent, or responsive behavior..."
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 resize-none font-sans"
            />
          </div>
        </div>

        {/* Drawer Footer Action Bar */}
        <div className="h-16 px-6 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/80 dark:bg-[#0b0b0f] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
