"use client";

import React, { useState, useCallback } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ExportViewType, GeneratedExportFile } from "@/types/exports";
import { ExportsHub } from "./exports/ExportsHub";
import { CssVariablesExportView } from "./exports/CssVariablesExportView";
import { ScssVariablesExportView } from "./exports/ScssVariablesExportView";
import { TypeScriptExportView } from "./exports/TypeScriptExportView";
import { JsonExportView } from "./exports/JsonExportView";
import { FigmaVariablesExportView } from "./exports/FigmaVariablesExportView";
import { Button } from "@/components/ui/button";
import {
  Download,
  Package,
  ChevronRight,
  Sparkles,
  Save,
  Check,
  FileCode,
} from "lucide-react";
import JSZip from "jszip";

export const ExportsView: React.FC = () => {
  const {
    resolvedTokens,
    rawTokens,
    themeGroups,
    currentProject,
    addToast,
  } = useTokenStore();

  const [activeView, setActiveView] = useState<ExportViewType>("hub");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Active files tracked for header counters & bulk actions
  const [currentFiles, setCurrentFiles] = useState<GeneratedExportFile[]>([]);
  const [currentActiveFile, setCurrentActiveFile] = useState<GeneratedExportFile | null>(null);

  const handleFilesUpdated = useCallback((files: GeneratedExportFile[], active: GeneratedExportFile | null) => {
    setCurrentFiles(files);
    setCurrentActiveFile(active);
  }, []);

  const handleConfigChange = useCallback(() => {
    setIsUpdating(true);
    setIsSaved(false);
    const timer = setTimeout(() => {
      setIsUpdating(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveExport = () => {
    setIsSaved(true);
    addToast({
      type: "success",
      title: "Export Configuration Saved",
      message: "Your export presets have been updated.",
    });
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleDownloadFile = (file: GeneratedExportFile) => {
    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast({
      type: "success",
      title: "File Downloaded",
      message: `${file.name} saved successfully.`,
    });
  };

  const handleDownloadAllZip = async (files: GeneratedExportFile[], zipName: string) => {
    try {
      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(file.path, file.content);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${zipName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({
        type: "success",
        title: "ZIP Package Downloaded",
        message: `${zipName}.zip containing ${files.length} files created.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "ZIP Generation Failed",
        message: err?.message || "Could not pack files into ZIP.",
      });
    }
  };

  const getViewTitle = () => {
    switch (activeView) {
      case "css":
        return "CSS Variables";
      case "scss":
        return "SCSS Variables";
      case "typescript":
        return "TypeScript";
      case "raw-json":
        return "Raw JSON";
      case "dtcg-json":
        return "DTCG JSON";
      case "figma-variables":
        return "Figma Variables";
      default:
        return "Exports";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* Top Header Bar with Breadcrumb Navigation */}
      <header className="h-14 border-b border-border/70 px-6 flex items-center justify-between bg-card flex-shrink-0 z-10">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-muted-foreground">
            {currentProject?.name || "tokens"}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />

          {activeView === "hub" ? (
            <span className="font-bold text-foreground">Exports</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveView("hub")}
                className="font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Exports
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="font-bold text-foreground">{getViewTitle()}</span>
            </>
          )}
        </div>

        {/* Action Controls for Sub-views */}
        {activeView !== "hub" && (
          <div className="flex items-center gap-2">
            {/* Realtime updating indicator */}
            {isUpdating && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono mr-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Updating...
              </span>
            )}

            {/* File count indicator matching frame_020.jpg */}
            {currentFiles.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mr-1 font-mono">
                <span className="flex items-center gap-1 text-foreground/80 font-medium">
                  <FileCode className="w-3.5 h-3.5" />
                  {currentFiles.length}
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-muted-foreground">0</span>
              </div>
            )}

            {/* Save Export Preset */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveExport}
              className="h-8 text-xs font-semibold gap-1.5 border-border/70"
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Export</span>
                </>
              )}
            </Button>

            {/* Download All (ZIP) */}
            <Button
              size="sm"
              onClick={() => {
                const nameMap: Record<ExportViewType, string> = {
                  hub: "exports",
                  css: "css-variables",
                  scss: "scss-variables",
                  typescript: "typescript-tokens",
                  "raw-json": "raw-tokens",
                  "dtcg-json": "dtcg-tokens",
                  "figma-variables": "figma-variables",
                };
                if (currentFiles.length > 0) {
                  handleDownloadAllZip(currentFiles, nameMap[activeView] || "tokens-export");
                }
              }}
              className="h-8 text-xs font-bold gap-1.5 shadow-sm"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Download All</span>
            </Button>
          </div>
        )}
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === "hub" && (
          <ExportsHub onSelectExport={(type) => setActiveView(type)} />
        )}

        {activeView === "css" && (
          <CssVariablesExportView
            tokens={resolvedTokens}
            themeGroups={themeGroups}
            onConfigChange={handleConfigChange}
            onFilesUpdated={handleFilesUpdated}
            onDownloadFile={handleDownloadFile}
            onDownloadAllZip={(files) => handleDownloadAllZip(files, "css-variables")}
          />
        )}

        {activeView === "scss" && (
          <ScssVariablesExportView
            tokens={resolvedTokens}
            themeGroups={themeGroups}
            onConfigChange={handleConfigChange}
            onFilesUpdated={handleFilesUpdated}
            onDownloadFile={handleDownloadFile}
            onDownloadAllZip={(files) => handleDownloadAllZip(files, "scss-variables")}
          />
        )}

        {activeView === "typescript" && (
          <TypeScriptExportView
            tokens={resolvedTokens}
            themeGroups={themeGroups}
            projectName={currentProject?.name}
            onConfigChange={handleConfigChange}
            onFilesUpdated={handleFilesUpdated}
            onDownloadFile={handleDownloadFile}
            onDownloadAllZip={(files) => handleDownloadAllZip(files, "typescript-tokens")}
          />
        )}

        {activeView === "raw-json" && (
          <JsonExportView
            format="raw"
            rawTokens={rawTokens}
            onFilesUpdated={handleFilesUpdated}
            onDownloadFile={handleDownloadFile}
            onDownloadAllZip={(files) => handleDownloadAllZip(files, "raw-tokens")}
          />
        )}

        {activeView === "dtcg-json" && (
          <JsonExportView
            format="dtcg"
            rawTokens={rawTokens}
            onFilesUpdated={handleFilesUpdated}
            onDownloadFile={handleDownloadFile}
            onDownloadAllZip={(files) => handleDownloadAllZip(files, "dtcg-tokens")}
          />
        )}

        {activeView === "figma-variables" && (
          <FigmaVariablesExportView
            tokens={resolvedTokens}
            rawTokens={rawTokens}
            themeGroups={themeGroups}
            onFilesUpdated={handleFilesUpdated}
            onDownloadFile={handleDownloadFile}
            onDownloadAllZip={(files) => handleDownloadAllZip(files, "figma-variables")}
          />
        )}
      </div>
    </div>
  );
};
