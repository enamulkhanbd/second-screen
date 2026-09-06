"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ProjectBranch, BranchChangeCategory } from "@/types/tokens";
import { CreateBranchModal } from "@/components/CreateBranchModal";
import {
  GitBranch,
  Plus,
  Search,
  Check,
  Clock,
  MessageSquare,
  GitCommit,
  GitMerge,
  Trash2,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Layers,
  Palette,
  Sparkles,
  FileCode,
  ArrowRight,
  Send,
  CornerDownRight,
  Calendar,
  User,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const BranchesView: React.FC = () => {
  const {
    branches,
    activeBranch,
    switchBranchAction,
    deleteBranchAction,
    mergeBranchAction,
    addBranchCommentAction,
    resolveBranchCommentAction,
    canUserEdit,
    currentUser,
    addToast,
    credentials,
    setSidebarTab,
  } = useTokenStore();

  const isGitConfigured = Boolean(
    credentials.provider && credentials.owner && credentials.repo
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "active" | "default">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBranchName, setSelectedBranchName] = useState<string | null>(null);
  const [historyCategory, setHistoryCategory] = useState<"all" | BranchChangeCategory>("all");
  const [newCommentText, setNewCommentText] = useState("");
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [branchToMerge, setBranchToMerge] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // If a sync provider is active, native branching is disabled
  if (isGitConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-background">
        <div className="max-w-md bg-card border border-border p-6 rounded-2xl shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <GitBranch className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">Sync Provider Active</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This project is connected to <span className="font-mono font-semibold text-foreground">{credentials.repo}</span> ({credentials.provider}).
            Branches and token versioning are managed directly through your external sync provider.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <Button size="sm" onClick={() => setSidebarTab("activity")}>
              View Git Log
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSidebarTab("tokens")}>
              Back to Tokens
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered branches list
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterType === "active") return b.name === activeBranch;
      if (filterType === "default") return b.isDefault;
      return true;
    });
  }, [branches, searchQuery, filterType, activeBranch]);

  // Active selected branch object for detail view (default to active branch if not explicitly selected)
  const selectedBranch = useMemo(() => {
    if (selectedBranchName) {
      return branches.find((b) => b.name === selectedBranchName) || null;
    }
    return branches.find((b) => b.name === activeBranch) || branches[0] || null;
  }, [branches, selectedBranchName, activeBranch]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !newCommentText.trim()) return;
    try {
      await addBranchCommentAction(selectedBranch.name, newCommentText);
      setNewCommentText("");
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Comment Failed",
        message: err.message,
      });
    }
  };

  const handleMergeConfirm = async () => {
    if (!branchToMerge) return;
    setIsMerging(true);
    try {
      await mergeBranchAction(branchToMerge, "main");
      setBranchToMerge(null);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Merge Failed",
        message: err.message,
      });
    } finally {
      setIsMerging(false);
    }
  };

  // Filter commits / changes by category
  const filteredCommits = useMemo(() => {
    if (!selectedBranch || !selectedBranch.commits) return [];
    if (historyCategory === "all") return selectedBranch.commits;

    return selectedBranch.commits.filter((c) =>
      c.changes?.some((ch) => ch.category === historyCategory)
    );
  }, [selectedBranch, historyCategory]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b border-border p-4 sm:p-6 bg-muted/20 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <GitBranch className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Branches</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage and review your token branches, track commit history, and collaborate on design systems.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              disabled={!canUserEdit()}
              className="gap-1.5 font-semibold text-xs shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Branch</span>
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search branches by title or name..."
              className="pl-8 h-8 text-xs bg-background/80"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterType === "all"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All ({branches.length})
            </button>
            <button
              onClick={() => setFilterType("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterType === "active"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterType("default")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterType === "default"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Default (main)
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Content: Left Branch List + Right Branch Detail */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Branch Cards List */}
        <div className="w-full lg:w-96 xl:w-[420px] border-r border-border overflow-y-auto p-4 space-y-2.5 flex-shrink-0">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            <span>Branch List ({filteredBranches.length})</span>
            <span className="font-mono text-[10px]">Active: {activeBranch}</span>
          </div>

          {filteredBranches.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted/20">
              <GitBranch className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-foreground">No branches found</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {searchQuery ? "Try refining your search term." : "Create your first branch to get started."}
              </p>
            </div>
          ) : (
            filteredBranches.map((b) => {
              const isCurrent = b.name === activeBranch;
              const isSelected = selectedBranch?.name === b.name;
              const commitCount = b.commits?.length || 0;
              const commentCount = b.comments?.length || 0;
              const unresolvedComments = b.comments?.filter((c) => !c.resolved).length || 0;

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBranchName(b.name)}
                  className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/5 border-primary/40 shadow-sm"
                      : "bg-card hover:bg-muted/40 border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-foreground truncate">
                          {b.name}
                        </span>
                        {isCurrent && (
                          <Badge variant="success" className="text-[9px] py-0 px-1.5 font-sans font-medium">
                            Current
                          </Badge>
                        )}
                        {b.isDefault && (
                          <Badge variant="secondary" className="text-[9px] py-0 px-1.5 font-sans font-medium">
                            Main
                          </Badge>
                        )}
                      </div>

                      {b.title && b.title !== b.name && (
                        <p className="text-xs text-foreground/80 font-medium mt-0.5 truncate">
                          {b.title}
                        </p>
                      )}

                      {b.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {b.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isCurrent && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            switchBranchAction(b.name);
                          }}
                          className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10 cursor-pointer"
                          title="Switch to this branch"
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Metadata & Indicators */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3 text-muted-foreground" />
                        <span>{commitCount} commits</span>
                      </span>
                      {commentCount > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-muted-foreground" />
                          <span>{commentCount}</span>
                          {unresolvedComments > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                          )}
                        </span>
                      )}
                    </div>

                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 opacity-70" />
                      <span>{new Date(b.updatedAt || b.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Selected Branch Detail, History & Comments */}
        {selectedBranch ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-muted/10">
            {/* Center Area: History & Commits */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
              {/* Branch Detail Banner */}
              <div className="p-4 sm:p-6 border-b border-border bg-background/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold font-mono text-foreground">
                        {selectedBranch.name}
                      </h2>
                      {selectedBranch.isDefault && (
                        <Badge variant="secondary" className="text-[10px] font-sans">
                          Default branch
                        </Badge>
                      )}
                      {selectedBranch.name === activeBranch && (
                        <Badge variant="success" className="text-[10px] font-sans">
                          Active working branch
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedBranch.description || (selectedBranch.title !== selectedBranch.name ? selectedBranch.title : "No description provided.")}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-2">
                      {selectedBranch.basedOn && (
                        <span className="flex items-center gap-1 font-mono">
                          <CornerDownRight className="w-3 h-3 text-primary" />
                          <span>Forked from {selectedBranch.basedOn}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Updated {new Date(selectedBranch.updatedAt).toLocaleTimeString()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Branch Action Buttons */}
                  <div className="flex items-center gap-2">
                    {selectedBranch.name !== activeBranch && (
                      <Button
                        size="sm"
                        onClick={() => switchBranchAction(selectedBranch.name)}
                        className="h-8 gap-1.5 text-xs font-semibold"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Switch to Branch</span>
                      </Button>
                    )}

                    {!selectedBranch.isDefault && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setBranchToMerge(selectedBranch.name)}
                          className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>Merge into Main</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setBranchToDelete(selectedBranch.name)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          title="Delete branch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Sub-Navigation Filter Pills */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider mr-2">
                      History
                    </span>
                    {(["all", "tokens", "sets", "themes", "assets", "docs"] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setHistoryCategory(cat)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors capitalize cursor-pointer ${
                          historyCategory === cat
                            ? "bg-primary/15 text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] font-mono text-muted-foreground">
                    {filteredCommits.length} commits
                  </span>
                </div>
              </div>

              {/* Timeline of Commits */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {filteredCommits.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
                    <GitCommit className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold text-foreground">No commits in this category</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Edits made on this branch will be recorded in this timeline.
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {filteredCommits.map((commit, idx) => (
                      <div key={commit.id || idx} className="relative group">
                        {/* Timeline Node Icon */}
                        <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-background border-2 border-primary ring-4 ring-background" />

                        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs hover:border-border/80 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                {commit.message}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                                <span className="font-medium text-foreground/80">
                                  {commit.author?.name || "Team Member"}
                                </span>
                                <span>•</span>
                                <span>{new Date(commit.timestamp).toLocaleString()}</span>
                                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.2 rounded">
                                  {commit.sha?.substring(0, 7)}
                                </span>
                              </div>
                            </div>

                            {(commit.totalAdded > 0 || commit.totalModified > 0 || commit.totalDeleted > 0) && (
                              <div className="flex items-center gap-1 font-mono text-[10px]">
                                {commit.totalAdded > 0 && (
                                  <span className="text-emerald-500 font-semibold">+{commit.totalAdded}</span>
                                )}
                                {commit.totalModified > 0 && (
                                  <span className="text-amber-500 font-semibold">~{commit.totalModified}</span>
                                )}
                                {commit.totalDeleted > 0 && (
                                  <span className="text-destructive font-semibold">-{commit.totalDeleted}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Granular Changes List */}
                          {commit.changes && commit.changes.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-border/60 space-y-1">
                              {commit.changes.map((ch) => (
                                <div
                                  key={ch.id}
                                  className="flex items-center justify-between text-[11px] font-mono py-0.5 px-1.5 rounded hover:bg-muted/40"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span
                                      className={`font-bold ${
                                        ch.action === "added"
                                          ? "text-emerald-500"
                                          : ch.action === "deleted"
                                          ? "text-destructive"
                                          : "text-amber-500"
                                      }`}
                                    >
                                      {ch.action === "added" ? "+" : ch.action === "deleted" ? "-" : "~"}
                                    </span>
                                    <span className="text-foreground truncate">{ch.key}</span>
                                  </div>
                                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-sans">
                                    {ch.label}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Branch Comments / Review Panel */}
            <div className="w-full lg:w-80 xl:w-96 flex flex-col overflow-hidden bg-background">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Review Comments
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5">
                    {selectedBranch.comments?.length || 0}
                  </Badge>
                </div>
              </div>

              {/* Comment Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(!selectedBranch.comments || selectedBranch.comments.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                    <p className="text-xs">No comments yet</p>
                    <p className="text-[11px] mt-0.5">Leave review notes or feedback on this branch.</p>
                  </div>
                ) : (
                  selectedBranch.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        comment.resolved
                          ? "bg-muted/20 border-border opacity-70"
                          : "bg-card border-border shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5 rounded-full">
                            {comment.author?.avatarUrl && <AvatarImage src={comment.author.avatarUrl} />}
                            <AvatarFallback className="text-[9px] font-bold bg-primary text-primary-foreground">
                              {comment.author?.name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground text-[11px]">
                            {comment.author?.name || "Team Member"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <button
                          onClick={() => resolveBranchCommentAction(selectedBranch.name, comment.id)}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                            comment.resolved
                              ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                          title={comment.resolved ? "Click to reopen" : "Click to resolve"}
                        >
                          <Check className="w-3 h-3" />
                          <span>{comment.resolved ? "Resolved" : "Resolve"}</span>
                        </button>
                      </div>

                      <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input Form */}
              <form onSubmit={handleAddComment} className="p-3 border-t border-border bg-muted/20">
                <Textarea
                  value={newCommentText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewCommentText(e.target.value)}
                  placeholder="Add a review comment..."
                  rows={2}
                  className="text-xs resize-none bg-background"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newCommentText.trim()}
                    className="h-7 text-xs font-semibold gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>Comment</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
            <p className="text-xs">Select a branch to view history and comments.</p>
          </div>
        )}
      </div>

      {/* Create Branch Modal */}
      <CreateBranchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultBasedOn={selectedBranch?.name || activeBranch}
      />

      {/* Delete Branch Confirmation Dialog */}
      <Dialog open={Boolean(branchToDelete)} onOpenChange={() => setBranchToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              <DialogTitle className="text-base font-bold">Delete Branch?</DialogTitle>
            </div>
            <DialogDescription className="text-xs mt-1">
              Are you sure you want to delete branch <strong className="font-mono text-foreground">{branchToDelete}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setBranchToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (branchToDelete) {
                  deleteBranchAction(branchToDelete);
                  setBranchToDelete(null);
                }
              }}
            >
              Delete Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Branch Confirmation Dialog */}
      <Dialog open={Boolean(branchToMerge)} onOpenChange={() => setBranchToMerge(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <GitMerge className="w-5 h-5" />
              <DialogTitle className="text-base font-bold">Merge into Main</DialogTitle>
            </div>
            <DialogDescription className="text-xs mt-1">
              Merge all token changes from <strong className="font-mono text-foreground">{branchToMerge}</strong> into the default <strong className="font-mono text-foreground">main</strong> branch.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs text-muted-foreground">
            <p className="text-foreground font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Safe Token Fusion
            </p>
            <p className="mt-1 leading-relaxed text-[11px]">
              Tokens from {branchToMerge} will be integrated into main with a merge commit.
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setBranchToMerge(null)} disabled={isMerging}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleMergeConfirm}
              disabled={isMerging}
              className="gap-1.5 font-semibold"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>{isMerging ? "Merging..." : "Confirm Merge"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
