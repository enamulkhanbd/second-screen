"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Activity, AlertCircle, Check, ChevronDown, ChevronRight, Copy, Search, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { describeMcpError } from "@/lib/mcp/errorHints";
import type { McpOutcome, McpRecentEvent } from "@/lib/mcp/observability";
import { formatBytes, formatDurationMs, formatRelativeTime } from "./formatters";

type EventFilter = "all" | "tools" | "errors";

type McpRecentRequestsTableProps = {
  events: McpRecentEvent[];
};

function OutcomeBadge({
  outcome,
  statusCode,
  errorClass,
}: {
  outcome: McpOutcome;
  statusCode: number;
  errorClass?: string | null;
}) {
  if (outcome === "success") {
    return (
      <Badge variant="success" className="text-[10px] py-0 px-1.5 font-mono">
        {statusCode} OK
      </Badge>
    );
  }
  if (outcome === "rate_limited") {
    return (
      <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-mono">
        429 Limit
      </Badge>
    );
  }
  if (outcome === "tool_error") {
    return (
      <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-mono" title={errorClass || "Tool error"}>
        {errorClass || "TOOL_ERROR"}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-mono" title={errorClass || "Error"}>
      {statusCode} {errorClass || "ERR"}
    </Badge>
  );
}

const RecentEventRow: React.FC<{
  event: McpRecentEvent;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}> = React.memo(({ event, expanded, onToggleExpand }) => {
  const isError = event.outcome !== "success";
  const diagnosis = useMemo(() => (isError ? describeMcpError(event) : null), [event, isError]);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyRequestId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(event.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    }
  };

  return (
    <>
      <tr
        onClick={isError ? () => onToggleExpand(event.id) : undefined}
        className={`transition-colors ${
          isError
            ? "cursor-pointer bg-destructive/[0.02] hover:bg-destructive/[0.06]"
            : "hover:bg-muted/40"
        }`}
      >
        <td
          className="py-2.5 px-4 text-muted-foreground whitespace-nowrap font-sans text-[11px] align-top"
          title={new Date(event.createdAt).toLocaleString()}
        >
          <div className="flex items-center gap-1.5">
            {isError ? (
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={expanded ? "Hide error details" : "Inspect error details"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(event.id);
                }}
                className="text-muted-foreground hover:text-foreground -ml-1 p-0.5 rounded"
              >
                {expanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : null}
            <span>{formatRelativeTime(event.createdAt)}</span>
          </div>
        </td>
        <td className="py-2.5 px-4 align-top">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[11px] text-muted-foreground">{event.rpcMethod}</span>
            {event.toolName ? (
              <>
                <span className="text-muted-foreground">/</span>
                <code className="font-mono text-[11px] font-semibold text-foreground">{event.toolName}</code>
              </>
            ) : null}
            {event.clientName ? (
              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono ml-1">
                {event.clientName}
              </Badge>
            ) : null}
          </div>
          {diagnosis ? (
            <div
              className="mt-0.5 text-[11px] text-muted-foreground truncate max-w-[380px]"
              title={diagnosis.detail}
            >
              {diagnosis.detail}
            </div>
          ) : null}
        </td>
        <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px] whitespace-nowrap align-top">
          {event.keyPrefix || "—"}
        </td>
        <td className="py-2.5 px-4 whitespace-nowrap align-top">
          <OutcomeBadge outcome={event.outcome} statusCode={event.statusCode} errorClass={event.errorClass} />
        </td>
        <td className="py-2.5 px-4 text-right font-mono text-[11px] text-foreground whitespace-nowrap align-top">
          {formatDurationMs(event.durationMs)}
        </td>
        <td className="py-2.5 px-4 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap align-top">
          {formatBytes(event.responseBytes)}
        </td>
      </tr>

      {isError && expanded && diagnosis ? (
        <tr className="bg-muted/25">
          <td colSpan={6} className="px-4 py-3 border-t border-border/60">
            <div className="rounded-lg border border-border bg-background/80 p-3 space-y-2 text-[11px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                  <span>{diagnosis.title}</span>
                  {diagnosis.isHistoricalInferred ? (
                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal text-muted-foreground">
                      Inferred from HTTP {event.statusCode} &amp; payload
                    </Badge>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleCopyRequestId}
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy request ID"
                >
                  <span>ID: {event.id}</span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>

              <div className="text-muted-foreground font-mono break-words bg-muted/40 rounded px-2.5 py-1.5 border border-border/50">
                {diagnosis.detail}
              </div>

              <div className="flex items-start gap-1.5 text-muted-foreground">
                <Wrench className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="font-semibold text-foreground">How to fix:</strong> {diagnosis.fix}
                </span>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
});
RecentEventRow.displayName = "RecentEventRow";

export const McpRecentRequestsTable: React.FC<McpRecentRequestsTableProps> = React.memo(({ events }) => {
  const [filter, setFilter] = useState<EventFilter>("all");
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((evt) => {
      if (filter === "tools" && evt.rpcMethod !== "tools/call") return false;
      if (filter === "errors" && evt.outcome === "success") return false;
      if (!q) return true;
      const haystack = [
        evt.id,
        evt.rpcMethod,
        evt.toolName || "",
        evt.keyPrefix || "",
        evt.keyName || "",
        evt.clientName || "",
        evt.errorClass || "",
        evt.errorMessage || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [events, filter, query]);

  const errorEventsCount = useMemo(
    () => events.filter((evt) => evt.outcome !== "success").length,
    [events],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-bold">Recent MCP Requests</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Latest {events.length} recorded requests for this project
                {errorEventsCount > 0 ? " · Click any failed row for details & fix hints" : ""}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-0.5 text-[11px]">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "tools", label: "Tool Calls" },
                  { id: "errors", label: "Errors" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filter === opt.id
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter tool or key..."
                className="h-7 pl-8 text-xs"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            {events.length === 0
              ? "No MCP requests have been recorded yet in this time range."
              : "No requests match your current filter."}
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[620px] text-left text-xs border-collapse">
              <thead className="bg-muted/60 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">Method / Tool</th>
                  <th className="py-2.5 px-4">Key</th>
                  <th className="py-2.5 px-4">Outcome</th>
                  <th className="py-2.5 px-4 text-right">Latency</th>
                  <th className="py-2.5 px-4 text-right">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEvents.map((evt) => (
                  <RecentEventRow
                    key={evt.id}
                    event={evt}
                    expanded={Boolean(expandedIds[evt.id])}
                    onToggleExpand={toggleExpand}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
McpRecentRequestsTable.displayName = "McpRecentRequestsTable";
