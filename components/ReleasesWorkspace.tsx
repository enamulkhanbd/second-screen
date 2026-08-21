"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  downloadReleaseZip,
  downloadTextFile,
  getPlatformArtifactContent,
} from "@/utils/releaseCompiler";
import { CreateReleaseModal } from "@/components/CreateReleaseModal";
import { ManageTargetsModal } from "@/components/ManageTargetsModal";
import { CompilerConfigModal } from "@/components/CompilerConfigModal";
import { PlatformFormatId, TargetPublishResult } from "@/types/tokens";
import {
  Package,
  Plus,
  Copy,
  Check,
  Download,
  FileCode2,
  Layers,
  Tag,
  Trash2,
  FileText,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const PLATFORM_TABS: { id: PlatformFormatId | "notes"; label: string; icon: string }[] = [
  { id: "tailwind", label: "Tailwind CSS", icon: "⚡" },
  { id: "css", label: "CSS Variables", icon: "🎨" },
  { id: "react", label: "React / TS", icon: "⚛️" },
  { id: "flutter", label: "Flutter (Dart)", icon: "💙" },
  { id: "swift", label: "iOS (Swift)", icon: "🍏" },
  { id: "android", label: "Android (XML)", icon: "🤖" },
  { id: "tokens_json", label: "Tokens JSON", icon: "📄" },
  { id: "config_json", label: "config.json (SD)", icon: "⚙️" },
  { id: "notes", label: "Release Notes", icon: "📝" },
];

export const ReleasesWorkspace: React.FC = () => {
  const {
    releases,
    activeReleaseId,
    setActiveReleaseId,
    deleteRelease,
    distributionTargets,
    compilerConfig,
    publishReleaseToTargets,
    addToast,
  } = useTokenStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManageTargetsOpen, setIsManageTargetsOpen] = useState(false);
  const [isCompilerConfigOpen, setIsCompilerConfigOpen] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<PlatformFormatId | "notes">("tailwind");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<TargetPublishResult[] | null>(null);

  const activeRelease =
    releases.find((r) => r.id === activeReleaseId) || releases[0];

  // Initialize selected target IDs to all configured targets by default
  React.useEffect(() => {
    if (distributionTargets.length > 0 && selectedTargetIds.length === 0) {
      setSelectedTargetIds(distributionTargets.map((t) => t.id));
    }
  }, [distributionTargets]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast({
      type: "success",
      title: "Copied to Clipboard",
      message: "Snippet copied successfully.",
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadZip = async () => {
    if (!activeRelease) return;
    try {
      await downloadReleaseZip(activeRelease);
      addToast({
        type: "success",
        title: "Download Started",
        message: `Saved design-tokens-${activeRelease.version}.zip`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Download Failed",
        message: err.message,
      });
    }
  };

  const handleDownloadActiveFile = () => {
    if (!activeRelease || activePlatformTab === "notes") return;
    const artifact = getPlatformArtifactContent(activePlatformTab as PlatformFormatId, activeRelease);
    downloadTextFile(artifact.content, artifact.filename);
  };

  const handlePublishToTargets = async () => {
    if (!activeRelease) return;
    if (selectedTargetIds.length === 0) {
      addToast({
        type: "error",
        title: "No Destinations Selected",
        message: "Please select at least one target repository to publish to.",
      });
      return;
    }

    setIsPublishing(true);
    setPublishStatus(null);

    try {
      const results = await publishReleaseToTargets(activeRelease.id, selectedTargetIds);
      setPublishStatus(results);

      const hasError = results.some((r) => r.status === "error");
      if (hasError) {
        addToast({
          type: "error",
          title: "Publish Completed with Errors",
          message: "One or more target repositories failed to update. Check details below.",
        });
      } else {
        addToast({
          type: "success",
          title: "Multi-Repository Distribution Complete",
          message: `Successfully updated ${results.length} destination repositories!`,
        });
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Publish Failed",
        message: err.message || "Failed to distribute tokens to repositories.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const toggleTargetSelection = (targetId: string) => {
    if (selectedTargetIds.includes(targetId)) {
      setSelectedTargetIds(selectedTargetIds.filter((id) => id !== targetId));
    } else {
      setSelectedTargetIds([...selectedTargetIds, targetId]);
    }
  };

  // If no releases exist yet
  if (!activeRelease) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background font-sans">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Package className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-foreground">No Releases Created Yet</h2>
        <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6">
          Compile your design tokens into production-ready packages for Tailwind CSS, CSS Variables, React TypeScript, Flutter Dart, Swift, and Android XML.
        </p>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 text-xs font-bold">
          <Plus className="w-4 h-4" />
          <span>Create First Release</span>
        </Button>
        <CreateReleaseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    );
  }

  const activeArtifact =
    activePlatformTab !== "notes"
      ? getPlatformArtifactContent(activePlatformTab as PlatformFormatId, activeRelease)
      : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* 1. Header Bar */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">
                Releases & Multi-Platform Distribution
              </h1>
              <Badge variant="violet" className="font-mono text-[11px]">
                {activeRelease.version}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Automated compilation and Git multi-repository deployment
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {/* Release Version Picker */}
          {releases.length > 1 && (
            <Select
              value={activeRelease.id}
              onValueChange={(val) => setActiveReleaseId(val)}
            >
              <SelectTrigger className="h-8 text-xs font-mono w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {releases.map((rel) => (
                  <SelectItem key={rel.id} value={rel.id}>
                    {rel.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompilerConfigOpen(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Compiler Rules</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsManageTargetsOpen(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Destinations ({distributionTargets.length})</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadZip}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All (ZIP)</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-1.5 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Release</span>
          </Button>
        </div>
      </header>

      {/* 2. Workspace Body (Grid layout) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left / Main Platform Viewer */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border overflow-hidden">
          {/* Platform Tab Navigation */}
          <div className="px-6 pt-2 border-b border-border bg-card flex-shrink-0">
            <Tabs
              value={activePlatformTab}
              onValueChange={(v) => setActivePlatformTab(v as any)}
              className="w-full"
            >
              <TabsList className="w-full justify-start h-9 p-0 bg-transparent border-0 gap-3 overflow-x-auto">
                {PLATFORM_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-medium gap-1.5 flex-shrink-0"
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Platform Code Inspector & Header */}
          <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
            {activePlatformTab !== "notes" && activeArtifact ? (
              <div className="flex-1 flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                {/* Code Header Bar */}
                <div className="h-10 px-4 border-b border-border bg-muted/40 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {activeArtifact.filename}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono py-0">
                      {activeArtifact.lang}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(activeArtifact.content, activeArtifact.filename)}
                      className="h-7 text-xs gap-1.5"
                    >
                      {copiedKey === activeArtifact.filename ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadActiveFile}
                      className="h-7 text-xs gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </Button>
                  </div>
                </div>

                {/* Code Body */}
                <div className="flex-1 overflow-auto p-4 bg-muted/10 font-mono text-xs leading-relaxed text-foreground select-text">
                  <pre className="whitespace-pre">
                    <code>{activeArtifact.content}</code>
                  </pre>
                </div>
              </div>
            ) : (
              /* Release Notes View */
              <div className="flex-1 flex flex-col rounded-xl border border-border bg-card p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h2 className="text-base font-bold text-foreground">{activeRelease.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created on {new Date(activeRelease.createdAt).toLocaleString()} • {activeRelease.tokenCount} tokens
                    </p>
                  </div>
                  <Badge variant="violet" className="text-xs">
                    {activeRelease.version}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Changelog & Notes
                  </h3>
                  <div className="p-4 rounded-lg bg-muted/40 border border-border text-xs whitespace-pre-wrap leading-relaxed text-foreground font-sans">
                    {activeRelease.notes || "No release notes provided."}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Included Target Systems
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(activeRelease.targetSystems || []).map((sys: string) => (
                      <Badge key={sys} variant="secondary" className="text-xs py-1">
                        {sys}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Distribution & Git Publishing Panel */}
        <div className="w-full md:w-96 flex flex-col bg-card flex-shrink-0 overflow-y-auto p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-primary" />
                <span>Publish to Repositories</span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsManageTargetsOpen(true)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="w-3.5 h-3.5 mr-1" />
                <span>Manage</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Push compiled token files across multiple repositories with one click.
            </p>
          </div>

          {/* Targets List */}
          <div className="space-y-2.5">
            {distributionTargets.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2">
                <p className="text-xs text-muted-foreground">No destinations added yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsManageTargetsOpen(true)}
                  className="text-xs font-semibold gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Web or Mobile Repo</span>
                </Button>
              </div>
            ) : (
              distributionTargets.map((target) => {
                const isSelected = selectedTargetIds.includes(target.id);

                return (
                  <div
                    key={target.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected ? "bg-primary/5 border-primary" : "bg-card border-border hover:bg-muted/40"
                    }`}
                    onClick={() => toggleTargetSelection(target.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-foreground truncate">
                            {target.name}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate">
                          {target.provider} • {target.repo} @ {target.branch}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Badge
                          variant={target.publishMode === "pull_request" ? "violet" : "secondary"}
                          className="text-[9px] py-0"
                        >
                          {target.publishMode === "pull_request" ? "PR" : "Commit"}
                        </Badge>
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => toggleTargetSelection(target.id)}
                        />
                      </div>
                    </div>

                    {/* Format Badges */}
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1 flex-wrap">
                      {target.formats
                        .filter((f) => f.enabled)
                        .map((f) => (
                          <span
                            key={f.formatId}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {f.formatId}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Publish Trigger Button */}
          {distributionTargets.length > 0 && (
            <Button
              onClick={handlePublishToTargets}
              disabled={isPublishing || selectedTargetIds.length === 0}
              className="w-full gap-2 text-xs font-bold h-9"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing to {selectedTargetIds.length} Repositories...</span>
                </>
              ) : (
                <>
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>Publish Release ({selectedTargetIds.length} Selected)</span>
                </>
              )}
            </Button>
          )}

          {/* Publish Outcome / Results */}
          {publishStatus && (
            <div className="space-y-2 pt-3 border-t border-border">
              <h3 className="text-xs font-bold text-foreground">Publish Results</h3>
              <div className="space-y-2">
                {publishStatus.map((res) => (
                  <div
                    key={res.targetId}
                    className={`p-3 rounded-lg border text-xs space-y-1 ${
                      res.status === "success"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                        : "bg-destructive/10 border-destructive/30 text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{res.targetName}</span>
                      {res.status === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{res.message}</p>
                    {res.pullRequestUrl && (
                      <a
                        href={res.pullRequestUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold mt-1"
                      >
                        <span>View Pull Request #{res.pullRequestNumber}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete Active Release */}
          <div className="pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Delete release ${activeRelease.version}?`)) {
                  deleteRelease(activeRelease.id);
                }
              }}
              className="w-full text-xs text-muted-foreground hover:text-destructive gap-1.5 h-8"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete This Release</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateReleaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <ManageTargetsModal
        isOpen={isManageTargetsOpen}
        onClose={() => setIsManageTargetsOpen(false)}
      />
      <CompilerConfigModal
        isOpen={isCompilerConfigOpen}
        onClose={() => setIsCompilerConfigOpen(false)}
      />
    </div>
  );
};
