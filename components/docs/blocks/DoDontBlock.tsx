"use client";

import React from "react";
import { DocBlock } from "@/types/documentation";
import { Check, X, Trash2 } from "lucide-react";

interface DoDontBlockProps {
  block: DocBlock;
  isEditing: boolean;
  onUpdate: (updates: Partial<DocBlock>) => void;
  onDelete?: () => void;
}

export const DoDontBlock: React.FC<DoDontBlockProps> = ({
  block,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const doText = block.settings?.doText ?? "";
  const dontText = block.settings?.dontText ?? "";

  const updateDo = (val: string) => {
    onUpdate({
      settings: {
        ...block.settings,
        doText: val,
      },
    });
  };

  const updateDont = (val: string) => {
    onUpdate({
      settings: {
        ...block.settings,
        dontText: val,
      },
    });
  };

  return (
    <div className="group relative my-4 space-y-2">
      {isEditing && onDelete && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            <span>Remove Do's & Don'ts</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Do Card */}
        <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] shadow-sm transition-colors">
          <div className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
            <span>Do</span>
          </div>
          <div className="p-4">
            {isEditing ? (
              <textarea
                value={doText}
                onChange={(e) => updateDo(e.target.value)}
                placeholder="Recommended usage pattern (e.g. Use primary tokens for high-emphasis actions)..."
                rows={3}
                className="w-full resize-y rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            ) : (
              <p className="text-sm leading-relaxed text-foreground">
                {doText || <span className="italic text-muted-foreground">Add recommended best practice...</span>}
              </p>
            )}
          </div>
        </div>

        {/* Don't Card */}
        <div className="overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/[0.04] shadow-sm transition-colors">
          <div className="flex items-center gap-2 border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white">
              <X className="h-3 w-3 stroke-[3]" />
            </div>
            <span>Don't</span>
          </div>
          <div className="p-4">
            {isEditing ? (
              <textarea
                value={dontText}
                onChange={(e) => updateDont(e.target.value)}
                placeholder="Patterns to avoid (e.g. Avoid hardcoding hex colors)..."
                rows={3}
                className="w-full resize-y rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            ) : (
              <p className="text-sm leading-relaxed text-foreground">
                {dontText || <span className="italic text-muted-foreground">Add antipattern or warning...</span>}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
