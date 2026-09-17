"use client";

import React, { useState, useMemo, useEffect } from "react";
import { FlattenedToken, RawTokensDocument, ThemeGroup } from "@/types/tokens";
import { GeneratedExportFile, FigmaCreationOrderItem } from "@/types/exports";
import { generateFigmaVariablesExportFiles } from "@/utils/exportsCompiler";
import { ExportFilesTree } from "./ExportFilesTree";
import { ExportCodeEditor } from "./ExportCodeEditor";

interface FigmaVariablesExportViewProps {
  tokens?: FlattenedToken[];
  resolvedTokens?: FlattenedToken[];
  rawTokens?: RawTokensDocument;
  themeGroups: ThemeGroup[];
  onFilesUpdated?: (files: GeneratedExportFile[], activeFile: GeneratedExportFile | null) => void;
  onDownloadFile: (file: GeneratedExportFile) => void;
  onDownloadAllZip: (files: GeneratedExportFile[]) => void;
  onActiveFileChange?: (file: GeneratedExportFile | null) => void;
  onGeneratedFilesChange?: (files: GeneratedExportFile[]) => void;
  onCreationOrderChange?: (creationOrder: FigmaCreationOrderItem[]) => void;
}

export const FigmaVariablesExportView: React.FC<FigmaVariablesExportViewProps> = ({
  tokens,
  resolvedTokens,
  rawTokens,
  themeGroups,
  onFilesUpdated,
  onDownloadFile,
  onDownloadAllZip,
  onActiveFileChange,
  onGeneratedFilesChange,
}) => {
  const activeTokens = resolvedTokens || tokens || [];
  const activeDoc = rawTokens || {};

  const { files, creationOrder } = useMemo(() => {
    return generateFigmaVariablesExportFiles(activeTokens, activeDoc, themeGroups);
  }, [activeTokens, activeDoc, themeGroups]);

  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return files.find((f) => f.name === "Mode.json")?.id || files[0]?.id || "";
  });

  const activeFile = useMemo(() => {
    return files.find((f) => f.id === activeFileId) || files[0] || null;
  }, [files, activeFileId]);

  React.useEffect(() => {
    onGeneratedFilesChange?.(files);
  }, [files, onGeneratedFilesChange]);

  React.useEffect(() => {
    onActiveFileChange?.(activeFile);
  }, [activeFile, onActiveFileChange]);

  useEffect(() => {
    onGeneratedFilesChange?.(files);
    onFilesUpdated?.(files, activeFile);
  }, [files, onGeneratedFilesChange, onFilesUpdated, activeFile]);

  useEffect(() => {
    onActiveFileChange?.(activeFile);
  }, [activeFile, onActiveFileChange]);

  return (
    <div className="flex-1 flex h-full overflow-hidden select-none bg-background">
      {/* COLUMN 1: Variable Name Order matching frame_225.jpg */}
      <aside className="w-80 border-r border-border/70 bg-card flex flex-col flex-shrink-0 h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 select-text">
          {creationOrder.map((item) => (
            <div
              key={item.id}
              className="py-1 px-2 rounded hover:bg-muted/60 cursor-default truncate text-zinc-600 dark:text-zinc-400 hover:text-foreground dark:hover:text-white transition-colors"
            >
              {item.name}
            </div>
          ))}
        </div>
      </aside>

      {/* COLUMN 2: Collections Tree matching frame_225.jpg */}
      <div className="w-72 border-r border-border/70 flex flex-col h-full flex-shrink-0">
        <ExportFilesTree
          files={files}
          activeFileId={activeFile?.id || ""}
          onSelectFile={setActiveFileId}
        />
      </div>

      {/* COLUMN 3: Figma JSON Editor */}
      <div className="flex-1 flex flex-col h-full p-4 overflow-hidden bg-background">
        <ExportCodeEditor
          file={activeFile}
          onDownloadFile={() => activeFile && onDownloadFile(activeFile)}
          onDownloadAllZip={() => onDownloadAllZip(files)}
        />
      </div>
    </div>
  );
};
