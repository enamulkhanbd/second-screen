"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ReleasePackage } from "@/types/tokens";
import {
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { computeTokensDiff } from "@/utils/tokenDiff";
import { computeThemeChanges, formatByteSize } from "@/utils/releaseNotesGenerator";
import { compileCssVariables, compileStyleDictionary } from "@/utils/releaseCompiler";
import { isDeprecationOverdue } from "@/utils/tokenDeprecation";

interface NewReleaseViewProps {
  onCancel: () => void;
  onPublished: (releaseId: string) => void;
}

export const NewReleaseView: React.FC<NewReleaseViewProps> = ({
  onCancel,
  onPublished,
}) => {
  const {
    currentProject,
    rawTokens,
    resolvedTokens,
    themeGroups,
    releases,
    currentUser,
    activeBranch,
    compilerConfig,
    createRelease,
    setSidebarTab,
    addToast,
  } = useTokenStore();

  const branch = activeBranch || "main";

  // Find previous release on this branch or overall
  const previousRelease = useMemo(() => {
    return releases.find((r) => (r.branch || "main") === branch) || releases[0] || null;
  }, [releases, branch]);

  // SemVer calculations
  function bumpSemVer(ver: string, type: "major" | "minor" | "patch"): string {
    const clean = (ver || "v0.0.0").replace(/^v/, "");
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

  const baseVer = previousRelease?.version || "v0.0.0";
  const patchVer = bumpSemVer(baseVer, "patch");
  const minorVer = bumpSemVer(baseVer, "minor");
  const majorVer = bumpSemVer(baseVer, "major");

  const [tag, setTag] = useState(previousRelease ? patchVer : "v1.0.0");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [collapsedSets, setCollapsedSets] = useState<Record<string, boolean>>({});

  // Compute live diff between current project tokens and previous release
  const diffSummary = useMemo(() => {
    const oldDoc = previousRelease?.rawTokensSnapshot || {};
    return computeTokensDiff(oldDoc, rawTokens);
  }, [previousRelease, rawTokens]);

  // Compute theme changes
  const themeChanges = useMemo(() => {
    const oldThemes = previousRelease?.themeGroupsSnapshot || [];
    return computeThemeChanges(oldThemes, themeGroups);
  }, [previousRelease, themeGroups]);

  // Total changes count
  const totalChanges = useMemo(() => {
    return (
      (diffSummary.totalAdded || 0) +
      (diffSummary.totalModified || 0) +
      (diffSummary.totalDeleted || 0) +
      themeChanges.length
    );
  }, [diffSummary, themeChanges]);

  // Deprecated tokens ship in the release; this only flags ones needing attention.
  const deprecationSummary = useMemo(() => {
    const releaseTag = tag.trim().startsWith("v") ? tag.trim() : `v${tag.trim()}`;
    const deprecated = resolvedTokens.filter((t) => t.deprecated);
    return {
      total: deprecated.length,
      overdue: deprecated.filter((t) =>
        isDeprecationOverdue(t.deprecatedRemoveAfter, { currentVersion: releaseTag })
      ),
      errors: deprecated.filter((t) => t.deprecatedSeverity === "error").length,
    };
  }, [resolvedTokens, tag]);

  // Formatted artifacts sizes
  const rawJsonSize = useMemo(() => {
    return new Blob([JSON.stringify(rawTokens, null, 2)]).size;
  }, [rawTokens]);

  const toggleSetCollapse = (setName: string) => {
    setCollapsedSets((prev) => ({ ...prev, [setName]: !prev[setName] }));
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim()) {
      addToast({ type: "error", title: "Missing Tag", message: "Please specify a release tag (e.g. v1.0.0)." });
      return;
    }

    setIsPublishing(true);

    try {
      const releaseTag = tag.trim().startsWith("v") ? tag.trim() : `v${tag.trim()}`;
      const releaseTitle = title.trim() || `Release ${releaseTag}`;

      // Compile platform bundles
      const cssVars = compileCssVariables(resolvedTokens, themeGroups, compilerConfig);
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

      const author = currentUser
        ? {
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email?.split("@")[0] || "Studio Member",
            email: currentUser.email || undefined,
            avatarUrl: currentUser.avatarUrl || undefined,
          }
        : {
            name: "Studio Member",
          };

      const newRelease: ReleasePackage = {
        id: `rel-${Date.now()}`,
        version: releaseTag,
        title: releaseTitle,
        summary: summary.trim(),
        notes: notes.trim() || summary.trim(),
        createdAt: new Date().toISOString(),
        author,
        branch,
        tokenCount: resolvedTokens.length,
        themesCount: themeGroups.reduce((acc, g) => acc + g.options.length, 0),
        changesCount: totalChanges,
        targetSystems,
        compilerConfig,
        rawTokensSnapshot: JSON.parse(JSON.stringify(rawTokens)),
        themeGroupsSnapshot: JSON.parse(JSON.stringify(themeGroups)),
        diffSummary,
        themeChanges,
        artifacts: [
          { name: "Manifest", filename: "manifest.json", size: "610 B", bytes: 610, type: "manifest" },
          { name: "Raw JSON", filename: "tokens.json", size: formatByteSize(rawJsonSize), bytes: rawJsonSize, type: "raw_json" },
        ],
        cssVariables: cssVars,
        styleDictionary: styleDict,
      };

      createRelease(newRelease);

      addToast({
        type: "success",
        title: "Release Published Successfully",
        message: `Version ${newRelease.version} compiled with ${resolvedTokens.length} tokens.`,
      });

      onPublished(newRelease.id);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Publish Failed",
        message: err.message || "An error occurred while compiling the release.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Intelligent value formatter for diff rows
  const renderValuePreview = (token: any) => {
    const val = token.newValue !== undefined ? token.newValue : token.oldValue;
    const isColor =
      token.type === "color" ||
      (typeof val === "string" && (val.startsWith("#") || val.startsWith("rgb") || val.startsWith("hsl")));
    const isAlias = typeof val === "string" && val.startsWith("{") && val.endsWith("}");

    if (isColor && !isAlias && typeof val === "string") {
      return (
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-sm border border-border shadow-2xs flex-shrink-0"
            style={{ backgroundColor: val }}
          />
          <span className="text-muted-foreground font-mono text-[11px] truncate max-w-[280px]">
            ({val})
          </span>
        </div>
      );
    }

    if (typeof val === "object" && val !== null) {
      // Typography object
      if (val.fontFamily || val.fontSize || val.fontWeight) {
        const parts = [];
        if (val.fontFamily) parts.push(val.fontFamily);
        if (val.fontSize) parts.push(val.fontSize);
        if (val.fontWeight) parts.push(val.fontWeight);
        if (val.lineHeight) parts.push(`lh:${val.lineHeight}`);
        return (
          <span className="text-muted-foreground font-mono text-[11px] truncate max-w-[360px]" title={JSON.stringify(val)}>
            {parts.join(" · ")}
          </span>
        );
      }

      // Box shadow / border object
      if (val.color || val.x || val.y || val.blur) {
        const sParts = [];
        if (val.x !== undefined && val.y !== undefined) sParts.push(`${val.x} ${val.y}`);
        if (val.blur) sParts.push(val.blur);
        if (val.color) sParts.push(val.color);
        return (
          <span className="text-muted-foreground font-mono text-[11px] truncate max-w-[360px]" title={JSON.stringify(val)}>
            {sParts.join(" ")}
          </span>
        );
      }

      // Generic clean key-value object display
      const formatted = Object.entries(val)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      return (
        <span className="text-muted-foreground font-mono text-[11px] truncate max-w-[360px]" title={JSON.stringify(val)}>
          {formatted}
        </span>
      );
    }

    return (
      <span className="text-muted-foreground font-mono text-[11px] truncate max-w-[360px]">
        {String(val)}
      </span>
    );
  };

  const projectName = currentProject?.name || "web";

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-background font-sans overflow-hidden select-none">
      {/* 1. Fullscreen Header Bar with Project Breadcrumbs and Actions */}
      <header className="px-8 lg:px-12 py-4 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onCancel}
            className="font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {projectName}
          </button>
          <span className="text-muted-foreground">/</span>
          <button
            onClick={onCancel}
            className="font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Releases
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">New Release</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-8 text-xs font-semibold"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing}
            className="h-8 text-xs font-bold gap-1.5 shadow-sm"
          >
            {isPublishing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <span>Publish release</span>
            )}
          </Button>
        </div>
      </header>

      {/* 2. Fullscreen Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-8 lg:px-12 py-6 space-y-7 w-full">
        {/* Title & Info Banner */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Release Details</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Documentation will publish with this release (project mode: release-coupled). Use Docs &gt; Publish for hotfixes without a release.
          </p>
        </div>

        <form onSubmit={handlePublish} className="space-y-6 w-full">
          {/* Tag & SemVer Suggestion Pills */}
          <div className="space-y-2 w-full">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1">
              <span>Tag</span>
              <span className="text-rose-500">*</span>
            </Label>

            <Input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="v1.0.0"
              className="h-9 text-xs font-mono font-bold w-full"
              required
            />

            {/* Quick Suggestion Pills */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTag(patchVer)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                  tag === patchVer
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {patchVer} (patch)
              </button>

              <button
                type="button"
                onClick={() => setTag(minorVer)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                  tag === minorVer
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {minorVer} (minor)
              </button>

              <button
                type="button"
                onClick={() => setTag(majorVer)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                  tag === majorVer
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {majorVer} (major)
              </button>
            </div>
          </div>

          {/* Title input (Full-Width) */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs font-bold text-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Autumn palette refresh"
              className="h-9 text-xs w-full"
            />
          </div>

          {/* Summary input (Full-Width) */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs font-bold text-foreground">Summary</Label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="High-level overview of what changed in this release"
              className="h-9 text-xs w-full"
            />
          </div>

          {/* + Add notes button or expanded textarea */}
          <div className="w-full">
            {!showNotesEditor ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNotesEditor(true)}
                className="h-8 text-xs font-medium gap-1.5 border-dashed"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add notes</span>
              </Button>
            ) : (
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Release Notes (Markdown)</Label>
                  <button
                    type="button"
                    onClick={() => setShowNotesEditor(false)}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Collapse notes
                  </button>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe detailed updates, breaking changes, or usage instructions..."
                  className="w-full h-28 p-3 rounded-lg border border-border bg-background text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-sans leading-relaxed resize-y"
                />
              </div>
            )}
          </div>
        </form>

        {/* Included Artifacts Card (Full-Width) */}
        <div className="p-4 rounded-xl border border-border bg-card/60 flex items-center justify-between gap-4 w-full">
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-xs font-bold text-foreground">Included artifacts</h3>
            <p className="text-[11px] text-muted-foreground">
              Generated on release and stored for download. Raw JSON and a manifest are always included.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSidebarTab("exports")}
            className="text-xs font-semibold gap-1.5 h-8 flex-shrink-0"
          >
            <span>Go to Exports</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Deprecated tokens notice */}
        {deprecationSummary.total > 0 && (
          <div className="p-4 rounded-xl border border-amber-300/60 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 space-y-1 w-full">
            <h3 className="text-xs font-bold text-foreground">
              {deprecationSummary.total} deprecated token{deprecationSummary.total === 1 ? "" : "s"} included
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              They stay in this release with their deprecation details.
              {deprecationSummary.errors > 0 && ` ${deprecationSummary.errors} marked as error.`}
              {deprecationSummary.overdue.length > 0 &&
                ` ${deprecationSummary.overdue.length} past their removal deadline: ${deprecationSummary.overdue
                  .slice(0, 5)
                  .map((t) => t.name)
                  .join(", ")}${deprecationSummary.overdue.length > 5 ? ", …" : ""}.`}
            </p>
          </div>
        )}

        {/* Changes Compared To Previous Release Section (Full-Width) */}
        <div className="space-y-3 pt-2 w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {previousRelease ? `Changes compared to ${previousRelease.version}` : "Initial project changes"}
            </h2>
            {totalChanges > 0 && (
              <Badge variant="outline" className="text-xs font-mono text-emerald-500 border-emerald-500/30">
                +{totalChanges} changes
              </Badge>
            )}
          </div>

          {totalChanges === 0 ? (
            /* Empty State Matching Reference Workflow */
            <div className="p-10 rounded-xl border border-dashed border-border text-center space-y-2 bg-card/30 w-full">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-foreground">No changes</h3>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                This release contains no changes compared to the previous release on this branch.
              </p>
            </div>
          ) : (
            /* Full-Width Visual Token Diff Tree */
            <div className="space-y-4 w-full">
              {diffSummary.files.map((file) => {
                const isCollapsed = collapsedSets[file.setName];
                const count = file.tokens?.length || 0;
                if (count === 0) return null;

                return (
                  <div
                    key={file.setName}
                    className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs w-full"
                  >
                    <div
                      onClick={() => toggleSetCollapse(file.setName)}
                      className="px-4 py-2.5 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between border-b border-border"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="font-mono text-xs font-bold text-foreground">{file.setName}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">Set</Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                        {file.addedCount > 0 && <span className="text-emerald-500 font-semibold">+{file.addedCount}</span>}
                        {file.modifiedCount > 0 && <span className="text-amber-500 font-semibold">~{file.modifiedCount}</span>}
                        {file.deletedCount > 0 && <span className="text-rose-500 font-semibold">-{file.deletedCount}</span>}
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="divide-y divide-border/60 w-full">
                        {file.tokens.map((token: any, idx: number) => {
                          const isAdd = token.changeType === "added";
                          const isDel = token.changeType === "deleted";

                          return (
                            <div
                              key={`${token.key}-${idx}`}
                              className="px-4 py-2 flex items-center justify-between gap-4 text-xs font-sans hover:bg-muted/15 transition-colors w-full"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className={`w-3 font-mono font-bold text-center ${
                                    isAdd ? "text-emerald-500" : isDel ? "text-rose-500" : "text-amber-500"
                                  }`}
                                >
                                  {isAdd ? "+" : isDel ? "-" : "~"}
                                </span>
                                <span className="font-mono font-semibold text-foreground truncate">
                                  {token.key}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground px-1 py-0.2 rounded bg-muted">
                                  {token.type || "token"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-muted-foreground text-xs font-mono">&gt;</span>
                                {renderValuePreview(token)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Theme Changes (Full-Width) */}
              {themeChanges.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-card space-y-2 w-full">
                  <h4 className="text-xs font-bold text-foreground">Theme updates</h4>
                  {themeChanges.map((tc, idx) => (
                    <div
                      key={`${tc.groupName}-${tc.optionName}-${idx}`}
                      className="flex items-center gap-2 text-xs text-foreground"
                    >
                      <span className="text-muted-foreground">Theme group:</span>
                      <span className="font-semibold text-foreground">{tc.groupName}</span>
                      <span className="text-muted-foreground">&gt;</span>
                      <span className="text-muted-foreground">Theme option:</span>
                      <span className="font-mono font-semibold text-primary">{tc.optionName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
