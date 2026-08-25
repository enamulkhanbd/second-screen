"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { GitCommitHistoryItem } from "@/app/api/git/history/route";
import {
  Clock,
  GitBranch,
  GitCommit,
  FolderGit2,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  FileCode,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ActivityViewProps {
  onOpenSettings?: () => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ onOpenSettings }) => {
  const {
    credentials,
    currentUser,
    currentProject,
    currentOrg,
    addToast,
  } = useTokenStore();

  const [commits, setCommits] = useState<GitCommitHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [expandedSha, setExpandedSha] = useState<string | null>(null);

  const isGitConfigured = Boolean(
    credentials.provider &&
    credentials.owner &&
    credentials.repo &&
    credentials.branch &&
    credentials.pat
  );

  const fetchCommitHistory = async () => {
    if (!isGitConfigured) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/git/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load Git commit history");
      }

      const data = await res.json();
      if (Array.isArray(data.commits)) {
        setCommits(data.commits);
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Change Log Fetch Failed",
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isGitConfigured) {
      fetchCommitHistory();
    }
  }, [credentials.provider, credentials.owner, credentials.repo, credentials.branch, credentials.pat]);

  const filteredCommits = useMemo(() => {
    if (!searchQuery.trim()) return commits;
    const q = searchQuery.toLowerCase();
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(q) ||
        c.author.name.toLowerCase().includes(q) ||
        c.author.email.toLowerCase().includes(q) ||
        c.sha.toLowerCase().includes(q)
    );
  }, [commits, searchQuery]);

  const handleCopy = (sha: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(sha);
      setCopiedSha(sha);
      setTimeout(() => setCopiedSha(null), 1500);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* 1. Header Toolbar */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              Activity &amp; Change Log
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Git commit history, file revisions, and token release logs for {credentials.repo || "repository"}@{credentials.branch || "main"}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {isGitConfigured && (
            <>
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search commits or authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs font-mono w-56"
                />
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCommitHistory}
                disabled={isLoading}
                className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-2xs"
                title="Refresh Git commit history"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* 2. Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4">
        {!isGitConfigured ? (
          /* Unlinked State Prompt */
          <div className="p-12 text-center border border-border rounded-xl bg-card shadow-xs flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              Git Provider Not Configured
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4 leading-relaxed">
              Connect a Git repository (GitHub, Azure DevOps, GitLab, or Bitbucket) to view live revision history, commit logs, and token file change diffs.
            </p>
            {onOpenSettings && (
              <Button size="sm" onClick={onOpenSettings} className="gap-1.5 font-semibold">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Configure Git Provider</span>
              </Button>
            )}
          </div>
        ) : isLoading && commits.length === 0 ? (
          /* Loading Skeleton */
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-mono">
              Fetching revision history from {credentials.provider}...
            </span>
          </div>
        ) : filteredCommits.length === 0 ? (
          /* Empty Search or No Commits */
          <div className="p-10 text-center border border-border rounded-xl bg-card text-muted-foreground text-xs">
            {searchQuery ? "No commits matching your search query." : "No commits found on active branch."}
          </div>
        ) : (
          /* Live Git Commits Timeline */
          <div className="space-y-3">
            {filteredCommits.map((commit, idx) => {
              const isExpanded = expandedSha === commit.sha;

              return (
                <div
                  key={commit.sha}
                  className="rounded-xl border border-border bg-card shadow-xs overflow-hidden transition-all hover:border-border/80"
                >
                  {/* Top Summary Bar */}
                  <div className="p-3.5 flex items-start gap-3">
                    {/* Commit Author Avatar */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      <Avatar className="h-8 w-8 rounded-lg">
                        {commit.author.avatarUrl && (
                          <AvatarImage src={commit.author.avatarUrl} alt={commit.author.name} />
                        )}
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
                          {commit.author.name[0]?.toUpperCase() || "G"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-background flex items-center justify-center">
                        <GitCommit className="w-2.5 h-2.5 text-primary" />
                      </div>
                    </div>

                    {/* Commit Title & Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-xs text-foreground font-mono truncate leading-snug">
                          {commit.message.split("\n")[0]}
                        </h3>
                        <span className="text-[11px] text-muted-foreground font-mono flex-shrink-0">
                          {formatTimeAgo(commit.author.date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-muted-foreground font-mono flex-wrap">
                        <span className="font-semibold text-foreground/90">
                          {commit.author.name}
                        </span>

                        <span>•</span>

                        {/* Copyable SHA Badge */}
                        <button
                          type="button"
                          onClick={() => handleCopy(commit.sha)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/80 hover:bg-muted text-foreground transition-colors cursor-pointer"
                          title="Click to copy full commit SHA"
                        >
                          <span>{commit.shortSha}</span>
                          {copiedSha === commit.sha ? (
                            <Check className="w-2.5 h-2.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-muted-foreground" />
                          )}
                        </button>

                        {/* External Link to GitHub/Azure Commit */}
                        {commit.url && (
                          <a
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-0.5"
                            title="View commit in repository"
                          >
                            <span>View</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        {/* Expand Details Toggle */}
                        <button
                          type="button"
                          onClick={() => setExpandedSha(isExpanded ? null : commit.sha)}
                          className="ml-auto text-primary hover:underline inline-flex items-center gap-0.5 text-xs font-sans cursor-pointer"
                        >
                          <span>{isExpanded ? "Hide Details" : "Details"}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Details Section */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-muted/30 border-t border-border text-xs space-y-2 font-mono">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Full Commit Message
                        </div>
                        <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/90 bg-muted/60 p-2 rounded-md border border-border">
                          {commit.message}
                        </pre>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                        <div>
                          Author: <span className="text-foreground font-semibold">{commit.author.name}</span> &lt;{commit.author.email || "noreply"}&gt;
                        </div>
                        <div>
                          Committed: <span className="text-foreground">{new Date(commit.author.date).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
