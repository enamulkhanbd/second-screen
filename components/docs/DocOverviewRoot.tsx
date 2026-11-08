"use client";

import React from "react";
import { buttonProps } from "@/utils/a11y";
import { ProjectDocumentation } from "@/types/documentation";
import { useTokenStore } from "@/store/useTokenStore";
import { useShallow } from "zustand/react/shallow";
import {
  BookOpen,
  FileText,
  Palette,
  Type,
  Layers,
  Copy,
  Check,
  Globe,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DocOverviewRootProps {
  documentation: ProjectDocumentation;
  onSelectPage: (pageId: string) => void;
  onOpenPublishModal: () => void;
}

export const DocOverviewRoot: React.FC<DocOverviewRootProps> = ({
  documentation,
  onSelectPage,
  onOpenPublishModal,
}) => {
  const { currentProject, currentOrg, figmaResolvedVariables, resolvedTokens, addToast } =
    useTokenStore(
      useShallow((s) => ({
        currentProject: s.currentProject,
        currentOrg: s.currentOrg,
        figmaResolvedVariables: s.figmaResolvedVariables,
        resolvedTokens: s.resolvedTokens,
        addToast: s.addToast,
      }))
    );
  const [copiedLink, setCopiedLink] = React.useState(false);

  const pages = documentation.pages || [];
  const folders = documentation.folders || [];

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/docs/${currentOrg?.slug || currentOrg?.id || "org"}/${
          currentProject?.slug ||
          currentProject?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
          "project"
        }`
      : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    addToast({
      type: "success",
      title: "Public Link Copied",
      message: "Documentation URL copied to clipboard.",
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Studio Documentation Header */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                /{currentOrg?.slug || "workspace"}/{currentProject?.slug || "project"}/docs
              </span>
              {documentation.isPublishedGlobally ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                  <Globe className="mr-1 h-3 w-3" /> Published
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Draft
                </Badge>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {currentProject?.name || "Design System"} Documentation
            </h1>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Synchronized design tokens and Figma variables rendered as living reference pages.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? "Copied URL" : "Copy public URL"}</span>
            </button>
            <button
              type="button"
              onClick={onOpenPublishModal}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Publish settings</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 tabular-nums">
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-2xs flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Pages</span>
            <span className="text-base font-semibold font-mono text-foreground">{pages.length}</span>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-2xs flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Folders</span>
            <span className="text-base font-semibold font-mono text-foreground">{folders.length}</span>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-2xs flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Figma variables</span>
            <span className="text-base font-semibold font-mono text-foreground">
              {figmaResolvedVariables.length}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-2xs flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Design tokens</span>
            <span className="text-base font-semibold font-mono text-foreground">
              {resolvedTokens.length}
            </span>
          </div>
        </div>

        {/* Sections & Pages Directory */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Pages</h2>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">{pages.length} total</span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => {
              const folder = folders.find((f) => f.id === page.folderId);
              const isColorPage = page.title.toLowerCase().includes("color");
              const isTypePage = page.title.toLowerCase().includes("type");
              const isTokensPage = page.title.toLowerCase().includes("token");
              const isSchemaPage = page.title.toLowerCase().includes("schema");

              return (
                <div
                  key={page.id}
                  {...buttonProps(() => onSelectPage(page.id))}
                  className="group flex cursor-pointer flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs transition-colors hover:bg-muted/35 hover:border-border/90"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                        {isColorPage ? (
                          <Palette className="h-4 w-4" />
                        ) : isTypePage ? (
                          <Type className="h-4 w-4" />
                        ) : isTokensPage ? (
                          <Layers className="h-4 w-4" />
                        ) : isSchemaPage ? (
                          <BookOpen className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono tabular-nums">
                        {page.blocks.length} {page.blocks.length === 1 ? "block" : "blocks"}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground">
                        {folder ? folder.title : "General"}
                      </div>
                      <h3 className="mt-0.5 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {page.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {page.description || "Design token reference page."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    <span>Open page</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
