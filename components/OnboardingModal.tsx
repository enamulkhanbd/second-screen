"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { STARTER_TEMPLATES } from "@/data/starterTemplates";
import {
  Sparkles,
  Layers,
  FolderGit2,
  Upload,
  X,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  ShoppingBag,
  Zap,
  Check,
} from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const { loadStarterTemplate, setRawTokens, addToast, setSidebarTab } = useTokenStore();
  const [activeTab, setActiveTab] = useState<"templates" | "git" | "import">("templates");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("saas-modern");
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleApplyTemplate = (templateId: string) => {
    loadStarterTemplate(templateId);
    setSidebarTab("dashboard");
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        setRawTokens(parsed, {
          mode: "file",
          targetPath: file.name,
        });

        addToast({
          type: "success",
          title: "Tokens Imported Successfully",
          message: `Loaded tokens from "${file.name}".`,
        });

        setSidebarTab("dashboard");
        onClose();
      } catch (err: any) {
        addToast({
          type: "error",
          title: "Import Failed",
          message: "Invalid JSON format. Please upload a valid Tokens Studio JSON file.",
        });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Welcome to Second Screen</h2>
                <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-[10px] font-bold">
                  v0.1.0-beta
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Choose how you want to initialize your design token workspace
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 pt-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2">
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "templates"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span>Design System Starters</span>
          </button>

          <button
            onClick={() => setActiveTab("git")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "git"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Connect Git Repository</span>
          </button>

          <button
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "import"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-500" />
            <span>Import JSON</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 overflow-y-auto flex-1">
          {/* 1. STARTER TEMPLATES */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {STARTER_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;

                  const getIcon = () => {
                    if (tpl.category === "saas") return <Zap className="w-4 h-4 text-violet-500" />;
                    if (tpl.category === "ecommerce") return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
                    if (tpl.category === "mobile") return <Smartphone className="w-4 h-4 text-sky-500" />;
                    return <ShieldCheck className="w-4 h-4 text-amber-500" />;
                  };

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-violet-50/60 dark:bg-violet-950/20 border-violet-500 shadow-md ring-1 ring-violet-500/20"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-[#0c0c10]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getIcon()}
                            <h3 className="font-bold text-xs text-zinc-900 dark:text-white">
                              {tpl.name}
                            </h3>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                        {/* Swatches */}
                        <div className="flex items-center -space-x-1">
                          {tpl.swatches.map((hex, idx) => (
                            <div
                              key={idx}
                              className="w-5 h-5 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>

                        <div className="text-[10px] font-mono text-zinc-400">
                          <span>{tpl.tokenCount} tokens</span>
                          <span className="mx-1">•</span>
                          <span>{tpl.themesCount} themes</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action */}
              <div className="pt-4 flex items-center justify-end">
                <button
                  onClick={() => handleApplyTemplate(selectedTemplateId)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer"
                >
                  <span>Launch with Selected Template</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 2. CONNECT GIT */}
          {activeTab === "git" && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <FolderGit2 className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold">Connect your Git Provider</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Direct bi-directional sync with Azure DevOps, GitHub, GitLab, or Bitbucket. Tokens are loaded live with zero local caching.
                </p>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <span>Configure Git Credentials</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 3. IMPORT TOKENS */}
          {activeTab === "import" && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <label className="w-full max-w-md border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-violet-500 dark:hover:border-violet-500 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-zinc-50/50 dark:bg-zinc-900/30">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isImporting}
                />
                <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {isImporting ? "Parsing Token File..." : "Click to browse or drop tokens.json"}
                </span>
                <span className="text-[11px] text-zinc-400 mt-1">
                  Supports Tokens Studio exported JSON documents
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
