"use client";

import React, { useState } from "react";
import {
  Download,
  CheckCircle2,
  Lock,
  LogIn,
} from "lucide-react";
import { useTokenStore } from "@/store/useTokenStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/AuthModal";

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
            <h5 className="font-bold text-foreground text-xs">One-Click Magic Connect</h5>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Launch the plugin in Figma, click <strong>Connect</strong>, or enter the 6-digit code below to instantly pair your workspace.
            </p>
          </div>
        </div>
      </div>

      {/* Quick 6-Digit Code Pairing Section */}
      <QuickPairWidget />

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

const QuickPairWidget: React.FC = () => {
  const { addToast, currentOrg, currentProject, userOrgs, currentUser } = useTokenStore();
  const [pairCode, setPairCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairedSuccess, setPairedSuccess] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const activeOrg = currentOrg || userOrgs[0];
  const activeProj = currentProject;

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const clean = pairCode.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    setPairedSuccess(false);

    try {
      const pat = `sec_pat_figma_${Math.random().toString(36).substring(2, 14)}`;
      const res = await fetch("/api/v1/auth/pair", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: clean,
          pat,
          orgId: activeOrg?.id || "org-default",
          projectId: activeProj?.id || "proj-main",
          orgName: activeOrg?.name || "My Organization",
          projectName: activeProj?.name || "Design System",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to pair");
      }

      setPairedSuccess(true);
      setPairCode("");
      addToast({
        type: "success",
        title: "Figma Plugin Paired!",
        message: `Successfully connected code ${clean} to ${activeOrg?.name || "Workspace"}.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Pairing Failed",
        message: err.message || "Invalid or expired pairing code.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
            <span>Pair Companion Plugin</span>
            <Badge variant="violet" className="text-[9px] px-1 py-0">
              Instant Connect
            </Badge>
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Type the 6-digit code shown inside your Figma plugin to connect instantly.
          </p>
        </div>
      </div>

      {!currentUser ? (
        <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>Sign in to link companion plugins to your workspace.</span>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAuthOpen(true)}
            className="text-xs font-semibold h-7 gap-1"
          >
            <LogIn className="w-3 h-3" />
            <span>Sign In</span>
          </Button>
        </div>
      ) : (
        <form onSubmit={handlePair} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. TK-8492"
            value={pairCode}
            onChange={(e) => setPairCode(e.target.value.toUpperCase())}
            maxLength={10}
            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono tracking-wider uppercase focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          <Button
            type="submit"
            size="sm"
            disabled={loading || !pairCode.trim()}
            className="text-xs font-semibold gap-1.5"
          >
            <span>{loading ? "Connecting..." : "Pair Plugin"}</span>
          </Button>
        </form>
      )}

      {pairedSuccess && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Figma companion plugin authorized! Switch to Figma to start syncing.</span>
        </div>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        title="Sign In to Pair Plugin"
        subtitle="Sign in with your Google account to connect your Figma plugin."
      />
    </div>
  );
};
