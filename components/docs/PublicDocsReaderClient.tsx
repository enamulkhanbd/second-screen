"use client";



import React, { useEffect, useState, useMemo } from "react";
import { ProjectDocumentation, DocPage } from "@/types/documentation";
import { DocsTokensProvider, DocsTokensContextValue } from "@/components/docs/DocsTokensContext";
import { CalloutBlock } from "@/components/docs/blocks/CalloutBlock";
import { DoDontBlock } from "@/components/docs/blocks/DoDontBlock";
import { VariablesTableBlock } from "@/components/docs/blocks/VariablesTableBlock";
import { VariableSwatchesBlock } from "@/components/docs/blocks/VariableSwatchesBlock";
import { VariableTypographyBlock } from "@/components/docs/blocks/VariableTypographyBlock";
import { TokensTableBlock } from "@/components/docs/blocks/TokensTableBlock";
import { MarkdownBlock } from "@/components/docs/blocks/MarkdownBlock";
import {
  BookOpen,
  Folder,
  FileText,
  Lock,
  Search,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useTokenStore } from "@/store/useTokenStore";
import { flattenAndResolveTokens } from "@/utils/transformTokens";

interface PublicDocsReaderClientProps {
  initialData: {
    orgName: string;
    projectName: string;
    documentation: ProjectDocumentation;
    rawTokens?: any;
    figmaVariables?: any;
  } | null;
  orgSlug: string;
  projectSlug: string;
}

export function PublicDocsReaderClient({
  initialData,
}: PublicDocsReaderClientProps) {
  const docData = initialData;
  const [activePageId, setActivePageId] = useState<string | null>(() => {
    return initialData?.documentation?.pages?.find((p) => p.isPublished)?.id || null;
  });
  const [navSearch, setNavSearch] = useState("");

  const docsTokensValue = useMemo<DocsTokensContextValue>(() => {
    if (!docData) {
      return {
        resolvedTokens: [],
        figmaResolvedVariables: [],
        figmaVariables: {},
      };
    }
    const rawToUse = docData.documentation?.publishedTokens || docData.rawTokens || {};
    const figmaToUse = docData.documentation?.publishedVariables || docData.figmaVariables || {};

    const resolvedTokens =
      Object.keys(rawToUse).length > 0 ? flattenAndResolveTokens(rawToUse, "ALL") : [];
    const figmaResolvedVariables =
      Object.keys(figmaToUse).length > 0 ? flattenAndResolveTokens(figmaToUse, "ALL") : [];

    return {
      resolvedTokens,
      figmaResolvedVariables,
      figmaVariables: figmaToUse,
    };
  }, [docData]);

  useEffect(() => {
    if (!docData) return;
    const rawToUse = docData.documentation?.publishedTokens || docData.rawTokens || {};
    useTokenStore.setState({
      rawTokens: rawToUse,
      resolvedTokens: docsTokensValue.resolvedTokens,
      figmaVariables: docsTokensValue.figmaVariables,
      figmaResolvedVariables: docsTokensValue.figmaResolvedVariables,
    });
  }, [docData, docsTokensValue]);

  const documentation = docData?.documentation;
  const publishedPages = useMemo(() => {
    if (!documentation) return [];
    return documentation.pages.filter((p) => p.isPublished);
  }, [documentation]);

  const activePage: DocPage | null = useMemo(() => {
    if (!publishedPages.length) return null;
    return publishedPages.find((p) => p.id === activePageId) || publishedPages[0] || null;
  }, [publishedPages, activePageId]);

  const filteredPages = useMemo(() => {
    return publishedPages.filter((p) =>
      p.title.toLowerCase().includes(navSearch.toLowerCase())
    );
  }, [publishedPages, navSearch]);

  const folders = documentation?.folders || [];

  if (!docData || !documentation || publishedPages.length === 0) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground focus:outline-none"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Documentation Unavailable</h1>
        <p className="mt-2 max-w-md text-xs text-muted-foreground">
          This documentation is currently set to private or has not been published yet.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </Link>
      </main>
    );
  }

  return (
    <DocsTokensProvider value={docsTokensValue}>
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground antialiased">
      {/* Top Reader Navbar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/70 bg-background/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Return to studio"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight tracking-tight">
                {docData.projectName} Docs
              </span>
              <span className="text-[10px] text-muted-foreground leading-none">
                {docData.orgName}
              </span>
            </div>
          </Link>

          <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] ml-2 font-mono">
            Living Design System
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span>Open Studio</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border/70 bg-card/30 p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Search docs..."
              className="h-8 w-full rounded-lg border border-border/60 bg-background/80 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 text-xs">
            {/* Root pages */}
            <div className="space-y-0.5">
              {filteredPages
                .filter((p) => !p.folderId)
                .map((page) => {
                  const isActive = page.id === activePage?.id;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => setActivePageId(page.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground/80 hover:bg-muted/50"
                        }`}
                    >
                      <FileText className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="truncate text-xs">{page.title}</span>
                    </button>
                  );
                })}
            </div>

            {/* Folders */}
            {folders.map((folder) => {
              const folderPages = filteredPages.filter((p) => p.folderId === folder.id);
              if (folderPages.length === 0) return null;

              return (
                <div key={folder.id} className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Folder className="h-3 w-3" />
                    <span>{folder.title}</span>
                  </div>
                  <div className="ml-2 space-y-0.5 border-l border-border/50 pl-2">
                    {folderPages.map((page) => {
                      const isActive = page.id === activePage?.id;
                      return (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => setActivePageId(page.id)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors ${isActive
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-foreground/80 hover:bg-muted/50"
                            }`}
                        >
                          <FileText className={`h-3 w-3 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="truncate text-xs">{page.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Reader Canvas */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          {/* Compact page picker where the sidebar is hidden */}
          <div className="md:hidden sticky top-0 z-10 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur">
            <label htmlFor="mobile-page-picker" className="sr-only">
              Choose a page
            </label>
            <select
              id="mobile-page-picker"
              value={activePage?.id ?? ""}
              onChange={(event) => setActivePageId(event.target.value)}
              className="h-9 w-full rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              {publishedPages.map((page) => {
                const folder = folders.find((f) => f.id === page.folderId);
                return (
                  <option key={page.id} value={page.id}>
                    {folder ? `${folder.title} / ${page.title}` : page.title}
                  </option>
                );
              })}
            </select>
          </div>
          {activePage ? (
            <div>
              {/* Header Banner */}
              <div
                className={`border-b border-border/60 ${activePage.layout === "hero"
                    ? "py-16 px-8 md:px-16"
                    : activePage.layout === "feature"
                      ? "py-12 px-8 border-l-4 border-l-primary"
                      : "py-10 px-8"
                  }`}
                style={
                  activePage.headerBackground && activePage.headerBackground !== "transparent"
                    ? { background: activePage.headerBackground }
                    : undefined
                }
              >
                <div className="mx-auto max-w-4xl space-y-3">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {activePage.title}
                  </h1>
                  {activePage.description && (
                    <p className="max-w-2xl text-sm text-muted-foreground sm:text-base leading-relaxed">
                      {activePage.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Blocks */}
              <div className="mx-auto max-w-4xl p-6 md:p-10 space-y-6">
                {activePage.blocks.map((block) => (
                  <div key={block.id}>
                    {block.type === "callout" && (
                      <CalloutBlock
                        block={block}
                        isEditing={false}
                        onUpdate={() => { }}
                      />
                    )}
                    {block.type === "dodont" && (
                      <DoDontBlock
                        block={block}
                        isEditing={false}
                        onUpdate={() => { }}
                      />
                    )}
                    {block.type === "variables-table" && (
                      <VariablesTableBlock
                        block={block}
                        isEditing={false}
                        onUpdate={() => { }}
                      />
                    )}
                    {block.type === "color-swatches" && (
                      <VariableSwatchesBlock
                        block={block}
                        isEditing={false}
                        onUpdate={() => { }}
                      />
                    )}
                    {block.type === "typography-scale" && (
                      <VariableTypographyBlock
                        block={block}
                        isEditing={false}
                        onUpdate={() => { }}
                      />
                    )}
                    {block.type === "tokens-table" && (
                      <TokensTableBlock
                        block={block}
                        isEditing={false}
                        onUpdate={() => { }}
                      />
                    )}
                    {(block.type === "paragraph" ||
                      block.type === "heading" ||
                      block.type === "code") && (
                        <MarkdownBlock
                          block={block}
                          isEditing={false}
                          onUpdate={() => { }}
                        />
                      )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-xs text-muted-foreground">
              No page selected.
            </div>
          )}
        </main>
      </div>
    </div>
    </DocsTokensProvider>
  );
}
