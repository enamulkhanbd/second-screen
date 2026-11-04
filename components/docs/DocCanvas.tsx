"use client";

import React, { useState } from "react";
import { DocPage, DocBlock, DocBlockType } from "@/types/documentation";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Calendar,
  Sparkles,
  Layers,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CalloutBlock } from "./blocks/CalloutBlock";
import { DoDontBlock } from "./blocks/DoDontBlock";
import { VariablesTableBlock } from "./blocks/VariablesTableBlock";
import { VariableSwatchesBlock } from "./blocks/VariableSwatchesBlock";
import { VariableTypographyBlock } from "./blocks/VariableTypographyBlock";
import { TokensTableBlock } from "./blocks/TokensTableBlock";
import { MarkdownBlock } from "./blocks/MarkdownBlock";
import { DocSlashMenu } from "./DocSlashMenu";

interface DocCanvasProps {
  page: DocPage | null;
  isEditing: boolean;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  onUpdatePage: (updates: Partial<DocPage>) => void;
  onAddBlock: (block: Omit<DocBlock, "id">, insertIndex?: number) => void;
  onUpdateBlock: (blockId: string, updates: Partial<DocBlock>) => void;
  onDeleteBlock: (blockId: string) => void;
  onReorderBlocks: (blocks: DocBlock[]) => void;
}

export const DocCanvas: React.FC<DocCanvasProps> = ({
  page,
  isEditing,
  selectedBlockId,
  onSelectBlock,
  onUpdatePage,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onReorderBlocks,
}) => {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [insertTargetIndex, setInsertTargetIndex] = useState<number | undefined>(undefined);

  if (!page) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Layers className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">No Page Selected</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose a documentation page from the sidebar or create a new one.
        </p>
      </div>
    );
  }

  const handleOpenSlashMenu = (index?: number) => {
    setInsertTargetIndex(index);
    setSlashMenuOpen(true);
  };

  const handleSelectBlockType = (type: DocBlockType) => {
    let initialContent = "";
    let initialSettings: any = {};

    if (type === "callout") {
      initialContent = "Add useful guidance, advice, or warnings for this design token set.";
      initialSettings = { calloutVariant: "info" };
    } else if (type === "dodont") {
      initialSettings = {
        doText: "Use semantic tokens for brand colors and responsive spacing.",
        dontText: "Don't hardcode fixed px values or raw hex colors.",
      };
    } else if (type === "variables-table") {
      initialSettings = { filterType: "all", showSearchBox: true };
    } else if (type === "color-swatches") {
      initialSettings = { filterType: "color", showSearchBox: true };
    } else if (type === "typography-scale") {
      initialSettings = { filterType: "dimension", showSearchBox: false };
    } else if (type === "heading") {
      initialContent = "# Section Title";
    } else if (type === "paragraph") {
      initialContent = "Provide documentation description and guidelines here...";
    } else if (type === "tokens-table") {
      initialSettings = { filterType: "all", showSearchBox: true };
    }

    onAddBlock(
      {
        type,
        content: initialContent,
        settings: initialSettings,
      },
      insertTargetIndex
    );
    setSlashMenuOpen(false);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const blocks = [...page.blocks];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const temp = blocks[index];
    blocks[index] = blocks[targetIdx];
    blocks[targetIdx] = temp;
    onReorderBlocks(blocks);
  };

  // Header background style
  const headerBgStyle = page.headerBackground && page.headerBackground !== "transparent"
    ? { background: page.headerBackground }
    : undefined;

  const isHero = page.layout === "hero";
  const isFeature = page.layout === "feature";

  return (
    <main className="relative flex-1 overflow-y-auto bg-background/50">
      {/* Page Header Banner */}
      <div
        className={`relative border-b border-border/60 transition-colors ${
          isHero
            ? "py-16 px-8 md:px-16"
            : isFeature
            ? "py-12 px-8 border-l-4 border-l-primary"
            : "py-8 px-8"
        }`}
        style={headerBgStyle}
      >
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge
                variant={page.isPublished ? "secondary" : "outline"}
                className="text-[10px] font-medium uppercase tracking-wider"
              >
                {page.isPublished ? "Published" : "Draft"}
              </Badge>
              {page.layout && page.layout !== "classic" && (
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  {page.layout} layout
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Updated {new Date(page.updatedAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Title */}
          {isEditing ? (
            <input
              type="text"
              value={page.title}
              onChange={(e) => onUpdatePage({ title: e.target.value })}
              placeholder="Page Title"
              className="w-full bg-transparent text-2xl font-bold tracking-tight text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 sm:text-3xl md:text-4xl"
            />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {page.title}
            </h1>
          )}

          {/* Description */}
          {isEditing ? (
            <textarea
              value={page.description || ""}
              onChange={(e) => onUpdatePage({ description: e.target.value })}
              placeholder="Add an introductory overview for this page..."
              rows={2}
              className="w-full resize-y rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          ) : (
            page.description && (
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {page.description}
              </p>
            )
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-4xl p-6 md:p-8 space-y-6">
        {page.blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">Empty Page</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Add living documentation blocks such as color swatches, variable tables, Do's & Don'ts, or markdown guidelines.
            </p>
            {isEditing && (
              <button
                type="button"
                onClick={() => handleOpenSlashMenu(0)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Block</span>
              </button>
            )}
          </div>
        ) : (
          page.blocks.map((block, index) => {
            const isSelected = selectedBlockId === block.id;

            return (
              <div
                key={block.id}
                onClick={() => onSelectBlock(block.id)}
                className={`group relative transition ${
                  isEditing
                    ? `cursor-pointer rounded-2xl p-1 ${
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "hover:ring-1 hover:ring-border"
                      }`
                    : ""
                }`}
              >
                {/* Block Controls Toolbar (when in edit mode) */}
                {isEditing && (
                  <div className="mb-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
                      {block.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(index, "up");
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === page.blocks.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(index, "down");
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBlock(block.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete Block"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Render Appropriate Block */}
                {block.type === "callout" && (
                  <CalloutBlock
                    block={block}
                    isEditing={isEditing}
                    onUpdate={(up) => onUpdateBlock(block.id, up)}
                    onDelete={() => onDeleteBlock(block.id)}
                  />
                )}
                {block.type === "dodont" && (
                  <DoDontBlock
                    block={block}
                    isEditing={isEditing}
                    onUpdate={(up) => onUpdateBlock(block.id, up)}
                    onDelete={() => onDeleteBlock(block.id)}
                  />
                )}
                {block.type === "variables-table" && (
                  <VariablesTableBlock
                    block={block}
                    isEditing={isEditing}
                    onUpdate={(up) => onUpdateBlock(block.id, up)}
                    onDelete={() => onDeleteBlock(block.id)}
                  />
                )}
                {block.type === "color-swatches" && (
                  <VariableSwatchesBlock
                    block={block}
                    isEditing={isEditing}
                    onUpdate={(up) => onUpdateBlock(block.id, up)}
                    onDelete={() => onDeleteBlock(block.id)}
                  />
                )}
                {block.type === "typography-scale" && (
                  <VariableTypographyBlock
                    block={block}
                    isEditing={isEditing}
                    onUpdate={(up) => onUpdateBlock(block.id, up)}
                    onDelete={() => onDeleteBlock(block.id)}
                  />
                )}
                {block.type === "tokens-table" && (
                  <TokensTableBlock
                    block={block}
                    isEditing={isEditing}
                    onUpdate={(up) => onUpdateBlock(block.id, up)}
                    onDelete={() => onDeleteBlock(block.id)}
                  />
                )}
                {(block.type === "paragraph" ||
                  block.type === "heading" ||
                  block.type === "code") && (
                  <MarkdownBlock
                    block={block}
                    isEditing={isEditing}
                    onUpdate={(up) => onUpdateBlock(block.id, up)}
                    onDelete={() => onDeleteBlock(block.id)}
                  />
                )}

                {/* Inline Add Button Between Blocks */}
                {isEditing && (
                  <div className="relative my-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-x-0 h-px bg-border/50" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSlashMenu(index + 1);
                      }}
                      className="relative z-10 flex items-center gap-1 rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs hover:text-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add block</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Bottom Add Block Trigger (when in edit mode) */}
        {isEditing && page.blocks.length > 0 && (
          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={() => handleOpenSlashMenu(page.blocks.length)}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-border/80 bg-card/40 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Insert block (or type /)</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Slash Command Popover */}
      {slashMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <DocSlashMenu
            isOpen={slashMenuOpen}
            onClose={() => setSlashMenuOpen(false)}
            onSelect={handleSelectBlockType}
          />
        </div>
      )}
    </main>
  );
};
