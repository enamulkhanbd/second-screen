"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Code2,
  Terminal,
  Copy,
  Check,
  Bot,
  Sparkles,
  Layers,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CodeViewer } from "@/components/ui/CodeViewer";
import { ApiKeysManager } from "@/components/ApiKeysManager";

export const McpCliView: React.FC = () => {
  const { currentProject, currentOrg, addToast } = useTokenStore();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast({
      type: "success",
      title: "Copied to Clipboard",
      message: "Snippet copied.",
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* Header */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              Developers
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Connect AI agents and scripts to this project with a personal access token
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* 0. Project-bound MCP credential */}
        <Card>
          <CardContent className="pt-6">
            {currentOrg && currentProject ? (
              <ApiKeysManager
                credentialType="mcp_project"
                orgId={currentOrg.id}
                projectId={currentProject.id}
                projectName={currentProject.name}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a workspace and project before creating a project-bound MCP credential.
              </p>
            )}
          </CardContent>
        </Card>
        {/* 1. MCP Server Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Model Context Protocol (MCP) Server</CardTitle>
                  <CardDescription className="text-xs">
                    Allow AI Coding Agents (Claude, Cursor, Antigravity) to query and resolve design tokens directly.
                  </CardDescription>
                </div>
              </div>

            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              The project-bound read-only credential flow is now available. The remote MCP endpoint and
              client configuration are still being implemented and will appear here only after staging
              protocol tests pass.
            </p>
          </CardContent>
        </Card>

        {/* 2. CLI Tools Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Tokens Platform CLI</CardTitle>
                <CardDescription className="text-xs">
                  Pull, validate, and build design tokens inside your frontend repository build scripts.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-foreground">1. Pull latest tokens</div>
              <div className="relative rounded-lg border border-border bg-white dark:bg-[#0d0d12] p-2.5 select-text flex items-center justify-between shadow-2xs">
                <div className="overflow-x-auto flex-1 mr-2">
                  <CodeViewer
                    content={`npx tokens-platform pull --project ${currentProject?.slug || "design-system"}`}
                    language="bash"
                    className="bg-transparent dark:bg-transparent"
                  />
                </div>
                <button
                  onClick={() => handleCopy(`npx tokens-platform pull --project ${currentProject?.slug || "design-system"}`, "cli-pull")}
                  className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1 flex-shrink-0"
                >
                  {copiedKey === "cli-pull" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-foreground">2. Build multi-platform release assets</div>
              <div className="relative rounded-lg border border-border bg-white dark:bg-[#0d0d12] p-2.5 select-text flex items-center justify-between shadow-2xs">
                <div className="overflow-x-auto flex-1 mr-2">
                  <CodeViewer
                    content="npx tokens-platform build --out ./build"
                    language="bash"
                    className="bg-transparent dark:bg-transparent"
                  />
                </div>
                <button
                  onClick={() => handleCopy("npx tokens-platform build --out ./build", "cli-build")}
                  className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1 flex-shrink-0"
                >
                  {copiedKey === "cli-build" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
