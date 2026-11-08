"use client";

import React, { useState, useMemo } from "react";
import { SYSTEM_CHANGELOG, LATEST_VERSION } from "@/data/systemChangelog";
import { SystemChangelogEntry, ChangelogCategory } from "@/types/changelog";
import {
  Rocket,
  Sparkles,
  Zap,
  Wrench,
  Link2,
  Palette,
  Shield,
  Search,
  Calendar,
  Tag,
  Copy,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CATEGORY_CONFIG: Record<
  ChangelogCategory,
  { label: string; icon: React.FC<{ className?: string }>; color: string; badgeVariant: "default" | "secondary" | "violet" | "success" | "warning" | "destructive" }
> = {
  feature: {
    label: "New Feature",
    icon: Sparkles,
    color: "text-primary bg-primary/10 border-primary/20",
    badgeVariant: "default",
  },
  enhancement: {
    label: "Enhancement",
    icon: Zap,
    color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    badgeVariant: "warning",
  },
  fix: {
    label: "Bug Fix",
    icon: Wrench,
    color: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
    badgeVariant: "destructive",
  },
  integration: {
    label: "Integration",
    icon: Link2,
    color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    badgeVariant: "violet",
  },
  ui: {
    label: "UI & Polish",
    icon: Palette,
    color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    badgeVariant: "secondary",
  },
  security: {
    label: "Security",
    icon: Shield,
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    badgeVariant: "success",
  },
};

export const SystemChangelogView: React.FC = () => {
  const [selectedVersion, setSelectedVersion] = useState<string>(LATEST_VERSION);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedVersion, setCopiedVersion] = useState<string | null>(null);

  // Active version entry
  const activeEntry: SystemChangelogEntry = useMemo(() => {
    return (
      SYSTEM_CHANGELOG.find((entry) => entry.version === selectedVersion) ||
      SYSTEM_CHANGELOG[0]
    );
  }, [selectedVersion]);

  // Filter items in active version
  const filteredItems = useMemo(() => {
    return activeEntry.items.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [activeEntry, selectedCategory, searchQuery]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Partial<Record<ChangelogCategory, typeof filteredItems>> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category]!.push(item);
    }
    return groups;
  }, [filteredItems]);

  const handleCopyMarkdown = (entry: SystemChangelogEntry) => {
    let md = `# ${entry.version} — ${entry.title} (${entry.releaseDate})\n\n`;
    md += `${entry.summary}\n\n`;

    if (entry.highlights && entry.highlights.length > 0) {
      md += `### 🚀 Highlights\n`;
      entry.highlights.forEach((h) => (md += `- ${h}\n`));
      md += `\n`;
    }

    const categories: ChangelogCategory[] = [
      "feature",
      "enhancement",
      "fix",
      "integration",
      "ui",
      "security",
    ];

    for (const cat of categories) {
      const itemsInCat = entry.items.filter((i) => i.category === cat);
      if (itemsInCat.length > 0) {
        md += `### ${CATEGORY_CONFIG[cat].label}s\n`;
        itemsInCat.forEach((item) => {
          md += `- **${item.title}**: ${item.description}\n`;
        });
        md += `\n`;
      }
    }

    navigator.clipboard.writeText(md);
    setCopiedVersion(entry.version);
    setTimeout(() => setCopiedVersion(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* 1. Header Toolbar */}
      <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-card/60 backdrop-blur-md flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-md">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground tracking-tight">
                System Changelog &amp; Releases
              </h1>
              <Badge variant="violet" className="text-[10px] font-mono py-0 px-1.5 font-semibold">
                {LATEST_VERSION} Latest
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Explore platform version history, new features, enhancements, and system upgrades.
            </p>
          </div>
        </div>

        {/* Right Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search features or fixes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs w-60"
            />
          </div>
        </div>
      </header>

      {/* 2. Main Master-Detail Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        {/* ============================================================= */}
        {/* LEFT SIDE: Version Timeline Selector (w-80 to w-96)           */}
        {/* ============================================================= */}
        <div className="w-full lg:w-80 xl:w-88 border-b lg:border-b-0 lg:border-r border-border bg-muted/15 flex flex-col flex-shrink-0 h-64 lg:h-full overflow-hidden">
          {/* Sub-Header */}
          <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
            <span className="font-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
              Releases ({SYSTEM_CHANGELOG.length})
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Timeline
            </span>
          </div>

          {/* Timeline Scroll List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {SYSTEM_CHANGELOG.map((entry) => {
              const isSelected = entry.version === selectedVersion;

              const featureCount = entry.items.filter((i) => i.category === "feature").length;
              const enhancementCount = entry.items.filter((i) => i.category === "enhancement").length;
              const fixCount = entry.items.filter((i) => i.category === "fix").length;

              return (
                <button
                  key={entry.version}
                  onClick={() => setSelectedVersion(entry.version)}
                  className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer select-none space-y-2 ${
                    isSelected
                      ? "bg-card border-primary shadow-sm ring-1 ring-primary/30"
                      : "bg-card/50 border-border/70 hover:bg-card text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {entry.version}
                      </span>
                      {entry.isLatest && (
                        <Badge variant="violet" className="text-[9px] py-0 px-1 font-semibold">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{entry.releaseDate}</span>
                    </span>
                  </div>

                  <h3 className={`text-xs font-semibold leading-snug line-clamp-1 ${isSelected ? "text-foreground" : "text-foreground/80"}`}>
                    {entry.title}
                  </h3>

                  {/* Summary Counters */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {featureCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>{featureCount} {featureCount === 1 ? "feature" : "features"}</span>
                      </span>
                    )}
                    {enhancementCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                        <Zap className="w-2.5 h-2.5" />
                        <span>{enhancementCount}</span>
                      </span>
                    )}
                    {fixCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">
                        <Wrench className="w-2.5 h-2.5" />
                        <span>{fixCount}</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================= */}
        {/* RIGHT SIDE: Version Details View (flex-1)                     */}
        {/* ============================================================= */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 lg:p-8 bg-background space-y-6 min-w-0">
          {/* 1. Release Hero Card */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={activeEntry.badgeVariant || "default"} className="text-xs font-bold py-0.5 px-2.5">
                    {activeEntry.badge}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Released on {activeEntry.releaseDate}</span>
                  </span>
                  {activeEntry.isLatest && (
                    <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      Current Stable Build
                    </Badge>
                  )}
                </div>

                <h2 className="text-xl font-bold text-foreground tracking-tight pt-1">
                  {activeEntry.version} — {activeEntry.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeEntry.summary}
                </p>
              </div>

              {/* Copy Markdown Notes Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyMarkdown(activeEntry)}
                className="gap-1.5 text-xs font-semibold h-8 cursor-pointer flex-shrink-0 shadow-2xs"
                title="Copy release notes formatted in Markdown"
              >
                {copiedVersion === activeEntry.version ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied Notes!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </Button>
            </div>

            {/* Highlights Box */}
            {activeEntry.highlights && activeEntry.highlights.length > 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Release Highlights</span>
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground/90 font-medium">
                  {activeEntry.highlights.map((hl, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 2. Category Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap border-b border-border/80 pb-3">
            <button
              onClick={() => setSelectedCategory("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition  cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Changes ({activeEntry.items.length})
            </button>

            {(Object.keys(CATEGORY_CONFIG) as ChangelogCategory[]).map((cat) => {
              const count = activeEntry.items.filter((i) => i.category === cat).length;
              if (count === 0) return null;

              const config = CATEGORY_CONFIG[cat];
              const Icon = config.icon;
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition  cursor-pointer ${
                    isSelected
                      ? "bg-foreground text-background shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{config.label}s ({count})</span>
                </button>
              );
            })}
          </div>

          {/* 3. Categorized Change Items */}
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground font-mono bg-card border border-border rounded-xl">
              No changes match your search or category filter.
            </div>
          ) : (
            <div className="space-y-6">
              {(Object.keys(groupedItems) as ChangelogCategory[]).map((cat) => {
                const items = groupedItems[cat];
                if (!items || items.length === 0) return null;

                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;

                return (
                  <div key={cat} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">
                        {config.label}s ({items.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-border bg-card shadow-2xs hover:shadow-xs transition space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                              <span>{item.title}</span>
                            </h4>
                            <Badge variant={config.badgeVariant} className="text-[9px] font-semibold py-0 px-1.5">
                              {config.label}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>

                          {item.tags && item.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {item.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
