"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Building2,
  FolderGit2,
  ArrowRight,
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
import { TokensPlatformLogo } from "@/components/TokensPlatformLogo";

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    createOrgAction,
    createProjectAction,
    addToast,
  } = useTokenStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [orgName, setOrgName] = useState("");
  const [projectName, setProjectName] = useState("Core Design System");
  const [projectDescription, setProjectDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default org name from user name if available
  React.useEffect(() => {
    if (currentUser?.displayName && !orgName) {
      setOrgName(`${currentUser.displayName}'s Workspace`);
    } else if (currentUser?.email && !orgName) {
      const prefix = currentUser.email.split("@")[0];
      setOrgName(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Workspace`);
    }
  }, [currentUser, orgName]);

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError("Please enter a workspace or team name.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("Please enter a project name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create Workspace
      const org = await createOrgAction(orgName.trim());
      if (!org) {
        throw new Error("Failed to create workspace. Please try again.");
      }

      // 2. Create Initial Project under Org
      const proj = await createProjectAction(projectName.trim(), projectDescription.trim());
      if (!proj) {
        throw new Error("Failed to create project. Please try again.");
      }

      addToast({
        type: "success",
        title: "Workspace ready",
        message: `Created "${org.name}" with project "${proj.name}".`,
      });
      // createProjectAction already opens the new project on its Tokens tab.
    } catch (err: any) {
      setError(err.message || "Failed to set up workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && onClose) onClose(); }}>
      <DialogContent className="max-w-md p-6 gap-5 select-none font-sans">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <TokensPlatformLogo variant="app-icon" size={28} />
            <div>
              <span className="font-bold text-xs tracking-tight text-foreground block">
                Tokens Platform
              </span>
              <span className="text-[10px] text-muted-foreground">
                Set up your workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span
              className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                step === 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              1
            </span>
            <span className="w-3 h-[1px] bg-border" />
            <span
              className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                step === 2
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </span>
          </div>
        </div>

        {/* Step 1: workspace */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-bold">
                Create your workspace
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                A workspace holds your team and projects. You can invite teammates later.
              </DialogDescription>
            </div>

            <div className="space-y-2 pt-1">
              <Label htmlFor="org-name" className="text-xs font-semibold">
                Workspace name
              </Label>
              <Input
                id="org-name"
                type="text"
                placeholder="e.g. Acme Design"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoFocus
                className="h-9 text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                You&apos;ll be the <strong>Owner</strong> of this workspace.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {error}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={!orgName.trim()}
                className="w-full text-xs font-bold gap-1.5 h-9"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 2: first project */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2 shadow-xs">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-bold">
                Create your first project
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                A project holds one design system: its tokens, themes, and exports. You can connect Git or Figma later.
              </DialogDescription>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="project-name" className="text-xs font-semibold">
                  Project name
                </Label>
                <Input
                  id="project-name"
                  type="text"
                  placeholder="e.g. Core Design System"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoFocus
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-desc" className="text-xs font-semibold">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="project-desc"
                  type="text"
                  placeholder="e.g. Brand colors, type, and spacing"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {error}
              </div>
            )}

            <DialogFooter className="pt-2 flex gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="text-xs h-9"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading || !projectName.trim()}
                className="flex-1 text-xs font-bold gap-1.5 h-9"
              >
                <span>{loading ? "Creating project..." : "Create project"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </form>
        )}

      </DialogContent>
    </Dialog>
  );
};
