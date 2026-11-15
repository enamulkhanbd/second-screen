"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { McpAnalyticsRange, McpTimelineBucket } from "@/lib/mcp/observability";
import { formatBucketLabel, formatDurationMs } from "./formatters";

type McpUsageChartProps = {
  timeline: McpTimelineBucket[];
  range: McpAnalyticsRange;
};

export const McpUsageChart: React.FC<McpUsageChartProps> = React.memo(({ timeline, range }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxTotal = useMemo(() => {
    let max = 0;
    for (const bucket of timeline) {
      if (bucket.total > max) max = bucket.total;
    }
    return Math.max(1, max);
  }, [timeline]);

  const activeBucket = useMemo(() => {
    if (hoveredIndex !== null && timeline[hoveredIndex]) {
      return timeline[hoveredIndex];
    }
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      if (timeline[i].total > 0) return timeline[i];
    }
    return timeline[timeline.length - 1] ?? null;
  }, [hoveredIndex, timeline]);

  const labelStep = useMemo(() => {
    if (timeline.length <= 8) return 1;
    if (timeline.length <= 16) return 3;
    return Math.max(1, Math.ceil(timeline.length / 6));
  }, [timeline.length]);

  const midTick = Math.ceil(maxTotal / 2);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold">Request Volume & Outcomes</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {range === "24h" ? "Hourly MCP traffic over the last 24 hours" : `Daily MCP traffic over the last ${range === "7d" ? "7 days" : "30 days"}`}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-sm bg-emerald-500" />
              <span>Success</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-sm bg-rose-500" />
              <span>Errors</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-sm bg-amber-500" />
              <span>Rate Limited</span>
            </span>
          </div>
        </div>

        {activeBucket ? (
          <div className="mt-2 rounded-lg border border-border bg-muted/35 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="font-medium text-foreground">
              {hoveredIndex !== null ? "Bucket" : "Latest active"}:{" "}
              <span className="font-mono">{formatBucketLabel(activeBucket.bucketStart, range)}</span>
            </span>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <span className="text-foreground">{activeBucket.total} req</span>
              <span className="text-emerald-600 dark:text-emerald-400">{activeBucket.success} ok</span>
              <span className="text-rose-600 dark:text-rose-400">{activeBucket.errors} err</span>
              {activeBucket.rateLimited > 0 ? (
                <span className="text-amber-600 dark:text-amber-400">{activeBucket.rateLimited} 429</span>
              ) : null}
              <span className="text-muted-foreground">{formatDurationMs(activeBucket.avgDurationMs)} avg</span>
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        {timeline.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
            No timeline buckets available for this period.
          </div>
        ) : (
          <div className="flex gap-2.5 items-stretch">
            {/* Y-axis scale */}
            <div className="flex flex-col justify-between text-[10px] font-mono text-muted-foreground py-1 pb-6 select-none text-right min-w-[28px]">
              <span>{maxTotal}</span>
              <span>{midTick}</span>
              <span>0</span>
            </div>

            {/* Plot area */}
            <div className="flex-1 min-w-0">
              <div className="relative h-40 border-b border-border flex items-end gap-[2px] sm:gap-1 px-0.5">
                {/* Horizontal gridlines */}
                <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border/60" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border/60" />

                {timeline.map((bucket, idx) => {
                  const totalPct = bucket.total > 0 ? Math.max(4, (bucket.total / maxTotal) * 100) : 0;
                  const successPct = bucket.total > 0 ? (bucket.success / bucket.total) * 100 : 0;
                  const errorPct = bucket.total > 0 ? (bucket.errors / bucket.total) * 100 : 0;
                  const ratePct = bucket.total > 0 ? (bucket.rateLimited / bucket.total) * 100 : 0;
                  const isHovered = hoveredIndex === idx;

                  return (
                    <button
                      key={bucket.bucketStart}
                      type="button"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onFocus={() => setHoveredIndex(idx)}
                      onBlur={() => setHoveredIndex(null)}
                      aria-label={`${formatBucketLabel(bucket.bucketStart, range)}: ${bucket.total} requests, ${bucket.success} success, ${bucket.errors} errors`}
                      className={`group relative flex-1 h-full flex flex-col justify-end items-center rounded-t transition-colors focus:outline-none ${
                        isHovered ? "bg-muted/50" : "hover:bg-muted/30"
                      }`}
                    >
                      {bucket.total > 0 ? (
                        <div
                          className="w-full max-w-[22px] rounded-t-sm overflow-hidden flex flex-col-reverse transition-all"
                          style={{ height: `${totalPct}%` }}
                        >
                          {bucket.success > 0 ? (
                            <div
                              className="w-full bg-emerald-500/90 group-hover:bg-emerald-500"
                              style={{ height: `${successPct}%`, minHeight: "2px" }}
                            />
                          ) : null}
                          {bucket.errors > 0 ? (
                            <div
                              className="w-full bg-rose-500/90 group-hover:bg-rose-500"
                              style={{ height: `${errorPct}%`, minHeight: "2px" }}
                            />
                          ) : null}
                          {bucket.rateLimited > 0 ? (
                            <div
                              className="w-full bg-amber-500/90 group-hover:bg-amber-500"
                              style={{ height: `${ratePct}%`, minHeight: "2px" }}
                            />
                          ) : null}
                        </div>
                      ) : (
                        <div className="w-full max-w-[22px] h-[2px] bg-border/60 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="flex items-center gap-[2px] sm:gap-1 pt-1.5 h-6 overflow-hidden">
                {timeline.map((bucket, idx) => {
                  const showLabel = idx === 0 || idx === timeline.length - 1 || idx % labelStep === 0;
                  return (
                    <div
                      key={`${bucket.bucketStart}-label`}
                      className="flex-1 min-w-0 text-center text-[10px] font-mono text-muted-foreground truncate"
                    >
                      {showLabel ? formatBucketLabel(bucket.bucketStart, range) : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
McpUsageChart.displayName = "McpUsageChart";
