"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  buildSetFolderTree,
  getValidTokenSetNames,
  SetTreeNode,
} from "@/utils/themeHelpers";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SetStatus = "disabled" | "source" | "enabled";

interface ThemeOptionSheetProps {
  mode: "add" | "edit";
  open: boolean;
  onClose: () => void;
  groupId?: string;
  optionId?: string;
}

function TokenSetStatusToggle({
  status,
  onChange,
}: {
  status: SetStatus;
  onChange: (status: SetStatus) => void;
}) {
  return (
    <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60 text-xs flex-shrink-0">
      {(["disabled", "source", "enabled"] as SetStatus[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer capitalize",
            status === item
              ? "bg-background text-foreground font-semibold shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item === "disabled" ? "Disabled" : item === "source" ? "Source" : "Enabled"}
        </button>
      ))}
    </div>
  );
}

function TokenSetTreeRows({
  nodes,
  selectedSets,
  onChange,
  depth = 0,
}: {
  nodes: SetTreeNode[];
  selectedSets: Record<string, SetStatus>;
  onChange: (setName: string, status: SetStatus) => void;
  depth?: number;
}) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  return (
    <>
      {nodes.map((node) => {
        if (node.isFolder) {
          const isOpen = openFolders[node.id] ?? true;
          return (
            <div key={node.id}>
              <button
                type="button"
                onClick={() =>
                  setOpenFolders((prev) => ({ ...prev, [node.id]: !isOpen }))
                }
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40 rounded-md cursor-pointer"
                style={{ paddingLeft: 8 + depth * 12 }}
              >
                {isOpen ? (
                  <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="truncate">{node.name}</span>
              </button>
              {isOpen && node.children && (
                <TokenSetTreeRows
                  nodes={node.children}
                  selectedSets={selectedSets}
                  onChange={onChange}
                  depth={depth + 1}
                />
              )}
            </div>
          );
        }

        const status = selectedSets[node.fullPath] || "disabled";
        return (
          <div
            key={node.id}
            className="flex items-center justify-between gap-2 py-1.5 px-2"
            style={{ paddingLeft: 8 + depth * 12 }}
          >
            <span className="text-xs font-medium text-foreground truncate pr-2">
              {node.name}
            </span>
            <TokenSetStatusToggle
              status={status}
              onChange={(next) => onChange(node.fullPath, next)}
            />
          </div>
        );
      })}
    </>
  );
}

export const ThemeOptionSheet: React.FC<ThemeOptionSheetProps> = ({
  mode,
  open,
  onClose,
  groupId,
  optionId,
}) => {
  const {
    themeGroups,
    rawTokens,
    activeThemeGroupId,
    addThemeOption,
    updateThemeOption,
    deleteThemeOption,
    canUserEdit,
  } = useTokenStore();

  const isEditable = canUserEdit();
  const group =
    themeGroups.find((g) => g.id === (groupId || activeThemeGroupId)) ||
    themeGroups[0];
  const option = group?.options.find((o) => o.id === optionId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSets, setSelectedSets] = useState<Record<string, SetStatus>>({});
  const [error, setError] = useState<string | null>(null);

  const availableSetNames = useMemo(() => getValidTokenSetNames(rawTokens), [rawTokens]);
  const folderTree = useMemo(() => buildSetFolderTree(availableSetNames), [availableSetNames]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && option) {
      setName(option.name);
      setDescription(option.description || "");
      const next: Record<string, SetStatus> = {};
      availableSetNames.forEach((setName) => {
        next[setName] = option.selectedTokenSets?.[setName] || "disabled";
      });
      setSelectedSets(next);
      return;
    }

    setName("");
    setDescription("");
    const initial: Record<string, SetStatus> = {};
    const existingOpt = group?.options[0];
    availableSetNames.forEach((setName) => {
      if (existingOpt?.selectedTokenSets?.[setName]) {
        initial[setName] = existingOpt.selectedTokenSets[setName];
      } else {
        initial[setName] = "disabled";
      }
    });
    setSelectedSets(initial);
  }, [open, mode, option, group, availableSetNames]);

  const enabledCount = Object.values(selectedSets).filter((s) => s === "enabled").length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable || !group) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name for this theme option.");
      return;
    }
    if (enabledCount === 0) {
      setError("At least one token set must be enabled");
      return;
    }
    if (
      group.options.some(
        (o) => o.id !== optionId && o.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setError(`An option named "${trimmed}" already exists in ${group.name}.`);
      return;
    }

    if (mode === "add") {
      addThemeOption({
        groupId: group.id,
        name: trimmed,
        description: description.trim(),
        selectedTokenSets: selectedSets,
      });
    } else if (option) {
      updateThemeOption(group.id, option.id, {
        name: trimmed,
        description: description.trim(),
        selectedTokenSets: selectedSets,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!group || !option || !isEditable) return;
    deleteThemeOption(group.id, option.id);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-md md:max-w-md"
        style={{ overflow: "hidden" }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? "Add theme option" : "Edit theme option"}</SheetTitle>
            <SheetDescription>
              {mode === "add"
                ? "Create a new option for this theme group."
                : "Rename this option and choose which token sets contribute to it."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Light"
                className="h-9 text-xs"
                required
                disabled={!isEditable}
              />
            </div>

            {mode === "add" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this theme option."
                  className="min-h-20 text-xs"
                  disabled={!isEditable}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Selected Token Sets {mode === "add" ? <span className="text-destructive">*</span> : null}
              </Label>
              {mode === "add" && (
                <p className="text-[11px] text-muted-foreground">
                  Select which token sets are active for this theme option
                </p>
              )}
              <div className="border border-border rounded-xl overflow-hidden bg-card/40">
                <TokenSetTreeRows
                  nodes={folderTree}
                  selectedSets={selectedSets}
                  onChange={(setName, status) =>
                    setSelectedSets((prev) => ({ ...prev, [setName]: status }))
                  }
                />
                {folderTree.length === 0 && (
                  <p className="text-[11px] text-muted-foreground px-3 py-4">
                    No token sets available.
                  </p>
                )}
              </div>
              {enabledCount === 0 && (
                <p className="text-[11px] text-amber-600">
                  At least one token set must be enabled
                </p>
              )}
            </div>

            {error && <p className="text-[11px] text-destructive">{error}</p>}
          </div>

          <SheetFooter className={cn(mode === "edit" && "sm:justify-between")}>
            {mode === "edit" && isEditable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                Delete option
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!isEditable || enabledCount === 0}>
                {mode === "add" ? "Create Option" : "Save changes"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
