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
  Settings,
  Building2,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Crown,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { getValidTokenSetNames } from "@/utils/themeHelpers";
import { countTokensInDocument } from "@/utils/transformTokens";

const ICON_PRESETS = ["🏢", "🪐", "🚀", "🎨", "💻", "🎯", "⚡", "💎", "🌟", "🛡️"];
const COLOR_PRESETS = [
  "#171717",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#0f172a",
];

export const DashboardView: React.FC = () => {
  const {
    currentOrg,
    userOrgs,
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
    getCurrentUserRole,
    updateOrgAction,
    deleteOrgAction,
    addToast,
  } = useTokenStore();

  const [showCreateProj, setShowCreateProj] = useState(false);

  // Organization Settings Modal State
  const [showOrgSettingsModal, setShowOrgSettingsModal] = useState(false);
  const [orgFormName, setOrgFormName] = useState("");
  const [orgFormIcon, setOrgFormIcon] = useState("🏢");
  const [orgFormColor, setOrgFormColor] = useState("#171717");
  const [orgFormLogoUrl, setOrgFormLogoUrl] = useState("");
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [copiedOrgId, setCopiedOrgId] = useState(false);
  const [showDeleteOrgConfirm, setShowDeleteOrgConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);

  const userRole = getCurrentUserRole();
  const isOwner = currentOrg?.ownerUid === currentUser?.uid || userRole === "owner";
  const canManageOrg = isOwner || userRole === "admin";

  const handleOpenOrgSettings = () => {
    if (!currentOrg) return;
    setOrgFormName(currentOrg.name);
    setOrgFormIcon(currentOrg.icon || "🏢");
    setOrgFormColor(currentOrg.color || "#171717");
    setOrgFormLogoUrl(currentOrg.logoUrl || "");
    setShowDeleteOrgConfirm(false);
    setDeleteConfirmText("");
    setShowOrgSettingsModal(true);
  };

  const handleSaveOrgSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !orgFormName.trim()) return;

    setIsSavingOrg(true);
    try {
      await updateOrgAction(currentOrg.id, {
        name: orgFormName.trim(),
        icon: orgFormIcon,
        color: orgFormColor,
        logoUrl: orgFormLogoUrl.trim(),
      });
      addToast({
        type: "success",
        title: "Organization Settings Saved",
        message: `Updated workspace details for "${orgFormName.trim()}".`,
      });
      setShowOrgSettingsModal(false);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update organization.",
      });
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleCopyOrgId = () => {
    if (!currentOrg) return;
    navigator.clipboard.writeText(currentOrg.id);
    setCopiedOrgId(true);
    setTimeout(() => setCopiedOrgId(false), 2000);
    addToast({
      type: "success",
      title: "Organization ID Copied",
      message: "Copied organization identifier to clipboard.",
    });
  };

  const handleDeleteOrganization = async () => {
    if (!currentOrg) return;
    setIsDeletingOrg(true);
    try {
      await deleteOrgAction(currentOrg.id);
      addToast({
        type: "info",
        title: "Organization Deleted",
        message: `Removed organization "${currentOrg.name}".`,
      });
      setShowDeleteOrgConfirm(false);
      setShowOrgSettingsModal(false);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: err.message || "Failed to delete organization.",
      });
    } finally {
      setIsDeletingOrg(false);
    }
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
          {/* Breadcrumbs matching Screenshot 2 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground select-none">
            <button
              onClick={() => setSidebarTab("workspaces")}
              className="hover:text-foreground hover:underline transition-colors font-medium cursor-pointer"
            >
              Workspaces
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">{orgName}</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-muted-foreground">Overview</span>
          </div>

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
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground tracking-tight">
                    <span>{orgName}</span>
                  </h1>
                  {canManageOrg && (
                    <button
                      onClick={() => setSidebarTab("org-settings")}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                      title="Edit Organization Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium">Workspace</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarTab("org-settings")}
                className="gap-1.5 text-xs font-semibold cursor-pointer border-border hover:bg-muted/80 shadow-2xs"
                title="Organization Settings"
              >
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Org Settings</span>
              </Button>

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
                  onClick={() => setShowCreateProj(true)}
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
                  const tokenCount = countTokensInDocument(proj.rawTokens);
                  const setsCount = proj.rawTokens
                    ? getValidTokenSetNames(proj.rawTokens).length
                    : 0;
                  const themesCount = proj.themeGroups?.length || 0;

                  return (
                    <div
                      key={proj.id}
                      onClick={() => handleOpenProject(proj)}
                      className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shadow-2xs shrink-0 group-hover:scale-105 transition-transform overflow-hidden ${
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

                      {/* Stats */}
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
              onClick={() => setSidebarTab("org-settings")}
              className="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all cursor-pointer shadow-2xs space-y-2 group"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs group-hover:text-primary transition-colors">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Workspace &amp; Org Settings</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Configure brand colors, organization name, emoji icon, and general workspace details.
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

      {/* Organization Settings Modal */}
      <Dialog open={showOrgSettingsModal} onOpenChange={setShowOrgSettingsModal}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden font-sans border-border">
          <DialogHeader className="p-5 border-b border-border/70 bg-card/60">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-xs shrink-0"
                style={{ backgroundColor: orgFormColor || "#171717" }}
              >
                <span>{orgFormIcon || "🏢"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <span>Organization Settings</span>
                  <Badge variant="outline" className="text-[10px] font-mono capitalize">
                    {userRole}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                  Manage branding, identity and configuration for {orgName}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveOrgSettings}>
            <Tabs defaultValue="general" className="w-full">
              <div className="px-5 pt-3 border-b border-border/60 bg-muted/20">
                <TabsList className="bg-muted/60 p-0.5 h-8">
                  <TabsTrigger value="general" className="text-xs px-3 py-1">
                    General
                  </TabsTrigger>
                  <TabsTrigger value="info" className="text-xs px-3 py-1">
                    Workspace Info
                  </TabsTrigger>
                  {isOwner && (
                    <TabsTrigger value="danger" className="text-xs px-3 py-1 text-destructive">
                      Danger Zone
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              {/* Tab 1: General Identity & Branding */}
              <TabsContent value="general" className="p-5 space-y-4 m-0 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Workspace Name</Label>
                  <Input
                    value={orgFormName}
                    onChange={(e) => setOrgFormName(e.target.value)}
                    placeholder="e.g. Planet Design System"
                    disabled={!canManageOrg}
                    className="h-8 text-xs bg-background"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Workspace Icon / Emoji</Label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ICON_PRESETS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setOrgFormIcon(emoji)}
                        disabled={!canManageOrg}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                          orgFormIcon === emoji
                            ? "bg-primary/15 border-2 border-primary scale-105"
                            : "bg-muted/60 hover:bg-muted border border-border"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                    <Input
                      value={orgFormIcon}
                      onChange={(e) => setOrgFormIcon(e.target.value)}
                      placeholder="Emoji"
                      disabled={!canManageOrg}
                      className="w-16 h-8 text-xs text-center bg-background"
                      maxLength={4}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Brand Color</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setOrgFormColor(color)}
                        disabled={!canManageOrg}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer shadow-2xs ${
                          orgFormColor.toLowerCase() === color.toLowerCase()
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                            : "hover:scale-105 opacity-90"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="flex items-center gap-1.5 ml-1">
                      <input
                        type="color"
                        value={orgFormColor}
                        onChange={(e) => setOrgFormColor(e.target.value)}
                        disabled={!canManageOrg}
                        className="w-7 h-7 rounded-md cursor-pointer border border-border bg-background p-0.5"
                      />
                      <Input
                        value={orgFormColor}
                        onChange={(e) => setOrgFormColor(e.target.value)}
                        disabled={!canManageOrg}
                        placeholder="#171717"
                        className="w-24 h-8 text-xs font-mono bg-background"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Logo URL (Optional)</Label>
                  <Input
                    value={orgFormLogoUrl}
                    onChange={(e) => setOrgFormLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    disabled={!canManageOrg}
                    className="h-8 text-xs bg-background"
                  />
                  {orgFormLogoUrl && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                      <img
                        src={orgFormLogoUrl}
                        alt="Logo Preview"
                        className="w-6 h-6 rounded-md object-cover"
                        onError={(e) => ((e.target as any).style.display = "none")}
                      />
                      <span className="text-[11px]">Logo preview</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 2: Workspace Info & Metadata */}
              <TabsContent value="info" className="p-5 space-y-4 m-0 max-h-[60vh] overflow-y-auto text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Organization ID</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={currentOrg?.id || ""}
                      readOnly
                      className="h-8 text-xs font-mono bg-muted/50 flex-1 select-all"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyOrgId}
                      className="h-8 text-xs gap-1.5 px-3"
                    >
                      {copiedOrgId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedOrgId ? "Copied" : "Copy ID"}</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Slug</span>
                    <div className="font-mono text-xs font-semibold text-foreground truncate">{currentOrg?.slug || "org"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Projects</span>
                    <div className="text-xs font-semibold text-foreground font-mono">{orgProjects.length} active</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-semibold text-foreground">Team Management</div>
                      <div className="text-[11px] text-muted-foreground">
                        {currentOrg?.members?.length || 1} team {currentOrg?.members?.length === 1 ? "member" : "members"}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowOrgSettingsModal(false);
                      setSidebarTab("members");
                      setMembersSubTab("members");
                    }}
                    className="text-xs h-7 gap-1"
                  >
                    <span>Manage Members</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 3: Danger Zone */}
              {isOwner && (
                <TabsContent value="danger" className="p-5 space-y-4 m-0 max-h-[60vh] overflow-y-auto">
                  <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
                    <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Delete this Organization</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Permanently delete <strong>{currentOrg?.name}</strong> and all its {orgProjects.length} projects. This action cannot be undone.
                    </p>
                    {userOrgs.length <= 1 ? (
                      <p className="text-[11px] text-amber-600 font-medium">
                        You cannot delete your only organization. Create another workspace first.
                      </p>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteOrgConfirm(true)}
                        className="text-xs h-8 gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Organization</span>
                      </Button>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>

            <DialogFooter className="p-4 border-t border-border/70 bg-card/60 flex items-center justify-between gap-2 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowOrgSettingsModal(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>

              {canManageOrg && (
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingOrg || !orgFormName.trim()}
                  className="text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingOrg ? "Saving..." : "Save Changes"}</span>
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Org Confirmation Dialog */}
      <Dialog open={showDeleteOrgConfirm} onOpenChange={setShowDeleteOrgConfirm}>
        <DialogContent className="max-w-md p-6 gap-4 font-sans">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete Organization</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This action cannot be undone. This will permanently delete <strong>{currentOrg?.name}</strong> and all associated projects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold text-foreground">
              Type <span className="font-mono text-destructive font-bold">{currentOrg?.name}</span> to confirm:
            </Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={currentOrg?.name}
              className="h-8 text-xs font-mono"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDeleteOrgConfirm(false);
                setDeleteConfirmText("");
              }}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeletingOrg || deleteConfirmText !== currentOrg?.name}
              onClick={handleDeleteOrganization}
              className="text-xs h-8 font-bold gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeletingOrg ? "Deleting..." : "Delete Organization"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
