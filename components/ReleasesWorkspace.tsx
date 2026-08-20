"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  ReleasePackage,
  downloadReleaseZip,
  downloadTextFile,
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
  Sparkles,
  Tag,
  Trash2,
  Calendar,
  GitBranch,
  Terminal,
  FileText,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export const ReleasesWorkspace: React.FC = () => {
  const {
    releases,
    activeReleaseId,
    setActiveReleaseId,
    deleteRelease,
    resolvedTokens,
    themeGroups,
    addToast,
  } = useTokenStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"css" | "styleDict" | "notes">("css");
  const [cssSystemSelect, setCssSystemSelect] = useState<string>("allCombined");
  const [styleDictFileSelect, setStyleDictFileSelect] = useState<string>("css");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active selected release package or fallback to latest
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

  // Get current CSS content based on system select
  const getSelectedCssContent = (): string => {
    if (!activeRelease) return "";
    if (cssSystemSelect === "allCombined") return activeRelease.cssVariables.allCombined;
    if (cssSystemSelect === "root") return activeRelease.cssVariables.root;
    return activeRelease.cssVariables.themes[cssSystemSelect] || activeRelease.cssVariables.root;
  };

  // Get current Style Dictionary file content based on file select
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
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-[#09090d] font-sans overflow-hidden select-none">
      {/* Header Bar */}
      <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/80 px-6 flex items-center justify-between bg-white dark:bg-[#0c0c10] flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-zinc-900 dark:text-white">
                Releases & Build Artifacts
              </h1>
              {activeRelease && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 font-mono font-bold text-[11px]">
                  {activeRelease.version}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Compiled production CSS variables, Style Dictionary bundles, and mobile assets
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2.5">
          {activeRelease && (
            <button
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Download ZIP Bundle</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Release</span>
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      {releases.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            No Releases Created Yet
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
            Create your first versioned release to automatically generate CSS variables, Style Dictionary packages, and multi-platform distribution files.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Release</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Version History Sidebar */}
          <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c10] flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
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
                    className={`group relative p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "bg-violet-50/80 dark:bg-violet-950/30 border-violet-300 dark:border-violet-800/80 shadow-xs"
                        : "border-zinc-200/80 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Tag className={`w-3.5 h-3.5 ${isSelected ? "text-violet-600 dark:text-violet-400" : "text-zinc-400"}`} />
                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-opacity"
                        title="Delete Release"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate mt-1">
                      {rel.title}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-2 font-mono">
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
          <main className="flex-1 flex flex-col bg-zinc-100 dark:bg-[#07070a] overflow-hidden">
            {/* Top Workspace Tab Nav */}
            <div className="h-11 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between bg-white dark:bg-[#0c0c10] flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("css")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "css"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>CSS Variables</span>
                </button>

                <button
                  onClick={() => setActiveTab("styleDict")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "styleDict"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Style Dictionary Multi-Platform</span>
                </button>

                <button
                  onClick={() => setActiveTab("notes")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "notes"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Release Notes</span>
                </button>
              </div>

              {/* Sub-selector toolbar */}
              {activeTab === "css" && activeRelease && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-500">System Scope:</span>
                  <select
                    value={cssSystemSelect}
                    onChange={(e) => setCssSystemSelect(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-medium focus:border-violet-500 focus:outline-none cursor-pointer"
                  >
                    <option value="allCombined">All Systems Combined (:root + Themes)</option>
                    <option value="root">:root (Global Default Scope)</option>
                    {themeGroups.flatMap((g) =>
                      g.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          Theme: {g.name} - {opt.name}
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    onClick={() =>
                      handleCopy(getSelectedCssContent(), `css-${cssSystemSelect}`)
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold border border-zinc-300 dark:border-zinc-700 transition-colors"
                  >
                    {copiedKey === `css-${cssSystemSelect}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy</span>
                  </button>

                  <button
                    onClick={() =>
                      downloadTextFile(getSelectedCssContent(), `tokens-${cssSystemSelect}.css`, "text/css")
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold border border-zinc-300 dark:border-zinc-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.css</span>
                  </button>
                </div>
              )}

              {activeTab === "styleDict" && activeRelease && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-500">File:</span>
                  <select
                    value={styleDictFileSelect}
                    onChange={(e) => setStyleDictFileSelect(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-medium focus:border-violet-500 focus:outline-none cursor-pointer"
                  >
                    <option value="css">dist/web/tokens.css</option>
                    <option value="scss">dist/web/tokens.scss</option>
                    <option value="js">dist/web/tokens.js (ESM)</option>
                    <option value="dts">dist/web/tokens.d.ts (TypeScript)</option>
                    <option value="tailwind">dist/tailwind/tailwind.config.js</option>
                    <option value="ios">dist/ios/Tokens.swift</option>
                    <option value="androidColors">dist/android/values/colors.xml</option>
                    <option value="androidDimens">dist/android/values/dimens.xml</option>
                    <option value="tokensJson">tokens/tokens.json</option>
                    <option value="configJson">config.json</option>
                  </select>

                  <button
                    onClick={() => {
                      const file = getSelectedStyleDictContent();
                      handleCopy(file.content, `sd-${styleDictFileSelect}`);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold border border-zinc-300 dark:border-zinc-700 transition-colors"
                  >
                    {copiedKey === `sd-${styleDictFileSelect}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
              )}
            </div>

            {/* Code / Content Area */}
            <div className="flex-1 overflow-auto p-4">
              {activeTab === "css" && (
                <div className="bg-white dark:bg-[#0b0b10] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 font-mono text-xs shadow-sm overflow-x-auto">
                  <pre className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {getSelectedCssContent()}
                  </pre>
                </div>
              )}

              {activeTab === "styleDict" && (
                <div className="bg-white dark:bg-[#0b0b10] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 font-mono text-xs shadow-sm overflow-x-auto">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-500">
                    <span>{getSelectedStyleDictContent().filename}</span>
                    <span>Ready for Style Dictionary Build</span>
                  </div>
                  <pre className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {getSelectedStyleDictContent().content}
                  </pre>
                </div>
              )}

              {activeTab === "notes" && activeRelease && (
                <div className="max-w-2xl bg-white dark:bg-[#0b0b10] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5 text-zinc-900 dark:text-zinc-100">
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-mono font-bold text-xs">
                        {activeRelease.version}
                      </span>
                      <h2 className="text-base font-bold">{activeRelease.title}</h2>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2 font-mono">
                      <span>Published: {new Date(activeRelease.createdAt).toLocaleString()}</span>
                      {activeRelease.branch && <span>Branch: {activeRelease.branch}</span>}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                      Release Notes
                    </h3>
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                      {activeRelease.notes || "No release notes provided."}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                      Distribution Stats
                    </h3>
                    <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                        <div className="text-zinc-500 text-[10px]">Total Tokens</div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                          {activeRelease.tokenCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                        <div className="text-zinc-500 text-[10px]">Active Themes</div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                          {activeRelease.themesCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                        <div className="text-zinc-500 text-[10px]">Generated Files</div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                          10 Files
                        </div>
                      </div>
                    </div>
                  </div>
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
