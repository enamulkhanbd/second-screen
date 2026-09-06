"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { UserActivityItem } from "@/types/tokens";
import { ROLE_DEFINITIONS } from "@/types/tenant";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Activity,
  Sparkles,
  GitCommit,
  GitBranch,
  UploadCloud,
  DownloadCloud,
  Package,
  Users,
  Layers,
  FolderGit2,
  Search,
  Trash2,
  Clock,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Image as ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserActivityDrawer: React.FC<UserActivityDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    currentOrg,
    currentProject,
    getCurrentUserRole,
    userActivities,
    clearUserActivities,
    credentials,
  } = useTokenStore();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const role = getCurrentUserRole();
  const roleDef = ROLE_DEFINITIONS[role];

  // Real workspace activities (no mock fallbacks)
  const allActivities: UserActivityItem[] = useMemo(() => {
    return userActivities || [];
  }, [userActivities]);

  const filteredActivities = useMemo(() => {
    let list = allActivities;
    if (activeFilter !== "all") {
      list = list.filter((a) => a.type === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.actor?.name?.toLowerCase().includes(q) ||
          a.actor?.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allActivities, activeFilter, searchQuery]);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getActivityIcon = (type: UserActivityItem["type"]) => {
    switch (type) {
      case "git":
        return <GitCommit className="w-3.5 h-3.5 text-blue-500" />;
      case "token":
        return <Sparkles className="w-3.5 h-3.5 text-purple-500" />;
      case "figma":
        return <Layers className="w-3.5 h-3.5 text-rose-500" />;
      case "asset":
        return <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />;
      case "release":
        return <Package className="w-3.5 h-3.5 text-amber-500" />;
      case "team":
        return <Users className="w-3.5 h-3.5 text-emerald-500" />;
      case "project":
        return <FolderGit2 className="w-3.5 h-3.5 text-cyan-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-primary" />;
    }
  };

  const getActivityBadgeVariant = (type: UserActivityItem["type"]) => {
    switch (type) {
      case "git":
        return "outline";
      case "token":
        return "secondary";
      case "asset":
        return "secondary";
      case "figma":
        return "outline";
      case "release":
        return "warning";
      case "team":
        return "success";
      default:
        return "outline";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex flex-col h-full bg-background border-l border-border sm:max-w-lg p-0 select-none">
        {/* 1. Header with User Context */}
        <SheetHeader className="p-5 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="text-base font-bold text-foreground">
                  User Activity Log
                </SheetTitle>
              </div>
              <SheetDescription className="text-xs text-muted-foreground truncate">
                Audit trail of token edits, Git operations, releases, and team actions
              </SheetDescription>
            </div>
          </div>

          {/* User Profile Pill */}
          {currentUser && (
            <div className="mt-3 p-2.5 rounded-lg bg-card border border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-8 w-8 rounded-lg flex-shrink-0">
                  {currentUser.avatarUrl && (
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} />
                  )}
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {currentUser.displayName?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-foreground truncate">
                    {currentUser.displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate font-mono">
                    {currentUser.email}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono py-0 px-2 capitalize flex-shrink-0">
                {roleDef.title}
              </Badge>
            </div>
          )}
        </SheetHeader>

        {/* 2. Filter Tabs & Search Bar */}
        <div className="p-3.5 border-b border-border bg-card space-y-2 flex-shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Filter activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs font-mono"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "token", label: "Tokens" },
              { id: "git", label: "Git" },
              { id: "figma", label: "Figma" },
              { id: "asset", label: "Assets" },
              { id: "release", label: "Releases" },
              { id: "team", label: "Team" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === tab.id
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Activity Timeline Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredActivities.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Clock className="w-8 h-8 opacity-40 text-primary/60" />
              <span className="text-xs font-semibold text-foreground">
                {allActivities.length === 0 ? "No activity recorded yet" : "No activity records found"}
              </span>
              <span className="text-[11px] text-muted-foreground max-w-xs">
                {allActivities.length === 0
                  ? "Changes to design tokens, Git operations, releases, and assets will appear here automatically."
                  : searchQuery
                  ? "Try a different search query."
                  : "Try selecting another category filter."}
              </span>
            </div>
          ) : (
            <div className="relative border-l-2 border-border/60 ml-3.5 pl-4 space-y-4">
              {filteredActivities.map((act) => (
                <div key={act.id} className="relative group">
                  {/* Timeline bullet icon */}
                  <div className="absolute -left-[23px] top-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center shadow-2xs">
                    {getActivityIcon(act.type)}
                  </div>

                  {/* Activity Card */}
                  <div className="p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors shadow-2xs space-y-1.5">
                    {/* Top Row: Title & Time */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-foreground">
                          {act.title}
                        </span>
                        <Badge
                          variant={getActivityBadgeVariant(act.type)}
                          className="text-[9px] font-mono py-0 px-1 capitalize"
                        >
                          {act.type}
                        </Badge>
                        {act.projectName && (
                          <Badge
                            variant="outline"
                            className="text-[8px] font-mono py-0 px-1 border-dashed text-muted-foreground"
                          >
                            {act.projectName}
                          </Badge>
                        )}
                      </div>
                      <span
                        className="text-[10px] font-mono text-muted-foreground flex-shrink-0"
                        title={new Date(act.timestamp).toLocaleString()}
                      >
                        {formatTimeAgo(act.timestamp)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {act.description}
                    </p>

                    {/* Metadata tags if present */}
                    {act.metadata && Object.keys(act.metadata).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {Object.entries(act.metadata).map(([k, v]) => (
                          <span
                            key={k}
                            className="px-1.5 py-0.5 rounded bg-muted/70 text-foreground/80 font-mono text-[9px] border border-border/50"
                          >
                            {k}: <span className="font-bold">{String(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actor footer */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/40 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4 rounded-full">
                          {act.actor.avatarUrl && (
                            <AvatarImage src={act.actor.avatarUrl} alt={act.actor.name} />
                          )}
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                            {act.actor.name[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{act.actor.name}</span>
                        {act.actor.role && (
                          <span className="text-[8px] px-1 py-0 rounded bg-muted text-muted-foreground">
                            {act.actor.role}
                          </span>
                        )}
                      </div>
                      <span title={new Date(act.timestamp).toLocaleString()}>
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Footer */}
        <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between flex-shrink-0 text-xs">
          <span className="text-[11px] text-muted-foreground font-mono">
            {filteredActivities.length} {filteredActivities.length === 1 ? "activity" : "activities"} logged
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 text-xs font-semibold cursor-pointer"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
