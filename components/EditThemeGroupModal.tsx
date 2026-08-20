"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Folder } from "lucide-react";
import { GROUP_PALETTE } from "@/utils/themeHelpers";
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

interface EditThemeGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export const EditThemeGroupModal: React.FC<EditThemeGroupModalProps> = ({
  isOpen,
  onClose,
  groupId,
}) => {
  const { themeGroups, updateThemeGroup, addToast } = useTokenStore();
  const group = themeGroups.find((g) => g.id === groupId);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && group) {
      setName(group.name);
      setColor(group.color || "#3b82f6");
      setError(null);
    }
  }, [isOpen, group]);

  if (!group) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a group name.");
      return;
    }

    if (
      trimmed.toLowerCase() !== group.name.toLowerCase() &&
      themeGroups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setError(`A theme group named "${trimmed}" already exists.`);
      return;
    }

    updateThemeGroup(group.id, trimmed, color);
    addToast({
      type: "success",
      title: "Theme Group Updated",
      message: `Saved changes to "${trimmed}".`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Folder className="w-4 h-4" />
            </div>
            <DialogTitle>Edit Theme Group</DialogTitle>
          </div>
          <DialogDescription>
            Rename or change color for {group.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-group-name">
              Group Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-group-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mode, Brands, Typography, Density"
              className="text-xs"
            />
          </div>

          {/* Group Color Dot */}
          <div className="space-y-1.5">
            <Label>Indicator Color</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {GROUP_PALETTE.map((preset) => (
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

          <DialogFooter className="pt-2">
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
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
