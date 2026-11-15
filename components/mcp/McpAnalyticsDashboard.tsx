"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  Gauge,
  Key,
  Play,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { McpAnalyticsRange, McpAnalyticsResponse } from "@/lib/mcp/observability";
import { formatBytes, formatDurationMs } from "./formatters";
import { McpRecentRequestsTable } from "./McpRecentRequestsTable";
import { McpToolBreakdown } from "./McpToolBreakdown";
import { McpUsageChart } from "./McpUsageChart";

type McpAnalyticsDashboardProps = {
  orgId?: string;
  projectId?: string;
  projectName?: string;
  hasSessionToken: boolean;
  smokeTestRunning?: boolean;
  onRunSmokeTest?: () => Promise<void>;
  onSwitchToSetup?: () => void;
  refreshNonce?: number;
};

const RANGE_OPTIONS: Array<{ value: McpAnalyticsRange; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

export const McpAnalyticsDashboard: React.FC<McpAnalyticsDashboardProps> = ({
  orgId,
  projectId,
  projectName,
  hasSessionToken,
  smokeTestRunning = false,
  onRunSmokeTest,
  onSwitchToSetup,
  refreshNonce = 0,
}) => {
  const [range, setRange] = useState<McpAnalyticsRange>("7d");
  const [data, setData] = useState<McpAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!orgId || !projectId) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        orgId,
        projectId,
        range,
      });
      const res = await fetch(`/api/v1/mcp/analytics?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || `Failed to load analytics (HTTP ${res.status})`);
      }
      setData(json as McpAnalyticsResponse);
    } catch (err: any) {
      setError(err?.message || "Could not load MCP analytics.");
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, range]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, refreshNonce]);

  if (!orgId || !projectId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-xs text-muted-foreground">
          Select a workspace and project to view MCP usage and performance analytics.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls & Health Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  range === opt.value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {data?.health ? (
            <Badge
              variant={data.health.sharedRateLimiterConfigured ? "success" : "secondary"}
              className="text-[10px] font-mono gap-1"
            >
              <span>{data.health.rateLimitPerMinute}/min</span>
              <span>·</span>
              <span>{data.health.sharedRateLimiterConfigured ? "Redis Limiter" : "In-Memory Limiter"}</span>
            </Badge>
          ) : null}

          {data?.source === "memory" ? (
            <Badge variant="outline" className="text-[10px] font-mono">
              Local memory telemetry
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {hasSessionToken && onRunSmokeTest ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onRunSmokeTest}
              disabled={smokeTestRunning}
              className="h-8 text-xs gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{smokeTestRunning ? "Testing..." : "Run Smoke Test"}</span>
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Setup Required Notice */}
      {data?.setupRequired ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground">
                  Database migration required for persistent MCP analytics
                </div>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Apply <code className="font-mono text-foreground">supabase/migrations/20261115_mcp_usage_analytics.sql</code>{" "}
                  to your Supabase project to create the <code className="font-mono text-foreground">mcp_usage_events</code>{" "}
                  table and <code className="font-mono text-foreground">get_mcp_project_analytics</code> function.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => void loadAnalytics()} className="h-8 text-xs">
              Re-check Schema
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Error State */}
      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => void loadAnalytics()} className="h-7 text-xs">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Initial Loading Skeleton */}
      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-5">
              <Skeleton className="h-44 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Analytics Content */}
      {data && !data.setupRequired ? (
        <>
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Requests</span>
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {data.summary.totalRequests.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {data.summary.toolCalls.toLocaleString()} tool calls ·{" "}
                  {(data.summary.totalRequests - data.summary.toolCalls).toLocaleString()} protocol
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Success Rate</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {data.summary.totalRequests > 0 ? `${data.summary.successRate}%` : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {data.summary.errorCount} errors · {data.summary.rateLimitedCount} rate-limited
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Response Speed</span>
                  <Gauge className="w-3.5 h-3.5 text-violet-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {data.summary.totalRequests > 0 ? formatDurationMs(data.summary.avgDurationMs) : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  P95 latency:{" "}
                  <span className="font-mono text-foreground">
                    {data.summary.totalRequests > 0 ? formatDurationMs(data.summary.p95DurationMs) : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Active Keys & Payload</span>
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {data.summary.activeKeysCount}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatBytes(data.summary.totalResponseBytes)} served in {range}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Empty Callout CTA */}
          {data.summary.totalRequests === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center space-y-3">
                <Activity className="w-7 h-7 mx-auto text-muted-foreground opacity-60" />
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">
                    No MCP traffic recorded for {projectName || "this project"} in the last {range}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Connect Antigravity, Cursor, or Claude using a project MCP key—or run a live smoke test to record your first metric.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {hasSessionToken && onRunSmokeTest ? (
                    <Button
                      size="sm"
                      onClick={onRunSmokeTest}
                      disabled={smokeTestRunning}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{smokeTestRunning ? "Testing..." : "Run Live Smoke Test"}</span>
                    </Button>
                  ) : null}
                  {onSwitchToSetup ? (
                    <Button size="sm" variant="outline" onClick={onSwitchToSetup} className="h-8 text-xs">
                      Go to Setup & Keys
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <McpUsageChart timeline={data.timeline} range={range} />

          <McpToolBreakdown
            byTool={data.byTool}
            byKey={data.byKey}
            byMethod={data.byMethod}
            clients={data.clients}
          />

          <McpRecentRequestsTable events={data.recentEvents} />
        </>
      ) : null}
    </div>
  );
};
