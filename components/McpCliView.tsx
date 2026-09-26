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
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CodeViewer } from "@/components/ui/CodeViewer";

export const McpCliView: React.FC = () => {
  const { currentProject, currentOrg, addToast } = useTokenStore();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const mcpConfig = {
    mcpServers: {
      "tokens-platform": {
        command: "npx",
        args: [
          "-y",
          "@tokens-platform/mcp-server",
          `--org=${currentOrg?.slug || "acme"}`,
          `--project=${currentProject?.slug || "design-system"}`,
        ],
        env: {
          TOKENS_PLATFORM_PAT: "<YOUR_PERSONAL_ACCESS_TOKEN>",
        },
      },
    },
  };

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
              MCP &amp; CLI Developer Tools
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Model Context Protocol (MCP) server &amp; Tokens Platform terminal CLI
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* 1. MCP Server Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Model Context Protocol (MCP) Server</CardTitle>
                  <CardDescription className="text-xs">
                    Allow AI Coding Agents (Claude, Cursor, Antigravity) to query and resolve design tokens directly.
                  </CardDescription>
                </div>
              </div>

              <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 bg-primary/5">
                MCP v1.0
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Add this configuration to your Claude Desktop or Cursor MCP settings file (<code className="font-mono text-foreground">mcp_config.json</code>):
            </p>

            <div className="relative rounded-xl border border-border bg-white dark:bg-[#0d0d12] overflow-hidden select-text shadow-sm">
              <button
                onClick={() => handleCopy(JSON.stringify(mcpConfig, null, 2), "mcp")}
                className="absolute right-3 top-3 px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground/80 text-[11px] flex items-center gap-1 transition-colors z-10"
              >
                {copiedKey === "mcp" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "mcp" ? "Copied" : "Copy"}</span>
              </button>
              <div className="p-4">
                <CodeViewer
                  content={JSON.stringify(mcpConfig, null, 2)}
                  language="json"
                />
              </div>
            </div>
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
