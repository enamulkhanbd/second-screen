"use client";

import React from "react";
import { ExportViewType } from "@/types/exports";

interface ExportsHubProps {
  onSelectExport: (type: ExportViewType) => void;
  tokenCount?: number;
  themesCount?: number;
  projectName?: string;
}

export const ExportsHub: React.FC<ExportsHubProps> = ({ onSelectExport }) => {
  return (
    <div className="flex-1 flex flex-col items-center h-full bg-background overflow-y-auto select-none p-6 md:py-10 md:px-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Title & Description */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Exports</h1>
          <p className="text-xs text-muted-foreground">
            Configure how your design tokens are exported to code.
          </p>
        </div>

      {/* CREATE NEW Section */}
      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            CREATE NEW
          </span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        <div className="rounded-xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-sm">
          {/* CSS Variables Row */}
          <div
            onClick={() => onSelectExport("css")}
            className="flex items-center justify-between p-4 hover:bg-muted/40 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-[#1572b6]/15 border border-[#1572b6]/30 flex items-center justify-center text-[#1572b6] font-bold text-xs">
                3
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  CSS Variables
                </h2>
                <p className="text-xs text-muted-foreground">
                  CSS custom properties (variables) for use directly in stylesheets.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border border-border/80 bg-background text-foreground shadow-xs">
              CSS
            </span>
          </div>

          {/* SCSS Variables Row */}
          <div
            onClick={() => onSelectExport("scss")}
            className="flex items-center justify-between p-4 hover:bg-muted/40 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-[#cf649a]/15 border border-[#cf649a]/30 flex items-center justify-center text-[#cf649a] font-bold text-xs">
                §
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground group-hover:text-pink-400 transition-colors">
                  SCSS Variables
                </h2>
                <p className="text-xs text-muted-foreground">
                  Real Sass output: $-variables and a nested $tokens map, as @use/@forward partials.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border border-border/80 bg-background text-foreground shadow-xs">
              SCSS
            </span>
          </div>

          {/* TypeScript Row */}
          <div
            onClick={() => onSelectExport("typescript")}
            className="flex items-center justify-between p-4 hover:bg-muted/40 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-[#3178c6]/15 border border-[#3178c6]/30 flex items-center justify-center text-[#3178c6] font-bold text-xs">
                TS
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
                  TypeScript
                </h2>
                <p className="text-xs text-muted-foreground">
                  npm-grade TypeScript tokens: as-const value maps, derived literal-union types, .d.ts declarations, dual ESM/CJS, and a tree-shakeable package.json.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border border-border/80 bg-background text-foreground shadow-xs">
              TYPESCRIPT
            </span>
          </div>
        </div>
      </div>

      {/* OTHER EXPORTS Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            OTHER EXPORTS
          </span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        <div className="rounded-xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-sm">
          {/* Raw JSON Row */}
          <div
            onClick={() => onSelectExport("raw-json")}
            className="flex items-center justify-between p-4 hover:bg-muted/40 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xs font-mono font-bold">
                {}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground group-hover:text-amber-400 transition-colors">
                  Raw JSON
                </h2>
                <p className="text-xs text-muted-foreground">
                  Raw design token JSON exactly as authored, with no transformation.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border border-border/80 bg-background text-foreground shadow-xs">
              RAW
            </span>
          </div>

          {/* DTCG JSON Row */}
          <div
            onClick={() => onSelectExport("dtcg-json")}
            className="flex items-center justify-between p-4 hover:bg-muted/40 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xs font-mono font-bold">
                {}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                  DTCG JSON
                </h2>
                <p className="text-xs text-muted-foreground">
                  Design Tokens Community Group (DTCG) standard token JSON.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border border-border/80 bg-background text-foreground shadow-xs">
              DTCG
            </span>
          </div>

          {/* Figma Variables Row */}
          <div
            onClick={() => onSelectExport("figma-variables")}
            className="flex items-center justify-between p-4 hover:bg-muted/40 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xs font-mono font-bold">
                {}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground group-hover:text-purple-400 transition-colors">
                  Figma Variables
                </h2>
                <p className="text-xs text-muted-foreground">
                  Figma variables JSON for import through the Figma plugin.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border border-border/80 bg-background text-foreground shadow-xs">
              FIGMA
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
