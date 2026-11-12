"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useTokenStore } from "@/store/useTokenStore";
import { Button } from "@/components/ui/button";
import { useDialogs } from "@/components/DialogProvider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
}

type ApiKeyManagerProps = {
  onTokenCreated?: (token: string) => void;
  credentialType?: "personal" | "mcp_project";
  orgId?: string;
  projectId?: string;
  projectName?: string;
};

export const ApiKeysManager: React.FC<ApiKeyManagerProps> = ({
  onTokenCreated,
  credentialType = "personal",
  orgId,
  projectId,
  projectName,
}) => {
  const dialogs = useDialogs();
  const { addToast } = useTokenStore();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Create Key Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [scopeRead, setScopeRead] = useState(true);
  const [scopeWrite, setScopeWrite] = useState(false);
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
          credentialType,
          orgId,
          projectId,
        }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        setCreatedSecret(data.token);
        onTokenCreated?.(data.token);
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
    const confirmed = await dialogs.confirm({
      title: `Revoke "${name}"?`,
      description: "Any Figma plugin or CLI using this key will be disconnected.",
      confirmLabel: "Revoke key",
      destructive: true,
    });
    if (!confirmed) {
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
    <div className="space-y-6 font-sans text-xs text-foreground">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <span>Personal Access Tokens (PATs)</span>
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            Use PATs to authenticate the Tokens Platform private Figma plugin, CLI scripts, and CI/CD pipelines.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setCreatedSecret(null);
            setIsCreating(true);
          }}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Generate New Key</span>
        </Button>
      </div>

      {/* Secret Reveal Modal / Card */}
      {createdSecret && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Personal Access Token Created!</span>
          </div>
          <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
            Please copy this key now. For your security, you will not be able to see it again.
          </p>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              readOnly
              value={createdSecret}
              className="flex-1 font-mono text-xs select-all font-semibold"
            />
            <Button
              size="sm"
              onClick={() => handleCopy(createdSecret, "new-secret")}
              className="gap-1.5"
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
            </Button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      {isCreating && !createdSecret && (
        <form
          onSubmit={handleCreateKey}
          className="p-4 rounded-xl bg-muted/40 border border-border space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-bold text-foreground">New Personal Access Token</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Token Name</Label>
              <Input
                id="key-name"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. My Figma Plugin Key"
                className="text-xs"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Expiration</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days (Recommended)</SelectItem>
                  {credentialType === "personal" && <SelectItem value="never">No expiration</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Permissions / Scopes</Label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={scopeRead}
                  onChange={(e) => setScopeRead(e.target.checked)}
                  className="rounded text-primary focus:ring-ring"
                />
                <span>read:tokens (Pull tokens & themes)</span>
              </label>

              {credentialType === "personal" && (
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={scopeWrite}
                    onChange={(e) => setScopeWrite(e.target.checked)}
                    className="rounded text-primary focus:ring-ring"
                  />
                  <span>write:tokens (Push updates)</span>
                </label>
              )}
            </div>
            {credentialType === "mcp_project" && (
              <p className="text-[11px] text-muted-foreground">
                This MCP credential is read-only and bound to {projectName || "the selected project"}.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="submit" size="sm">
              Generate Token
            </Button>
          </div>
        </form>
      )}

      {/* Keys Table */}
      <div className="border border-border rounded-xl overflow-x-auto bg-card">
        {keys.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Key className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-xs text-foreground">No API Keys Generated</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Create your first Personal Access Token to connect external tools.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-0 sm:min-w-[560px] text-left text-xs border-collapse">
              <thead className="bg-muted/60 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Name & Key Prefix</th>
                  <th className="py-2.5 px-4">Scopes</th>
                  <th className="py-2.5 px-4">Created</th>
                  <th className="py-2.5 px-4">Expires</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-[11px]">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-sans font-bold text-xs text-foreground">
                        {k.name}
                      </div>
                      <div className="text-muted-foreground text-[10px] mt-0.5 font-mono">{k.keyPrefix}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-sans">
                        {k.scopes.map((s) => (
                          <Badge key={s} variant="violet" className="text-[10px] py-0 px-1.5 font-sans">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-sans">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-sans">
                      {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKey(k.id, k.name)}
                        className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                        title="Revoke Token"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quickstart API Documentation Snippet */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span>Figma Plugin & CLI Quickstart</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Authenticate HTTP requests with your PAT using the Bearer token authorization header:
        </p>

        <div className="bg-muted p-3 rounded-lg border border-border font-mono text-[11px] text-foreground overflow-x-auto select-all">
          curl -X GET &quot;http://localhost:3000/api/v1/tokens&quot; \<br />
          &nbsp;&nbsp;-H &quot;Authorization: Bearer sec_pat_live_...&quot;
        </div>
      </div>
    </div>
  );
};
