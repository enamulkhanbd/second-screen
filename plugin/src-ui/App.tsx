import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Download,
  Upload,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  Sparkles,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldCheck,
  Radio,
  Server,
  AlertTriangle,
  AlertCircle,
  X,
  Layers,
  GitBranch,
  FolderGit2,
  LogOut,
  Palette,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const PRODUCTION_APP_URL = "https://tokensplatform.enamulkhan.com";

interface Project {
  id: string;
  name: string;
  description?: string;
  rawTokens?: Record<string, any>;
  themeGroups?: any[];
  branches?: { name: string; title: string; isDefault?: boolean }[];
}

interface Org {
  id: string;
  name: string;
  projects: Project[];
}

interface PluginConfig {
  serverUrl: string;
  pat: string;
  orgId: string;
  projectId: string;
  createVariables: boolean;
  createStyles: boolean;
  createPaintStyles: boolean;
}

interface TokenItem {
  name: string;
  setName: string;
  type: string;
  rawValue: any;
  resolvedValue: any;
}

type PluginView = "CONNECT" | "SELECT_ORG" | "SELECT_PROJECT" | "MAIN";

export const App: React.FC = () => {
  // Navigation & View State
  const [view, setView] = useState<PluginView>("CONNECT");
  const [config, setConfig] = useState<PluginConfig>({
    serverUrl: PRODUCTION_APP_URL,
    pat: "",
    orgId: "",
    projectId: "",
    createVariables: true,
    createStyles: true,
    createPaintStyles: true,
  });

  // Pairing State
  const [pairCode, setPairCode] = useState<string>("");
  const [isGeneratingPair, setIsGeneratingPair] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCustomLink, setShowCustomLink] = useState(false);
  const [customServerInput, setCustomServerInput] = useState("http://localhost:3000");

  // Tenancy Data
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Tokens & Main Studio View State
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [themeGroups, setThemeGroups] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("All Collections");
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [availableBranches, setAvailableBranches] = useState<string[]>(["main"]);
  const [isFetchingTokens, setIsFetchingTokens] = useState(false);

  // Modals & Banners State
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [selectedThemeModes, setSelectedThemeModes] = useState<Record<string, boolean>>({});
  const [isPushWarningOpen, setIsPushWarningOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successCount, setSuccessCount] = useState({ vars: 0, styles: 0 });
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Syncing / Pushing spinners
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  const getServerUrl = (cfgUrl?: string) => {
    let url = (cfgUrl || config.serverUrl || PRODUCTION_APP_URL).trim();
    if (!url) url = PRODUCTION_APP_URL;
    return url.replace(/\/+$/, "");
  };

  /**
   * Safe clipboard copy for Figma sandboxed environment
   */
  const copyToClipboard = (text: string, label: string = "Code") => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    } catch { }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => { });
    }
    parent.postMessage({ pluginMessage: { type: "NOTIFY", payload: `✓ Copied ${label} (${text})` } }, "*");
  };

  // 1. Initial configuration load from Figma clientStorage
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
            // Already paired -> fetch orgs and determine view
            fetchOrgs(loadedServer, msg.payload.pat, msg.payload.orgId, msg.payload.projectId);
          } else {
            setView("CONNECT");
          }
        }
      }

      if (msg.type === "ERROR") {
        setErrorBanner(msg.payload);
        setIsSyncing(false);
        setIsPushing(false);
      }

      if (msg.type === "PULL_SUCCESS") {
        setIsSyncing(false);
        setIsThemeModalOpen(false);
        setSuccessCount({
          vars: msg.payload.variablesCount || tokens.length || 1,
          styles: msg.payload.stylesCount || 0,
        });
        setIsSuccessModalOpen(true);
      }

      if (msg.type === "EXPORTED_TOKENS") {
        // Push local Figma tokens to studio API
        handlePushToApi(msg.payload.rawTokens);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [config.pat, config.serverUrl, tokens.length]);

  // Request a new pairing code from the server
  const requestPairingCode = async (targetServer?: string) => {
    setIsGeneratingPair(true);
    setErrorBanner(null);
    const sUrl = getServerUrl(targetServer);

    try {
      const res = await fetch(`${sUrl}/api/v1/auth/pair`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.code) {
        setPairCode(data.code);
        return data.code;
      } else {
        throw new Error(data.error || "Failed to generate pairing code");
      }
    } catch (err: any) {
      setErrorBanner(`Cannot reach Tokens Platform at ${sUrl}: ${err.message}`);
      return null;
    } finally {
      setIsGeneratingPair(false);
    }
  };

  // Poll pairing status every 2 seconds when pairCode is active and user is connecting
  useEffect(() => {
    if (!pairCode || config.pat || view !== "CONNECT") return;

    const sUrl = getServerUrl();
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${sUrl}/api/v1/auth/pair?code=${pairCode}`);
        const data = await res.json();

        if (data.status === "approved" && data.pat) {
          const pat = data.pat;
          const serverUrl = data.serverUrl || config.serverUrl || PRODUCTION_APP_URL;

          const updatedConfig: PluginConfig = {
            ...config,
            pat,
            serverUrl,
          };
          setConfig(updatedConfig);
          parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updatedConfig } }, "*");

          setIsConnecting(false);
          // Transition to Tenancy selection
          await fetchOrgs(serverUrl, pat);
          clearInterval(interval);
        } else if (data.status === "expired") {
          requestPairingCode(sUrl);
        }
      } catch {
        // Silent poll error
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pairCode, config.pat, view, config.serverUrl]);

  // Handle "CONNECT TO STUDIO" button click
  const handleConnectToStudio = async (customUrl?: string) => {
    setIsConnecting(true);
    setErrorBanner(null);
    const targetUrl = customUrl ? customUrl.trim() : PRODUCTION_APP_URL;

    // Update config server
    const updated = { ...config, serverUrl: targetUrl };
    setConfig(updated);
    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");

    let code = pairCode;
    if (!code) {
      code = await requestPairingCode(targetUrl);
    }

    if (code) {
      const connectUrl = `${targetUrl}/connect?code=${code}`;
      if (typeof window !== "undefined") {
        window.open(connectUrl, "_blank");
      }
    }
  };

  // Fetch user organizations from backend
  const fetchOrgs = async (sUrl: string, pat: string, targetOrgId?: string, targetProjId?: string) => {
    try {
      const res = await fetch(`${sUrl}/api/v1/user/orgs`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pat}`,
        },
      });

      if (!res.ok) {
        throw new Error("Unable to fetch organizations. Session may have expired.");
      }

      const data = await res.json();
      const orgList: Org[] = data.orgs || data.organizations || [];
      setOrgs(orgList);

      if (orgList.length === 0) {
        setView("SELECT_ORG");
        return;
      }

      // Check if previously selected org & project still match
      const matchedOrg = orgList.find((o) => o.id === (targetOrgId || config.orgId));
      if (matchedOrg) {
        setSelectedOrg(matchedOrg);
        const matchedProj = matchedOrg.projects?.find((p) => p.id === (targetProjId || config.projectId));
        if (matchedProj) {
          setSelectedProject(matchedProj);
          fetchTokens(sUrl, pat, matchedOrg.id, matchedProj.id);
          setView("MAIN");
          return;
        }
      }

      // Default to Select Organization screen
      setView("SELECT_ORG");
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to load organizations");
      setView("CONNECT");
    }
  };

  // Fetch design tokens for the selected project
  const fetchTokens = async (
    sUrl?: string,
    pat?: string,
    orgId?: string,
    projectId?: string,
    branch?: string
  ) => {
    setIsFetchingTokens(true);
    setErrorBanner(null);
    const activeServer = getServerUrl(sUrl);
    const activePat = pat || config.pat;
    const activeOrgId = orgId || selectedOrg?.id || config.orgId;
    const activeProjId = projectId || selectedProject?.id || config.projectId;
    const activeBranch = branch || selectedBranch || "main";

    try {
      const query = `?orgId=${encodeURIComponent(activeOrgId)}&projectId=${encodeURIComponent(
        activeProjId
      )}&branch=${encodeURIComponent(activeBranch)}`;

      const res = await fetch(`${activeServer}/api/v1/tokens${query}`, {
        headers: {
          "Content-Type": "application/json",
          ...(activePat ? { Authorization: `Bearer ${activePat}` } : {}),
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}: Failed to fetch tokens`);
      }

      const data = await res.json();
      if (data.success) {
        const resolved: TokenItem[] = data.resolvedTokens || [];
        setTokens(resolved);
        setThemeGroups(data.themeGroups || []);
        if (data.availableBranches && data.availableBranches.length > 0) {
          setAvailableBranches(data.availableBranches.map((b: any) => b.name));
        }

        // Initialize theme modes for checkbox tree
        const modesMap: Record<string, boolean> = {};
        if (Array.isArray(data.themeGroups)) {
          data.themeGroups.forEach((grp: any) => {
            if (Array.isArray(grp.options)) {
              grp.options.forEach((opt: any) => {
                modesMap[`${grp.name}::${opt.name}`] = true;
              });
            }
          });
        }
        setSelectedThemeModes(modesMap);
      } else {
        throw new Error(data.error || "Could not retrieve tokens");
      }
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to fetch tokens from Studio");
    } finally {
      setIsFetchingTokens(false);
    }
  };

  // Push local tokens to Studio API
  const handlePushToApi = async (rawTokens: Record<string, any>) => {
    setIsPushing(true);
    setErrorBanner(null);
    const sUrl = getServerUrl();

    try {
      const activeOrgId = selectedOrg?.id || config.orgId;
      const activeProjId = selectedProject?.id || config.projectId;
      const activeBranch = selectedBranch || "main";
      const query =
        activeOrgId && activeProjId
          ? `?orgId=${encodeURIComponent(activeOrgId)}&projectId=${encodeURIComponent(activeProjId)}&branch=${encodeURIComponent(activeBranch)}`
          : "";

      const res = await fetch(`${sUrl}/api/v1/tokens${query}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.pat ? { Authorization: `Bearer ${config.pat}` } : {}),
        },
        body: JSON.stringify({
          rawTokens,
          source: "figma_plugin",
          isFigmaPlugin: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        parent.postMessage(
          {
            pluginMessage: {
              type: "NOTIFY",
              payload: data.message || `✓ Published ${data.changedCount ?? 0} tokens to Studio!`,
            },
          },
          "*"
        );
        // Refresh tokens in view
        fetchTokens();
      } else {
        throw new Error(data.error || "Failed to push tokens to Studio");
      }
    } catch (err: any) {
      setErrorBanner(err.message || "Push to Studio failed");
    } finally {
      setIsPushing(false);
      setIsPushWarningOpen(false);
    }
  };

  // Trigger sync to Figma Variables
  const handleExecuteSync = () => {
    setIsSyncing(true);
    setErrorBanner(null);

    parent.postMessage(
      {
        pluginMessage: {
          type: "PULL_TOKENS_TO_FIGMA",
          payload: {
            resolvedTokens: tokens,
            themeGroups,
            selectedModes: selectedThemeModes,
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
  };

  // Disconnect & Log out
  const handleLogout = () => {
    const unlinkedConfig: PluginConfig = {
      ...config,
      pat: "",
      orgId: "",
      projectId: "",
    };
    setConfig(unlinkedConfig);
    setSelectedOrg(null);
    setSelectedProject(null);
    setTokens([]);
    setPairCode("");
    setIsConnecting(false);
    setView("CONNECT");
    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: unlinkedConfig } }, "*");
    parent.postMessage({ pluginMessage: { type: "NOTIFY", payload: "Logged out from Tokens Platform" } }, "*");
  };

  // Distinct collections for dropdown filter
  const collectionList = useMemo(() => {
    const set = new Set<string>();
    tokens.forEach((t) => {
      if (t.setName) set.add(t.setName);
    });
    return ["All Collections", ...Array.from(set)];
  }, [tokens]);

  const filteredTokens = useMemo(() => {
    if (selectedCollection === "All Collections") return tokens;
    return tokens.filter((t) => t.setName === selectedCollection);
  }, [tokens, selectedCollection]);

  // --------------------------------------------------------------------------
  // RENDER: SCREEN 1 - CONNECT (Studio or Custom Link)
  // --------------------------------------------------------------------------
  if (view === "CONNECT") {
    return (
      <div className="flex flex-col h-screen w-full bg-[#0d0d12] text-zinc-100 font-sans select-none overflow-y-auto">
        {/* Error Banner */}
        {errorBanner && (
          <div className="bg-rose-950/80 border-b border-rose-800/80 px-3.5 py-2.5 text-xs text-rose-200 flex items-start justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 space-y-6 max-w-sm mx-auto w-full">
          {/* Brand Logo & Heading */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Layers className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Tokens Platform</h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Connect Figma to your design token workspace to pull variables and push updates seamlessly.
            </p>
          </div>

          {/* Option 1: CONNECT TO STUDIO */}
          <div className="w-full space-y-3">
            <Button
              onClick={() => handleConnectToStudio()}
              disabled={isConnecting && !pairCode}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wider rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 uppercase"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>CONNECTING...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>CONNECT TO STUDIO</span>
                </>
              )}
            </Button>

            {/* Generated Code Display Box */}
            {pairCode && (
              <div className="p-3.5 rounded-lg bg-[#15151e] border border-zinc-800 space-y-2 text-center animate-in fade-in duration-200">
                <div className="text-[11px] font-medium text-zinc-400">Device Pairing Code</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-xl font-bold tracking-widest text-indigo-400 selection:bg-indigo-500/30">
                    {pairCode}
                  </span>
                  <button
                    onClick={() => {
                      copyToClipboard(pairCode, "Pairing Code");
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2500);
                    }}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Copy Code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Waiting for authorization in your browser...
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-[1px] bg-zinc-800" />
            <span className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold">or</span>
            <div className="flex-1 h-[1px] bg-zinc-800" />
          </div>

          {/* Option 2: CONNECT TO CUSTOM LINK */}
          <div className="w-full space-y-2">
            <button
              onClick={() => setShowCustomLink(!showCustomLink)}
              className="w-full flex items-center justify-between text-xs font-semibold text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-900/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-zinc-400" />
                <span>Connect to custom link</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCustomLink ? "rotate-180" : ""}`} />
            </button>

            {showCustomLink && (
              <div className="p-3 rounded-lg bg-[#14141c] border border-zinc-800/80 space-y-2.5 animate-in fade-in duration-150">
                <Label className="text-[11px] text-zinc-400">Server Endpoint URL</Label>
                <Input
                  value={customServerInput}
                  onChange={(e) => setCustomServerInput(e.target.value)}
                  placeholder="e.g. localhost:3000"
                  className="h-9 text-xs bg-[#0f0f14] border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-indigo-500 font-mono"
                />
                <Button
                  onClick={() => handleConnectToStudio(customServerInput)}
                  className="w-full h-8 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700"
                >
                  Connect Custom Server
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="py-3 text-center text-[10px] text-zinc-400 border-t border-zinc-900">
          Tokens Platform &copy; 2026. Design Token Bridge.
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SCREEN 2 - SELECT ORGANIZATION (Video 00:05–00:08)
  // --------------------------------------------------------------------------
  if (view === "SELECT_ORG") {
    return (
      <div className="flex flex-col h-screen w-full bg-[#0d0d12] text-zinc-100 font-sans select-none overflow-hidden">
        {/* Header */}
        <header className="h-13 px-4 border-b border-zinc-800/80 flex items-center justify-between bg-[#121217] flex-shrink-0">
          <h1 className="text-sm font-bold text-white tracking-tight">Select Organization</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-[#181822] border-zinc-700 text-zinc-200">
              <DropdownMenuItem onClick={handleLogout} className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer">
                <LogOut className="w-3.5 h-3.5 mr-2" />
                <span>Disconnect / Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Org List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {orgs.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No organizations found for your account.
            </div>
          ) : (
            orgs.map((org) => {
              const projCount = org.projects?.length || 0;
              return (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrg(org);
                    setView("SELECT_PROJECT");
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#15151e] border border-zinc-800/90 hover:border-zinc-700 hover:bg-[#1a1a26] transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xs font-bold uppercase">
                      {org.name.charAt(0) || "O"}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                        {org.name}
                      </div>
                      <div className="text-[10px] text-zinc-400">Organization</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-zinc-400 group-hover:text-zinc-200">
                    <span>{projCount} {projCount === 1 ? "project" : "projects"}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SCREEN 3 - SELECT PROJECT (Video 00:08–00:11)
  // --------------------------------------------------------------------------
  if (view === "SELECT_PROJECT") {
    const projects = selectedOrg?.projects || [];

    return (
      <div className="flex flex-col h-screen w-full bg-[#0d0d12] text-zinc-100 font-sans select-none overflow-hidden">
        {/* Header with Back Arrow */}
        <header className="h-13 px-3 border-b border-zinc-800/80 flex items-center justify-between bg-[#121217] flex-shrink-0">
          <button
            onClick={() => setView("SELECT_ORG")}
            className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-zinc-800/60"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{selectedOrg?.name || "Organizations"}</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-[#181822] border-zinc-700 text-zinc-200">
              <DropdownMenuItem onClick={handleLogout} className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer">
                <LogOut className="w-3.5 h-3.5 mr-2" />
                <span>Disconnect / Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {projects.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No projects found in this organization.
            </div>
          ) : (
            projects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => {
                  setSelectedProject(proj);
                  const updated = {
                    ...config,
                    orgId: selectedOrg?.id || "",
                    projectId: proj.id,
                  };
                  setConfig(updated);
                  parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
                  fetchTokens(config.serverUrl, config.pat, selectedOrg?.id, proj.id);
                  setView("MAIN");
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#15151e] border border-zinc-800/90 hover:border-zinc-700 hover:bg-[#1a1a26] transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center text-xs font-bold uppercase">
                    {proj.name.charAt(0) || "P"}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                      {proj.name}
                    </div>
                    <div className="text-[10px] text-zinc-400">Design Tokens Set</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-zinc-400 group-hover:text-zinc-200">
                  <span>Open project</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SCREEN 4 - COMPANION STUDIO MAIN VIEW (Video 00:12–00:33)
  // --------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen w-full bg-[#0d0d12] text-zinc-100 font-sans select-none overflow-hidden">
      {/* Top Error Alert Banner */}
      {errorBanner && (
        <div className="bg-rose-950/80 border-b border-rose-800/80 px-3 py-2 text-xs text-rose-200 flex items-center justify-between gap-2 z-20 flex-shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="truncate">{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-rose-200 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Bar: [W] web ⌵ Dropdown + Settings Icon */}
      <header className="h-12 px-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-[#121218] flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 text-xs font-bold text-zinc-200 hover:text-white px-2 py-1.5 rounded-lg hover:bg-zinc-800/70 transition-colors">
              <div className="w-5 h-5 rounded bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-[10px] font-bold uppercase">
                {selectedProject?.name?.charAt(0) || "W"}
              </div>
              <span>{selectedProject?.name || "web"}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-[#181822] border-zinc-700 text-zinc-200 shadow-xl">
            <DropdownMenuItem
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.open(getServerUrl(), "_blank");
                }
              }}
              className="text-xs cursor-pointer hover:bg-zinc-700"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-2 text-zinc-400" />
              <span>Open in Studio</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setView("SELECT_PROJECT")}
              className="text-xs cursor-pointer hover:bg-zinc-700"
            >
              <FolderGit2 className="w-3.5 h-3.5 mr-2 text-zinc-400" />
              <span>Switch project</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer hover:bg-zinc-700"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
          <span className="text-[10px] text-zinc-400 font-medium">Connected</span>
        </div>
      </header>

      {/* 2. Collection Filter Bar: Collection Alias ⌵ */}
      <div className="h-10 px-3.5 border-b border-zinc-800/60 bg-[#14141c] flex items-center justify-between flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors">
              <span>{selectedCollection}</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-[#181822] border-zinc-700 text-zinc-200">
            {collectionList.map((col) => (
              <DropdownMenuItem
                key={col}
                onClick={() => setSelectedCollection(col)}
                className={`text-xs cursor-pointer ${selectedCollection === col ? "bg-indigo-600/20 text-indigo-300 font-bold" : ""}`}
              >
                {col}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-[10px] text-zinc-400 font-mono">
          {filteredTokens.length} {filteredTokens.length === 1 ? "token" : "tokens"}
        </span>
      </div>

      {/* 3. Token Table (TOKEN NAME | COLOR) */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Table Header */}
        <div className="h-7 px-4 bg-[#111117] border-b border-zinc-800/80 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex-shrink-0 sticky top-0 z-10">
          <span>TOKEN NAME</span>
          <span>COLOR / VALUE</span>
        </div>

        {/* Table Body */}
        {isFetchingTokens ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-2 text-zinc-500">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
            <span className="text-xs">Fetching tokens from Studio...</span>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-1">
            <p className="text-xs">No tokens found in this collection.</p>
            <p className="text-[11px] text-zinc-600">Click &quot;Push to Studio&quot; to export your local Figma variables.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {filteredTokens.map((token, idx) => {
              const isColor = token.type === "color";
              const displayVal =
                typeof token.rawValue === "string"
                  ? token.rawValue
                  : typeof token.resolvedValue === "string"
                    ? token.resolvedValue
                    : JSON.stringify(token.rawValue ?? "");

              return (
                <div
                  key={`${token.setName}-${token.name}-${idx}`}
                  className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#161622] transition-colors"
                >
                  {/* Left: Swatch + Token Name */}
                  <div className="flex items-center gap-2.5 truncate max-w-[62%]">
                    {isColor ? (
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-zinc-700 flex-shrink-0 shadow-xs"
                        style={{
                          backgroundColor:
                            typeof token.resolvedValue === "string"
                              ? token.resolvedValue
                              : typeof token.rawValue === "string" && !token.rawValue.includes("{")
                                ? token.rawValue
                                : "#818cf8",
                        }}
                      />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] text-zinc-400 font-mono flex-shrink-0">
                        px
                      </div>
                    )}
                    <span className="font-medium text-zinc-200 truncate">{token.name}</span>
                  </div>

                  {/* Right: Alias or Hex string */}
                  <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[36%] text-right">
                    {displayVal}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Footer Bar: ⑂ main ⌵, ↻ Fetch, ↑ Push to Studio, ↓ Sync to Figma */}
      <footer className="h-14 px-3.5 border-t border-zinc-800 bg-[#121218] flex items-center justify-between flex-shrink-0">
        {/* Left: Branch selector + Refresh button */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
                <GitBranch className="w-3 h-3 text-indigo-400" />
                <span>{selectedBranch}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32 bg-[#181822] border-zinc-700 text-zinc-200">
              {availableBranches.map((b) => (
                <DropdownMenuItem
                  key={b}
                  onClick={() => {
                    setSelectedBranch(b);
                    fetchTokens(config.serverUrl, config.pat, selectedOrg?.id, selectedProject?.id, b);
                  }}
                  className={`text-xs cursor-pointer ${selectedBranch === b ? "bg-indigo-600/20 text-indigo-300 font-bold" : ""}`}
                >
                  {b}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => fetchTokens()}
            disabled={isFetchingTokens}
            title="Fetch tokens from Studio"
            className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingTokens ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>

        {/* Right: Push & Sync Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPushWarningOpen(true)}
            disabled={isPushing || isSyncing}
            className="h-8 text-xs font-semibold border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white gap-1 px-2.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Push to Studio</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (themeGroups.length > 0) {
                setIsThemeModalOpen(true);
              } else {
                handleExecuteSync();
              }
            }}
            disabled={isSyncing || isPushing}
            className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white gap-1 px-3 shadow-md shadow-indigo-600/20"
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Sync to Figma</span>
          </Button>
        </div>
      </footer>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL A: Select Themes and Modes to create (Screenshot 1 / Video 00:20) */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog open={isThemeModalOpen} onOpenChange={setIsThemeModalOpen}>
        <DialogContent className="max-w-xs bg-[#15151e] border-zinc-800 text-zinc-100 p-5 font-sans rounded-xl shadow-2xl">
          <DialogHeader className="p-0 space-y-1.5">
            <DialogTitle className="text-sm font-bold text-white">
              Select Themes and Modes to create
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Choose which theme collections and modes will be synchronized to Figma.
            </DialogDescription>
          </DialogHeader>

          {/* Checkbox Tree */}
          <div className="max-h-56 overflow-y-auto space-y-3 py-2">
            {themeGroups.map((grp: any) => (
              <div key={grp.name} className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                  <input
                    type="checkbox"
                    id={`grp-${grp.name}`}
                    checked={
                      grp.options?.every((opt: any) => selectedThemeModes[`${grp.name}::${opt.name}`] !== false) ?? true
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const next = { ...selectedThemeModes };
                      grp.options?.forEach((opt: any) => {
                        next[`${grp.name}::${opt.name}`] = checked;
                      });
                      setSelectedThemeModes(next);
                    }}
                    className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor={`grp-${grp.name}`} className="cursor-pointer">
                    {grp.name}
                  </label>
                </div>

                <div className="pl-5 space-y-1 border-l border-zinc-800 ml-2">
                  {grp.options?.map((opt: any) => {
                    const key = `${grp.name}::${opt.name}`;
                    const isChecked = selectedThemeModes[key] !== false;
                    return (
                      <div key={opt.name} className="flex items-center gap-2 text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          id={key}
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedThemeModes({ ...selectedThemeModes, [key]: e.target.checked });
                          }}
                          className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor={key} className="cursor-pointer hover:text-zinc-200">
                          {opt.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex gap-2 pt-2 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsThemeModalOpen(false)}
              className="w-1/2 h-8 text-xs border-zinc-700 bg-zinc-900 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteSync}
              className="w-1/2 h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Create selected themes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL B: Push to Studio Warning (Screenshot 4)                         */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog open={isPushWarningOpen} onOpenChange={setIsPushWarningOpen}>
        <DialogContent className="max-w-xs bg-[#15151e] border-zinc-800 text-zinc-100 p-5 font-sans rounded-xl shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white">
                Warning: Overwriting Studio Tokens
              </DialogTitle>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Pushing local Figma variables will update cloud tokens. Dynamic variables with alias references will be preserved where possible.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-3 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPushWarningOpen(false)}
              className="w-1/2 h-8 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/30"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                parent.postMessage({ pluginMessage: { type: "EXPORT_FIGMA_TO_TOKENS" } }, "*");
              }}
              disabled={isPushing}
              className="w-1/2 h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white gap-1"
            >
              {isPushing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Proceed</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL C: Create Complete! Success Dialog (Screenshot 5)                */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-xs bg-[#15151e] border border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.2)] text-zinc-100 p-6 font-sans rounded-xl space-y-4 text-center">
          <div className="space-y-1">
            <DialogTitle className="text-base font-bold text-white tracking-tight">
              Create Complete!
            </DialogTitle>
            <p className="text-xs text-zinc-400">
              {successCount.vars} / {successCount.vars} variables
            </p>
          </div>

          {/* Progress Bar (Full gradient) */}
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full" />
          </div>

          {/* Success Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Variables created successfully</span>
          </div>

          <Button
            onClick={() => setIsSuccessModalOpen(false)}
            className="w-full h-8 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
