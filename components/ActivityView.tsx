"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { GitCommitHistoryItem } from "@/app/api/git/history/route";
import { CommitDetailsResponse } from "@/app/api/git/commit-details/route";
import { SideBySideDiffViewer } from "@/components/SideBySideDiffViewer";
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
  ChevronRight,
  FileCode,
  FileText,
  Layers,
  Sparkles,
  ArrowRight,
  Plus,
  Minus,
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
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);

  // Commit Details cache
  const [detailsCache, setDetailsCache] = useState<Record<string, CommitDetailsResponse>>({});
  const [loadingDetailsSha, setLoadingDetailsSha] = useState<string | null>(null);

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
        // Auto-select the first commit if none selected
        if (data.commits.length > 0 && !selectedSha) {
          const firstSha = data.commits[0].sha;
          setSelectedSha(firstSha);
          setSelectedFileIdx(0);
          loadCommitDetails(firstSha);
        }
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

  const loadCommitDetails = async (sha: string) => {
    if (detailsCache[sha] || loadingDetailsSha === sha || !isGitConfigured) return;
    setLoadingDetailsSha(sha);
    try {
      const res = await fetch("/api/git/commit-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credentials,
          commitSha: sha,
        }),
      });

      if (res.ok) {
        const data: CommitDetailsResponse = await res.json();
        setDetailsCache((prev) => ({ ...prev, [sha]: data }));
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoadingDetailsSha(null);
    }
  };

  const handleSelectCommit = (sha: string) => {
    setSelectedSha(sha);
    setSelectedFileIdx(0);
    loadCommitDetails(sha);
  };

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

  const selectedCommit = useMemo(() => {
    return commits.find((c) => c.sha === selectedSha) || commits[0] || null;
  }, [commits, selectedSha]);

  const selectedDetails = selectedCommit ? detailsCache[selectedCommit.sha] : null;
  const isDetailsLoading = selectedCommit ? loadingDetailsSha === selectedCommit.sha : false;

  const activeFile = selectedDetails?.files?.[selectedFileIdx] || selectedDetails?.files?.[0];

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
      {/* 1. Top Header Toolbar */}
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
              Git commit history, revisions, and side-by-side file diffs for {credentials.repo || "repository"}@{credentials.branch || "main"}
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

      {/* 2. Main Master-Detail Split Layout */}
      {!isGitConfigured ? (
        /* Unlinked State Prompt */
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="p-12 text-center border border-border rounded-xl bg-card shadow-xs flex flex-col items-center justify-center max-w-lg">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              Git Provider Not Configured
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4 leading-relaxed">
              Connect a Git repository (GitHub, Azure DevOps, GitLab, or Bitbucket) to inspect commit history and side-by-side token code diffs.
            </p>
            {onOpenSettings && (
              <Button size="sm" onClick={onOpenSettings} className="gap-1.5 font-semibold">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Configure Git Provider</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
          {/* ============================================================= */}
          {/* LEFT SIDE: Commit History & Changed Files List (w-80 to w-96)  */}
          {/* ============================================================= */}
          <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-border bg-muted/15 flex flex-col flex-shrink-0 h-72 lg:h-full overflow-hidden">
            {/* List Sub-Header */}
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
                <GitCommit className="w-3.5 h-3.5 text-primary" />
                <span>Commits ({filteredCommits.length})</span>
              </div>
              <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 font-normal">
                {credentials.branch || "main"}
              </Badge>
            </div>

            {/* Commit List Scroll Area */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && commits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2.5 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs font-mono">Fetching commits...</span>
                </div>
              ) : filteredCommits.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                  {searchQuery ? "No matching commits" : "No commits found"}
                </div>
              ) : (
                filteredCommits.map((commit) => {
                  const isSelected = selectedCommit?.sha === commit.sha;
                  const details = detailsCache[commit.sha];
                  const isLoadingThisDetails = loadingDetailsSha === commit.sha;

                  return (
                    <div
                      key={commit.sha}
                      className={`transition-all border-b border-border/60 ${
                        isSelected
                          ? "bg-background border-l-4 border-l-primary shadow-2xs"
                          : "border-l-4 border-l-transparent hover:bg-muted/30"
                      }`}
                    >
                      {/* Commit Card Header */}
                      <button
                        type="button"
                        onClick={() => handleSelectCommit(commit.sha)}
                        className="w-full text-left p-3.5 flex items-start gap-3 cursor-pointer select-none"
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0 mt-0.5">
                          <Avatar className="h-7 w-7 rounded-lg">
                            {commit.author.avatarUrl && (
                              <AvatarImage src={commit.author.avatarUrl} alt={commit.author.name} />
                            )}
                            <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
                              {commit.author.name[0]?.toUpperCase() || "G"}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-mono font-bold leading-tight line-clamp-2 ${
                              isSelected ? "text-foreground" : "text-foreground/90"
                            }`}>
                              {commit.message.split("\n")[0]}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1 mt-1 text-[11px] font-mono text-muted-foreground">
                            <span className="truncate max-w-[120px] font-medium text-foreground/75">
                              {commit.author.name}
                            </span>
                            <span className="text-[10px] flex-shrink-0">
                              {formatTimeAgo(commit.author.date)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono">
                            <span className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                              {commit.shortSha}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* CHANGED FILES LIST: Displayed on left side below selected commit */}
                      {isSelected && (
                        <div className="px-3 pb-3 pt-1 border-t border-border/50 bg-muted/20 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                            <span className="flex items-center gap-1">
                              <FileCode className="w-3 h-3 text-primary" />
                              <span>Changed Files {details ? `(${details.files.length})` : ""}</span>
                            </span>
                            {details?.stats && (
                              <div className="flex items-center gap-1 font-mono text-[9px]">
                                {details.stats.additions > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    +{details.stats.additions}
                                  </span>
                                )}
                                {details.stats.deletions > 0 && (
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                    -{details.stats.deletions}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {isLoadingThisDetails ? (
                            <div className="py-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-mono">
                              <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                              <span className="text-[11px]">Loading files...</span>
                            </div>
                          ) : details && details.files.length > 0 ? (
                            <div className="space-y-0.5">
                              {details.files.map((file, fIdx) => {
                                const isFileActive = selectedFileIdx === fIdx;
                                const filenameParts = file.filename.split("/");
                                const basename = filenameParts.pop() || file.filename;
                                const dir = filenameParts.join("/");

                                return (
                                  <button
                                    key={file.filename}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedFileIdx(fIdx);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] font-mono transition-all flex flex-col gap-0.5 cursor-pointer ${
                                      isFileActive
                                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                                        : "hover:bg-muted text-foreground/90 bg-card/60 border border-border/40"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <FileText className={`w-3 h-3 flex-shrink-0 ${isFileActive ? "text-primary-foreground" : "text-primary"}`} />
                                        <span className="truncate">{basename}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[9px] flex-shrink-0">
                                        {file.additions !== undefined && file.additions > 0 && (
                                          <span className={isFileActive ? "text-primary-foreground/90 font-bold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
                                            +{file.additions}
                                          </span>
                                        )}
                                        {file.deletions !== undefined && file.deletions > 0 && (
                                          <span className={isFileActive ? "text-primary-foreground/90 font-bold" : "text-rose-600 dark:text-rose-400 font-semibold"}>
                                            -{file.deletions}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {dir && (
                                      <span className={`text-[9px] truncate pl-4.5 ${
                                        isFileActive ? "text-primary-foreground/80" : "text-muted-foreground/70"
                                      }`}>
                                        {dir}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-[10px] text-muted-foreground px-2 py-2 font-mono bg-card rounded border border-border/40 text-center">
                              No file modifications
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ============================================================= */}
          {/* RIGHT SIDE: Commit Details & Full Diff Viewer (flex-1)        */}
          {/* ============================================================= */}
          <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 lg:p-6 bg-background space-y-4 min-w-0">
            {selectedCommit ? (
              <>
                {/* 1. Commit Header Card */}
                <div className="p-4 lg:p-5 rounded-xl border border-border bg-card shadow-xs space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <h2 className="text-sm lg:text-base font-bold text-foreground font-mono leading-snug">
                        {selectedCommit.message.split("\n")[0]}
                      </h2>

                      {/* Extra commit description body if multi-line */}
                      {selectedCommit.message.split("\n").slice(1).join("").trim() && (
                        <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap pt-1">
                          {selectedCommit.message.split("\n").slice(1).join("\n").trim()}
                        </p>
                      )}
                    </div>

                    {/* Stats Pill */}
                    {selectedDetails?.stats && (
                      <div className="flex items-center gap-2 font-mono text-xs flex-shrink-0">
                        {selectedDetails.stats.additions > 0 && (
                          <Badge variant="success" className="font-mono text-xs py-0.5 px-2">
                            +{selectedDetails.stats.additions} additions
                          </Badge>
                        )}
                        {selectedDetails.stats.deletions > 0 && (
                          <Badge variant="destructive" className="font-mono text-xs py-0.5 px-2">
                            -{selectedDetails.stats.deletions} deletions
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Metadata Row: Author, Date, SHA, Repo Link */}
                  <div className="flex items-center gap-3 pt-2 border-t border-border/60 text-xs font-mono text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 rounded-md">
                        {selectedCommit.author.avatarUrl && (
                          <AvatarImage src={selectedCommit.author.avatarUrl} alt={selectedCommit.author.name} />
                        )}
                        <AvatarFallback className="rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                          {selectedCommit.author.name[0]?.toUpperCase() || "G"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-foreground">
                        {selectedCommit.author.name}
                      </span>
                    </div>

                    <span>•</span>

                    <span>Committed {new Date(selectedCommit.author.date).toLocaleString()}</span>

                    <span>•</span>

                    {/* Copy SHA Button */}
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedCommit.sha)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                      title="Click to copy full commit SHA"
                    >
                      <span className="font-bold">{selectedCommit.shortSha}</span>
                      {copiedSha === selectedCommit.sha ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>

                    {/* External Link */}
                    {selectedCommit.url && (
                      <a
                        href={selectedCommit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 ml-auto"
                      >
                        <span>View on {credentials.provider === "azure" ? "Azure DevOps" : "GitHub"}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* 2. Side-by-Side Code Diff Viewer (Full Width for Active File) */}
                <div className="flex-1 flex flex-col min-h-0">
                  {isDetailsLoading ? (
                    <div className="p-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3 bg-card border border-border rounded-xl font-mono">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Loading commit diffs &amp; file changes...</span>
                    </div>
                  ) : activeFile ? (
                    <SideBySideDiffViewer
                      activeFile={activeFile}
                      showFileTabs={false}
                      repoName={credentials.repo || "repository"}
                    />
                  ) : selectedDetails && selectedDetails.files.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted-foreground bg-card border border-border rounded-xl font-mono">
                      No modified files recorded for this commit.
                    </div>
                  ) : (
                    <div className="p-12 text-center text-xs text-muted-foreground bg-card border border-border rounded-xl font-mono">
                      Select a file from the left panel to inspect its diff.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-center text-muted-foreground font-mono text-xs">
                Select a commit from the left list to view code changes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
