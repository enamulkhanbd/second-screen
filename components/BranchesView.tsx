"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ProjectBranch, BranchChangeCategory } from "@/types/tokens";
import { CreateBranchModal } from "@/components/CreateBranchModal";
import {
  GitBranch,
  Plus,
  Search,
  Info,
  ChevronDown,
  User,
  Menu,
  MessageSquare,
  Check,
  Trash2,
  GitMerge,
  Clock,
  ArrowLeft,
  MoreVertical,
  GitCommit,
  ShieldAlert,
  CheckCircle2,
  Send,
  CornerDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    currentProject,
    themeGroups,
    rawTokens,
    addToast,
    credentials,
    setSidebarTab,
  } = useTokenStore();

  const isGitConfigured = Boolean(
    credentials.provider && credentials.owner && credentials.repo
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "active" | "default">("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBranchName, setSelectedBranchName] = useState<string | null>(null);
  const [historyCategory, setHistoryCategory] = useState<"all" | "tokens" | "sets" | "themes" | "assets" | "docs">("all");
  const [newCommentText, setNewCommentText] = useState("");
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [branchToMerge, setBranchToMerge] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // If a sync provider is active, native branching is disabled
  if (isGitConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-background text-foreground">
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

  // Active selected branch object for detail view
  const selectedBranch = useMemo(() => {
    if (selectedBranchName) {
      return branches.find((b) => b.name === selectedBranchName) || null;
    }
    return null;
  }, [branches, selectedBranchName]);

  // Relative time helper
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "just now";
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) {
        const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
        return `${mins}m ago`;
      }
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return "just now";
    }
  };

  // Generate granular history items for the branch
  const historyItems = useMemo(() => {
    const authorName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "enamulkhanbd";
    const items: Array<{
      name: string;
      category: "Option" | "Theme" | "Token" | "Set" | "Asset" | "Doc";
      author: string;
      time: string;
    }> = [];

    // 1. From real branch commits if available
    if (selectedBranch?.commits && selectedBranch.commits.length > 0) {
      selectedBranch.commits.forEach((c) => {
        if (c.changes && c.changes.length > 0) {
          c.changes.forEach((ch) => {
            const catMap: Record<string, "Option" | "Theme" | "Token" | "Set" | "Asset" | "Doc"> = {
              themes: "Theme",
              tokens: "Token",
              sets: "Set",
              assets: "Asset",
              docs: "Doc",
            };
            items.push({
              name: ch.key,
              category: catMap[ch.category] || "Token",
              author: c.author?.name || authorName,
              time: "just now",
            });
          });
        }
      });
    }

    // 2. Fallback / base workspace items matching reference design
    if (items.length === 0) {
      // Theme groups and options
      themeGroups.forEach((grp) => {
        grp.options.forEach((opt) => {
          items.push({
            name: opt.name,
            category: "Option",
            author: authorName,
            time: "just now",
          });
        });
        items.push({
          name: grp.name,
          category: "Theme",
          author: authorName,
          time: "just now",
        });
      });

      // Token set tokens
      const sampleTokens = [
        "title.md.medium",
        "title.md.semibold",
        "title.lg.medium",
        "title.lg.semibold",
        "title.xl.medium",
        "title.xl.semibold",
        "title.xxl.semibold",
        "caption.sm.medium",
        "caption.md.normal",
        "caption.sm.normal",
        "subtitle.md.normal",
        "subtitle.sm.normal",
        "body.md.normal",
        "body.sm.normal",
        "body.lg.normal",
        "body.xs.normal",
        "heading.h1.semibold",
        "heading.h1.medium",
        "heading.h2.medium",
        "heading.h3.semibold",
        "heading.h4.medium",
        "overline.sm.normal",
      ];

      sampleTokens.forEach((tok) => {
        items.push({
          name: tok,
          category: "Token",
          author: authorName,
          time: "just now",
        });
      });
    }

    // Filter by history category tab
    if (historyCategory === "all") return items;
    const catFilterMap: Record<string, string> = {
      tokens: "Token",
      sets: "Set",
      themes: "Theme",
      options: "Option",
      assets: "Asset",
      docs: "Doc",
    };
    const target = catFilterMap[historyCategory];
    if (historyCategory === "themes") {
      return items.filter((i) => i.category === "Theme" || i.category === "Option");
    }
    return items.filter((i) => i.category === target);
  }, [selectedBranch, themeGroups, historyCategory, currentUser]);

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

  // ==========================================
  // 1. DETAIL VIEW
  // ==========================================
  if (selectedBranch) {
    const isCurrent = selectedBranch.name === activeBranch;
    return (
      <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden">
        {/* Detail View Sub-Header */}
        <div className="h-13 px-6 border-b border-border flex items-center justify-between flex-shrink-0 bg-card/60">
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setSelectedBranchName(null)}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Branches</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-mono text-foreground font-semibold flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              {selectedBranch.name}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isCurrent && (
              <Button
                size="sm"
                onClick={async () => {
                  await switchBranchAction(selectedBranch.name);
                }}
                className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer px-3 shadow-xs"
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
                  className="h-8 gap-1.5 text-xs border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                >
                  <GitMerge className="w-3.5 h-3.5 text-primary" />
                  <span>Merge into Main</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setBranchToDelete(selectedBranch.name)}
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 cursor-pointer"
                  title="Delete branch"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Branch Title, Metadata & History */}
          <div className="flex-1 flex flex-col overflow-y-auto p-8 pr-10">
            {/* Header Banner */}
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {selectedBranch.name}
                </h1>
                {isCurrent && (
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-sans">
                    Current Active Branch
                  </Badge>
                )}
                {selectedBranch.isDefault && (
                  <Badge variant="secondary" className="text-[11px] font-sans">
                    Default Main Branch
                  </Badge>
                )}
              </div>

              {selectedBranch.title && selectedBranch.title !== selectedBranch.name && (
                <p className="text-sm text-foreground/80 font-medium mt-1">
                  {selectedBranch.title}
                </p>
              )}

              {selectedBranch.description && (
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                  {selectedBranch.description}
                </p>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                {selectedBranch.basedOn && (
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <CornerDownRight className="w-3 h-3 text-primary" />
                    <span>Based on {selectedBranch.basedOn}</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground/70" />
                  <span>Last updated {formatTimeAgo(selectedBranch.updatedAt || selectedBranch.createdAt)}</span>
                </span>
                {selectedBranch.createdBy?.name && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-muted-foreground/70" />
                    <span>Created by {selectedBranch.createdBy.name}</span>
                  </span>
                )}
              </div>
            </div>

            {/* History Section */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                History &amp; Changes
              </h2>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 pb-2">
                {(["all", "tokens", "sets", "themes", "assets", "docs"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setHistoryCategory(cat)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize cursor-pointer transition-colors ${
                      historyCategory === cat
                        ? "bg-muted text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Timeline Items */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-muted-foreground/80 tracking-wider mb-2.5">
                  CHANGES &amp; COMMITS
                </div>

                <div className="space-y-1">
                  {historyItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-lg text-xs transition-colors border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-emerald-500 font-bold text-sm leading-none">+</span>
                        <span className="text-foreground font-medium font-mono">{item.name}</span>
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{item.author}</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Comments Sidebar */}
          <div className="w-80 border-l border-border bg-card/40 p-6 flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Review Comments</span>
              </h3>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {selectedBranch.comments?.length || 0}
              </Badge>
            </div>

            <form onSubmit={handleAddComment} className="space-y-2 mb-6">
              <Textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Leave feedback or review notes on this branch..."
                rows={3}
                className="text-xs bg-background border-input resize-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/60 rounded-lg text-foreground"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newCommentText.trim()}
                  className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer gap-1.5 shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Comment</span>
                </Button>
              </div>
            </form>

            {(!selectedBranch.comments || selectedBranch.comments.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground space-y-1">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-1 text-muted-foreground/60">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-foreground/80">No comments yet</p>
                <p className="text-[11px] text-muted-foreground">Start the conversation by adding a comment</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto flex-1">
                {selectedBranch.comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-card border border-border rounded-lg text-xs space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-[11px]">{comment.author.name}</span>
                      <button
                        type="button"
                        onClick={() => resolveBranchCommentAction(selectedBranch.name, comment.id)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                          comment.resolved
                            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                        title={comment.resolved ? "Click to reopen" : "Click to resolve"}
                      >
                        <Check className="w-2.5 h-2.5" />
                        <span>{comment.resolved ? "Resolved" : "Resolve"}</span>
                      </button>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                    <div className="text-[10px] text-muted-foreground/60 pt-0.5">
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delete Branch Dialog */}
        <Dialog open={Boolean(branchToDelete)} onOpenChange={() => setBranchToDelete(null)}>
          <DialogContent className="sm:max-w-md bg-card border border-border text-foreground p-6 rounded-2xl shadow-xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="w-5 h-5" />
                <DialogTitle className="text-base font-bold">Delete Branch?</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-2">
                Are you sure you want to delete branch <strong className="font-mono text-foreground">{branchToDelete}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBranchToDelete(null)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (branchToDelete) {
                    deleteBranchAction(branchToDelete);
                    if (selectedBranchName === branchToDelete) {
                      setSelectedBranchName(null);
                    }
                    setBranchToDelete(null);
                  }
                }}
              >
                Delete Branch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Merge Branch Dialog */}
        <Dialog open={Boolean(branchToMerge)} onOpenChange={() => setBranchToMerge(null)}>
          <DialogContent className="sm:max-w-md bg-card border border-border text-foreground p-6 rounded-2xl shadow-xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary">
                <GitMerge className="w-5 h-5" />
                <DialogTitle className="text-base font-bold">Merge into Main</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-2">
                Merge all token changes from <strong className="font-mono text-foreground">{branchToMerge}</strong> into the default <strong className="font-mono text-foreground">main</strong> branch.
              </DialogDescription>
            </DialogHeader>
            <div className="p-3 bg-muted/60 rounded-lg border border-border text-xs text-muted-foreground">
              <p className="text-foreground font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Safe Token Fusion
              </p>
              <p className="mt-1 leading-relaxed text-[11px]">
                Tokens from {branchToMerge} will be integrated into main with a merge commit.
              </p>
            </div>
            <DialogFooter className="pt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBranchToMerge(null)}
                disabled={isMerging}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleMergeConfirm}
                disabled={isMerging}
                className="gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>{isMerging ? "Merging..." : "Confirm Merge"}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Branch Modal */}
        <CreateBranchModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          defaultBasedOn={selectedBranch.name}
        />
      </div>
    );
  }

  // ==========================================
  // 2. LIST VIEW
  // ==========================================
  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-y-auto p-6 md:p-8 w-full">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <GitBranch className="w-6 h-6 text-primary" />
              <span>Branches</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage and review your token branches, track commit history, and collaborate on design systems.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              disabled={!canUserEdit()}
              className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Branch</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches by title or name..."
            className="pl-9 h-9 text-xs bg-background border-input focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/60 rounded-lg text-foreground"
          />
        </div>

        {/* Filter Row */}
        <div className="flex items-center justify-between py-1 text-xs">
          <span className="font-semibold text-foreground">
            {filteredBranches.length} {filteredBranches.length === 1 ? "item" : "items"}
          </span>

          <div className="flex items-center gap-2">
            {/* Filter Type Pills */}
            <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border">
              <button
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filterType === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({branches.length})
              </button>
              <button
                onClick={() => setFilterType("active")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filterType === "active"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterType("default")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filterType === "default"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Default
              </button>
            </div>
          </div>
        </div>

        {/* Branch Cards List */}
        <div className="space-y-2.5">
          {filteredBranches.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card/50">
              <GitBranch className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-foreground">No branches found</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {searchQuery ? "Try refining your search term." : "Create your first branch to start experimenting safely."}
              </p>
            </div>
          ) : (
            filteredBranches.map((b) => {
              const isCurrent = b.name === activeBranch;
              const changeCount = b.commits?.reduce((acc, c) => acc + (c.changes?.length || 0), 0) || 0;
              const commitCount = b.commits?.length || 0;
              const commentCount = b.comments?.length || 0;

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBranchName(b.name)}
                  className={`bg-card border rounded-xl p-4 flex items-center justify-between transition-all cursor-pointer group shadow-xs ${
                    isCurrent
                      ? "border-emerald-500/40 hover:border-emerald-500/60"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <GitBranch className={`w-4 h-4 ${isCurrent ? "text-emerald-500" : "text-muted-foreground"}`} />
                      <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors font-mono">
                        {b.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          Current Active
                        </span>
                      )}
                      {b.isDefault && (
                        <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border">
                          Main
                        </span>
                      )}
                    </div>

                    {b.title && b.title !== b.name && (
                      <p className="text-xs text-foreground/80 font-medium mt-1 truncate">
                        {b.title}
                      </p>
                    )}

                    {b.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {b.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground/60" />
                        <span>{formatTimeAgo(b.updatedAt || b.createdAt)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3 text-muted-foreground/60" />
                        <span>{commitCount} {commitCount === 1 ? "commit" : "commits"}</span>
                      </span>
                      {commentCount > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-muted-foreground/60" />
                          <span>{commentCount}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Side Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!isCurrent ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await switchBranchAction(b.name);
                        }}
                        className="h-8 px-3 text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1.5 font-medium cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Switch</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Active
                      </span>
                    )}

                    {/* 3-dot dropdown menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Branch actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground text-xs">
                        {!isCurrent && (
                          <DropdownMenuItem
                            onClick={() => switchBranchAction(b.name)}
                            className="gap-2 cursor-pointer font-mono"
                          >
                            <Check className="w-3.5 h-3.5 text-primary" />
                            <span>Switch to branch</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setSelectedBranchName(b.name)}
                          className="gap-2 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>View details &amp; history</span>
                        </DropdownMenuItem>
                        {!b.isDefault && (
                          <>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              onClick={() => setBranchToMerge(b.name)}
                              className="gap-2 cursor-pointer"
                            >
                              <GitMerge className="w-3.5 h-3.5 text-primary" />
                              <span>Merge into main</span>
                            </DropdownMenuItem>
                            {!isCurrent && (
                              <DropdownMenuItem
                                onClick={() => setBranchToDelete(b.name)}
                                className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                <span>Delete branch</span>
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Branch Dialog */}
      <Dialog open={Boolean(branchToDelete)} onOpenChange={() => setBranchToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-card border border-border text-foreground p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              <DialogTitle className="text-base font-bold">Delete Branch?</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-2">
              Are you sure you want to delete branch <strong className="font-mono text-foreground">{branchToDelete}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBranchToDelete(null)}
              className="cursor-pointer"
            >
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

      {/* Merge Branch Dialog */}
      <Dialog open={Boolean(branchToMerge)} onOpenChange={() => setBranchToMerge(null)}>
        <DialogContent className="sm:max-w-md bg-card border border-border text-foreground p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <GitMerge className="w-5 h-5" />
              <DialogTitle className="text-base font-bold">Merge into Main</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-2">
              Merge all token changes from <strong className="font-mono text-foreground">{branchToMerge}</strong> into the default <strong className="font-mono text-foreground">main</strong> branch.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/60 rounded-lg border border-border text-xs text-muted-foreground">
            <p className="text-foreground font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Safe Token Fusion
            </p>
            <p className="mt-1 leading-relaxed text-[11px]">
              Tokens from {branchToMerge} will be integrated into main with a merge commit.
            </p>
          </div>
          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBranchToMerge(null)}
              disabled={isMerging}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleMergeConfirm}
              disabled={isMerging}
              className="gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>{isMerging ? "Merging..." : "Confirm Merge"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Branch Modal */}
      <CreateBranchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultBasedOn={activeBranch || "main"}
      />
    </div>
  );
};
