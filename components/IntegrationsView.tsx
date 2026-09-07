"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Plus,
  Check,
  FolderGit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const IntegrationsView: React.FC = () => {
  const { addToast } = useTokenStore();
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("github");

  const providers = [
    { id: "github", name: "GitHub", icon: "🐙" },
    { id: "gitlab", name: "GitLab", icon: "🦊" },
    { id: "azure", name: "Azure DevOps", icon: "🔷" },
    { id: "bitbucket", name: "Bitbucket", icon: "🪣" },
    { id: "circleci", name: "CircleCI", icon: "⭕" },
  ];

  const handleCreateTrigger = () => {
    addToast({
      type: "success",
      title: "CI Trigger Created",
      message: `Outbound CI trigger created for ${providers.find((p) => p.id === selectedProvider)?.name}.`,
    });
    setShowTriggerModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background text-foreground font-sans select-none p-6 md:p-10">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header (Matching Video Frame 008) */}
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Integrations</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Connect Studio to the tools and services your team uses.
          </p>
        </div>

        {/* Integrations List Card */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border/60 shadow-xs">
          {/* 1. CI Integration (Inbound) */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-foreground">CI Integration (Inbound)</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Let your CI pipeline authenticate with Studio to fetch tokens during builds.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                addToast({
                  type: "info",
                  title: "Inbound CI Key Generated",
                  message: "Copy your build access token from Settings -> MCP & CLI.",
                });
              }}
              className="h-8 text-xs font-medium gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Integration</span>
            </Button>
          </div>

          {/* 2. Service Account Tokens */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-foreground">Service Account Tokens</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Create tokens for CI/CD pipelines and automated tools.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                addToast({
                  type: "success",
                  title: "Service Token Created",
                  message: "Generated new service token with read access.",
                });
              }}
              className="h-8 text-xs font-medium gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Token</span>
            </Button>
          </div>

          {/* 3. Webhooks */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-foreground">Webhooks</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Receive notifications when events occur in Studio.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = prompt("Enter webhook URL endpoint:");
                if (url && url.trim()) {
                  addToast({
                    type: "success",
                    title: "Webhook Added",
                    message: `Webhook registered for ${url.trim()}.`,
                  });
                }
              }}
              className="h-8 text-xs font-medium gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Webhook</span>
            </Button>
          </div>

          {/* 4. CI Trigger (Outbound) */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-foreground">CI Trigger (Outbound)</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Studio triggers your CI/CD pipeline when events happen (e.g. a release).
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTriggerModal(true)}
              className="h-8 text-xs font-medium gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Trigger</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Create CI Trigger (Outbound) Modal (Matching Frame 008) */}
      <Dialog open={showTriggerModal} onOpenChange={setShowTriggerModal}>
        <DialogContent className="sm:max-w-md p-6 border border-border shadow-2xl rounded-xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Create CI Trigger (Outbound)</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Triggers automatically start your CI/CD pipeline when events happen in Studio (e.g. a release is created). Studio calls your provider API to kick off the pipeline run.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">CI Provider</label>
            <div className="grid grid-cols-2 gap-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProvider(p.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${
                    selectedProvider === p.id
                      ? "border-[#6366f1] bg-[#6366f1]/5 text-foreground font-semibold shadow-2xs"
                      : "border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-base">{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTriggerModal(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTrigger}
              className="h-8 text-xs bg-[#6366f1] hover:bg-[#4f46e5] text-white cursor-pointer shadow-2xs"
            >
              Create Trigger
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
