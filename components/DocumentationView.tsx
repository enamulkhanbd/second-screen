"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { createEmptyDocumentation } from "@/types/documentation";
import { DocTreeNav } from "./docs/DocTreeNav";
import { DocCanvas } from "./docs/DocCanvas";
import { DocBlockInspector } from "./docs/DocBlockInspector";
import { DocOverviewRoot } from "./docs/DocOverviewRoot";
import { DocPublishModal } from "./docs/DocPublishModal";
import { DocEmptyStateGuide } from "./docs/DocEmptyStateGuide";
import {
  BookOpen,
  Edit3,
  Eye,
  SlidersHorizontal,
  Globe,
  Download,
  Share2,
  Sparkles,
  LayoutGrid,
  FolderGit2,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const DocumentationView: React.FC = () => {
  const {
    documentation,
    activeDocPageId,
    selectedDocBlockId,
    isDocEditing,
    currentProject,
    currentOrg,
    credentials,
    resolvedTokens,
    figmaResolvedVariables,
    setActiveDocPageId,
    setSelectedDocBlockId,
    setIsDocEditing,
    addDocFolder,
    updateDocFolder,
    deleteDocFolder,
    addDocPage,
    updateDocPage,
    deleteDocPage,
    addDocBlock,
    updateDocBlock,
    deleteDocBlock,
    reorderDocBlocks,
    publishDocPage,
    publishEntireDocumentation,
    loadStarterDocumentationTemplate,
    addToast,
  } = useTokenStore();

  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [isViewingOverview, setIsViewingOverview] = useState(false);

  // Active documentation object (defaults to empty documentation on first load)
  const activeDoc = useMemo(() => {
    if (documentation) {
      return documentation;
    }
    return createEmptyDocumentation();
  }, [documentation]);

  // Active page
  const activePage = useMemo(() => {
    if (!activeDocPageId) return activeDoc.pages[0] || null;
    return activeDoc.pages.find((p) => p.id === activeDocPageId) || activeDoc.pages[0] || null;
  }, [activeDoc, activeDocPageId]);

  const handleSelectPage = (pageId: string) => {
    setActiveDocPageId(pageId);
    setIsViewingOverview(false);
    setSelectedDocBlockId(null);
  };

  const handleAddPage = async (folderId?: string | null) => {
    const page = await addDocPage("New Page", folderId);
    setActiveDocPageId(page.id);
    setIsViewingOverview(false);
  };

  const handleAddFolder = async () => {
    await addDocFolder("New Section");
  };

  const handleExportMarkdown = () => {
    if (!activePage) return;
    let md = `# ${activePage.title}\n\n`;
    if (activePage.description) {
      md += `*${activePage.description}*\n\n`;
    }
    activePage.blocks.forEach((b) => {
      if (b.type === "callout") {
        md += `> **${b.settings?.calloutVariant?.toUpperCase() || "NOTE"}**: ${b.content || ""}\n\n`;
      } else if (b.type === "dodont") {
        md += `### Do's & Don'ts\n- **DO**: ${b.settings?.doText || ""}\n- **DON'T**: ${b.settings?.dontText || ""}\n\n`;
      } else if (b.type === "variables-table" || b.type === "tokens-table") {
        md += `### Variables & Tokens\n| Name | Value | Type |\n| :--- | :--- | :--- |\n`;
        const list = figmaResolvedVariables.length > 0 ? figmaResolvedVariables : resolvedTokens;
        list.slice(0, 20).forEach((t) => {
          md += `| \`${t.name}\` | \`${t.resolvedValue || t.rawValue}\` | \`${t.type}\` |\n`;
        });
        md += `\n`;
      } else {
        md += `${b.content || ""}\n\n`;
      }
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activePage.slug || "documentation"}.md`;
    a.click();
    URL.revokeObjectURL(url);

    addToast({
      type: "success",
      title: "Markdown Exported",
      message: `Exported ${activePage.title}.md`,
    });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Top Action & Navigation Header (Aligned with ThemeMatrix & other studio tabs) */}
      <header className="min-h-12 py-2 px-3 sm:px-4 xl:px-6 border-b border-border bg-muted/20 flex items-center justify-between gap-3 flex-shrink-0 transition-colors">
        {/* Left: Current Page / Overview Title & Context Indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-semibold text-sm text-foreground truncate">
            {isViewingOverview
              ? "Documentation Directory"
              : activePage?.title || "Living Documentation"}
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              activeDoc.isPublishedGlobally ? "bg-emerald-500" : "bg-blue-500"
            }`}
            title={activeDoc.isPublishedGlobally ? "Published Live" : "Draft Mode"}
          />
          {activePage?.folderId && (
            <span className="hidden sm:inline-block text-xs text-muted-foreground font-mono">
              / {activeDoc.folders.find((f) => f.id === activePage.folderId)?.title || "Section"}
            </span>
          )}
          {activeDoc.isPublishedGlobally ? (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Live
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono text-muted-foreground border border-border/60">
              Draft
            </span>
          )}
        </div>

        {/* Right Actions: Repo Pill, Overview Toggle, Edit/Preview Switch, Export, Publish & Inspector */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Sync Provider / Project Repo Badge (matching other tabs) */}
          {credentials?.repo ? (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/60 text-[11px] font-mono text-muted-foreground">
              <FolderGit2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-foreground truncate max-w-[130px]">
                {credentials.repo}
              </span>
              <span className="text-[10px]">@{credentials.branch || "main"}</span>
            </div>
          ) : currentProject ? (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/60 text-[11px] font-mono text-muted-foreground">
              <FolderGit2 className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground truncate max-w-[130px]">
                {currentProject.name}
              </span>
            </div>
          ) : null}

          {/* Overview Directory Switcher Button */}
          <Button
            variant={isViewingOverview ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsViewingOverview(!isViewingOverview)}
            className="h-8 text-xs gap-1.5 font-medium"
            title="Toggle Documentation Overview"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Overview</span>
          </Button>

          {/* Edit / Preview Segmented Switch */}
          {!isViewingOverview && activeDoc.pages.length > 0 && (
            <div className="flex items-center rounded-md border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setIsDocEditing(false)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                  !isDocEditing
                    ? "bg-muted text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDocEditing(true)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                  isDocEditing
                    ? "bg-muted text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Edit</span>
              </button>
            </div>
          )}

          {/* Markdown Export Button */}
          {activePage && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMarkdown}
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              title="Export page as markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Export</span>
            </Button>
          )}

          {/* Solid Green CTA Button matching `+ Add option` in other tabs */}
          <Button
            size="sm"
            onClick={() => setPublishModalOpen(true)}
            className="gap-1.5 h-8 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Publish</span>
            {activeDoc.isPublishedGlobally && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
            )}
          </Button>

          {/* Inspector Drawer Toggle */}
          {!isViewingOverview && activeDoc.pages.length > 0 && (
            <Button
              variant={inspectorOpen ? "secondary" : "outline"}
              size="icon-sm"
              onClick={() => setInspectorOpen((prev) => !prev)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Toggle Inspector Drawer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </header>

      {/* 3-Column Studio Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Navigation Tree */}
        <DocTreeNav
          documentation={activeDoc}
          activePageId={isViewingOverview ? null : (activePage?.id || null)}
          onSelectPage={handleSelectPage}
          onAddPage={handleAddPage}
          onAddFolder={handleAddFolder}
          onUpdateFolder={updateDocFolder}
          onDeleteFolder={deleteDocFolder}
          onUpdatePage={(pageId, updates) => updateDocPage(pageId, updates)}
          onDeletePage={deleteDocPage}
        />

        {/* Center: Empty State Guide, Overview, or Canvas */}
        {activeDoc.pages.length === 0 ? (
          <DocEmptyStateGuide
            projectName={currentProject?.name}
            onCreateFirstPage={() => handleAddPage(null)}
            onLoadTemplate={loadStarterDocumentationTemplate}
            onCreateFolder={handleAddFolder}
          />
        ) : isViewingOverview ? (
          <DocOverviewRoot
            documentation={activeDoc}
            onSelectPage={handleSelectPage}
            onOpenPublishModal={() => setPublishModalOpen(true)}
          />
        ) : (
          <DocCanvas
            page={activePage}
            isEditing={isDocEditing}
            selectedBlockId={selectedDocBlockId}
            onSelectBlock={(blockId) => setSelectedDocBlockId(blockId)}
            onUpdatePage={(updates) => activePage && updateDocPage(activePage.id, updates)}
            onAddBlock={(block, insertIndex) =>
              activePage && addDocBlock(activePage.id, block, insertIndex)
            }
            onUpdateBlock={(blockId, updates) =>
              activePage && updateDocBlock(activePage.id, blockId, updates)
            }
            onDeleteBlock={(blockId) => activePage && deleteDocBlock(activePage.id, blockId)}
            onReorderBlocks={(blocks) => activePage && reorderDocBlocks(activePage.id, blocks)}
          />
        )}

        {/* Right: Inspector Panel (only when pages exist and not viewing overview) */}
        {inspectorOpen && activeDoc.pages.length > 0 && !isViewingOverview && (
          <DocBlockInspector
            page={activePage}
            selectedBlockId={selectedDocBlockId}
            onUpdatePage={(updates) => activePage && updateDocPage(activePage.id, updates)}
            onUpdateBlock={(blockId, updates) =>
              activePage && updateDocBlock(activePage.id, blockId, updates)
            }
            onDeleteBlock={(blockId) => activePage && deleteDocBlock(activePage.id, blockId)}
            onClose={() => setInspectorOpen(false)}
          />
        )}
      </div>

      {/* Publish & Share Modal */}
      <DocPublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        documentation={activeDoc}
        onPublishGlobally={publishEntireDocumentation}
        onPublishPage={publishDocPage}
      />
    </div>
  );
};
