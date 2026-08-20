"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  compileCssVariables,
  compileStyleDictionary,
  ReleasePackage,
} from "@/utils/releaseCompiler";
import {
  Package,
  CheckCircle2,
  FileCode2,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CreateReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateReleaseModal: React.FC<CreateReleaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    resolvedTokens,
    themeGroups,
    rawTokens,
    credentials,
    releases,
    createRelease,
    addToast,
  } = useTokenStore();

  const latestRelease = releases[0];
  const defaultVersion = latestRelease
    ? bumpSemVer(latestRelease.version, "patch")
    : "v0.1.0";

  const [version, setVersion] = useState(defaultVersion);
  const [title, setTitle] = useState("Design Tokens Production Release");
  const [notes, setNotes] = useState(
    "Automated production build including CSS Variables, Style Dictionary transforms, and multi-theme definitions."
  );
  const [includeCss, setIncludeCss] = useState(true);
  const [includeStyleDict, setIncludeStyleDict] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);

  function bumpSemVer(ver: string, type: "major" | "minor" | "patch"): string {
    const clean = ver.replace(/^v/, "");
    const parts = clean.split(".").map((n) => parseInt(n) || 0);
    while (parts.length < 3) parts.push(0);

    if (type === "major") {
      parts[0] += 1;
      parts[1] = 0;
      parts[2] = 0;
    } else if (type === "minor") {
      parts[1] += 1;
      parts[2] = 0;
    } else {
      parts[2] += 1;
    }
    return `v${parts.join(".")}`;
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim()) return;

    setIsCompiling(true);

    try {
      // 1. Compile CSS Variables
      const cssVars = compileCssVariables(resolvedTokens, themeGroups, rawTokens);

      // 2. Compile Style Dictionary Multi-Platform Artifacts
      const styleDict = compileStyleDictionary(resolvedTokens, themeGroups);

      const targetSystems: string[] = [];
      if (includeCss) targetSystems.push("CSS Variables (:root & Themes)");
      if (includeStyleDict) targetSystems.push("Style Dictionary (Web, Tailwind, iOS, Android)");

      const newRelease: ReleasePackage = {
        id: `rel-${Date.now()}`,
        version: version.startsWith("v") ? version : `v${version}`,
        title: title.trim() || `Release ${version}`,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        commitHash: credentials.branch ? `git@${credentials.branch}` : undefined,
        branch: credentials.branch || undefined,
        tokenCount: resolvedTokens.length,
        themesCount: themeGroups.reduce((acc, g) => acc + g.options.length, 0),
        targetSystems,
        cssVariables: cssVars,
        styleDictionary: styleDict,
      };

      createRelease(newRelease);

      addToast({
        type: "success",
        title: "Release Created Successfully",
        message: `Version ${newRelease.version} compiled with ${resolvedTokens.length} tokens.`,
      });

      onClose();
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Compilation Failed",
        message: err.message || "Failed to compile design tokens release.",
      });
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Create New Release</DialogTitle>
              <DialogDescription className="text-xs">
                Package design tokens into production CSS variables & Style Dictionary builds
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handlePublish} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Version and SemVer Helper */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="rel-ver">Semantic Version</Label>
              <div className="flex items-center gap-1.5">
                {(["patch", "minor", "major"] as const).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setVersion(bumpSemVer(version, type))}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-accent text-[10px] font-mono font-medium text-foreground transition-colors"
                  >
                    +{type}
                  </button>
                ))}
              </div>
            </div>
            <Input
              id="rel-ver"
              type="text"
              required
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v1.0.0"
              className="font-mono text-xs"
            />
          </div>

          {/* Release Title */}
          <div className="space-y-1.5">
            <Label htmlFor="rel-title">Release Title</Label>
            <Input
              id="rel-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Brand Refresh, Design Tokens v1.2"
              className="text-xs"
            />
          </div>

          {/* Release Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="rel-notes">Release Notes / Changelog</Label>
            <textarea
              id="rel-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summary of changes, new tokens, modified themes..."
              className="w-full p-2.5 rounded-md border border-input bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
            />
          </div>

          {/* Compile Scope */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label>Compilation Targets</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-semibold text-foreground">CSS Variables</div>
                    <div className="text-[10px] text-muted-foreground">:root & theme classes</div>
                  </div>
                </div>
                <Switch checked={includeCss} onCheckedChange={setIncludeCss} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-semibold text-foreground">Style Dictionary</div>
                    <div className="text-[10px] text-muted-foreground">Web, iOS, Android tokens</div>
                  </div>
                </div>
                <Switch checked={includeStyleDict} onCheckedChange={setIncludeStyleDict} />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isCompiling || !version.trim()}
              className="gap-1.5"
            >
              <span>{isCompiling ? "Compiling..." : "Build & Publish"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
