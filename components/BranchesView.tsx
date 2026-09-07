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
    canUserEdit,
    currentUser,
    currentProject,
    themeGroups,
    rawTokens,
    addToast,
    setSidebarTab,
  } = useTokenStore();

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
    if (!dateStr) return "2h ago";
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) return "just now";
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return "2h ago";
    }
  };

  // Generate granular history items for the branch matching Screenshot 4
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
              time: "2h",
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
            time: "2h",
          });
        });
        items.push({
          name: grp.name,
          category: "Theme",
          author: authorName,
          time: "2h",
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
          time: "2h",
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
  // 1. DETAIL VIEW (Screenshot 4)
  // ==========================================
  if (selectedBranch) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#0d0d11] text-foreground overflow-hidden">
        {/* Top Breadcrumb & User Bar */}
        <div className="h-14 px-6 border-b border-[#23232a] flex items-center justify-between flex-shrink-0 bg-[#0d0d11]">
          <div className="flex items-center gap-2 text-xs">
            <span
              onClick={() => setSidebarTab("dashboard")}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              {currentProject?.name || "Planet"}
            </span>
            <span className="text-muted-foreground/60">/</span>
            <span
              onClick={() => setSelectedBranchName(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              Branches
            </span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground font-medium">{selectedBranch.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-bold">
              {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "E"}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs font-mono text-foreground bg-[#16161c] border border-[#272732] hover:bg-[#1f1f27] px-2.5 py-1 rounded-md cursor-pointer outline-none">
                <GitBranch className="w-3.5 h-3.5 text-primary" />
                <span>{selectedBranch.name}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#16161c] border-[#272732]">
                {branches.map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => setSelectedBranchName(b.name)}
                    className="text-xs font-mono cursor-pointer"
                  >
                    {b.name} {b.isDefault ? "(default)" : ""}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Branch Title, Metadata & History */}
          <div className="flex-1 flex flex-col overflow-y-auto p-8 pr-10">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {selectedBranch.name}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {selectedBranch.isDefault && (
                  <span className="text-[11px] font-medium bg-[#1e1e24] text-muted-foreground px-2 py-0.5 rounded-md border border-[#2a2a32]">
                    Default branch
                  </span>
                )}
                <span>Last updated just now</span>
              </div>
            </div>

            {/* History Section */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-foreground tracking-wider">
                History
              </h2>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 pb-2">
                {(["all", "tokens", "sets", "themes", "assets", "docs"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setHistoryCategory(cat)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize cursor-pointer transition-colors ${
                      historyCategory === cat
                        ? "bg-[#25252e] text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-[#18181f]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* TODAY Timeline */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-muted-foreground/80 tracking-wider mb-2.5">
                  TODAY
                </div>

                <div className="space-y-1">
                  {historyItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2 hover:bg-[#16161c]/60 rounded-md text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500 font-bold text-sm leading-none">+</span>
                        <span className="text-foreground font-medium">{item.name}</span>
                        <span className="text-[10px] bg-[#1e1e24] text-muted-foreground px-1.5 py-0.2 rounded border border-[#2a2a32]">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
          <div className="w-80 border-l border-[#23232a] bg-[#0d0d11] p-6 flex flex-col flex-shrink-0">
            <h3 className="text-xs font-bold text-foreground mb-4">Comments</h3>

            <form onSubmit={handleAddComment} className="space-y-2 mb-6">
              <Textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="text-xs bg-[#16161c] border-[#272732] resize-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/60 rounded-lg"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newCommentText.trim()}
                  className="h-7 text-xs bg-[#1f1f28] hover:bg-[#282834] text-foreground border border-[#2c2c36] cursor-pointer"
                >
                  Comment
                </Button>
              </div>
            </form>

            {(!selectedBranch.comments || selectedBranch.comments.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground space-y-1">
                <div className="w-8 h-8 rounded-full bg-[#18181f] flex items-center justify-center mb-1 text-muted-foreground/60">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-foreground/80">No comments yet</p>
                <p className="text-[11px] text-muted-foreground">Start the conversation by adding a comment</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto flex-1">
                {selectedBranch.comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-[#16161c] border border-[#272732] rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-[11px]">{comment.author.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
  // 2. LIST VIEW (Screenshot 2)
  // ==========================================
  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0d11] text-foreground overflow-y-auto p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Branches</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage and review your branches</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-[#23232a] bg-[#141418] text-muted-foreground hover:text-foreground flex items-center justify-center text-xs transition-colors"
            title="Branch info"
          >
            <Info className="w-4 h-4" />
          </button>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-3.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Branch</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search branches..."
          className="pl-9 h-9 text-xs bg-[#141418] border-[#23232a] focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/60 rounded-lg text-foreground"
        />
      </div>

      {/* Filter Row */}
      <div className="flex items-center justify-between py-2 mb-3 text-xs">
        <span className="font-semibold text-foreground">
          {filteredBranches.length} {filteredBranches.length === 1 ? "item" : "items"}
        </span>

        <div className="flex items-center gap-2">
          {/* Author Select */}
          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger className="h-7 text-xs bg-[#141418] border-[#23232a] gap-2 px-2.5 rounded-lg">
              <User className="w-3 h-3 text-muted-foreground" />
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-[#141418] border-[#23232a]">
              <SelectItem value="all" className="text-xs">All</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Select */}
          <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
            <SelectTrigger className="h-7 text-xs bg-[#141418] border-[#23232a] gap-2 px-2.5 rounded-lg">
              <Menu className="w-3 h-3 text-muted-foreground" />
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-[#141418] border-[#23232a]">
              <SelectItem value="all" className="text-xs">All</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="default" className="text-xs">Default</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Branch Cards List */}
      <div className="space-y-2">
        {filteredBranches.map((b) => {
          const isCurrent = b.name === activeBranch;
          const changeCount = b.commits?.reduce((acc, c) => acc + (c.changes?.length || 0), 0) || 0;

          return (
            <div
              key={b.id}
              onClick={() => setSelectedBranchName(b.name)}
              className="bg-[#121216] border border-[#23232a] hover:border-[#383842] rounded-xl p-4 flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors font-mono">
                    {b.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[11px] font-medium bg-[#1e1e24] text-muted-foreground px-2 py-0.5 rounded-md border border-[#2a2a32]">
                      Current
                    </span>
                  )}
                  {b.isDefault && (
                    <span className="text-[11px] font-medium bg-[#1e1e24] text-muted-foreground px-2 py-0.5 rounded-md border border-[#2a2a32]">
                      Main
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground mt-1 inline-block">
                  {formatTimeAgo(b.updatedAt || b.createdAt)}
                </span>
              </div>

              <div className="text-xs text-muted-foreground font-medium">
                {changeCount > 0 ? `${changeCount} changes` : "No changes"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Branch Modal */}
      <CreateBranchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultBasedOn={activeBranch || "main"}
      />
    </div>
  );
};
