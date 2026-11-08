"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlattenedToken, TokenType } from "@/types/tokens";
import { useTokenStore } from "@/store/useTokenStore";
import { HelpCircle, Plus, Search, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { buildDeprecationNode } from "@/utils/tokenDeprecation";

interface EditTokenDrawerProps {
  token: FlattenedToken | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (path: string[], newValue: any) => void;
}

const TOKEN_TYPE_OPTIONS: Array<{ label: string; value: TokenType }> = [
  { label: "Asset", value: "asset" },
  { label: "Boolean", value: "boolean" },
  { label: "Border", value: "border" },
  { label: "Border Radius", value: "borderRadius" },
  { label: "Border Width", value: "borderWidth" },
  { label: "Color", value: "color" },
  { label: "Cubic Bezier", value: "cubicBezier" },
  { label: "Dimension", value: "dimension" },
  { label: "Duration", value: "duration" },
  { label: "Font Family", value: "fontFamily" },
  { label: "Font Size", value: "fontSize" },
  { label: "Font Weight", value: "fontWeight" },
  { label: "Letter Spacing", value: "letterSpacing" },
  { label: "Line Height", value: "lineHeight" },
  { label: "Number", value: "number" },
  { label: "Opacity", value: "opacity" },
  { label: "Shadow", value: "shadow" },
  { label: "Size", value: "size" },
  { label: "Space", value: "space" },
  { label: "Text", value: "text" },
  { label: "Text Case", value: "textCase" },
  { label: "Text Decoration", value: "textDecoration" },
  { label: "Typography", value: "typography" },
];

const TOKEN_FUNCTIONS = [
  { name: "color.mix", description: "Mix two colors with an optional amount." },
  { name: "color.darken", description: "Darken a color by a relative amount." },
  { name: "color.lighten", description: "Lighten a color by a relative amount." },
  { name: "adjust.hue", description: "Adjust a color's hue in degrees." },
  { name: "adjust.sat", description: "Adjust a color's saturation. Positive values increase saturation." },
  { name: "adjust.lightness", description: "Adjust a color's lightness. Positive values make it lighter." },
];

function parseTypography(raw: string) {
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") {
      return {
        fontFamily: String(obj.fontFamily || obj.fontFamilies || ""),
        fontSize: String(obj.fontSize || obj.fontSizes || ""),
        fontWeight: String(obj.fontWeight || obj.fontWeights || ""),
        lineHeight: String(obj.lineHeight || obj.lineHeights || ""),
        letterSpacing: String(obj.letterSpacing || ""),
        paragraphSpacing: String(obj.paragraphSpacing || ""),
        textCase: String(obj.textCase || ""),
        textDecoration: String(obj.textDecoration || ""),
      };
    }
  } catch {
    /* raw string */
  }
  return {
    fontFamily: "",
    fontSize: "",
    fontWeight: "",
    lineHeight: "",
    letterSpacing: "",
    paragraphSpacing: "",
    textCase: "",
    textDecoration: "",
  };
}

function normalizeStoredType(type?: string): TokenType {
  const map: Record<string, TokenType> = {
    fontFamilies: "fontFamily",
    fontWeights: "fontWeight",
    fontSizes: "fontSize",
    lineHeights: "lineHeight",
    boxShadow: "shadow",
    spacing: "space",
    sizing: "size",
  };
  if (type && map[type]) return map[type];
  if (TOKEN_TYPE_OPTIONS.some((o) => o.value === type)) return type as TokenType;
  return (type as TokenType) || "color";
}

export const EditTokenDrawer: React.FC<EditTokenDrawerProps> = ({
  token,
  isOpen,
  onClose,
  onSave,
}) => {
  const {
    rawTokens,
    resolvedTokens,
    renameToken,
    addNewToken,
    deleteToken,
    themeGroups,
    activeThemeGroupId,
    activeThemeOptionId,
    userActivities,
  } = useTokenStore();

  const [tokenName, setTokenName] = useState("");
  const [tokenType, setTokenType] = useState<TokenType>("color");
  const [value, setValue] = useState("");
  const [extraValues, setExtraValues] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [tokenSet, setTokenSet] = useState("");
  const [category, setCategory] = useState("");
  const [typographyMode, setTypographyMode] = useState<"structured" | "reference">("structured");
  const [typographyFields, setTypographyFields] = useState(parseTypography(""));
  const [picker, setPicker] = useState<"none" | "references" | "functions">("none");
  const [refSearch, setRefSearch] = useState("");
  const [deprecated, setDeprecated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deprecatedMessage, setDeprecatedMessage] = useState("");
  const [replacementToken, setReplacementToken] = useState("");
  const [deprecatedSeverity, setDeprecatedSeverity] = useState("warning");
  const [deprecatedRemoveAfter, setDeprecatedRemoveAfter] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const availableSets = useMemo(
    () => Object.keys(rawTokens).filter((k) => !k.startsWith("$")),
    [rawTokens]
  );

  const activeGroup = themeGroups.find((g) => g.id === activeThemeGroupId) || themeGroups[0];
  const activeOption =
    activeGroup?.options.find((o) => o.id === activeThemeOptionId) || activeGroup?.options[0];

  useEffect(() => {
    if (!token) return;
    setTokenName(token.name);
    setTokenType(normalizeStoredType(token.type));
    setValue(typeof token.rawValue === "string" ? token.rawValue : JSON.stringify(token.rawValue));
    setExtraValues([]);
    setDescription(token.description || "");
    setTokenSet(token.setName || availableSets[0] || "");
    setCategory(token.category || token.group || "");
    setTypographyFields(parseTypography(String(token.rawValue || "")));
    setTypographyMode(
      String(token.rawValue || "").trim().startsWith("{") && !String(token.rawValue || "").includes("fontFamily")
        ? "reference"
        : "structured"
    );
    setDeprecated(Boolean(token.deprecated));
    setShowAdvanced(Boolean(token.deprecated));
    setDeprecatedMessage(token.deprecatedMessage || "");
    setReplacementToken(token.deprecatedReplacement || "");
    setDeprecatedSeverity(token.deprecatedSeverity || "warning");
    setDeprecatedRemoveAfter(token.deprecatedRemoveAfter || "");
    setPicker("none");
  }, [token, availableSets]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPicker("none");
      }
    };
    if (picker !== "none") {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [picker]);

  const filteredReferences = useMemo(() => {
    if (!token) return [];
    const q = refSearch.toLowerCase();
    return resolvedTokens.filter((t) => {
      if (t.id === token.id) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        String(t.resolvedValue || "").toLowerCase().includes(q) ||
        String(t.type || "").toLowerCase().includes(q)
      );
    });
  }, [resolvedTokens, refSearch, token]);

  const historyItems = useMemo(() => {
    if (!token) return [];
    return userActivities.filter((a) => {
      const metaToken = String(a.metadata?.token || "");
      return metaToken === token.name || a.description?.includes(token.name);
    });
  }, [userActivities, token]);

  if (!isOpen || !token) return null;

  // Typing an alias like "{color.br" opens the reference search with that text, no extra click.
  const handleValueChange = (next: string) => {
    setValue(next);
    const trimmed = next.trim();
    if (trimmed.startsWith("{")) {
      setRefSearch(trimmed.replace(/^\{/, "").replace(/\}$/, ""));
      setPicker("references");
    } else if (picker === "references") {
      setPicker("none");
    }
  };

  const composeValue = () => {
    if (tokenType === "typography" && typographyMode === "structured") {
      return { ...typographyFields };
    }
    if ((tokenType === "fontFamily" || tokenType === "color") && extraValues.length > 0) {
      return [value, ...extraValues.filter(Boolean)];
    }
    return value;
  };

  const handleSave = () => {
    const cleanName = tokenName.trim();
    const pathWithoutSet = token.path[0] === token.setName ? token.path.slice(1) : token.path;
    let currentPath = token.path[0] === token.setName ? token.path : [token.setName, ...token.path];
    const parsedValue = composeValue();
    const payload = {
      value: parsedValue,
      type: tokenType,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      $deprecated: deprecated
        ? buildDeprecationNode({
            severity: deprecatedSeverity,
            message: deprecatedMessage,
            replacementToken,
            removeAfter: deprecatedRemoveAfter,
          })
        : undefined,
    };

    if (tokenSet && tokenSet !== token.setName) {
      addNewToken(tokenSet, cleanName.split("."), {
        value: parsedValue,
        type: tokenType,
        description: description.trim() || undefined,
      });
      deleteToken(token.setName, pathWithoutSet);
      onClose();
      return;
    }

    if (cleanName && cleanName !== token.name) {
      renameToken(token.setName, pathWithoutSet, cleanName);
      currentPath = [token.setName, ...cleanName.split(".")];
    }

    onSave(currentPath, payload);
    onClose();
  };

  const showStructuredTypography = tokenType === "typography" && typographyMode === "structured";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      />

      <div className="relative w-full max-w-[480px] bg-background border-l border-border shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200 text-foreground font-sans select-none">
        <div className="px-6 pt-5 pb-3 border-b border-border flex items-start justify-between bg-background flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">Edit Token</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Tabs defaultValue="token" className="flex-1 min-h-0 flex flex-col">
          <div className="px-6 pt-3">
            <TabsList className="h-8">
              <TabsTrigger value="token">Token</TabsTrigger>
              <TabsTrigger value="figma">Figma</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="token" className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 mt-0">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Token Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Token Type <span className="text-destructive">*</span>
              </Label>
              <Select value={tokenType} onValueChange={(val) => setTokenType(val as TokenType)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-72">
                  {TOKEN_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tokenType === "typography" && (
              <div className="flex justify-end">
                <div className="inline-flex p-0.5 rounded-lg bg-muted border border-border text-[11px]">
                  <button
                    type="button"
                    className={cn(
                      "px-2.5 py-1 rounded-md cursor-pointer",
                      typographyMode === "structured" && "bg-background shadow-2xs font-semibold"
                    )}
                    onClick={() => setTypographyMode("structured")}
                  >
                    Structured
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "px-2.5 py-1 rounded-md cursor-pointer",
                      typographyMode === "reference" && "bg-background shadow-2xs font-semibold"
                    )}
                    onClick={() => setTypographyMode("reference")}
                  >
                    Reference
                  </button>
                </div>
              </div>
            )}

            {showStructuredTypography ? (
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["fontFamily", "Font Family"],
                    ["fontSize", "Font Size"],
                    ["fontWeight", "Font Weight"],
                    ["lineHeight", "Line Height"],
                    ["letterSpacing", "Letter Spacing"],
                    ["paragraphSpacing", "Paragraph Spacing"],
                    ["textCase", "Text Case"],
                    ["textDecoration", "Text Decoration"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[11px]">{label}</Label>
                    <Input
                      value={typographyFields[key]}
                      onChange={(e) =>
                        setTypographyFields((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 relative" ref={popoverRef}>
                <Label className="text-xs font-semibold">
                  Value <span className="text-destructive">*</span>
                </Label>
                <div className="relative flex items-center">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5" />
                  <Input
                    value={value}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className="h-9 pl-8 pr-2 text-xs font-mono"
                    placeholder="{token.name} or a raw value"
                  />
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant={picker === "references" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => setPicker((p) => (p === "references" ? "none" : "references"))}
                  >
                    References
                  </Button>
                  <Button
                    type="button"
                    variant={picker === "functions" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => setPicker((p) => (p === "functions" ? "none" : "functions"))}
                  >
                    Functions
                  </Button>
                </div>

                {picker === "references" && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover text-popover-foreground border border-border/80 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="relative px-2.5 py-2 border-b border-border/60">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-5 top-1/2 -translate-y-1/2" />
                      <input
                        value={refSearch}
                        onChange={(e) => setRefSearch(e.target.value)}
                        placeholder="Search tokens..."
                        className="w-full pl-7 h-8 bg-background border border-border/80 rounded-lg text-xs font-mono outline-none focus:border-primary"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                      {filteredReferences.slice(0, 40).map((refToken) => (
                        <button
                          key={refToken.id}
                          type="button"
                          onClick={() => {
                            setValue(`{${refToken.name}}`);
                            setPicker("none");
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent cursor-pointer transition-colors"
                        >
                          <span className="font-mono truncate">{refToken.name}</span>
                          <span className="text-muted-foreground font-mono truncate ml-2 max-w-[40%]">
                            {refToken.resolvedValue}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {picker === "functions" && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover text-popover-foreground border border-border/80 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground border-b border-border/60">
                      Token functions
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                      {TOKEN_FUNCTIONS.map((fn) => (
                        <button
                          key={fn.name}
                          type="button"
                          onClick={() => {
                            setValue(`${fn.name}(${value || "$value"})`);
                            setPicker("none");
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="text-xs font-mono font-semibold">{fn.name}</div>
                          <div className="text-[11px] text-muted-foreground">{fn.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(tokenType === "color" || tokenType === "fontFamily") && (
                  <div className="space-y-2">
                    {extraValues.map((extra, idx) => (
                      <Input
                        key={idx}
                        value={extra}
                        onChange={(e) =>
                          setExtraValues((prev) => prev.map((item, i) => (i === idx ? e.target.value : item)))
                        }
                        className="h-8 text-xs font-mono"
                        placeholder="Additional value"
                      />
                    ))}
                    <button
                      type="button"
                      className="text-[11px] text-primary flex items-center gap-1 cursor-pointer"
                      onClick={() => setExtraValues((prev) => [...prev, ""])}
                    >
                      <Plus className="size-3" /> Add value
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this token."
                className="min-h-16 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Token Set <span className="text-destructive">*</span>
              </Label>
              <Select value={tokenSet} onValueChange={setTokenSet}>
                <SelectTrigger className="h-9 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-72">
                  {availableSets.map((setName) => (
                    <SelectItem key={setName} value={setName}>
                      {setName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-3">
              <button
                type="button"
                aria-expanded={showAdvanced}
                onClick={() => setShowAdvanced((open) => !open)}
                className="flex w-full items-center justify-between rounded-md py-1 text-xs font-semibold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span>Advanced</span>
                <ChevronDown
                  className={cn("size-4 text-muted-foreground transition-transform", showAdvanced && "rotate-180")}
                />
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 text-xs"
                placeholder="colors"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <Label className="text-xs font-semibold">Mark as deprecated</Label>
              <Switch checked={deprecated} onCheckedChange={setDeprecated} />
            </div>

            {deprecated && (
              <div className="space-y-3 rounded-xl border border-border p-3 bg-muted/20">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Severity</Label>
                  <Select value={deprecatedSeverity} onValueChange={setDeprecatedSeverity}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error (blocks build)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Deprecation Message (optional)</Label>
                  <Input
                    value={deprecatedMessage}
                    onChange={(e) => setDeprecatedMessage(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Explain why this token is deprecated."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Replacement Token (optional)</Label>
                  <Input
                    value={replacementToken}
                    onChange={(e) => setReplacementToken(e.target.value)}
                    className="h-8 text-xs font-mono"
                    placeholder="{color.brand.primary}"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Remove After (optional)</Label>
                  <Input
                    value={deprecatedRemoveAfter}
                    onChange={(e) => setDeprecatedRemoveAfter(e.target.value)}
                    className="h-8 text-xs font-mono"
                    placeholder="2026-10-01 or v2.0.11"
                  />
                </div>
              </div>
            )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="figma" className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 mt-0">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Variable key</Label>
              <Input
                readOnly
                value={token.figmaVariableKey || activeOption?.figmaVariableReferences?.[token.name] || "—"}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Collection ID</Label>
              <Input
                readOnly
                value={activeOption?.figmaCollectionId || "—"}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mode ID</Label>
              <Input
                readOnly
                value={activeOption?.figmaModeId || "—"}
                className="h-9 text-xs font-mono"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Figma mapping is pulled from the active theme option. Sync variables to populate these fields.
            </p>
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 overflow-y-auto p-6 mt-0">
            {historyItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No history yet for this token. Edits you save in this workspace will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {historyItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <div className="text-xs font-semibold">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{item.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {item.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-muted/20">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Update Token
          </Button>
        </div>
      </div>
    </div>
  );
};
