"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  X,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { TokenType } from "@/types/tokens";
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

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSetName?: string;
}

type RefTab = "references" | "functions";

export const AddTokenModal: React.FC<AddTokenModalProps> = ({
  isOpen,
  onClose,
  defaultSetName,
}) => {
  const { rawTokens, resolvedTokens, activeSet, addNewToken, addToast } = useTokenStore();

  const availableSets = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  }, [rawTokens]);

  const initialSet =
    defaultSetName && availableSets.includes(defaultSetName)
      ? defaultSetName
      : activeSet !== "ALL" && availableSets.includes(activeSet)
      ? activeSet
      : availableSets[0] || "foundation/seed-color";

  const [tokenName, setTokenName] = useState("");
  const [tokenType, setTokenType] = useState<TokenType>("color");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [tokenSet, setTokenSet] = useState(initialSet);
  const [category, setCategory] = useState("colors");

  // References / Functions popover state
  const [isRefPopoverOpen, setIsRefPopoverOpen] = useState(false);
  const [refTab, setRefTab] = useState<RefTab>("references");
  const [refSearch, setRefSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTokenName("");
      setTokenType("color");
      setValue("#ffffff");
      setDescription("");
      setTokenSet(initialSet);
      setCategory("colors");
      setIsRefPopoverOpen(false);
    }
  }, [isOpen, initialSet]);

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

  if (!isOpen) return null;

  const filteredReferences = resolvedTokens.filter((t) => {
    if (!refSearch.trim()) return true;
    const q = refSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      String(t.resolvedValue || "").toLowerCase().includes(q) ||
      String(t.type || "").toLowerCase().includes(q)
    );
  });

  const functionOptions = [
    {
      name: "ts_lighten_lch",
      signature: "ts_lighten_lch({token}, 0.2)",
      description: "Lighten color in perceptual LCH space",
    },
    {
      name: "ts_darken_lch",
      signature: "ts_darken_lch({token}, 0.2)",
      description: "Darken color in perceptual LCH space",
    },
    {
      name: "ts_alpha",
      signature: "ts_alpha({token}, 0.5)",
      description: "Apply alpha transparency",
    },
    {
      name: "roundTo",
      signature: "roundTo({dimension}, 4)",
      description: "Round dimension to nearest grid multiple",
    },
  ];

  const handleInsertReference = (refName: string) => {
    setValue(`{${refName}}`);
    setIsRefPopoverOpen(false);
  };

  const handleInsertFunction = (signature: string) => {
    setValue(signature);
    setIsRefPopoverOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRaw = tokenName.replace(/[{}]/g, "").trim();
    if (!cleanRaw) return;

    const pathSegments = cleanRaw.replace(/^[\.\/]+|[\.\/]+$/g, "").split(/[\.\/]+/);

    let parsedValue: any = value;
    if (value.startsWith("{") && value.endsWith("}") && !value.includes(" ")) {
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

    addNewToken(tokenSet, pathSegments, {
      value: parsedValue,
      type: tokenType,
      description: description.trim() || undefined,
    });

    addToast({
      type: "success",
      title: "Token Created",
      message: `Created token "${cleanRaw}" in set "${tokenSet}".`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      />

      {/* Slide-Over Drawer Container */}
      <div className="relative w-full max-w-[480px] bg-background border-l border-border shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200 text-foreground font-sans select-none">
        {/* Drawer Header */}
        <div className="h-14 px-6 border-b border-border flex items-center justify-between bg-background flex-shrink-0">
          <span className="text-sm font-bold text-foreground">Create Token</span>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-sans">
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
              placeholder="e.g. border.lg or colors.primary"
              required
              autoFocus
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

          {/* Value * (with Help ? and References Popover) */}
          <div className="space-y-1.5 relative" ref={popoverRef}>
            <Label className="text-xs font-semibold text-foreground">
              Value <span className="text-destructive">*</span>
            </Label>

            <div className="relative flex items-center">
              <div
                className="absolute left-2.5 text-muted-foreground hover:text-foreground cursor-help"
                title="Use {token.name} for alias references or formulas like ts_lighten_lch({token}, 0.2)"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </div>

              <Input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9 pl-8 pr-8 text-xs font-mono bg-background border-border text-foreground"
                placeholder="e.g. #3b82f6 or {base.50}"
                required
              />

              <button
                type="button"
                onClick={() => setIsRefPopoverOpen((prev) => !prev)}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                title="Choose Reference or Function"
              >
                {isRefPopoverOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* References Popover */}
            {isRefPopoverOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 border-b border-border flex items-center bg-muted/30">
                  <div className="grid grid-cols-2 w-full bg-muted/60 p-0.5 rounded-lg border border-border/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setRefTab("references")}
                      className={`py-1 text-center rounded-md font-medium transition-all cursor-pointer ${
                        refTab === "references"
                          ? "bg-background text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      References
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefTab("functions")}
                      className={`py-1 text-center rounded-md font-medium transition-all cursor-pointer ${
                        refTab === "functions"
                          ? "bg-background text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Functions
                    </button>
                  </div>
                </div>

                {refTab === "references" ? (
                  <div>
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

                    <div className="max-h-56 overflow-y-auto p-1 divide-y divide-border/30">
                      {filteredReferences.slice(0, 30).map((refToken) => {
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
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto p-1 divide-y divide-border/30">
                    {functionOptions.map((fn) => (
                      <button
                        key={fn.name}
                        type="button"
                        onClick={() => handleInsertFunction(fn.signature)}
                        className="w-full flex flex-col px-3 py-2 rounded-md hover:bg-muted/70 text-left transition-colors cursor-pointer group"
                      >
                        <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary">
                          {fn.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {fn.description}
                        </span>
                        <span className="text-[10px] font-mono text-primary/70 mt-1">
                          {fn.signature}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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

          {/* Hidden submit trigger */}
          <button type="submit" className="hidden" />
        </form>

        {/* Fixed Bottom Action Bar */}
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
            onClick={handleSubmit}
            className="h-8 px-4 text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white cursor-pointer shadow-2xs"
          >
            Create Token
          </Button>
        </div>
      </div>
    </div>
  );
};
