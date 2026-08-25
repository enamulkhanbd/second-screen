"use client";

import React, { useState, useMemo } from "react";
import { CommitFileChange } from "@/app/api/git/commit-details/route";
import {
  computeSideBySideDiff,
  parseUnifiedPatchToSideBySide,
  computeLineDiff,
  SideBySideHunk,
  SideBySideRow,
} from "@/utils/tokenDiff";
import {
  FileText,
  FileCode,
  FolderGit2,
  Columns,
  AlignJustify,
  Expand,
  Minimize2,
  Check,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SideBySideDiffViewerProps {
  files?: CommitFileChange[];
  activeFile?: CommitFileChange;
  selectedFileIdx?: number;
  onSelectFile?: (idx: number) => void;
  showFileTabs?: boolean;
  repoName?: string;
  className?: string;
}

export const SideBySideDiffViewer: React.FC<SideBySideDiffViewerProps> = ({
  files = [],
  activeFile,
  selectedFileIdx = 0,
  onSelectFile,
  showFileTabs = true,
  repoName = "repository",
  className = "",
}) => {
  const [internalFileIdx, setInternalFileIdx] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"side-by-side" | "inline">("side-by-side");
  const [showFullFile, setShowFullFile] = useState<boolean>(false);

  const effectiveIdx = onSelectFile ? selectedFileIdx : internalFileIdx;
  const selectedFile = activeFile || files[effectiveIdx] || files[0];

  const handleFileChange = (idx: number) => {
    if (onSelectFile) {
      onSelectFile(idx);
    } else {
      setInternalFileIdx(idx);
    }
  };

  // Compute side-by-side hunks for the active file
  const hunks: SideBySideHunk[] = useMemo(() => {
    if (!selectedFile) return [];

    if (selectedFile.oldContent !== undefined && selectedFile.newContent !== undefined) {
      return computeSideBySideDiff(
        selectedFile.oldContent,
        selectedFile.newContent,
        showFullFile ? 99999 : 4
      );
    } else if (selectedFile.patch) {
      return parseUnifiedPatchToSideBySide(selectedFile.patch);
    }
    return [];
  }, [selectedFile, showFullFile]);

  // Compute unified inline diff chunks
  const inlineChunks = useMemo(() => {
    if (!selectedFile) return [];
    if (selectedFile.oldContent !== undefined && selectedFile.newContent !== undefined) {
      return computeLineDiff(selectedFile.oldContent, selectedFile.newContent);
    }
    return [];
  }, [selectedFile]);

  if (!selectedFile) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 border border-border rounded-xl font-mono">
        No file diffs available for this selection.
      </div>
    );
  }

  return (
    <div className={`flex flex-col border border-border rounded-xl bg-card overflow-hidden text-xs shadow-xs ${className}`}>
      {/* 1. Optional Top Files Navigation Bar (if showFileTabs is true and multiple files) */}
      {showFileTabs && files.length > 1 && (
        <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <div className="flex items-center gap-1 text-[11px] font-bold text-foreground font-mono mr-1">
              <FileCode className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>Files:</span>
            </div>

            {files.map((f, idx) => {
              const isSelected = effectiveIdx === idx;
              const filenameParts = f.filename.split("/");
              const basename = filenameParts.pop() || f.filename;

              return (
                <button
                  key={f.filename}
                  type="button"
                  onClick={() => handleFileChange(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-background text-foreground font-bold shadow-2xs border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                  title={f.filename}
                >
                  <FileText className={`w-3 h-3 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="truncate max-w-[160px]">{basename}</span>
                  <div className="flex items-center gap-0.5 text-[9px]">
                    {f.additions !== undefined && f.additions > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{f.additions}</span>
                    )}
                    {f.deletions !== undefined && f.deletions > 0 && (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">-{f.deletions}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. File Path & Diff Mode Controls Bar */}
      <div className="px-4 py-2 bg-muted/20 border-b border-border flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono">
        {/* Full File Path & Status */}
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="truncate font-semibold text-foreground">{selectedFile?.filename}</span>
          <Badge
            variant={
              selectedFile?.status === "added"
                ? "success"
                : selectedFile?.status === "deleted"
                ? "destructive"
                : "outline"
            }
            className="text-[9px] font-mono py-0 px-1 capitalize"
          >
            {selectedFile?.status}
          </Badge>
          {(selectedFile?.additions !== undefined || selectedFile?.deletions !== undefined) && (
            <span className="text-muted-foreground text-[10px]">
              ({selectedFile.additions ? `+${selectedFile.additions}` : ""}
              {selectedFile.deletions ? ` -${selectedFile.deletions}` : ""})
            </span>
          )}
        </div>

        {/* View Controls: Side-by-side vs Inline & Full File Toggle */}
        <div className="flex items-center gap-2">
          {selectedFile?.oldContent !== undefined && selectedFile?.newContent !== undefined && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullFile(!showFullFile)}
              className="h-7 px-2 text-[11px] font-mono gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              title={showFullFile ? "Show changed lines with context" : "Show entire file"}
            >
              {showFullFile ? <Minimize2 className="w-3 h-3" /> : <Expand className="w-3 h-3" />}
              <span>{showFullFile ? "Context View" : "Full File"}</span>
            </Button>
          )}

          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setViewMode("side-by-side")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                viewMode === "side-by-side"
                  ? "bg-background text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Side-by-side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("inline")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                viewMode === "inline"
                  ? "bg-background text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlignJustify className="w-3 h-3" />
              <span>Inline</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Diff Content Viewport */}
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[620px] font-mono text-[12px] leading-[20px] select-text bg-background">
        {viewMode === "side-by-side" ? (
          /* ------------------------------------------------------------- */
          /* SIDE-BY-SIDE SPLIT VIEW WITH VS CODE AESTHETICS               */
          /* ------------------------------------------------------------- */
          hunks.length === 0 && selectedFile?.patch ? (
            <pre className="p-4 text-[11px] leading-[18px] text-foreground/90 font-mono whitespace-pre">
              {selectedFile.patch}
            </pre>
          ) : hunks.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs font-mono">
              No textual differences found in this file.
            </div>
          ) : (
            <div className="min-w-[780px] divide-y divide-border/60">
              {hunks.map((hunk, hunkIdx) => (
                <div key={hunkIdx} className="divide-y divide-border/20">
                  {/* Hunk Range Marker */}
                  {hunk.header && (
                    <div className="px-4 py-1 bg-muted/40 text-[10px] text-muted-foreground font-mono font-bold tracking-wider select-none border-b border-border/40">
                      {hunk.header}
                    </div>
                  )}

                  {/* Side by Side Rows */}
                  {hunk.rows.map((row, rowIdx) => {
                    const isLeftRemoved = row.left?.type === "removed";
                    const isLeftEmpty = row.left?.type === "empty";
                    const isRightAdded = row.right?.type === "added";
                    const isRightEmpty = row.right?.type === "empty";

                    return (
                      <div key={rowIdx} className="grid grid-cols-2 divide-x divide-border">
                        {/* LEFT PANEL: Previous Version */}
                        <div
                          className={`flex items-start overflow-hidden ${
                            isLeftRemoved
                              ? "bg-rose-500/15 text-rose-900 dark:text-rose-200"
                              : isLeftEmpty
                              ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(128,128,128,0.07)_4px,rgba(128,128,128,0.07)_8px)]"
                              : "text-foreground/80 hover:bg-muted/20"
                          }`}
                        >
                          {/* Gutter: Line Number & Symbol */}
                          <div className={`w-12 text-right pr-2 select-none flex-shrink-0 text-[11px] border-r border-border/40 ${
                            isLeftRemoved ? "text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10" : "text-muted-foreground/50 bg-muted/10"
                          }`}>
                            {row.left?.lineNumber !== undefined ? (
                              <span>{row.left.lineNumber}{isLeftRemoved ? "-" : ""}</span>
                            ) : ""}
                          </div>

                          {/* Code Content */}
                          <div className="flex-1 whitespace-pre-wrap break-all px-3 py-0.5">
                            {row.left?.content || ""}
                          </div>
                        </div>

                        {/* RIGHT PANEL: Updated Version */}
                        <div
                          className={`flex items-start overflow-hidden ${
                            isRightAdded
                              ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                              : isRightEmpty
                              ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(128,128,128,0.07)_4px,rgba(128,128,128,0.07)_8px)]"
                              : "text-foreground/80 hover:bg-muted/20"
                          }`}
                        >
                          {/* Gutter: Line Number & Symbol */}
                          <div className={`w-12 text-right pr-2 select-none flex-shrink-0 text-[11px] border-r border-border/40 ${
                            isRightAdded ? "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10" : "text-muted-foreground/50 bg-muted/10"
                          }`}>
                            {row.right?.lineNumber !== undefined ? (
                              <span>{row.right.lineNumber}{isRightAdded ? "+" : ""}</span>
                            ) : ""}
                          </div>

                          {/* Code Content */}
                          <div className="flex-1 whitespace-pre-wrap break-all px-3 py-0.5">
                            {row.right?.content || ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )
        ) : (
          /* ------------------------------------------------------------- */
          /* INLINE UNIFIED VIEW                                           */
          /* ------------------------------------------------------------- */
          inlineChunks.length > 0 ? (
            <div className="divide-y divide-border/15 min-w-[650px]">
              {inlineChunks.map((chunk, idx) => {
                const isAdded = chunk.type === "added";
                const isRemoved = chunk.type === "removed";

                return (
                  <div
                    key={idx}
                    className={`flex items-start px-2 py-0.5 ${
                      isAdded
                        ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                        : isRemoved
                        ? "bg-rose-500/15 text-rose-900 dark:text-rose-200"
                        : "text-foreground/80 hover:bg-muted/20"
                    }`}
                  >
                    <span className="w-10 text-right pr-2 text-[11px] text-muted-foreground/50 select-none flex-shrink-0">
                      {chunk.oldLineNumber || ""}
                    </span>
                    <span className="w-10 text-right pr-2 text-[11px] text-muted-foreground/50 select-none flex-shrink-0">
                      {chunk.newLineNumber || ""}
                    </span>
                    <span
                      className={`w-4 text-center font-bold select-none flex-shrink-0 text-xs ${
                        isAdded ? "text-emerald-600 dark:text-emerald-400" : isRemoved ? "text-rose-600 dark:text-rose-400" : ""
                      }`}
                    >
                      {isAdded ? "+" : isRemoved ? "-" : " "}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all pl-2">
                      {chunk.content}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : selectedFile?.patch ? (
            <pre className="p-4 text-[11px] leading-[18px] text-foreground/90 font-mono whitespace-pre">
              {selectedFile.patch}
            </pre>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-xs font-mono">
              No diff lines available.
            </div>
          )
        )}
      </div>
    </div>
  );
};
