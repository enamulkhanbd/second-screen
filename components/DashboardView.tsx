"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  LayoutDashboard,
  Palette,
  Layers,
  FileCode2,
  GitBranch,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Eye,
  Check,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  FileJson,
  Info,
  Sparkles,
  FolderGit2,
} from "lucide-react";
import {
  scanTokenHealth,
  auditSystemAccessibility,
  computeThemeCoverage,
} from "@/utils/dashboardHelpers";
import { OnboardingModal } from "@/components/OnboardingModal";

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
    focusTokenInMatrix,
    setActiveSet,
  } = useTokenStore();

  const [selectedIssueTab, setSelectedIssueTab] = useState<"all" | "errors" | "warnings">("all");
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const setNames = useMemo(
    () => Object.keys(rawTokens).filter((k) => !k.startsWith("$")),
    [rawTokens]
  );
  const totalTokens = resolvedTokens.length;
  const isConnected = Boolean(credentials.repo && credentials.owner);

  // 1. Dynamic Health Report
  const healthReport = useMemo(
    () => scanTokenHealth(rawTokens, resolvedTokens),
    [rawTokens, resolvedTokens]
  );

  // 2. Dynamic Accessibility Audit Report
  const a11yReport = useMemo(
    () => auditSystemAccessibility(rawTokens, themeGroups, resolvedTokens),
    [rawTokens, themeGroups, resolvedTokens]
  );

  // 3. Dynamic Theme Coverage Matrix
  const themeCoverage = useMemo(
    () => computeThemeCoverage(rawTokens, themeGroups),
    [rawTokens, themeGroups]
  );

  // Filter issues based on tab
  const filteredIssues = useMemo(() => {
    if (selectedIssueTab === "errors") {
      return healthReport.issues.filter((i) => i.severity === "error");
    }
    if (selectedIssueTab === "warnings") {
      return healthReport.issues.filter((i) => i.severity !== "error");
    }
    return healthReport.issues;
  }, [healthReport.issues, selectedIssueTab]);

  // Category counts
  const colorCount = resolvedTokens.filter((t) => t.type === "color").length;
  const typoCount = resolvedTokens.filter((t) => t.type === "typography").length;
  const spacingCount = resolvedTokens.filter(
    (t) => t.type === "spacing" || t.type === "sizing" || t.type === "dimension"
  ).length;
  const radiusCount = resolvedTokens.filter((t) => t.type === "borderRadius").length;
  const otherCount = totalTokens - (colorCount + typoCount + spacingCount + radiusCount);

  // Handle jump to broken token in Token Editor or Theme Matrix
  const handleJumpToToken = (setName: string, tokenKey: string) => {
    setActiveSet(setName);
    setSidebarTab("tokens");
  };

  // If no tokens or sync provider is connected, render the Welcome & Setup Wizard
  if (totalTokens === 0) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-slate-50/50 dark:bg-[#09090d] p-6 lg:p-12 flex flex-col justify-center max-w-5xl mx-auto space-y-8 font-sans select-none">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/80 text-violet-700 dark:text-violet-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to Second Screen</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Connect your design system
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Configure your Git sync provider, initialize from a starter design system template, or connect our companion Figma plugin to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Connect Git Provider */}
          <div
            onClick={onOpenSettings}
            className="group relative p-6 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 hover:border-violet-500/60 shadow-sm hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/60 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  1. Connect Git Provider
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Sync tokens directly with <strong>Azure DevOps</strong> or <strong>GitHub</strong> branches and auto-discover token folders.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
              <span>Configure Provider</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Starter Templates & Import */}
          <div
            onClick={() => setIsOnboardingOpen(true)}
            className="group relative p-6 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-500/60 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  2. Starter Templates
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Choose from <strong>Design System Starter</strong>, <strong>Multi-Brand Themes</strong>, or <strong>Tailwind Primitives</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Choose Template</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Figma Plugin Sync */}
          <div
            onClick={onOpenSettings}
            className="group relative p-6 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 hover:border-blue-500/60 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  3. Figma Plugin (PAT)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Generate a Personal Access Token to pull native Figma Variables & push changes bi-directionally.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Plugin Settings</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => useTokenStore.getState().loadSampleData()}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline underline-offset-4 cursor-pointer"
          >
            Or explore with sample tokens data
          </button>
        </div>

        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onOpenSettings={onOpenSettings || (() => {})}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/50 dark:bg-[#09090d] p-6 lg:p-8 space-y-8 font-sans select-none">
      {/* 1. Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <LayoutDashboard className="w-4 h-4" />
            <span>Design Tokens Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            System Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Live analytics, token health diagnostics, WCAG accessibility audit, and multi-theme coverage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLiveTokens()}
            disabled={syncStatus === "fetching"}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Fetch fresh tokens from remote Git"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncStatus === "fetching" ? "animate-spin text-emerald-500" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/50 shadow-xs transition-all cursor-pointer"
            title="Start from template or import"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span>Templates & Import</span>
          </button>

          <button
            onClick={() => setSidebarTab("themes")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Open Themes</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Live Dynamic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: System Health Score */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>System Health</span>
            <div
              className={`p-2 rounded-xl ${
                healthReport.overallScore >= 90
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                  : healthReport.overallScore >= 75
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                  : "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white">
                {healthReport.overallScore}
              </span>
              <span className="text-xs text-zinc-400 font-mono">/ 100</span>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
              {healthReport.brokenAliasesCount === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ 0 broken aliases
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  ⚠ {healthReport.brokenAliasesCount} broken alias issues
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: WCAG Accessibility Pass Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>WCAG AA Compliance</span>
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white">
                {a11yReport.passRateAA}%
              </span>
              <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                (AAA: {a11yReport.passRateAAA}%)
              </span>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {a11yReport.failingPairsCount === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  All evaluated text/bg pairs pass
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {a11yReport.failingPairsCount} pairs need contrast review
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 3: Total Tokens & Semantic Adherence */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>Tokens & Adherence</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white">
                {totalTokens}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                in {setNames.length} sets
              </span>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {healthReport.semanticAdherenceRate}%
              </span>{" "}
              semantic aliasing rate
            </div>
          </div>
        </div>

        {/* KPI 4: Git Connection & Branch */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>Git Repository</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
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
                <button
                  onClick={onOpenSettings}
                  className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Click to connect repo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Grid: Token Linter (Left) + Accessibility Audit (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Token Health & Linter */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Token Linter & Issues
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {healthReport.issues.length} detected integrity issues
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setSelectedIssueTab("all")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedIssueTab === "all"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                All ({healthReport.issues.length})
              </button>
              <button
                onClick={() => setSelectedIssueTab("errors")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedIssueTab === "errors"
                    ? "bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 font-semibold shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Errors ({healthReport.brokenAliasesCount})
              </button>
            </div>
          </div>

          {/* Issue List */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {filteredIssues.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                  No token issues detected!
                </p>
                <p className="text-[11px] mt-0.5">
                  All aliases resolve cleanly to real leaf nodes.
                </p>
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => handleJumpToToken(issue.setName, issue.tokenKey)}
                  className="group p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          issue.severity === "error"
                            ? "bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300"
                            : "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {issue.type.replace("_", " ")}
                      </span>
                      <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {issue.tokenKey}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        in {issue.setName}.json
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {issue.message}
                    </p>
                    {issue.suggestedFix && (
                      <p className="text-[11px] text-zinc-500 italic">
                        Tip: {issue.suggestedFix}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
                </div>
              ))
            )}
          </div>

          {/* Semantic Adherence Bar */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <span>Semantic Adherence Level</span>
              <span className="font-mono">{healthReport.semanticAdherenceRate}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                style={{ width: `${healthReport.semanticAdherenceRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Accessibility & Contrast Scorecard */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800/50">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Accessibility & Contrast Matrix
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Evaluated across active themes (WCAG 2.1)
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/50">
              {a11yReport.passRateAA}% AA Pass
            </span>
          </div>

          {/* Failing Pairs or All Pass */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {a11yReport.failingPairs.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Great contrast compliance!
                </p>
                <p className="text-[11px] mt-0.5">
                  All evaluated text/background token combinations meet minimum WCAG AA standards (4.5:1).
                </p>
              </div>
            ) : (
              a11yReport.failingPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 font-mono">
                    <div
                      className="w-5 h-5 rounded-md border border-black/20 dark:border-white/20 shadow-xs flex-shrink-0"
                      style={{ backgroundColor: pair.fgColor }}
                      title={`FG: ${pair.fgColor}`}
                    />
                    <span className="text-zinc-400">on</span>
                    <div
                      className="w-5 h-5 rounded-md border border-black/20 dark:border-white/20 shadow-xs flex-shrink-0"
                      style={{ backgroundColor: pair.bgColor }}
                      title={`BG: ${pair.bgColor}`}
                    />
                    <span className="truncate text-zinc-800 dark:text-zinc-200 font-medium">
                      {pair.fgToken} / {pair.bgToken}
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 font-mono font-bold text-[11px] flex-shrink-0">
                    {pair.contrastRatio}:1 (Fail)
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Color Vision Deficiency (CVD) Simulation Live Strip */}
          {a11yReport.corePaletteCvd.length > 0 && (
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Color Vision Deficiency (CVD) Simulation</span>
                <span className="text-[11px] text-zinc-400 font-normal">
                  Protanopia · Deuteranopia · Tritanopia
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {a11yReport.corePaletteCvd.map((item, idx) => (
                  <div key={idx} className="space-y-1 text-center">
                    <div
                      className="w-full h-7 rounded-lg border border-black/15 dark:border-white/20 shadow-xs"
                      style={{ backgroundColor: item.originalHex }}
                      title={`Original: ${item.name} (${item.originalHex})`}
                    />
                    <div className="grid grid-cols-3 gap-0.5 h-3">
                      <div
                        className="rounded-xs"
                        style={{ backgroundColor: item.protanopia }}
                        title={`Protanopia: ${item.protanopia}`}
                      />
                      <div
                        className="rounded-xs"
                        style={{ backgroundColor: item.deuteranopia }}
                        title={`Deuteranopia: ${item.deuteranopia}`}
                      />
                      <div
                        className="rounded-xs"
                        style={{ backgroundColor: item.tritanopia }}
                        title={`Tritanopia: ${item.tritanopia}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Grid: Theme Coverage (Left) + Distribution & Quick Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Theme Completeness Matrix */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Multi-Theme Coverage
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {themeCoverage.length} configured theme options
                </p>
              </div>
            </div>

            <button
              onClick={() => setSidebarTab("themes")}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Themes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {themeCoverage.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                No theme groups configured yet.
              </div>
            ) : (
              themeCoverage.map((theme) => (
                <div
                  key={theme.id}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: theme.color || "#10b981" }}
                      />
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {theme.name}
                      </span>
                      <span className="text-zinc-400 font-mono text-[11px]">
                        ({theme.groupName})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-zinc-500">
                        {theme.overriddenTokensCount} / {theme.totalTokensCount} tokens
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {theme.completenessPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${theme.completenessPercent}%`,
                        backgroundColor: theme.color || "#10b981",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Token Distribution & Code Exporter Quick Tools */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Category Breakdown
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Distribution of active token types
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono text-zinc-400">
                {totalTokens} total
              </span>
            </div>

            {/* Category Progress Bar */}
            {totalTokens > 0 && (
              <div className="space-y-2">
                <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
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
                    style={{ width: `${(spacingCount / totalTokens) * 100}%` }}
                    className="bg-blue-500 h-full"
                    title={`Spacing & Sizing: ${spacingCount}`}
                  />
                  <div
                    style={{ width: `${(radiusCount / totalTokens) * 100}%` }}
                    className="bg-rose-500 h-full"
                    title={`Border Radius: ${radiusCount}`}
                  />
                  <div
                    style={{ width: `${(otherCount / totalTokens) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title={`Other: ${otherCount}`}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                    <div className="text-zinc-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Color
                    </div>
                    <div className="text-base font-bold font-mono text-zinc-900 dark:text-white mt-0.5">
                      {colorCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                    <div className="text-zinc-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-violet-500" /> Typography
                    </div>
                    <div className="text-base font-bold font-mono text-zinc-900 dark:text-white mt-0.5">
                      {typoCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                    <div className="text-zinc-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Spacing
                    </div>
                    <div className="text-base font-bold font-mono text-zinc-900 dark:text-white mt-0.5">
                      {spacingCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                    <div className="text-zinc-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" /> Radius
                    </div>
                    <div className="text-base font-bold font-mono text-zinc-900 dark:text-white mt-0.5">
                      {radiusCount}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Onboarding & Starter Templates Modal */}
      {isOnboardingOpen && (
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onOpenSettings={onOpenSettings || (() => {})}
        />
      )}
    </div>
  );
};
