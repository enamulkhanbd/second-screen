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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const DocumentationView: React.FC = () => {
  const {
    documentation,
    activeDocPageId,
    selectedDocBlockId,
    isDocEditing,
    currentProject,
    currentOrg,
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
      {/* Top Action & Navigation Header */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-border/70 bg-card/40 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight tracking-tight">
                {currentProject?.name || "Project"} Living Docs
              </span>
              <span className="text-[10px] text-muted-foreground leading-none">
                {currentOrg?.name || "Workspace"}
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-border/60 mx-1" />

          {/* Overview Tab Button */}
          <button
            type="button"
            onClick={() => setIsViewingOverview(true)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              isViewingOverview
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Overview</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Edit / Preview Toggle */}
          <div className="flex items-center rounded-xl border border-border/60 bg-muted/40 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setIsDocEditing(false)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                !isDocEditing
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDocEditing(true)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                isDocEditing
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
          </div>

          {/* Markdown Export */}
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Export page as markdown"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Share & Publish Modal Button */}
          <button
            type="button"
            onClick={() => setPublishModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Publish</span>
            {activeDoc.isPublishedGlobally && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {/* Inspector Toggle */}
          <button
            type="button"
            onClick={() => setInspectorOpen((prev) => !prev)}
            className={`rounded-xl border p-1.5 transition-colors ${
              inspectorOpen
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted"
            }`}
            title="Toggle Inspector"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
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
