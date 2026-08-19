"use client";

import React from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  LayoutDashboard,
  Palette,
  Layers,
  FileCode2,
  GitBranch,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface DashboardViewProps {
  onOpenSettings?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenSettings }) => {
  const {
    rawTokens,
    resolvedTokens,
    themeGroups,
    credentials,
    syncStatus,
    syncMeta,
    setSidebarTab,
    fetchLiveTokens,
  } = useTokenStore();

  const setNames = Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  const totalTokens = resolvedTokens.length;
  const isConnected = Boolean(credentials.repo && credentials.owner);

  // Group tokens by category for breakdown
  const colorCount = resolvedTokens.filter((t) => t.type === "color").length;
  const typoCount = resolvedTokens.filter((t) => t.type === "typography").length;
  const dimensionCount = resolvedTokens.filter(
    (t) => t.type === "spacing" || t.type === "sizing" || t.type === "dimension"
  ).length;
  const otherCount = totalTokens - (colorCount + typoCount + dimensionCount);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/50 dark:bg-[#09090d] p-8 space-y-8 font-sans">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <LayoutDashboard className="w-4 h-4" />
            <span>Design Tokens Studio</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            System Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Overview of your connected design system tokens, active themes, and Git synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLiveTokens()}
            disabled={syncStatus === "fetching"}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "fetching" ? "animate-spin text-emerald-500" : ""}`} />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={() => setSidebarTab("themes")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Open Themes</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Tokens */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>Total Tokens</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
              {totalTokens > 0 ? totalTokens : "—"}
            </div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Across {setNames.length} token sets
            </div>
          </div>
        </div>

        {/* 2. Theme Groups */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>Theme Groups</span>
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
              <Palette className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
              {themeGroups.length}
            </div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              {themeGroups.reduce((acc, g) => acc + g.options.length, 0)} total options configured
            </div>
          </div>
        </div>

        {/* 3. Token Sets */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>Token Sets</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <FileCode2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
              {setNames.length}
            </div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Files in active workspace
            </div>
          </div>
        </div>

        {/* 4. Repository Sync */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>Git Repository</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold font-mono text-zinc-900 dark:text-white truncate">
              {isConnected ? `${credentials.owner}/${credentials.repo}` : "Disconnected"}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              {isConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Branch: {credentials.branch || "main"}</span>
                </>
              ) : (
                <span className="text-zinc-400">Click to connect repository</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launch & Token Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Category Distribution */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Token Distribution</span>
            </h3>
            <span className="text-xs font-mono text-zinc-400">
              {totalTokens} tokens
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Colors</div>
              <div className="text-lg font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {colorCount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Typography</div>
              <div className="text-lg font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {typoCount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Dimensions</div>
              <div className="text-lg font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {dimensionCount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Other</div>
              <div className="text-lg font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {otherCount}
              </div>
            </div>
          </div>

          {/* Progress bar breakdown */}
          {totalTokens > 0 && (
            <div className="pt-2 space-y-1.5">
              <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                <div
                  style={{ width: `${(colorCount / totalTokens) * 100}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Colors: ${colorCount}`}
                />
                <div
                  style={{ width: `${(typoCount / totalTokens) * 100}%` }}
                  className="bg-violet-500 h-full"
                  title={`Typography: ${typoCount}`}
                />
                <div
                  style={{ width: `${(dimensionCount / totalTokens) * 100}%` }}
                  className="bg-blue-500 h-full"
                  title={`Dimensions: ${dimensionCount}`}
                />
                <div
                  style={{ width: `${(otherCount / totalTokens) * 100}%` }}
                  className="bg-amber-500 h-full"
                  title={`Other: ${otherCount}`}
                />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Color
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-500" /> Typography
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Dimension
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Other
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Quick Navigation
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Jump directly to tokens or theme matrix editing.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setSidebarTab("themes")}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/80 dark:hover:bg-zinc-850 text-zinc-800 dark:text-zinc-200 transition-all border border-zinc-200/60 dark:border-zinc-800/80 text-xs font-semibold cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 text-emerald-500" />
                <span>Theme Matrix & Options</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => setSidebarTab("tokens")}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/80 dark:hover:bg-zinc-850 text-zinc-800 dark:text-zinc-200 transition-all border border-zinc-200/60 dark:border-zinc-800/80 text-xs font-semibold cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <FileCode2 className="w-4 h-4 text-blue-500" />
                <span>Token Sets & Code Editor</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder / Future Content Section */}
      <div className="p-8 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-[#0e0e13]/50 text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 mx-auto flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5" />
        </div>
        <h4 className="text-base font-bold text-zinc-900 dark:text-white">
          Dashboard Widgets & Insights
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          More metrics, token health checks, accessibility scorecards, and live sync feeds will be added here.
        </p>
      </div>
    </div>
  );
};
