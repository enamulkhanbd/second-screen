"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthModal } from "@/components/AuthModal";

function ConnectPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = (searchParams.get("code") || "").toUpperCase();

  const {
    currentUser,
    userOrgs,
    currentOrg,
    orgProjects,
    currentProject,
    loadTenantData,
  } = useTokenStore();

  const [code, setCode] = useState(initialCode);
  const [selectedOrgId, setSelectedOrgId] = useState(currentOrg?.id || "");
  const [selectedProjId, setSelectedProjId] = useState(currentProject?.id || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (currentUser?.uid) {
      loadTenantData(currentUser.uid, currentUser.email);
    }
  }, [currentUser, loadTenantData]);

  useEffect(() => {
    if (userOrgs.length > 0) {
      const activeOrg =
        userOrgs.find((o) => o.id === selectedOrgId) || currentOrg || userOrgs[0];
      setSelectedOrgId(activeOrg.id);

      const activeProj =
        orgProjects.find((p) => p.id === selectedProjId) ||
        currentProject ||
        orgProjects[0];
      setSelectedProjId(activeProj?.id || "");
    }
  }, [userOrgs, selectedOrgId, selectedProjId, currentOrg, currentProject, orgProjects]);

  const activeOrg = userOrgs.find((o) => o.id === selectedOrgId) || currentOrg || userOrgs[0];
  const activeProj = orgProjects.find((p) => p.id === selectedProjId) || currentProject || orgProjects[0];

  const handleAuthorize = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage("Please enter a valid 6-digit pairing code from Figma.");
      setStatus("error");
      return;
    }

    setLoading(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/auth/pair", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          orgId: activeOrg?.id || "",
          projectId: activeProj?.id || "",
          orgName: activeOrg?.name || "",
          projectName: activeProj?.name || "",
          uid: currentUser?.uid,
          userEmail: currentUser?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to authorize pairing code.");
      }

      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Could not connect. Please verify the code in Figma.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between select-none">
      {/* Top Header */}
      <header className="h-14 px-6 border-b border-border bg-card/50 flex items-center justify-between">
        <div
          onClick={() => router.push("/")}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">
            Tokens Platform
          </span>
        </div>

        <div>
          {currentUser ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Signed in as</span>
              <span className="font-medium text-foreground">
                {currentUser.displayName || currentUser.email}
              </span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuthOpen(true)}
              className="text-xs gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Center Card */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center p-4 focus:outline-none">
        <div className="w-full max-w-[420px]">
          {status === "success" ? (
            <Card className="border-border bg-card shadow-xl p-8 space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <CardTitle className="text-xl font-bold text-foreground tracking-tight">
                  Device connected
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  You can close this window and return to your plugin.
                </CardDescription>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/50 border border-border text-xs text-left space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Device Code:</span>
                  <span className="font-mono font-bold text-foreground">{code}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Authorized Account:</span>
                  <span className="font-medium text-foreground">
                    {currentUser?.displayName || currentUser?.email || "Signed In User"}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="w-full text-xs font-semibold h-10"
              >
                Go to Dashboard
              </Button>
            </Card>
          ) : !currentUser ? (
            <Card className="border-border bg-card shadow-xl p-6 space-y-5">
              <div className="text-left space-y-1">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Connect your plugin
                </h1>
                <p className="text-xs text-muted-foreground">
                  Enter the code from your Figma plugin or CLI tool to authorize access.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-center">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Sign in required to link this device
                </span>
                {code && (
                  <div className="font-mono text-lg font-bold tracking-widest text-primary">
                    {code}
                  </div>
                )}
              </div>

              <Button
                onClick={() => setIsAuthOpen(true)}
                className="w-full text-xs font-semibold h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Continue</span>
              </Button>
            </Card>
          ) : (
            <Card className="border-border bg-card shadow-xl p-7 space-y-6">
              <div className="text-left space-y-1.5">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Connect your plugin
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter the code from your Figma plugin or CLI tool to authorize access.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-code" className="text-xs font-semibold text-foreground">
                    Device Code <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="device-code"
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono text-sm tracking-wider h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                    maxLength={14}
                  />
                </div>

                {/* Which workspace and project this device will link to */}
                {activeOrg && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Linking to</Label>
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">{activeOrg.name}</span>
                      {activeProj && (
                        <>
                          <span className="mx-1.5 text-muted-foreground/50">/</span>
                          <span className="font-semibold text-foreground">{activeProj.name}</span>
                        </>
                      )}
                    </div>
                    {orgProjects.length > 1 && (
                      <Select value={activeProj?.id || ""} onValueChange={setSelectedProjId}>
                        <SelectTrigger aria-label="Project to link" className="h-9 text-xs">
                          <SelectValue placeholder="Choose a project" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {orgProjects.map((proj) => (
                            <SelectItem key={proj.id} value={proj.id}>
                              {proj.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Status / Error Alert */}
                {status === "error" && errorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-500 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button
                  onClick={handleAuthorize}
                  disabled={loading || !code.trim()}
                  className="w-full text-xs font-semibold h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    "Connect Device"
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        Tokens Platform &copy; 2026. Design Token System.
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        title="Sign In to Connect Plugin"
        subtitle="Sign in with your Google account to authorize your Figma companion plugin."
      />
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-muted-foreground">Loading connect page…</div>}>
      <ConnectPageContent />
    </Suspense>
  );
}
