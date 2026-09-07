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
  Check,
  Sparkles,
  Layers,
  History as HistoryIcon,
  Figma,
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

type DrawerTab = "token" | "figma" | "history";
type RefTab = "references" | "functions";

export const EditTokenDrawer: React.FC<EditTokenDrawerProps> = ({
  token,
  isOpen,
  onClose,
  onSave,
}) => {
  const { rawTokens, resolvedTokens, renameToken, activeSet, addNewToken, deleteToken } = useTokenStore();
  const [activeTab, setActiveTab] = useState<DrawerTab>("token");

  // Form states
  const [tokenName, setTokenName] = useState("");
  const [tokenType, setTokenType] = useState<TokenType>("color");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [tokenSet, setTokenSet] = useState("");
  const [category, setCategory] = useState("");
  const [isDeprecated, setIsDeprecated] = useState(false);

  // References / Functions popover state
  const [isRefPopoverOpen, setIsRefPopoverOpen] = useState(false);
  const [refTab, setRefTab] = useState<RefTab>("references");
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
    setValue(
      typeof token.rawValue === "object"
        ? JSON.stringify(token.rawValue)
        : String(token.rawValue || "")
    );
    setDescription(token.description || "");
    setTokenSet(token.setName || availableSets[0] || "");
    setCategory(token.group || "");
    setIsDeprecated(Boolean((token as any).isDeprecated));
    setActiveTab("token");
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

    onSave(currentPath, {
      value: parsedValue,
      type: tokenType,
      description: description.trim() || undefined,
      isDeprecated,
    });
  };

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

        {/* Tab Navigation: Token | Figma | History */}
        <div className="px-6 border-b border-border flex items-center gap-6 bg-background flex-shrink-0 text-xs">
          <button
            onClick={() => setActiveTab("token")}
            className={`py-3 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === "token"
                ? "border-[#6366f1] text-[#6366f1] font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Token
          </button>
          <button
            onClick={() => setActiveTab("figma")}
            className={`py-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "figma"
                ? "border-[#6366f1] text-[#6366f1] font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Figma</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "history"
                ? "border-[#6366f1] text-[#6366f1] font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>History</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-sans">
          {activeTab === "token" && (
            <>
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

              {/* Value * (with Help ? on left and Popover Picker on right) */}
              <div className="space-y-1.5 relative" ref={popoverRef}>
                <Label className="text-xs font-semibold text-foreground">
                  Value <span className="text-destructive">*</span>
                </Label>

                <div className="relative flex items-center">
                  {/* Left Help Icon */}
                  <div className="absolute left-2.5 text-muted-foreground hover:text-foreground cursor-help" title="Use {token.name} for alias references or formulas like ts_lighten_lch({token}, 0.2)">
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
                    title="Choose Reference or Function"
                  >
                    {isRefPopoverOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* References / Functions Dropdown Popover (Matching Frame 020) */}
                {isRefPopoverOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Segmented Control [ References | Functions ] */}
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

                    {/* Content: References */}
                    {refTab === "references" ? (
                      <div>
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
                      /* Content: Functions */
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

              {/* Mark as deprecated */}
              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deprecated"
                  checked={isDeprecated}
                  onChange={(e) => setIsDeprecated(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-muted-foreground/40 text-[#6366f1] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#6366f1]"
                />
                <label
                  htmlFor="deprecated"
                  className="text-xs text-foreground cursor-pointer font-medium select-none"
                >
                  Mark as deprecated
                </label>
              </div>
            </>
          )}

          {activeTab === "figma" && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Figma className="w-4 h-4 text-purple-500" />
                <span>Figma Variables Binding</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect this token directly to a corresponding Figma Variable in your linked Figma Library.
              </p>
              <div className="space-y-2 pt-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Variable Path: </span>
                  <code className="font-mono text-foreground">{token.name}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Collection: </span>
                  <code className="font-mono text-foreground">{tokenSet}</code>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Change Timeline
              </div>
              <div className="border-l-2 border-border/80 pl-4 space-y-3 text-xs">
                <div>
                  <div className="font-medium text-foreground">Latest Value Saved</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Updated value to <code className="font-mono text-foreground">{value}</code>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Just now by active user
                  </div>
                </div>
                <div>
                  <div className="font-medium text-foreground">Token Created</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Initial token declaration in <code className="font-mono text-foreground">{token.setName}</code>
                  </div>
                </div>
              </div>
            </div>
          )}
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
            className="h-8 px-4 text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white cursor-pointer shadow-2xs"
          >
            Update Token
          </Button>
        </div>
      </div>
    </div>
  );
};
