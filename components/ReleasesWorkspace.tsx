"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ReleasesListView } from "@/components/releases/ReleasesListView";
import { ReleaseDetailView } from "@/components/releases/ReleaseDetailView";
import { NewReleaseView } from "@/components/releases/NewReleaseView";

export const ReleasesWorkspace: React.FC = () => {
  const { releases, activeReleaseId, setActiveReleaseId } = useTokenStore();
  const [viewMode, setViewMode] = useState<"list" | "detail" | "new">("list");

  const activeRelease = releases.find((r) => r.id === activeReleaseId) || releases[0] || null;

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-background font-sans overflow-hidden select-none">
      {viewMode === "list" && (
        <ReleasesListView
          onSelectRelease={(id) => {
            setActiveReleaseId(id);
            setViewMode("detail");
          }}
          onCreateRelease={() => setViewMode("new")}
        />
      )}

      {viewMode === "detail" && (
        activeRelease ? (
          <ReleaseDetailView
            release={activeRelease}
            onBack={() => setViewMode("list")}
          />
        ) : (
          <ReleasesListView
            onSelectRelease={(id) => {
              setActiveReleaseId(id);
              setViewMode("detail");
            }}
            onCreateRelease={() => setViewMode("new")}
          />
        )
      )}

      {viewMode === "new" && (
        <NewReleaseView
          onCancel={() => setViewMode("list")}
          onPublished={(newId) => {
            setActiveReleaseId(newId);
            setViewMode("detail");
          }}
        />
      )}
    </div>
  );
};
