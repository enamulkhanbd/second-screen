"use client";

import React, { useState } from "react";
import {
  Layers,
  Download,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FolderDown,
  Terminal,
  FileCode,
  Copy,
  Check,
} from "lucide-react";
import { useTokenStore } from "@/store/useTokenStore";

export const PluginDistributionModal: React.FC = () => {
  const { addToast } = useTokenStore();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = "/api/v1/plugin/download";
      link.download = "second-screen-figma-plugin.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        type: "success",
        title: "Download Started",
        message: "Figma Plugin ZIP bundle downloaded.",
      });
    } catch {
      addToast({
        type: "error",
        title: "Download Failed",
        message: "Failed to download Figma plugin ZIP.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-xs text-zinc-800 dark:text-zinc-200">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-transparent border border-violet-500/20 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold">
              Private Companion Plugin
            </span>
            <span className="text-zinc-400 font-mono text-[10px]">v0.1.0</span>
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-1.5">
            Second Screen for Figma
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg leading-relaxed text-[11px]">
            Sync your design tokens bi-directionally between Second Screen Cloud and native Figma Variables, Theme Modes, Paint Styles, and Text Styles.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? "Preparing ZIP..." : "Download Plugin (.ZIP)"}</span>
        </button>
      </div>

      {/* 3-Step Setup Instructions */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Installation Guide (Figma Desktop)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-xs">
              1
            </div>
            <h5 className="font-bold text-zinc-900 dark:text-white text-xs">Extract ZIP Bundle</h5>
            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
              Download and unzip <code className="font-mono">second-screen-figma-plugin.zip</code> to a permanent folder on your machine.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
              2
            </div>
            <h5 className="font-bold text-zinc-900 dark:text-white text-xs">Import Manifest in Figma</h5>
            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
              In Figma Desktop, go to <strong>Menu ➔ Plugins ➔ Development ➔ Import plugin from manifest...</strong> and select <code className="font-mono">manifest.json</code>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
              3
            </div>
            <h5 className="font-bold text-zinc-900 dark:text-white text-xs">Connect with PAT</h5>
            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
              Launch the plugin, paste your Personal Access Token from the <strong>Cloud API Keys</strong> tab, and click <strong>Pull Tokens</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
        <h4 className="font-bold text-xs text-zinc-900 dark:text-white">Plugin Capabilities</h4>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span>Native Figma Variables (Color, Float, String)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span>Multi-Mode Theme Collections (Dark, Light)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span>Typography Paint & Text Styles with Auto-Font Loader</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span>Bi-directional Export from Figma back to Cloud</span>
          </div>
        </div>
      </div>
    </div>
  );
};
