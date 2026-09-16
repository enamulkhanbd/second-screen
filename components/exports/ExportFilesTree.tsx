"use client";

import React, { useMemo } from "react";
import { GeneratedExportFile } from "@/types/exports";
import { Folder, FileCode } from "lucide-react";

interface ExportFilesTreeProps {
  files: GeneratedExportFile[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  title?: string;
}

export const ExportFilesTree: React.FC<ExportFilesTreeProps> = ({
  files,
  activeFileId,
  onSelectFile,
  title,
}) => {
  // Group files by folder
  const { rootFiles, folderMap } = useMemo(() => {
    const rootFiles: GeneratedExportFile[] = [];
    const folderMap = new Map<string, GeneratedExportFile[]>();

    files.forEach((file) => {
      const folder = file.folder;
      if (folder) {
        const list = folderMap.get(folder) || [];
        list.push(file);
        folderMap.set(folder, list);
      } else {
        rootFiles.push(file);
      }
    });

    return { rootFiles, folderMap };
  }, [files]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-card/60">
      {title && (
        <div className="h-10 px-4 border-b border-border/60 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-bold text-foreground">{title}</span>
          <span className="text-[11px] font-mono text-muted-foreground">({files.length})</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans">
        {/* Root Files if any */}
        {rootFiles.length > 0 && (
          <div className="space-y-1">
            {rootFiles.map((file) => {
              const isSelected = file.id === activeFileId;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => onSelectFile(file.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-[#22242a] text-white shadow-sm"
                      : "text-zinc-300 hover:bg-muted/40 hover:text-white"
                  }`}
                >
                  <span className="truncate">{file.name}</span>
                  {file.sizeFormatted && (
                    <span className="text-[10px] text-zinc-500 font-mono font-normal">
                      {file.sizeFormatted}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Folders */}
        {Array.from(folderMap.entries()).map(([folderName, folderFiles]) => (
          <div key={folderName} className="space-y-1">
            {/* Folder Header */}
            <div className="flex items-center justify-between px-1 py-1 text-xs font-bold text-zinc-300">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-zinc-400 fill-zinc-500/20" />
                <span className="tracking-tight">{folderName}</span>
              </div>
              <span className="w-4 h-4 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-center font-normal">
                {folderFiles.length}
              </span>
            </div>

            {/* Folder Children with Guide Line */}
            <div className="ml-3 pl-3 border-l border-zinc-800/90 space-y-0.5">
              {folderFiles.map((file) => {
                const isSelected = file.id === activeFileId;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => onSelectFile(file.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-[#22242a] text-white shadow-sm"
                        : "text-zinc-300 hover:bg-muted/40 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{file.name}</span>
                    {file.sizeFormatted && (
                      <span className="text-[10px] text-zinc-500 font-mono font-normal">
                        {file.sizeFormatted}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
