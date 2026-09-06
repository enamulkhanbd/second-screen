"use client";

import React, { useState } from "react";
import { DocFolder, DocPage, ProjectDocumentation } from "@/types/documentation";
import {
  Folder,
  FolderOpen,
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Globe,
  Search,
  BookOpen,
  Check,
  MoreVertical,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DocTreeNavProps {
  documentation: ProjectDocumentation;
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: (folderId?: string | null) => void;
  onAddFolder: () => void;
  onUpdateFolder: (folderId: string, updates: Partial<DocFolder>) => void;
  onDeleteFolder: (folderId: string) => void;
  onUpdatePage: (pageId: string, updates: Partial<DocPage>) => void;
  onDeletePage: (pageId: string) => void;
}

export const DocTreeNav: React.FC<DocTreeNavProps> = ({
  documentation,
  activePageId,
  onSelectPage,
  onAddPage,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onUpdatePage,
  onDeletePage,
}) => {
  const [search, setSearch] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderTitle, setEditingFolderTitle] = useState("");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageTitle, setEditingPageTitle] = useState("");

  const folders = documentation.folders || [];
  const pages = documentation.pages || [];

  // Filtered pages
  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const rootPages = filteredPages.filter((p) => !p.folderId);

  const startRenameFolder = (f: DocFolder) => {
    setEditingFolderId(f.id);
    setEditingFolderTitle(f.title);
  };

  const saveRenameFolder = (id: string) => {
    if (editingFolderTitle.trim()) {
      onUpdateFolder(id, { title: editingFolderTitle.trim() });
    }
    setEditingFolderId(null);
  };

  const startRenamePage = (p: DocPage) => {
    setEditingPageId(p.id);
    setEditingPageTitle(p.title);
  };

  const saveRenamePage = (id: string) => {
    if (editingPageTitle.trim()) {
      onUpdatePage(id, { title: editingPageTitle.trim() });
    }
    setEditingPageId(null);
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border/70 bg-card/40 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold tracking-tight text-foreground">
            Documentation
          </span>
        </div>
        <Badge
          variant={documentation.isPublishedGlobally ? "default" : "outline"}
          className="text-[10px] px-1.5 py-0 font-medium"
        >
          {documentation.isPublishedGlobally ? "Live" : "Draft"}
        </Badge>
      </div>

      {/* Search & Action Bar */}
      <div className="space-y-2 p-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter pages..."
            className="h-8 w-full rounded-lg border border-border/60 bg-background/80 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => onAddPage(null)}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border/60 bg-background/60 py-1 text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>Page</span>
          </button>
          <button
            type="button"
            onClick={onAddFolder}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border/60 bg-background/60 py-1 text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>Folder</span>
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {rootPages.length === 0 && folders.length === 0 && (
          <div className="py-8 px-3 text-center space-y-2">
            <p className="text-xs text-muted-foreground">No pages created yet.</p>
            <p className="text-[11px] text-muted-foreground/80">
              Click <strong>+ Page</strong> to start.
            </p>
          </div>
        )}

        {/* Root Pages */}
        {rootPages.map((page) => {
          const isActive = page.id === activePageId;
          const isEditing = editingPageId === page.id;

          return (
            <div
              key={page.id}
              className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground/90 hover:bg-muted/60"
              }`}
            >
              {isEditing ? (
                <div className="flex flex-1 items-center gap-1">
                  <input
                    type="text"
                    value={editingPageTitle}
                    onChange={(e) => setEditingPageTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveRenamePage(page.id)}
                    className="h-6 w-full rounded border border-primary bg-background px-1.5 text-xs text-foreground focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => saveRenamePage(page.id)}
                    className="text-primary hover:text-primary/80"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectPage(page.id)}
                  className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                >
                  <FileText className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="truncate text-xs">{page.title}</span>
                </button>
              )}

              {!isEditing && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => startRenamePage(page)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Rename"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePage(page.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                    title="Delete page"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Folders with Nested Pages */}
        {folders.map((folder) => {
          const isOpen = folder.isOpen ?? true;
          const folderPages = filteredPages.filter((p) => p.folderId === folder.id);
          const isEditing = editingFolderId === folder.id;

          return (
            <div key={folder.id} className="pt-1">
              {/* Folder Header */}
              <div className="group flex items-center justify-between rounded-lg px-2 py-1 text-muted-foreground hover:bg-muted/40">
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      type="text"
                      value={editingFolderTitle}
                      onChange={(e) => setEditingFolderTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveRenameFolder(folder.id)}
                      className="h-6 w-full rounded border border-primary bg-background px-1.5 text-xs text-foreground focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveRenameFolder(folder.id)}
                      className="text-primary hover:text-primary/80"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpdateFolder(folder.id, { isOpen: !isOpen })}
                    className="flex flex-1 items-center gap-1.5 overflow-hidden text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {isOpen ? (
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-xs font-semibold text-foreground/90">
                      {folder.title}
                    </span>
                  </button>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onAddPage(folder.id)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Add page to folder"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startRenameFolder(folder)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Rename folder"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteFolder(folder.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      title="Delete folder"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-pages inside folder */}
              {isOpen && (
                <div className="ml-4 space-y-0.5 border-l border-border/50 pl-2 mt-0.5">
                  {folderPages.length === 0 ? (
                    <div className="py-1 text-[11px] italic text-muted-foreground">
                      No pages. Click + to add.
                    </div>
                  ) : (
                    folderPages.map((page) => {
                      const isActive = page.id === activePageId;
                      const isEditingP = editingPageId === page.id;

                      return (
                        <div
                          key={page.id}
                          className={`group flex items-center justify-between rounded-md px-2 py-1 transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-foreground/80 hover:bg-muted/60"
                          }`}
                        >
                          {isEditingP ? (
                            <div className="flex flex-1 items-center gap-1">
                              <input
                                type="text"
                                value={editingPageTitle}
                                onChange={(e) => setEditingPageTitle(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && saveRenamePage(page.id)}
                                className="h-6 w-full rounded border border-primary bg-background px-1 text-xs text-foreground focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => saveRenamePage(page.id)}
                                className="text-primary hover:text-primary/80"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectPage(page.id)}
                              className="flex flex-1 items-center gap-1.5 overflow-hidden text-left"
                            >
                              <FileText className={`h-3 w-3 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                              <span className="truncate text-xs">{page.title}</span>
                            </button>
                          )}

                          {!isEditingP && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => startRenamePage(page)}
                                className="p-0.5 text-muted-foreground hover:text-foreground"
                                title="Rename"
                              >
                                <Edit2 className="h-2.5 w-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeletePage(page.id)}
                                className="p-0.5 text-muted-foreground hover:text-destructive"
                                title="Delete page"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
