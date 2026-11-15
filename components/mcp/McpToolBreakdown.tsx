"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Cpu, Key, Laptop, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { McpCountMetric, McpKeyMetric, McpToolMetric } from "@/lib/mcp/observability";
import { MCP_KNOWN_TOOL_NAMES } from "@/lib/mcp/types";
import { formatDurationMs, formatRelativeTime } from "./formatters";

type McpToolBreakdownProps = {
  byTool: McpToolMetric[];
  byKey: McpKeyMetric[];
  byMethod: Array<{ method: string; count: number }>;
  clients: McpCountMetric[];
};

export const McpToolBreakdown: React.FC<McpToolBreakdownProps> = React.memo(({
  byTool,
  byKey,
  byMethod,
  clients,
}) => {
  const [showUnusedTools, setShowUnusedTools] = useState(false);

  const totalToolCalls = useMemo(
    () => byTool.reduce((sum, item) => sum + item.calls, 0),
    [byTool],
  );

  const maxToolCalls = useMemo(
    () => byTool.reduce((max, item) => (item.calls > max ? item.calls : max), 1),
    [byTool],
  );

  const unusedTools = useMemo(() => {
    const calledSet = new Set(byTool.map((t) => t.toolName));
    return MCP_KNOWN_TOOL_NAMES.filter((name) => !calledSet.has(name));
  }, [byTool]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Tool Performance & Adoption */}
      <Card className="lg:col-span-7 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-violet-500" />
              <div>
                <CardTitle className="text-sm font-bold">Tool Performance & Adoption</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Call volume, error rate, and speed across your {MCP_KNOWN_TOOL_NAMES.length} MCP tools
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {byTool.length}/{MCP_KNOWN_TOOL_NAMES.length} used
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          {byTool.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No <code className="font-mono text-foreground">tools/call</code> requests recorded in this range yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {byTool.map((tool) => {
                const barWidth = Math.max(4, Math.round((tool.calls / maxToolCalls) * 100));
                const sharePct = totalToolCalls > 0 ? Math.round((tool.calls / totalToolCalls) * 100) : 0;
                return (
                  <div
                    key={tool.toolName}
                    className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <code className="text-xs font-mono font-semibold text-foreground truncate">
                          {tool.toolName}
                        </code>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {sharePct}%
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="font-semibold text-foreground">{tool.calls} calls</span>
                        {tool.errors > 0 ? (
                          <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-mono">
                            {tool.errors} err ({tool.errorRate}%)
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px] py-0 px-1.5 font-mono">
                            100% ok
                          </Badge>
                        )}
                        <span className="text-muted-foreground" title="Average latency">
                          {formatDurationMs(tool.avgDurationMs)} avg
                        </span>
                        <span className="text-muted-foreground" title="95th percentile latency">
                          {formatDurationMs(tool.p95DurationMs)} p95
                        </span>
                      </div>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500/85"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {unusedTools.length > 0 ? (
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowUnusedTools((prev) => !prev)}
                className="w-full flex items-center justify-between text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <span>Unused tools in this period ({unusedTools.length})</span>
                {showUnusedTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showUnusedTools ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {unusedTools.map((name) => (
                    <Badge key={name} variant="secondary" className="text-[10px] font-mono font-normal">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Credentials, RPC Methods & Clients */}
      <Card className="lg:col-span-5 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-500" />
            <div>
              <CardTitle className="text-sm font-bold">Keys, Methods & Clients</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Which credentials and AI clients are hitting your endpoint
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Active Credentials */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground">Active MCP Keys</div>
            {byKey.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No key activity recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {byKey.map((item) => (
                  <div
                    key={item.credentialId}
                    className="rounded-lg border border-border bg-muted/20 px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{item.keyName}</div>
                      <div className="text-[10px] font-mono text-muted-foreground truncate">
                        {item.keyPrefix} · {formatRelativeTime(item.lastUsedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[11px]">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {item.calls} req
                      </Badge>
                      {item.rateLimited > 0 ? (
                        <Badge variant="warning" className="text-[10px] font-mono">
                          {item.rateLimited} 429
                        </Badge>
                      ) : null}
                      {item.errors > item.rateLimited ? (
                        <Badge variant="destructive" className="text-[10px] font-mono">
                          {item.errors - item.rateLimited} err
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RPC Methods */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Cpu className="w-3.5 h-3.5" />
              <span>JSON-RPC Methods</span>
            </div>
            {byMethod.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No RPC calls recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {byMethod.map((m) => (
                  <Badge key={m.method} variant="secondary" className="text-[10px] font-mono gap-1.5">
                    <span>{m.method}</span>
                    <span className="text-foreground font-semibold">{m.count}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Connected Clients */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Laptop className="w-3.5 h-3.5" />
              <span>Detected Clients (via initialize)</span>
            </div>
            {clients.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Client names appear after MCP <code className="font-mono text-foreground">initialize</code> handshakes.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {clients.map((client) => (
                  <Badge key={client.name} variant="violet" className="text-[10px] font-mono gap-1.5">
                    <span>{client.name}</span>
                    <span>{client.count}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
McpToolBreakdown.displayName = "McpToolBreakdown";
