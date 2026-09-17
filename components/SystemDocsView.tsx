"use client";

import React, { useState, useMemo } from "react";
import { SYSTEM_DOCS_SECTIONS } from "@/data/systemDocsData";
import { SystemDocSection } from "@/types/systemDocs";
import { useTokenStore } from "@/store/useTokenStore";
import {
  BookOpen,
  Search,
  Layers,
  Palette,
  FileText,
  Variable,
  Lightbulb,
  Download,
  GitBranch,
  Package,
  Code2,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Maximize2,
  X,
  Sliders,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Layers,
  Palette,
  FileText,
  Variable,
  Lightbulb,
  Download,
  GitBranch,
  Package,
  Code2,
  Sliders,
};

export const SystemDocsView: React.FC = () => {
  const { setSidebarTab } = useTokenStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string>(
    SYSTEM_DOCS_SECTIONS[0]?.id || "tokens-studio"
  );
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SYSTEM_DOCS_SECTIONS;

    return SYSTEM_DOCS_SECTIONS.filter((sec) => {
      const matchesTitle = sec.title.toLowerCase().includes(q);
      const matchesSummary = sec.summary.toLowerCase().includes(q);
      const matchesHighlights = sec.highlights.some((h) => h.toLowerCase().includes(q));
      const matchesOptions = sec.options?.some(
        (o) => o.name.toLowerCase().includes(q) || o.description.toLowerCase().includes(q)
      );
      return matchesTitle || matchesSummary || matchesHighlights || matchesOptions;
    });
  }, [searchQuery]);

  // Selected section
  const currentSection = useMemo(() => {
    return (
      filteredSections.find((s) => s.id === activeSectionId) ||
      filteredSections[0] ||
      SYSTEM_DOCS_SECTIONS[0]
    );
  }, [filteredSections, activeSectionId]);

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* 1. Minimal Left Navigation Rail */}
      <aside className="w-64 shrink-0 border-r border-border/60 bg-card/20 flex flex-col overflow-hidden hidden md:flex">
        {/* Navigation Header */}
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>System Guide</span>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search guide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/60 border-border/60 rounded-lg"
            />
          </div>
        </div>

        {/* Section List */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
          {filteredSections.map((sec) => {
            const Icon = ICON_MAP[sec.iconName] || BookOpen;
            const isActive = currentSection?.id === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSectionId(sec.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{sec.title}</span>
                </div>
                {sec.screenshotUrl && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                )}
              </button>
            );
          })}

          {filteredSections.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No matching sections
            </div>
          )}
        </nav>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Mobile Section Switcher */}
          <div className="md:hidden space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search guide..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-card/60"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {filteredSections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors ${
                    currentSection?.id === sec.id
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {sec.title}
                </button>
              ))}
            </div>
          </div>

          {currentSection ? (
            <article className="space-y-8">
              {/* Header */}
              <div className="space-y-2 border-b border-border/50 pb-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <span>{currentSection.category}</span>
                    {currentSection.badge && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          {currentSection.badge}
                        </Badge>
                      </>
                    )}
                  </div>

                  {currentSection.quickLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarTab(currentSection.quickLink!.tab)}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer"
                    >
                      <span>{currentSection.quickLink.label}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {currentSection.title}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentSection.summary}
                </p>
              </div>

              {/* System Screenshot Frame */}
              {currentSection.screenshotUrl && (
                <div className="space-y-2">
                  <div className="relative group rounded-xl border border-border/80 bg-[#09090d] shadow-md overflow-hidden">
                    {/* Minimal Window Header Bar */}
                    <div className="flex items-center justify-between px-3 py-2 bg-[#121316] border-b border-border/60">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {currentSection.title.toLowerCase().replace(/\s+/g, "-")}.png
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewImage(currentSection.screenshotUrl!)}
                        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Expand Image"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Image Preview */}
                    <div
                      className="cursor-zoom-in overflow-hidden flex items-center justify-center p-2 bg-[#09090d]"
                      onClick={() => setPreviewImage(currentSection.screenshotUrl!)}
                    >
                      <img
                        src={currentSection.screenshotUrl}
                        alt={currentSection.screenshotCaption || currentSection.title}
                        className="max-h-[360px] w-auto rounded-lg object-contain border border-border/40 transition-transform duration-200 group-hover:scale-[1.01]"
                      />
                    </div>
                  </div>

                  {currentSection.screenshotCaption && (
                    <p className="text-center text-[11px] text-muted-foreground/80 italic">
                      {currentSection.screenshotCaption}
                    </p>
                  )}
                </div>
              )}

              {/* Key Highlights */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Key Principles &amp; How It Works
                </h2>
                <ul className="space-y-2">
                  {currentSection.highlights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Main Options */}
              {currentSection.options && currentSection.options.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Core Options
                  </h2>
                  <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card/30">
                    {currentSection.options.map((opt, optIdx) => (
                      <div key={optIdx} className="p-3.5 text-xs space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span className="font-mono text-primary text-[11px]">{opt.name}</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ) : (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Select a section to view its guidelines.
            </div>
          )}
        </div>
      </main>

      {/* Lightbox Modal for Full-Resolution Screenshot */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-card rounded-2xl border border-border overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background rounded-full p-1.5 text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={previewImage}
              alt="System Screenshot Preview"
              className="max-h-[85vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
