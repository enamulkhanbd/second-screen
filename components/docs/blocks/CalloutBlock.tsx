"use client";

import React from "react";
import { DocBlock } from "@/types/documentation";
import { Info, CheckCircle2, AlertTriangle, XCircle, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CalloutBlockProps {
  block: DocBlock;
  isEditing: boolean;
  onUpdate: (updates: Partial<DocBlock>) => void;
  onDelete?: () => void;
}

export const CalloutBlock: React.FC<CalloutBlockProps> = ({
  block,
  isEditing,
  onUpdate,
  onDelete,
}) => {
  const variant = block.settings?.calloutVariant || "info";

  const config = {
    info: {
      bg: "bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200",
      iconBg: "bg-sky-500/20 text-sky-600 dark:text-sky-400",
      Icon: Info,
      label: "Information",
    },
    success: {
      bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200",
      iconBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      Icon: CheckCircle2,
      label: "Success",
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200",
      iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
      Icon: AlertTriangle,
      label: "Warning",
    },
    error: {
      bg: "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200",
      iconBg: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
      Icon: XCircle,
      label: "Important",
    },
  }[variant];

  const { Icon } = config;

  return (
    <div
      className={`group relative rounded-xl border p-4 transition-colors duration-200 ${config.bg}`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <textarea
              value={block.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Add callout description..."
              rows={2}
              className="w-full resize-y rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
              {block.content || <span className="italic text-muted-foreground">Empty callout note</span>}
            </div>
          )}
        </div>

        {isEditing && (
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
            <Select
              value={variant}
              onValueChange={(val) =>
                onUpdate({
                  settings: {
                    ...block.settings,
                    calloutVariant: val as any,
                  },
                })
              }
            >
              <SelectTrigger className="h-7 w-24 text-xs px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Delete callout"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
