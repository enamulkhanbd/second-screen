"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Copy,
  Check,
  Download,
  FileCode,
  FileJson,
  Sparkles,
} from "lucide-react";
import {
  generateCssVariables,
  generateTailwindConfig,
  generateStyleDictionaryJson,
} from "@/utils/dashboardHelpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface ExportTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportTokensModal: React.FC<ExportTokensModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { resolvedTokens, rawTokens, themeGroups, addToast } = useTokenStore();
  const [activeTab, setActiveTab] = useState<"css" | "tailwind" | "styledict">("css");
  const [copied, setCopied] = useState(false);

  const exportedCode = useMemo(() => {
    if (activeTab === "css") {
      return generateCssVariables(resolvedTokens, themeGroups);
    }
    if (activeTab === "tailwind") {
      return generateTailwindConfig(resolvedTokens);
    }
    return generateStyleDictionaryJson(rawTokens);
  }, [activeTab, resolvedTokens, rawTokens, themeGroups]);

  const fileName = useMemo(() => {
    if (activeTab === "css") return "tokens.css";
    if (activeTab === "tailwind") return "tailwind.tokens.js";
    return "tokens.json";
  }, [activeTab]);

  const mimeType = useMemo(() => {
    if (activeTab === "css") return "text/css";
    if (activeTab === "tailwind") return "application/javascript";
    return "application/json";
  }, [activeTab]);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(exportedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({
        type: "success",
        title: "Code Copied",
        message: `Copied ${fileName} content to clipboard.`,
      });
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([exportedCode], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({
        type: "success",
        title: "File Downloaded",
        message: `Saved ${fileName} to your downloads.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Download Failed",
        message: err.message,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Export Design Tokens</DialogTitle>
              <DialogDescription className="text-xs">
                Generate production-ready code formats from your current token state.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="px-6 pt-3 pb-2 border-b border-border bg-muted/20 flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
            <TabsList>
              <TabsTrigger value="css" className="gap-1.5 text-xs">
                <FileCode className="w-3.5 h-3.5" />
                <span>CSS Variables</span>
              </TabsTrigger>
              <TabsTrigger value="tailwind" className="gap-1.5 text-xs">
                <FileCode className="w-3.5 h-3.5" />
                <span>Tailwind Config</span>
              </TabsTrigger>
              <TabsTrigger value="styledict" className="gap-1.5 text-xs">
                <FileJson className="w-3.5 h-3.5" />
                <span>Style Dictionary JSON</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs h-8"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              className="gap-1.5 text-xs h-8"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </Button>
          </div>
        </div>

        {/* Code Preview Box */}
        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          <pre className="p-4 rounded-xl bg-card border border-border font-mono text-xs text-foreground overflow-x-auto leading-relaxed">
            <code>{exportedCode}</code>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
};
