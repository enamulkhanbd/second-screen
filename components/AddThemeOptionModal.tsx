"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Plus,
  Layers,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface AddThemeOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroupId?: string;
}

const COLOR_PRESETS = [
  "#ffffff",
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f97316", // Orange
  "#ef4444", // Red
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#eab308", // Yellow
];

export const AddThemeOptionModal: React.FC<AddThemeOptionModalProps> = ({
  isOpen,
  onClose,
  defaultGroupId,
}) => {
  const {
    themeGroups,
    rawTokens,
    activeThemeGroupId,
    addThemeOption,
  } = useTokenStore();

  const currentGroup = useMemo(() => {
    return (
      themeGroups.find((g) => g.id === (defaultGroupId || activeThemeGroupId)) ||
      themeGroups[0] ||
      null
    );
  }, [themeGroups, defaultGroupId, activeThemeGroupId]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    currentGroup?.id || ""
  );
  const [optionName, setOptionName] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [selectedSets, setSelectedSets] = useState<
    Record<string, "enabled" | "disabled" | "source">
  >({});
  const [createNewSet, setCreateNewSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [cloneFromOptionId, setCloneFromOptionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Available token set keys in rawTokens (exclude $-prefixed metadata)
  const availableSetNames = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  }, [rawTokens]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && currentGroup) {
      setSelectedGroupId(currentGroup.id);
      setOptionName("");
      setColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
      setError(null);
      setCreateNewSet(false);
      setNewSetName("");
      setCloneFromOptionId("");

      const existingOpt = currentGroup.options[0];
      const initialSets: Record<string, "enabled" | "disabled" | "source"> = {};

      availableSetNames.forEach((setName) => {
        if (existingOpt && existingOpt.selectedTokenSets[setName]) {
          initialSets[setName] = existingOpt.selectedTokenSets[setName];
        } else if (setName.toLowerCase() === "global") {
          initialSets[setName] = "source";
        } else {
          initialSets[setName] = "disabled";
        }
      });

      setSelectedSets(initialSets);
    }
  }, [isOpen, currentGroup, availableSetNames]);

  const targetGroup =
    themeGroups.find((g) => g.id === selectedGroupId) || currentGroup;

  const handleSetStatusChange = (
    setName: string,
    status: "enabled" | "disabled" | "source"
  ) => {
    setSelectedSets((prev) => ({
      ...prev,
      [setName]: status,
    }));
  };

  const handleOptionNameChange = (val: string) => {
    setOptionName(val);
    if (createNewSet || !newSetName) {
      setNewSetName(val.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = optionName.trim();

    if (!trimmedName) {
      setError("Please enter a name for the theme option.");
      return;
    }

    if (
      targetGroup?.options.some(
        (o) => o.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError(`An option named "${trimmedName}" already exists in ${targetGroup.name}.`);
      return;
    }

    const enabledCount = Object.values(selectedSets).filter(
      (s) => s === "enabled"
    ).length;

    if (enabledCount === 0 && (!createNewSet || !newSetName.trim())) {
      setError("Please enable at least one token set or create a new token set.");
      return;
    }

    addThemeOption({
      groupId: targetGroup?.id || selectedGroupId,
      name: trimmedName,
      color,
      selectedTokenSets: selectedSets,
      cloneFromOptionId: cloneFromOptionId || undefined,
      newSetName: createNewSet && newSetName.trim() ? newSetName.trim() : undefined,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Add Theme Option</DialogTitle>
              <DialogDescription className="text-xs">
                Create a new theme variation in{" "}
                <span className="font-semibold text-foreground">
                  {targetGroup?.name || "Theme"}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Theme Group Selection */}
          {themeGroups.length > 1 && (
            <div className="space-y-1.5">
              <Label>Theme Group</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {themeGroups.map((grp) => {
                  const isSel = grp.id === selectedGroupId;
                  return (
                    <button
                      type="button"
                      key={grp.id}
                      onClick={() => setSelectedGroupId(grp.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        isSel
                          ? "bg-card border-primary text-primary font-semibold shadow-xs"
                          : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: grp.color }}
                      />
                      <span className="truncate">{grp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Option Name */}
          <div className="space-y-1.5">
            <Label htmlFor="opt-name">
              Option Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="opt-name"
              type="text"
              required
              autoFocus
              placeholder="e.g. High Contrast, Dimmed, Atlas Pro, Compact"
              value={optionName}
              onChange={(e) => handleOptionNameChange(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Accent Color */}
          <div className="space-y-1.5">
            <Label>Accent Color</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setColor(preset)}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      color === preset
                        ? "scale-110 ring-2 ring-primary border-transparent"
                        : "border-black/20 dark:border-white/20 hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5 pl-2 border-l border-border">
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-7 text-[11px] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Token Sets Configuration */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label>Included Token Sets</Label>
              <span className="text-[11px] text-muted-foreground">
                Configure sets applied to this option
              </span>
            </div>

            {/* List of sets */}
            <div className="space-y-1.5 bg-muted/40 p-3 rounded-lg border border-border max-h-48 overflow-y-auto">
              {availableSetNames.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No token sets found.</p>
              ) : (
                availableSetNames.map((setName) => {
                  const status = selectedSets[setName] || "disabled";

                  return (
                    <div
                      key={setName}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-card hover:bg-accent/40 border border-border text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Layers className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-mono text-[11px] truncate">{setName}</span>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {(["enabled", "disabled", "source"] as const).map((st) => (
                          <button
                            type="button"
                            key={st}
                            onClick={() => handleSetStatusChange(setName, st)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase transition-colors ${
                              status === st
                                ? st === "enabled"
                                  ? "bg-primary text-primary-foreground font-bold"
                                  : st === "source"
                                  ? "bg-secondary text-secondary-foreground font-bold"
                                  : "bg-muted text-muted-foreground font-bold"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Theme Option</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
