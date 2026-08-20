"use client";

import React, { useState, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  X,
  Copy,
  Check,
  Download,
  FileCode,
  FileJson,
  Sparkles,
  Code2,
} from "lucide-react";
import {
  generateCssVariables,
  generateTailwindConfig,
  generateStyleDictionaryJson,
} from "@/utils/dashboardHelpers";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-[#0e0e13] select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Export Design Tokens
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Generate production-ready code formats from your current token state.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50/40 dark:bg-zinc-950/40">
          <button
            onClick={() => setActiveTab("css")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "css"
                ? "border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>CSS Variables</span>
          </button>

          <button
            onClick={() => setActiveTab("tailwind")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "tailwind"
                ? "border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Tailwind Config</span>
          </button>

          <button
            onClick={() => setActiveTab("styledict")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "styledict"
                ? "border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Style Dictionary JSON</span>
          </button>
        </div>

        {/* Code Preview Box */}
        <div className="flex-1 overflow-hidden p-6 bg-zinc-950/90 dark:bg-[#09090d]">
          <div className="w-full h-80 rounded-2xl bg-[#0d0d12] border border-zinc-800 p-4 overflow-auto font-mono text-xs text-zinc-200 leading-relaxed selection:bg-emerald-500/30">
            <pre>{exportedCode}</pre>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-[#0e0e13] flex items-center justify-between select-none">
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            File: <span className="font-bold text-zinc-800 dark:text-zinc-200">{fileName}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {fileName}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
