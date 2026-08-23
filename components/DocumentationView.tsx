"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { FlattenedToken } from "@/types/tokens";
import {
  FileText,
  Search,
  Copy,
  Check,
  Sparkles,
  Download,
  Palette,
  Type,
  Maximize2,
  Box,
  Layers,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const DocumentationView: React.FC = () => {
  const { resolvedTokens, currentOrg, currentProject, addToast } = useTokenStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"all" | "color" | "typography" | "spacing" | "other">("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const colors = useMemo(() => resolvedTokens.filter((t) => t.type === "color"), [resolvedTokens]);
  const typography = useMemo(() => resolvedTokens.filter((t) => t.type === "typography" || t.type.toLowerCase().includes("font")), [resolvedTokens]);
  const spacing = useMemo(() => resolvedTokens.filter((t) => t.type === "spacing" || t.type === "sizing" || t.type === "dimension" || t.type === "borderRadius"), [resolvedTokens]);
  const others = useMemo(() => resolvedTokens.filter((t) => !["color", "typography", "spacing", "sizing", "dimension", "borderRadius"].includes(t.type) && !t.type.toLowerCase().includes("font")), [resolvedTokens]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast({
      type: "success",
      title: "Copied to Clipboard",
      message: `${text} copied.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportMarkdown = () => {
    let md = `# ${currentProject?.name || "Design System"} — Design Tokens Documentation\n\n`;
    md += `*Generated automatically by Tokens Platform for ${currentOrg?.name || "Workspace"} on ${new Date().toLocaleDateString()}*\n\n`;
    md += `## Summary\n- Total Tokens: ${resolvedTokens.length}\n- Colors: ${colors.length}\n- Typography: ${typography.length}\n- Spacing & Dimensions: ${spacing.length}\n\n`;

    md += `## 1. Color Palette\n| Token Name | Resolved Value | Raw Value |\n| :--- | :--- | :--- |\n`;
    colors.forEach((c) => {
      md += `| \`${c.name}\` | \`${c.resolvedValue}\` | \`${c.rawValue}\` |\n`;
    });

    md += `\n## 2. Typography\n| Token Name | Value | Description |\n| :--- | :--- | :--- |\n`;
    typography.forEach((t) => {
      md += `| \`${t.name}\` | \`${typeof t.resolvedValue === "object" ? JSON.stringify(t.resolvedValue) : t.resolvedValue}\` | ${t.description || "-"} |\n`;
    });

    md += `\n## 3. Spacing & Dimensions\n| Token Name | Value |\n| :--- | :--- |\n`;
    spacing.forEach((s) => {
      md += `| \`${s.name}\` | \`${s.resolvedValue}\` |\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(currentProject?.slug || "design-tokens")}-docs.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: "success",
      title: "Markdown Exported",
      message: "Living design system documentation downloaded.",
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none">
      {/* Header */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">
                Living Design Token Documentation
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono">
                Beta
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Automated design system specification &amp; guidelines for {currentProject?.name || "tokens"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs w-48 bg-background"
            />
          </div>

          <Button
            size="sm"
            onClick={handleExportMarkdown}
            className="gap-1.5 text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Markdown (.md)</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-7xl mx-auto w-full">
        {/* Colors Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-foreground">Color Palette ({colors.length})</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Theme &amp; Brand Tokens</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {colors
              .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((c) => {
                const isCopied = copiedKey === c.name;
                return (
                  <div
                    key={c.name}
                    onClick={() => handleCopy(c.resolvedValue, c.name)}
                    className="p-2.5 rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer group shadow-xs space-y-2"
                  >
                    <div
                      className="w-full h-16 rounded-lg border border-border/40 shadow-inner flex items-end justify-end p-1.5"
                      style={{ backgroundColor: c.resolvedValue }}
                    >
                      <button className="opacity-0 group-hover:opacity-100 bg-background/90 text-foreground p-1 rounded shadow-xs transition-opacity text-[10px]">
                        {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-xs truncate" title={c.name}>
                        {c.name.split(".").pop()}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground truncate">
                        {c.resolvedValue}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Typography Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-sky-500" />
              <h2 className="text-sm font-bold text-foreground">Typography Scale ({typography.length})</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Font Families &amp; Heading Hierarchy</span>
          </div>

          <div className="space-y-3">
            {typography
              .filter((t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((t) => (
                <div
                  key={t.name}
                  className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground font-mono">{t.name}</span>
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {t.setName}
                      </Badge>
                    </div>
                    <p className="text-lg text-foreground font-medium truncate max-w-lg">
                      The quick brown fox jumps over the lazy dog
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground flex-shrink-0">
                    <code>{typeof t.resolvedValue === "object" ? JSON.stringify(t.resolvedValue) : t.resolvedValue}</code>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* Spacing & Dimensions Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-foreground">Spacing &amp; Sizing ({spacing.length})</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">8pt Grid, Radius &amp; Dimensions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {spacing
              .filter((s) => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((s) => {
                const numericVal = parseInt(String(s.resolvedValue).replace(/[^0-9]/g, "")) || 16;
                const clampedWidth = Math.min(Math.max(numericVal, 8), 120);

                return (
                  <div
                    key={s.name}
                    className="p-3.5 rounded-xl border border-border bg-card space-y-2 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground font-mono truncate">
                        {s.name.split(".").pop()}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {s.resolvedValue}
                      </Badge>
                    </div>
                    <div className="h-4 bg-muted/60 rounded flex items-center px-1">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${clampedWidth}px` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </div>
  );
};
