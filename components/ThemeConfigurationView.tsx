"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  buildSetFolderTree,
  getValidTokenSetNames,
  SetTreeNode,
} from "@/utils/themeHelpers";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Palette,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const ThemeConfigurationView: React.FC = () => {
  const {
    rawTokens,
    themeGroups,
    activeThemeGroupId,
    activeThemeOptionId,
    updateThemeOption,
    canUserEdit,
    resolvedTokens,
    addToast,
  } = useTokenStore();

  const isEditable = canUserEdit();

  // Find active group and active theme option
  const activeGroup = useMemo(() => {
    return themeGroups.find((g) => g.id === activeThemeGroupId) || themeGroups[0];
  }, [themeGroups, activeThemeGroupId]);

  const activeOption = useMemo(() => {
    return (
      activeGroup?.options.find((o) => o.id === activeThemeOptionId) ||
      activeGroup?.options[0]
    );
  }, [activeGroup, activeThemeOptionId]);

  // Edit Theme Option Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleOpenEdit = () => {
    if (!activeOption) return;
    setEditName(activeOption.name);
    setEditDescription(activeOption.description || "");
    setEditColor(activeOption.color || "#6366f1");
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !activeOption || !editName.trim()) return;

    updateThemeOption(activeGroup.id, activeOption.id, {
      name: editName.trim(),
      description: editDescription.trim(),
      color: editColor,
    });
    setIsEditOpen(false);
  };

  // Get all valid token set names and build folder hierarchy
  const allSetNames = useMemo(() => {
    return getValidTokenSetNames(rawTokens);
  }, [rawTokens]);

  const folderTree = useMemo(() => {
    return buildSetFolderTree(allSetNames);
  }, [allSetNames]);

  // Accordion open/close state for folders
  // Default first folder open
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    foundation: true,
  });

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Handle setting status for a token set in current active theme option
  const handleSetStatus = (
    setName: string,
    newStatus: "disabled" | "source" | "enabled"
  ) => {
    if (!isEditable) {
      addToast({
        type: "info",
        title: "Read-Only Access",
        message: "You need editor permissions to configure themes.",
      });
      return;
    }
    if (!activeGroup || !activeOption) return;

    const currentSets = { ...(activeOption.selectedTokenSets || {}) };

    if (newStatus === "disabled") {
      // In $themes.json, "disabled" is explicit or omitted
      currentSets[setName] = "disabled";
    } else {
      currentSets[setName] = newStatus;
    }

    updateThemeOption(activeGroup.id, activeOption.id, {
      selectedTokenSets: currentSets,
    });
  };

  // Separate folder nodes from flat leaf nodes
  const folderNodes = useMemo(() => {
    return folderTree.filter((node) => node.isFolder);
  }, [folderTree]);

  const rootLeafNodes = useMemo(() => {
    return folderTree.filter((node) => !node.isFolder);
  }, [folderTree]);

  // If no themes exist
  if (!activeGroup || !activeOption) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none font-sans">
        <Palette className="size-10 text-muted-foreground/30 mb-3" />
        <h3 className="text-sm font-semibold text-foreground">No Theme Selected</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Select or create a theme group and option in the left sidebar to configure token sets.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto select-none font-sans">
      <div className="max-w-4xl w-full mx-auto px-8 py-8 space-y-6">
        {/* 1. Header: Theme Name, Description & Edit Button */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {activeOption.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeOption.description || "No description"}
            </p>
          </div>

          {isEditable && (
            <button
              onClick={handleOpenEdit}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Edit theme name and description"
            >
              <Pencil className="size-4" />
            </button>
          )}
        </div>

        {/* 2. Section Heading */}
        <div className="pt-2">
          <h2 className="text-xs uppercase font-bold text-foreground tracking-wider">
            Selected Token Sets
          </h2>
        </div>

        {/* 3. Accordions of Token Sets Grouped by Folder */}
        <div className="space-y-2">
          {folderNodes.map((folder) => {
            const isOpen = Boolean(openFolders[folder.id]);
            const children = folder.children || [];

            return (
              <div
                key={folder.id}
                className="border border-border/70 rounded-xl overflow-hidden bg-card/40 transition-all shadow-2xs"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors text-left cursor-pointer"
                >
                  {isOpen ? (
                    <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="capitalize">{folder.name}</span>
                </button>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="divide-y divide-border/40 border-t border-border/50 bg-background">
                    {children.map((child) => {
                      const fullPath = child.fullPath;
                      const rawStatus = activeOption.selectedTokenSets?.[fullPath];
                      // Default is disabled if not explicitly enabled or source
                      const currentStatus: "disabled" | "source" | "enabled" =
                        rawStatus === "enabled" || rawStatus === "source"
                          ? rawStatus
                          : "disabled";

                      return (
                        <div
                          key={child.id}
                          className="flex items-center justify-between px-4 py-2 hover:bg-muted/20 transition-colors text-xs"
                        >
                          <span className="font-medium text-foreground truncate pr-4">
                            {child.name}
                          </span>

                          {/* 3-State Segmented Toggle Pill */}
                          <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60 text-xs flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSetStatus(fullPath, "disabled")}
                              className={cn(
                                "px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                                currentStatus === "disabled"
                                  ? "bg-background text-foreground font-semibold shadow-2xs"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Disabled
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStatus(fullPath, "source")}
                              className={cn(
                                "px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                                currentStatus === "source"
                                  ? "bg-background text-foreground font-semibold shadow-2xs"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Source
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStatus(fullPath, "enabled")}
                              className={cn(
                                "px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                                currentStatus === "enabled"
                                  ? "bg-background text-foreground font-semibold shadow-2xs"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Enabled
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {children.length === 0 && (
                      <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                        No token sets in this folder.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Root Level Sets (if any) */}
          {rootLeafNodes.length > 0 && (
            <div className="border border-border/70 rounded-xl overflow-hidden bg-card/40 transition-all shadow-2xs">
              <button
                type="button"
                onClick={() => toggleFolder("__root__")}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors text-left cursor-pointer"
              >
                {openFolders["__root__"] ? (
                  <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                )}
                <span>General</span>
              </button>

              {openFolders["__root__"] && (
                <div className="divide-y divide-border/40 border-t border-border/50 bg-background">
                  {rootLeafNodes.map((child) => {
                    const fullPath = child.fullPath;
                    const rawStatus = activeOption.selectedTokenSets?.[fullPath];
                    const currentStatus: "disabled" | "source" | "enabled" =
                      rawStatus === "enabled" || rawStatus === "source"
                        ? rawStatus
                        : "disabled";

                    return (
                      <div
                        key={child.id}
                        className="flex items-center justify-between px-4 py-2 hover:bg-muted/20 transition-colors text-xs"
                      >
                        <span className="font-medium text-foreground truncate pr-4">
                          {child.name}
                        </span>

                        <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60 text-xs flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSetStatus(fullPath, "disabled")}
                            className={cn(
                              "px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                              currentStatus === "disabled"
                                ? "bg-background text-foreground font-semibold shadow-2xs"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Disabled
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(fullPath, "source")}
                            className={cn(
                              "px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                              currentStatus === "source"
                                ? "bg-background text-foreground font-semibold shadow-2xs"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Source
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(fullPath, "enabled")}
                            className={cn(
                              "px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                              currentStatus === "enabled"
                                ? "bg-background text-foreground font-semibold shadow-2xs"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Enabled
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Bottom Figma References Card */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border/70 bg-card/30 text-xs text-foreground font-medium shadow-2xs">
            <div className="flex items-center gap-2.5">
              <svg className="size-4 shrink-0" viewBox="0 0 38 57" fill="none">
                <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
              </svg>
              <span>Figma references</span>
            </div>
            <span className="text-muted-foreground font-mono text-xs">
              {resolvedTokens.length > 0 ? resolvedTokens.length : 72}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Theme Details Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Theme Option</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Theme Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Color, Light, Dark..."
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe this theme option..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Badge Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="size-8 rounded-lg cursor-pointer border border-border p-0 bg-transparent"
                />
                <Input
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-8 text-xs font-mono flex-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-[#15803d] hover:bg-[#166534] text-white"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
