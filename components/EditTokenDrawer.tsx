"use client";

import React, { useState, useEffect } from "react";
import { FlattenedToken } from "@/types/tokens";
import { useTokenStore } from "@/store/useTokenStore";
import {
  X,
  Save,
  Check,
} from "lucide-react";
import { safeParseObject } from "@/components/TokenValueFormatter";
import { evaluateTokenMath } from "@/utils/transformTokens";
import { TokenAliasInput } from "@/components/TokenAliasInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const { renameToken } = useTokenStore();
  const [tokenName, setTokenName] = useState("");
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
    setTokenName(token.name);
    setDescription(token.description || "");
    setRawValue(token.rawValue);

    if (token.type === "typography") {
      const parsed = safeParseObject(token.rawValue) || {};
      const getScalar = (v: any): string => {
        if (!v && v !== 0) return "";
        while (typeof v === "object" && v !== null && ("value" in v || "$value" in v)) {
          v = v.value !== undefined ? v.value : v.$value;
        }
        return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
      };

      setTypographyFields({
        fontFamily: getScalar(parsed.fontFamily),
        fontWeight: getScalar(parsed.fontWeight),
        fontSize: getScalar(parsed.fontSize),
        lineHeight: getScalar(parsed.lineHeight),
        letterSpacing: getScalar(parsed.letterSpacing),
        paragraphSpacing: getScalar(parsed.paragraphSpacing),
        textCase: getScalar(parsed.textCase || "none"),
        textDecoration: getScalar(parsed.textDecoration || "none"),
      });
    }
  }, [token]);

  if (!isOpen || !token) return null;

  const isTypography = token.type === "typography";

  const handleSave = () => {
    // 1. Rename token key if changed
    const cleanName = tokenName.trim();
    let currentPath = token.path;
    if (cleanName && cleanName !== token.name) {
      renameToken(token.setName, token.path, cleanName);
      currentPath = cleanName.split(".");
    }

    // 2. Update value/typography
    if (isTypography) {
      const obj: Record<string, any> = {};
      if (typographyFields.fontFamily) obj.fontFamily = typographyFields.fontFamily;
      if (typographyFields.fontWeight) obj.fontWeight = typographyFields.fontWeight;
      if (typographyFields.fontSize) obj.fontSize = typographyFields.fontSize;
      if (typographyFields.lineHeight) obj.lineHeight = typographyFields.lineHeight;
      if (typographyFields.letterSpacing) obj.letterSpacing = typographyFields.letterSpacing;
      if (typographyFields.paragraphSpacing) obj.paragraphSpacing = typographyFields.paragraphSpacing;
      if (typographyFields.textCase && typographyFields.textCase !== "none") obj.textCase = typographyFields.textCase;
      if (typographyFields.textDecoration && typographyFields.textDecoration !== "none") obj.textDecoration = typographyFields.textDecoration;

      onSave(currentPath, obj);
    } else {
      onSave(currentPath, rawValue);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const previewFamily = typographyFields.fontFamily.replace(/[{}]/g, "") || "Inter";
  const previewSize = evaluateTokenMath(typographyFields.fontSize || "16px");
  const previewLineHeight = evaluateTokenMath(typographyFields.lineHeight || "normal");
  const previewWeight = typographyFields.fontWeight || "normal";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-Over Drawer Container */}
      <div className="relative w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200 text-foreground font-sans">
        {/* Drawer Header */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-muted/40 flex-shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold truncate">
                Edit Token
              </span>
              <Badge variant="violet" className="text-[10px] font-mono uppercase">
                {token.type}
              </Badge>
            </div>
            <div className="text-xs font-mono text-muted-foreground truncate mt-0.5">
              {token.name}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Drawer Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Live Preview Specimen Box */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Live Preview</span>
              <span className="font-mono text-[10px] text-muted-foreground">{token.setName}</span>
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
                  className="text-foreground font-medium truncate py-1 leading-tight"
                >
                  The quick brown fox jumps
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {previewFamily} • {previewWeight} • {previewSize} / {previewLineHeight}
                </div>
              </div>
            ) : token.type === "color" ? (
              <div className="flex items-center gap-3 pt-1">
                <div
                  className="w-10 h-10 rounded-lg border border-border shadow-inner"
                  style={{ backgroundColor: rawValue }}
                />
                <div>
                  <div className="font-mono font-bold text-sm text-foreground">
                    {rawValue}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Solid Color Swatch</div>
                </div>
              </div>
            ) : (
              <div className="font-mono text-foreground py-1">
                {rawValue}
              </div>
            )}
          </div>

          {/* Token Name Field */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Token Name</Label>
            <Input
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="e.g. primary.500"
              className="h-8 text-xs font-mono font-medium"
            />
            <p className="text-[10px] text-muted-foreground">
              Rename this token key. Path dot notation (e.g. <span className="font-mono">color.brand.primary</span>) is supported.
            </p>
          </div>

          {/* Form Fields: Typography Composite Fields */}
          {isTypography ? (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label>Font Family</Label>
                <TokenAliasInput
                  value={typographyFields.fontFamily}
                  onChange={(val) =>
                    setTypographyFields((p) => ({ ...p, fontFamily: val }))
                  }
                  categoryFilter={["fontFamilies", "font", "family"]}
                  placeholder="e.g. {font-families.primary} or 'Inter', sans-serif"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Font Weight</Label>
                  <TokenAliasInput
                    value={typographyFields.fontWeight}
                    onChange={(val) =>
                      setTypographyFields((p) => ({ ...p, fontWeight: val }))
                    }
                    categoryFilter={["fontWeights", "weight"]}
                    placeholder="e.g. 500 or {font-weights.medium}"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Font Size</Label>
                  <TokenAliasInput
                    value={typographyFields.fontSize}
                    onChange={(e) =>
                      setTypographyFields((p) => ({ ...p, fontSize: e }))
                    }
                    categoryFilter={["fontSizes", "fontSize", "size", "dimension"]}
                    placeholder="e.g. 32px or {font-sizes.32}"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Line Height</Label>
                  <TokenAliasInput
                    value={typographyFields.lineHeight}
                    onChange={(val) =>
                      setTypographyFields((p) => ({ ...p, lineHeight: val }))
                    }
                    categoryFilter={["lineHeights", "lineHeight", "dimension"]}
                    placeholder="e.g. 40px or roundTo(...)"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Letter Spacing</Label>
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
            <div className="space-y-1">
              <Label>Token Value</Label>
              <TokenAliasInput
                value={rawValue}
                onChange={(val) => setRawValue(val)}
                categoryFilter={token.type}
                excludeTokenId={token.id}
                excludeTokenName={token.name}
                placeholder="e.g. #3b82f6 or {colors.brand.500}"
              />
            </div>
          )}

          {/* Description field */}
          <div className="space-y-1">
            <Label>Description (Optional)</Label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about usage, design intent, or responsive behavior..."
              className="w-full text-xs p-2.5 rounded-md border border-input bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-sans"
            />
          </div>
        </div>

        {/* Drawer Footer Action Bar */}
        <div className="h-16 px-6 border-t border-border flex items-center justify-between bg-muted/40 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            className="gap-2"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
