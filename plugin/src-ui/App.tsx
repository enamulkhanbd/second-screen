import React, { useState, useEffect, useMemo } from "react";
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
  Server,
  AlertTriangle,
  AlertCircle,
  X,
  Layers,
  GitBranch,
  FolderGit2,
  LogOut,
  CheckCircle2,
  Link2,
  Building2,
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
  color?: string;
  description?: string;
  rawTokens?: Record<string, any>;
  themeGroups?: any[];
  branches?: { name: string; title: string; isDefault?: boolean }[];
}

interface Org {
  id: string;
  name: string;
  color?: string;
  projects: Project[];
}

interface PluginConfig {
  serverUrl: string;
  pat: string;
  orgId: string;
  projectId: string;
  projectName?: string;
  orgName?: string;
  createVariables: boolean;
  createStyles: boolean;
  createPaintStyles: boolean;
  themeMode?: "light" | "dark";
  brandColor?: string;
}

interface TokenItem {
  name: string;
  setName: string;
  type: string;
  rawValue: any;
  resolvedValue: any;
}

type PluginView = "CONNECT" | "SELECT_ORG" | "SELECT_PROJECT" | "MAIN";


/**
 * Convert Hex color string to HSL values for Tailwind CSS variable injection
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace(/^#/, "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (c.length !== 6) return { h: 0, s: 0, l: 9 };
  const num = parseInt(c, 16);
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return {
    h: Math.round(h * 360 * 10) / 10,
    s: Math.round(s * 100 * 10) / 10,
    l: Math.round(l * 100 * 10) / 10,
  };
}

export const App: React.FC = () => {
  // Theme & neutral accent
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");
  const brandColor = "#171717";

  // Navigation & View State
  const [view, setView] = useState<PluginView>("CONNECT");
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
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
  const [selectedCollection, setSelectedCollection] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [availableBranches, setAvailableBranches] = useState<string[]>(["main"]);
  const [isFetchingTokens, setIsFetchingTokens] = useState(false);

  // Copy toast feedback
  const [copiedTokenName, setCopiedTokenName] = useState<string | null>(null);

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

  // Sync themeMode class to <html> / <body>
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themeMode]);

  // Dynamic CSS variables computation for Brand Color
  const dynamicCssVars = useMemo(() => {
    const hsl = hexToHsl(brandColor);
    const accentLightness = themeMode === "dark" ? 98 : hsl.l;
    return {
      "--primary": `${hsl.h} ${hsl.s}% ${accentLightness}%`,
      "--ring": `${hsl.h} ${hsl.s}% ${accentLightness}%`,
      "--primary-foreground": accentLightness <= 65 ? "0 0% 98%" : "0 0% 9%",
    } as React.CSSProperties;
  }, [brandColor, themeMode]);

  const getServerUrl = (cfgUrl?: string) => {
    let url = (cfgUrl || config.serverUrl || PRODUCTION_APP_URL).trim();
    if (!url) url = PRODUCTION_APP_URL;
    return url.replace(/\/+$/, "");
  };

  /**
   * Safe clipboard copy for Figma sandboxed environment
   */
  const copyToClipboard = (text: string, label: string = "Value") => {
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
    } catch {}
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    parent.postMessage({ pluginMessage: { type: "NOTIFY", payload: `Copied ${label}` } }, "*");
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
          delete updated.brandColor;
          setConfig(updated);

          if (msg.payload.themeMode) {
            setThemeMode(msg.payload.themeMode);
          }
          if (msg.payload.pat) {
            // Validate & restore session with saved server
            await fetchOrgs(loadedServer, msg.payload.pat, msg.payload.orgId, msg.payload.projectId);
          } else {
            setIsRestoringSession(false);
            setView("CONNECT");
          }
        } else {
          setIsRestoringSession(false);
          setView("CONNECT");
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
    if (!pairCode || view !== "CONNECT") return;

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
            orgId: data.orgId || "",
            projectId: data.projectId || "",
            orgName: data.orgName || "",
            projectName: data.projectName || "",
            themeMode,
          };
          setConfig(updatedConfig);
          const configSaved = await new Promise<boolean>((resolve) => {
            const timeoutId = window.setTimeout(() => {
              window.removeEventListener("message", onConfigSaved);
              resolve(false);
            }, 5000);
            const onConfigSaved = (event: MessageEvent) => {
              if (event.data?.pluginMessage?.type !== "CONFIG_SAVED") return;
              window.clearTimeout(timeoutId);
              window.removeEventListener("message", onConfigSaved);
              resolve(true);
            };
            window.addEventListener("message", onConfigSaved);
            parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updatedConfig } }, "*");
          });

          if (!configSaved) {
            setIsConnecting(false);
            setErrorBanner("Could not confirm saving the plugin session. Generate a new pairing code and try again.");
            clearInterval(interval);
            return;
          }

          const orgsLoaded = await fetchOrgs(serverUrl, pat, data.orgId, data.projectId);
          setIsConnecting(false);
          if (!orgsLoaded) {
            clearInterval(interval);
            return;
          }

          const ackResponse = await fetch(`${serverUrl}/api/v1/auth/pair`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: pairCode }),
          });
          if (!ackResponse.ok) {
            setErrorBanner("Connected, but could not confirm the pairing with the server. Please retry pairing.");
          }
          clearInterval(interval);
        } else if (data.status === "approved") {
          setIsConnecting(false);
          setPairCode("");
          setErrorBanner("This approval has expired. Generate a new pairing code and approve it again.");
        } else if (data.status === "expired") {
          requestPairingCode(sUrl);
        }
      } catch {
        // Silent poll error
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pairCode, view, config.serverUrl, themeMode]);

  // Handle "CONNECT TO STUDIO" button click
  const handleConnectToStudio = async (customUrl?: string) => {
    setIsConnecting(true);
    setErrorBanner(null);
    const targetUrl = customUrl ? customUrl.trim() : getServerUrl();

    // Clear any stale PAT so new connection starts fresh
    const updated = { ...config, pat: "", serverUrl: targetUrl, themeMode };
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
  const fetchOrgs = async (sUrl: string, pat: string, targetOrgId?: string, targetProjId?: string): Promise<boolean> => {
    try {
      const res = await fetch(`${sUrl}/api/v1/user/orgs`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pat}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        const detail = data.error || "The server rejected the plugin credential.";
        if (res.status === 401 || res.status === 403) {
          throw new Error(`AUTH_EXPIRED:${detail}`);
        }
        throw new Error(`SERVER_ERROR_${res.status}:${detail}`);
      }

      const orgList: Org[] = data.orgs || data.organizations || [];
      setOrgs(orgList);
      setIsOffline(false);
      setErrorBanner(null);

      if (orgList.length === 0) {
        setView("SELECT_ORG");
        return true;
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
          return true;
        }
      }

      // Default to Select Organization screen
      setView("SELECT_ORG");
      return true;
    } catch (err: any) {
      console.warn("fetchOrgs error:", err);
      if (err.message.startsWith("AUTH_EXPIRED:")) {
        const detail = err.message.slice("AUTH_EXPIRED:".length);
        // Genuine auth expiration -> clear token and go to connect
        const cleared = { ...config, pat: "", orgId: "", projectId: "", projectName: "", orgName: "" };
        setConfig(cleared);
        parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: cleared } }, "*");
        setErrorBanner(`Plugin authorization failed: ${detail} Please connect again.`);
        setView("CONNECT");
        return false;
      } else {
        // Transient network failure or server restarting:
        // DO NOT log out! Keep the user connected and preserve their workspace!
        setIsOffline(true);
        setErrorBanner(`Cannot connect to server at ${sUrl}. Working offline.`);
        if (config.projectId || config.projectName) {
          setView("MAIN");
        } else if (config.orgId) {
          setView("SELECT_PROJECT");
        } else {
          setView("SELECT_ORG");
        }
        return false;
      }
    } finally {
      setIsRestoringSession(false);
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
        if (res.status === 401 || res.status === 403) {
          throw new Error("AUTH_EXPIRED");
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}: Failed to fetch tokens`);
      }

      const data = await res.json();
      if (data.success) {
        setIsOffline(false);
        setErrorBanner(null);
        const resolved: TokenItem[] = data.resolvedTokens || [];
        setTokens(resolved);
        setThemeGroups(data.themeGroups || []);

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
      if (err.message === "AUTH_EXPIRED") {
        const cleared = { ...config, pat: "", orgId: "", projectId: "", projectName: "", orgName: "" };
        setConfig(cleared);
        parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: cleared } }, "*");
        setErrorBanner("Your session has expired. Please connect again.");
        setView("CONNECT");
      } else {
        setIsOffline(true);
        setErrorBanner(`Failed to fetch tokens from ${activeServer}: ${err.message}`);
      }
    } finally {
      setIsFetchingTokens(false);
    }
  };

  const fetchBranches = async () => {
    const activeServer = getServerUrl(config.serverUrl);
    const activeOrgId = selectedOrg?.id || config.orgId;
    const activeProjectId = selectedProject?.id || config.projectId;
    if (!activeOrgId || !activeProjectId || !config.pat) return;

    try {
      const query = `?orgId=${encodeURIComponent(activeOrgId)}&projectId=${encodeURIComponent(activeProjectId)}`;
      const response = await fetch(`${activeServer}/api/v1/tokens/branches${query}`, {
        headers: { Authorization: `Bearer ${config.pat}` },
      });
      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data.branches) && data.branches.length > 0) {
        setAvailableBranches(data.branches);
      }
    } catch {}
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
              payload: data.message || `Published ${data.changedCount ?? 0} tokens to Studio`,
            },
          },
          "*"
        );
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
      projectName: "",
      orgName: "",
    };
    setConfig(unlinkedConfig);
    setSelectedOrg(null);
    setSelectedProject(null);
    setTokens([]);
    setPairCode("");
    setIsConnecting(false);
    setIsOffline(false);
    setErrorBanner(null);
    setView("CONNECT");
    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: unlinkedConfig } }, "*");
    parent.postMessage({ pluginMessage: { type: "NOTIFY", payload: "Logged out from Tokens Platform" } }, "*");
  };

  // Distinct collections with token counts
  const collectionStats = useMemo(() => {
    const map = new Map<string, number>();
    tokens.forEach((t) => {
      const sName = t.setName || "default";
      map.set(sName, (map.get(sName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [tokens]);

  // Filtered tokens based on collection & search query
  const filteredTokens = useMemo(() => {
    let list = tokens;
    if (selectedCollection !== "ALL") {
      list = list.filter((t) => t.setName === selectedCollection);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          String(t.rawValue ?? "").toLowerCase().includes(q) ||
          String(t.resolvedValue ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [tokens, selectedCollection, searchQuery]);

  // Helper to persist theme changes
  const saveThemePreferences = (newTheme: "light" | "dark") => {
    setThemeMode(newTheme);
    const updated = { ...config, themeMode: newTheme };
    setConfig(updated);
    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
  };

  // --------------------------------------------------------------------------
  // SHARED HEADER CONTROLS (Theme Mode Sun/Moon & Settings)
  // --------------------------------------------------------------------------
  const renderHeaderActions = (showProjectActions: boolean = true) => (
    <div className="flex items-center gap-1">
      {/* Theme Toggle (Light / Dark) */}
      <button
        onClick={() => {
          const next = themeMode === "dark" ? "light" : "dark";
              saveThemePreferences(next);
        }}
        title={`Switch to ${themeMode === "dark" ? "Light" : "Dark"} mode`}
        className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        {themeMode === "dark" ? (
          <Sun className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-500" />
        )}
      </button>

      {/* Settings Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title="Plugin Settings & Theme"
            className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-card border-border text-foreground shadow-xl p-1 font-sans">
          {showProjectActions && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(getServerUrl(), "_blank");
                  }
                }}
                className="text-xs cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-accent"
              >
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Open in Studio Web</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setView("SELECT_PROJECT")}
                className="text-xs cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-accent"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Switch Project</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setView("SELECT_ORG")}
                className="text-xs cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-accent"
              >
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Switch Workspace</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border my-1" />
            </>
          )}

          {view !== "CONNECT" && config.pat && (
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs text-rose-500 hover:text-rose-400 cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-rose-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="font-medium">Disconnect / Log out</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // --------------------------------------------------------------------------
  // TOKEN ROW COMPONENT (Clean, spacious, matching ColorSwatch.tsx)
  // --------------------------------------------------------------------------
  const renderTokenRow = (token: TokenItem, idx: number) => {
    const rawValStr = typeof token.rawValue === "object" && token.rawValue !== null
      ? JSON.stringify(token.rawValue)
      : String(token.rawValue ?? "");
    const resolvedValStr = typeof token.resolvedValue === "object" && token.resolvedValue !== null
      ? JSON.stringify(token.resolvedValue)
      : String(token.resolvedValue ?? "");

    const isAlias = rawValStr.startsWith("{") && rawValStr.endsWith("}");
    const cleanAlias = isAlias ? rawValStr.replace(/[{}]/g, "") : "";

    const isColor =
      token.type === "color" ||
      /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(resolvedValStr.trim()) ||
      /^rgba?\(.+\)$/i.test(resolvedValStr.trim()) ||
      /^hsla?\(.+\)$/i.test(resolvedValStr.trim());

    const isDimension =
      token.type === "spacing" ||
      token.type === "sizing" ||
      token.type === "dimension" ||
      token.type === "borderRadius";

    const isCopied = copiedTokenName === token.name;

    return (
      <div
        key={`${token.setName}-${token.name}-${idx}`}
        onClick={() => {
          copyToClipboard(resolvedValStr || rawValStr, token.name);
          setCopiedTokenName(token.name);
          setTimeout(() => setCopiedTokenName(null), 1800);
        }}
        title={`Click to copy: ${token.name} (${resolvedValStr || rawValStr})`}
        className="group px-4 py-2.5 flex items-center justify-between text-xs hover:bg-muted/40 border-b border-border/40 transition-colors cursor-pointer select-none"
      >
        {/* Left: Swatch + Token Name */}
        <div className="flex items-center gap-3 truncate max-w-[60%]">
          {isColor ? (
            <div
              className="w-6 h-6 rounded-md border border-black/15 dark:border-white/15 shadow-xs flex-shrink-0 relative overflow-hidden transition-transform group-hover:scale-105"
              style={{ backgroundColor: resolvedValStr || rawValStr }}
            />
          ) : isDimension ? (
            <div className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <div
                className="bg-primary rounded-xs max-w-[14px] max-h-[14px] min-w-[3px] min-h-[3px]"
                style={{
                  width: resolvedValStr.includes("px") ? Math.min(parseInt(resolvedValStr) || 6, 14) : "8px",
                  height: resolvedValStr.includes("px") ? Math.min(parseInt(resolvedValStr) || 6, 14) : "8px",
                }}
              />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center text-[9px] font-mono text-muted-foreground flex-shrink-0">
              Aa
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
              {token.name}
            </span>
            {token.setName && (
              <span className="text-[10px] text-muted-foreground truncate font-medium">
                {token.setName}
              </span>
            )}
          </div>
        </div>

        {/* Right: Value / Alias pill & Copy button */}
        <div className="flex items-center gap-2 max-w-[38%] justify-end">
          {isAlias ? (
            <div
              title={`Alias to ${cleanAlias}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] font-medium truncate"
            >
              <Link2 className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{cleanAlias}</span>
            </div>
          ) : (
            <span className="font-mono text-xs text-foreground/80 font-medium group-hover:text-foreground transition-colors truncate">
              {resolvedValStr || rawValStr}
            </span>
          )}

          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-muted-foreground">
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in-75 duration-150" />
            ) : (
              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            )}
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // INITIAL LOADING: Session restoration check
  // --------------------------------------------------------------------------
  if (isRestoringSession) {
    return (
      <div
        style={dynamicCssVars}
        className="flex flex-col items-center justify-center h-screen w-full bg-background text-foreground font-sans select-none space-y-3"
      >
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">Connecting to Tokens Platform...</span>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SCREEN 1 - CONNECT (Minimalist, Focused, Frictionless)
  // --------------------------------------------------------------------------
  if (view === "CONNECT") {
    const isLocalServer = config.serverUrl.includes("localhost");

    return (
      <div
        style={dynamicCssVars}
        className="flex flex-col h-screen w-full bg-background text-foreground font-sans select-none overflow-y-auto"
      >
        {/* Top Header Bar (Clean, no contradictory Disconnect button) */}
        <div className="h-11 px-4 border-b border-border/80 flex items-center justify-between bg-card/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-md shadow-xs flex items-center justify-center text-white"
              style={{ backgroundColor: brandColor }}
            >
              <Layers className="w-3 h-3" />
            </div>
            <span className="text-xs font-semibold text-foreground tracking-tight">Tokens Platform</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            <button
              onClick={() => {
                const next = themeMode === "dark" ? "light" : "dark";
                saveThemePreferences(next);
              }}
              title={`Switch to ${themeMode === "dark" ? "Light" : "Dark"} mode`}
              className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {themeMode === "dark" ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
              )}
            </button>

          </div>
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 text-xs text-rose-500 flex items-start justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-rose-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Center Content */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 space-y-6 max-w-sm mx-auto w-full">
          {/* Brand Icon & Heading */}
          <div className="text-center space-y-2.5">
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-primary/20 transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${brandColor}, #262626)`,
              }}
            >
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Tokens Platform</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Design token bridge for Figma
              </p>
            </div>
          </div>

          {/* Primary Action / Pairing Box */}
          <div className="w-full space-y-3">
            {pairCode ? (
              /* ACTIVE PAIRING CODE CARD */
              <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-center shadow-xs animate-in fade-in duration-200">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  Device Pairing Code
                </div>
                <div className="flex items-center justify-center gap-2.5">
                  <span className="font-mono text-2xl font-bold tracking-widest text-primary selection:bg-primary/20">
                    {pairCode}
                  </span>
                  <button
                    onClick={() => {
                      copyToClipboard(pairCode, "Pairing Code");
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2500);
                    }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Copy Pairing Code"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Waiting for browser approval...</span>
                </div>
              </div>
            ) : (
              /* CONNECT BUTTON */
              <Button
                onClick={() => handleConnectToStudio()}
                disabled={isConnecting}
                className="w-full h-11 bg-primary hover:opacity-95 text-primary-foreground font-semibold text-xs rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Connect to Tokens Platform</span>
                  </>
                )}
              </Button>
            )}

            {/* Quick target server indicator & switch */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <span>Target:</span>
              <button
                type="button"
                onClick={() => {
                  const nextUrl = isLocalServer ? PRODUCTION_APP_URL : "http://localhost:3000";
                  const updated = { ...config, serverUrl: nextUrl };
                  setConfig(updated);
                  setCustomServerInput(nextUrl);
                  parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
                }}
                className="text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
                title="Click to switch between Cloud and Localhost dev server"
              >
                <span>{isLocalServer ? "Localhost (3000)" : "Cloud Production"}</span>
                <span className="text-[10px] text-muted-foreground hover:text-foreground">⇄ switch</span>
              </button>
            </div>
          </div>

          {/* Developer / Custom Link Drawer */}
          <div className="w-full pt-1">
            <button
              onClick={() => setShowCustomLink(!showCustomLink)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
            >
              {showCustomLink ? "Hide custom endpoint" : "Custom endpoint URL →"}
            </button>

            {showCustomLink && (
              <div className="mt-2.5 p-3 rounded-xl bg-card border border-border space-y-2 animate-in fade-in duration-150">
                <Label className="text-[11px] text-muted-foreground font-medium">Server Endpoint URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={customServerInput}
                    onChange={(e) => setCustomServerInput(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="h-8 text-xs bg-background border-border text-foreground font-mono focus-visible:ring-primary rounded-lg"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleConnectToStudio(customServerInput)}
                    className="h-8 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border px-3 rounded-lg cursor-pointer"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="py-3 text-center text-[11px] text-muted-foreground border-t border-border/80">
          Tokens Platform &copy; 2026
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SCREEN 2 - SELECT ORGANIZATION (Spacious, Clean)
  // --------------------------------------------------------------------------
  if (view === "SELECT_ORG") {
    return (
      <div
        style={dynamicCssVars}
        className="flex flex-col h-screen w-full bg-background text-foreground font-sans select-none overflow-hidden"
      >
        {/* Header */}
        <header className="h-12 px-4 border-b border-border/80 flex items-center justify-between bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs"
              style={{ backgroundColor: brandColor }}
            >
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-xs font-bold text-foreground tracking-tight">Select Workspace</h1>
          </div>
          {renderHeaderActions(false)}
        </header>

        {/* Org List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <p className="text-xs text-muted-foreground mb-1">
            Choose a workspace to view its projects:
          </p>

          {orgs.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
              <Building2 className="w-8 h-8 mx-auto opacity-30 text-muted-foreground" />
              <p className="font-medium">No workspaces found</p>
            </div>
          ) : (
            orgs.map((org) => {
              const projCount = org.projects?.length || 0;
              const orgColor = org.color || brandColor;
              return (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrg(org);
                    setView("SELECT_PROJECT");
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:bg-muted/40 transition-all group text-left shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold uppercase shadow-xs transition-transform group-hover:scale-105"
                      style={{ backgroundColor: orgColor }}
                    >
                      {org.name.charAt(0) || "O"}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {org.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Workspace</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground">
                    <Badge variant="secondary" className="text-[10px] font-normal px-2 py-0.5 rounded-md">
                      {projCount} {projCount === 1 ? "project" : "projects"}
                    </Badge>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
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
  // RENDER: SCREEN 3 - SELECT PROJECT (Spacious, Clean)
  // --------------------------------------------------------------------------
  if (view === "SELECT_PROJECT") {
    const projects = selectedOrg?.projects || [];

    return (
      <div
        style={dynamicCssVars}
        className="flex flex-col h-screen w-full bg-background text-foreground font-sans select-none overflow-hidden"
      >
        {/* Header with Back Arrow */}
        <header className="h-12 px-3 border-b border-border/80 flex items-center justify-between bg-card flex-shrink-0">
          <button
            onClick={() => setView("SELECT_ORG")}
            className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary transition-colors py-1 px-2 rounded-lg hover:bg-muted cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="truncate max-w-[200px]">{selectedOrg?.name || "Workspaces"}</span>
          </button>
          {renderHeaderActions(false)}
        </header>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <p className="text-xs text-muted-foreground mb-1">Select a design tokens project:</p>

          {projects.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
              <FolderGit2 className="w-8 h-8 mx-auto opacity-30 text-muted-foreground" />
              <p className="font-medium">No projects found</p>
            </div>
          ) : (
            projects.map((proj) => {
              const projColor = proj.color || selectedOrg?.color || brandColor;
              return (
                <button
                  key={proj.id}
                  onClick={() => {
                    setSelectedProject(proj);
                    const updated = {
                      ...config,
                      orgId: selectedOrg?.id || "",
                      projectId: proj.id,
                      projectName: proj.name,
                      orgName: selectedOrg?.name,
                      themeMode,
                    };
                    setConfig(updated);
                    parent.postMessage({ pluginMessage: { type: "SAVE_CONFIG", payload: updated } }, "*");
                    fetchTokens(config.serverUrl, config.pat, selectedOrg?.id, proj.id);
                    setView("MAIN");
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:bg-muted/40 transition-all group text-left shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold uppercase shadow-xs transition-transform group-hover:scale-105"
                      style={{ backgroundColor: projColor }}
                    >
                      {proj.name.charAt(0) || "P"}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {proj.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Tokens Project</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md">
                      Open
                    </Badge>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
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
  // RENDER: SCREEN 4 - COMPANION STUDIO MAIN VIEW (Linear / Figma Best UX)
  // --------------------------------------------------------------------------
  return (
    <div
      style={dynamicCssVars}
      className="flex flex-col h-screen w-full bg-background text-foreground font-sans select-none overflow-hidden"
    >
      {/* Top Error Alert Banner with Retry */}
      {errorBanner && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-3.5 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2 z-20 flex-shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{errorBanner}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setErrorBanner(null);
                setIsOffline(false);
                fetchTokens();
              }}
              className="font-semibold underline hover:text-foreground cursor-pointer text-xs"
            >
              Retry
            </button>
            <button onClick={() => setErrorBanner(null)} className="text-amber-600 dark:text-amber-300 hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Header Bar: Project selector + Live Status + Header Actions */}
      <header className="h-12 px-3.5 border-b border-border/80 flex items-center justify-between bg-card flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-primary px-2 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold uppercase shadow-xs flex-shrink-0"
                style={{ backgroundColor: selectedProject?.color || brandColor }}
              >
                {(selectedProject?.name || config.projectName || "W").charAt(0)}
              </div>
              <span className="truncate max-w-[130px]">
                {selectedProject?.name || config.projectName || "web"}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 bg-card border-border text-foreground shadow-xl p-1">
            <DropdownMenuItem
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.open(getServerUrl(), "_blank");
                }
              }}
              className="text-xs cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-accent"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Open in Studio Web</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setView("SELECT_PROJECT")}
              className="text-xs cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-accent"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Switch Project</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setView("SELECT_ORG")}
              className="text-xs cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-accent"
            >
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Switch Workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          {/* Live Status indicator badge */}
          {isOffline ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Offline</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected</span>
            </div>
          )}

          {renderHeaderActions(true)}
        </div>
      </header>

      {/* 2. Collection Horizontal Pill Tabs (Linear / GitHub style) */}
      <div className="px-3.5 py-2 border-b border-border/60 bg-card/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
        <button
          onClick={() => setSelectedCollection("ALL")}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
            selectedCollection === "ALL"
              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          All ({tokens.length})
        </button>

        {collectionStats.map((col) => (
          <button
            key={col.name}
            onClick={() => setSelectedCollection(col.name)}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCollection === col.name
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {col.name} ({col.count})
          </button>
        ))}
      </div>

      {/* 3. Full-width Search Input */}
      <div className="px-3.5 py-2 border-b border-border/60 bg-background flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tokens by name or value..."
            className="h-8 pl-8 pr-7 text-xs bg-muted/40 border-border/80 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-[11px] font-mono text-muted-foreground font-medium px-1 flex-shrink-0">
          {filteredTokens.length}
        </span>
      </div>

      {/* 4. Token Table Header & List */}
      <div className="flex-1 overflow-y-auto flex flex-col bg-background">
        {/* Table Column Header */}
        <div className="h-7 px-4 bg-muted/30 border-b border-border/60 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-shrink-0 sticky top-0 z-10 backdrop-blur-xs">
          <span>TOKEN</span>
          <span>VALUE / ALIAS</span>
        </div>

        {/* Table Body */}
        {isFetchingTokens ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-2.5 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs font-medium">Fetching tokens from Studio...</span>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-1.5">
            <p className="text-xs font-semibold text-foreground">No tokens found</p>
            <p className="text-[11px]">
              {searchQuery ? "Try searching for a different keyword" : "Click 'Push to Studio' to export Figma variables."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredTokens.map((token, idx) => renderTokenRow(token, idx))}
          </div>
        )}
      </div>

      {/* 5. Footer Action Bar: ⑂ Branch, ↻ Refresh, Push, Sync to Figma */}
      <footer className="h-14 px-4 border-t border-border/80 bg-card/90 flex items-center justify-between flex-shrink-0 backdrop-blur-xs">
        {/* Left: Branch selector + Refresh button */}
        <div className="flex items-center gap-1.5">
          <DropdownMenu onOpenChange={(open) => open && fetchBranches()}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-foreground font-medium px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border transition-colors cursor-pointer">
                <GitBranch className="w-3 h-3 text-primary" />
                <span className="truncate max-w-[80px]">{selectedBranch}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 bg-card border-border text-foreground p-1">
              {availableBranches.map((b) => (
                <DropdownMenuItem
                  key={b}
                  onClick={() => {
                    setSelectedBranch(b);
                    fetchTokens(config.serverUrl, config.pat, selectedOrg?.id, selectedProject?.id, b);
                  }}
                  className={`text-xs cursor-pointer px-2 py-1.5 rounded-md ${
                    selectedBranch === b ? "bg-primary/15 text-primary font-bold" : "hover:bg-accent"
                  }`}
                >
                  {b}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => fetchTokens()}
            disabled={isFetchingTokens}
            title="Fetch latest tokens from Studio"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingTokens ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>

        {/* Right: Push & Sync Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPushWarningOpen(true)}
            disabled={isPushing || isSyncing}
            className="h-8 text-xs font-medium border-border hover:bg-muted text-foreground gap-1.5 px-3 rounded-lg cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Push</span>
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
            className="h-8 text-xs font-semibold bg-primary hover:opacity-95 text-primary-foreground gap-1.5 px-3.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
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
      {/* MODAL A: Select Themes and Modes to create                             */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog open={isThemeModalOpen} onOpenChange={setIsThemeModalOpen}>
        <DialogContent className="max-w-xs bg-card border-border text-foreground p-5 font-sans rounded-xl shadow-2xl">
          <DialogHeader className="p-0 space-y-1">
            <DialogTitle className="text-sm font-bold text-foreground">
              Select Themes & Modes
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose which theme groups and modes to synchronize into Figma Variables.
            </DialogDescription>
          </DialogHeader>

          {/* Checkbox Tree */}
          <div className="max-h-56 overflow-y-auto space-y-3 py-2">
            {themeGroups.map((grp: any) => (
              <div key={grp.name} className="space-y-1.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
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
                    className="rounded border-border bg-background text-primary focus:ring-primary"
                  />
                  <label htmlFor={`grp-${grp.name}`} className="cursor-pointer">
                    {grp.name}
                  </label>
                </div>

                <div className="pl-5 space-y-1 border-l border-border ml-1.5">
                  {grp.options?.map((opt: any) => {
                    const key = `${grp.name}::${opt.name}`;
                    const isChecked = selectedThemeModes[key] !== false;
                    return (
                      <div key={opt.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          id={key}
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedThemeModes({ ...selectedThemeModes, [key]: e.target.checked });
                          }}
                          className="rounded border-border bg-background text-primary focus:ring-primary"
                        />
                        <label htmlFor={key} className="cursor-pointer hover:text-foreground">
                          {opt.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsThemeModalOpen(false)}
              className="w-1/2 h-8 text-xs border-border rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteSync}
              className="w-1/2 h-8 text-xs font-semibold bg-primary hover:opacity-95 text-primary-foreground rounded-lg"
            >
              Sync Themes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL B: Push to Studio Warning                                        */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog open={isPushWarningOpen} onOpenChange={setIsPushWarningOpen}>
        <DialogContent className="max-w-xs bg-card border-border text-foreground p-5 font-sans rounded-xl shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                Push Variables to Studio
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                This will export native Figma variables and update the cloud tokens for <strong>{selectedProject?.name}</strong>. Existing token aliases will be preserved.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPushWarningOpen(false)}
              className="w-1/2 h-8 text-xs border-border rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                parent.postMessage({ pluginMessage: { type: "EXPORT_FIGMA_TO_TOKENS" } }, "*");
              }}
              disabled={isPushing}
              className="w-1/2 h-8 text-xs font-semibold bg-primary hover:opacity-95 text-primary-foreground gap-1 rounded-lg"
            >
              {isPushing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Proceed</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL C: Create Complete! Success Dialog                               */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-xs bg-card border-border text-foreground p-6 font-sans rounded-xl space-y-4 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground tracking-tight">
              Figma Sync Complete!
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {successCount.vars} variables synchronized successfully.
            </p>
          </div>

          {/* Full gradient progress bar */}
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full w-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${brandColor}, #10b981)`,
              }}
            />
          </div>

          <Button
            onClick={() => setIsSuccessModalOpen(false)}
            className="w-full h-8 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg cursor-pointer"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );

  // --------------------------------------------------------------------------
  // BRAND COLOR CUSTOMIZATION MODAL HELPER
};
