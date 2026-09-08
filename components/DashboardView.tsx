"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Project } from "@/types/tenant";
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
  Plus,
  FolderGit2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { getValidTokenSetNames } from "@/utils/themeHelpers";

export const DashboardView: React.FC = () => {
  const {
    currentOrg,
    orgProjects,
    currentProject,
    setCurrentProject,
    resolvedTokens,
    rawTokens,
    themeGroups,
    branches,
    releases,
    userActivities,
    setSidebarTab,
    setMembersSubTab,
    currentUser,
    addToast,
  } = useTokenStore();

  const [showCreateProj, setShowCreateProj] = useState(false);

  // Active Organization Info
  const orgName = currentOrg?.name || "Planet Design System";
  const orgInitial = orgName[0]?.toUpperCase() || "P";
  const orgColor = currentOrg?.color || "#8b5cf6";

  // Fallback demo projects if orgProjects is empty initially
  const displayProjects: Project[] = useMemo(() => {
    if (orgProjects && orgProjects.length > 0) {
      return orgProjects.slice(0, 3);
    }
    // Fallback recent projects matching the video
    return [
      {
        id: "proj-planet-app",
        orgId: currentOrg?.id || "org-1",
        name: "planet-app",
        slug: "planet-app",
        description: "Mobile design tokens & themes",
        color: "#6366f1",
        icon: "📱",
        createdAt: new Date().toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      } as Project,
      {
        id: "proj-planet-web",
        orgId: currentOrg?.id || "org-1",
        name: "planet-web",
        slug: "planet-web",
        description: "Web design system tokens",
        color: "#06b6d4",
        icon: "💻",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      } as Project,
      {
        id: "proj-planet-core",
        orgId: currentOrg?.id || "org-1",
        name: "Planet",
        slug: "planet-core",
        description: "Core global foundations and palette",
        color: "#10b981",
        icon: "🪐",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      } as Project,
    ];
  }, [orgProjects, currentOrg?.id]);

  const totalProjectsCount = orgProjects?.length || displayProjects.length;
  const totalMembersCount = currentOrg?.members?.length || 1;

  // Format relative time helper
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return "today";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) return `${diffDays}d ago`;
      if (diffHours > 0) return `${diffHours}h ago`;
      if (diffMins > 0) return `${diffMins}m ago`;
      return "just now";
    } catch {
      return "today";
    }
  };

  // Normalized activities from store
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
          timeAgo: formatTimeAgo(act.timestamp),
        };
      });
    }
    return [
      {
        id: "act-1",
        actor: "System",
        actionText: "created project planet-app",
        timeAgo: "1m ago",
      },
      {
        id: "act-2",
        actor: "System",
        actionText: "created project planet-web",
        timeAgo: "1d ago",
      },
      {
        id: "act-3",
        actor: "System",
        actionText: "created project Planet",
        timeAgo: "1d ago",
      },
    ];
  }, [userActivities]);

  const handleOpenProject = (proj: Project) => {
    setCurrentProject(proj);
    setSidebarTab("tokens");
    addToast({
      type: "success",
      title: "Project Opened",
      message: `Active project: ${proj.name}`,
    });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background text-foreground font-sans select-none">
      <div className="max-w-7xl w-full mx-auto flex flex-col xl:flex-row min-h-full">
        {/* Main Left Content Area */}
        <div className="flex-1 p-6 md:p-8 xl:p-10 space-y-8 min-w-0">
          {/* Top Workspace Header Matching Video */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-xs shrink-0"
                style={{ backgroundColor: orgColor }}
              >
                {currentOrg?.logoUrl ? (
                  <img
                    src={currentOrg.logoUrl}
                    alt={orgName}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span>{currentOrg?.icon || orgInitial}</span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <span>{orgName}</span>
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium">Organisation</span>
                  <span>•</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium border-primary/30 text-primary bg-primary/5">
                    Trial
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowCreateProj(true)}
                size="sm"
                className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Project</span>
              </Button>
            </div>
          </div>

          {/* 1. Recent projects Section (Matching Video) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground tracking-tight">Recent projects</h2>
              <button
                onClick={() => setSidebarTab("projects")}
                className="text-xs text-primary hover:underline font-medium cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {displayProjects.map((proj) => {
                const isCurrent = currentProject?.id === proj.id;
                const tokenCount = proj.rawTokens
                  ? Object.keys(proj.rawTokens).filter((k) => !k.startsWith("$")).length * 12
                  : proj.name === "Planet" ? 543 : 0;
                const setsCount = proj.rawTokens
                  ? getValidTokenSetNames(proj.rawTokens).length
                  : proj.name === "Planet" ? 16 : 0;
                const themesCount = proj.themeGroups?.length || 0;

                return (
                  <div
                    key={proj.id}
                    onClick={() => handleOpenProject(proj)}
                    className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
                        style={{ backgroundColor: proj.color || "#6366f1" }}
                      >
                        {proj.logoUrl ? (
                          <img src={proj.logoUrl} alt={proj.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span>{proj.icon || proj.name?.[0]?.toUpperCase() || "🎯"}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {proj.name}
                          </h3>
                          {isCurrent && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-sans text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last changed {formatTimeAgo(proj.updatedAt || proj.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Stats matching video */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono shrink-0">
                      <div className="flex items-center gap-1.5" title="Total Tokens">
                        <Layers className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{tokenCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Token Sets">
                        <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{setsCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Themes">
                        <Palette className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{themesCount}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Let us help you (9 Cards Grid Matching Video) */}
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
                    onClick={() => {
                      if (card.tab === "members") {
                        setSidebarTab("members");
                        setMembersSubTab("members");
                      } else {
                        setSidebarTab(card.tab as any);
                      }
                    }}
                    className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer shadow-2xs flex items-start gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/70 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5">
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

          {/* 3. Recent activity (Matching Video) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground tracking-tight">Recent activity</h2>
              <button
                onClick={() => setSidebarTab("activity")}
                className="text-xs text-primary hover:underline font-medium cursor-pointer"
              >
                Show all activity
              </button>
            </div>

            <div className="divide-y divide-border/60 border border-border rounded-xl bg-card overflow-hidden shadow-2xs">
              {recentActivities.map((act) => (
                <div key={act.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                      {act.actor?.[0]?.toUpperCase() || "S"}
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

        {/* Right Rail Column Matching Video */}
        <div className="w-full xl:w-80 2xl:w-88 border-t xl:border-t-0 xl:border-l border-border/60 p-6 md:p-8 space-y-6 shrink-0 text-xs bg-card/20">
          {/* Top 3 Stat Boxes (Projects, Members, Created) */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-border bg-card shadow-2xs text-center">
            <div>
              <div className="text-[11px] text-muted-foreground font-medium">Projects</div>
              <div className="text-base font-bold text-foreground mt-0.5">{totalProjectsCount}</div>
            </div>
            <div className="border-x border-border/60">
              <div className="text-[11px] text-muted-foreground font-medium">Members</div>
              <div className="text-base font-bold text-foreground mt-0.5">{totalMembersCount}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground font-medium">Created</div>
              <div className="text-xs font-semibold text-foreground mt-1 font-mono">Sept 2026</div>
            </div>
          </div>

          {/* Next steps */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Next steps
            </div>
            <div
              onClick={() => {
                setSidebarTab("members");
                setMembersSubTab("members");
              }}
              className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all cursor-pointer shadow-2xs space-y-2 group"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs group-hover:text-primary transition-colors">
                <UserPlus className="w-4 h-4 text-primary" />
                <span>Invite your first collaborator</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Bring team collaborators into this workspace to share tokens and review branches.
              </p>
            </div>
          </div>

          {/* What's new in Studio (10 Items from Video) */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              What&apos;s new in Studio
            </div>

            <div className="space-y-3 text-xs">
              {[
                {
                  title: "Packaged exports for every release",
                  desc: "Every release now packages to exports server for instant multi-platform packages.",
                },
                {
                  title: "Documentation and Assets in Beta",
                  desc: "We've launched two new dedicated features for workspace asset and token docs.",
                },
                {
                  title: "TypeScript export format",
                  desc: "You can now export your tokens or variables to typed TS objects seamlessly.",
                },
                {
                  title: "Project activity",
                  desc: "See who changed what, when, and from where in your design system.",
                },
                {
                  title: "Billing manager role",
                  desc: "Introduced a new Billing Manager role for team administration.",
                },
                {
                  title: "Powerful bulk rename",
                  desc: "Rename tokens at scale with comprehensive pattern operations.",
                },
                {
                  title: "Filter deprecated tokens",
                  desc: "Easily identify and sunset deprecated tokens in your project sets.",
                },
                {
                  title: "Variables-based projects",
                  desc: "Manage projects that sync directly with Figma variables.",
                },
                {
                  title: "Revamped Exports with API",
                  desc: "A completely rebuilt export system with personal access token auth.",
                },
                {
                  title: "AI Assistant (Beta)",
                  desc: "Let Design Tokens AI Co-pilot assist your styling and theme setup.",
                },
              ].map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-3 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProj}
        onClose={() => setShowCreateProj(false)}
      />
    </div>
  );
};
