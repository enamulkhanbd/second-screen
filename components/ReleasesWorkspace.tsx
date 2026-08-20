"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  downloadReleaseZip,
} from "@/utils/releaseCompiler";
import { CreateReleaseModal } from "@/components/CreateReleaseModal";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ReleasesWorkspace: React.FC = () => {
  const {
    releases,
    activeReleaseId,
    setActiveReleaseId,
    deleteRelease,
    themeGroups,
    addToast,
  } = useTokenStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"css" | "styleDict" | "notes">("css");
  const [cssSystemSelect, setCssSystemSelect] = useState<string>("allCombined");
  const [styleDictFileSelect, setStyleDictFileSelect] = useState<string>("css");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeRelease =
    releases.find((r) => r.id === activeReleaseId) || releases[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast({
      type: "success",
      title: "Copied to Clipboard",
      message: "Generated code snippet copied successfully.",
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

  const getSelectedCssContent = (): string => {
    if (!activeRelease) return "";
    if (cssSystemSelect === "allCombined") return activeRelease.cssVariables.allCombined;
    if (cssSystemSelect === "root") return activeRelease.cssVariables.root;
    return activeRelease.cssVariables.themes[cssSystemSelect] || activeRelease.cssVariables.root;
  };

  const getSelectedStyleDictContent = (): { filename: string; content: string; lang: string } => {
    if (!activeRelease) return { filename: "tokens.css", content: "", lang: "css" };
    const sd = activeRelease.styleDictionary;

    switch (styleDictFileSelect) {
      case "css":
        return { filename: "dist/web/tokens.css", content: sd.css, lang: "css" };
      case "scss":
        return { filename: "dist/web/tokens.scss", content: sd.scss, lang: "scss" };
      case "js":
        return { filename: "dist/web/tokens.js", content: sd.esmJs, lang: "javascript" };
      case "dts":
        return { filename: "dist/web/tokens.d.ts", content: sd.dts, lang: "typescript" };
      case "tailwind":
        return { filename: "dist/tailwind/tailwind.config.js", content: sd.tailwindConfig, lang: "javascript" };
      case "ios":
        return { filename: "dist/ios/Tokens.swift", content: sd.iosSwift, lang: "swift" };
      case "androidColors":
        return { filename: "dist/android/values/colors.xml", content: sd.androidColorsXml, lang: "xml" };
      case "androidDimens":
        return { filename: "dist/android/values/dimens.xml", content: sd.androidDimensXml, lang: "xml" };
      case "tokensJson":
        return { filename: "tokens/tokens.json", content: sd.tokensJson, lang: "json" };
      case "configJson":
        return { filename: "config.json", content: sd.configJson, lang: "json" };
      default:
        return { filename: "dist/web/tokens.css", content: sd.css, lang: "css" };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* Header Bar */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">
                Releases & Build Artifacts
              </h1>
              {activeRelease && (
                <Badge variant="violet" className="font-mono text-[11px]">
                  {activeRelease.version}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Compiled production CSS variables, Style Dictionary bundles, and mobile assets
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2.5">
          {activeRelease && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadZip}
              className="gap-1.5 text-xs h-8"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Download ZIP Bundle</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Release</span>
          </Button>
        </div>
      </header>

      {/* Main Split Layout */}
      {releases.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4 text-muted-foreground">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-foreground">
            No Releases Created Yet
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mt-1.5 leading-relaxed">
            Create your first versioned release to automatically generate CSS variables, Style Dictionary packages, and multi-platform distribution files.
          </p>
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-5 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Release</span>
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Version History Sidebar */}
          <aside className="w-64 border-r border-border bg-card flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-border flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span>Version History</span>
              <span className="font-mono text-[11px] font-normal">{releases.length} total</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {releases.map((rel) => {
                const isSelected = activeRelease?.id === rel.id;

                return (
                  <div
                    key={rel.id}
                    onClick={() => setActiveReleaseId(rel.id)}
                    className={`group relative p-3 rounded-lg border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs"
                        : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Tag className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-mono font-bold text-xs text-foreground">
                          {rel.version}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete release ${rel.version}?`)) {
                            deleteRelease(rel.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded transition-opacity"
                        title="Delete Release"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs font-medium text-foreground truncate mt-1">
                      {rel.title}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-2 font-mono">
                      <span>{new Date(rel.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{rel.tokenCount} tokens</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right Column: Code Viewer & System Explorer */}
          <main className="flex-1 flex flex-col bg-muted/20 overflow-hidden">
            {/* Top Workspace Tab Nav */}
            <div className="h-11 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0">
              <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
                <TabsList>
                  <TabsTrigger value="css" className="gap-1.5 text-xs">
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>CSS Variables</span>
                  </TabsTrigger>
                  <TabsTrigger value="styleDict" className="gap-1.5 text-xs">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Style Dictionary Multi-Platform</span>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-1.5 text-xs">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Release Notes</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Sub-selector toolbar */}
              {activeTab === "css" && activeRelease && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">Scope:</span>
                  <div className="w-56">
                    <Select value={cssSystemSelect} onValueChange={setCssSystemSelect}>
                      <SelectTrigger className="h-7 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allCombined">All Combined (:root + Themes)</SelectItem>
                        <SelectItem value="root">:root (Global Scope)</SelectItem>
                        {themeGroups.flatMap((g) =>
                          g.options.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {g.name}: {opt.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {activeTab === "styleDict" && activeRelease && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">Platform File:</span>
                  <div className="w-56">
                    <Select value={styleDictFileSelect} onValueChange={setStyleDictFileSelect}>
                      <SelectTrigger className="h-7 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="css">dist/web/tokens.css</SelectItem>
                        <SelectItem value="scss">dist/web/tokens.scss</SelectItem>
                        <SelectItem value="js">dist/web/tokens.js (ESM)</SelectItem>
                        <SelectItem value="dts">dist/web/tokens.d.ts (TypeScript)</SelectItem>
                        <SelectItem value="tailwind">dist/tailwind/tailwind.config.js</SelectItem>
                        <SelectItem value="ios">dist/ios/Tokens.swift</SelectItem>
                        <SelectItem value="androidColors">dist/android/values/colors.xml</SelectItem>
                        <SelectItem value="androidDimens">dist/android/values/dimens.xml</SelectItem>
                        <SelectItem value="tokensJson">tokens/tokens.json</SelectItem>
                        <SelectItem value="configJson">config.json</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === "css" && activeRelease && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      tokens.css ({cssSystemSelect})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(getSelectedCssContent(), "css")}
                      className="gap-1.5 h-7 text-xs"
                    >
                      {copiedKey === "css" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "css" ? "Copied" : "Copy CSS"}</span>
                    </Button>
                  </div>
                  <pre className="p-4 rounded-xl bg-card border border-border font-mono text-xs text-foreground overflow-x-auto leading-relaxed">
                    <code>{getSelectedCssContent()}</code>
                  </pre>
                </div>
              )}

              {activeTab === "styleDict" && activeRelease && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      {getSelectedStyleDictContent().filename}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(getSelectedStyleDictContent().content, "styledict")}
                      className="gap-1.5 h-7 text-xs"
                    >
                      {copiedKey === "styledict" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "styledict" ? "Copied" : "Copy Code"}</span>
                    </Button>
                  </div>
                  <pre className="p-4 rounded-xl bg-card border border-border font-mono text-xs text-foreground overflow-x-auto leading-relaxed">
                    <code>{getSelectedStyleDictContent().content}</code>
                  </pre>
                </div>
              )}

              {activeTab === "notes" && activeRelease && (
                <div className="max-w-2xl bg-card p-6 rounded-xl border border-border space-y-4 text-xs text-foreground">
                  <div className="border-b border-border pb-3">
                    <h3 className="text-base font-bold">{activeRelease.title}</h3>
                    <div className="flex items-center gap-3 text-muted-foreground mt-1 font-mono text-[11px]">
                      <span>Version: {activeRelease.version}</span>
                      <span>•</span>
                      <span>Published: {new Date(activeRelease.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="leading-relaxed text-foreground/80">{activeRelease.notes}</p>
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* Create Release Modal */}
      {isCreateModalOpen && (
        <CreateReleaseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
};
