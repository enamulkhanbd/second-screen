"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitBranch, Sparkles } from "lucide-react";

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBasedOn?: string;
}

export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  isOpen,
  onClose,
  defaultBasedOn,
}) => {
  const { branches, activeBranch, createBranchAction, canUserEdit, addToast } = useTokenStore();

  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basedOn, setBasedOn] = useState("main");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

  // Auto slugify function
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setName("");
      setDescription("");
      setIsNameManuallyEdited(false);
      setBasedOn(defaultBasedOn || activeBranch || "main");
    }
  }, [isOpen, defaultBasedOn, activeBranch]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isNameManuallyEdited) {
      setName(slugify(val));
    }
  };

  const handleNameChange = (val: string) => {
    setIsNameManuallyEdited(true);
    setName(val.toLowerCase().replace(/[^a-z0-9_-]/g, "-"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUserEdit()) {
      addToast({
        type: "error",
        title: "Permission Denied",
        message: "You do not have permission to create branches.",
      });
      return;
    }

    const cleanTitle = title.trim();
    const cleanName = slugify(name || title);

    if (!cleanTitle) {
      addToast({
        type: "error",
        title: "Title Required",
        message: "Please provide a human-readable title for your branch.",
      });
      return;
    }

    if (!cleanName) {
      addToast({
        type: "error",
        title: "Branch Name Required",
        message: "Please enter a valid branch name using lowercase letters, numbers, and hyphens.",
      });
      return;
    }

    if (branches.some((b) => b.name === cleanName)) {
      addToast({
        type: "error",
        title: "Branch Exists",
        message: `A branch named "${cleanName}" already exists.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createBranchAction({
        title: cleanTitle,
        name: cleanName,
        description: description.trim(),
        basedOn,
      });
      onClose();
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Failed to Create Branch",
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border border-border text-foreground p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-1 text-left pb-2">
          <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
            Create New Branch
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Branch Title */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-title" className="text-xs font-semibold text-foreground">
              Branch Title <span className="text-muted-foreground font-normal">*</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              A human-readable name for your branch
            </p>
            <div className="relative">
              <Input
                id="branch-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. New color palette"
                className="text-xs bg-background border-input h-9 pr-9 focus-visible:ring-1 focus-visible:ring-primary text-foreground placeholder:text-muted-foreground/40"
                autoFocus
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs px-1 py-0.5 rounded bg-muted/40 font-mono"
                title="Options"
              >
                •••
              </button>
            </div>
          </div>

          {/* Branch Name */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-name" className="text-xs font-semibold text-foreground">
              Branch Name <span className="text-muted-foreground font-normal">*</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Use lowercase letters, numbers, and hyphens
            </p>
            <Input
              id="branch-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. new-color-palette"
              className="text-xs font-mono bg-background border-input h-9 focus-visible:ring-1 focus-visible:ring-primary text-foreground placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-desc" className="text-xs font-semibold text-foreground">
              Description
            </Label>
            <p className="text-[11px] text-muted-foreground">
              What are you working on in this branch?
            </p>
            <Textarea
              id="branch-desc"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="What are you working on in this branch?"
              rows={3}
              className="text-xs resize-none bg-background border-input focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Based On Branch */}
          <div className="space-y-1.5">
            <Label htmlFor="based-on" className="text-xs font-semibold text-foreground">
              Based On Branch
            </Label>
            <p className="text-[11px] text-muted-foreground">
              This branch will start with all tokens from the selected branch
            </p>
            <Select value={basedOn} onValueChange={setBasedOn}>
              <SelectTrigger id="based-on" className="text-xs bg-background border-input h-9 focus:ring-1 focus:ring-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.name} className="text-xs cursor-pointer">
                    {b.name} {b.isDefault ? "(default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-border mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !title.trim() || !name.trim()}
              className="h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-4 shadow-xs"
            >
              {isSubmitting ? "Creating..." : "Create Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
