"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  LayoutDashboard,
  Palette,
  Layers,
  GitBranch,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Eye,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  FolderGit2,
  ArrowRight,
} from "lucide-react";
import {
  scanTokenHealth,
  auditSystemAccessibility,
  computeThemeCoverage,
} from "@/utils/dashboardHelpers";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

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
    setSidebarTab,
    fetchLiveTokens,
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

  const handleJumpToToken = (setName: string) => {
    setActiveSet(setName);
    setSidebarTab("tokens");
  };

  // If no tokens or sync provider is connected, render Welcome Wizard
  if (totalTokens === 0) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-background p-6 lg:p-12 flex flex-col justify-center max-w-5xl mx-auto space-y-8 font-sans select-none">
        <div className="text-center space-y-3">
          <Badge variant="violet" className="gap-1.5 px-3 py-1 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to Tokens Platform</span>
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Connect your design system
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Configure your Git sync provider, initialize from a starter design system template, or connect our companion Figma plugin to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Connect Git Provider */}
          <Card
            onClick={onOpenSettings}
            className="cursor-pointer hover:border-primary transition-all flex flex-col justify-between"
          >
            <CardHeader className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-base">1. Connect Git Provider</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Sync tokens directly with <strong>Azure DevOps</strong> or <strong>GitHub</strong> branches.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button size="sm" className="w-full gap-1.5">
                <span>Configure Git</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Starter Templates */}
          <Card
            onClick={() => setIsOnboardingOpen(true)}
            className="cursor-pointer hover:border-primary transition-all flex flex-col justify-between"
          >
            <CardHeader className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-base">2. Starter Templates</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Initialize from multi-brand presets or import Tokens Studio JSON.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <span>Explore Templates</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Figma Companion Plugin */}
          <Card
            onClick={onOpenSettings}
            className="cursor-pointer hover:border-primary transition-all flex flex-col justify-between"
          >
            <CardHeader className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-base">3. Figma Plugin</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Install our companion plugin to sync Variables and Theme Modes.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <span>Get Plugin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
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
    <div className="flex-1 h-full overflow-y-auto bg-background p-6 lg:p-8 space-y-8 font-sans select-none">
      {/* 1. Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <LayoutDashboard className="w-4 h-4" />
            <span>Design Tokens Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            System Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Live analytics, token health diagnostics, WCAG accessibility audit, and multi-theme coverage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLiveTokens()}
            disabled={syncStatus === "fetching"}
            className="gap-2 text-xs h-9"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncStatus === "fetching" ? "animate-spin text-primary" : ""}`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOnboardingOpen(true)}
            className="gap-2 text-xs h-9"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Templates & Import</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setSidebarTab("themes")}
            className="gap-2 text-xs h-9 font-semibold"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Open Themes</span>
          </Button>
        </div>
      </div>

      {/* 2. Top 4 Live Dynamic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: System Health Score */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>System Health</span>
            <div
              className={`p-2 rounded-lg ${
                healthReport.overallScore >= 90
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : healthReport.overallScore >= 75
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-foreground">
                {healthReport.overallScore}
              </span>
              <span className="text-xs text-muted-foreground font-mono">/ 100</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              {healthReport.brokenAliasesCount === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ 0 broken aliases
                </span>
              ) : (
                <span className="text-destructive font-medium">
                  ⚠ {healthReport.brokenAliasesCount} broken alias issues
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* KPI 2: WCAG Accessibility Pass Rate */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>WCAG AA Compliance</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-foreground">
                {a11yReport.passRateAA}%
              </span>
              <span className="text-xs text-primary font-medium">
                (AAA: {a11yReport.passRateAAA}%)
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
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
        </Card>

        {/* KPI 3: Total Tokens & Semantic Adherence */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Tokens & Adherence</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-foreground">
                {totalTokens}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                in {setNames.length} sets
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-primary">
                {healthReport.semanticAdherenceRate}%
              </span>{" "}
              semantic aliasing rate
            </div>
          </div>
        </Card>

        {/* KPI 4: Git Connection & Branch */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Git Repository</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold font-mono text-foreground truncate">
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
        </Card>
      </div>

      {/* 3. Middle Grid: Token Linter (Left) + Accessibility Audit (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Token Health & Linter */}
        <Card className="p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Token Linter & Issues
                </h3>
                <p className="text-xs text-muted-foreground">
                  {healthReport.issues.length} detected integrity issues
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-muted p-0.5 rounded-lg text-xs font-medium border border-border">
              <button
                onClick={() => setSelectedIssueTab("all")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedIssueTab === "all"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({healthReport.issues.length})
              </button>
              <button
                onClick={() => setSelectedIssueTab("errors")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedIssueTab === "errors"
                    ? "bg-background text-destructive font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Errors ({healthReport.brokenAliasesCount})
              </button>
            </div>
          </div>

          {/* Issue List */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {filteredIssues.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                <p className="font-semibold text-foreground">
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
                  onClick={() => handleJumpToToken(issue.setName)}
                  className="group p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-all cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={issue.severity === "error" ? "destructive" : "warning"}
                        className="text-[10px] font-mono font-bold uppercase"
                      >
                        {issue.type.replace("_", " ")}
                      </Badge>
                      <span className="font-mono text-xs font-semibold text-foreground truncate">
                        {issue.tokenKey}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        in {issue.setName}.json
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80">
                      {issue.message}
                    </p>
                    {issue.suggestedFix && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Tip: {issue.suggestedFix}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
                </div>
              ))
            )}
          </div>

          {/* Semantic Adherence Bar */}
          <div className="pt-2 border-t border-border space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Semantic Adherence Level</span>
              <span className="font-mono">{healthReport.semanticAdherenceRate}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${healthReport.semanticAdherenceRate}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Right Column: Accessibility & Contrast Scorecard */}
        <Card className="p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Accessibility & Contrast Matrix
                </h3>
                <p className="text-xs text-muted-foreground">
                  Evaluated across active themes (WCAG 2.1)
                </p>
              </div>
            </div>

            <Badge variant="success" className="font-mono text-xs font-bold">
              {a11yReport.passRateAA}% AA Pass
            </Badge>
          </div>

          {/* Failing Pairs or All Pass */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {a11yReport.failingPairs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                <p className="font-semibold text-foreground">
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
                  className="p-3 rounded-lg bg-card border border-border flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 font-mono">
                    <div
                      className="w-5 h-5 rounded-md border border-black/20 dark:border-white/20 shadow-xs flex-shrink-0"
                      style={{ backgroundColor: pair.fgColor }}
                      title={`FG: ${pair.fgColor}`}
                    />
                    <span className="text-muted-foreground">on</span>
                    <div
                      className="w-5 h-5 rounded-md border border-black/20 dark:border-white/20 shadow-xs flex-shrink-0"
                      style={{ backgroundColor: pair.bgColor }}
                      title={`BG: ${pair.bgColor}`}
                    />
                    <span className="truncate text-foreground font-medium">
                      {pair.fgToken} / {pair.bgToken}
                    </span>
                  </div>

                  <Badge variant="destructive" className="font-mono font-bold text-[11px] flex-shrink-0">
                    {pair.contrastRatio}:1 (Fail)
                  </Badge>
                </div>
              ))
            )}
          </div>

          {/* CVD Simulation Live Strip */}
          {a11yReport.corePaletteCvd.length > 0 && (
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Color Vision Deficiency (CVD) Simulation</span>
                <span className="text-[11px] text-muted-foreground font-normal">
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
        </Card>
      </div>

      {/* 4. Bottom Grid: Theme Coverage (Left) + Distribution & Quick Tools (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Theme Completeness Matrix */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Multi-Theme Coverage
                </h3>
                <p className="text-xs text-muted-foreground">
                  {themeCoverage.length} configured theme options
                </p>
              </div>
            </div>

            <Button
              variant="link"
              size="sm"
              onClick={() => setSidebarTab("themes")}
              className="text-xs gap-1"
            >
              <span>Manage Themes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {themeCoverage.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No theme groups configured yet.
              </div>
            ) : (
              themeCoverage.map((theme) => (
                <div
                  key={theme.id}
                  className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: theme.color || "#7c3aed" }}
                      />
                      <span className="font-bold text-foreground">
                        {theme.name}
                      </span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        ({theme.groupName})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-muted-foreground">
                        {theme.overriddenTokensCount} / {theme.totalTokensCount} tokens
                      </span>
                      <span className="font-bold text-foreground">
                        {theme.completenessPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${theme.completenessPercent}%`,
                        backgroundColor: theme.color || "#7c3aed",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Right: Token Distribution */}
        <Card className="p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Category Breakdown
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Distribution of active token types
                  </p>
                </div>
              </div>

              <Badge variant="outline" className="font-mono text-xs">
                {totalTokens} total
              </Badge>
            </div>

            {/* Category Progress Bar */}
            {totalTokens > 0 && (
              <div className="space-y-2">
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
                  <div
                    style={{ width: `${(colorCount / totalTokens) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title={`Colors: ${colorCount}`}
                  />
                  <div
                    style={{ width: `${(typoCount / totalTokens) * 100}%` }}
                    className="bg-primary h-full"
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
                    className="bg-muted-foreground h-full"
                    title={`Other: ${otherCount}`}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Color
                    </div>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {colorCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary" /> Typography
                    </div>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {typoCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Spacing
                    </div>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {spacingCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" /> Radius
                    </div>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {radiusCount}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
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
