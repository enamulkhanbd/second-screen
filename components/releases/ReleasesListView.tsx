"use client";

import React, { useState, useMemo } from "react";
import { buttonProps } from "@/utils/a11y";
import { useTokenStore } from "@/store/useTokenStore";
import { ReleasePackage } from "@/types/tokens";
import {
  Package,
  Plus,
  Search,
  ArrowRight,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ReleasesListViewProps {
  onSelectRelease: (releaseId: string) => void;
  onCreateRelease: () => void;
}

export const ReleasesListView: React.FC<ReleasesListViewProps> = ({
  onSelectRelease,
  onCreateRelease,
}) => {
  const { releases, activeBranch, canUserEdit } = useTokenStore();
  const [searchQuery, setSearchQuery] = useState("");
  const isEditable = canUserEdit();

  // Filter releases by search query
  const filteredReleases = useMemo(() => {
    return releases.filter((rel) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = rel.title.toLowerCase().includes(q);
        const matchesVersion = rel.version.toLowerCase().includes(q);
        const matchesSummary = (rel.summary || "").toLowerCase().includes(q);
        const matchesNotes = (rel.notes || "").toLowerCase().includes(q);
        const matchesAuthor = (rel.author?.name || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesVersion && !matchesSummary && !matchesNotes && !matchesAuthor) {
          return false;
        }
      }
      return true;
    });
  }, [releases, searchQuery]);

  const formatRelativeTime = (isoString: string): string => {
    if (!isoString) return "just now";
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) return "just now";
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} hours ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} days ago`;
      return new Date(isoString).toLocaleDateString();
    } catch {
      return "recently";
    }
  };

  const countText = `${filteredReleases.length} ${filteredReleases.length === 1 ? "item" : "items"}`;

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-background font-sans overflow-hidden select-none">
      {/* 1. Header Bar */}
      <header className="px-8 lg:px-12 pt-7 pb-5 border-b border-border bg-card/60 backdrop-blur-md flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Releases</h1>
          <p className="text-xs text-muted-foreground mt-1">
            A release is a version of this project&apos;s tokens, with an optional docs snapshot.
          </p>
        </div>

        {isEditable && (
          <Button
            onClick={onCreateRelease}
            className="gap-2 text-xs font-semibold px-4 h-9 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New release</span>
          </Button>
        )}
      </header>

      {/* 2. Control Toolbar (Fullscreen edge-to-edge) */}
      <div className="px-8 lg:px-12 py-3.5 border-b border-border/80 bg-muted/20 flex items-center justify-between gap-4 flex-shrink-0">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search releases..."
            className="h-8 pl-9 pr-8 text-xs bg-background border-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Item Counter */}
        <span className="text-xs text-muted-foreground font-medium font-mono">
          {countText}
        </span>
      </div>

      {/* 3. Releases List Area (Full-Width Edge-to-Edge) */}
      <div className="flex-1 overflow-y-auto px-8 lg:px-12 py-6 w-full">
        {filteredReleases.length === 0 ? (
          <div className="h-72 w-full flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-border bg-card/40">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{searchQuery ? "No matching releases" : "No releases yet"}</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {searchQuery
                ? `No releases matched "${searchQuery}". Try clearing the search filter.`
                : "Create a release when your tokens are ready to hand to developers."}
            </p>
            {isEditable && (
              <Button onClick={onCreateRelease} size="sm" className="gap-1.5 text-xs font-semibold">
                <Plus className="w-3.5 h-3.5" />
                <span>Create first release</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 w-full">
            {filteredReleases.map((release) => {
              const changes = release.changesCount ?? release.tokenCount ?? 0;
              const hasChanges = changes > 0;
              const authorName = release.author?.name || "Studio Member";

              return (
                <div
                  key={release.id}
                  {...buttonProps(() => onSelectRelease(release.id))}
                  className="group w-full p-4 rounded-xl border border-border bg-card hover:bg-card/80 transition-colors cursor-pointer shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {release.title}
                      </span>
                      <Badge
                        variant="violet"
                        className="font-mono text-[11px] px-2 py-0.5 rounded-full"
                      >
                        {release.version}
                      </Badge>
                      {release.isDeprecated && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold text-amber-500 border-amber-500/30 bg-amber-500/10 px-2 py-0.2 rounded-full"
                        >
                          Deprecated
                        </Badge>
                      )}
                      {release.branch && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground flex items-center gap-1">
                          <GitBranch className="w-2.5 h-2.5" />
                          <span>{release.branch}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span>{release.summary || release.notes || release.title}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(release.createdAt)}</span>
                      <span>·</span>
                      <span>by {authorName}</span>
                    </div>
                  </div>

                  {/* Right side: Change counter badge */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div
                      className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        hasChanges
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {hasChanges ? `+${changes}` : "0"}
                    </div>

                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition opacity-60 group-hover:opacity-100" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
