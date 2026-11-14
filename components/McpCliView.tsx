"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Code2,
  Terminal,
  Copy,
  Check,
  Bot,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CodeViewer } from "@/components/ui/CodeViewer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ApiKeysManager } from "@/components/ApiKeysManager";

type HealthState =
  | { status: "loading" }
  | {
      status: "ok";
      serverVersion: string;
      toolCount: number;
      sharedRateLimiterConfigured: boolean;
      trustedOriginsConfigured: boolean;
    }
  | { status: "error"; message: string };

type LiveTestState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; summary: string }
  | { status: "error"; message: string };

const MCP_TOOL_GROUPS = [
  {
    group: "Project & Themes",
    tools: [
      { name: "list_workspaces", desc: "List accessible workspace and project metadata" },
      { name: "get_project_overview", desc: "Active branch, theme groups, and token counts" },
      { name: "list_token_sets", desc: "Token sets and per-set counts" },
      { name: "get_themes_matrix", desc: "Theme groups, modes, and set activation" },
      { name: "list_branches", desc: "Native branches and recent commit metadata" },
    ],
  },
  {
    group: "Tokens & Validation",
    tools: [
      { name: "search_tokens", desc: "Cursor-paginated search by path, value, or type" },
      { name: "get_token_details", desc: "Raw, resolved, alias target, and deprecation info" },
      { name: "get_token_usage", desc: "Direct dependencies and reverse dependents" },
      { name: "validate_tokens", desc: "Check missing types, broken/cyclic aliases, deprecations" },
      { name: "export_tokens_code", desc: "Bounded CSS, SCSS, or JSON token snapshot" },
    ],
  },
  {
    group: "Design, Assets & A11y",
    tools: [
      { name: "inspect_figma_variables", desc: "Synced Figma variable collections and modes" },
      { name: "search_project_assets", desc: "R2 project assets and optional inline SVG" },
      { name: "get_documentation_pages", desc: "Project docs pages and structured blocks" },
      { name: "check_color_contrast", desc: "WCAG AA/AAA contrast ratio calculator" },
    ],
  },
];

const STARTER_PROMPTS = [
  {
    title: "Project Smoke Test",
    prompt:
      "Check my connected Second Screen workspace and give me an overview of the project (name, active branch, theme groups, and total token count).",
  },
  {
    title: "Token Search & Usage",
    prompt:
      "Search my Second Screen tokens for primary (limit 10), then inspect the first color token's full details and reverse dependents.",
  },
  {
    title: "Read-Only Token Audit",
    prompt:
      "Run a read-only design-token audit using Second Screen MCP: inspect the theme matrix, validate tokens for broken or cyclic aliases, and check WCAG AA contrast for our main text and surface colors.",
  },
];

function CopyButton({
  value,
  copied,
  onCopy,
  label = "Copy",
}: {
  value: string;
  copied: boolean;
  onCopy: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="px-2.5 py-1 rounded-md bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium inline-flex items-center gap-1.5 flex-shrink-0 transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export const McpCliView: React.FC = () => {
  const { currentProject, currentOrg, addToast } = useTokenStore();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthState>({ status: "loading" });
  const [liveTest, setLiveTest] = useState<LiveTestState>({ status: "idle" });
  const [showToolsAndPrompts, setShowToolsAndPrompts] = useState(false);

  const checkHealth = async () => {
    setHealth({ status: "loading" });
    try {
      const res = await fetch("/api/v1/mcp/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setHealth({
        status: "ok",
        serverVersion: body.serverVersion || "0.1.0",
        toolCount: Array.isArray(body.capabilities?.tools) ? body.capabilities.tools.length : 14,
        sharedRateLimiterConfigured: Boolean(body.productionReadiness?.sharedRateLimiterConfigured),
        trustedOriginsConfigured: Boolean(body.productionReadiness?.trustedOriginsConfigured),
      });
    } catch (err: any) {
      setHealth({ status: "error", message: err?.message || "Health check failed" });
    }
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    checkHealth();
  }, []);

  useEffect(() => {
    setSessionToken(null);
    setLiveTest({ status: "idle" });
  }, [currentProject?.id]);

  const baseUrl = origin || "https://your-domain.com";
  const mcpEndpoint = `${baseUrl}/api/v1/mcp`;
  const tokenPlaceholder = sessionToken || "sec_pat_live_YOUR_TOKEN";
  const serverKey = currentProject?.slug ? `second-screen-${currentProject.slug}` : "second-screen";

  const snippets = useMemo(() => {
    const antigravity = JSON.stringify(
      {
        mcpServers: {
          [serverKey]: {
            serverUrl: mcpEndpoint,
            headers: {
              Authorization: `Bearer ${tokenPlaceholder}`,
            },
          },
        },
      },
      null,
      2,
    );

    const cursor = JSON.stringify(
      {
        mcpServers: {
          [serverKey]: {
            url: mcpEndpoint,
            headers: {
              Authorization: `Bearer ${tokenPlaceholder}`,
            },
          },
        },
      },
      null,
      2,
    );

    const vscode = JSON.stringify(
      {
        servers: {
          [serverKey]: {
            type: "http",
            url: mcpEndpoint,
            headers: {
              Authorization: `Bearer ${tokenPlaceholder}`,
            },
          },
        },
      },
      null,
      2,
    );

    const curl = [
      `curl -X POST "${mcpEndpoint}" \\`,
      `  -H "Authorization: Bearer ${tokenPlaceholder}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -H "Accept: application/json, text/event-stream" \\`,
      `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_project_overview","arguments":{}}}'`,
    ].join("\n");

    const restCurl = [
      `curl -X GET "${baseUrl}/api/v1/tokens${
        currentOrg?.id && currentProject?.id
          ? `?orgId=${currentOrg.id}&projectId=${currentProject.id}`
          : ""
      }" \\`,
      `  -H "Authorization: Bearer sec_pat_live_YOUR_PERSONAL_PAT"`,
    ].join("\n");

    return { antigravity, cursor, vscode, curl, restCurl };
  }, [baseUrl, mcpEndpoint, tokenPlaceholder, serverKey, currentOrg?.id, currentProject?.id]);

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

  const handleRunLiveTest = async () => {
    if (!sessionToken) return;
    setLiveTest({ status: "running" });
    try {
      const res = await fetch("/api/v1/mcp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_project_overview", arguments: {} },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || `HTTP ${res.status}`);
      }
      const text = json.result?.content?.[0]?.text;
      if (!text || json.result?.isError) {
        throw new Error(text || "Tool call returned an error.");
      }
      const parsed = JSON.parse(text);
      const data = parsed.data || {};
      setLiveTest({
        status: "ok",
        summary: `Connected to "${data.name || currentProject?.name}" (${data.tokenCount ?? 0} tokens, branch ${data.activeBranch || "main"})`,
      });
    } catch (err: any) {
      setLiveTest({ status: "error", message: err?.message || "MCP call failed" });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* Header */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0 z-10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">
              Developers & MCP
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              Connect AI coding agents and scripts to {currentProject?.name || "your project"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {health.status === "loading" && (
            <Badge variant="secondary" className="gap-1.5 text-[11px]">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Checking MCP...</span>
            </Badge>
          )}
          {health.status === "ok" && (
            <Badge variant="success" className="gap-1.5 text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              <span>MCP Online · {health.toolCount} Tools</span>
            </Badge>
          )}
          {health.status === "error" && (
            <Badge variant="destructive" className="gap-1.5 text-[11px]">
              <AlertCircle className="w-3 h-3" />
              <span>MCP Unavailable</span>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={checkHealth}
            className="h-7 px-2 text-[11px] text-muted-foreground"
            title="Refresh MCP server health"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Step 1: Project-bound MCP credential */}
        <Card>
          <CardContent className="pt-6">
            {currentOrg && currentProject ? (
              <ApiKeysManager
                credentialType="mcp_project"
                orgId={currentOrg.id}
                projectId={currentProject.id}
                projectName={currentProject.name}
                showQuickstart={false}
                onTokenCreated={(token) => {
                  setSessionToken(token);
                  setLiveTest({ status: "idle" });
                }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a workspace and project before creating a project-bound MCP credential.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Connect Your AI Client */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span>Connect AI Coding Agents (MCP)</span>
                    <Badge variant="violet" className="text-[10px] py-0 px-1.5">
                      Read-Only · Streamable HTTP
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Paste the client config below into Antigravity, Cursor, Claude, or VS Code using your project MCP token.
                  </CardDescription>
                </div>
              </div>

              {sessionToken && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRunLiveTest}
                    disabled={liveTest.status === "running"}
                    className="h-7 text-[11px] gap-1.5"
                  >
                    <Play className="w-3 h-3" />
                    <span>{liveTest.status === "running" ? "Testing..." : "Test Live Call"}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSessionToken(null);
                      setLiveTest({ status: "idle" });
                    }}
                    className="h-7 text-[11px] text-muted-foreground"
                  >
                    Clear token
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Endpoint Bar */}
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-shrink-0">
                  Endpoint
                </span>
                <code className="text-xs font-mono text-foreground truncate select-all">
                  {mcpEndpoint}
                </code>
              </div>
              <CopyButton
                value={mcpEndpoint}
                copied={copiedKey === "mcp-endpoint"}
                onCopy={() => handleCopy(mcpEndpoint, "mcp-endpoint")}
                label="Copy URL"
              />
            </div>

            {sessionToken && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Snippets below are pre-filled with your newly generated token for{" "}
                  <strong>{currentProject?.name || "this project"}</strong>.
                </span>
              </div>
            )}

            {liveTest.status === "ok" && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{liveTest.summary}</span>
              </div>
            )}

            {liveTest.status === "error" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 flex items-center gap-2 text-[11px] text-destructive">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Live MCP test failed: {liveTest.message}</span>
              </div>
            )}

            {/* Client Config Tabs */}
            <Tabs defaultValue="antigravity" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="antigravity">Antigravity</TabsTrigger>
                <TabsTrigger value="cursor">Cursor / Claude</TabsTrigger>
                <TabsTrigger value="vscode">VS Code</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>

              <TabsContent value="antigravity" className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Add to <code className="font-mono text-foreground">mcp_config.json</code> (uses{" "}
                    <code className="font-mono text-foreground">serverUrl</code>)
                  </span>
                  <CopyButton
                    value={snippets.antigravity}
                    copied={copiedKey === "cfg-antigravity"}
                    onCopy={() => handleCopy(snippets.antigravity, "cfg-antigravity")}
                  />
                </div>
                <div className="rounded-lg border border-border bg-white dark:bg-[#0d0d12] p-3 select-text overflow-x-auto">
                  <CodeViewer content={snippets.antigravity} language="json" className="bg-transparent dark:bg-transparent" />
                </div>
              </TabsContent>

              <TabsContent value="cursor" className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Add to <code className="font-mono text-foreground">.cursor/mcp.json</code> or Claude Desktop config
                  </span>
                  <CopyButton
                    value={snippets.cursor}
                    copied={copiedKey === "cfg-cursor"}
                    onCopy={() => handleCopy(snippets.cursor, "cfg-cursor")}
                  />
                </div>
                <div className="rounded-lg border border-border bg-white dark:bg-[#0d0d12] p-3 select-text overflow-x-auto">
                  <CodeViewer content={snippets.cursor} language="json" className="bg-transparent dark:bg-transparent" />
                </div>
              </TabsContent>

              <TabsContent value="vscode" className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Add to <code className="font-mono text-foreground">.vscode/mcp.json</code>
                  </span>
                  <CopyButton
                    value={snippets.vscode}
                    copied={copiedKey === "cfg-vscode"}
                    onCopy={() => handleCopy(snippets.vscode, "cfg-vscode")}
                  />
                </div>
                <div className="rounded-lg border border-border bg-white dark:bg-[#0d0d12] p-3 select-text overflow-x-auto">
                  <CodeViewer content={snippets.vscode} language="json" className="bg-transparent dark:bg-transparent" />
                </div>
              </TabsContent>

              <TabsContent value="curl" className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Verify <code className="font-mono text-foreground">get_project_overview</code> directly from your terminal
                  </span>
                  <CopyButton
                    value={snippets.curl}
                    copied={copiedKey === "cfg-curl"}
                    onCopy={() => handleCopy(snippets.curl, "cfg-curl")}
                  />
                </div>
                <div className="rounded-lg border border-border bg-white dark:bg-[#0d0d12] p-3 select-text overflow-x-auto">
                  <CodeViewer content={snippets.curl} language="bash" className="bg-transparent dark:bg-transparent" />
                </div>
              </TabsContent>
            </Tabs>

            {/* Collapsible Tools & Starter Prompts */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowToolsAndPrompts((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-semibold text-foreground hover:text-primary transition-colors py-1"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  <span>14 Available Tools & Starter Prompts</span>
                </span>
                {showToolsAndPrompts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showToolsAndPrompts && (
                <div className="mt-3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {MCP_TOOL_GROUPS.map((group) => (
                      <div key={group.group} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                        <div className="text-[11px] font-bold text-foreground">{group.group}</div>
                        <ul className="space-y-1.5">
                          {group.tools.map((tool) => (
                            <li key={tool.name} className="text-[11px]">
                              <code className="font-mono text-primary font-semibold">{tool.name}</code>
                              <div className="text-muted-foreground text-[10px] leading-snug">{tool.desc}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-foreground">Starter Prompts</div>
                    <div className="grid grid-cols-1 gap-2">
                      {STARTER_PROMPTS.map((item) => (
                        <div
                          key={item.title}
                          className="rounded-lg border border-border bg-card p-3 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-[11px] font-semibold text-foreground">{item.title}</div>
                            <p className="text-[11px] text-muted-foreground select-text">{item.prompt}</p>
                          </div>
                          <CopyButton
                            value={item.prompt}
                            copied={copiedKey === `prompt-${item.title}`}
                            onCopy={() => handleCopy(item.prompt, `prompt-${item.title}`)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: REST API Quickstart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">REST API Quickstart</CardTitle>
                  <CardDescription className="text-xs">
                    Pull resolved tokens in CI/CD scripts using a Personal Access Token (Account Credentials).
                  </CardDescription>
                </div>
              </div>
              <CopyButton
                value={snippets.restCurl}
                copied={copiedKey === "rest-curl"}
                onCopy={() => handleCopy(snippets.restCurl, "rest-curl")}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-white dark:bg-[#0d0d12] p-3 select-text overflow-x-auto">
              <CodeViewer content={snippets.restCurl} language="bash" className="bg-transparent dark:bg-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
