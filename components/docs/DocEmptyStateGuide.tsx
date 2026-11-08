"use client";

import React from "react";
import {
  BookOpen,
  Plus,
  FolderPlus,
  FolderTree,
  Terminal,
  RefreshCw,
  Globe,
} from "lucide-react";

interface DocEmptyStateGuideProps {
  projectName?: string;
  onCreateFirstPage: () => void;
  onCreateFolder: () => void;
}

export const DocEmptyStateGuide: React.FC<DocEmptyStateGuideProps> = ({
  projectName = "Design System",
  onCreateFirstPage,
  onCreateFolder,
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Clean Empty State Header Card */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Documentation workspace</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Document {projectName} tokens and variables
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Create pages with live token tables, color swatches, typography specimens, and usage notes that stay synchronized with your token sets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onCreateFolder}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>New folder</span>
            </button>
            <button
              type="button"
              onClick={onCreateFirstPage}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create first page</span>
            </button>
          </div>
        </div>

        {/* 4-Column Workflow Reference */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
              <FolderTree className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-semibold text-foreground">1. Organize folders</h2>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Group pages into sections such as Foundations, Color, Typography, and Components.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
              <Terminal className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-semibold text-foreground">2. Insert live blocks</h2>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Press <code className="rounded bg-muted px-1 font-mono">/</code> or click <strong>Add block</strong> to embed token tables, color swatches, or type scales.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
              <RefreshCw className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-semibold text-foreground">3. Auto-sync values</h2>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Blocks read directly from your active token sets and synced Figma variable collections.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
              <Globe className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-semibold text-foreground">4. Publish read-only URL</h2>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Enable public access in <strong>Publish settings</strong> to share a fast SSR reader link with your team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
