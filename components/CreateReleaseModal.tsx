"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  compileCssVariables,
  compileStyleDictionary,
  ReleasePackage,
} from "@/utils/releaseCompiler";
import {
  X,
  Sparkles,
  Package,
  CheckCircle2,
  FileCode2,
  Layers,
  ArrowRight,
} from "lucide-react";

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

  // Determine latest version for automatic SemVer bumping
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Create New Release</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Package design tokens into production CSS variables & Style Dictionary builds
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePublish} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Version SemVer Picker */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Release Version (SemVer)
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-40 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono font-bold text-sm focus:border-violet-500 focus:outline-none"
                required
              />

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVersion(bumpSemVer(version, "patch"))}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold transition-colors"
                >
                  + Patch
                </button>
                <button
                  type="button"
                  onClick={() => setVersion(bumpSemVer(version, "minor"))}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold transition-colors"
                >
                  + Minor
                </button>
                <button
                  type="button"
                  onClick={() => setVersion(bumpSemVer(version, "major"))}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold transition-colors"
                >
                  + Major
                </button>
              </div>
            </div>
          </div>

          {/* Release Title */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Release Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Core Color Palette & Typography Scale"
              className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs focus:border-violet-500 focus:outline-none"
              required
            />
          </div>

          {/* Release Notes */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Release Notes / Changelog
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe changes in this release..."
              className="w-full p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono focus:border-violet-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Compilation Targets */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Generated Target Systems
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeCss}
                  onChange={(e) => setIncludeCss(e.target.checked)}
                  className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <FileCode2 className="w-4 h-4 text-violet-500" />
                    <span>CSS Variables Engine</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Compiles <code className="font-mono">:root</code> tokens and individual theme classes (<code className="font-mono">.theme-dark</code>, <code className="font-mono">.theme-light</code>).
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeStyleDict}
                  onChange={(e) => setIncludeStyleDict(e.target.checked)}
                  className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>Style Dictionary Multi-Platform Build</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Builds Web (CSS/SCSS/JS/TS), Tailwind Config, iOS Swift, Android XML & <code className="font-mono">config.json</code>.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Summary Stat Pill */}
          <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/60 rounded-xl p-3.5 flex items-center justify-between text-xs text-violet-900 dark:text-violet-200">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Compilation Scope:</span>
            </div>
            <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
              <span>{resolvedTokens.length} Tokens</span>
              <span>•</span>
              <span>{themeGroups.reduce((acc, g) => acc + g.options.length, 0)} Themes</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCompiling || (!includeCss && !includeStyleDict)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isCompiling ? (
                <>Compiling Release...</>
              ) : (
                <>
                  <span>Compile & Publish</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
