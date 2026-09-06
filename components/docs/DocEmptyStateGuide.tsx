"use client";

import React from "react";
import {
  BookOpen,
  Plus,
  Sparkles,
  FolderPlus,
  FolderTree,
  Terminal,
  RefreshCw,
  Globe,
  ArrowRight,
  Palette,
  CheckCircle2,
  Table,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DocEmptyStateGuideProps {
  projectName?: string;
  onCreateFirstPage: () => void;
  onLoadTemplate: () => void;
  onCreateFolder: () => void;
}

export const DocEmptyStateGuide: React.FC<DocEmptyStateGuideProps> = ({
  projectName = "Design System",
  onCreateFirstPage,
  onLoadTemplate,
  onCreateFolder,
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-background/50 p-6 md:p-12">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Main Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-card/80 to-background p-8 md:p-12 shadow-sm text-center">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Living Documentation Guide</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Document Your Design Tokens
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Welcome to the Living Documentation Studio for <strong className="text-foreground">{projectName}</strong>.
              Connect multi-mode Figma variables and tokens directly into interactive, shareable design system guidelines.
            </p>

            {/* Quick Action CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={onCreateFirstPage}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all hover:scale-102 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Page</span>
              </button>

              <button
                type="button"
                onClick={onLoadTemplate}
                className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Start with Foundations Template</span>
              </button>

              <button
                type="button"
                onClick={onCreateFolder}
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-transparent px-3.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Add Section Folder</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Step Visual Guide */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              How Living Documentation Works
            </h2>
            <p className="text-xs text-muted-foreground">
              Everything you need to build and publish team-wide design guidelines
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Step 1 */}
            <div className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                  <FolderTree className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                    Step 1
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Structure with Folders</h3>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Group pages into clear sections like <code className="text-[11px] rounded bg-muted px-1">Foundations</code>,{" "}
                <code className="text-[11px] rounded bg-muted px-1">Components</code>, or guidelines. Add and rename folders from the left navigation tree.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                    Step 2
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Insert Blocks with Slash (/)</h3>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Type <code className="text-[11px] rounded bg-muted px-1 font-bold">/</code> anywhere on the canvas or click{" "}
                <strong>+ Add block</strong> to insert Variables Tables, Color Swatches, Typography Scales, or Do's & Don'ts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Step 3
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Live Token Synchronization</h3>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                All variable and token blocks read live from your project data. Edits to tokens or Figma variable sync automatically update in your documentation.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Step 4
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Publish & Share Publicly</h3>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Turn on Public Access with 1-click in <strong>Publish Settings</strong>. Share read-only documentation pages with clients and engineering teams.
              </p>
            </div>
          </div>
        </div>

        {/* Live Block Showcase Hint */}
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground">Pro-Tip for Fast Documentation</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use the right-side inspector to customize layouts (<strong>Classic</strong>, <strong>Hero</strong>, or <strong>Feature</strong>) and choose page background styles. You can filter variables by collection (<code className="text-[11px]">brand</code>, <code className="text-[11px]">comp</code>), modes (<code className="text-[11px]">light</code>, <code className="text-[11px]">dark</code>), and variable types.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
