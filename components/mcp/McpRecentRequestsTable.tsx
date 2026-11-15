"use client";

import React, { useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const RecentEventRow: React.FC<{ event: McpRecentEvent }> = React.memo(({ event }) => {
  return (
    <tr className="hover:bg-muted/40 transition-colors">
      <td
        className="py-2.5 px-4 text-muted-foreground whitespace-nowrap font-sans text-[11px]"
        title={new Date(event.createdAt).toLocaleString()}
      >
        {formatRelativeTime(event.createdAt)}
      </td>
      <td className="py-2.5 px-4">
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
      </td>
      <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
        {event.keyPrefix || "—"}
      </td>
      <td className="py-2.5 px-4 whitespace-nowrap">
        <OutcomeBadge outcome={event.outcome} statusCode={event.statusCode} errorClass={event.errorClass} />
      </td>
      <td className="py-2.5 px-4 text-right font-mono text-[11px] text-foreground whitespace-nowrap">
        {formatDurationMs(event.durationMs)}
      </td>
      <td className="py-2.5 px-4 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
        {formatBytes(event.responseBytes)}
      </td>
    </tr>
  );
});
RecentEventRow.displayName = "RecentEventRow";

export const McpRecentRequestsTable: React.FC<McpRecentRequestsTableProps> = React.memo(({ events }) => {
  const [filter, setFilter] = useState<EventFilter>("all");
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((evt) => {
      if (filter === "tools" && evt.rpcMethod !== "tools/call") return false;
      if (filter === "errors" && evt.outcome === "success") return false;
      if (!q) return true;
      const haystack = [
        evt.rpcMethod,
        evt.toolName || "",
        evt.keyPrefix || "",
        evt.keyName || "",
        evt.clientName || "",
        evt.errorClass || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [events, filter, query]);

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
                  <RecentEventRow key={evt.id} event={evt} />
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
