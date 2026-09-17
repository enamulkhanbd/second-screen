"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ReleasePackage, ReleaseArtifact } from "@/types/tokens";
import {
  ArrowLeft,
  Download,
  FileText,
  FileCode2,
  Layers,
  Palette,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Check,
  Tag,
  GitBranch,
  Clock,
  User,
  Box,
  MoreVertical,
  AlertTriangle,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  downloadBlob,
  generateMarkdownReleaseNotes,
  generateDiffText,
  generateReleaseManifest,
  formatByteSize,
} from "@/utils/releaseNotesGenerator";

interface ReleaseDetailViewProps {
  release: ReleasePackage;
  onBack: () => void;
}

const BATCH_SIZE = 150;

export const ReleaseDetailView: React.FC<ReleaseDetailViewProps> = ({ release, onBack }) => {
  const { addToast, deleteRelease, toggleDeprecateRelease, canUserEdit } = useTokenStore();
  const isEditable = canUserEdit();
  const [collapsedSets, setCollapsedSets] = useState<Record<string, boolean>>({});
  const [renderLimit, setRenderLimit] = useState(BATCH_SIZE);

  // Group diff items by token set
  const tokenGroups = useMemo(() => {
    const files = release.diffSummary?.files || [];
    const groups: { setName: string; tokens: any[]; added: number; modified: number; deleted: number }[] = [];

    for (const f of files) {
      if (!f.tokens || f.tokens.length === 0) continue;
      const setName = f.setName || f.fileName.replace(/\.json$/, "");
      groups.push({
        setName,
        tokens: f.tokens,
        added: f.addedCount || 0,
        modified: f.modifiedCount || 0,
        deleted: f.deletedCount || 0,
      });
    }

    // Fallback if no diffSummary recorded: extract from rawTokensSnapshot
    if (groups.length === 0 && release.rawTokensSnapshot) {
      const snap = release.rawTokensSnapshot;
      for (const [setName, setObj] of Object.entries(snap)) {
        if (setName.startsWith("$")) continue;
        const tokens: any[] = [];
        const extract = (obj: any, prefix: string[] = []) => {
          if (!obj || typeof obj !== "object") return;
          for (const [k, v] of Object.entries(obj)) {
            if (k.startsWith("$")) continue;
            if (v && typeof v === "object") {
              if ("value" in v || "$value" in v) {
                const val = (v as any).value !== undefined ? (v as any).value : (v as any).$value;
                const type = (v as any).type || (v as any).$type || "unknown";
                tokens.push({
                  key: [...prefix, k].join("."),
                  type,
                  newValue: val,
                  changeType: "added",
                });
              } else {
                extract(v, [...prefix, k]);
              }
            }
          }
        };
        extract(setObj);
        if (tokens.length > 0) {
          groups.push({
            setName,
            tokens,
            added: tokens.length,
            modified: 0,
            deleted: 0,
          });
        }
      }
    }

    return groups;
  }, [release]);

  const totalTokensChanged = useMemo(() => {
    return tokenGroups.reduce((acc, g) => acc + g.tokens.length, 0);
  }, [tokenGroups]);

  const toggleSetCollapse = (setName: string) => {
    setCollapsedSets((prev) => ({ ...prev, [setName]: !prev[setName] }));
  };

  // Download actions
  const handleDownloadNotes = (format: "md" | "json" | "diff") => {
    try {
      if (format === "md") {
        const md = generateMarkdownReleaseNotes(release);
        downloadBlob(md, `${release.version}-release-notes.md`, "text/markdown");
      } else if (format === "json") {
        const json = JSON.stringify(release, null, 2);
        downloadBlob(json, `${release.version}.json`, "application/json");
      } else if (format === "diff") {
        const diff = generateDiffText(release);
        downloadBlob(diff, `${release.version}.diff`, "text/plain");
      }

      addToast({
        type: "success",
        title: "Download Started",
        message: `Saved ${release.version} notes (${format.toUpperCase()}).`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Download Failed",
        message: err.message || "Failed to generate release notes download.",
      });
    }
  };

  const handleDownloadManifest = () => {
    const manifestStr = generateReleaseManifest(release);
    downloadBlob(manifestStr, "manifest.json", "application/json");
    addToast({
      type: "success",
      title: "Manifest Downloaded",
      message: "Saved manifest.json.",
    });
  };

  const handleDownloadRawJson = () => {
    const rawTokens = release.rawTokensSnapshot || {};
    downloadBlob(JSON.stringify(rawTokens, null, 2), "tokens.json", "application/json");
    addToast({
      type: "success",
      title: "Raw JSON Downloaded",
      message: "Saved tokens.json.",
    });
  };

  const handleToggleDeprecate = () => {
    if (release.isDeprecated) {
      toggleDeprecateRelease(release.id);
      addToast({
        type: "success",
        title: "Release Restored",
        message: `Version ${release.version} is now active again.`,
      });
    } else {
      const reason = prompt(
        `Why is release ${release.version} being deprecated? (Optional - e.g. "Superseded by v1.1.0")`,
        ""
      );
      if (reason !== null) {
        toggleDeprecateRelease(release.id, reason);
        addToast({
          type: "info",
          title: "Release Deprecated",
          message: `Version ${release.version} has been marked as deprecated.`,
        });
      }
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to permanently delete release ${release.version}? This action cannot be undone.`
      )
    ) {
      deleteRelease(release.id);
      addToast({
        type: "info",
        title: "Release Deleted",
        message: `Version ${release.version} has been deleted.`,
      });
      onBack();
    }
  };

  const authorInitials = (release.author?.name || "SM")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedDate = release.createdAt
    ? new Date(release.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Release Date";

  // Calculate sizes for artifacts
  const manifestBytes = useMemo(() => {
    return new Blob([generateReleaseManifest(release)]).size;
  }, [release]);

  const rawJsonBytes = useMemo(() => {
    return new Blob([JSON.stringify(release.rawTokensSnapshot || {}, null, 2)]).size;
  }, [release]);

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
      // Typography token object
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

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-background font-sans overflow-hidden select-none">
      {/* 1. Fullscreen Header Bar with Back button and Actions */}
      <header className="px-8 lg:px-12 py-5 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted/60 flex items-center justify-center transition-colors text-foreground"
            title="Back to releases"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold tracking-tight text-foreground">{release.title}</h1>
              <Badge variant="violet" className="font-mono text-xs px-2.5 py-0.5 rounded-full">
                {release.version}
              </Badge>
              {release.isDeprecated && (
                <Badge
                  variant="outline"
                  className="text-xs font-semibold text-amber-500 border-amber-500/30 bg-amber-500/10 px-2 py-0.5"
                >
                  Deprecated
                </Badge>
              )}
              {release.branch && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  <span>{release.branch}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>{formattedDate}</span>
            </p>
          </div>
        </div>

        {/* Top-Right Actions: Download Notes + More Actions */}
        <div className="flex items-center gap-2">
          {/* Download notes dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold h-9 px-3.5 border-border bg-background hover:bg-muted/40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download notes</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs font-sans">
              <DropdownMenuItem
                onClick={() => handleDownloadNotes("md")}
                className="cursor-pointer gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Markdown (.md)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownloadNotes("json")}
                className="cursor-pointer gap-2"
              >
                <FileCode2 className="w-3.5 h-3.5 text-blue-500" />
                <span>JSON (.json)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownloadNotes("diff")}
                className="cursor-pointer gap-2"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>Diff (.diff)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More Actions Dropdown (Deprecate & Delete) */}
          {isEditable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 border-border bg-background hover:bg-muted/40"
                  title="More release actions"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs font-sans">
                <DropdownMenuItem
                  onClick={handleToggleDeprecate}
                  className="cursor-pointer gap-2"
                >
                  {release.isDeprecated ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Restore release</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Deprecate release...</span>
                    </>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleDelete}
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete release</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* 2. Fullscreen Content Body */}
      <div className="flex-1 overflow-y-auto px-8 lg:px-12 py-6 space-y-7 w-full">
        {/* Deprecation Notice Banner (if deprecated) */}
        {release.isDeprecated && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                <strong>This release has been deprecated.</strong>{" "}
                {release.deprecationReason ? `Reason: ${release.deprecationReason}` : "It has been superseded by a newer version."}
              </span>
            </div>
            {isEditable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleDeprecate}
                className="h-7 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 flex-shrink-0 font-semibold"
              >
                Restore Release
              </Button>
            )}
          </div>
        )}

        {/* Author / Metadata Card */}
        <div className="p-4 rounded-xl border border-border bg-card/60 flex items-start gap-3.5">
          <Avatar className="w-9 h-9 border border-border">
            <AvatarImage src={release.author?.avatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {authorInitials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {release.author?.name || "Studio Member"}
              </span>
              {release.author?.email && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {release.author.email}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {release.summary || release.notes || "Initial release snapshot."}
            </p>
          </div>
        </div>

        {/* Included Artifacts Section */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Included artifacts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generated on release and stored for download. Raw JSON and a manifest are always included.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Manifest Card */}
            <div className="p-3.5 rounded-xl border border-border bg-card hover:border-border/80 transition-all flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Box className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Manifest</span>
                    <span className="text-[10px] font-mono text-muted-foreground">manifest.json</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {formatByteSize(manifestBytes)}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadManifest}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Download manifest.json"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>

            {/* Raw JSON Card */}
            <div className="p-3.5 rounded-xl border border-border bg-card hover:border-border/80 transition-all flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <FileCode2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Raw JSON</span>
                    <span className="text-[10px] font-mono text-muted-foreground">tokens.json</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {formatByteSize(rawJsonBytes)}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadRawJson}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Download tokens.json"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Changed Tokens Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Changed tokens</h2>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              +{totalTokensChanged}
            </span>
          </div>

          {tokenGroups.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              No token modifications recorded in this release.
            </div>
          ) : (
            <div className="space-y-4">
              {tokenGroups.map((group) => {
                const isCollapsed = collapsedSets[group.setName];

                return (
                  <div
                    key={group.setName}
                    className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs"
                  >
                    {/* Group Header */}
                    <div
                      onClick={() => toggleSetCollapse(group.setName)}
                      className="px-4 py-2.5 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between border-b border-border"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="font-mono text-xs font-bold text-foreground">
                          {group.setName}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          Set
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                        {group.added > 0 && (
                          <span className="text-emerald-500 font-semibold">+{group.added}</span>
                        )}
                        {group.modified > 0 && (
                          <span className="text-amber-500 font-semibold">~{group.modified}</span>
                        )}
                        {group.deleted > 0 && (
                          <span className="text-rose-500 font-semibold">-{group.deleted}</span>
                        )}
                      </div>
                    </div>

                    {/* Token Diff Rows */}
                    {!isCollapsed && (
                      <div className="divide-y divide-border/60">
                        {group.tokens.slice(0, renderLimit).map((token, idx) => {
                          const isAdd = token.changeType === "added";
                          const isDel = token.changeType === "deleted";
                          const isMod = token.changeType === "modified";

                          return (
                            <div
                              key={`${token.key}-${idx}`}
                              className="px-4 py-2 flex items-center justify-between gap-4 text-xs font-sans hover:bg-muted/15 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {/* Change indicator symbol */}
                                <span
                                  className={`w-3 font-mono font-bold text-center ${
                                    isAdd
                                      ? "text-emerald-500"
                                      : isDel
                                      ? "text-rose-500"
                                      : "text-amber-500"
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

                        {group.tokens.length > renderLimit && (
                          <div className="p-2 text-center bg-muted/20 border-t border-border">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRenderLimit((prev) => prev + BATCH_SIZE)}
                              className="text-xs text-primary"
                            >
                              Show more tokens ({group.tokens.length - renderLimit} remaining)
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Changed Themes Section */}
        {release.themeChanges && release.themeChanges.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Changed themes</h2>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              {release.themeChanges.map((tc, idx) => (
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
          </div>
        )}
      </div>
    </div>
  );
};
