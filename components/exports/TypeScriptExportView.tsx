"use client";

import React, { useState, useMemo, useEffect } from "react";
import { FlattenedToken, ThemeGroup } from "@/types/tokens";
import {
  TypeScriptExportConfig,
  GeneratedExportFile,
  ColorSpaceOption,
} from "@/types/exports";
import { generateTypeScriptExportFiles } from "@/utils/exportsCompiler";
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
import { ChevronRight, ChevronDown } from "lucide-react";

interface TypeScriptExportViewProps {
  tokens: FlattenedToken[];
  themeGroups: ThemeGroup[];
  projectName?: string;
  onConfigChange?: () => void;
  onFilesUpdated?: (files: GeneratedExportFile[], activeFile: GeneratedExportFile | null) => void;
  onDownloadFile: (file: GeneratedExportFile) => void;
  onDownloadAllZip: (files: GeneratedExportFile[]) => void;
  onActiveFileChange?: (file: GeneratedExportFile | null) => void;
  onGeneratedFilesChange?: (files: GeneratedExportFile[]) => void;
}

export const TypeScriptExportView: React.FC<TypeScriptExportViewProps> = ({
  tokens,
  themeGroups,
  projectName = "tokens",
  onConfigChange,
  onFilesUpdated,
  onDownloadFile,
  onDownloadAllZip,
  onActiveFileChange,
  onGeneratedFilesChange,
}) => {
  const [exportName, setExportName] = useState<string>("New TypeScript");
  const [colorSpace, setColorSpace] = useState<ColorSpaceOption>("hex");

  // Naming
  const [constCasing, setConstCasing] = useState<"camel" | "constant" | "pascal">("camel");
  const [keyCasing, setKeyCasing] = useState<"camel" | "kebab" | "snake" | "constant">("camel");

  // Shapes
  const [shapesMode, setShapesMode] = useState<string>("accessor");
  const [declarationsMode, setDeclarationsMode] = useState<string>("as-const");

  // Switches
  const [includeDescriptions, setIncludeDescriptions] = useState<boolean>(true);
  const [numericKeys, setNumericKeys] = useState<boolean>(true);
  const [moduleFormat, setModuleFormat] = useState<"dual" | "esm" | "cjs">("dual");
  const [emitDeclarations, setEmitDeclarations] = useState<boolean>(true);
  const [emitPackageJson, setEmitPackageJson] = useState<boolean>(true);

  // Files
  const [outputStrategy, setOutputStrategy] = useState<"per-type" | "single-file">("per-type");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  const [packageName, setPackageName] = useState<string>(`@org/${projectName.toLowerCase()}`);
  const [version, setVersion] = useState<string>("0.0.0");
  const [schemaVersion, setSchemaVersion] = useState<string>("1");

  const currentConfig: TypeScriptExportConfig = useMemo(
    () => ({
      colorSpace,
      constCasing,
      keyCasing,
      constShape: "value-map",
      typeShape: "literal-union",
      declarations: "as-const",
      includeDescriptions,
      numericKeys,
      moduleFormat,
      emitDeclarations,
      emitPackageJson,
      themeGroups: [],
      outputStrategy,
      metadata: {
        packageName,
        version,
        schemaVersion,
        commitSha: "",
        branch: "",
        repositoryUrl: "",
      },
    }),
    [colorSpace, constCasing, keyCasing, includeDescriptions, numericKeys, moduleFormat, emitDeclarations, emitPackageJson, outputStrategy, packageName, version, schemaVersion]
  );

  const generatedFiles = useMemo(() => {
    return generateTypeScriptExportFiles(tokens, themeGroups, currentConfig, projectName);
  }, [tokens, themeGroups, currentConfig, projectName]);

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
      {/* COLUMN 1: Settings matching frame_165.jpg */}
      <aside className="w-80 border-r border-border/70 bg-card flex flex-col flex-shrink-0 h-full overflow-hidden">
        <div className="p-3 border-b border-border/60 flex items-center gap-2">
          <Input
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            placeholder="Export name"
            className="h-8 text-xs font-semibold bg-background"
          />
          <Badge variant="secondary" className="text-[11px] font-medium h-7 px-2 flex-shrink-0">
            TypeScript
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
                <SelectItem value="hex">hex</SelectItem>
                <SelectItem value="srgb">srgb</SelectItem>
                <SelectItem value="display-p3">display-p3</SelectItem>
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

            <div className="space-y-1">
              <span className="text-xs text-foreground">Const Casing</span>
              <Select value={constCasing} onValueChange={(v) => setConstCasing(v as any)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="camel">camelCase</SelectItem>
                  <SelectItem value="constant">CONSTANT_CASE</SelectItem>
                  <SelectItem value="pascal">PascalCase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-foreground">Key Casing</span>
              <Select value={keyCasing} onValueChange={(v) => setKeyCasing(v as any)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="camel">as-authored</SelectItem>
                  <SelectItem value="kebab">kebab-case</SelectItem>
                  <SelectItem value="snake">snake_case</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Shapes Section */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Label className="text-xs font-medium text-foreground">Shapes</Label>
            <Select value={shapesMode} onValueChange={setShapesMode}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="1 option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accessor">Accessor</SelectItem>
                <SelectItem value="theme-object">Theme Object</SelectItem>
                <SelectItem value="flat-map">Flat Map</SelectItem>
              </SelectContent>
            </Select>

            <Select value={declarationsMode} onValueChange={setDeclarationsMode}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="as-const">as-const</SelectItem>
                <SelectItem value="record">Record</SelectItem>
                <SelectItem value="none">none</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Switches */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Include Descriptions</span>
              <Switch checked={includeDescriptions} onCheckedChange={setIncludeDescriptions} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Numeric Keys</span>
              <Switch checked={numericKeys} onCheckedChange={setNumericKeys} />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-foreground">Module Format</span>
              <Select value={moduleFormat} onValueChange={(v) => setModuleFormat(v as any)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dual">dual</SelectItem>
                  <SelectItem value="esm">esm</SelectItem>
                  <SelectItem value="cjs">cjs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Emit Declarations</span>
              <Switch checked={emitDeclarations} onCheckedChange={setEmitDeclarations} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">Emit Package Json</span>
              <Switch checked={emitPackageJson} onCheckedChange={setEmitPackageJson} />
            </div>
          </div>

          {/* THEME GROUPS */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              THEME GROUPS
            </span>
            <div className="flex items-center gap-2">
              <Select>
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
              <Label className="text-xs font-medium text-foreground">Output Strategy</Label>
              <Select value={outputStrategy} onValueChange={(v) => setOutputStrategy(v as any)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per-type">per-type</SelectItem>
                  <SelectItem value="single-file">single-file</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ADVANCED Collapsible */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground py-1"
            >
              {isAdvancedOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>ADVANCED</span>
            </button>
            {isAdvancedOpen && (
              <div className="space-y-2 pt-2 pl-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Package Name</Label>
                  <Input
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    className="h-7 text-xs font-mono bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Version</Label>
                  <Input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="h-7 text-xs font-mono bg-background"
                  />
                </div>
              </div>
            )}
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
