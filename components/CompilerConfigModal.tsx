"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { CompilerConfig, DEFAULT_COMPILER_CONFIG } from "@/types/tokens";
import {
  Settings2,
  Check,
  RotateCcw,
  Sparkles,
  FileCode,
  Sliders,
  Copy,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface CompilerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompilerConfigModal: React.FC<CompilerConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { compilerConfig, updateCompilerConfig, addToast, releases, activeReleaseId } =
    useTokenStore();

  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [formData, setFormData] = useState<CompilerConfig>(compilerConfig);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const activeRelease =
    releases.find((r) => r.id === activeReleaseId) || releases[0];

  useEffect(() => {
    setFormData(compilerConfig);
    if (activeRelease?.styleDictionary?.configJson) {
      setJsonText(activeRelease.styleDictionary.configJson);
    }
  }, [compilerConfig, activeRelease, isOpen]);

  const handleSave = () => {
    if (activeTab === "json") {
      try {
        const parsed = JSON.parse(jsonText);
        updateCompilerConfig({
          ...formData,
          customConfigJson: JSON.stringify(parsed, null, 2),
        });
        setJsonError(null);
      } catch (err: any) {
        setJsonError("Invalid JSON syntax: " + err.message);
        return;
      }
    } else {
      updateCompilerConfig(formData);
    }

    addToast({
      type: "success",
      title: "Compiler Configuration Updated",
      message: "Generated code for all platforms updated in real-time.",
    });

    onClose();
  };

  const handleReset = () => {
    setFormData(DEFAULT_COMPILER_CONFIG);
    updateCompilerConfig(DEFAULT_COMPILER_CONFIG);
    addToast({
      type: "info",
      title: "Configuration Reset",
      message: "Restored default Style Dictionary compiler rules.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden font-sans">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Style Dictionary & Generator Configuration
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Customize token naming transforms, variable prefixes, units, and raw Style Dictionary <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">config.json</code>.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-border bg-card">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full"
          >
            <TabsList className="h-9 p-0 bg-transparent border-0 gap-4">
              <TabsTrigger
                value="visual"
                className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-semibold gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Visual Rules & Presets</span>
              </TabsTrigger>
              <TabsTrigger
                value="json"
                className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-semibold gap-1.5"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Raw config.json Editor</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === "visual" ? (
            <div className="space-y-4">
              {/* 1. Naming Conventions & Transforms */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold">Token Naming Transform Preset</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Specifies the casing transform applied across platform generators (<code className="font-mono text-[10px]">transforms: [name/*]</code>).
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    name/{formData.nameTransform}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Transform Group / Casing</Label>
                    <Select
                      value={formData.nameTransform}
                      onValueChange={(val: any) => setFormData({ ...formData, nameTransform: val })}
                    >
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kebab">name/kebab (color-brand-primary)</SelectItem>
                        <SelectItem value="camel">name/camel (colorBrandPrimary)</SelectItem>
                        <SelectItem value="snake">name/snake (color_brand_primary)</SelectItem>
                        <SelectItem value="pascal">name/pascal (ColorBrandPrimary)</SelectItem>
                        <SelectItem value="constant">name/constant (COLOR_BRAND_PRIMARY)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Variable Prefix / Namespace</Label>
                    <Input
                      type="text"
                      value={formData.prefix}
                      onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                      placeholder="e.g. ds or app (optional)"
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Result: --{formData.prefix ? `${formData.prefix}-` : ""}color-primary
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Units & Values */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <Label className="text-xs font-bold">Units & Dimension Transforms</Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Output Unit for Sizing / Spacing</Label>
                    <Select
                      value={formData.dimensionUnit}
                      onValueChange={(val: any) => setFormData({ ...formData, dimensionUnit: val })}
                    >
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">Pixels (px) — default</SelectItem>
                        <SelectItem value="rem">Relative REM (rem)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.dimensionUnit === "rem" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Root Font Base Size (px)</Label>
                      <Input
                        type="number"
                        value={formData.rootFontSize}
                        onChange={(e) =>
                          setFormData({ ...formData, rootFontSize: parseInt(e.target.value) || 16 })
                        }
                        className="h-8 text-xs font-mono"
                      />
                      <span className="text-[10px] text-muted-foreground font-mono">
                        16px = 1.0rem
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Mobile Class Naming */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <Label className="text-xs font-bold">Class & Struct Naming (Mobile Platforms)</Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Flutter Dart Class Name</Label>
                    <Input
                      type="text"
                      value={formData.flutterClassName}
                      onChange={(e) => setFormData({ ...formData, flutterClassName: e.target.value })}
                      placeholder="AppColors"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Swift iOS Struct Name</Label>
                    <Input
                      type="text"
                      value={formData.swiftStructName}
                      onChange={(e) => setFormData({ ...formData, swiftStructName: e.target.value })}
                      placeholder="DesignTokens"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Output References */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">Output References in CSS</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Outputs <code className="font-mono">var(--alias)</code> references instead of resolving raw values.
                  </p>
                </div>
                <Switch
                  checked={formData.outputReferences}
                  onCheckedChange={(c) => setFormData({ ...formData, outputReferences: c })}
                />
              </div>
            </div>
          ) : (
            /* RAW CONFIG.JSON EDITOR */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold font-mono">config.json (Style Dictionary v4)</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Full declarative build pipeline specification with <code className="font-mono text-[10px]">tokens-studio</code> preprocessors.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(jsonText);
                    addToast({
                      type: "success",
                      title: "Copied config.json",
                      message: "JSON content copied to clipboard.",
                    });
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </Button>
              </div>

              {jsonError && (
                <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono">
                  {jsonError}
                </div>
              )}

              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonError(null);
                }}
                className="w-full h-80 p-4 rounded-xl border border-border bg-muted/20 text-foreground font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring select-text"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs font-bold">
            <Check className="w-3.5 h-3.5" />
            <span>Apply Configuration</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
