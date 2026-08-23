import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Upload,
  Settings,
  FolderGit2,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Link2,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface PluginConfig {
  serverUrl: string;
  pat: string;
  orgId: string;
  projectId: string;
  createVariables: boolean;
  createStyles: boolean;
  createPaintStyles: boolean;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface Org {
  id: string;
  name: string;
  projects: Project[];
}

const DEFAULT_ORGS: Org[] = [
  {
    id: "org-acme",
    name: "Acme Corp",
    projects: [
      { id: "proj-main-ds", name: "Design System", description: "Core brand variables & tokens" },
      { id: "proj-web-app", name: "Web App UI", description: "App semantic overrides" },
    ],
  },
  {
    id: "org-marketing",
    name: "Marketing & Growth",
    projects: [
      { id: "proj-landing", name: "Landing Pages", description: "Hero & promotional tokens" },
    ],
  },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pull" | "push" | "settings">("pull");
  const [config, setConfig] = useState<PluginConfig>({
    serverUrl: "http://localhost:3000",
    pat: "",
    orgId: "org-acme",
    projectId: "proj-main-ds",
    createVariables: true,
    createStyles: true,
    createPaintStyles: true,
  });

  const [orgs, setOrgs] = useState<Org[]>(DEFAULT_ORGS);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [logs, setLogs] = useState<{ id: string; text: string; type: "normal" | "success" | "error" }[]>([
    { id: "1", text: "Tokens Platform plugin ready.", type: "normal" },
  ]);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (text: string, type: "normal" | "success" | "error" = "normal") => {
    setLogs((prev) => [...prev.slice(-40), { id: Math.random().toString(), text, type }]);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Request saved config from Figma clientStorage
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: "GET_SAVED_CONFIG" } }, "*");

    const handleMessage = async (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      if (msg.type === "SAVED_CONFIG") {
        if (msg.payload) {
          setConfig((prev) => ({ ...prev, ...msg.payload }));
          if (msg.payload.pat && msg.payload.serverUrl) {
            fetchWorkspaces(msg.payload.serverUrl, msg.payload.pat);
          }
        }
      }

      if (msg.type === "LOG") {
        addLog(msg.payload, "normal");
      }

      if (msg.type === "ERROR") {
        addLog(msg.payload, "error");
        setIsSyncing(false);
        setIsPushing(false);
      }

      if (msg.type === "PULL_SUCCESS") {
        addLog(
          `✓ Successfully synced ${msg.payload.variablesCount} variables & ${msg.payload.stylesCount} styles!`,
          "success"
        );
        setIsSyncing(false);
      }

      if (msg.type === "EXPORTED_TOKENS") {
        addLog(`Pushing scanned tokens to Cloud [${config.orgId}/${config.projectId}]...`, "normal");
        try {
          const query =
            config.orgId && config.projectId
              ? `?orgId=${encodeURIComponent(config.orgId)}&projectId=${encodeURIComponent(config.projectId)}`
              : "";
          const url = `${config.serverUrl.replace(/\/+$/, "")}/api/v1/tokens${query}`;

          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(config.pat ? { Authorization: `Bearer ${config.pat}` } : {}),
            },
            body: JSON.stringify({ rawTokens: msg.payload.rawTokens }),
          });

          const data = await res.json();
          if (data.success) {
            addLog(`✓ Successfully pushed ${data.tokenCount} tokens to Cloud!`, "success");
          } else {
            addLog(`Push failed: ${data.error}`, "error");
          }
        } catch (err: any) {
          addLog(`Network error: ${err.message}`, "error");
        } finally {
          setIsPushing(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [config.serverUrl, config.pat, config.orgId, config.projectId]);

  const fetchWorkspaces = async (sUrl: string, pat: string) => {
    try {
      const cleanUrl = (sUrl || "http://localhost:3000").replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/api/v1/user/orgs`, {
        headers: {
          "Content-Type": "application/json",
          ...(pat ? { Authorization: `Bearer ${pat}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.orgs && Array.isArray(data.orgs) && data.orgs.length > 0) {
          setOrgs(data.orgs);
          addLog(`Discovered ${data.orgs.length} organizations from API.`, "normal");
        }
      }
    } catch {
      // Fallback silently to defaults
    }
  };

  const handleSaveSettings = () => {
    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: config } }, "*");
    addLog("Saved configuration to Figma storage.", "success");
    if (config.pat) {
      fetchWorkspaces(config.serverUrl, config.pat);
    }
  };

  const handlePullTokens = async () => {
    setIsSyncing(true);
    addLog("Connecting to Tokens Platform Cloud API...");
    const cleanUrl = (config.serverUrl || "http://localhost:3000").replace(/\/+$/, "");

    try {
      const query =
        config.orgId && config.projectId
          ? `?orgId=${encodeURIComponent(config.orgId)}&projectId=${encodeURIComponent(config.projectId)}`
          : "";
      const res = await fetch(`${cleanUrl}/api/v1/tokens${query}`, {
        headers: {
          "Content-Type": "application/json",
          ...(config.pat ? { Authorization: `Bearer ${config.pat}` } : {}),
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch tokens");
      }

      addLog(`Received ${data.resolvedTokens.length} tokens. Injecting into document...`, "normal");

      parent.postMessage(
        {
          pluginMessage: {
            type: "PULL_TOKENS_TO_FIGMA",
            payload: {
              rawTokens: data.rawTokens,
              resolvedTokens: data.resolvedTokens,
              themeGroups: data.themeGroups,
              options: {
                createVariables: config.createVariables,
                createStyles: config.createStyles,
                createPaintStyles: config.createPaintStyles,
              },
            },
          },
        },
        "*"
      );
    } catch (err: any) {
      addLog(`Pull failed: ${err.message}`, "error");
      setIsSyncing(false);
    }
  };

  const handlePushTokens = () => {
    setIsPushing(true);
    addLog("Scanning Figma document variables and styles...", "normal");
    parent.postMessage({ pluginMessage: { type: "EXPORT_FIGMA_TO_TOKENS" } }, "*");
  };

  const currentOrg = orgs.find((o) => o.id === config.orgId) || orgs[0];
  const currentProject = currentOrg?.projects?.find((p) => p.id === config.projectId) || currentOrg?.projects?.[0];

  const filteredOrgs = orgs.map((org) => ({
    ...org,
    projects: org.projects.filter(
      (p) =>
        p.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
        org.name.toLowerCase().includes(modalSearch.toLowerCase())
    ),
  })).filter((org) => org.projects.length > 0);

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground select-none font-sans overflow-hidden">
      {/* 1. Header */}
      <header className="h-12 px-4 border-b border-border flex items-center justify-between bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
            T
          </div>
          <span className="font-bold text-xs tracking-tight">Tokens Platform</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Connected</span>
        </div>
      </header>

      {/* 2. Target Workspace Bar */}
      <div
        onClick={() => setIsSwitchModalOpen(true)}
        className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between text-xs cursor-pointer hover:bg-muted/70 transition-colors"
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-muted-foreground font-medium text-[11px]">Target:</span>
          <span className="font-semibold text-foreground truncate text-[11px]">
            {currentOrg?.name} / {currentProject?.name}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
          <span>Switch</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </Badge>
      </div>

      {/* 3. Navigation Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-4 pt-1 border-b border-border bg-card">
          <TabsList className="w-full justify-start h-9 p-0 bg-transparent border-0 gap-4">
            <TabsTrigger
              value="pull"
              className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-medium"
            >
              Pull to Figma
            </TabsTrigger>
            <TabsTrigger
              value="push"
              className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-medium"
            >
              Push to Cloud
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-medium"
            >
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* VIEW: PULL */}
        <TabsContent value="pull" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          <Card>
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs">Sync Scope</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">Figma Variables</Label>
                  <p className="text-[10px] text-muted-foreground">Colors, dimensions, spacing, radius</p>
                </div>
                <Switch
                  checked={config.createVariables}
                  onCheckedChange={(c) => setConfig((p) => ({ ...p, createVariables: c }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">Typography Text Styles</Label>
                  <p className="text-[10px] text-muted-foreground">Composite fonts, sizes, line-heights</p>
                </div>
                <Switch
                  checked={config.createStyles}
                  onCheckedChange={(c) => setConfig((p) => ({ ...p, createStyles: c }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">Solid Paint Styles</Label>
                  <p className="text-[10px] text-muted-foreground">Legacy color fill styles</p>
                </div>
                <Switch
                  checked={config.createPaintStyles}
                  onCheckedChange={(c) => setConfig((p) => ({ ...p, createPaintStyles: c }))}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handlePullTokens}
            disabled={isSyncing}
            className="w-full gap-2 text-xs font-bold h-9"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing with Cloud...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Pull Tokens to Document</span>
              </>
            )}
          </Button>
        </TabsContent>

        {/* VIEW: PUSH */}
        <TabsContent value="push" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          <Card>
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs">Publish Local Variables</CardTitle>
              <CardDescription className="text-[11px]">
                Scan all document collections and update cloud token repositories.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-2">
              <div className="p-2.5 rounded-lg bg-muted text-[11px] space-y-1 text-muted-foreground font-mono">
                <div className="flex justify-between">
                  <span>Target Cloud Org:</span>
                  <span className="text-foreground font-semibold">{currentOrg?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Project:</span>
                  <span className="text-foreground font-semibold">{currentProject?.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handlePushTokens}
            disabled={isPushing}
            className="w-full gap-2 text-xs font-bold h-9"
          >
            {isPushing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning & Pushing...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Push Variables to Cloud</span>
              </>
            )}
          </Button>
        </TabsContent>

        {/* VIEW: SETTINGS */}
        <TabsContent value="settings" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Server URL</Label>
              <Input
                type="text"
                value={config.serverUrl}
                onChange={(e) => setConfig((p) => ({ ...p, serverUrl: e.target.value }))}
                placeholder="http://localhost:3000"
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Local dev or deployed Vercel domain (e.g. https://your-app.vercel.app)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Personal Access Token (PAT)</Label>
              <Input
                type="password"
                value={config.pat}
                onChange={(e) => setConfig((p) => ({ ...p, pat: e.target.value }))}
                placeholder="sec_pat_..."
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Organization</Label>
              <Select
                value={config.orgId}
                onValueChange={(val) => {
                  const o = orgs.find((item) => item.id === val);
                  setConfig((p) => ({
                    ...p,
                    orgId: val,
                    projectId: o?.projects?.[0]?.id || p.projectId,
                  }));
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Project</Label>
              <Select
                value={config.projectId}
                onValueChange={(val) => setConfig((p) => ({ ...p, projectId: val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentOrg?.projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSaveSettings}
              variant="outline"
              className="w-full text-xs font-semibold h-8 mt-2"
            >
              Save Configuration
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* 4. Real-time Console Log Drawer */}
      <div className="h-20 border-t border-border bg-muted/30 p-2.5 flex flex-col flex-shrink-0 font-mono text-[10px]">
        <div className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider mb-1 flex items-center justify-between">
          <span>Activity Log</span>
          <span>{logs.length} events</span>
        </div>
        <div ref={logContainerRef} className="flex-1 overflow-y-auto space-y-0.5 text-muted-foreground">
          {logs.map((item) => (
            <div
              key={item.id}
              className={`leading-relaxed ${
                item.type === "success"
                  ? "text-emerald-600 font-semibold"
                  : item.type === "error"
                  ? "text-destructive font-semibold"
                  : ""
              }`}
            >
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Switch Modal */}
      <Dialog open={isSwitchModalOpen} onOpenChange={setIsSwitchModalOpen}>
        <DialogContent className="max-w-xs p-4 gap-3">
          <DialogHeader className="p-0">
            <DialogTitle className="text-xs font-bold">Switch Target Project</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter projects..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-3">
            {filteredOrgs.map((org) => (
              <div key={org.id} className="space-y-1">
                <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider block">
                  {org.name}
                </span>
                <div className="space-y-1">
                  {org.projects.map((proj) => {
                    const isSelected = config.orgId === org.id && config.projectId === proj.id;
                    return (
                      <div
                        key={proj.id}
                        onClick={() => {
                          setConfig((p) => ({ ...p, orgId: org.id, projectId: proj.id }));
                          setIsSwitchModalOpen(false);
                          parent.postMessage({
                            pluginMessage: {
                              type: "SAVE_CONFIG",
                              payload: { ...config, orgId: org.id, projectId: proj.id },
                            },
                          });
                        }}
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-semibold"
                            : "bg-card border-border hover:bg-muted"
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{proj.name}</div>
                          {proj.description && (
                            <div className="text-[10px] text-muted-foreground font-normal">
                              {proj.description}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
