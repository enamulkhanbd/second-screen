"use client";

import React, { useState } from "react";
import { ProjectDocumentation } from "@/types/documentation";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Globe,
  Lock,
  Copy,
  Check,
  ExternalLink,
  X,
  FileCheck,
  FileX,
  Sparkles,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface DocPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentation: ProjectDocumentation;
  onPublishGlobally: (published: boolean, allowPublic?: boolean) => void;
  onPublishPage: (pageId: string, published: boolean) => void;
}

export const DocPublishModal: React.FC<DocPublishModalProps> = ({
  isOpen,
  onClose,
  documentation,
  onPublishGlobally,
  onPublishPage,
}) => {
  const { currentOrg, currentProject, addToast } = useTokenStore();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const orgSlug =
    currentOrg?.slug ||
    currentOrg?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
    "org";
  const projectSlug =
    documentation.publishedUrlSlug ||
    currentProject?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
    "project";

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/docs/${orgSlug}/${projectSlug}`
      : `/docs/${orgSlug}/${projectSlug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    addToast({
      type: "success",
      title: "URL Copied",
      message: "Public documentation link copied.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Publish Documentation</h3>
              <p className="text-xs text-muted-foreground">
                Control public site access and individual page visibility
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Global Publish Switch */}
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Live Public Site</span>
              <Badge
                variant={documentation.isPublishedGlobally ? "default" : "secondary"}
                className="text-[10px]"
              >
                {documentation.isPublishedGlobally ? "Online" : "Private"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Make living documentation accessible via public shareable URL
            </p>
          </div>
          <Switch
            checked={documentation.isPublishedGlobally}
            onCheckedChange={(checked) => onPublishGlobally(checked)}
          />
        </div>

        {/* Shareable URL Box */}
        {documentation.isPublishedGlobally && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Public Documentation URL</label>
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 p-2 text-xs">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full bg-transparent font-mono text-xs text-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center rounded-lg border border-border/70 p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Page by Page Visibility Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Page Visibility</label>
            <span className="text-[11px] text-muted-foreground">
              {documentation.pages.filter((p) => p.isPublished).length} of{" "}
              {documentation.pages.length} published
            </span>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border/70 bg-background/50 p-1">
            {documentation.pages.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/30"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {p.isPublished ? (
                    <FileCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <FileX className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate font-medium text-foreground">{p.title}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {p.isPublished ? "Visible" : "Hidden"}
                  </span>
                  <Switch
                    checked={p.isPublished}
                    onCheckedChange={(checked) => onPublishPage(p.id, checked)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
