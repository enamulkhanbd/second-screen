"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Building2,
  FolderGit2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Layers,
  GitBranch,
  FileCode,
  ShieldCheck,
  Zap,
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
import { TokensPlatformLogo } from "@/components/TokensPlatformLogo";

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onOpenSettings?: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const {
    currentUser,
    createOrgAction,
    createProjectAction,
    initializeBlankWorkspace,
    setSidebarTab,
    setProjectSettingsTab,
    addToast,
  } = useTokenStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [orgName, setOrgName] = useState("");
  const [projectName, setProjectName] = useState("Core Design System");
  const [projectDescription, setProjectDescription] = useState("Brand tokens, colors, typography, and theme modes");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default org name from user name if available
  React.useEffect(() => {
    if (currentUser?.displayName && !orgName) {
      setOrgName(`${currentUser.displayName}'s Organization`);
    } else if (currentUser?.email && !orgName) {
      const prefix = currentUser.email.split("@")[0];
      setOrgName(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Workspace`);
    }
  }, [currentUser, orgName]);

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError("Please enter an organization or team name.");
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
      // 1. Create Organization
      const org = await createOrgAction(orgName.trim());
      if (!org) {
        throw new Error("Failed to create organization. Please try again.");
      }

      // 2. Create Initial Project under Org
      const proj = await createProjectAction(projectName.trim(), projectDescription.trim());
      if (!proj) {
        throw new Error("Failed to create project. Please try again.");
      }

      addToast({
        type: "success",
        title: "Workspace Ready!",
        message: `Created "${org.name}" with project "${proj.name}".`,
      });

      setStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to set up workspace.");
    } finally {
      setLoading(false);
    }
  };

  const handleChoosePath = (path: "tokens" | "git" | "figma") => {
    if (path === "tokens") {
      setSidebarTab("tokens");
    } else if (path === "git") {
      setProjectSettingsTab("sync");
      setSidebarTab("project-settings");
      if (onOpenSettings) onOpenSettings();
    } else if (path === "figma") {
      setProjectSettingsTab("sync");
      setSidebarTab("project-settings");
      if (onOpenSettings) onOpenSettings();
    }
    if (onClose) onClose();
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
                Workspace Setup Wizard
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
                  : step === 3
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </span>
            <span className="w-3 h-[1px] bg-border" />
            <span
              className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                step === 3
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              3
            </span>
          </div>
        </div>

        {/* STEP 1: CREATE ORGANIZATION */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-bold">
                Create Your Organization
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Organizations are your team&apos;s security and billing boundary. You can invite team members and manage role permissions later.
              </DialogDescription>
            </div>

            <div className="space-y-2 pt-1">
              <Label htmlFor="org-name" className="text-xs font-semibold">
                Organization / Company Name
              </Label>
              <Input
                id="org-name"
                type="text"
                placeholder="e.g. Acme Design Co. or Studio X"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoFocus
                className="h-9 text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                As creator, you will be assigned as the <strong>Owner</strong> of this organization.
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
                <span>Continue to Project Setup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 2: CREATE FIRST PROJECT */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2 shadow-xs">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-bold">
                Create Your First Project
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Everything in Tokens Platform operates at the project level: tokens, themes, git sync, and Figma plugin pairings.
              </DialogDescription>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="project-name" className="text-xs font-semibold">
                  Project Name
                </Label>
                <Input
                  id="project-name"
                  type="text"
                  placeholder="e.g. Core Design System, Web Tokens, iOS App"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoFocus
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-desc" className="text-xs font-semibold">
                  Description <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="project-desc"
                  type="text"
                  placeholder="e.g. Brand tokens and cross-platform modes"
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
                <span>{loading ? "Creating Project..." : "Create & Launch Project"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 3: CHOOSE INITIAL LAUNCH PATH */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <DialogTitle className="text-base font-bold">
                {projectName} is Ready!
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                How would you like to start adding design tokens to this project?
              </DialogDescription>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Option A: Git Sync */}
              <div
                onClick={() => handleChoosePath("git")}
                className="p-3.5 rounded-xl border border-border bg-card hover:bg-primary/5 transition-all cursor-pointer flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                    <span>Connect Git Repository</span>
                    <Badge variant="violet" className="text-[9px] px-1 py-0">Recommended</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Pull tokens dynamically from your GitHub or Azure DevOps repository branches.
                  </p>
                </div>
              </div>

              {/* Option B: Figma Plugin Sync */}
              <div
                onClick={() => handleChoosePath("figma")}
                className="p-3.5 rounded-xl border border-border bg-card hover:bg-primary/5 transition-all cursor-pointer flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="font-semibold text-xs text-foreground">
                    Pair with Figma Companion Plugin
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Extract native Figma Variables and theme collections directly from your Figma canvas.
                  </p>
                </div>
              </div>

              {/* Option C: Clean Canvas */}
              <div
                onClick={() => handleChoosePath("tokens")}
                className="p-3.5 rounded-xl border border-border bg-card hover:bg-primary/5 transition-all cursor-pointer flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <FileCode className="w-4 h-4 text-foreground" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="font-semibold text-xs text-foreground">
                    Start with Empty Canvas
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Open an empty workspace and define your design token hierarchy manually.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
