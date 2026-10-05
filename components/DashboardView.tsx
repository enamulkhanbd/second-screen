"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTokenStore } from "@/store/useTokenStore";
import { Project } from "@/types/tenant";
import {
  Figma,
  HelpCircle,
  Palette,
  GitBranch,
  ArrowUpToLine,
  Layers,
  Users,
  Package,
  Terminal,
  Plus,
  FolderGit2,
  ChevronRight,
  UserPlus,
  Settings,
  Building2,
  Check,
  Trash2,
  AlertTriangle,
  Crown,
  Save,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useShallow } from "zustand/react/shallow";

const CreateProjectModal = dynamic(
  () => import("@/components/CreateProjectModal").then((module) => module.CreateProjectModal),
  { ssr: false }
);

export const DashboardView: React.FC = () => {
  const {
    currentOrg,
    orgProjects,
    currentProject,
    setCurrentProject,
    userActivities,
    setSidebarTab,
    setMembersSubTab,
    currentUser,
    getCurrentUserRole,
    addToast,
  } = useTokenStore(
    useShallow((state) => ({
      currentOrg: state.currentOrg,
      orgProjects: state.orgProjects,
      currentProject: state.currentProject,
      setCurrentProject: state.setCurrentProject,
      userActivities: state.userActivities,
      setSidebarTab: state.setSidebarTab,
      setMembersSubTab: state.setMembersSubTab,
      currentUser: state.currentUser,
      getCurrentUserRole: state.getCurrentUserRole,
      addToast: state.addToast,
    }))
  );

  const [showCreateProj, setShowCreateProj] = useState(false);
  const [hasOpenedCreateProj, setHasOpenedCreateProj] = useState(false);

  const handleOpenCreateProject = () => {
    setHasOpenedCreateProj(true);
    setShowCreateProj(true);
  };

  const userRole = getCurrentUserRole();
  const isOwner = currentOrg?.ownerUid === currentUser?.uid || userRole === "owner";
  const canManageOrg = isOwner || userRole === "admin";

  const handleOpenWorkspaceSettings = () => {
    setCurrentProject(null);
    setSidebarTab("org-settings");
  };

  // Active Organization Info
  const orgName = currentOrg?.name || "Planet Design System";
  const orgInitial = orgName[0]?.toUpperCase() || "P";
  const orgColor = currentOrg?.color || "#171717";

  const isCustomOrgColor = useMemo(() => {
    if (!currentOrg?.color) return false;
    const trimmed = currentOrg.color.trim().toLowerCase();
    return !["#171717", "#0a0a0a", "#2e9401", "#2d9401", "#6366f1", "neutral"].includes(trimmed);
  }, [currentOrg?.color]);

  // Only display real projects for this active organization
  const displayProjects: Project[] = useMemo(() => {
    return (orgProjects || []).slice(0, 5);
  }, [orgProjects]);

  const totalProjectsCount = orgProjects?.length || 0;
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

  // Normalized real activities from store
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
    return [];
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
        <div className="flex-1 p-6 md:p-8 xl:p-10 space-y-6 min-w-0">
          {/* Top Workspace Header Matching Video */}
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shadow-xs shrink-0 overflow-hidden ${
                  isCustomOrgColor ? "text-white" : "bg-primary text-primary-foreground"
                }`}
                style={isCustomOrgColor ? { backgroundColor: currentOrg?.color } : undefined}
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
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  <span>{orgName}</span>
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium">Workspace</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenWorkspaceSettings}
                className="gap-1.5 text-xs font-semibold cursor-pointer border-border hover:bg-muted/80 shadow-2xs"
                title="Workspace Settings"
              >
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Workspace Settings</span>
              </Button>

              <Button
                onClick={handleOpenCreateProject}
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

            {displayProjects.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">No projects in this workspace yet</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Create your first design tokens project for {orgName} to get started.
                </p>
                <Button
                  onClick={handleOpenCreateProject}
                  size="sm"
                  className="mt-4 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Project</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayProjects.map((proj) => {
                  const isCurrent = currentProject?.id === proj.id;

                  return (
                    <div
                      key={proj.id}
                      onClick={() => handleOpenProject(proj)}
                      className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shadow-2xs shrink-0 overflow-hidden ${
                            isCustomOrgColor ? "text-white" : "bg-primary text-primary-foreground"
                          }`}
                          style={isCustomOrgColor ? { backgroundColor: currentOrg?.color } : undefined}
                        >
                          {proj.logoUrl ? (
                            <img src={proj.logoUrl} alt={proj.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{proj.name?.[0]?.toUpperCase() || "P"}</span>
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

                      <div className="shrink-0">
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                  tab: "project-settings",
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
                        if (card.id === "figma") {
                          useTokenStore.getState().setProjectSettingsTab("sync");
                        }
                        setSidebarTab(card.tab as any);
                      }
                    }}
                    className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all cursor-pointer shadow-2xs flex items-start gap-3 group"
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
            </div>

            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs">
              {recentActivities.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No recent activity recorded yet in this workspace.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
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
              )}
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

            <div
              onClick={handleOpenWorkspaceSettings}
              className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all cursor-pointer shadow-2xs space-y-2 group"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs group-hover:text-primary transition-colors">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Workspace Settings</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Configure brand colors, workspace name, logo, and general organization details.
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
      {hasOpenedCreateProj && (
        <CreateProjectModal
          isOpen={showCreateProj}
          onClose={() => setShowCreateProj(false)}
        />
      )}
    </div>
  );
};
