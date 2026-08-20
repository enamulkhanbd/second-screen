"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Layers, ArrowRight } from "lucide-react";
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

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentOrg, createProjectAction, addToast } = useTokenStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentOrg) return;

    setLoading(true);
    try {
      const proj = await createProjectAction(name.trim(), description.trim());
      if (proj) {
        addToast({
          type: "success",
          title: "Project Created",
          message: `Created project "${proj.name}" under ${currentOrg.name}.`,
        });
        setName("");
        setDescription("");
        onClose();
      }
    } catch (e: any) {
      addToast({
        type: "error",
        title: "Creation Failed",
        message: e.message || "Failed to create project",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <DialogTitle>Create New Project</DialogTitle>
          </div>
          <DialogDescription>
            Create a token project in organization{" "}
            <span className="font-semibold text-foreground">
              {currentOrg?.name}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project Name</Label>
            <Input
              id="proj-name"
              required
              placeholder="e.g. Core Design System, iOS Tokens, Web Portal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description (Optional)</Label>
            <textarea
              id="proj-desc"
              rows={2}
              placeholder="e.g. Multi-brand cross-platform design token definitions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-md border border-input bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
            />
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
              disabled={loading || !name.trim()}
              className="gap-1.5"
            >
              <span>{loading ? "Creating..." : "Create Project"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
