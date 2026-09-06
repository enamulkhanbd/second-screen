"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Folder,
  FolderOpen,
  File,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Palette,
  X,
  MoreVertical,
  Edit2,
  Trash2,
  FolderPlus,
} from "lucide-react";
import { AddThemeOptionModal } from "@/components/AddThemeOptionModal";
import { AddSetModal } from "@/components/AddSetModal";
import { EditThemeGroupModal } from "@/components/EditThemeGroupModal";
import { buildSetFolderTree, getValidTokenSetNames, SetTreeNode } from "@/utils/themeHelpers";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SecondarySidebarProps {
  className?: string;
  onItemSelected?: () => void;
}

export const SecondarySidebar: React.FC<SecondarySidebarProps> = ({ className, onItemSelected }) => {
  const {
    sidebarTab,
    rawTokens,
    activeSet,
    setActiveSet,
    themeGroups,
    activeThemeGroupId,
    activeThemeOptionId,
    setActiveThemeGroup,
    setActiveThemeOption,
    renameSet,
    deleteSet,
    renameFolder,
    deleteFolder,
    deleteThemeGroup,
    updateThemeOption,
    deleteThemeOption,
    canUserEdit,
    addToast,
  } = useTokenStore();

  const isEditable = canUserEdit();
  const [addModalGroupId, setAddModalGroupId] = useState<string | null>(null);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [isAddSetOpen, setIsAddSetOpen] = useState(false);
  const [addSetInitialName, setAddSetInitialName] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [searchFilter, setSearchFilter] = useState("");

  // Rename Dialog state
  const [renameModal, setRenameModal] = useState<{
    open: boolean;
    type: "set" | "folder" | "option";
    id: string; // full path for set/folder, option id for option
    currentName: string;
    extraId?: string; // groupId for theme option
  }>({
    open: false,
    type: "set",
    id: "",
    currentName: "",
  });
  const [renameInputValue, setRenameInputValue] = useState("");

  // Delete Dialog state
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    type: "set" | "folder" | "group" | "option";
    id: string;
    name: string;
    extraId?: string;
    count?: number;
  }>({
    open: false,
    type: "set",
    id: "",
    name: "",
  });

  // Extract all valid set names based on $metadata.json, $themes.json, or valid token sets
  const allSetNames = useMemo(() => {
    return getValidTokenSetNames(rawTokens);
  }, [rawTokens]);

  // Build folder-wise hierarchical tree for the Tokens tab
  const setTree = useMemo(() => {
    return buildSetFolderTree(allSetNames);
  }, [allSetNames]);

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleOpenRename = (
    type: "set" | "folder" | "option",
    id: string,
    currentName: string,
    extraId?: string
  ) => {
    setRenameModal({
      open: true,
      type,
      id,
      currentName,
      extraId,
    });
    setRenameInputValue(currentName);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renameInputValue.trim();
    if (!trimmed) return;

    if (renameModal.type === "set") {
      // If the set is inside a folder, preserve the folder prefix unless user typed full path
      let newSetName = trimmed;
      if (renameModal.id.includes("/") && !trimmed.includes("/")) {
        const parts = renameModal.id.split("/");
        parts.pop();
        newSetName = `${parts.join("/")}/${trimmed}`;
      }
      renameSet(renameModal.id, newSetName);
    } else if (renameModal.type === "folder") {
      renameFolder(renameModal.id, trimmed);
    } else if (renameModal.type === "option" && renameModal.extraId) {
      updateThemeOption(renameModal.extraId, renameModal.id, { name: trimmed });
    }

    setRenameModal((p) => ({ ...p, open: false }));
  };

  const handleOpenDelete = (
    type: "set" | "folder" | "group" | "option",
    id: string,
    name: string,
    extraId?: string,
    count?: number
  ) => {
    setDeleteModal({
      open: true,
      type,
      id,
      name,
      extraId,
      count,
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.type === "set") {
      deleteSet(deleteModal.id);
    } else if (deleteModal.type === "folder") {
      deleteFolder(deleteModal.id);
    } else if (deleteModal.type === "group") {
      deleteThemeGroup(deleteModal.id);
    } else if (deleteModal.type === "option" && deleteModal.extraId) {
      deleteThemeOption(deleteModal.extraId, deleteModal.id);
    }
    setDeleteModal((p) => ({ ...p, open: false }));
  };

  const renderTreeNode = (node: SetTreeNode, depth: number = 0) => {
    if (node.isFolder) {
      const isCollapsed = Boolean(collapsedFolders[node.id]);

      if (searchFilter) {
        const matchesName = node.name.toLowerCase().includes(searchFilter.toLowerCase());
        const hasMatchingChild = node.children?.some((c) =>
          c.fullPath.toLowerCase().includes(searchFilter.toLowerCase())
        );
        if (!matchesName && !hasMatchingChild) return null;
      }

      return (
        <div key={node.id} className="space-y-0.5">
          <div
            onClick={() => toggleFolder(node.id)}
            className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/70 text-foreground cursor-pointer font-medium text-xs transition-colors select-none"
            style={{ paddingLeft: `${Math.max(depth * 12 + 6, 6)}px` }}
          >
            <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(node.id);
                }}
                className="p-0.5 text-muted-foreground group-hover:text-foreground"
              >
                {isCollapsed ? (
                  <ChevronRight className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>

              {isCollapsed ? (
                <Folder className="size-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <FolderOpen className="size-3.5 text-muted-foreground flex-shrink-0" />
              )}

              <span className="truncate text-xs font-medium text-foreground">
                {node.name}
              </span>
            </div>

            {/* Folder Actions Menu */}
            {isEditable && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      title="Folder actions"
                    >
                      <MoreVertical className="size-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 text-xs">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddSetInitialName(`${node.id}/`);
                        setIsAddSetOpen(true);
                      }}
                      className="gap-2 text-xs cursor-pointer"
                    >
                      <FolderPlus className="size-3.5 text-primary" />
                      <span>Add Set in Folder</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRename("folder", node.id, node.name);
                      }}
                      className="gap-2 text-xs cursor-pointer"
                    >
                      <Edit2 className="size-3.5" />
                      <span>Rename Folder</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDelete(
                          "folder",
                          node.id,
                          node.name,
                          undefined,
                          node.children?.length || 0
                        );
                      }}
                      className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete Folder</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {!isCollapsed && node.children && (
            <div className="space-y-0.5">
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf token set file
    if (searchFilter && !node.name.toLowerCase().includes(searchFilter.toLowerCase())) {
      return null;
    }

    const isSelected = activeSet === node.fullPath;

    return (
      <div
        key={node.id}
        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
          isSelected
            ? "bg-primary/10 text-primary font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
        }`}
        style={{ paddingLeft: `${Math.max(depth * 12 + 18, 18)}px` }}
        onClick={() => {
          setActiveSet(node.fullPath);
          onItemSelected?.();
        }}
      >
        <div className="flex items-center gap-2 truncate min-w-0 pr-1">
          <File className={`size-3.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
          <span className="truncate">{node.name}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isSelected && (
            <span className="size-1.5 rounded-full bg-primary flex-shrink-0" />
          )}

          {/* Set Actions Menu */}
          {isEditable && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    title="Set actions"
                  >
                    <MoreVertical className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 text-xs">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRename("set", node.fullPath, node.name);
                    }}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <Edit2 className="size-3.5" />
                    <span>Rename Set</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDelete("set", node.fullPath, node.name);
                    }}
                    className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete Set</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (sidebarTab !== "tokens" && sidebarTab !== "themes") {
    return null;
  }

  return (
    <aside className={cn("w-60 flex-shrink-0 border-r border-border bg-sidebar/50 dark:bg-[#0c0c10] flex flex-col h-full select-none text-xs font-sans", className)}>
      {/* ================= TOKENS SECONDARY SIDEBAR ================= */}
      {sidebarTab === "tokens" && (
        <>
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span className="font-bold text-xs text-foreground">Token Sets</span>
              {allSetNames.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                  {allSetNames.length}
                </Badge>
              )}
            </div>
            {isEditable && (
              <button
                onClick={() => {
                  setAddSetInitialName("");
                  setIsAddSetOpen(true);
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Add Token Set"
              >
                <Plus className="size-3.5" />
              </button>
            )}
          </div>

          {/* Search Filter */}
          <div className="p-2 border-b border-border/60">
            <div className="relative">
              <Search className="size-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter token sets..."
                className="h-8 text-xs pl-7 pr-6 bg-background/60"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Sets Tree List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {setTree.map((node) => renderTreeNode(node, 0))}
          </div>

          {/* Bottom Add Set Button */}
          {isEditable && (
            <div className="p-2 border-t border-border">
              <button
                onClick={() => {
                  setAddSetInitialName("");
                  setIsAddSetOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed border-border hover:border-primary/50 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
              >
                <Plus className="size-3.5" />
                <span>Add Token Set</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* ================= THEMES SECONDARY SIDEBAR ================= */}
      {sidebarTab === "themes" && (
        <>
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-violet-500" />
              <span className="font-bold text-xs text-foreground">Theme Groups</span>
              {themeGroups.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                  {themeGroups.length}
                </Badge>
              )}
            </div>
          </div>

          {/* Theme Groups List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {themeGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-2">
                <Palette className="size-8 text-muted-foreground/30 mb-2.5" />
                <p className="text-xs font-semibold text-foreground">No Theme Groups</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[180px] leading-relaxed">
                  Theme groups organize modes and brand variants. None currently defined.
                </p>
              </div>
            ) : (
              themeGroups.map((grp) => {
              const isGroupActive = activeThemeGroupId === grp.id;
              return (
                <div key={grp.id} className="space-y-1.5">
                  <div
                    onClick={() => {
                      setActiveThemeGroup(grp.id);
                      onItemSelected?.();
                    }}
                    className={`group flex items-center justify-between text-xs font-bold rounded-md px-1.5 py-1 cursor-pointer transition-colors ${
                      isGroupActive ? "bg-muted/70 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0 pr-1">
                      <span
                        className="size-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: grp.color }}
                      />
                      <span className="truncate uppercase tracking-wider text-[11px] font-bold">
                        {grp.name}
                      </span>
                    </div>

                    {isEditable && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddModalGroupId(grp.id);
                          }}
                          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Add Theme Option"
                        >
                          <Plus className="size-3.5" />
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Group options"
                            >
                              <MoreVertical className="size-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 text-xs">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditGroupId(grp.id);
                              }}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Edit2 className="size-3.5" />
                              <span>Edit / Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDelete("group", grp.id, grp.name);
                              }}
                              className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Delete Group</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {grp.options.map((opt) => {
                      const isSelected = activeThemeGroupId === grp.id && activeThemeOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setActiveThemeGroup(grp.id);
                            setActiveThemeOption(opt.id);
                            onItemSelected?.();
                          }}
                          className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                          }`}
                        >
                          <span className="truncate pr-1">{opt.name}</span>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isSelected && (
                              <span className="size-1.5 rounded-full bg-primary-foreground flex-shrink-0" />
                            )}

                            {isEditable && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      className={`p-0.5 rounded ${
                                        isSelected
                                          ? "text-primary-foreground hover:bg-primary-foreground/20"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                      }`}
                                      title="Option actions"
                                    >
                                      <MoreVertical className="size-3" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40 text-xs">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenRename("option", opt.id, opt.name, grp.id);
                                      }}
                                      className="gap-2 text-xs cursor-pointer"
                                    >
                                      <Edit2 className="size-3.5" />
                                      <span>Rename Option</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDelete("option", opt.id, opt.name, grp.id);
                                      }}
                                      className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                                    >
                                      <Trash2 className="size-3.5" />
                                      <span>Delete Option</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </>
      )}

      {/* ================= MODALS & DIALOGS ================= */}
      {isEditable && (
        <>
          {/* Add Set Modal */}
          <AddSetModal
            isOpen={isAddSetOpen}
            initialName={addSetInitialName}
            onClose={() => {
              setIsAddSetOpen(false);
              setAddSetInitialName("");
            }}
          />

          {/* Add Theme Option Modal */}
          <AddThemeOptionModal
            isOpen={Boolean(addModalGroupId)}
            defaultGroupId={addModalGroupId || undefined}
            onClose={() => setAddModalGroupId(null)}
          />

          {/* Edit Theme Group Modal */}
          <EditThemeGroupModal
            isOpen={Boolean(editGroupId)}
            groupId={editGroupId || ""}
            onClose={() => setEditGroupId(null)}
          />

          {/* Rename Modal (Sets, Folders, Theme Options) */}
          <Dialog
            open={renameModal.open}
            onOpenChange={(open) => !open && setRenameModal((p) => ({ ...p, open: false }))}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Rename{" "}
                  {renameModal.type === "set"
                    ? "Token Set"
                    : renameModal.type === "folder"
                    ? "Folder"
                    : "Theme Option"}
                </DialogTitle>
                <DialogDescription>
                  Enter a new name for <span className="font-semibold text-foreground font-mono">"{renameModal.currentName}"</span>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRenameSubmit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>New Name</Label>
                  <Input
                    value={renameInputValue}
                    onChange={(e) => setRenameInputValue(e.target.value)}
                    placeholder="e.g. primitives or dark-mode"
                    autoFocus
                    className="text-xs"
                    required
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRenameModal((p) => ({ ...p, open: false }))}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Save Name
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteModal.open}
            onOpenChange={(open) => !open && setDeleteModal((p) => ({ ...p, open: false }))}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="size-4" />
                  <span>
                    Delete{" "}
                    {deleteModal.type === "set"
                      ? "Token Set"
                      : deleteModal.type === "folder"
                      ? "Folder"
                      : deleteModal.type === "group"
                      ? "Theme Group"
                      : "Theme Option"}
                  </span>
                </DialogTitle>
                <DialogDescription className="space-y-2 pt-1">
                  <span>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-foreground font-mono">"{deleteModal.name}"</span>?
                  </span>
                  {deleteModal.type === "folder" && Boolean(deleteModal.count) && (
                    <span className="block text-destructive font-medium">
                      This will permanently delete all {deleteModal.count} token sets inside this folder.
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteModal((p) => ({ ...p, open: false }))}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteConfirm}
                >
                  Delete Permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </aside>
  );
};
