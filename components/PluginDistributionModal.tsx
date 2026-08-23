"use client";

import React, { useState } from "react";
import {
  Download,
  CheckCircle2,
} from "lucide-react";
import { useTokenStore } from "@/store/useTokenStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const PluginDistributionModal: React.FC = () => {
  const { addToast } = useTokenStore();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = "/api/v1/plugin/download";
      link.download = "tokens-platform-figma-plugin.zip";
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
    <div className="space-y-6 font-sans text-xs text-foreground">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="violet" className="text-[10px] font-bold">
              Private Companion Plugin
            </Badge>
            <span className="text-muted-foreground font-mono text-[10px]">v0.1.0</span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1.5">
            Tokens Platform for Figma
          </h3>
          <p className="text-muted-foreground mt-1 max-w-lg leading-relaxed text-[11px]">
            Sync your design tokens bi-directionally between Tokens Platform Cloud and native Figma Variables, Theme Modes, Paint Styles, and Text Styles.
          </p>
        </div>

        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="gap-2 flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? "Preparing ZIP..." : "Download Plugin (.ZIP)"}</span>
        </Button>
      </div>

      {/* 3-Step Setup Instructions */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Installation Guide (Figma Desktop)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
              1
            </div>
            <h5 className="font-bold text-foreground text-xs">Extract ZIP Bundle</h5>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Download and unzip <code className="font-mono bg-muted px-1 rounded">tokens-platform-figma-plugin.zip</code> to a permanent folder on your machine.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
              2
            </div>
            <h5 className="font-bold text-foreground text-xs">Import Manifest in Figma</h5>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              In Figma Desktop, go to <strong>Menu ➔ Plugins ➔ Development ➔ Import plugin from manifest...</strong> and select <code className="font-mono bg-muted px-1 rounded">manifest.json</code>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
              3
            </div>
            <h5 className="font-bold text-foreground text-xs">Connect with PAT</h5>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Launch the plugin, paste your Personal Access Token from the <strong>Cloud API Keys</strong> tab, and click <strong>Pull Tokens</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5">
        <h4 className="font-bold text-xs text-foreground">Plugin Capabilities</h4>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
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
