import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type WorkspaceSkeletonVariant = "cards" | "documentation" | "form" | "list" | "table";

interface WorkspaceSkeletonProps {
  variant?: WorkspaceSkeletonVariant;
}

const widths = ["w-24", "w-40", "w-32", "w-48", "w-28", "w-36"];

/**
 * Returns how many skeleton rows are needed to fill the current viewport so
 * full-page table skeletons never leave blank space below the last row.
 */
function useViewportSkeletonRows(minRows: number, rowHeight: number, chromeHeight: number) {
  const [rows, setRows] = React.useState(minRows);

  React.useEffect(() => {
    const update = () => {
      const available = window.innerHeight - chromeHeight;
      // +2 buffer rows so fractional rows are covered; overflow-hidden clips the excess.
      setRows(Math.max(minRows, Math.ceil(available / rowHeight) + 2));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [minRows, rowHeight, chromeHeight]);

  return rows;
}

function PageHeaderSkeleton({ withSearch = false }: { withSearch?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      {withSearch && <Skeleton className="h-9 w-full" />}
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="h-full w-full flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-[960px] flex-col gap-6 px-6 py-8">
        <PageHeaderSkeleton withSearch />
        <div className="flex gap-2 overflow-hidden">
          {["w-16", "w-20", "w-24", "w-28"].map((width) => (
            <Skeleton key={width} className={`h-8 shrink-0 ${width}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-5 w-10" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="h-full w-full flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-[960px] flex-col gap-6 px-6 py-8">
        <PageHeaderSkeleton withSearch />
        <div className="overflow-hidden rounded-lg border border-border">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className={`h-3 ${widths[index % widths.length]}`} />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-6 w-16 shrink-0" />
              <Skeleton className="h-7 w-7 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudioTableBodySkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden motion-safe:animate-pulse">
      <div className="flex h-9 items-center gap-4 border-b border-border bg-muted/20 px-4">
        <div className="h-3 w-3.5 rounded-xs bg-muted shrink-0" />
        <div className="h-2.5 w-28 rounded-sm bg-muted" />
        <div className="h-2.5 w-14 rounded-sm bg-muted" />
        <div className="h-2.5 w-24 rounded-sm bg-muted" />
        <div className="h-2.5 w-28 rounded-sm bg-muted" />
        <div className="h-2.5 w-32 rounded-sm bg-muted hidden md:block" />
      </div>
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex h-10 items-center gap-4 px-4">
            <div className="h-3.5 w-3.5 rounded-xs bg-muted/70 shrink-0" />
            <div className={`h-3 rounded-sm bg-muted/80 ${widths[rowIndex % widths.length]}`} />
            <div className="h-4 w-14 rounded-md bg-muted/60 shrink-0" />
            <div className="flex items-center gap-2 w-40 shrink-0">
              <div className="h-3.5 w-3.5 rounded-full bg-muted/80 shrink-0" />
              <div className="h-3 w-24 rounded-sm bg-muted/70" />
            </div>
            <div className="h-3 w-28 rounded-sm bg-muted/60 shrink-0" />
            <div className="h-3 flex-1 max-w-[220px] rounded-sm bg-muted/50 hidden md:block" />
            <div className="ml-auto h-4 w-4 rounded-sm bg-muted/60 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenTableSkeleton() {
  return (
    <div className="flex h-full w-full min-h-0 flex-1 flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4 motion-safe:animate-pulse">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-5 w-36 rounded-md bg-muted" />
          <div className="h-4 w-14 rounded-full bg-muted/70" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-24 rounded-md bg-muted/70" />
          <div className="h-7 w-20 rounded-md bg-muted" />
        </div>
      </div>
      <StudioTableBodySkeleton rows={12} />
    </div>
  );
}

function DocumentationSkeleton() {
  return (
    <div className="flex h-full w-full min-h-0 flex-1 bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border p-4 lg:block">
        <Skeleton className="mb-5 h-8 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className={`h-4 ${index % 3 === 0 ? "w-4/5" : "w-full"}`} />
          ))}
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-3xl space-y-7">
          <PageHeaderSkeleton />
          <Skeleton className="h-40 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </main>
      <aside className="hidden w-72 shrink-0 border-l border-border p-5 xl:block">
        <Skeleton className="h-5 w-24" />
        <div className="mt-5 space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </aside>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="h-full w-full flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-6 py-8">
        <PageHeaderSkeleton />
        <div className="space-y-6 rounded-lg border border-border p-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceSkeleton({ variant = "form" }: WorkspaceSkeletonProps) {
  switch (variant) {
    case "cards":
      return <CardGridSkeleton />;
    case "documentation":
      return <DocumentationSkeleton />;
    case "list":
      return <ListSkeleton />;
    case "table":
      return <TokenTableSkeleton />;
    default:
      return <FormSkeleton />;
  }
}