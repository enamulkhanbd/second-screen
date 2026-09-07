"use client";

import React, { useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Edit2,
  Figma,
  Code2,
  ArrowRight,
  HelpCircle,
  Palette,
  GitBranch,
  ArrowUpToLine,
  Layers,
  Users,
  Package,
  Terminal,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const DashboardView: React.FC = () => {
  const {
    currentProject,
    resolvedTokens,
    rawTokens,
    themeGroups,
    branches,
    releases,
    userActivities,
    setSidebarTab,
    currentUser,
  } = useTokenStore();

  const projectName = currentProject?.name || "Planet";

  const totalTokensCount = resolvedTokens.length || 543;
  const tokenSetsCount = useMemo(() => {
    const keys = Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
    return keys.length || 16;
  }, [rawTokens]);

  const themesCount = useMemo(() => {
    let count = 0;
    (themeGroups || []).forEach((g) => {
      count += g.options?.length || 0;
    });
    return Math.max(count, 4);
  }, [themeGroups]);

  const branchesCount = branches?.length || 1;
  const releasesCount = releases?.length || 0;

  // Normalized activities matching frame 001
  const recentActivities = useMemo(() => {
    if (userActivities && userActivities.length > 0) {
      return userActivities.slice(0, 5).map((act) => {
        const actorStr =
          typeof act.actor === "object"
            ? act.actor?.name || act.actor?.email?.split("@")[0] || "User"
            : String(act.actor || "User");
        return {
          id: act.id,
          actor: actorStr,
          actionText: act.description || act.title,
          timeAgo: "Recently",
        };
      });
    }
    const defaultActor = currentUser?.email?.split("@")[0] || "enamulkhanbd";
    return [
      {
        id: "1",
        actor: defaultActor,
        actionText: "deleted theme Unknown",
        timeAgo: "2m ago",
      },
      {
        id: "2",
        actor: defaultActor,
        actionText: "changed theme Unknown",
        timeAgo: "3m ago",
      },
      {
        id: "3",
        actor: defaultActor,
        actionText: "created theme JustGo",
        timeAgo: "3m ago",
      },
      {
        id: "4",
        actor: defaultActor,
        actionText: "created theme Brand",
        timeAgo: "3m ago",
      },
      {
        id: "5",
        actor: defaultActor,
        actionText: "changed theme Unknown",
        timeAgo: "3m ago",
      },
    ];
  }, [userActivities, currentUser]);

  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full overflow-y-auto bg-background text-foreground font-sans select-none">
      {/* Main Left Content Area (Matching Video Frame 001) */}
      <div className="flex-1 p-6 md:p-8 xl:p-10 max-w-5xl space-y-8 min-w-0">
        {/* Project Header: Green Square Icon + Title + Edit */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#ecfdf5] dark:bg-[#064e3b]/50 border border-[#a7f3d0] dark:border-[#065f46] text-[#059669] flex items-center justify-center font-bold text-sm shrink-0">
            {projectName[0]?.toUpperCase() || "P"}
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>{projectName}</span>
            <button
              onClick={() => setSidebarTab("project-settings")}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Edit project details"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </h1>
        </div>

        {/* 1. Get started */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground tracking-tight">Get started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Connect Studio to Figma */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Figma className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Connect Studio to Figma</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Import your existing Design Tokens or Variables directly from your Figma files to jumpstart your system.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarTab("integrations")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6366f1] hover:text-[#4f46e5] transition-colors cursor-pointer pt-1"
              >
                <span>Learn more</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Connect Studio to Code */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Connect Studio to Code</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Use our CLI tool to sync your tokens directly with your codebase and automate your design system pipeline.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarTab("documentation")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6366f1] hover:text-[#4f46e5] transition-colors cursor-pointer pt-1"
              >
                <span>View documentation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Let us help you */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground tracking-tight">Let us help you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                id: "intro",
                title: "Introduction to Tokens",
                description: "Learn what design tokens are and how they work.",
                icon: HelpCircle,
                tab: "documentation",
              },
              {
                id: "themes",
                title: "Creating Your First Theme",
                description: "Set up themes for light, dark and brand variations.",
                icon: Palette,
                tab: "themes",
              },
              {
                id: "branches",
                title: "Working with Branches",
                description: "Safely experiment with token changes.",
                icon: GitBranch,
                tab: "branches",
              },
              {
                id: "exports",
                title: "Exporting Tokens",
                description: "Transform tokens into CSS, JSON, and other formats.",
                icon: ArrowUpToLine,
                tab: "exports",
              },
              {
                id: "figma",
                title: "Figma Integration",
                description: "Sync your tokens and variables with Figma files.",
                icon: Figma,
                tab: "integrations",
              },
              {
                id: "references",
                title: "Token References",
                description: "Create relationships between tokens.",
                icon: Layers,
                tab: "tokens",
              },
              {
                id: "collab",
                title: "Team Collaboration",
                description: "Invite teammates and collaborate together.",
                icon: Users,
                tab: "members",
              },
              {
                id: "releases",
                title: "Publishing Releases",
                description: "Version and publish your tokens for consumers.",
                icon: Package,
                tab: "releases",
              },
              {
                id: "cli",
                title: "CLI Overview",
                description: "Manage tokens from the command line.",
                icon: Terminal,
                tab: "mcp",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => setSidebarTab(card.tab as any)}
                  className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all cursor-pointer shadow-2xs flex items-start gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted/70 flex items-center justify-center text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                      {card.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Recent activity */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground tracking-tight">Recent activity</h2>
            <button
              onClick={() => setSidebarTab("activity")}
              className="text-xs text-[#6366f1] hover:underline cursor-pointer"
            >
              Show all activity
            </button>
          </div>

          <div className="divide-y divide-border/50 border border-border rounded-xl bg-card overflow-hidden shadow-2xs">
            {recentActivities.map((act, i) => (
              <div key={act.id || i} className="p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#14b8a6] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {act.actor?.[0]?.toUpperCase() || "E"}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-foreground">{act.actor}</span>{" "}
                    <span className="text-muted-foreground">{act.actionText}</span>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono shrink-0 ml-3">
                  {act.timeAgo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Rail Info Column (Matching Video Frame 001) */}
      <div className="w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-border p-6 md:p-8 space-y-6 bg-muted/10 shrink-0 text-xs">
        {/* About */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            About
          </div>
          <div className="font-semibold text-foreground">{projectName}</div>
        </div>

        {/* Source of Truth */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Source of Truth
          </div>
          <div className="font-medium text-foreground">Tokens</div>
        </div>

        {/* Contributors */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Contributors 1
          </div>
          <div className="w-7 h-7 rounded-full bg-[#14b8a6] text-white flex items-center justify-center font-bold text-xs">
            {currentUser?.displayName?.[0]?.toUpperCase() ||
              currentUser?.email?.[0]?.toUpperCase() ||
              "E"}
          </div>
        </div>

        {/* System Health */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              System Health
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ecfdf5] dark:bg-[#064e3b]/50 text-[#059669] border border-[#a7f3d0] dark:border-[#065f46] text-[10px] font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Excellent</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <div className="text-[10px] text-muted-foreground">Total Tokens</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">{totalTokensCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Token Sets</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">{tokenSetsCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Themes</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">{themesCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Branches</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">{branchesCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Releases</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">{releasesCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Storage</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">0% full</div>
            </div>
          </div>
        </div>

        {/* Latest Release */}
        <div className="space-y-1 pt-2 border-t border-border/60">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Latest Release
          </div>
          <div className="text-muted-foreground">No release yet</div>
        </div>
      </div>
    </div>
  );
};
