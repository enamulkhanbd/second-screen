"use client";

import React, { useState, useMemo, useEffect } from "react";
import { FlattenedToken, ThemeGroup } from "@/types/tokens";
import {
  CssExportConfig,
  GeneratedExportFile,
  ColorSpaceOption,
  CasingOption,
  ThemeGroupSelectorConfig,
} from "@/types/exports";
import { generateCssExportFiles } from "@/utils/exportsCompiler";
import { ExportFilesTree } from "./ExportFilesTree";
import { ExportCodeEditor } from "./ExportCodeEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

interface CssVariablesExportViewProps {
  tokens: FlattenedToken[];
  themeGroups: ThemeGroup[];
  onConfigChange?: () => void;
  onFilesUpdated?: (files: GeneratedExportFile[], activeFile: GeneratedExportFile | null) => void;
  onDownloadFile: (file: GeneratedExportFile) => void;
  onDownloadAllZip: (files: GeneratedExportFile[]) => void;
  onActiveFileChange?: (file: GeneratedExportFile | null) => void;
  onGeneratedFilesChange?: (files: GeneratedExportFile[]) => void;
}

export const CssVariablesExportView: React.FC<CssVariablesExportViewProps> = ({
  tokens,
  themeGroups,
  onConfigChange,
  onFilesUpdated,
  onDownloadFile,
  onDownloadAllZip,
  onActiveFileChange,
  onGeneratedFilesChange,
}) => {
  // Settings state matching frame_020.jpg & frame_075.jpg
  const [exportName, setExportName] = useState<string>("New CSS Variables");
  const [colorSpace, setColorSpace] = useState<ColorSpaceOption>("as-authored");
  const [defaultStrategy, setDefaultStrategy] = useState<"data-attribute" | "class">("data-attribute");

  // Naming section
  const [hasPrefix, setHasPrefix] = useState<boolean>(false);
  const [prefixValue, setPrefixValue] = useState<string>("pds");
  const [casing, setCasing] = useState<CasingOption>("kebab");
  const [hasSeparator, setHasSeparator] = useState<boolean>(false);
  const [separatorValue, setSeparatorValue] = useState<string>("-");

  // Layers
  const [layerEnabled, setLayerEnabled] = useState<boolean>(false);
  const [layerName, setLayerName] = useState<string>("tokens");

  // Root Selector
  const [rootSelector, setRootSelector] = useState<string>(":root");

  // Switches
  const [minify, setMinify] = useState<boolean>(false);
  const [optimizeComputed, setOptimizeComputed] = useState<boolean>(false);
  const [sourceComments, setSourceComments] = useState<boolean>(false);
  const [assetBaseUrl, setAssetBaseUrl] = useState<string>("./");
  const [descriptionComments, setDescriptionComments] = useState<boolean>(false);
  const [deprecationComments, setDeprecationComments] = useState<boolean>(false);

  // Files
  const [fileLayout, setFileLayout] = useState<"split" | "single">("split");
  const [baseFileName, setBaseFileName] = useState<string>("base");

  // Theme Groups selector
  const [selectedThemeGroup, setSelectedThemeGroup] = useState<string>("");
  const [themeGroupConfigs, setThemeGroupConfigs] = useState<ThemeGroupSelectorConfig[]>(() =>
    themeGroups.map((tg) => ({
      groupId: tg.id,
      groupName: tg.name,
      enabled: true,
      strategy: defaultStrategy,
      attributeName: "data-theme",
      includeTokens: "all" as const,
    }))
  );

  const currentConfig: CssExportConfig = useMemo(
    () => ({
      colorSpace,
      prefix: hasPrefix ? prefixValue : "",
      casing,
      separator: hasSeparator ? separatorValue : "-",
      layerEnabled,
      layerName,
      rootSelector,
      minify,
      optimizeComputed,
      sourceComments,
      descriptionComments,
      deprecationComments,
      assetBaseUrl,
      themeGroups: themeGroupConfigs,
      fileLayout,
      baseFileName,
    }),
    [
      colorSpace,
      hasPrefix,
      prefixValue,
      casing,
      hasSeparator,
      separatorValue,
      layerEnabled,
      layerName,
      rootSelector,
      minify,
      optimizeComputed,
      sourceComments,
      descriptionComments,
      deprecationComments,
      assetBaseUrl,
      themeGroupConfigs,
      fileLayout,
      baseFileName,
    ]
  );

  const generatedFiles = useMemo(() => {
    return generateCssExportFiles(tokens, themeGroups, currentConfig);
  }, [tokens, themeGroups, currentConfig]);

  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return generatedFiles[0]?.id || "";
  });

  const activeFile = useMemo(() => {
    return generatedFiles.find((f) => f.id === activeFileId) || generatedFiles[0] || null;
  }, [generatedFiles, activeFileId]);

  useEffect(() => {
    onGeneratedFilesChange?.(generatedFiles);
    onFilesUpdated?.(generatedFiles, activeFile);
  }, [generatedFiles, onGeneratedFilesChange, onFilesUpdated, activeFile]);

  useEffect(() => {
    onActiveFileChange?.(activeFile);
  }, [activeFile, onActiveFileChange]);

  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onConfigChange?.();
  }, [currentConfig, onConfigChange]);

  return (
    <div className="flex-1 flex h-full overflow-hidden select-none bg-background">
      {/* COLUMN 1: Settings matching frame_020.jpg */}
      <aside className="w-80 border-r border-border/70 bg-card flex flex-col flex-shrink-0 h-full overflow-hidden">
        {/* Export Name input */}
        <div className="p-3 border-b border-border/60 flex items-center gap-2">
          <Input
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            placeholder="Export name"
            className="h-8 text-xs font-semibold bg-background"
          />
          <Badge variant="secondary" className="text-[11px] font-medium h-7 px-2 flex-shrink-0">
            CSS Variables
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Color Space */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Color Space</Label>
            <Select value={colorSpace} onValueChange={(v) => setColorSpace(v as ColorSpaceOption)}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="as-authored">as-authored</SelectItem>
                <SelectItem value="srgb">srgb</SelectItem>
                <SelectItem value="display-p3">display-p3</SelectItem>
                <SelectItem value="hex">hex</SelectItem>
                <SelectItem value="hsl">hsl</SelectItem>
                <SelectItem value="oklch">oklch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Default Strategy */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Default Strategy</Label>
            <Select value={defaultStrategy} onValueChange={(v) => setDefaultStrategy(v as any)}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data-attribute">data-attribute</SelectItem>
                <SelectItem value="class">class</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* NAMING Section */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              NAMING
            </span>

            {/* Prefix */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Prefix</span>
                {!hasPrefix ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHasPrefix(true)}
                    className="h-6 px-2 text-[11px] font-medium"
                  >
                    Add
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHasPrefix(false)}
                    className="w-5 h-5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {hasPrefix && (
                <Input
                  value={prefixValue}
                  onChange={(e) => setPrefixValue(e.target.value)}
                  className="h-8 text-xs font-mono bg-background"
                  placeholder="pds"
                />
              )}
            </div>

            {/* Casing */}
            <div className="space-y-1">
              <span className="text-xs text-foreground">Casing</span>
              <Select value={casing} onValueChange={(v) => setCasing(v as CasingOption)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kebab">kebab</SelectItem>
                  <SelectItem value="camel">camel</SelectItem>
                  <SelectItem value="snake">snake</SelectItem>
                  <SelectItem value="as-authored">as-authored</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Separator */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Separator</span>
                {!hasSeparator ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHasSeparator(true)}
                    className="h-6 px-2 text-[11px] font-medium"
                  >
                    Add
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHasSeparator(false)}
                    className="w-5 h-5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {hasSeparator && (
                <Input
                  value={separatorValue}
                  onChange={(e) => setSeparatorValue(e.target.value)}
                  className="h-8 text-xs font-mono bg-background text-center"
                  maxLength={2}
                />
              )}
            </div>
          </div>

          {/* LAYERS Section */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              LAYERS
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Enabled</span>
              <Switch checked={layerEnabled} onCheckedChange={setLayerEnabled} />
            </div>
          </div>

          {/* Root Selector */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-medium text-foreground">Root Selector</Label>
            <Input
              value={rootSelector}
              onChange={(e) => setRootSelector(e.target.value)}
              className="h-8 text-xs font-mono bg-background"
            />
          </div>

          {/* Switches */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Minify</span>
              <Switch checked={minify} onCheckedChange={setMinify} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Optimize Computed Values</span>
              <Switch checked={optimizeComputed} onCheckedChange={setOptimizeComputed} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Source Comments</span>
              <Switch checked={sourceComments} onCheckedChange={setSourceComments} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Asset Base Url</Label>
              <Input
                value={assetBaseUrl}
                onChange={(e) => setAssetBaseUrl(e.target.value)}
                className="h-8 text-xs font-mono bg-background"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Description Comments</span>
              <Switch checked={descriptionComments} onCheckedChange={setDescriptionComments} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Deprecation Comments</span>
              <Switch checked={deprecationComments} onCheckedChange={setDeprecationComments} />
            </div>
          </div>

          {/* THEME GROUPS */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              THEME GROUPS
            </span>
            <div className="flex items-center gap-2">
              <Select value={selectedThemeGroup} onValueChange={setSelectedThemeGroup}>
                <SelectTrigger className="h-8 text-xs bg-background flex-1">
                  <SelectValue placeholder="Select theme group..." />
                </SelectTrigger>
                <SelectContent>
                  {themeGroups.map((tg) => (
                    <SelectItem key={tg.id} value={tg.id}>
                      {tg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium">
                Add
              </Button>
            </div>
          </div>

          {/* FILES Section */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              FILES
            </span>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">File Layout</Label>
              <Select value={fileLayout} onValueChange={(v) => setFileLayout(v as any)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="split">split</SelectItem>
                  <SelectItem value="single">single</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Base File Name</Label>
              <Input
                value={baseFileName}
                onChange={(e) => setBaseFileName(e.target.value)}
                className="h-8 text-xs font-mono bg-background"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* COLUMN 2: Generated Files Tree matching user screenshot */}
      <div className="w-72 border-r border-border/70 flex flex-col h-full flex-shrink-0">
        <ExportFilesTree
          files={generatedFiles}
          activeFileId={activeFile?.id || ""}
          onSelectFile={setActiveFileId}
        />
      </div>

      {/* COLUMN 3: Code Editor */}
      <div className="flex-1 flex flex-col h-full p-4 overflow-hidden bg-background">
        <ExportCodeEditor
          file={activeFile}
          onDownloadFile={() => activeFile && onDownloadFile(activeFile)}
          onDownloadAllZip={() => onDownloadAllZip(generatedFiles)}
        />
      </div>
    </div>
  );
};
