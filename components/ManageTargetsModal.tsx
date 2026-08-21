"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  DistributionTarget,
  PlatformFormatId,
  TargetPlatformFormat,
  GitProvider,
} from "@/types/tokens";
import {
  FolderGit2,
  Plus,
  Trash2,
  Edit2,
  Check,
  Globe,
  Smartphone,
  Layers,
  FileCode2,
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ManageTargetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_FORMATS: { id: PlatformFormatId; label: string; defaultPath: string; icon: string }[] = [
  { id: "tailwind", label: "Tailwind CSS Config", defaultPath: "tailwind.tokens.js", icon: "⚡" },
  { id: "css", label: "CSS Variables (:root & themes)", defaultPath: "styles/tokens.css", icon: "🎨" },
  { id: "react", label: "React / TypeScript Definitions", defaultPath: "src/tokens/index.ts", icon: "⚛️" },
  { id: "flutter", label: "Flutter (Dart)", defaultPath: "lib/tokens/tokens.dart", icon: "💙" },
  { id: "swift", label: "iOS (Swift / SwiftUI)", defaultPath: "ios/Tokens.swift", icon: "🍏" },
  { id: "android", label: "Android (XML Resources)", defaultPath: "android/res/values/colors.xml", icon: "🤖" },
  { id: "tokens_json", label: "DTCG Standard Tokens JSON", defaultPath: "tokens/tokens.json", icon: "📄" },
];

export const ManageTargetsModal: React.FC<ManageTargetsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    distributionTargets,
    addDistributionTarget,
    updateDistributionTarget,
    deleteDistributionTarget,
    credentials,
    addToast,
  } = useTokenStore();

  const [editingTarget, setEditingTarget] = useState<DistributionTarget | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const handleStartCreate = () => {
    const newTarget: DistributionTarget = {
      id: `target-${Date.now().toString(36)}`,
      name: "New Target Repository",
      provider: credentials.provider || "github",
      owner: credentials.owner || "",
      project: credentials.project || "",
      repo: "",
      branch: "main",
      publishMode: "commit",
      formats: [
        { formatId: "css", targetPath: "styles/tokens.css", enabled: true },
        { formatId: "tailwind", targetPath: "tailwind.tokens.js", enabled: true },
      ],
    };
    setEditingTarget(newTarget);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (target: DistributionTarget) => {
    setEditingTarget(JSON.parse(JSON.stringify(target)));
    setIsCreatingNew(false);
  };

  const handleSaveEditing = () => {
    if (!editingTarget) return;

    if (!editingTarget.name.trim() || !editingTarget.repo.trim()) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Target name and repository name are required.",
      });
      return;
    }

    if (isCreatingNew) {
      addDistributionTarget(editingTarget);
      addToast({
        type: "success",
        title: "Publishing Destination Added",
        message: `Created destination "${editingTarget.name}".`,
      });
    } else {
      updateDistributionTarget(editingTarget.id, editingTarget);
      addToast({
        type: "success",
        title: "Destination Updated",
        message: `Saved changes to "${editingTarget.name}".`,
      });
    }

    setEditingTarget(null);
    setIsCreatingNew(false);
  };

  const toggleFormat = (formatId: PlatformFormatId, defaultPath: string) => {
    if (!editingTarget) return;
    const exists = editingTarget.formats.find((f) => f.formatId === formatId);
    if (exists) {
      const updated = editingTarget.formats.map((f) =>
        f.formatId === formatId ? { ...f, enabled: !f.enabled } : f
      );
      setEditingTarget({ ...editingTarget, formats: updated });
    } else {
      const updated = [
        ...editingTarget.formats,
        { formatId, targetPath: defaultPath, enabled: true },
      ];
      setEditingTarget({ ...editingTarget, formats: updated });
    }
  };

  const updateFormatPath = (formatId: PlatformFormatId, newPath: string) => {
    if (!editingTarget) return;
    const updated = editingTarget.formats.map((f) =>
      f.formatId === formatId ? { ...f, targetPath: newPath } : f
    );
    setEditingTarget({ ...editingTarget, formats: updated });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden font-sans">
        <DialogHeader className="p-6 border-b border-border bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Publishing Destinations</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Configure multiple target repositories (GitHub / Azure DevOps) to push compiled platform tokens automatically.
                </DialogDescription>
              </div>
            </div>

            {!editingTarget && (
              <Button
                onClick={handleStartCreate}
                size="sm"
                className="gap-1.5 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Destination</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {editingTarget ? (
            /* EDIT / CREATE FORM */
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">
                  {isCreatingNew ? "Configure New Destination" : `Edit Destination: ${editingTarget.name}`}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTarget(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>

              {/* General Target Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Destination Name</Label>
                  <Input
                    type="text"
                    value={editingTarget.name}
                    onChange={(e) => setEditingTarget({ ...editingTarget, name: e.target.value })}
                    placeholder="e.g. Web Frontend (React + Tailwind)"
                    className="h-8 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Git Provider</Label>
                  <Select
                    value={editingTarget.provider}
                    onValueChange={(val: GitProvider) =>
                      setEditingTarget({ ...editingTarget, provider: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="azure">Azure DevOps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {editingTarget.provider === "github" ? "GitHub Owner / Org" : "Azure DevOps Organization"}
                  </Label>
                  <Input
                    type="text"
                    value={editingTarget.owner}
                    onChange={(e) => setEditingTarget({ ...editingTarget, owner: e.target.value })}
                    placeholder={editingTarget.provider === "github" ? "acme-corp" : "acme-azure-org"}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                {editingTarget.provider === "azure" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Azure DevOps Project</Label>
                    <Input
                      type="text"
                      value={editingTarget.project || ""}
                      onChange={(e) => setEditingTarget({ ...editingTarget, project: e.target.value })}
                      placeholder="MyProject"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Repository Name</Label>
                  <Input
                    type="text"
                    value={editingTarget.repo}
                    onChange={(e) => setEditingTarget({ ...editingTarget, repo: e.target.value })}
                    placeholder="web-app or flutter-mobile"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Target Branch</Label>
                  <Input
                    type="text"
                    value={editingTarget.branch}
                    onChange={(e) => setEditingTarget({ ...editingTarget, branch: e.target.value })}
                    placeholder="main or develop"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Publish Workflow</Label>
                  <Select
                    value={editingTarget.publishMode}
                    onValueChange={(val: "commit" | "pull_request") =>
                      setEditingTarget({ ...editingTarget, publishMode: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commit">Direct Commit to Branch</SelectItem>
                      <SelectItem value="pull_request">Create Pull Request (PR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Enabled Platform Formats & Target Paths */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div>
                  <Label className="text-xs font-bold">Enabled Platform Formats & File Paths</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Select which formats this repository receives and specify the destination folder path.
                  </p>
                </div>

                <div className="space-y-2">
                  {AVAILABLE_FORMATS.map((fmt) => {
                    const targetFmt = editingTarget.formats.find((f) => f.formatId === fmt.id);
                    const isEnabled = Boolean(targetFmt?.enabled);
                    const currentPath = targetFmt?.targetPath || fmt.defaultPath;

                    return (
                      <div
                        key={fmt.id}
                        className={`p-3 rounded-lg border transition-all ${
                          isEnabled ? "bg-muted/40 border-border" : "bg-card border-border/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-sm">{fmt.icon}</span>
                            <span className="font-semibold text-xs text-foreground truncate">
                              {fmt.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 flex-1 justify-end max-w-sm">
                            {isEnabled && (
                              <Input
                                type="text"
                                value={currentPath}
                                onChange={(e) => updateFormatPath(fmt.id, e.target.value)}
                                placeholder={fmt.defaultPath}
                                className="h-7 text-xs font-mono max-w-xs"
                              />
                            )}
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleFormat(fmt.id, fmt.defaultPath)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTarget(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEditing}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Destination</span>
                </Button>
              </div>
            </div>
          ) : (
            /* TARGETS LIST */
            <div className="space-y-3">
              {distributionTargets.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs space-y-3">
                  <FolderGit2 className="w-10 h-10 mx-auto opacity-40" />
                  <p className="font-medium text-foreground">No destinations configured</p>
                  <p className="max-w-sm mx-auto text-muted-foreground text-[11px]">
                    Add target repositories like your Flutter mobile app or Tailwind web frontend to distribute compiled token packages with one click.
                  </p>
                  <Button
                    onClick={handleStartCreate}
                    size="sm"
                    className="gap-1.5 text-xs font-bold mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Destination</span>
                  </Button>
                </div>
              ) : (
                distributionTargets.map((target) => {
                  const enabledCount = target.formats.filter((f) => f.enabled).length;

                  return (
                    <Card key={target.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {target.name}
                            </span>
                            <Badge variant="outline" className="font-mono text-[10px] uppercase">
                              {target.provider}
                            </Badge>
                            <Badge
                              variant={target.publishMode === "pull_request" ? "violet" : "secondary"}
                              className="text-[10px] gap-1"
                            >
                              {target.publishMode === "pull_request" ? (
                                <>
                                  <GitPullRequest className="w-3 h-3" />
                                  <span>Pull Request</span>
                                </>
                              ) : (
                                <>
                                  <GitBranch className="w-3 h-3" />
                                  <span>Direct Commit</span>
                                </>
                              )}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                            <span>{target.owner}/{target.repo}</span>
                            <span>•</span>
                            <span>branch: {target.branch}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleStartEdit(target)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Edit Target"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              if (confirm(`Delete publishing destination "${target.name}"?`)) {
                                deleteDistributionTarget(target.id);
                              }
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete Target"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Format Badges & Paths */}
                      <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {target.formats
                            .filter((f) => f.enabled)
                            .map((f) => (
                              <Badge key={f.formatId} variant="secondary" className="font-mono text-[10px] py-0 px-2">
                                {f.formatId}: {f.targetPath}
                              </Badge>
                            ))}
                        </div>

                        <span className="text-[11px] font-mono text-muted-foreground">
                          {enabledCount} {enabledCount === 1 ? "format" : "formats"}
                        </span>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
