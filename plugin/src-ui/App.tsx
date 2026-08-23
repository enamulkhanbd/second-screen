import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Upload,
  RefreshCw,
  Settings,
  FolderGit2,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Sparkles,
  Link,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldCheck,
  Radio,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export const PRODUCTION_APP_URL = "https://tokensplatform.enamulkhan.com";

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
  const [copiedCode, setCopiedCode] = useState(false);

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

  const getServerUrl = (cfgUrl?: string) => {
    let url = (cfgUrl || config.serverUrl || PRODUCTION_APP_URL).trim();
    if (!url) url = PRODUCTION_APP_URL;
    return url.replace(/\/+$/, "");
  };

  const addLog = (text: string, type: "normal" | "success" | "error" = "normal") => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs((prev) => [...prev.slice(-50), { id: Math.random().toString(), text, type, time }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  /**
   * Guaranteed clipboard copy for Figma sandboxed iframes
   */
  const copyToClipboard = (text: string, label: string = "Text"): boolean => {
    let copied = false;
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      el.style.top = "-9999px";
      document.body.appendChild(el);
      el.select();
      el.setSelectionRange(0, 99999);
      copied = document.execCommand("copy");
      document.body.removeChild(el);
    } catch {}

    if (!copied && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
      copied = true;
    }

    // Trigger Figma native toast
    parent.postMessage({ pluginMessage: { type: "NOTIFY", payload: `✓ Copied ${label} (${text})` } }, "*");
    return copied;
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

  const fetchWorkspaces = async (sUrl?: string, pat?: string) => {
    const targetServer = getServerUrl(sUrl);
    const targetPat = pat || config.pat;
    if (!targetPat) return;

    try {
      const res = await fetch(`${targetServer}/api/v1/user/orgs`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${targetPat}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list: Org[] = data.orgs || data.organizations || [];
        if (list && Array.isArray(list) && list.length > 0) {
          setOrgs(list);
          const currentOrgMatch = list.find((o) => o.id === config.orgId);
          if (!config.orgId || !currentOrgMatch) {
            const firstOrg = list[0];
            const firstProj = firstOrg.projects?.[0];
            const updated = {
              ...config,
              orgId: firstOrg.id,
              projectId: firstProj?.id || "",
            };
            setConfig(updated);
            parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
          }
          addLog(`Discovered ${list.length} cloud organizations.`, "normal");
        }
      }
    } catch {
      // Fallback silently
    }
  };

  // Request saved config from Figma clientStorage
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: "GET_SAVED_CONFIG" } }, "*");

    const handleMessage = async (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      if (msg.type === "SAVED_CONFIG") {
        if (msg.payload) {
          const loadedServer = msg.payload.serverUrl || PRODUCTION_APP_URL;
          const updated = { ...config, ...msg.payload, serverUrl: loadedServer };
          setConfig(updated);
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
        const sUrl = getServerUrl();
        addLog(`Publishing scanned tokens to Cloud Workspace [${config.orgId || "active"}]...`, "normal");
        try {
          const query =
            config.orgId && config.projectId
              ? `?orgId=${encodeURIComponent(config.orgId)}&projectId=${encodeURIComponent(config.projectId)}`
              : "";
          const url = `${sUrl}/api/v1/tokens${query}`;

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
  }, [config.pat, config.orgId, config.projectId, config.serverUrl]);

  // Request new pairing code from backend
  const requestPairingCode = async () => {
    setIsGeneratingPair(true);
    const sUrl = getServerUrl();
    try {
      const res = await fetch(`${sUrl}/api/v1/auth/pair`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.code) {
        setPairCode(data.code);
        setConnectUrl(`${PRODUCTION_APP_URL}/connect?code=${data.code}`);
        addLog(`Generated pairing code: ${data.code}`, "normal");
      }
    } catch (err: any) {
      addLog(`Cannot reach Tokens Platform server: ${err.message}`, "error");
    } finally {
      setIsGeneratingPair(false);
    }
  };

  // Generate pairing code when unlinked
  useEffect(() => {
    if (!config.pat && !pairCode) {
      requestPairingCode();
    }
  }, [config.pat, pairCode, config.serverUrl]);

  // Poll pairing status every 2 seconds when pair code is active
  useEffect(() => {
    if (!pairCode || config.pat) return;

    const sUrl = getServerUrl();
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${sUrl}/api/v1/auth/pair?code=${pairCode}`);
        const data = await res.json();

        if (data.status === "approved" && data.pat) {
          const serverUrl = data.serverUrl || config.serverUrl || PRODUCTION_APP_URL;
          const orgId = data.orgId || config.orgId || "";
          const projectId = data.projectId || config.projectId || "";
          const orgName = data.orgName || (orgId ? "Organization" : "");
          const projectName = data.projectName || (projectId ? "Project" : "");

          const updatedConfig: PluginConfig = {
            ...config,
            pat: data.pat,
            orgId,
            projectId,
            serverUrl,
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
          fetchWorkspaces(serverUrl, data.pat);
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
  }, [pairCode, config.pat]);

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
    const linkToCopy = `${PRODUCTION_APP_URL}/connect?code=${pairCode}`;
    copyToClipboard(linkToCopy, "Magic Link");
    setCopiedLink(true);
    addLog("Copied pairing link to clipboard.", "normal");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyCode = () => {
    if (!pairCode) return;
    copyToClipboard(pairCode, "Pairing Code");
    setCopiedCode(true);
    addLog(`Copied pairing code (${pairCode}) to clipboard.`, "normal");
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handlePullTokens = async () => {
    setIsSyncing(true);
    const sUrl = getServerUrl();
    addLog("Fetching tokens from Tokens Platform Cloud...", "normal");

    try {
      const query =
        config.orgId && config.projectId
          ? `?orgId=${encodeURIComponent(config.orgId)}&projectId=${encodeURIComponent(config.projectId)}`
          : "";
      const res = await fetch(`${sUrl}/api/v1/tokens${query}`, {
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

  const currentOrg = orgs.find((o) => o.id === config.orgId) || (orgs.length > 0 ? orgs[0] : null);
  const currentProject = currentOrg?.projects?.find((p) => p.id === config.projectId) || (currentOrg?.projects?.[0] || null);

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

  const productionConnectLink = `${PRODUCTION_APP_URL}/connect?code=${pairCode || ""}`;

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground select-none font-sans overflow-hidden antialiased">
      {/* 1. Header with App Branding, Status Pill & Theme Switcher */}
      <header className="h-12 px-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-xs">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold leading-none tracking-tight flex items-center gap-1.5">
              <span>Tokens Platform</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono font-normal">
                v1.0
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Figma Design Token Bridge</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/60 text-[10px] font-medium">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : connectionStatus === "checking"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-muted-foreground/50"
              }`}
            />
            <span className="capitalize">{connectionStatus}</span>
          </div>

          {/* Theme Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
            className="w-7 h-7 text-muted-foreground hover:text-foreground"
          >
            {themeMode === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </header>

      {/* Main Body */}
      {!isPaired ? (
        /* MAGIC PAIRING FLOW CARD */
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center space-y-4">
          <Card className="w-full border-border shadow-sm">
            <CardHeader className="text-center p-4 pb-2">
              <div className="mx-auto w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <CardTitle className="text-sm font-bold">Connect to Tokens Platform</CardTitle>
              <CardDescription className="text-xs">
                Authorize this Figma document in seconds on production cloud dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              {/* Pairing Code Display */}
              <div className="bg-muted/60 border border-border rounded-xl p-3 text-center space-y-1.5 relative group">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Your 6-Digit Pairing Code
                </span>
                <div className="flex items-center justify-center gap-2">
                  <div
                    onClick={handleCopyCode}
                    className="text-2xl font-mono font-black tracking-widest text-primary selection:bg-primary/20 cursor-pointer hover:opacity-80 transition-opacity"
                    title="Click to copy pairing code"
                  >
                    {isGeneratingPair ? "••••••" : pairCode || "------"}
                  </div>
                  {pairCode && !isGeneratingPair && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyCode}
                      className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Copy pairing code"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {copiedCode ? (
                    <span className="text-emerald-500 font-medium inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> Code copied to clipboard!
                    </span>
                  ) : (
                    "Waiting for approval on web dashboard..."
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <a
                  href={productionConnectLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.open(productionConnectLink, "_blank");
                    }
                  }}
                  className="w-full inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs gap-1.5 cursor-pointer"
                >
                  <span>Authorize in Browser</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <Button
                  variant="outline"
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
                    : currentOrg?.name
                    ? currentOrg.name
                    : currentProject?.name
                    ? currentProject.name
                    : isSyncing || connectionStatus === "checking"
                    ? "Connecting..."
                    : "Select Workspace"}
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
                    Fetch token sets &amp; themes from <span className="font-semibold text-foreground">{currentProject?.name || currentOrg?.name || "Workspace"}</span> and generate native Figma Variables and Styles.
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
                className="w-full h-10 text-xs font-bold gap-2 shadow-xs bg-primary hover:bg-primary/90"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing Collections &amp; Styles...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
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
                    <CardTitle className="text-xs font-bold">Figma Variables to Cloud</CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Export
                    </Badge>
                  </div>
                  <CardDescription className="text-[11px]">
                    Extract local Figma variables, color modes, and typography styles and publish directly to <span className="font-semibold text-foreground">{currentProject?.name || currentOrg?.name || "Workspace"}</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Publish Destination:</span>
                      <span className="font-semibold text-foreground">{currentProject?.name || "Active Workspace"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handlePushTokens}
                disabled={isPushing}
                className="w-full h-10 text-xs font-bold gap-2 shadow-xs bg-primary hover:bg-primary/90"
              >
                {isPushing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting &amp; Publishing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Push Figma to Cloud</span>
                  </>
                )}
              </Button>
            </TabsContent>

            {/* TAB 3: SETTINGS */}
            <TabsContent value="settings" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
              {/* Active Connection & Disconnect */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="text-xs font-bold">Paired Workspace</div>
                      <div className="text-[10px] text-muted-foreground">
                        {currentOrg?.name ? `${currentOrg.name} / ${currentProject?.name || "Project"}` : "Active Session"}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    className="h-7 text-xs px-2.5"
                  >
                    Unlink
                  </Button>
                </div>
              </div>

              {/* Server URL Config */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Server className="w-3 h-3 text-muted-foreground" />
                  <span>Server URL</span>
                </Label>
                <Input
                  value={config.serverUrl}
                  onChange={(e) => {
                    const updated = { ...config, serverUrl: e.target.value };
                    setConfig(updated);
                    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
                  }}
                  placeholder={PRODUCTION_APP_URL}
                  className="h-8 text-xs bg-background"
                />
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
