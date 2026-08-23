"use client";

import React from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Clock,
  GitBranch,
  UploadCloud,
  DownloadCloud,
  Package,
  UserPlus,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ActivityView: React.FC = () => {
  const { currentOrg, currentProject, releases, credentials, currentUser } = useTokenStore();

  const events = [
    {
      id: "ev-1",
      icon: GitBranch,
      iconColor: "text-sky-500",
      title: `Branch synchronized (${credentials.branch || "main"})`,
      subtitle: `Repository: ${credentials.repo || "tokens-repo"}`,
      time: "Just now",
      user: currentUser?.displayName || "You",
    },
    {
      id: "ev-2",
      icon: Package,
      iconColor: "text-violet-500",
      title: releases[0] ? `Release ${releases[0].version} compiled` : "Production Release generated",
      subtitle: "Compiled for Tailwind, CSS Variables, React TS & Flutter",
      time: "10 mins ago",
      user: "System / Compiler",
    },
    {
      id: "ev-3",
      icon: Layers,
      iconColor: "text-emerald-500",
      title: "Theme matrix updated",
      subtitle: "Resolved alias bindings across modes (Light, Dark, Brand)",
      time: "1 hour ago",
      user: currentUser?.displayName || "Lead Designer",
    },
    {
      id: "ev-4",
      icon: UserPlus,
      iconColor: "text-amber-500",
      title: "Workspace member permissions configured",
      subtitle: `Workspace: ${currentOrg?.name || "Organization"}`,
      time: "2 hours ago",
      user: "Owner",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* Header */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              Activity &amp; Audit Log
            </h1>
            <p className="text-[11px] text-muted-foreground">
              History of token revisions, Git commits, releases, and access events for {currentProject?.name || "project"}
            </p>
          </div>
        </div>
      </header>

      {/* Activity Timeline */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4">
        <div className="space-y-3">
          {events.map((ev, idx) => {
            const Icon = ev.icon;
            return (
              <div
                key={ev.id}
                className="p-4 rounded-xl border border-border bg-card flex items-start gap-4 shadow-xs"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className={`w-4 h-4 ${ev.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-foreground truncate">
                      {ev.title}
                    </h3>
                    <span className="text-[11px] text-muted-foreground font-mono flex-shrink-0">
                      {ev.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ev.subtitle}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      By {ev.user}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Verified • Tokens Platform
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
