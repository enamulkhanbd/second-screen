"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  buildSetFolderTree,
  getValidTokenSetNames,
  SetTreeNode,
} from "@/utils/themeHelpers";
import { compareTokenNames } from "@/utils/transformTokens";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Palette,
  Check,
  Copy,
  DownloadCloud,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Generate a deterministic 40-character pseudo Figma key for any variable name
function getDeterministicFigmaKey(themeId: string, varName: string): string {
  let hash = 0;
  const str = `${themeId}::${varName}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hexPart1 = Math.abs(hash).toString(16).padStart(8, "0");
  const hexPart2 = Math.abs(hash * 31 + 7).toString(16).padStart(8, "0");
  const hexPart3 = Math.abs(hash * 97 + 13).toString(16).padStart(8, "0");
  const hexPart4 = Math.abs(hash * 127 + 29).toString(16).padStart(8, "0");
  const hexPart5 = Math.abs(hash * 163 + 43).toString(16).padStart(8, "0");
  return `${hexPart1}${hexPart2}${hexPart3}${hexPart4}${hexPart5}`.substring(0, 40);
}

export const ThemeConfigurationView: React.FC = () => {
  const {
    rawTokens,
    themeGroups,
    activeThemeGroupId,
    activeThemeOptionId,
    updateThemeOption,
    canUserEdit,
    resolvedTokens,
    figmaVariables,
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

  // Figma References Accordion State
  const [isFigmaReferencesOpen, setIsFigmaReferencesOpen] = useState(true);
  const [isPullModalOpen, setIsPullModalOpen] = useState(false);
  const [figmaFileUrl, setFigmaFileUrl] = useState("");
  const [figmaPat, setFigmaPat] = useState("");
  const [isPullingFigma, setIsPullingFigma] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  // Accordion open/close state for folders (default foundation open)
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
      currentSets[setName] = "disabled";
    } else {
      currentSets[setName] = newStatus;
    }

    updateThemeOption(activeGroup.id, activeOption.id, {
      selectedTokenSets: currentSets,
    });
  };

  // Compute Figma references list for active theme option
  const figmaReferencesList = useMemo(() => {
    if (!activeOption) return [];

    // 1. If explicit figmaVariableReferences exist on the theme option
    if (
      activeOption.figmaVariableReferences &&
      Object.keys(activeOption.figmaVariableReferences).length > 0
    ) {
      return Object.entries(activeOption.figmaVariableReferences)
        .map(([name, key]) => ({
          variable: name,
          key: key as string,
        }))
        .sort((a, b) => compareTokenNames(a.variable, b.variable, "asc"));
    }

    // 2. Derive list of tokens from enabled/source sets of this theme
    const enabledSetNames = Object.entries(activeOption.selectedTokenSets || {})
      .filter(([_, status]) => status === "enabled" || status === "source")
      .map(([setName]) => setName);

    const relevantTokens = resolvedTokens.filter((t) =>
      enabledSetNames.length === 0 ? true : enabledSetNames.includes(t.setName)
    );

    // Filter unique token names and map to deterministic keys
    const seen = new Set<string>();
    const list: Array<{ variable: string; key: string }> = [];

    relevantTokens.forEach((t) => {
      const varName = t.name.replace(/\//g, ".");
      if (!seen.has(varName)) {
        seen.add(varName);
        list.push({
          variable: varName,
          key: getDeterministicFigmaKey(activeOption.id, varName),
        });
      }
    });

    return list.sort((a, b) => compareTokenNames(a.variable, b.variable, "asc"));
  }, [activeOption, resolvedTokens]);

  const handleCopyKey = (key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(key);
      setCopiedKey(key);
      addToast({
        type: "success",
        title: "Copied Figma Key",
        message: key,
      });
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Handle pulling variables live from Figma REST API
  const handlePullFromFigmaApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!figmaFileUrl.trim() || !figmaPat.trim() || !activeGroup || !activeOption) return;

    setIsPullingFigma(true);
    try {
      const res = await fetch("/api/figma/fetch-variables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: figmaFileUrl.trim(),
          pat: figmaPat.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to pull Figma variables");
      }

      // Map pulled variables into theme references
      const newReferences: Record<string, string> = {};
      data.variables.forEach((v: any) => {
        newReferences[v.name] = v.key;
      });

      const firstCollection = data.collections[0];
      const firstMode = firstCollection?.modes?.[0];

      updateThemeOption(activeGroup.id, activeOption.id, {
        figmaVariableReferences: newReferences,
        figmaCollectionId: firstCollection?.id || "",
        figmaModeId: firstMode?.modeId || "",
      });

      addToast({
        type: "success",
        title: "Figma Variables Pulled",
        message: `Successfully mapped ${Object.keys(newReferences).length} Figma variable references.`,
      });
      setIsPullModalOpen(false);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Pull Failed",
        message: err.message,
      });
    } finally {
      setIsPullingFigma(false);
    }
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

  const collectionId = activeOption.figmaCollectionId || "—";
  const modeId = activeOption.figmaModeId || "—";

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

          {/* 4. Bottom Figma References Accordion Card matching screenshot */}
          <div className="border border-border/70 rounded-xl overflow-hidden bg-card/30 transition-all shadow-2xs">
            {/* Header / Trigger */}
            <button
              type="button"
              onClick={() => setIsFigmaReferencesOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs text-foreground font-medium hover:bg-muted/40 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <svg className="size-4 shrink-0" viewBox="0 0 38 57" fill="none">
                  <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                  <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                  <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                  <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                  <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
                </svg>
                <span className="font-semibold">Figma references</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs px-2 py-0.5 rounded-md bg-muted/60 border border-border/50">
                  {figmaReferencesList.length}
                </span>
                {isFigmaReferencesOpen ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expanded Content matching user screenshot */}
            {isFigmaReferencesOpen && (
              <div className="border-t border-border/50 bg-background/95 p-4 space-y-4">
                {/* Meta info header row */}
                <div className="flex flex-wrap items-center justify-between gap-4 py-1 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Figma Collection ID
                      </div>
                      <div className="font-mono text-xs font-semibold text-foreground mt-0.5">
                        {collectionId}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Figma Mode ID
                      </div>
                      <div className="font-mono text-xs font-semibold text-foreground mt-0.5">
                        {modeId}
                      </div>
                    </div>
                  </div>

                  {isEditable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPullModalOpen(true)}
                      className="h-7 text-xs gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <DownloadCloud className="size-3.5" />
                      <span>Pull / Connect Figma</span>
                    </Button>
                  )}
                </div>

                {/* Subtitle */}
                <div className="text-xs font-semibold text-foreground">
                  Variables ({figmaReferencesList.length}, inherited from group)
                </div>

                {/* Variables & Keys Table matching user screenshot */}
                <div className="border border-border/60 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 sticky top-0 backdrop-blur">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Variable</th>
                        <th className="py-2 px-3 font-semibold">Figma key</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono text-xs">
                      {figmaReferencesList.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="py-8 px-4 text-center text-muted-foreground font-sans">
                            No Figma variables linked to this theme option yet.
                          </td>
                        </tr>
                      ) : (
                        figmaReferencesList.map((item) => {
                          const isCopied = copiedKey === item.key;
                          return (
                            <tr
                              key={item.variable}
                              className="hover:bg-muted/30 transition-colors group"
                            >
                              <td className="py-2 px-3 text-foreground font-sans font-medium text-xs">
                                {item.variable}
                              </td>
                              <td className="py-2 px-3 text-muted-foreground text-xs font-mono">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate max-w-md select-all">
                                    {item.key}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyKey(item.key)}
                                    className="p-1 rounded hover:text-foreground hover:bg-muted text-muted-foreground/70 transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                                    title="Copy Figma key"
                                  >
                                    {isCopied ? (
                                      <Check className="size-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="size-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pull Figma References Dialog */}
      <Dialog open={isPullModalOpen} onOpenChange={setIsPullModalOpen}>
        <DialogContent className="sm:max-w-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <svg className="size-4" viewBox="0 0 38 57" fill="none">
                <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
              </svg>
              <span>Pull Figma References &amp; Keys</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pull local variable keys, collection IDs, and mode IDs directly from your Figma file.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePullFromFigmaApi} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Figma File URL or Key</label>
              <Input
                value={figmaFileUrl}
                onChange={(e) => setFigmaFileUrl(e.target.value)}
                placeholder="https://www.figma.com/design/XXXXX/My-File"
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Figma Personal Access Token (PAT)</label>
              <Input
                type="password"
                value={figmaPat}
                onChange={(e) => setFigmaPat(e.target.value)}
                placeholder="figd_..."
                required
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Generate in Figma: Account Settings &rarr; Personal access tokens.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPullModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPullingFigma}
                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isPullingFigma ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Pulling...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="size-3.5" />
                    <span>Fetch References</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
