"use client";

import React from "react";
import { DocBlock } from "@/types/documentation";
import { Trash2 } from "lucide-react";

interface MarkdownBlockProps {
  block: DocBlock;
  isEditing: boolean;
  onUpdate: (updates: Partial<DocBlock>) => void;
  onDelete?: () => void;
}

export const MarkdownBlock: React.FC<MarkdownBlockProps> = ({
  block,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const content = block.content || "";

  // Simple rendering of markdown-like text
  const renderFormattedText = (text: string) => {
    if (!text) {
      return <span className="italic text-muted-foreground">Empty text block. Click edit to add guidelines...</span>;
    }

    const lines = text.split("\n");
    return (
      <div className="space-y-3">
        {lines.map((line, idx) => {
          if (line.startsWith("# ")) {
            return (
              <h1 key={idx} className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {line.replace("# ", "")}
              </h1>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h2 key={idx} className="text-xl font-bold tracking-tight text-foreground sm:text-2xl mt-4 mb-2">
                {line.replace("## ", "")}
              </h2>
            );
          }
          if (line.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-lg font-semibold tracking-tight text-foreground mt-3 mb-1">
                {line.replace("### ", "")}
              </h3>
            );
          }
          if (line.startsWith("- ")) {
            return (
              <li key={idx} className="ml-5 list-disc text-sm leading-relaxed text-foreground/90">
                {line.replace("- ", "")}
              </li>
            );
          }
          if (line.trim() === "") {
            return <div key={idx} className="h-1" />;
          }

          // Format bold `**text**` and code `` `code` ``
          return (
            <p key={idx} className="text-sm leading-relaxed text-foreground/90">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="group relative my-3">
      {isEditing ? (
        <div className="space-y-2 rounded-xl border border-dashed border-border/70 bg-card/40 p-3 transition-colors focus-within:border-primary/60 focus-within:bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Markdown / Content Block</span>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
          <textarea
            value={content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Type your documentation guidelines here (supports # Headings, - Lists, etc)..."
            rows={Math.max(3, content.split("\n").length)}
            className="w-full resize-y rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {renderFormattedText(content)}
        </div>
      )}
    </div>
  );
};
