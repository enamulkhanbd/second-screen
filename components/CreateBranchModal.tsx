"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Create New Branch</DialogTitle>
              <DialogDescription className="text-xs">
                Fork an isolated branch to build and test tokens safely.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {/* Branch Title */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-title" className="text-xs font-semibold">
              Branch Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="branch-title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. New color palette, Dark mode overhaul"
              className="text-xs"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              A human-readable name for your branch.
            </p>
          </div>

          {/* Branch Name / Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-name" className="text-xs font-semibold">
              Branch Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="branch-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. new-color-palette"
                className="text-xs font-mono pr-8"
              />
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Use lowercase letters, numbers, and hyphens (auto-generated from title).
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="branch-desc" className="text-xs font-semibold">
              Description <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="branch-desc"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="What are you working on in this branch?"
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* Based On Branch */}
          <div className="space-y-1.5">
            <Label htmlFor="based-on" className="text-xs font-semibold">
              Based On Branch
            </Label>
            <Select value={basedOn} onValueChange={setBasedOn}>
              <SelectTrigger id="based-on" className="text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.name} className="font-mono text-xs">
                    {b.name} {b.isDefault ? "(default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              This branch will start with all tokens from the selected branch.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !title.trim() || !name.trim()}
              className="gap-1.5 font-semibold"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Creating..." : "Create Branch"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
