"use client";

import React, { useState, useMemo } from "react";
import { SCHEMA_CATALOG, SchemaCategory, SchemaItem } from "@/data/schemaCatalog";
import { useTokenStore } from "@/store/useTokenStore";
import { ArrowLeft, Search, Check, Plus, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExtensionDetailModal } from "@/components/ExtensionDetailModal";

interface ExtensionMarketplaceModalProps {
  onBack: () => void;
}

export const ExtensionMarketplaceModal: React.FC<ExtensionMarketplaceModalProps> = ({ onBack }) => {
  const { enabledSchemas, toggleSchemaAction, canUserEdit } = useTokenStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | SchemaCategory>("all");
  const [inspectingItem, setInspectingItem] = useState<SchemaItem | null>(null);

  const isEditable = canUserEdit();

  // Category counts
  const counts = useMemo(() => {
    return {
      all: SCHEMA_CATALOG.length,
      core: SCHEMA_CATALOG.filter((s) => s.category === "core").length,
      colorSpaces: SCHEMA_CATALOG.filter((s) => s.category === "color-spaces").length,
      functions: SCHEMA_CATALOG.filter((s) => s.category === "functions").length,
    };
  }, []);

  // Filtered list
  const filteredItems = useMemo(() => {
    let list = SCHEMA_CATALOG;
    if (activeTab !== "all") {
      list = list.filter((item) => item.category === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, searchQuery]);

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "Color Space":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40";
      case "Function":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Top Header */}
      <div className="p-6 pb-4 border-b border-border bg-card/40 shrink-0">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-3 cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Extensions</span>
        </button>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Extension Marketplace
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Browse and add color spaces, functions, and utilities to your project.
        </p>

        {/* Search Bar */}
        <div className="mt-4 relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-xs bg-muted/40 border-border rounded-lg"
          />
        </div>

        {/* Filter Pills (Matches Screenshot 2) */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeTab === "all"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>All</span>
            <span className="text-[11px] opacity-70">
              {counts.all > 99 ? "99+" : counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("color-spaces")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeTab === "color-spaces"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>Color Spaces</span>
            <span className="text-[11px] opacity-70">{counts.colorSpaces}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("functions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeTab === "functions"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>Functions</span>
            <span className="text-[11px] opacity-70">{counts.functions}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("core")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeTab === "core"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>Core & Utilities</span>
            <span className="text-[11px] opacity-70">{counts.core}</span>
          </button>
        </div>
      </div>

      {/* Items List (Matches Screenshot 2 layout) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2.5 max-w-4xl">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Layers className="size-10 mx-auto opacity-30 mb-3" />
            <p className="text-sm font-medium">No extensions found</p>
            <p className="text-xs opacity-70 mt-1">Try adjusting your search or category filter</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isEnabled = enabledSchemas.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => setInspectingItem(item)}
                className="group p-4 rounded-xl border border-border bg-card/50 hover:bg-muted/40 hover:border-border/80 transition-all cursor-pointer flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-2 py-0.2 font-medium rounded-full border ${getTagColor(
                        item.typeTag
                      )}`}
                    >
                      {item.typeTag}
                    </Badge>
                    {isEnabled && (
                      <Badge
                        variant="outline"
                        className="text-[11px] px-2 py-0.2 font-medium rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50"
                      >
                        Enabled
                      </Badge>
                    )}
                  </div>

                  {isEditable && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSchemaAction(item.id);
                      }}
                    >
                      {isEnabled ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          Disable
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs font-medium border-border hover:border-primary hover:bg-primary/10 hover:text-primary"
                        >
                          <Plus className="size-3 mr-1" />
                          Enable
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {item.description || "No description provided."}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Inspector Detail Dialog */}
      <ExtensionDetailModal
        item={inspectingItem}
        isOpen={Boolean(inspectingItem)}
        onClose={() => setInspectingItem(null)}
      />
    </div>
  );
};
