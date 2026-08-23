"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  compileCssVariables,
  compileTailwindConfig,
  compileFlutterDart,
  compileReactTs,
  compileStyleDictionary,
  downloadReleaseZip,
} from "@/utils/releaseCompiler";
import {
  Download,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Package,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const ExportsView: React.FC = () => {
  const { resolvedTokens, themeGroups, compilerConfig, currentProject, addToast } =
    useTokenStore();

  const [activeTab, setActiveTab] = useState<"tailwind" | "css" | "react" | "flutter" | "json">("tailwind");
  const [copied, setCopied] = useState(false);

  const cssContent = compileCssVariables(resolvedTokens, themeGroups, compilerConfig);
  const tailwindContent = compileTailwindConfig(resolvedTokens, compilerConfig);
  const reactContent = compileReactTs(resolvedTokens, compilerConfig);
  const flutterContent = compileFlutterDart(resolvedTokens, compilerConfig);
  const jsonContent = JSON.stringify(resolvedTokens, null, 2);

  const getActiveContent = () => {
    switch (activeTab) {
      case "tailwind":
        return { filename: "tailwind.tokens.js", code: tailwindContent, lang: "javascript" };
      case "css":
        return { filename: "tokens.css", code: cssContent.allCombined, lang: "css" };
      case "react":
        return { filename: "tokens.ts", code: reactContent, lang: "typescript" };
      case "flutter":
        return { filename: "tokens.dart", code: flutterContent, lang: "dart" };
      case "json":
        return { filename: "tokens.resolved.json", code: jsonContent, lang: "json" };
    }
  };

  const current = getActiveContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    addToast({
      type: "success",
      title: "Code Copied",
      message: `${current.filename} copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([current.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = current.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: "success",
      title: "File Downloaded",
      message: `${current.filename} saved to your device.`,
    });
  };

  const handleDownloadAllZip = () => {
    const dummyRelease = {
      id: "quick-export",
      version: "v1.0.0",
      title: "Quick Export",
      notes: "Direct platform tokens export.",
      createdAt: new Date().toISOString(),
      tokenCount: resolvedTokens.length,
      themesCount: themeGroups.length,
      targetSystems: ["Tailwind", "CSS", "React", "Flutter"],
      compilerConfig,
      cssVariables: cssContent,
      styleDictionary: compileStyleDictionary(resolvedTokens, themeGroups, compilerConfig),
    };

    downloadReleaseZip(dummyRelease);
    addToast({
      type: "success",
      title: "ZIP Downloaded",
      message: "Multi-platform ZIP package created.",
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* Header */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              Token Exports &amp; Platform Code
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Instant multi-platform code generator for {currentProject?.name || "tokens"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAllZip}
            className="gap-1.5 text-xs font-semibold"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Download All (ZIP)</span>
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadFile}
            className="gap-1.5 text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {current.filename}</span>
          </Button>
        </div>
      </header>

      {/* Tabs & Code Inspector */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border pb-3 flex-shrink-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="bg-muted">
              <TabsTrigger value="tailwind" className="text-xs">⚡ Tailwind CSS</TabsTrigger>
              <TabsTrigger value="css" className="text-xs">🎨 CSS Variables</TabsTrigger>
              <TabsTrigger value="react" className="text-xs">⚛️ React / TS</TabsTrigger>
              <TabsTrigger value="flutter" className="text-xs">💙 Flutter Dart</TabsTrigger>
              <TabsTrigger value="json" className="text-xs">📄 JSON</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs font-semibold h-8"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </Button>
        </div>

        {/* Code Box */}
        <div className="flex-1 mt-4 rounded-xl border border-border bg-[#0d0d12] text-zinc-100 font-mono text-xs p-4 overflow-auto leading-relaxed select-text shadow-inner">
          <pre className="whitespace-pre">{current.code}</pre>
        </div>
      </div>
    </div>
  );
};
