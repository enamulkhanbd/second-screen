"use client";

import React, { useState } from "react";
import { Copy, Check, FileCode, Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeneratedExportFile } from "@/types/exports";
import { CodeViewer } from "@/components/ui/CodeViewer";

interface ExportCodeEditorProps {
  file: GeneratedExportFile | null;
  onDownloadFile?: () => void;
  onDownloadAllZip?: () => void;
}

export const ExportCodeEditor: React.FC<ExportCodeEditorProps> = ({
  file,
  onDownloadFile,
  onDownloadAllZip,
}) => {
  const [copied, setCopied] = useState(false);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8 bg-card border border-border/60 rounded-xl">
        <FileCode className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-semibold text-foreground">No file selected</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Select a file from the list to view its generated output.
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  return (
    <div className="flex-1 flex flex-col h-full bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm">
      {/* File Header Bar matching frame_020.jpg */}
      <div className="h-11 px-4 border-b border-border/60 bg-muted/20 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="font-mono text-xs font-semibold text-foreground truncate">
            {file.path}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>

          {/* Download File Button */}
          {onDownloadFile && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadFile}
              className="h-8 px-3 text-xs font-medium bg-background border-border text-foreground hover:bg-muted"
            >
              Download
            </Button>
          )}

          {/* Download All Button */}
          {onDownloadAllZip && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadAllZip}
              className="h-8 px-3 text-xs font-medium bg-background border-border text-foreground hover:bg-muted"
            >
              Download All
            </Button>
          )}
        </div>
      </div>

      {/* Code Viewer */}
      <div className="flex-1 overflow-auto bg-white dark:bg-[#0d0d12] py-3">
        <CodeViewer content={file.content} language={file.language} />
      </div>
    </div>
  );
};
