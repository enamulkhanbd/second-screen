import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type WorkspaceSkeletonVariant = "cards" | "documentation" | "form" | "list" | "table";

interface WorkspaceSkeletonProps {
  variant?: WorkspaceSkeletonVariant;
}

const widths = ["w-24", "w-40", "w-32", "w-48", "w-28", "w-36"];

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
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-6 py-8">
        <PageHeaderSkeleton withSearch />
        <div className="flex gap-2 overflow-hidden">
          {["w-16", "w-20", "w-24", "w-28"].map((width) => (
            <Skeleton key={width} className={`h-8 shrink-0 ${width}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
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
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-6 py-8">
        <PageHeaderSkeleton withSearch />
        <div className="overflow-hidden rounded-lg border border-border">
          {Array.from({ length: 8 }, (_, index) => (
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

function TokenTableSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex min-h-[57px] items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="h-7 w-7 shrink-0" />
          <Skeleton className="h-7 w-48 max-w-[40vw]" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-10" />
            <col className="w-[26%]" />
            <col className="w-[10%]" />
            <col className="w-[20%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            <col className="w-10" />
          </colgroup>
          <thead className="border-b border-border bg-background">
            <tr>
              {Array.from({ length: 7 }, (_, index) => (
                <th key={index} className="border-r border-border/30 px-4 py-3 last:border-r-0">
                  <Skeleton className="h-3 w-12" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 9 }, (_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border/30">
                <td className="border-r border-border/30 px-3 py-3"><Skeleton className="mx-auto h-3.5 w-3.5" /></td>
                <td className="border-r border-border/30 px-4 py-3"><Skeleton className={`h-3 ${widths[rowIndex % widths.length]}`} /></td>
                <td className="border-r border-border/30 px-4 py-3"><Skeleton className="h-3 w-12" /></td>
                <td className="border-r border-border/30 px-4 py-3"><Skeleton className="h-3 w-4/5" /></td>
                <td className="border-r border-border/30 px-4 py-3"><Skeleton className="h-3 w-3/5" /></td>
                <td className="border-r border-border/30 px-4 py-3"><Skeleton className="h-3 w-4/5" /></td>
                <td className="px-3 py-3"><Skeleton className="mx-auto h-5 w-5" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentationSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 bg-background">
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
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8">
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