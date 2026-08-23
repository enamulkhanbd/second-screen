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
  Cloud,
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

const PRODUCTION_APP_URL = "https://tokensplatform.enamulkhan.com";

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

const DEFAULT_ORGS: Org[] = [];

interface LogEntry {
  id: string;
  text: string;
  type: "normal" | "success" | "error";
  time: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pull" | "push" | "settings">("pull");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [isLogExpanded, setIsLogExpanded] = useState(false);

  // Magic Pairing State
  const [pairCode, setPairCode] = useState<string>("");
  const [connectUrl, setConnectUrl] = useState<string>("");
  const [isGeneratingPair, setIsGeneratingPair] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [config, setConfig] = useState<PluginConfig>({
    serverUrl: PRODUCTION_APP_URL,
    pat: "",
    orgId: "",
    projectId: "",
    createVariables: true,
    createStyles: true,
    createPaintStyles: true,
  });

  const [orgs, setOrgs] = useState<Org[]>(DEFAULT_ORGS);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
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
          const loadedServer = PRODUCTION_APP_URL; // Always prioritize production domain
          setConfig((prev) => ({ ...prev, ...msg.payload, serverUrl: loadedServer }));
          if (msg.payload.pat) {
            setConnectionStatus("connected");
            fetchWorkspaces(loadedServer, msg.payload.pat);
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
        addLog(`Publishing scanned tokens to Cloud Workspace [${config.orgId}/${config.projectId}]...`, "normal");
        try {
          const query =
            config.orgId && config.projectId
              ? `?orgId=${encodeURIComponent(config.orgId)}&projectId=${encodeURIComponent(config.projectId)}`
              : "";
          const url = `${PRODUCTION_APP_URL}/api/v1/tokens${query}`;

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
  }, [config.pat, config.orgId, config.projectId]);

  // Request new pairing code from backend
  const requestPairingCode = async () => {
    setIsGeneratingPair(true);
    try {
      const res = await fetch(`${PRODUCTION_APP_URL}/api/v1/auth/pair`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.code) {
        setPairCode(data.code);
        setConnectUrl(`${PRODUCTION_APP_URL}/connect?code=${data.code}`);
        addLog(`Generated pairing code: ${data.code}`, "normal");
      }
    } catch (err: any) {
      addLog(`Cannot reach Tokens Platform cloud service: ${err.message}`, "error");
    } finally {
      setIsGeneratingPair(false);
    }
  };

  // Generate pairing code when unlinked
  useEffect(() => {
    if (!config.pat && !pairCode) {
      requestPairingCode();
    }
  }, [config.pat, pairCode]);

  // Poll pairing status every 2 seconds when pair code is active
  useEffect(() => {
    if (!pairCode || config.pat) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${PRODUCTION_APP_URL}/api/v1/auth/pair?code=${pairCode}`);
        const data = await res.json();

        if (data.status === "approved" && data.pat) {
          const orgId = data.orgId || config.orgId || "";
          const projectId = data.projectId || config.projectId || "";
          const orgName = data.orgName || (orgId ? "Organization" : "");
          const projectName = data.projectName || (projectId ? "Project" : "");

          const updatedConfig: PluginConfig = {
            ...config,
            pat: data.pat,
            orgId,
            projectId,
            serverUrl: PRODUCTION_APP_URL,
          };

          setConfig(updatedConfig);
          if (orgId && projectId) {
            setOrgs((prev) => {
              const exists = prev.some((o) => o.id === orgId);
              if (exists) {
                return prev.map((o) =>
                  o.id === orgId
                    ? {
                        ...o,
                        name: orgName || o.name,
                        projects: o.projects.some((p) => p.id === projectId)
                          ? o.projects
                          : [{ id: projectId, name: projectName || "Project" }, ...o.projects],
                      }
                    : o
                );
              }
              return [
                {
                  id: orgId,
                  name: orgName || "Organization",
                  projects: [{ id: projectId, name: projectName || "Project" }],
                },
                ...prev,
              ];
            });
          }

          setConnectionStatus("connected");
          parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updatedConfig } }, "*");

          addLog(`✓ Magic Paired! Connected to ${orgName || "Workspace"}${projectName ? ` / ${projectName}` : ""}.`, "success");
          fetchWorkspaces(PRODUCTION_APP_URL, updatedConfig.pat);
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
      const res = await fetch(`${PRODUCTION_APP_URL}/api/v1/user/orgs`, {
        headers: {
          "Content-Type": "application/json",
          ...(pat ? { Authorization: `Bearer ${pat}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list: Org[] = data.orgs || data.organizations || [];
        if (list && Array.isArray(list) && list.length > 0) {
          setOrgs(list);
          addLog(`Discovered ${list.length} cloud organizations.`, "normal");
        }
      }
    } catch {
      // Fallback silently
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
  };

  const handleCopyLink = () => {
    const linkToCopy = connectUrl || `${PRODUCTION_APP_URL}/connect?code=${pairCode}`;
    navigator.clipboard.writeText(linkToCopy);
    setCopiedLink(true);
    addLog("Copied pairing link to clipboard.", "normal");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handlePullTokens = async () => {
    setIsSyncing(true);
    addLog("Fetching tokens from Tokens Platform Cloud...", "normal");

    try {
      const query =
        config.orgId && config.projectId
          ? `?orgId=${encodeURIComponent(config.orgId)}&projectId=${encodeURIComponent(config.projectId)}`
          : "";
      const res = await fetch(`${PRODUCTION_APP_URL}/api/v1/tokens${query}`, {
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
              Companion
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
            size="sm"
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
            className="h-7 w-7 rounded-md p-0"
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
      {!isPaired ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center space-y-4">
          <Card className="border-border shadow-md">
            <CardHeader className="text-center pb-2 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <Badge variant="violet" className="gap-1 text-[9px] mb-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>One-Click Cloud Pairing</span>
                </Badge>
                <CardTitle className="text-sm font-bold">Connect to Tokens Platform</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  Link this Figma file to your Cloud Workspace in seconds.
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
                <a
                  href={connectUrl || `${PRODUCTION_APP_URL}/connect?code=${pairCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-colors"
                >
                  <span>Open Web &amp; Connect</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

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
                  {currentOrg?.name && currentProject?.name
                    ? `${currentOrg.name} / ${currentProject.name}`
                    : currentProject?.name || currentOrg?.name || (config.orgId || config.projectId ? `${config.orgId} / ${config.projectId}` : "Connected")}
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold">Design Tokens to Figma</CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Cloud Sync
                    </Badge>
                  </div>
                  <CardDescription className="text-[11px]">
                    Fetch token sets &amp; themes from <span className="font-semibold text-foreground">{currentProject?.name || "Cloud Workspace"}</span> and generate native Figma Variables and Styles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Target Project:</span>
                      <span className="font-semibold text-foreground">{currentProject?.name || "None selected"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Active Org:</span>
                      <span className="font-medium text-foreground">{currentOrg?.name || "None selected"}</span>
                    </div>
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
                    <span>Syncing Tokens to Figma...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Pull Tokens to Figma</span>
                  </>
                )}
              </Button>
            </TabsContent>

            {/* TAB 2: PUSH VARIABLES */}
            <TabsContent value="push" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
              <Card className="border-border shadow-xs">
                <CardHeader className="p-3.5 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold">Figma Variables to Tokens</CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Bi-directional
                    </Badge>
                  </div>
                  <CardDescription className="text-[11px]">
                    Scan local Figma collections, modes, colors, dimensions, and aliases, then publish directly to your Cloud Project.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Publish Destination:</span>
                      <span className="font-semibold text-foreground">{currentProject?.name || "Cloud Workspace"}</span>
                    </div>
                  </div>
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
              {/* Cloud Connection Endpoint Status */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-primary" />
                    <span>Tokens Platform Cloud</span>
                    <Badge variant="violet" className="text-[9px] px-1 py-0">Active</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {currentOrg?.name && currentProject?.name ? `Connected to ${currentOrg.name} / ${currentProject.name}.` : "Connected to Tokens Platform Cloud."}
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

              {/* Organization Select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Organization</Label>
                <Select
                  value={config.orgId}
                  onValueChange={(val) => {
                    const o = orgs.find((item) => item.id === val);
                    const updated = {
                      ...config,
                      orgId: val,
                      projectId: o?.projects?.[0]?.id || config.projectId,
                    };
                    setConfig(updated);
                    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
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
                  onValueChange={(val) => {
                    const updated = { ...config, projectId: val };
                    setConfig(updated);
                    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
                  }}
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

              {/* Sync Preferences */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-semibold block">Creation Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium cursor-pointer" htmlFor="create-vars">
                        Figma Variables
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Colors, dimensions, numbers, booleans</p>
                    </div>
                    <Switch
                      id="create-vars"
                      checked={config.createVariables}
                      onCheckedChange={(checked) => {
                        const updated = { ...config, createVariables: checked };
                        setConfig(updated);
                        parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium cursor-pointer" htmlFor="create-styles">
                        Typography Styles
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Generate native Figma Text Styles</p>
                    </div>
                    <Switch
                      id="create-styles"
                      checked={config.createStyles}
                      onCheckedChange={(checked) => {
                        const updated = { ...config, createStyles: checked };
                        setConfig(updated);
                        parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
                      }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* 4. Terminal Activity Drawer */}
      <footer className="border-t border-border bg-card/95 flex-shrink-0 font-mono">
        <div
          onClick={() => setIsLogExpanded(!isLogExpanded)}
          className="h-7 px-3 flex items-center justify-between text-[10px] text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-foreground">Live Activity</span>
            <span>({logs.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearLogs();
              }}
              className="p-1 hover:text-foreground text-[10px]"
              title="Clear Logs"
            >
              Clear
            </button>
            {isLogExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </div>
        </div>

        {isLogExpanded && (
          <div ref={logContainerRef} className="h-28 overflow-y-auto p-2 space-y-1 text-[10px] bg-black/20">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-1.5 ${
                  log.type === "success"
                    ? "text-emerald-500"
                    : log.type === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                <span className="opacity-40 select-none">[{log.time}]</span>
                <span className="flex-1 font-sans">{log.text}</span>
              </div>
            ))}
          </div>
        )}
      </footer>

      {/* Switch Workspace Modal */}
      <Dialog open={isSwitchModalOpen} onOpenChange={setIsSwitchModalOpen}>
        <DialogContent className="max-w-xs p-4 gap-3 font-sans">
          <DialogHeader className="p-0 space-y-1">
            <DialogTitle className="text-xs font-bold">Switch Cloud Workspace</DialogTitle>
            <DialogDescription className="text-[11px]">
              Select which organization and project you want to synchronize.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="Search projects..."
              className="h-7 text-xs pl-7 bg-background"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 p-1">
            {filteredOrgs.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No cloud workspaces found.
              </div>
            ) : (
              filteredOrgs.map((org) => (
                <div key={org.id} className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                    {org.name}
                  </span>
                  <div className="space-y-0.5">
                    {org.projects.map((proj) => {
                      const isSelected = config.orgId === org.id && config.projectId === proj.id;
                      return (
                        <button
                          key={proj.id}
                          onClick={() => {
                            const updated = { ...config, orgId: org.id, projectId: proj.id };
                            setConfig(updated);
                            parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
                            setIsSwitchModalOpen(false);
                            addLog(`Switched active target to ${org.name} / ${proj.name}.`, "normal");
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-bold"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <span className="truncate">{proj.name}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
