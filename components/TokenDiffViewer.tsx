"use client";

import React, { useState } from "react";
import {
  DocumentDiffSummary,
  FileDiffItem,
  TokenDiffItem,
  LineDiffChunk,
} from "@/utils/tokenDiff";
import {
  FileCode,
  Layers,
  Check,
  Plus,
  Minus,
  Edit2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Code2,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TokenDiffViewerProps {
  diff: DocumentDiffSummary;
  className?: string;
  maxHeight?: string;
}

export const TokenDiffViewer: React.FC<TokenDiffViewerProps> = ({
  diff,
  className = "",
  maxHeight = "max-h-[380px]",
}) => {
  const [activeTab, setActiveTab] = useState<"semantic" | "raw">("semantic");
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);

  if (!diff.hasChanges || diff.files.length === 0) {
    return (
      <div className={`p-8 text-center bg-muted/20 border border-border rounded-xl text-muted-foreground ${className}`}>
        <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
        <p className="text-xs font-semibold text-foreground">No differences detected</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Local tokens are completely synchronized with the remote branch.
        </p>
      </div>
    );
  }

  const currentFile = diff.files[selectedFileIdx] || diff.files[0];

  return (
    <div className={`flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-xs text-xs select-none ${className}`}>
      {/* 1. Header with Stats & View Toggle */}
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between flex-wrap gap-2">
        {/* Left: Summary Metrics */}
        <div className="flex items-center gap-2 font-mono">
          <span className="font-semibold text-foreground text-xs">
            {diff.files.length} {diff.files.length === 1 ? "file" : "files"} changed
          </span>
          <span className="text-muted-foreground/50">•</span>
          {diff.totalAdded > 0 && (
            <Badge variant="success" className="text-[10px] font-mono py-0 px-1.5">
              +{diff.totalAdded} added
            </Badge>
          )}
          {diff.totalModified > 0 && (
            <Badge variant="warning" className="text-[10px] font-mono py-0 px-1.5">
              ~{diff.totalModified} modified
            </Badge>
          )}
          {diff.totalDeleted > 0 && (
            <Badge variant="destructive" className="text-[10px] font-mono py-0 px-1.5">
              -{diff.totalDeleted} deleted
            </Badge>
          )}
        </div>

        {/* Right: Semantic vs Raw Code Toggle */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("semantic")}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === "semantic"
                ? "bg-background text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Token Diff</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === "raw"
                ? "bg-background text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-primary" />
            <span>Raw Code</span>
          </button>
        </div>
      </div>

      {/* 2. Multi-File Tabs (if more than 1 file changed) */}
      {diff.files.length > 1 && (
        <div className="px-3 py-1.5 bg-muted/20 border-b border-border flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {diff.files.map((file, idx) => {
            const isSelected = selectedFileIdx === idx;
            return (
              <button
                key={file.fileName}
                type="button"
                onClick={() => setSelectedFileIdx(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-background text-foreground font-bold shadow-2xs border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="truncate max-w-[180px]">{file.fileName}</span>
                <span className="text-[10px] opacity-70">
                  (+{file.addedCount}/~{file.modifiedCount}/-{file.deletedCount})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Diff Content Body */}
      <div className={`flex-1 overflow-y-auto ${maxHeight}`}>
        {activeTab === "semantic" ? (
          /* Semantic Token Diff View */
          currentFile.tokens.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-xs">
              File structure updated (metadata or theme options). View in Raw Code mode.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {currentFile.tokens.map((token) => (
                <SemanticTokenDiffRow key={token.key} token={token} />
              ))}
            </div>
          )
        ) : (
          /* Raw Line Diff View */
          <div className="font-mono text-[11px] leading-[18px] select-text">
            {currentFile.lineDiff.map((chunk, idx) => (
              <RawLineDiffRow key={idx} chunk={chunk} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface SemanticTokenDiffRowProps {
  token: TokenDiffItem;
}

const SemanticTokenDiffRow: React.FC<SemanticTokenDiffRowProps> = ({ token }) => {
  const isAdded = token.changeType === "added";
  const isDeleted = token.changeType === "deleted";
  const isModified = token.changeType === "modified";

  return (
    <div className="p-3 hover:bg-muted/30 transition-colors flex flex-col gap-2">
      {/* Top Header: Name, Type, Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-foreground font-mono text-xs truncate">
            {token.name}
          </span>
          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1">
            {token.type}
          </Badge>
        </div>

        <div>
          {isAdded && (
            <Badge variant="success" className="text-[10px] font-mono py-0 px-1.5">
              + Added
            </Badge>
          )}
          {isDeleted && (
            <Badge variant="destructive" className="text-[10px] font-mono py-0 px-1.5">
              - Removed
            </Badge>
          )}
          {isModified && (
            <Badge variant="warning" className="text-[10px] font-mono py-0 px-1.5">
              ~ Modified
            </Badge>
          )}
        </div>
      </div>

      {/* Description Diff if changed */}
      {(token.oldDescription !== token.newDescription || token.newDescription) && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <span className="font-semibold text-[10px] uppercase tracking-wider opacity-70">Description:</span>
          {isModified && token.oldDescription ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="line-through text-rose-500/80">{token.oldDescription}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{token.newDescription}</span>
            </div>
          ) : (
            <span>{token.newDescription || token.oldDescription}</span>
          )}
        </div>
      )}

      {/* Value Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
        {/* Old Value */}
        {!isAdded && (
          <div className="p-2 rounded-md bg-rose-500/5 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Previous Value</span>
            <pre className="text-[11px] whitespace-pre-wrap break-all font-mono">
              {typeof token.oldValue === "object"
                ? JSON.stringify(token.oldValue, null, 2)
                : String(token.oldValue)}
            </pre>
          </div>
        )}

        {/* New Value */}
        {!isDeleted && (
          <div className={`p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex flex-col gap-1 ${
            isAdded ? "md:col-span-2" : ""
          }`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Updated Value</span>
            <pre className="text-[11px] whitespace-pre-wrap break-all font-mono">
              {typeof token.newValue === "object"
                ? JSON.stringify(token.newValue, null, 2)
                : String(token.newValue)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

interface RawLineDiffRowProps {
  chunk: LineDiffChunk;
}

const RawLineDiffRow: React.FC<RawLineDiffRowProps> = ({ chunk }) => {
  const isAdded = chunk.type === "added";
  const isRemoved = chunk.type === "removed";

  return (
    <div
      className={`flex items-start px-2 py-0.5 font-mono ${
        isAdded
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
          : isRemoved
          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 line-through opacity-80"
          : "text-foreground/80 hover:bg-muted/30"
      }`}
    >
      {/* Line Numbers Gutter */}
      <div className="w-10 text-right pr-2 select-none text-[10px] text-muted-foreground/60 flex-shrink-0">
        {chunk.oldLineNumber || ""}
      </div>
      <div className="w-10 text-right pr-3 select-none text-[10px] text-muted-foreground/60 flex-shrink-0">
        {chunk.newLineNumber || ""}
      </div>

      {/* Marker */}
      <div className="w-4 select-none text-[11px] font-bold flex-shrink-0">
        {isAdded ? "+" : isRemoved ? "-" : " "}
      </div>

      {/* Line Code Content */}
      <div className="flex-1 whitespace-pre-wrap break-all pl-1">{chunk.content}</div>
    </div>
  );
};
