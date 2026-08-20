"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { GitCredentials, GitProvider } from "@/types/tokens";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";
import {
  Server,
  Key,
  GitBranch,
  FolderGit2,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  Globe,
  Layers,
} from "lucide-react";
import { ApiKeysManager } from "@/components/ApiKeysManager";
import { PluginDistributionModal } from "@/components/PluginDistributionModal";

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({ isOpen, onClose }) => {
  const { credentials, setCredentials, setRawTokens, setSyncStatus, addToast } = useTokenStore();
  const [modalTab, setModalTab] = useState<"git" | "apikeys" | "plugin">("git");
  const [form, setForm] = useState<GitCredentials>({ ...credentials });
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleProviderChange = (provider: GitProvider) => {
    setForm((prev) => ({
      ...prev,
      provider,
      path: prev.path || "",
      branch: prev.branch || "main",
    }));
    setStatusMessage(null);
  };

  const handleSaveAndFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setLoading(true);

    const sanitized = sanitizeGitCredentials(form);

    if (sanitized.provider === "github" && (!sanitized.repo || !sanitized.pat)) {
      setLoading(false);
      setStatusMessage({
        type: "error",
        text: "Please provide Repository (owner/repo) and Personal Access Token (PAT).",
      });
      return;
    }

    if (sanitized.provider === "azure" && (!sanitized.owner || !sanitized.repo || !sanitized.pat)) {
      setLoading(false);
      setStatusMessage({
        type: "error",
        text: "Please provide Azure Organization, Repository Name, and PAT.",
      });
      return;
    }

    setCredentials(sanitized);
    setSyncStatus("fetching");

    try {
      const res = await fetch("/api/git/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitized),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Fetch failed with status ${res.status}`);
      }

      if (!data.tokens || typeof data.tokens !== "object") {
        throw new Error("Received empty or invalid token structure from Git provider.");
      }

      const { setUserProfile } = useTokenStore.getState();
      if (data.userProfile) {
        setUserProfile(data.userProfile);
      }
      setRawTokens(data.tokens, data.syncMeta);
      setSyncStatus("success");
      const modeText = data.syncMeta?.mode === "folder" ? "folder sets" : "file";
      addToast({
        type: "success",
        title: "Tokens Auto-Discovered & Synced",
        message: `Discovered and loaded ${modeText} from ${form.provider === "github" ? "GitHub" : "Azure DevOps"} (${sanitized.repo}@${sanitized.branch}).`,
      });
      onClose();
    } catch (err: any) {
      setSyncStatus("error", err.message);
      setStatusMessage({ type: "error", text: err.message });
      addToast({
        type: "error",
        title: "Git Sync Failed",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
              {modalTab === "git" ? <FolderGit2 className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Project Settings & Sync</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure Git repositories and Second Screen Cloud API access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-1 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50/50 dark:bg-zinc-950/20">
          <button
            onClick={() => setModalTab("git")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              modalTab === "git"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Git Provider Sync</span>
          </button>

          <button
            onClick={() => setModalTab("apikeys")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              modalTab === "apikeys"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Cloud API Keys (PAT)</span>
          </button>

          <button
            onClick={() => setModalTab("plugin")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              modalTab === "plugin"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Figma Plugin</span>
          </button>
        </div>

        {/* Tab 1: Git Provider Settings */}
        {modalTab === "git" ? (
          <form onSubmit={handleSaveAndFetch} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Provider Tabs */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Git Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleProviderChange("github")}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  form.provider === "github"
                    ? "bg-violet-50 dark:bg-violet-600/20 border-violet-400 dark:border-violet-500 text-violet-700 dark:text-violet-300 shadow-sm shadow-violet-500/20"
                    : "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <Server className="w-4 h-4" />
                GitHub
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange("azure")}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  form.provider === "azure"
                    ? "bg-blue-50 dark:bg-blue-600/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-500/20"
                    : "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <Server className="w-4 h-4" />
                Azure DevOps
              </button>
            </div>
          </div>

          {/* GITHUB FIELDS */}
          {form.provider === "github" ? (
            <>
              {/* Repository */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Repository
                </label>
                <input
                  type="text"
                  required
                  placeholder="owner/repository (e.g. acme/design-tokens or justgo/planet)"
                  value={
                    form.owner && form.repo && !form.repo.includes("/")
                      ? `${form.owner}/${form.repo}`
                      : form.repo || form.owner || ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes("/")) {
                      const [o, r] = val.split("/");
                      setForm({ ...form, owner: o, repo: r || "" });
                    } else {
                      setForm({ ...form, repo: val, owner: "" });
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all font-mono"
                />
              </div>

              {/* Branch & Path Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
                    Branch
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="main"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    File / Folder Path
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. assets/tokens or tokens.json (optional)"
                    value={form.path || ""}
                    onChange={(e) => setForm({ ...form, path: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* PAT */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  required
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={form.pat}
                  onChange={(e) => setForm({ ...form, pat: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all font-mono"
                />
              </div>
            </>
          ) : (
            /* AZURE DEVOPS FIELDS */
            <>
              {/* Azure Org & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. azolvedevops"
                    value={form.owner}
                    onChange={(e) => setForm({ ...form, owner: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JustGo"
                    value={form.project || ""}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Azure Repo */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. planet"
                  value={form.repo}
                  onChange={(e) => setForm({ ...form, repo: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all font-mono"
                />
              </div>

              {/* Branch & Path Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
                    Branch
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="main"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    File / Folder Path
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. assets/tokens/platforms/web (optional)"
                    value={form.path || ""}
                    onChange={(e) => setForm({ ...form, path: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Azure PAT */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Azure DevOps Personal Access Token"
                  value={form.pat}
                  onChange={(e) => setForm({ ...form, pat: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all font-mono"
                />
              </div>
            </>
          )}

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            Tokens and branches are synced directly preserving all raw alias references.
          </p>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                statusMessage.type === "error"
                  ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Connecting & Syncing..." : "Fetch & Sync"}
            </button>
          </div>
        </form>
        ) : modalTab === "apikeys" ? (
          <div className="p-6 overflow-y-auto flex-1">
            <ApiKeysManager />
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1">
            <PluginDistributionModal />
          </div>
        )}
      </div>
    </div>
  );
};
