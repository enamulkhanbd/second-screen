"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { FlattenedToken } from "@/types/tokens";
import {
  Search,
  Type,
  Binary,
  FileText,
  XCircle,
  Trash2,
  CopyPlus,
  Replace,
  FolderInput,
  ArrowLeft,
  Check,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDialogs } from "@/components/DialogProvider";

interface BulkActionsCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTokens: FlattenedToken[];
  availableSets: string[];
  onClearSelection: () => void;
  onClearDescription: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onChangeType: (newType: string) => void;
  onChangeValue: (newValue: string) => void;
  onFindReplace: (findText: string, replaceText: string) => void;
  onMoveTo: (targetSet: string) => void;
}

type SubView = "main" | "change-type" | "change-value" | "find-replace" | "move-to";

export const BulkActionsCommandPalette: React.FC<BulkActionsCommandPaletteProps> = ({
  isOpen,
  onClose,
  selectedTokens,
  availableSets,
  onClearSelection,
  onClearDescription,
  onDelete,
  onDuplicate,
  onChangeType,
  onChangeValue,
  onFindReplace,
  onMoveTo,
}) => {
  const count = selectedTokens.length;
  const dialogs = useDialogs();
  const [search, setSearch] = useState("");
  const [subView, setSubView] = useState<SubView>("main");

  // Sub-state forms
  const [newValueInput, setNewValueInput] = useState("");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSubView("main");
      setNewValueInput("");
      setFindText("");
      setReplaceText("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const actions = useMemo(() => {
    return [
      {
        id: "change-type",
        title: "Change Type",
        description: `Convert type of ${count} tokens`,
        icon: Type,
        run: () => setSubView("change-type"),
      },
      {
        id: "change-value",
        title: "Change Value",
        description: `Transform values in ${count} tokens`,
        icon: Binary,
        run: () => setSubView("change-value"),
      },
      {
        id: "clear-description",
        title: "Clear Description",
        description: `Remove descriptions from ${count} tokens`,
        icon: FileText,
        run: () => {
          onClearDescription();
          onClose();
        },
      },
      {
        id: "clear-selection",
        title: "Clear Selection",
        description: `Deselect ${count} tokens`,
        icon: XCircle,
        run: () => {
          onClearSelection();
          onClose();
        },
      },
      {
        id: "delete",
        title: "Delete",
        description: `Delete ${count} tokens`,
        icon: Trash2,
        danger: true,
        run: async () => {
          const confirmed = await dialogs.confirm({
            title: `Delete ${count} ${count === 1 ? "token" : "tokens"}?`,
            description: "This removes the selected tokens from their sets.",
            confirmLabel: "Delete",
            destructive: true,
          });
          if (confirmed) {
            onDelete();
            onClose();
          }
        },
      },
      {
        id: "duplicate",
        title: "Duplicate",
        description: `Create copies of ${count} tokens`,
        icon: CopyPlus,
        run: () => {
          onDuplicate();
          onClose();
        },
      },
      {
        id: "find-replace",
        title: "Find & Replace in Description",
        description: `Find and replace in descriptions of ${count} tokens`,
        icon: Replace,
        run: () => setSubView("find-replace"),
      },
      {
        id: "move-to",
        title: "Move to...",
        description: `Move ${count} tokens to another set`,
        icon: FolderInput,
        run: () => setSubView("move-to"),
      },
    ];
  }, [count, dialogs, onClearDescription, onClearSelection, onDelete, onDuplicate, onClose]);

  const filteredActions = useMemo(() => {
    if (!search.trim()) return actions;
    const q = search.toLowerCase();
    return actions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    );
  }, [actions, search]);

  const typeOptions = ["color", "dimension", "spacing", "borderRadius", "typography", "boxShadow", "opacity"];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-border shadow-2xl rounded-xl">
        {subView === "main" && (
          <div className="flex flex-col select-none">
            {/* Search Input Bar */}
            <div className="flex items-center px-4 border-b border-border/80 h-12 gap-2.5">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a command or search..."
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none border-none focus:ring-0"
              />
            </div>

            {/* List */}
            <div className="p-2 max-h-[380px] overflow-y-auto">
              <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                BULK ACTIONS
              </div>

              <div className="space-y-0.5 mt-1">
                {filteredActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={action.run}
                      className={`w-full flex items-start text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer group ${
                        action.danger
                          ? "hover:bg-destructive/10 text-destructive focus:bg-destructive/10"
                          : "hover:bg-muted text-foreground focus:bg-muted"
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="text-xs font-semibold leading-tight group-hover:text-primary transition-colors">
                          {action.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {action.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sub-view: Change Type */}
        {subView === "change-type" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSubView("main")}
                className="h-7 w-7 text-muted-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-bold text-foreground">
                Change Type ({count} tokens)
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto pt-1">
              {typeOptions.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    onChangeType(type);
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 text-xs font-mono rounded-md hover:bg-muted text-foreground text-left transition-colors cursor-pointer"
                >
                  <span className="capitalize">{type}</span>
                  <Check className="w-3.5 h-3.5 opacity-0 hover:opacity-100 text-primary" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sub-view: Change Value */}
        {subView === "change-value" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSubView("main")}
                className="h-7 w-7 text-muted-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-bold text-foreground">
                Change Value ({count} tokens)
              </span>
            </div>
            <div className="space-y-2 pt-1">
              <label className="text-[11px] text-muted-foreground">
                Enter new value or reference alias for selected tokens:
              </label>
              <Input
                type="text"
                value={newValueInput}
                onChange={(e) => setNewValueInput(e.target.value)}
                placeholder="e.g. {primary.500} or #ffffff or 16px"
                className="h-8 text-xs font-mono"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSubView("main")} className="h-7 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!newValueInput.trim()}
                  onClick={() => {
                    onChangeValue(newValueInput.trim());
                    onClose();
                  }}
                  className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Apply Value
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-view: Find & Replace in Description */}
        {subView === "find-replace" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSubView("main")}
                className="h-7 w-7 text-muted-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-bold text-foreground">
                Find & Replace in Description
              </span>
            </div>
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-[11px] text-muted-foreground">Find text</label>
                <Input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="Text to find..."
                  className="h-8 text-xs font-mono mt-1"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Replace with</label>
                <Input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replacement text..."
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSubView("main")} className="h-7 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!findText}
                  onClick={() => {
                    onFindReplace(findText, replaceText);
                    onClose();
                  }}
                  className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Replace All
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-view: Move To */}
        {subView === "move-to" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSubView("main")}
                className="h-7 w-7 text-muted-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-bold text-foreground">
                Move {count} tokens to set
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
              {availableSets.map((setName) => (
                <button
                  key={setName}
                  onClick={() => {
                    onMoveTo(setName);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono rounded-md hover:bg-muted text-foreground text-left transition-colors cursor-pointer"
                >
                  <span>{setName}</span>
                  <Check className="w-3.5 h-3.5 opacity-0 hover:opacity-100 text-primary" />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
