"use client";

import React, { useState, useMemo, useEffect } from "react";
import { RawTokensDocument } from "@/types/tokens";
import { GeneratedExportFile } from "@/types/exports";
import {
  generateRawJsonExportFiles,
  generateDtcgExportFiles,
} from "@/utils/exportsCompiler";
import { ExportFilesTree } from "./ExportFilesTree";
import { ExportCodeEditor } from "./ExportCodeEditor";

interface JsonExportViewProps {
  format: "raw" | "dtcg";
  rawTokens: RawTokensDocument;
  onFilesUpdated?: (files: GeneratedExportFile[], activeFile: GeneratedExportFile | null) => void;
  onDownloadFile: (file: GeneratedExportFile) => void;
  onDownloadAllZip: (files: GeneratedExportFile[]) => void;
  onActiveFileChange?: (file: GeneratedExportFile | null) => void;
  onGeneratedFilesChange?: (files: GeneratedExportFile[]) => void;
}

export const JsonExportView: React.FC<JsonExportViewProps> = ({
  format,
  rawTokens,
  onFilesUpdated,
  onDownloadFile,
  onDownloadAllZip,
  onActiveFileChange,
  onGeneratedFilesChange,
}) => {
  const generatedFiles = useMemo(() => {
    return format === "raw"
      ? generateRawJsonExportFiles(rawTokens)
      : generateDtcgExportFiles(rawTokens);
  }, [format, rawTokens]);

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

  return (
    <div className="flex-1 flex h-full overflow-hidden select-none bg-background">
      {/* COLUMN 1: TOKEN SETS TREE (frame_195.jpg) */}
      <div className="w-80 border-r border-border/70 flex flex-col h-full flex-shrink-0">
        <ExportFilesTree
          files={generatedFiles}
          activeFileId={activeFile?.id || ""}
          onSelectFile={setActiveFileId}
          title={`Token Sets (${generatedFiles.length})`}
        />
      </div>

      {/* COLUMN 2: CODE EDITOR (frame_195.jpg) */}
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
