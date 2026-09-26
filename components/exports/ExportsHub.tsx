"use client";

import React from "react";
import { ExportViewType } from "@/types/exports";
import { PageHeader } from "@/components/ui/page-header";

interface ExportsHubProps {
  onSelectExport: (type: ExportViewType) => void;
  tokenCount?: number;
  themesCount?: number;
  projectName?: string;
}

// Official Brand Icons
const Css3Icon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 128 128" className={className} fill="none">
    <path fill="#1572B6" d="M18.814 114.123L8.76 1.352h110.48l-10.064 112.754-45.243 12.543-45.119-12.526z" />
    <path fill="#33A9DC" d="M64.001 117.062l36.559-10.136 8.601-96.354h-45.16v106.49z" />
    <path fill="#FFFFFF" d="M64.001 51.429h18.302l1.264-14.163H64.001V23.435h34.682l-.332 3.711-3.4 38.114h-30.95V51.429z" />
    <path fill="#EBEBEB" d="M64.083 87.349l-.061.018-15.403-4.159-.985-11.031H33.752l1.937 21.717 28.331 7.863.063-.018v-14.39z" />
    <path fill="#FFFFFF" d="M81.127 64.675l-1.666 18.522-15.426 4.164v14.39l28.354-7.858.208-2.337 2.406-26.881H81.127z" />
    <path fill="#EBEBEB" d="M64.048 23.435v13.831H30.64l-.277-3.108-.63-7.012-.331-3.711h34.646zm-.047 27.996v13.831H48.792l-.277-3.108-.631-7.012-.33-3.711h16.447z" />
  </svg>
);

const SassIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="12" cy="12" r="11" fill="#CF649A" />
    <path
      fill="#FFFFFF"
      d="M9.615 15.998c.175.645.156 1.248-.024 1.792l-.065.18c-.024.061-.052.12-.078.176-.14.29-.326.56-.555.81-.698.759-1.672 1.047-2.09.805-.45-.262-.226-1.335.584-2.19.871-.918 2.12-1.509 2.12-1.509v-.003l.108-.061zm9.911-10.861c-.542-2.133-4.077-2.834-7.422-1.645-1.989.707-4.144 1.818-5.693 3.267C4.568 8.48 4.275 9.98 4.396 10.607c.427 2.211 3.457 3.657 4.703 4.73v.006c-.367.18-3.056 1.529-3.686 2.925-.675 1.47.105 2.521.615 2.655 1.575.436 3.195-.36 4.065-1.649.84-1.261.766-2.881.404-3.676.496-.135 1.08-.195 1.83-.104 2.101.24 2.521 1.56 2.43 2.1-.09.539-.523.854-.674.944-.15.091-.195.12-.181.181.015.09.091.09.21.075.165-.03 1.096-.45 1.141-1.471.045-1.29-1.186-2.729-3.375-2.7-.9.016-1.471.091-1.875.256-.03-.045-.061-.075-.105-.105-1.35-1.455-3.855-2.475-3.75-4.41.03-.705.285-2.564 4.8-4.814 3.705-1.846 6.661-1.335 7.171-.21.733 1.604-1.576 4.59-5.431 5.024-1.47.165-2.235-.404-2.431-.615-.209-.225-.239-.24-.314-.194-.12.06-.045.255 0 .375.12.3.585.825 1.396 1.095.704.225 2.43.359 4.5-.45 2.324-.899 4.139-3.405 3.614-5.505l.073.067z"
    />
  </svg>
);

const TypeScriptIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect width="24" height="24" rx="3.5" fill="#3178C6" />
    <path
      fill="#FFFFFF"
      d="M18.488 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"
    />
  </svg>
);

const TokenCoinIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <defs>
      <linearGradient id="tokenCoinGrad" x1="10%" y1="10%" x2="90%" y2="90%">
        <stop offset="0%" stop-color="#F59E0B" />
        <stop offset="60%" stop-color="#EAA011" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>
    </defs>
    <path
      fill="url(#tokenCoinGrad)"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2.5C6.753 2.5 2.5 6.753 2.5 12s4.253 9.5 9.5 9.5 9.5-4.253 9.5-9.5S17.247 2.5 12 2.5zm-.8 4.6c1.8-.7 3.6.4 4.2 2.4.6 2.1-.3 4.2-2.1 4.9-1.8.7-3.6-.4-4.2-2.4-.6-2.1.3-4.2 2.1-4.9z"
    />
    <path
      d="M7 4.2C9.5 2.8 12.8 2.8 15.6 3.8c2.4.9 4.6 2.8 5.6 5.2"
      stroke="#FDE68A"
      strokeWidth="1.1"
      strokeLinecap="round"
      fill="none"
      opacity="0.9"
    />
    <path
      d="M19.2 8.5c1.4 2.6 1.4 5.8.2 8.4-1.2 2.6-3.6 4.4-6.4 5"
      stroke="#FBBF24"
      strokeWidth="1"
      strokeLinecap="round"
      fill="none"
      opacity="0.75"
    />
    <path
      d="M10.5 21.2C7.5 20.8 4.8 19.2 3.4 16.6c-1.4-2.4-1.6-5.4-.5-8"
      stroke="#B45309"
      strokeWidth="1.1"
      strokeLinecap="round"
      fill="none"
      opacity="0.55"
    />
    <path
      d="M8.8 8.4c.5-1.2 1.6-1.8 2.8-1.7M15.2 10.5c.3 1.2-.2 2.5-1.1 3.2M11.5 14.5c-1.2.2-2.3-.6-2.7-1.7"
      stroke="#FEF3C7"
      strokeWidth="0.9"
      strokeLinecap="round"
      fill="none"
      opacity="0.85"
    />
  </svg>
);

export const ExportsHub: React.FC<ExportsHubProps> = ({ onSelectExport }) => {
  return (
    <div className="flex-1 flex flex-col items-center h-full bg-background overflow-y-auto select-none p-6 md:py-10 md:px-8">
      <div className="w-full max-w-[960px] space-y-8">
        <PageHeader
          title="Exports"
          description="Configure how your design tokens are exported to code."
        />

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
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <Css3Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-blue-500 transition-colors">
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
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <SassIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-pink-500 transition-colors">
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
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <TypeScriptIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-blue-500 transition-colors">
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
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <TokenCoinIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-amber-500 transition-colors">
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
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <TokenCoinIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-amber-500 transition-colors">
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
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <TokenCoinIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-amber-500 transition-colors">
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
