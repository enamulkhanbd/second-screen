"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Link2,
  FolderGit2,
  Globe,
  Download,
  Key,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PluginDistributionModal } from "@/components/PluginDistributionModal";

interface IntegrationsViewProps {
  onOpenSettings?: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ onOpenSettings }) => {
  const { credentials, currentOrg, addToast } = useTokenStore();
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* Header */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              Integrations &amp; Connected Services
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Figma plugin, Git version control, and token distribution endpoints
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Figma Companion Plugin */}
          <Card className="flex flex-col justify-between hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold text-base">
                  F
                </div>
                <Badge variant="violet" className="text-[10px]">Private Plugin</Badge>
              </div>
              <CardTitle className="text-sm font-bold mt-2">Figma Desktop Plugin</CardTitle>
              <CardDescription className="text-xs">
                Bi-directional sync between Figma Variables, Theme Modes, Paint Styles and Tokens Platform Cloud.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPluginModalOpen(true)}
                className="w-full gap-1.5 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Get Figma Plugin Bundle</span>
              </Button>
            </CardContent>
          </Card>

          {/* 2. GitHub Sync */}
          <Card className="flex flex-col justify-between hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                {credentials.provider === "github" && credentials.repo ? (
                  <Badge variant="success" className="text-[10px]">Connected</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Configurable</Badge>
                )}
              </div>
              <CardTitle className="text-sm font-bold mt-2">GitHub Repository</CardTitle>
              <CardDescription className="text-xs">
                Commit token changes, open Pull Requests, and switch branches automatically on GitHub.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSettings}
                className="w-full gap-1.5 text-xs font-semibold"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>{credentials.provider === "github" ? "Manage GitHub Sync" : "Connect GitHub"}</span>
              </Button>
            </CardContent>
          </Card>

          {/* 3. Azure DevOps */}
          <Card className="flex flex-col justify-between hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-base">
                  AZ
                </div>
                {credentials.provider === "azure" && credentials.repo ? (
                  <Badge variant="success" className="text-[10px]">Connected</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Configurable</Badge>
                )}
              </div>
              <CardTitle className="text-sm font-bold mt-2">Azure DevOps Repos</CardTitle>
              <CardDescription className="text-xs">
                Full Azure Repos token sync with PAT authentication and branch governance.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSettings}
                className="w-full gap-1.5 text-xs font-semibold"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>{credentials.provider === "azure" ? "Manage Azure Sync" : "Connect Azure DevOps"}</span>
              </Button>
            </CardContent>
          </Card>

          {/* 4. Personal API Tokens */}
          <Card className="flex flex-col justify-between hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-[10px]">REST API</Badge>
              </div>
              <CardTitle className="text-sm font-bold mt-2">Personal Access Tokens</CardTitle>
              <CardDescription className="text-xs">
                Use PATs to authenticate CI/CD pipelines, CLI scripts, and automated releases.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSettings}
                className="w-full gap-1.5 text-xs font-semibold"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Generate PATs</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Figma Plugin Modal */}
      <Dialog open={isPluginModalOpen} onOpenChange={setIsPluginModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <PluginDistributionModal />
        </DialogContent>
      </Dialog>
    </div>
  );
};
