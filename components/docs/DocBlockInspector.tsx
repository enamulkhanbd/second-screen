"use client";

import React, { useMemo } from "react";
import { DocPage, DocBlock, DEFAULT_PAGE_BACKGROUNDS, DocPageLayout } from "@/types/documentation";
import { useTokenStore } from "@/store/useTokenStore";
import {
  SlidersHorizontal,
  Layout,
  Palette,
  FileText,
  ListTree,
  Filter,
  Check,
  Eye,
  Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface DocBlockInspectorProps {
  page: DocPage | null;
  selectedBlockId: string | null;
  onUpdatePage: (updates: Partial<DocPage>) => void;
  onUpdateBlock: (blockId: string, updates: Partial<DocBlock>) => void;
  onDeleteBlock: (blockId: string) => void;
  onClose?: () => void;
}

export const DocBlockInspector: React.FC<DocBlockInspectorProps> = ({
  page,
  selectedBlockId,
  onUpdatePage,
  onUpdateBlock,
  onDeleteBlock,
  onClose,
}) => {
  const { figmaVariables, figmaResolvedVariables, resolvedTokens } = useTokenStore();

  const selectedBlock = useMemo(() => {
    if (!page || !selectedBlockId) return null;
    return page.blocks.find((b) => b.id === selectedBlockId) || null;
  }, [page, selectedBlockId]);

  // Available collections / sets
  const availableCollections = useMemo(() => {
    const sets = new Set<string>();
    figmaResolvedVariables.forEach((v) => {
      if (v.setName) sets.add(v.setName);
    });
    resolvedTokens.forEach((t) => {
      if (t.setName) sets.add(t.setName);
    });
    return Array.from(sets);
  }, [figmaResolvedVariables, resolvedTokens]);

  // Available modes
  const availableModes = useMemo(() => {
    const modes = new Set<string>(["light", "dark"]);
    if (figmaVariables) {
      Object.entries(figmaVariables).forEach(([_, setObj]) => {
        if (setObj && typeof setObj === "object") {
          const keys = Object.keys(setObj).filter((k) => !k.startsWith("$"));
          keys.forEach((k) => {
            if (typeof setObj[k] === "object" && setObj[k] !== null && !setObj[k].value) {
              modes.add(k);
            }
          });
        }
      });
    }
    return Array.from(modes);
  }, [figmaVariables]);

  if (!page) {
    return (
      <div className="flex h-full w-72 flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
        Select a page to view its properties and block settings.
      </div>
    );
  }

  const isVariableBlock =
    selectedBlock?.type === "variables-table" ||
    selectedBlock?.type === "color-swatches" ||
    selectedBlock?.type === "typography-scale" ||
    selectedBlock?.type === "tokens-table";

  return (
    <aside className="flex h-full w-76 shrink-0 flex-col border-l border-border bg-sidebar/50 dark:bg-[#0c0c10] select-none text-xs font-sans">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between min-h-12">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            {selectedBlock ? "Block Settings" : "Page Settings"}
          </span>
        </div>
        {selectedBlock && (
          <Badge variant="outline" className="text-[10px] font-mono capitalize">
            {selectedBlock.type}
          </Badge>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 text-xs">
        {/* ======================= PAGE PROPERTIES ======================= */}
        <div className="space-y-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Page Canvas
          </div>

          {/* Background Palette Swatches (Reference Screenshot 3) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Background Style</label>
            <div className="grid grid-cols-6 gap-2">
              {DEFAULT_PAGE_BACKGROUNDS.map((bg) => {
                const isSelected = (page.headerBackground || "transparent") === bg;
                return (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => onUpdatePage({ headerBackground: bg })}
                    className={`relative h-7 w-7 rounded-full border shadow-xs transition hover:opacity-90 hover:ring-2 hover:ring-ring/30 ${
                      isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border/60"
                    }`}
                    style={{
                      background: bg === "transparent" ? "#1e293b" : bg,
                    }}
                    title={bg}
                  >
                    {isSelected && (
                      <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow-sm" />
                    )}
                    {bg === "transparent" && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                        none
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layout Segmented Selector (Reference Screenshot 3: Classic, Hero, Feature) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Layout Template</label>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
              {(["classic", "hero", "feature"] as DocPageLayout[]).map((layout) => {
                const isActive = (page.layout || "classic") === layout;
                return (
                  <button
                    key={layout}
                    type="button"
                    onClick={() => onUpdatePage({ layout })}
                    className={`rounded-lg py-1.5 text-center text-xs font-medium capitalize transition ${
                      isActive
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {layout}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table of Contents Toggle (Reference Screenshot 3) */}
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-3">
            <div>
              <div className="font-medium text-foreground">Table of Contents</div>
              <div className="text-[11px] text-muted-foreground">Show navigation outline</div>
            </div>
            <Switch
              checked={page.showTableOfContents ?? true}
              onCheckedChange={(checked) => onUpdatePage({ showTableOfContents: checked })}
            />
          </div>
        </div>

        {/* ======================= BLOCK SPECIFIC SETTINGS ======================= */}
        {selectedBlock && (
          <div className="space-y-4 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Block Configuration
              </div>
              <button
                type="button"
                onClick={() => onDeleteBlock(selectedBlock.id)}
                className="flex items-center gap-1 text-[11px] text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete Block</span>
              </button>
            </div>

            {/* If Callout */}
            {selectedBlock.type === "callout" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Alert Variant</label>
                <select
                  value={selectedBlock.settings?.calloutVariant || "info"}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, {
                      settings: {
                        ...selectedBlock.settings,
                        calloutVariant: e.target.value as any,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="info">Information (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="warning">Warning (Amber)</option>
                  <option value="error">Important / Error (Red)</option>
                </select>
              </div>
            )}

            {/* Variable & Token Blocks: Matches Reference Screenshots 4 & 5 */}
            {isVariableBlock && (
              <div className="space-y-4">
                {/* Collection Selector (Screenshot 4) */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Collection</label>
                  <select
                    value={selectedBlock.settings?.collection || "all"}
                    onChange={(e) =>
                      onUpdateBlock(selectedBlock.id, {
                        settings: {
                          ...selectedBlock.settings,
                          collection: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="all">All Collections</option>
                    {availableCollections.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter Pills (Screenshot 4: Color, Float, String, Boolean) */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Variable Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "all", label: "All" },
                      { id: "color", label: "Color" },
                      { id: "float", label: "Float / Number" },
                      { id: "string", label: "String" },
                      { id: "boolean", label: "Boolean" },
                    ].map((typeOption) => {
                      const isActive =
                        (selectedBlock.settings?.filterType || "all") === typeOption.id;
                      return (
                        <button
                          key={typeOption.id}
                          type="button"
                          onClick={() =>
                            onUpdateBlock(selectedBlock.id, {
                              settings: {
                                ...selectedBlock.settings,
                                filterType: typeOption.id as any,
                              },
                            })
                          }
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {typeOption.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filter Condition & Query Input (Screenshot 5: Starts with, Includes) */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Name Filter</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedBlock.settings?.filterCondition || "includes"}
                      onChange={(e) =>
                        onUpdateBlock(selectedBlock.id, {
                          settings: {
                            ...selectedBlock.settings,
                            filterCondition: e.target.value as any,
                          },
                        })
                      }
                      className="w-28 shrink-0 rounded-lg border border-border/60 bg-background/80 px-2 py-1.5 text-xs text-foreground focus:outline-none"
                    >
                      <option value="includes">Includes</option>
                      <option value="startsWith">Starts with</option>
                    </select>
                    <input
                      type="text"
                      value={selectedBlock.settings?.filterQuery || ""}
                      onChange={(e) =>
                        onUpdateBlock(selectedBlock.id, {
                          settings: {
                            ...selectedBlock.settings,
                            filterQuery: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. brand, surface..."
                      className="w-full rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Mode Selection Checkboxes (Screenshot 5: light, dark) */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Display Modes</label>
                  <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/50 p-2.5">
                    {availableModes.map((mode) => {
                      const currentSelected = selectedBlock.settings?.selectedModes || availableModes;
                      const isChecked = currentSelected.includes(mode);

                      return (
                        <label
                          key={mode}
                          className="flex cursor-pointer items-center justify-between rounded px-2 py-1 hover:bg-muted/40"
                        >
                          <span className="text-xs capitalize text-foreground">{mode}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let next: string[];
                              if (e.target.checked) {
                                next = [...currentSelected, mode];
                              } else {
                                next = currentSelected.filter((m) => m !== mode);
                              }
                              onUpdateBlock(selectedBlock.id, {
                                settings: {
                                  ...selectedBlock.settings,
                                  selectedModes: next,
                                },
                              });
                            }}
                            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-0"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Show Search Box Toggle (Screenshot 4 & 5) */}
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-3">
                  <div>
                    <div className="font-medium text-foreground">Search Box</div>
                    <div className="text-[11px] text-muted-foreground">Show search inside block</div>
                  </div>
                  <Switch
                    checked={selectedBlock.settings?.showSearchBox ?? true}
                    onCheckedChange={(checked) =>
                      onUpdateBlock(selectedBlock.id, {
                        settings: {
                          ...selectedBlock.settings,
                          showSearchBox: checked,
                        },
                      })
                    }
                  />
                </div>

                {/* Sort Controls */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Sort By</label>
                    <select
                      value={selectedBlock.settings?.sortField || "name"}
                      onChange={(e) =>
                        onUpdateBlock(selectedBlock.id, {
                          settings: {
                            ...selectedBlock.settings,
                            sortField: e.target.value as any,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-border/60 bg-background/80 px-2 py-1.5 text-xs text-foreground focus:outline-none"
                    >
                      <option value="name">Name</option>
                      <option value="value">Value</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Direction</label>
                    <select
                      value={selectedBlock.settings?.sortOrder || "asc"}
                      onChange={(e) =>
                        onUpdateBlock(selectedBlock.id, {
                          settings: {
                            ...selectedBlock.settings,
                            sortOrder: e.target.value as any,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-border/60 bg-background/80 px-2 py-1.5 text-xs text-foreground focus:outline-none"
                    >
                      <option value="asc">Ascending (A-Z)</option>
                      <option value="desc">Descending (Z-A)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
