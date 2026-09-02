"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  compileCssVariables,
  compileStyleDictionary,
} from "@/utils/releaseCompiler";
import { ReleasePackage } from "@/types/tokens";
import {
  Package,
  CheckCircle2,
  Layers,
  ArrowRight,
  FolderGit2,
  Sparkles,
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
import { Badge } from "@/components/ui/badge";

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
    releases,
    distributionTargets,
    compilerConfig,
    createRelease,
    publishReleaseToTargets,
    addToast,
  } = useTokenStore();

  const latestRelease = releases[0];
  const defaultVersion = latestRelease
    ? bumpSemVer(latestRelease.version, "patch")
    : "v1.0.0";

  const [version, setVersion] = useState(defaultVersion);
  const [title, setTitle] = useState("Design Tokens Production Release");
  const [notes, setNotes] = useState(
    "Automated production build including Tailwind CSS, CSS Variables, SCSS, React TypeScript, Flutter Dart, and iOS/Android assets."
  );
  const [publishImmediately, setPublishImmediately] = useState(false);
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
      const cssVars = compileCssVariables(resolvedTokens, themeGroups, compilerConfig);

      // 2. Compile Multi-Platform Style Dictionary, Flutter Dart, React TS
      const styleDict = compileStyleDictionary(resolvedTokens, themeGroups, compilerConfig);

      const targetSystems = [
        "Tailwind CSS",
        "CSS Variables (:root & Themes)",
        "SCSS Variables",
        "React / TypeScript",
        "Flutter (Dart)",
        "iOS (Swift)",
        "Android (XML)",
      ];

      const newRelease: ReleasePackage = {
        id: `rel-${Date.now()}`,
        version: version.startsWith("v") ? version : `v${version}`,
        title: title.trim() || `Release ${version}`,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        tokenCount: resolvedTokens.length,
        themesCount: themeGroups.reduce((acc, g) => acc + g.options.length, 0),
        targetSystems,
        compilerConfig,
        cssVariables: cssVars,
        styleDictionary: styleDict,
      };

      createRelease(newRelease);

      if (publishImmediately && distributionTargets.length > 0) {
        addToast({
          type: "info",
          title: "Distributing to Target Repositories...",
          message: `Publishing ${newRelease.version} to ${distributionTargets.length} destinations.`,
        });
        publishReleaseToTargets(newRelease.id).catch((err) => {
          addToast({
            type: "error",
            title: "Distribution Error",
            message: err.message,
          });
        });
      }

      addToast({
        type: "success",
        title: "Release Created Successfully",
        message: `Version ${newRelease.version} compiled with ${resolvedTokens.length} tokens across all platforms.`,
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden font-sans">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Create Multi-Platform Release</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Compile active tokens into Tailwind, CSS, React, Flutter, Swift, and Android formats.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <form onSubmit={handlePublish} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Version & SemVer Bumps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Semantic Version</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() =>
                      setVersion(bumpSemVer(latestRelease?.version || "v0.0.0", "patch"))
                    }
                  >
                    +Patch
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() =>
                      setVersion(bumpSemVer(latestRelease?.version || "v0.0.0", "minor"))
                    }
                  >
                    +Minor
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() =>
                      setVersion(bumpSemVer(latestRelease?.version || "v0.0.0", "major"))
                    }
                  >
                    +Major
                  </Button>
                </div>
              </div>
              <Input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="h-8 text-xs font-mono font-bold"
                required
              />
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Release Title</Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Brand Refresh & Multi-Theme Update"
                className="h-8 text-xs"
                required
              />
            </div>

            {/* Notes / Changelog */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Release Notes / Changelog</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe key token changes, color updates, or typography shifts..."
                className="w-full h-20 p-2.5 rounded-md border border-input bg-background text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-sans"
              />
            </div>

            {/* Platform Summary Pill List */}
            <div className="space-y-2 p-3 bg-muted/40 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Compiled Platforms Included</span>
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {resolvedTokens.length} Tokens
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">⚡ Tailwind CSS</Badge>
                <Badge variant="secondary" className="text-[10px]">🎨 CSS Variables</Badge>
                <Badge variant="secondary" className="text-[10px]">💗 SCSS Variables</Badge>
                <Badge variant="secondary" className="text-[10px]">⚛️ React (TS)</Badge>
                <Badge variant="secondary" className="text-[10px]">💙 Flutter (Dart)</Badge>
                <Badge variant="secondary" className="text-[10px]">🍏 iOS Swift</Badge>
                <Badge variant="secondary" className="text-[10px]">🤖 Android XML</Badge>
              </div>
            </div>

            {/* Immediate Distribution Toggle */}
            {distributionTargets.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div>
                  <Label className="text-xs font-semibold">Distribute to Repositories Immediately</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Push compiled code to {distributionTargets.length} configured Git destinations upon creation.
                  </p>
                </div>
                <Switch
                  checked={publishImmediately}
                  onCheckedChange={setPublishImmediately}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isCompiling}
              className="gap-1.5 text-xs font-bold"
            >
              {isCompiling ? (
                <span>Compiling Package...</span>
              ) : (
                <>
                  <span>Create Release Package</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
