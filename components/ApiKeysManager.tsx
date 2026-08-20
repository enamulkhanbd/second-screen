"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Code2,
  Terminal,
  Clock,
  Sparkles,
} from "lucide-react";
import { useTokenStore } from "@/store/useTokenStore";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
}

export const ApiKeysManager: React.FC = () => {
  const { addToast } = useTokenStore();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Create Key Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [scopeRead, setScopeRead] = useState(true);
  const [scopeWrite, setScopeWrite] = useState(true);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/auth/pat");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.keys)) {
          setKeys(data.keys);
        }
      }
    } catch {
      // Gracefully handle
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const scopes: string[] = [];
    if (scopeRead) scopes.push("read:tokens");
    if (scopeWrite) scopes.push("write:tokens");

    try {
      const res = await fetch("/api/v1/auth/pat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes,
          expiresInDays: expiresInDays === "never" ? 0 : parseInt(expiresInDays),
        }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        setCreatedSecret(data.token);
        fetchKeys();
        addToast({
          type: "success",
          title: "API Key Generated",
          message: "Make sure to copy your Personal Access Token now.",
        });
      } else {
        throw new Error(data.error || "Failed to generate key");
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Key Generation Failed",
        message: err.message,
      });
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Revoke API key "${name}"? This will disconnect any Figma plugin or CLI using this key.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/auth/pat?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchKeys();
        addToast({
          type: "info",
          title: "API Key Revoked",
          message: `Key "${name}" has been permanently revoked.`,
        });
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Revocation Failed",
        message: err.message,
      });
    }
  };

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 font-sans text-xs text-zinc-800 dark:text-zinc-200">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-violet-500" />
            <span>Personal Access Tokens (PATs)</span>
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-[11px]">
            Use PATs to authenticate the Second Screen private Figma plugin, CLI scripts, and CI/CD pipelines.
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedSecret(null);
            setIsCreating(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Generate New Key</span>
        </button>
      </div>

      {/* Secret Reveal Modal / Card */}
      {createdSecret && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Personal Access Token Created!</span>
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            Please copy this key now. For your security, you will not be able to see it again.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={createdSecret}
              className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-700 font-mono text-xs text-emerald-900 dark:text-emerald-200 select-all font-semibold"
            />
            <button
              onClick={() => handleCopy(createdSecret, "new-secret")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-xs cursor-pointer"
            >
              {copiedKey === "new-secret" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Key</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Create Key Dialog */}
      {isCreating && !createdSecret && (
        <form
          onSubmit={handleCreateKey}
          className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
            <span className="font-bold text-zinc-900 dark:text-white">New Personal Access Token</span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Token Name
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. My Figma Plugin Key"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs focus:border-violet-500 focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Expiration
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs focus:border-violet-500 focus:outline-none cursor-pointer"
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days (Recommended)</option>
                <option value="never">No expiration</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Permissions / Scopes
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scopeRead}
                  onChange={(e) => setScopeRead(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span>read:tokens (Pull tokens & themes)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scopeWrite}
                  onChange={(e) => setScopeWrite(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span>write:tokens (Push updates)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-xs transition-all cursor-pointer"
            >
              Generate Token
            </button>
          </div>
        </form>
      )}

      {/* Keys Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0c0c10]">
        {keys.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <Key className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">No API Keys Generated</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Create your first Personal Access Token to connect external tools.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Name & Key Prefix</th>
                <th className="py-2.5 px-4">Scopes</th>
                <th className="py-2.5 px-4">Created</th>
                <th className="py-2.5 px-4">Expires</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-[11px]">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-sans font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      {k.name}
                    </div>
                    <div className="text-zinc-400 text-[10px] mt-0.5 font-mono">{k.keyPrefix}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 font-sans">
                      {k.scopes.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[10px] font-semibold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-500 font-sans">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-zinc-500 font-sans">
                    {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      onClick={() => handleDeleteKey(k.id, k.name)}
                      className="p-1 text-zinc-400 hover:text-rose-500 rounded transition-colors"
                      title="Revoke Token"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quickstart API Documentation Snippet */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
          <Terminal className="w-3.5 h-3.5 text-violet-400" />
          <span>Figma Plugin & CLI Quickstart</span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Authenticate HTTP requests with your PAT using the Bearer token authorization header:
        </p>

        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-emerald-400 overflow-x-auto select-all">
          curl -X GET &quot;http://localhost:3000/api/v1/tokens&quot; \<br />
          &nbsp;&nbsp;-H &quot;Authorization: Bearer sec_pat_live_...&quot;
        </div>
      </div>
    </div>
  );
};
