"use client";

import React from "react";
import { ProjectDocumentation } from "@/types/documentation";
import { useTokenStore } from "@/store/useTokenStore";
import {
  BookOpen,
  Folder,
  FileText,
  Palette,
  Type,
  Layers,
  Sparkles,
  ExternalLink,
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
    useTokenStore();
  const [copiedLink, setCopiedLink] = React.useState(false);

  const pages = documentation.pages || [];
  const folders = documentation.folders || [];

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/docs/${currentOrg?.slug || currentOrg?.id || "org"}/${
          currentProject?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "project"
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
    <div className="flex-1 overflow-y-auto bg-background/50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Welcome Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-card to-background p-8 md:p-12 shadow-sm">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Living Design Documentation
              </Badge>
              {documentation.isPublishedGlobally ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs">
                  <Globe className="mr-1 h-3 w-3" /> Live Public Access
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Draft Mode
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {currentProject?.name || "Design System"} Living Docs
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Synchronized, multi-mode design tokens and Figma variables rendered as interactive,
              living design guidelines.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenPublishModal}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span>Publish Settings</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span>Copy Public Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-xs">
            <div className="text-xs text-muted-foreground">Documented Pages</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">{pages.length}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-xs">
            <div className="text-xs text-muted-foreground">Sections & Folders</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">{folders.length}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-xs">
            <div className="text-xs text-muted-foreground">Connected Variables</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-primary">
              {figmaResolvedVariables.length}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-xs">
            <div className="text-xs text-muted-foreground">Design Tokens</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {resolvedTokens.length}
            </div>
          </div>
        </div>

        {/* Sections & Pages Elements Directory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Documentation Directory</h2>
            <span className="text-xs text-muted-foreground">{pages.length} Pages Available</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => {
              const folder = folders.find((f) => f.id === page.folderId);
              const isColorPage = page.title.toLowerCase().includes("color");
              const isTypePage = page.title.toLowerCase().includes("type");
              const isTokensPage = page.title.toLowerCase().includes("token");
              const isSchemaPage = page.title.toLowerCase().includes("schema");

              return (
                <div
                  key={page.id}
                  onClick={() => onSelectPage(page.id)}
                  className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-border/70 bg-card/60 p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                        {isColorPage ? (
                          <Palette className="h-4 w-4" />
                        ) : isTypePage ? (
                          <Type className="h-4 w-4" />
                        ) : isTokensPage ? (
                          <Layers className="h-4 w-4" />
                        ) : isSchemaPage ? (
                          <Sparkles className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {page.blocks.length} block{page.blocks.length === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-primary/80">
                        {folder ? folder.title : "General"}
                      </div>
                      <h3 className="mt-0.5 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {page.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {page.description || "Living design system element guidelines."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    <span>View Page</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
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
