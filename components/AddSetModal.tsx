"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { FolderPlus, Plus } from "lucide-react";
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

interface AddSetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddSetModal: React.FC<AddSetModalProps> = ({ isOpen, onClose }) => {
  const { addNewSet, rawTokens, addToast } = useTokenStore();
  const [setName, setSetName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = setName.trim();
    if (!clean) return;

    if (rawTokens[clean]) {
      addToast({
        type: "error",
        title: "Set Exists",
        message: `Token set "${clean}" already exists.`,
      });
      return;
    }

    addNewSet(clean);
    addToast({
      type: "success",
      title: "Set Created",
      message: `Created token set "${clean}".`,
    });
    setSetName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <DialogTitle>Create Token Set</DialogTitle>
          </div>
          <DialogDescription>
            Add a new token set or folder to your design system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="set-path">Set Path / Name</Label>
            <Input
              id="set-path"
              type="text"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="e.g. components/button or themes/brand-b"
              className="font-mono text-xs"
              required
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Use forward slash <code className="font-mono bg-muted px-1 rounded">/</code> to organize sets into folders (e.g. <code className="font-mono bg-muted px-1 rounded">components/card</code>).
            </p>
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
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Set</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
