"use client";

import { AssetCollection } from "@/types/tenant";

interface AssetCollectionsNavProps {
  collections: AssetCollection[];
  counts: Map<string, number>;
  activeId: string | null;
  totalCount: number;
  onSelect: (id: string | null) => void;
}

export function AssetCollectionsNav({
  collections,
  counts,
  activeId,
  totalCount,
  onSelect,
}: AssetCollectionsNavProps) {
  return (
    <nav aria-label="Asset collections" className="flex items-center gap-2 overflow-x-auto border-b border-border px-6 py-2">
      <button
        type="button"
        aria-pressed={activeId === null}
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          activeId === null
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        All Assets <span className="ml-1 font-mono opacity-70">{totalCount}</span>
      </button>
      {collections.map((collection) => (
        <button
          key={collection.id}
          type="button"
          aria-pressed={activeId === collection.id}
          onClick={() => onSelect(collection.id)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            activeId === collection.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {collection.name}
          <span className="ml-1 font-mono opacity-70">{counts.get(collection.id) || 0}</span>
        </button>
      ))}
    </nav>
  );
}
