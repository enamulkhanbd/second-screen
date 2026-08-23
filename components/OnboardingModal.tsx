"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Layers,
  FolderGit2,
  Globe,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PluginDistributionModal } from "@/components/PluginDistributionModal";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<"git" | "plugin">("git");

  const handleOpenGitSetup = () => {
    onClose();
    onOpenSettings();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden font-sans">
        <DialogHeader className="p-6 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold">Welcome to Tokens Platform</DialogTitle>
                <Badge variant="violet" className="text-[10px]">
                  Production Ready
                </Badge>
              </div>
              <DialogDescription className="text-xs mt-0.5">
                Connect your organization Git repository or pair with the Figma Desktop Plugin
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 pb-2 border-b border-border">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
            <TabsList>
              <TabsTrigger value="git" className="text-xs gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Connect Git Repository</span>
              </TabsTrigger>
              <TabsTrigger value="plugin" className="text-xs gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Figma Plugin Sync</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* 1. CONNECT GIT */}
          {activeTab === "git" && (
            <div className="space-y-6">
              <div className="text-center py-4 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  Connect Your Repository (GitHub / Azure DevOps)
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Synchronize design tokens directly with your engineering repositories across multiple branches and multi-tenant projects.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Multi-Platform Code</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically builds Tailwind, CSS variables, React TS, and Flutter Dart.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Secure Token Authentication</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Authenticate securely using your Personal Access Tokens (PAT).
                  </p>
                </div>
              </div>

              <Button
                onClick={handleOpenGitSetup}
                className="w-full gap-2 text-xs font-bold h-9"
              >
                <span>Configure Repository Credentials</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* 2. FIGMA PLUGIN */}
          {activeTab === "plugin" && (
            <div className="space-y-4">
              <PluginDistributionModal />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
