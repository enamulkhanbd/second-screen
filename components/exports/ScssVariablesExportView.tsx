"use client";

import React, { useState, useMemo, useEffect } from "react";
import { FlattenedToken, ThemeGroup } from "@/types/tokens";
import {
  ScssExportConfig,
  GeneratedExportFile,
  ColorSpaceOption,
  CasingOption,
} from "@/types/exports";
import { generateScssExportFiles } from "@/utils/exportsCompiler";
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
import { X } from "lucide-react";

interface ScssVariablesExportViewProps {
  tokens: FlattenedToken[];
  themeGroups: ThemeGroup[];
  onConfigChange?: () => void;
  onFilesUpdated?: (files: GeneratedExportFile[], activeFile: GeneratedExportFile | null) => void;
  onDownloadFile: (file: GeneratedExportFile) => void;
  onDownloadAllZip: (files: GeneratedExportFile[]) => void;
  onActiveFileChange?: (file: GeneratedExportFile | null) => void;
  onGeneratedFilesChange?: (files: GeneratedExportFile[]) => void;
}

export const ScssVariablesExportView: React.FC<ScssVariablesExportViewProps> = ({
  tokens,
  themeGroups,
  onConfigChange,
  onFilesUpdated,
  onDownloadFile,
  onDownloadAllZip,
  onActiveFileChange,
  onGeneratedFilesChange,
}) => {
  const [exportName, setExportName] = useState<string>("New SCSS Variables");
  const [colorSpace, setColorSpace] = useState<ColorSpaceOption>("as-authored");

  // Naming
  const [hasPrefix, setHasPrefix] = useState<boolean>(true);
  const [prefixValue, setPrefixValue] = useState<string>("pds");
  const [casing, setCasing] = useState<CasingOption>("kebab");
  const [hasSeparator, setHasSeparator] = useState<boolean>(false);
  const [separatorValue, setSeparatorValue] = useState<string>("-");

  // Switches matching frame_135.jpg
  const [emitVariables, setEmitVariables] = useState<boolean>(true);
  const [isDefault, setIsDefault] = useState<boolean>(true);

  // Theme Groups
  const [selectedThemeGroup, setSelectedThemeGroup] = useState<string>("Mode");

  // Files
  const [outputStrategy, setOutputStrategy] = useState<"partials" | "single-file">("partials");
  const [baseFileName, setBaseFileName] = useState<string>("tokens");

  const currentConfig: ScssExportConfig = useMemo(
    () => ({
      colorSpace,
      prefix: hasPrefix ? prefixValue : "",
      casing,
      separator: hasSeparator ? separatorValue : "-",
      emitVariables,
      themeGroups: [],
      outputStrategy,
      baseFileName,
    }),
    [colorSpace, hasPrefix, prefixValue, casing, hasSeparator, separatorValue, emitVariables, outputStrategy, baseFileName]
  );

  const generatedFiles = useMemo(() => {
    return generateScssExportFiles(tokens, themeGroups, currentConfig);
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
      {/* COLUMN 1: SCSS Settings matching frame_135.jpg */}
      <aside className="w-80 border-r border-border/70 bg-card flex flex-col flex-shrink-0 h-full overflow-hidden">
        <div className="p-3 border-b border-border/60 flex items-center gap-2">
          <Input
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            placeholder="Export name"
            className="h-8 text-xs font-semibold bg-background"
          />
          <Badge variant="secondary" className="text-[11px] font-medium h-7 px-2 flex-shrink-0">
            SCSS Variables
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

          {/* Emit Variables Switch */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Emit Variables</span>
              <Switch checked={emitVariables} onCheckedChange={setEmitVariables} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Default</span>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mode">Mode</SelectItem>
                  <SelectItem value="Brand">Brand</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium">
                Add
              </Button>
            </div>
          </div>

          {/* Output Strategy */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="text-xs font-medium text-foreground">Output Strategy</Label>
            <Select value={outputStrategy} onValueChange={(v) => setOutputStrategy(v as any)}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partials">partials</SelectItem>
                <SelectItem value="single-file">single-file</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Base File Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Base File Name</Label>
            <Input
              value={baseFileName}
              onChange={(e) => setBaseFileName(e.target.value)}
              className="h-8 text-xs font-mono bg-background"
            />
          </div>
        </div>
      </aside>

      {/* COLUMN 2: Tree */}
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
