"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { FlattenedToken, TokenType } from "@/types/tokens";
import { useTokenStore } from "@/store/useTokenStore";
import {
  X,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { safeParseObject } from "@/components/TokenValueFormatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { rawTokens, resolvedTokens, renameToken, addNewToken, deleteToken } = useTokenStore();

  // Form states
  const [tokenName, setTokenName] = useState("");
  const [tokenType, setTokenType] = useState<TokenType>("color");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [tokenSet, setTokenSet] = useState("");
  const [category, setCategory] = useState("");

  // Typography sub-fields
  const [typographyFields, setTypographyFields] = useState({
    fontFamily: "",
    fontWeight: "",
    fontSize: "",
    lineHeight: "",
    letterSpacing: "",
  });

  // References popover state
  const [isRefPopoverOpen, setIsRefPopoverOpen] = useState(false);
  const [refSearch, setRefSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const availableSets = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  }, [rawTokens]);

  // Sync state on token change
  useEffect(() => {
    if (!token) return;
    setTokenName(token.name);
    setTokenType(token.type || "color");

    const parsedObj = safeParseObject(token.rawValue);
    if (parsedObj && (token.type === "typography" || ("fontFamily" in parsedObj || "fontSize" in parsedObj))) {
      setTypographyFields({
        fontFamily: String(parsedObj.fontFamily || ""),
        fontWeight: String(parsedObj.fontWeight || ""),
        fontSize: String(parsedObj.fontSize || ""),
        lineHeight: String(parsedObj.lineHeight || ""),
        letterSpacing: String(parsedObj.letterSpacing || ""),
      });
      setValue(JSON.stringify(parsedObj));
    } else {
      setValue(
        typeof token.rawValue === "object"
          ? JSON.stringify(token.rawValue)
          : String(token.rawValue || "")
      );
      setTypographyFields({
        fontFamily: "",
        fontWeight: "",
        fontSize: "",
        lineHeight: "",
        letterSpacing: "",
      });
    }

    setDescription(token.description || "");
    setTokenSet(token.setName || availableSets[0] || "");
    setCategory(token.group || "");
    setIsRefPopoverOpen(false);
  }, [token, availableSets]);

  // Close popover when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsRefPopoverOpen(false);
      }
    };
    if (isRefPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isRefPopoverOpen]);

  if (!isOpen || !token) return null;

  // Filter available reference tokens
  const filteredReferences = resolvedTokens.filter((t) => {
    if (t.id === token.id) return false; // don't reference self
    if (!refSearch.trim()) return true;
    const q = refSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      String(t.resolvedValue || "").toLowerCase().includes(q) ||
      String(t.type || "").toLowerCase().includes(q)
    );
  });

  const handleInsertReference = (refName: string) => {
    setValue(`{${refName}}`);
    setIsRefPopoverOpen(false);
  };

  const handleSave = () => {
    const cleanName = tokenName.trim();
    let currentPath = token.path;

    // 1. If set changed, move token
    if (tokenSet && tokenSet !== token.setName) {
      addNewToken(tokenSet, cleanName.split("."), {
        value,
        type: tokenType,
        description: description.trim() || undefined,
      });
      deleteToken(token.setName, token.path);
      onClose();
      return;
    }

    // 2. If name changed, rename
    if (cleanName && cleanName !== token.name) {
      renameToken(token.setName, token.path, cleanName);
      currentPath = cleanName.split(".");
    }

    // 3. Update value & metadata
    let parsedValue: any = value;
    if (tokenType === "typography" && typographyFields.fontFamily) {
      parsedValue = { ...typographyFields };
    } else if (value.startsWith("{") && value.endsWith("}") && !value.includes(" ")) {
      parsedValue = value;
    } else {
      try {
        if (value.startsWith("{") || value.startsWith("[")) {
          parsedValue = JSON.parse(value);
        }
      } catch {
        parsedValue = value;
      }
    }

    onSave(currentPath, {
      value: parsedValue,
      type: tokenType,
      description: description.trim() || undefined,
    });
  };

  const isCompositeTypography =
    tokenType === "typography" &&
    !value.startsWith("{") &&
    (typographyFields.fontFamily || typographyFields.fontSize || typographyFields.fontWeight);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      />

      {/* Slide-Over Drawer Container (Matching Video Frame 017) */}
      <div className="relative w-full max-w-[480px] bg-background border-l border-border shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200 text-foreground font-sans select-none">
        {/* Drawer Header */}
        <div className="h-14 px-6 border-b border-border flex items-center justify-between bg-background flex-shrink-0">
          <span className="text-sm font-bold text-foreground">Edit Token</span>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-sans">
          {/* Token Name * */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Token Name <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="h-9 text-xs font-mono bg-background border-border"
              placeholder="e.g. border.lg"
            />
          </div>

          {/* Token Type * */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Token Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={tokenType}
              onValueChange={(val) => setTokenType(val as TokenType)}
            >
              <SelectTrigger className="h-9 text-xs bg-background border-border capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="color">Color</SelectItem>
                <SelectItem value="dimension">Dimension</SelectItem>
                <SelectItem value="spacing">Spacing</SelectItem>
                <SelectItem value="borderRadius">Border Radius</SelectItem>
                <SelectItem value="borderWidth">Border Width</SelectItem>
                <SelectItem value="typography">Typography</SelectItem>
                <SelectItem value="boxShadow">Box Shadow</SelectItem>
                <SelectItem value="opacity">Opacity</SelectItem>
                <SelectItem value="fontFamilies">Font Families</SelectItem>
                <SelectItem value="fontWeights">Font Weights</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Value * (with Help ? on left and References Popover Picker on right) */}
          <div className="space-y-1.5 relative" ref={popoverRef}>
            <Label className="text-xs font-semibold text-foreground">
              Value <span className="text-destructive">*</span>
            </Label>

            <div className="relative flex items-center">
              {/* Left Help Icon */}
              <div
                className="absolute left-2.5 text-muted-foreground hover:text-foreground cursor-help"
                title="Use {token.name} for alias references"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </div>

              {/* Value Input */}
              <Input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9 pl-8 pr-8 text-xs font-mono bg-background border-border text-foreground"
                placeholder="e.g. {unites.x4} or #ffffff"
              />

              {/* Popover Toggle Button */}
              <button
                type="button"
                onClick={() => setIsRefPopoverOpen((prev) => !prev)}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                title="Choose Token Reference"
              >
                {isRefPopoverOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* References Dropdown Popover */}
            {isRefPopoverOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Search in Popover */}
                <div className="relative px-3 py-2 border-b border-border">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={refSearch}
                    onChange={(e) => setRefSearch(e.target.value)}
                    placeholder="Search references..."
                    className="w-full pl-7 pr-7 h-8 bg-muted/40 border border-border rounded-md text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                  />
                  {refSearch && (
                    <button
                      onClick={() => setRefSearch("")}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Reference Items List */}
                <div className="max-h-56 overflow-y-auto p-1 divide-y divide-border/30">
                  {filteredReferences.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No matching tokens found
                    </div>
                  ) : (
                    filteredReferences.slice(0, 30).map((refToken) => {
                      const isColor =
                        refToken.type === "color" ||
                        /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(
                          String(refToken.resolvedValue || "")
                        );
                      return (
                        <button
                          key={refToken.id}
                          type="button"
                          onClick={() => handleInsertReference(refToken.name)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/70 text-left transition-colors cursor-pointer group"
                        >
                          <span className="font-mono text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            {refToken.name}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-[10px] text-muted-foreground font-sans">
                              {refToken.type}
                            </span>
                            {isColor && (
                              <div
                                className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                                style={{
                                  backgroundColor:
                                    refToken.resolvedHex || refToken.resolvedValue,
                                }}
                              />
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {typeof refToken.resolvedValue === "string"
                                ? refToken.resolvedValue
                                : ""}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Typography composite fields */}
          {tokenType === "typography" && (
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="text-xs font-semibold text-foreground">Typography Properties</div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Font Family</Label>
                  <Input
                    type="text"
                    value={typographyFields.fontFamily}
                    onChange={(e) =>
                      setTypographyFields((p) => ({ ...p, fontFamily: e.target.value }))
                    }
                    className="h-8 text-xs bg-background"
                    placeholder="e.g. Inter"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Font Weight</Label>
                  <Input
                    type="text"
                    value={typographyFields.fontWeight}
                    onChange={(e) =>
                      setTypographyFields((p) => ({ ...p, fontWeight: e.target.value }))
                    }
                    className="h-8 text-xs bg-background"
                    placeholder="e.g. 500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Font Size</Label>
                  <Input
                    type="text"
                    value={typographyFields.fontSize}
                    onChange={(e) =>
                      setTypographyFields((p) => ({ ...p, fontSize: e.target.value }))
                    }
                    className="h-8 text-xs bg-background"
                    placeholder="e.g. 16px"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Line Height</Label>
                  <Input
                    type="text"
                    value={typographyFields.lineHeight}
                    onChange={(e) =>
                      setTypographyFields((p) => ({ ...p, lineHeight: e.target.value }))
                    }
                    className="h-8 text-xs bg-background"
                    placeholder="e.g. 24px"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Letter Spacing</Label>
                <Input
                  type="text"
                  value={typographyFields.letterSpacing}
                  onChange={(e) =>
                    setTypographyFields((p) => ({ ...p, letterSpacing: e.target.value }))
                  }
                  className="h-8 text-xs bg-background"
                  placeholder="e.g. -0.02em"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Description
            </Label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about usage, design intent, or responsive behavior..."
              className="w-full text-xs p-3 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-sans"
            />
          </div>

          {/* Token Set * */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Token Set <span className="text-destructive">*</span>
            </Label>
            <Select value={tokenSet} onValueChange={setTokenSet}>
              <SelectTrigger className="h-9 text-xs font-mono bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs font-mono">
                {availableSets.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Category
            </Label>
            <Input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 text-xs bg-background border-border"
              placeholder="e.g. colors, spacing, typography"
            />
          </div>
        </div>

        {/* Fixed Bottom Action Bar (Matching Frame 017) */}
        <div className="h-16 px-6 border-t border-border flex items-center justify-end gap-3 bg-background flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            className="h-8 px-4 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-2xs"
          >
            Update Token
          </Button>
        </div>
      </div>
    </div>
  );
};
