"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { STARTER_TEMPLATES } from "@/data/starterTemplates";
import {
  Layers,
  FolderGit2,
  Upload,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  ShoppingBag,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      } catch {
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden font-sans">
        <DialogHeader className="p-6 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold">Welcome to Second Screen</DialogTitle>
                <Badge variant="violet" className="text-[10px]">
                  v0.1.0-beta
                </Badge>
              </div>
              <DialogDescription className="text-xs mt-0.5">
                Choose how you want to initialize your design token workspace
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 pb-2 border-b border-border">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
            <TabsList>
              <TabsTrigger value="templates" className="text-xs gap-1.5">
                <span>Design System Starters</span>
              </TabsTrigger>
              <TabsTrigger value="git" className="text-xs gap-1.5">
                <span>Connect Git Repository</span>
              </TabsTrigger>
              <TabsTrigger value="import" className="text-xs gap-1.5">
                <span>Import JSON</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* 1. STARTER TEMPLATES */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {STARTER_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;

                  const getIcon = () => {
                    if (tpl.category === "saas") return <Zap className="w-4 h-4 text-primary" />;
                    if (tpl.category === "ecommerce") return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
                    if (tpl.category === "mobile") return <Smartphone className="w-4 h-4 text-sky-500" />;
                    return <ShieldCheck className="w-4 h-4 text-amber-500" />;
                  };

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary"
                          : "border-border hover:border-primary/50 bg-card"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getIcon()}
                            <h3 className="font-bold text-xs text-foreground">
                              {tpl.name}
                            </h3>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
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

                        <div className="text-[10px] font-mono text-muted-foreground">
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
                <Button
                  onClick={() => handleApplyTemplate(selectedTemplateId)}
                  className="gap-2 text-xs font-bold"
                >
                  <span>Launch with Selected Template</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* 2. CONNECT GIT */}
          {activeTab === "git" && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <FolderGit2 className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-foreground">Connect your Git Provider</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Direct bi-directional sync with Azure DevOps, GitHub, GitLab, or Bitbucket. Tokens are loaded live with zero local caching.
                </p>
              </div>

              <Button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="gap-2 text-xs font-bold"
              >
                <span>Configure Git Credentials</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* 3. IMPORT TOKENS */}
          {activeTab === "import" && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <label className="w-full max-w-md border-2 border-dashed border-border hover:border-primary rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-muted/20">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isImporting}
                />
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-foreground">
                  {isImporting ? "Parsing Token File..." : "Click to browse or drop tokens.json"}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  Supports Tokens Studio exported JSON documents
                </span>
              </label>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
