"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  FolderGit2,
  ExternalLink,
  Lock,
  Globe,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
      // Generate or read PAT for this session
      const pat = `sec_pat_figma_${Math.random().toString(36).substring(2, 14)}`;

      const res = await fetch("/api/v1/auth/pair", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          pat,
          orgId: activeOrg?.id || "org-default",
          projectId: activeProj?.id || "proj-main",
          orgName: activeOrg?.name || "My Organization",
          projectName: activeProj?.name || "Design System",
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
    <div className="min-h-screen w-full bg-white dark:bg-[#09090d] text-slate-900 dark:text-zinc-100 flex flex-col justify-between select-none">
      {/* Top Simple Header */}
      <header className="h-14 px-6 border-b border-border flex items-center justify-between">
        <div
          onClick={() => router.push("/")}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm group-hover:opacity-90 transition-opacity">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">
            Tokens Platform
          </span>
        </div>

        <div>
          {currentUser ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Signed in as</span>
              <span className="font-semibold text-foreground">
                {currentUser.displayName || currentUser.email}
              </span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuthOpen(true)}
              className="text-xs"
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Main Center Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {status === "success" ? (
            <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xl text-center p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-foreground">
                  Figma Plugin Connected!
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Your companion plugin is now linked to{" "}
                  <strong className="text-foreground">
                    {activeOrg?.name} / {activeProj?.name}
                  </strong>
                  .
                </CardDescription>
              </div>

              <div className="p-3 rounded-lg bg-background/80 border border-border text-xs text-left space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Pairing Code:</span>
                  <span className="font-mono font-bold text-foreground">{code}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Target Workspace:</span>
                  <span className="font-semibold text-foreground">
                    {activeOrg?.name} / {activeProj?.name}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                You can now switch back to Figma — the plugin has unlocked automatically.
              </p>

              <div className="pt-2 flex gap-2">
                <Button
                  onClick={() => router.push("/")}
                  className="w-full text-xs font-semibold gap-1.5"
                >
                  <span>Go to Platform Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border-border shadow-xl">
              <CardHeader className="space-y-2 text-center pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <Badge variant="violet" className="gap-1 px-2.5 py-0.5 text-[10px] mb-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>Figma Plugin Quick Connect</span>
                  </Badge>
                  <CardTitle className="text-xl font-bold text-foreground">
                    Connect Figma Companion
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Authorize the Figma desktop plugin to sync tokens and variables with your workspace.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Pairing Code Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="pair-code" className="text-xs font-semibold">
                    6-Digit Pairing Code
                  </Label>
                  <Input
                    id="pair-code"
                    type="text"
                    placeholder="e.g. TK-8492"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono text-center tracking-widest text-lg font-extrabold h-11 uppercase"
                    maxLength={10}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enter the pairing code displayed in your Tokens Platform Figma plugin.
                  </p>
                </div>

                {/* Target Organization and Project */}
                {userOrgs.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Organization</Label>
                      <Select
                        value={selectedOrgId}
                        onValueChange={(val) => setSelectedOrgId(val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select org" />
                        </SelectTrigger>
                        <SelectContent>
                          {userOrgs.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Project</Label>
                      <Select
                        value={selectedProjId}
                        onValueChange={(val) => setSelectedProjId(val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {orgProjects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Status / Error Message */}
                {status === "error" && errorMessage && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button
                  onClick={handleAuthorize}
                  disabled={loading || !code.trim()}
                  className="w-full text-xs font-bold h-10 shadow-md gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing Companion Plugin...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authorize &amp; Connect Plugin</span>
                    </>
                  )}
                </Button>

                {!currentUser && (
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors py-1"
                  >
                    Want to save to your personal account? <strong>Sign in with Google</strong>
                  </button>
                )}
              </CardFooter>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        Tokens Platform Cloud &copy; 2026. Secure DTCG Token Orchestration.
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-muted-foreground">Loading connect page...</div>}>
      <ConnectPageContent />
    </Suspense>
  );
}
