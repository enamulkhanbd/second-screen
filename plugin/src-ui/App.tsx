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
  ChevronUp,
  Sun,
  Moon,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  ShieldCheck,
  Zap,
  Unlink,
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

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
    id: "org-default",
    name: "My Organization",
    projects: [
      { id: "proj-main", name: "Design System", description: "Core brand variables & tokens" },
    ],
  },
];

interface LogEntry {
  id: string;
  text: string;
  type: "normal" | "success" | "error";
  time: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pull" | "push" | "settings">("pull");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [showPat, setShowPat] = useState(false);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  // Magic Pairing State
  const [pairCode, setPairCode] = useState<string>("");
  const [connectUrl, setConnectUrl] = useState<string>("");
  const [isGeneratingPair, setIsGeneratingPair] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [config, setConfig] = useState<PluginConfig>({
    serverUrl: "http://localhost:3000",
    pat: "",
    orgId: "org-default",
    projectId: "proj-main",
    createVariables: true,
    createStyles: true,
    createPaintStyles: true,
  });

  const [orgs, setOrgs] = useState<Org[]>(DEFAULT_ORGS);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking">("checking");

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      text: "Tokens Platform companion plugin initialized.",
      type: "normal",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    },
  ]);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const isPaired = Boolean(config.pat);

  const addLog = (text: string, type: "normal" | "success" | "error" = "normal") => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs((prev) => [...prev.slice(-50), { id: Math.random().toString(), text, type, time }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themeMode]);

  // Request saved config from Figma clientStorage
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: "GET_SAVED_CONFIG" } }, "*");

    const handleMessage = async (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      if (msg.type === "SAVED_CONFIG") {
        if (msg.payload) {
          setConfig((prev) => ({ ...prev, ...msg.payload }));
          if (msg.payload.pat) {
            setConnectionStatus("connected");
            if (msg.payload.serverUrl) {
              fetchWorkspaces(msg.payload.serverUrl, msg.payload.pat);
            }
          } else {
            setConnectionStatus("disconnected");
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
          `✓ Successfully synced ${msg.payload.variablesCount} variables & ${msg.payload.stylesCount} styles to Figma!`,
          "success"
        );
        setIsSyncing(false);
      }

      if (msg.type === "EXPORTED_TOKENS") {
        addLog(`Pushing scanned tokens to Tokens Platform Cloud [${config.orgId}/${config.projectId}]...`, "normal");
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
            addLog(`✓ Successfully published ${data.tokenCount || "all"} tokens to Cloud!`, "success");
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

  // Request new pairing code from backend
  const requestPairingCode = async (server = config.serverUrl) => {
    setIsGeneratingPair(true);
    const cleanUrl = (server || "http://localhost:3000").replace(/\/+$/, "");
    try {
      const res = await fetch(`${cleanUrl}/api/v1/auth/pair`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.code) {
        setPairCode(data.code);
        setConnectUrl(data.connectUrl || `${cleanUrl}/connect?code=${data.code}`);
        addLog(`Generated pairing code: ${data.code}`, "normal");
      }
    } catch (err: any) {
      addLog(`Cannot reach ${cleanUrl} to generate pair code. Ensure web server is running.`, "error");
    } finally {
      setIsGeneratingPair(false);
    }
  };

  // Generate pairing code when unlinked
  useEffect(() => {
    if (!config.pat && !pairCode && !isManualMode) {
      requestPairingCode();
    }
  }, [config.pat, pairCode, isManualMode]);

  // Poll pairing status every 2 seconds when pair code is active
  useEffect(() => {
    if (!pairCode || config.pat) return;

    const interval = setInterval(async () => {
      const cleanUrl = (config.serverUrl || "http://localhost:3000").replace(/\/+$/, "");
      try {
        const res = await fetch(`${cleanUrl}/api/v1/auth/pair?code=${pairCode}`);
        const data = await res.json();

        if (data.status === "approved" && data.pat) {
          const updatedConfig: PluginConfig = {
            ...config,
            pat: data.pat,
            orgId: data.orgId || config.orgId,
            projectId: data.projectId || config.projectId,
            serverUrl: data.serverUrl || config.serverUrl,
          };

          setConfig(updatedConfig);
          setConnectionStatus("connected");
          parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updatedConfig } }, "*");

          addLog(`✓ Magic Paired! Connected to ${data.orgName || "Workspace"} / ${data.projectName || "Project"}.`, "success");
          fetchWorkspaces(updatedConfig.serverUrl, updatedConfig.pat);
          clearInterval(interval);
        } else if (data.status === "expired") {
          addLog("Pairing code expired. Refreshing...", "normal");
          requestPairingCode();
        }
      } catch {
        // Silent poll error
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pairCode, config]);

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
          addLog(`Discovered ${data.orgs.length} cloud organizations.`, "normal");
        }
      }
    } catch {
      // Fallback silently
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnectionStatus("checking");
    addLog(`Testing connection to ${config.serverUrl}...`, "normal");
    try {
      const cleanUrl = (config.serverUrl || "http://localhost:3000").replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/api/v1/tokens`, {
        headers: {
          "Content-Type": "application/json",
          ...(config.pat ? { Authorization: `Bearer ${config.pat}` } : {}),
        },
      });
      if (res.ok) {
        setConnectionStatus("connected");
        addLog("✓ Connection verified successfully!", "success");
      } else {
        setConnectionStatus("disconnected");
        addLog(`Connection test returned status ${res.status}`, "error");
      }
    } catch (err: any) {
      setConnectionStatus("disconnected");
      addLog(`Cannot reach server: ${err.message}`, "error");
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSaveSettings = () => {
    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: config } }, "*");
    addLog("Configuration saved to Figma client storage.", "success");
    if (config.pat) {
      fetchWorkspaces(config.serverUrl, config.pat);
    }
  };

  const handleDisconnect = () => {
    const unlinkedConfig: PluginConfig = {
      ...config,
      pat: "",
    };
    setConfig(unlinkedConfig);
    setConnectionStatus("disconnected");
    setPairCode("");
    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: unlinkedConfig } }, "*");
    addLog("Disconnected workspace session.", "normal");
    setIsManualMode(false);
  };

  const handleCopyLink = () => {
    if (!connectUrl) return;
    navigator.clipboard.writeText(connectUrl);
    setCopiedLink(true);
    addLog("Copied pairing link to clipboard.", "normal");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handlePullTokens = async () => {
    setIsSyncing(true);
    addLog("Fetching tokens from Tokens Platform Cloud API...", "normal");
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

      addLog(`Received ${data.resolvedTokens?.length || 0} tokens. Syncing into Figma collections...`, "normal");

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
    addLog("Scanning Figma Variables collections and Text Styles...", "normal");
    parent.postMessage({ pluginMessage: { type: "EXPORT_FIGMA_TO_TOKENS" } }, "*");
  };

  const currentOrg = orgs.find((o) => o.id === config.orgId) || orgs[0];
  const currentProject = currentOrg?.projects?.find((p) => p.id === config.projectId) || currentOrg?.projects?.[0];

  const filteredOrgs = orgs
    .map((org) => ({
      ...org,
      projects: org.projects.filter(
        (p) =>
          p.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
          org.name.toLowerCase().includes(modalSearch.toLowerCase())
      ),
    }))
    .filter((org) => org.projects.length > 0);

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground select-none font-sans overflow-hidden antialiased">
      {/* 1. Header with App Branding, Status Pill & Theme Switcher */}
      <header className="h-12 px-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs tracking-tight text-foreground">Tokens Platform</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 font-medium">
              Plugin
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-medium">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-emerald-500 animate-pulse"
                  : connectionStatus === "checking"
                  ? "bg-amber-500 animate-spin"
                  : "bg-destructive"
              }`}
            />
            <span className="capitalize">{connectionStatus}</span>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
            className="h-7 w-7 rounded-md"
            title={themeMode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {themeMode === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            )}
          </Button>
        </div>
      </header>

      {/* UNLINKED MAGIC PAIRING SCREEN */}
      {!isPaired && !isManualMode ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center space-y-4">
          <Card className="border-border shadow-md">
            <CardHeader className="text-center pb-2 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <Badge variant="violet" className="gap-1 text-[9px] mb-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>One-Click Pairing</span>
                </Badge>
                <CardTitle className="text-sm font-bold">Connect to Web App</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  Authorize this Figma file with your Tokens Platform workspace in seconds.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-1">
              {/* 6-Digit Code Display */}
              <div className="p-3 rounded-xl bg-muted/60 border border-border text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Pairing Code
                </span>
                <div className="font-mono text-2xl font-black tracking-widest text-primary flex items-center justify-center gap-2">
                  <span>{pairCode || (isGeneratingPair ? "••••••" : "GENERATING")}</span>
                  <button
                    onClick={() => requestPairingCode()}
                    disabled={isGeneratingPair}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    title="Generate New Code"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPair ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Status Pulse */}
              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground py-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>Waiting for authorization in browser...</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {connectUrl && (
                  <a
                    href={connectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-colors"
                  >
                    <span>Open Web &amp; Connect</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="w-full text-xs font-semibold gap-1.5 h-8"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Link Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Magic Link</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-3 border-t border-border flex justify-center">
              <button
                onClick={() => setIsManualMode(true)}
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <span>Or connect manually with Personal Access Token (PAT)</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <>
          {/* 2. Target Workspace Selector Card */}
          <div
            onClick={() => setIsSwitchModalOpen(true)}
            className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between text-xs cursor-pointer hover:bg-muted/70 transition-colors flex-shrink-0"
          >
            <div className="flex items-center gap-2 truncate">
              <FolderGit2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <div className="flex items-center gap-1 truncate text-[11px]">
                <span className="text-muted-foreground">Workspace:</span>
                <span className="font-semibold text-foreground truncate">
                  {currentOrg?.name} / {currentProject?.name}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 font-medium">
              <span>Switch</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </Badge>
          </div>

          {/* 3. Shadcn Segmented Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-4 pt-2 pb-2 border-b border-border bg-card/50">
              <TabsList className="grid grid-cols-3 w-full h-8 bg-muted/70 p-0.5 rounded-lg border border-border">
                <TabsTrigger
                  value="pull"
                  className="text-xs font-semibold rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all"
                >
                  Pull Tokens
                </TabsTrigger>
                <TabsTrigger
                  value="push"
                  className="text-xs font-semibold rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all"
                >
                  Push Variables
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="text-xs font-semibold rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all"
                >
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: PULL TOKENS */}
            <TabsContent value="pull" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
              <Card className="border-border shadow-xs">
                <CardHeader className="p-3.5 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-primary/10 text-primary">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-bold">Sync Scope</CardTitle>
                      <CardDescription className="text-[11px]">
                        Select which elements to generate in this Figma file.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 pt-1 space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold">Figma Variables</Label>
                      <p className="text-[10px] text-muted-foreground">Colors, dimensions, spacing, border radiuses</p>
                    </div>
                    <Switch
                      checked={config.createVariables}
                      onCheckedChange={(c) => setConfig((p) => ({ ...p, createVariables: c }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold">Typography Text Styles</Label>
                      <p className="text-[10px] text-muted-foreground">Composite fonts, font weights, line-heights</p>
                    </div>
                    <Switch
                      checked={config.createStyles}
                      onCheckedChange={(c) => setConfig((p) => ({ ...p, createStyles: c }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold">Solid Paint Styles</Label>
                      <p className="text-[10px] text-muted-foreground">Legacy Figma color fill styles</p>
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
                className="w-full gap-2 text-xs font-bold h-10 shadow-md"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Syncing into Figma...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Pull Tokens to Figma Document</span>
                  </>
                )}
              </Button>
            </TabsContent>

            {/* TAB 2: PUSH VARIABLES */}
            <TabsContent value="push" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
              <Card className="border-border shadow-xs">
                <CardHeader className="p-3.5 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-primary/10 text-primary">
                      <Upload className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-bold">Publish Local Variables</CardTitle>
                      <CardDescription className="text-[11px]">
                        Extract Figma Collections and sync them to Tokens Platform Cloud.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 pt-1 space-y-2">
                  <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Destination Org:</span>
                      <span className="font-semibold text-foreground">{currentOrg?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Target Project:</span>
                      <span className="font-semibold text-foreground">{currentProject?.name}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
                    Tokens will be compiled into W3C Design Tokens Community Group (DTCG) standard JSON format.
                  </p>
                </CardContent>
              </Card>

              <Button
                onClick={handlePushTokens}
                disabled={isPushing}
                className="w-full gap-2 text-xs font-bold h-10 shadow-md"
              >
                {isPushing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting & Pushing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Push Figma Variables to Cloud</span>
                  </>
                )}
              </Button>
            </TabsContent>

            {/* TAB 3: SETTINGS */}
            <TabsContent value="settings" className="flex-1 overflow-y-auto p-4 space-y-3.5 m-0">
              {/* Magic Re-Pair Callout */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <span>Magic Quick Connect</span>
                    <Badge variant="violet" className="text-[9px] px-1 py-0">Active</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Paired with {currentOrg?.name} / {currentProject?.name}.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-xs h-7 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Unlink className="w-3 h-3" />
                  <span>Disconnect</span>
                </Button>
              </div>

              {/* Server URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Server API URL</Label>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConn}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    {isTestingConn && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                    <span>Test Connection</span>
                  </button>
                </div>
                <Input
                  type="text"
                  value={config.serverUrl}
                  onChange={(e) => setConfig((p) => ({ ...p, serverUrl: e.target.value }))}
                  placeholder="http://localhost:3000"
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* PAT */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Personal Access Token (PAT)</Label>
                <div className="relative">
                  <Input
                    type={showPat ? "text" : "password"}
                    value={config.pat}
                    onChange={(e) => setConfig((p) => ({ ...p, pat: e.target.value }))}
                    placeholder="sec_pat_..."
                    className="h-8 text-xs font-mono pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPat(!showPat)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPat ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Organization Select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Organization</Label>
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
                    <SelectValue placeholder="Select organization" />
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

              {/* Project Select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project</Label>
                <Select
                  value={config.projectId}
                  onValueChange={(val) => setConfig((p) => ({ ...p, projectId: val }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select project" />
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

              <div className="pt-1 flex gap-2">
                <Button
                  onClick={handleSaveSettings}
                  className="flex-1 text-xs font-bold h-8"
                >
                  Save Configuration
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsManualMode(false)}
                  className="text-xs h-8"
                >
                  Back to Magic Pair
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* 4. Real-time Activity Log Terminal Drawer */}
      <div
        className={`border-t border-border bg-card flex flex-col flex-shrink-0 transition-all duration-200 ${
          isLogExpanded ? "h-48" : "h-20"
        }`}
      >
        <div className="px-3 py-1.5 border-b border-border bg-muted/40 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-2 font-bold text-muted-foreground uppercase tracking-wider">
            <span>Activity Log</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0">
              {logs.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearLogs}
              className="text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-1"
              title="Clear log history"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
            <button
              onClick={() => setIsLogExpanded(!isLogExpanded)}
              className="text-muted-foreground hover:text-foreground"
              title={isLogExpanded ? "Collapse Log" : "Expand Log"}
            >
              {isLogExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div ref={logContainerRef} className="flex-1 overflow-y-auto p-2.5 space-y-1 font-mono text-[10px]">
          {logs.length === 0 ? (
            <div className="text-muted-foreground/60 italic text-center py-2">No activity recorded.</div>
          ) : (
            logs.map((item) => (
              <div
                key={item.id}
                className={`leading-relaxed flex items-start gap-1.5 ${
                  item.type === "success"
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : item.type === "error"
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <span className="opacity-50 flex-shrink-0 text-[9px]">[{item.time}]</span>
                <span className="flex-1 break-words">{item.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Target Project Switcher Modal */}
      <Dialog open={isSwitchModalOpen} onOpenChange={setIsSwitchModalOpen}>
        <DialogContent className="max-w-xs p-4 gap-3">
          <DialogHeader className="p-0 text-left">
            <DialogTitle className="text-xs font-bold">Switch Target Project</DialogTitle>
            <DialogDescription className="text-[11px]">
              Select which organization and project to sync.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter organizations & projects..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-3 pt-1">
            {filteredOrgs.map((org) => (
              <div key={org.id} className="space-y-1">
                <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider block px-1">
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
                          addLog(`Switched target project to ${org.name} / ${proj.name}`, "normal");
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
