"use client";

import React, { useMemo, useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  buildThemeMatrix,
  MatrixRowData,
  MatrixCellData,
  TokenCategory,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getCategoryForType,
} from "@/utils/themeHelpers";
import { formatTypographySummary } from "@/utils/transformTokens";
import { AddThemeOptionModal } from "@/components/AddThemeOptionModal";
import { EditThemeGroupModal } from "@/components/EditThemeGroupModal";
import {
  Folder,
  MoreVertical,
  Plus,
  Settings,
  FolderGit2,
  RefreshCw,
  Sparkles,
  Search,
  Type,
  X,
  Check,
  Palette,
  MoveHorizontal,
  Ruler,
  Square,
  Layers,
  Eye,
  Tag,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Pencil,
  Copy,
  Trash2,
  Download,
  AlertTriangle,
} from "lucide-react";

interface ThemeMatrixProps {
  onOpenSettings?: () => void;
}

const CATEGORY_CONFIG: Record<
  TokenCategory,
  {
    label: string;
    icon: React.ElementType;
    badgeStyle: string;
    iconColor: string;
    dotColor: string;
  }
> = {
  color: {
    label: "Color",
    icon: Palette,
    badgeStyle: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    iconColor: "text-amber-400",
    dotColor: "bg-amber-400",
  },
  typography: {
    label: "Typography",
    icon: Type,
    badgeStyle: "bg-violet-500/10 border-violet-500/20 text-violet-400",
    iconColor: "text-violet-400",
    dotColor: "bg-violet-400",
  },
  spacing: {
    label: "Spacing",
    icon: MoveHorizontal,
    badgeStyle: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    iconColor: "text-blue-400",
    dotColor: "bg-blue-400",
  },
  sizing: {
    label: "Sizing",
    icon: Ruler,
    badgeStyle: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    iconColor: "text-emerald-400",
    dotColor: "bg-emerald-400",
  },
  borderRadius: {
    label: "Border & Radius",
    icon: Square,
    badgeStyle: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    iconColor: "text-rose-400",
    dotColor: "bg-rose-400",
  },
  boxShadow: {
    label: "Shadow",
    icon: Layers,
    badgeStyle: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    iconColor: "text-cyan-400",
    dotColor: "bg-cyan-400",
  },
  opacity: {
    label: "Opacity",
    icon: Eye,
    badgeStyle: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    iconColor: "text-yellow-400",
    dotColor: "bg-yellow-400",
  },
  other: {
    label: "Other",
    icon: Tag,
    badgeStyle: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
    iconColor: "text-zinc-400",
    dotColor: "bg-zinc-400",
  },
};

export const ThemeMatrix: React.FC<ThemeMatrixProps> = ({ onOpenSettings }) => {
  const {
    rawTokens,
    themeGroups,
    activeThemeGroupId,
    updateSingleToken,
    credentials,
    setRawTokens,
    setSyncStatus,
    addToast,
    loadSampleData,
    duplicateThemeGroup,
    deleteThemeGroup,
  } = useTokenStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | TokenCategory>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isFetching, setIsFetching] = useState(false);
  const [showAddOptionModal, setShowAddOptionModal] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasCredentials = Boolean(credentials.owner && credentials.repo && credentials.pat);
  const isTotallyEmpty = Object.keys(rawTokens).length === 0;

  // Active theme group (e.g. Theme, Semantic, Components, Brands, Typography, Mode)
  const activeGroup = useMemo(() => {
    return (
      themeGroups.find((g) => g.id === activeThemeGroupId) ||
      themeGroups[0] ||
      null
    );
  }, [themeGroups, activeThemeGroupId]);

  // Build matrix rows for active theme group
  const allMatrixRows = useMemo(() => {
    if (!activeGroup) return [];
    return buildThemeMatrix(rawTokens, activeGroup);
  }, [rawTokens, activeGroup]);

  // Filter matrix rows based on search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return allMatrixRows;

    const q = searchQuery.toLowerCase();
    return allMatrixRows.filter((r) => {
      const matchKey = r.tokenKey.toLowerCase().includes(q);
      const matchType = r.type.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
      const matchCell = Object.values(r.cells).some((c) =>
        c?.rawValue.toLowerCase().includes(q) || c?.resolvedValue.toLowerCase().includes(q)
      );
      return matchKey || matchType || matchCell;
    });
  }, [allMatrixRows, searchQuery]);

  // Compute category count breakdown
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<TokenCategory, number>> = {};
    filteredRows.forEach((row) => {
      counts[row.category] = (counts[row.category] || 0) + 1;
    });
    return counts;
  }, [filteredRows]);

  // Categories that actually exist in the current filtered set
  const availableCategories = useMemo(() => {
    return CATEGORY_ORDER.filter((cat) => (categoryCounts[cat] || 0) > 0);
  }, [categoryCounts]);

  // Group rows by category
  const groupedRows = useMemo(() => {
    const map = new Map<TokenCategory, MatrixRowData[]>();
    CATEGORY_ORDER.forEach((cat) => map.set(cat, []));

    filteredRows.forEach((row) => {
      if (selectedCategory === "all" || selectedCategory === row.category) {
        map.get(row.category)?.push(row);
      }
    });

    return map;
  }, [filteredRows, selectedCategory]);

  const toggleCategoryCollapse = (cat: TokenCategory) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    availableCategories.forEach((cat) => {
      allCollapsed[cat] = true;
    });
    setCollapsedCategories(allCollapsed);
  };

  const handleExpandAll = () => {
    setCollapsedCategories({});
  };

  const handleFetchNow = async () => {
    if (!hasCredentials) {
      if (onOpenSettings) onOpenSettings();
      return;
    }

    setIsFetching(true);
    setSyncStatus("fetching");

    try {
      const res = await fetch("/api/git/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Fetch failed (${res.status})`);
      }

      setRawTokens(data.tokens, data.syncMeta);
      setSyncStatus("success");
      addToast({
        type: "success",
        title: "Tokens Synced Successfully",
        message: `Fetched tokens from ${credentials.provider === "github" ? "GitHub" : "Azure DevOps"} (${credentials.repo}@${credentials.branch}).`,
      });
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: "Git Sync Failed",
        message: err.message,
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Empty Application State
  if (isTotallyEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#09090d] text-center select-none">
        {hasCredentials ? (
          <div className="max-w-md w-full bg-[#121217] border border-zinc-800/80 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  credentials.provider === "github" ? "bg-violet-400" : "bg-blue-400"
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {credentials.provider === "github" ? "GitHub" : "Azure DevOps"} Connected
              </span>
            </div>
            <h3 className="text-base font-semibold text-white">Ready to Sync Theme Matrix</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-mono">
              {credentials.owner}/{credentials.repo} @ {credentials.branch}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full">
              <button
                onClick={handleFetchNow}
                disabled={isFetching}
                className="w-full flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                {isFetching ? "Syncing..." : "Fetch Tokens Now"}
              </button>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-md w-full bg-[#121217] border border-zinc-800/80 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Tokens Studio Second Screen</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Connect to your Git repository to load themes, or load the built-in demo theme matrix.
            </p>

            <div className="flex flex-col gap-3 mt-6 w-full">
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
                >
                  <FolderGit2 className="w-4 h-4" />
                  Configure Git Repository
                </button>
              )}
              <button
                onClick={loadSampleData}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Load Sample Demo Theme Matrix
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090d] overflow-hidden text-xs">
      {/* Top Header Bar of Matrix: 📁 Theme 🟠 ⋮ | Filter + Search + Add option */}
      <div className="h-12 border-b border-zinc-900 bg-[#0d0d11] px-6 flex items-center justify-between flex-shrink-0 select-none">
        {/* Left: Group Title & Badge & Actions Menu */}
        <div className="flex items-center gap-2 text-zinc-200 relative">
          <Folder className="w-4 h-4 text-zinc-400" />
          <span className="font-semibold text-sm">{activeGroup?.name || "Theme"}</span>
          <span
            className="w-2.5 h-2.5 rounded-full ml-0.5"
            style={{ backgroundColor: activeGroup?.color || "#f97316" }}
          />
          <button
            onClick={() => setShowGroupMenu(!showGroupMenu)}
            className={`p-1 rounded ml-1 transition-colors ${
              showGroupMenu
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
            }`}
            title="Theme Group Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Group Actions Popover Menu */}
          {showGroupMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowGroupMenu(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-56 bg-[#121217] border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: activeGroup?.color || "#f97316" }}
                    />
                    <span className="font-semibold text-zinc-200 text-xs truncate">
                      {activeGroup?.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {activeGroup?.options.length} options
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      setShowAddOptionModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <Plus className="w-3.5 h-3.5 text-violet-400" />
                    <span>Add theme option</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      setShowEditGroupModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-400" />
                    <span>Rename & edit color</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      if (activeGroup) duplicateThemeGroup(activeGroup.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Duplicate theme group</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      if (activeGroup) {
                        const jsonStr = JSON.stringify(activeGroup, null, 2);
                        navigator.clipboard.writeText(jsonStr);
                        addToast({
                          type: "success",
                          title: "Theme Group JSON Copied",
                          message: `Copied "${activeGroup.name}" definition to clipboard.`,
                        });
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Copy group JSON</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-zinc-800/80">
                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    disabled={themeGroups.length <= 1}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 transition-colors text-left ${
                      themeGroups.length <= 1
                        ? "text-zinc-600 cursor-not-allowed"
                        : "text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete theme group</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Search Filter & + Add option Button */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-700 w-44 font-mono"
            />
          </div>

          <button
            onClick={() => setShowAddOptionModal(true)}
            className="flex items-center gap-1 px-3 py-1 bg-white text-black font-semibold rounded-md text-xs hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
            title={`Add option to ${activeGroup?.name || "Theme"}`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add option</span>
          </button>
        </div>
      </div>

      {/* Minimal Token Type Filter & Separation Sub-Bar */}
      {availableCategories.length > 0 && (
        <div className="h-10 px-6 border-b border-zinc-900/80 bg-[#0b0b10] flex items-center justify-between flex-shrink-0 select-none overflow-x-auto scrollbar-none">
          {/* Left: Minimal Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-zinc-500" />
              <span>Type:</span>
            </span>

            {/* All Chips */}
            <button
              onClick={() => setSelectedCategory("all")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700/80"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
              }`}
            >
              <span>All Types</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  selectedCategory === "all"
                    ? "bg-zinc-700 text-zinc-200"
                    : "bg-zinc-900 text-zinc-500"
                }`}
              >
                {filteredRows.length}
              </span>
            </button>

            {/* Individual Type Chips */}
            {availableCategories.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const config = CATEGORY_CONFIG[cat];
              const Icon = config.icon;
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700/80"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  }`}
                >
                  <Icon className={`w-3 h-3 ${isSelected ? config.iconColor : "text-zinc-500"}`} />
                  <span>{config.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isSelected
                        ? "bg-zinc-700 text-zinc-200"
                        : "bg-zinc-900 text-zinc-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Expand / Collapse All */}
          {selectedCategory === "all" && availableCategories.length > 1 && (
            <div className="flex items-center gap-2 pl-4 border-l border-zinc-900 flex-shrink-0">
              <button
                onClick={handleExpandAll}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Expand all
              </button>
              <span className="text-zinc-700 text-[10px]">•</span>
              <button
                onClick={handleCollapseAll}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Table Matrix */}
      <div className="flex-1 overflow-auto">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center select-none">
            <p className="text-sm font-medium text-zinc-400">No matching tokens found</p>
            <p className="text-xs text-zinc-600 mt-1">Try adjusting your search filter or selected token type.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header: TOKEN | OPTION_A ⚙️ | OPTION_B ⚙️ */}
            <thead className="sticky top-0 z-20 bg-[#0d0d11] border-b border-zinc-900 text-[11px] font-bold text-zinc-400 tracking-wider shadow-sm">
              <tr>
                <th className="py-3 px-6 w-1/3 font-semibold uppercase text-zinc-500">
                  TOKEN
                </th>
                {activeGroup?.options.map((option) => (
                  <th
                    key={option.id}
                    className="py-3 px-6 font-semibold uppercase text-zinc-400"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{option.name}</span>
                      <Settings className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Separated by Minimal Token Type Section Headers */}
            <tbody className="divide-y divide-zinc-900/60 font-mono">
              {CATEGORY_ORDER.map((cat) => {
                const catRows = groupedRows.get(cat) || [];
                if (catRows.length === 0) return null;

                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;
                const isCollapsed = Boolean(collapsedCategories[cat]);

                return (
                  <React.Fragment key={cat}>
                    {/* Minimal Category Section Separator Header */}
                    <tr
                      onClick={() => toggleCategoryCollapse(cat)}
                      className="bg-[#0e0e15]/95 sticky top-[37px] z-10 border-y border-zinc-800/80 cursor-pointer select-none hover:bg-zinc-900/60 transition-colors backdrop-blur-md"
                    >
                      <td
                        colSpan={(activeGroup?.options.length || 0) + 1}
                        className="py-2 px-6"
                      >
                        <div className="flex items-center justify-between">
                          {/* Left: Category Icon, Name, Count */}
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded border ${config.badgeStyle}`}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
                              {config.label}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono font-medium">
                              ({catRows.length} {catRows.length === 1 ? "token" : "tokens"})
                            </span>
                          </div>

                          {/* Right: Collapse / Expand Chevron Indicator */}
                          <div className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-[10px]">
                            <span className="text-[10px] text-zinc-500">
                              {isCollapsed ? "Expand" : "Collapse"}
                            </span>
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Category Rows */}
                    {!isCollapsed &&
                      catRows.map((row) => (
                        <tr
                          key={row.tokenKey}
                          className="hover:bg-zinc-900/30 transition-colors"
                        >
                          {/* Token Key Name + Type Icon */}
                          <td className="py-2.5 px-6 text-zinc-300 text-xs font-mono select-text align-middle">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dotColor}`}
                                title={`Type: ${config.label}`}
                              />
                              <span className="truncate">{row.tokenKey}</span>
                            </div>
                          </td>

                          {/* Option Columns */}
                          {activeGroup?.options.map((option) => {
                            const cellData = row.cells[option.name];

                            return (
                              <td key={option.id} className="py-2 px-6 align-middle">
                                <MatrixPillCell
                                  cellData={cellData}
                                  tokenType={row.type}
                                  tokenCategory={row.category}
                                  tokenKey={row.tokenKey}
                                  optionName={option.name}
                                  onUpdate={updateSingleToken}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Theme Option Modal */}
      <AddThemeOptionModal
        isOpen={showAddOptionModal}
        onClose={() => setShowAddOptionModal(false)}
        defaultGroupId={activeGroup?.id}
      />

      {/* Edit Theme Group Modal */}
      {activeGroup && (
        <EditThemeGroupModal
          isOpen={showEditGroupModal}
          onClose={() => setShowEditGroupModal(false)}
          groupId={activeGroup.id}
        />
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteConfirm && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-sm bg-[#121217] border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Delete Theme Group</h3>
                <p className="text-xs text-zinc-400">
                  Are you sure you want to delete <span className="font-semibold text-zinc-200">"{activeGroup.name}"</span>?
                </p>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
              This will remove all {activeGroup.options.length} options configured for this group from your theme matrix.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteThemeGroup(activeGroup.id);
                  setShowDeleteConfirm(false);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/25 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Group</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MatrixPillCellProps {
  cellData?: MatrixCellData;
  tokenType: string;
  tokenCategory: TokenCategory;
  tokenKey: string;
  optionName: string;
  onUpdate: (path: string[], newValue: any) => void;
}

const MatrixPillCell: React.FC<MatrixPillCellProps> = ({
  cellData,
  tokenType,
  tokenCategory,
  tokenKey,
  optionName,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(cellData?.rawValue || "");
  const [showTypographyModal, setShowTypographyModal] = useState(false);

  React.useEffect(() => {
    setVal(cellData?.rawValue || "");
  }, [cellData?.rawValue]);

  if (!cellData) {
    return (
      <div className="text-zinc-600 text-[11px] font-mono italic px-3 py-1">
        -
      </div>
    );
  }

  // Check if cell is a composite typography object
  const isCompositeTypography =
    tokenCategory === "typography" &&
    (tokenType === "typography" ||
      (typeof cellData.rawValue === "string" &&
        cellData.rawValue.includes("fontFamily") &&
        cellData.rawValue.startsWith("{")));

  const isColor =
    tokenCategory === "color" ||
    tokenType === "color" ||
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(cellData.resolvedValue.trim()) ||
    /^rgba?\(.+\)$/i.test(cellData.resolvedValue.trim()) ||
    /^hsla?\(.+\)$/i.test(cellData.resolvedValue.trim());

  const isBorderRadius = tokenCategory === "borderRadius";
  const isSpacingOrSizing = tokenCategory === "spacing" || tokenCategory === "sizing";

  const handleBlur = () => {
    setIsEditing(false);
    if (val !== cellData.rawValue) {
      onUpdate(cellData.tokenPath, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setVal(cellData.rawValue);
      setIsEditing(false);
    }
  };

  // If composite typography token, render typography pill with popover inspector
  if (isCompositeTypography) {
    let typoObj: Record<string, string> = {};
    try {
      typoObj = JSON.parse(cellData.rawValue);
    } catch {
      typoObj = {};
    }

    const summaryText = formatTypographySummary(cellData.rawValue);

    return (
      <>
        <div
          onClick={() => setShowTypographyModal(true)}
          className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-800/80 bg-[#121217] hover:border-zinc-700 hover:bg-[#16161d] transition-all max-w-sm w-full cursor-pointer"
          title="Click to inspect/edit typography token properties"
        >
          {/* Left: Aa Badge */}
          <div className="w-4 h-4 rounded flex items-center justify-center bg-violet-600/20 text-violet-400 border border-violet-500/30 text-[10px] font-serif font-bold flex-shrink-0">
            Aa
          </div>

          {/* Right: Typography Summary */}
          <span className="flex-1 font-mono text-xs text-zinc-300 group-hover:text-white truncate">
            {summaryText}
          </span>
        </div>

        {/* Typography Inspector / Editor Modal */}
        {showTypographyModal && (
          <TypographyModal
            tokenKey={tokenKey}
            optionName={optionName}
            typoObj={typoObj}
            onClose={() => setShowTypographyModal(false)}
            onSave={(newObj) => {
              onUpdate(cellData.tokenPath, JSON.stringify(newObj));
              setShowTypographyModal(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div
      className={`group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all max-w-sm w-full ${
        isEditing
          ? "border-violet-500 bg-[#171722] ring-1 ring-violet-500 shadow-md shadow-violet-500/10"
          : "border-zinc-800/80 bg-[#121217] hover:border-zinc-700 hover:bg-[#16161d]"
      }`}
    >
      {/* Left: Swatch / Type Indicator */}
      {isColor ? (
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 border border-black/40 overflow-hidden shadow-inner bg-[conic-gradient(#333_25%,#222_0_50%,#333_0_75%,#222_0)] bg-[length:6px_6px]"
          title={`Computed: ${cellData.resolvedValue}`}
        >
          <div
            className="w-full h-full"
            style={{ backgroundColor: cellData.resolvedValue }}
          />
        </div>
      ) : isBorderRadius ? (
        <div
          className="w-4 h-4 rounded border border-rose-500/40 bg-rose-500/20 flex items-center justify-center flex-shrink-0"
          title={`Border Radius: ${cellData.resolvedValue}`}
        >
          <div
            className="w-2.5 h-2.5 border border-rose-400 bg-rose-400/30"
            style={{
              borderRadius: cellData.resolvedValue.includes("px") || cellData.resolvedValue.includes("rem")
                ? cellData.resolvedValue
                : "2px",
            }}
          />
        </div>
      ) : isSpacingOrSizing ? (
        <div
          className="w-4 h-4 rounded flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 flex-shrink-0"
          title={`Dimension: ${cellData.resolvedValue}`}
        >
          {tokenCategory === "spacing" ? (
            <MoveHorizontal className="w-2.5 h-2.5" />
          ) : (
            <Ruler className="w-2.5 h-2.5" />
          )}
        </div>
      ) : (
        <div
          className="w-4 h-4 rounded flex items-center justify-center bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] font-mono flex-shrink-0"
        >
          #
        </div>
      )}

      {/* Right: Editable Monospace Alias Text */}
      {isEditing ? (
        <input
          type="text"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-xs text-violet-200 outline-none font-mono min-w-0"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className="flex-1 font-mono text-xs text-zinc-300 group-hover:text-white truncate cursor-text select-text"
          title={`Raw: ${cellData.rawValue} | Computed: ${cellData.resolvedValue}`}
        >
          {cellData.rawValue}
        </span>
      )}
    </div>
  );
};

interface TypographyModalProps {
  tokenKey: string;
  optionName: string;
  typoObj: Record<string, string>;
  onClose: () => void;
  onSave: (newObj: Record<string, string>) => void;
}

const TypographyModal: React.FC<TypographyModalProps> = ({
  tokenKey,
  optionName,
  typoObj,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<Record<string, string>>({
    fontFamily: typoObj.fontFamily || "",
    fontWeight: typoObj.fontWeight || "",
    fontSize: typoObj.fontSize || "",
    lineHeight: typoObj.lineHeight || "",
    letterSpacing: typoObj.letterSpacing || "",
    paragraphSpacing: typoObj.paragraphSpacing || "",
    textCase: typoObj.textCase || "",
    textDecoration: typoObj.textDecoration || "",
  });

  const fields = [
    { key: "fontFamily", label: "Font Family", placeholder: "e.g. {font-families.primary}" },
    { key: "fontWeight", label: "Font Weight", placeholder: "e.g. {font-weights.regular} or 400" },
    { key: "fontSize", label: "Font Size", placeholder: "e.g. {font-sizes.base} or 16px" },
    { key: "lineHeight", label: "Line Height", placeholder: "e.g. {line-heights.base} or 24px" },
    { key: "letterSpacing", label: "Letter Spacing", placeholder: "e.g. 0% or 0.5px" },
    { key: "paragraphSpacing", label: "Paragraph Spacing", placeholder: "e.g. 0px" },
    { key: "textCase", label: "Text Case", placeholder: "none, uppercase, lowercase" },
    { key: "textDecoration", label: "Text Decoration", placeholder: "none, underline" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/20">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white font-mono">{tokenKey}</h3>
              <p className="text-xs text-zinc-400">Typography composite token for {optionName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1 font-mono text-xs">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className="grid grid-cols-3 items-center gap-3">
              <label className="text-zinc-400 font-sans text-xs">{label}</label>
              <input
                type="text"
                value={form[key] || ""}
                placeholder={placeholder}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="col-span-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-all"
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-zinc-800 bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-violet-600/30 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Save Typography
          </button>
        </div>
      </div>
    </div>
  );
};
