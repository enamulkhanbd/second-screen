"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { useShallow } from "zustand/react/shallow";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { LATEST_VERSION } from "@/data/systemChangelog";
import {
  ArrowRight,
  FolderGit2,
  Lock,
  Mail,
  User,
  Sun,
  Moon,
  AlertCircle,
  Code2,
  Github,
  Loader2,
  GitBranch,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TokensPlatformLogo } from "@/components/TokensPlatformLogo";

const getOAuthCallbackUrl = () => {
  if (typeof window === "undefined") return undefined;

  const callbackUrl = new URL("/auth/callback", window.location.origin);
  const nextPath = `${window.location.pathname}${window.location.search}`;
  if (nextPath !== "/") callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
};

export const AuthGatewayView: React.FC = () => {
  const { setCurrentUser, themeMode, setThemeMode, addToast } = useTokenStore(
    useShallow((s) => ({
      setCurrentUser: s.setCurrentUser,
      themeMode: s.themeMode,
      setThemeMode: s.setThemeMode,
      addToast: s.addToast,
    }))
  );
  const [isSignUp, setIsSignUp] = useState(false);
  const [specimenTheme, setSpecimenTheme] = useState<"dark" | "light">("dark");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset loading state if user returns via browser back button or switches back to tab
    const handleReset = () => {
      setLoading(false);
      setOauthLoading(null);
    };

    window.addEventListener("pageshow", handleReset);
    window.addEventListener("focus", handleReset);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleReset();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const authErr = params.get("auth_error");
      const oauthErr = params.get("error");
      const oauthErrDesc = params.get("error_description");

      if (authErr || oauthErr || oauthErrDesc) {
        // If the user cancelled GitHub/Google login, reset cleanly without a scary error
        if (oauthErr === "access_denied" || oauthErrDesc?.toLowerCase().includes("denied")) {
          setError(null);
        } else {
          setError(decodeURIComponent(oauthErrDesc || authErr || oauthErr || "Authentication was not completed."));
        }

        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("auth_error");
        cleanUrl.searchParams.delete("error");
        cleanUrl.searchParams.delete("error_code");
        cleanUrl.searchParams.delete("error_description");
        window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.search ? `?${cleanUrl.search}` : ""));
      }
    }

    return () => {
      window.removeEventListener("pageshow", handleReset);
      window.removeEventListener("focus", handleReset);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured && supabase) {
        if (isSignUp) {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                name: name,
              },
            },
          });
          if (signUpErr) throw signUpErr;
          if (data.user) {
            setCurrentUser({
              uid: data.user.id,
              email: data.user.email || email,
              displayName: name || data.user.email?.split("@")[0] || "User",
            });
            addToast({
              type: "success",
              title: "Welcome to Tokens Platform!",
              message: `Account created for ${email}.`,
            });
          }
        } else {
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInErr) throw signInErr;
          if (data.user) {
            setCurrentUser({
              uid: data.user.id,
              email: data.user.email || email,
              displayName:
                data.user.user_metadata?.full_name ||
                data.user.user_metadata?.name ||
                email.split("@")[0],
            });
            addToast({
              type: "success",
              title: "Signed In",
              message: `Welcome back, ${data.user.user_metadata?.full_name || email}!`,
            });
          }
        }
      } else {
        throw new Error("Supabase Database & Authentication are not configured.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase Authentication is not configured or Google Sign-In is unavailable.");
      return;
    }

    setOauthLoading("google");
    setError(null);
    try {
      const callbackUrl = getOAuthCallbackUrl();
      const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (oAuthErr) throw oAuthErr;
    } catch (err: any) {
      setError(err.message || "Google sign in failed.");
      setOauthLoading(null);
    }
  };

  const handleGithubSignIn = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase Authentication is not configured or GitHub Sign-In is unavailable.");
      return;
    }

    setOauthLoading("github");
    setError(null);
    try {
      const callbackUrl = getOAuthCallbackUrl();
      const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (oAuthErr) throw oAuthErr;
    } catch (err: any) {
      setError(err.message || "GitHub sign in failed.");
      setOauthLoading(null);
    }
  };

  const specimenRows =
    specimenTheme === "dark"
      ? [
          {
            name: "color.surface.elevated",
            alias: "{color.neutral.900}",
            resolved: "#121316",
            swatch: "#121316",
          },
          {
            name: "color.accent.primary",
            alias: "{color.indigo.400}",
            resolved: "#818cf8",
            swatch: "#818cf8",
          },
          {
            name: "color.status.synced",
            alias: "{color.emerald.400}",
            resolved: "#34d399",
            swatch: "#34d399",
          },
          {
            name: "space.control.height",
            alias: "{dimension.scale.8}",
            resolved: "32px",
            swatch: null,
          },
        ]
      : [
          {
            name: "color.surface.elevated",
            alias: "{color.neutral.0}",
            resolved: "#ffffff",
            swatch: "#ffffff",
          },
          {
            name: "color.accent.primary",
            alias: "{color.indigo.600}",
            resolved: "#4f46e5",
            swatch: "#4f46e5",
          },
          {
            name: "color.status.synced",
            alias: "{color.emerald.600}",
            resolved: "#059669",
            swatch: "#059669",
          },
          {
            name: "space.control.height",
            alias: "{dimension.scale.8}",
            resolved: "32px",
            swatch: null,
          },
        ];

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-background text-foreground font-sans relative overflow-hidden select-none transition-colors">
      {/* Top Bar */}
      <header className="h-14 px-6 sm:px-10 flex items-center justify-between border-b border-border/70 bg-background/90 backdrop-blur-md z-10">
        <TokensPlatformLogo variant="full" badge={LATEST_VERSION} />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            title="Toggle theme"
            aria-label="Toggle color theme"
          >
            {themeMode === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 py-10 sm:px-10 gap-10 lg:gap-16 max-w-6xl mx-auto w-full z-10 focus:outline-none"
      >
        {/* Left Column: Editorial Heading + Live Token Specimen */}
        <div className="flex-1 space-y-6 max-w-xl w-full text-left">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>DTCG 2025.10 compliant token studio</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.15] text-foreground">
              One source of truth for design tokens, themes, and code.
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              Author multi-brand token sets, resolve deep alias chains across theme matrices, and sync bi-directionally with Figma Variables and Git repositories.
            </p>
          </div>

          {/* Interactive Token Resolution Specimen */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2 text-xs font-mono text-foreground">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium"> semantic / surface.tokens.json</span>
              </div>
              <div
                role="group"
                aria-label="Preview theme mode"
                className="inline-flex items-center rounded-md border border-border bg-background p-0.5 text-[11px] font-medium"
              >
                <button
                  type="button"
                  onClick={() => setSpecimenTheme("dark")}
                  aria-pressed={specimenTheme === "dark"}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    specimenTheme === "dark"
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setSpecimenTheme("light")}
                  aria-pressed={specimenTheme === "light"}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    specimenTheme === "light"
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Light
                </button>
              </div>
            </div>

            <div className="divide-y divide-border/70 text-xs font-mono">
              {specimenRows.map((row) => (
                <div
                  key={row.name}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-foreground font-medium truncate">{row.name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-muted-foreground hidden sm:inline">{row.alias}</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/60 text-foreground tabular-nums min-w-[78px] justify-end">
                      {row.swatch && (
                        <span
                          className="size-2.5 rounded-xs border border-border shrink-0"
                          style={{ backgroundColor: row.swatch }}
                        />
                      )}
                      <span>{row.resolved}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-3.5 py-2 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>GitHub, GitLab &amp; Bitbucket</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                <span>Figma Variables Sync</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>CSS, TS, Swift &amp; Kotlin</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Dedicated Auth Card */}
        <div className="w-full max-w-md">
          <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl relative space-y-5">
            <div
              role="group"
              aria-label="Account action"
              className="grid grid-cols-2 rounded-lg border border-border bg-muted/50 p-1"
            >
              <button
                type="button"
                aria-pressed={!isSignUp}
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                }}
                className={`h-8 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  !isSignUp ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={isSignUp}
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                }}
                className={`h-8 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSignUp ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create account
              </button>
            </div>

            {/* Card Header */}
            <div className="text-center space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {isSignUp ? "Create your account" : "Sign in"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isSignUp
                  ? "Set up your workspace and first project."
                  : "Continue to your workspaces with email, Google, or GitHub."}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2 font-medium">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
                {error.includes("redirect_uri") && (
                  <div className="pt-2 border-t border-destructive/20 flex flex-col gap-2">
                    <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
                      If running locally, visit <span className="font-mono font-semibold text-foreground">http://localhost:3000</span>. Ensure your site URL and redirect URLs are configured in your Supabase Auth dashboard.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 1. Social OAuth Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading || oauthLoading !== null}
                className="w-full h-10 gap-2 text-xs font-semibold bg-background hover:bg-muted border-border/80 shadow-xs cursor-pointer"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>{oauthLoading === "google" ? "Connecting..." : "Google"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleGithubSignIn}
                disabled={loading || oauthLoading !== null}
                className="w-full h-10 gap-2 text-xs font-semibold bg-background hover:bg-muted border-border/80 shadow-xs cursor-pointer"
              >
                {oauthLoading === "github" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                ) : (
                  <Github className="w-4 h-4 flex-shrink-0 text-foreground" />
                )}
                <span>{oauthLoading === "github" ? "Connecting..." : "GitHub"}</span>
              </Button>
            </div>

            {/* Separator */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <span className="relative px-3 bg-card text-[11px] font-medium text-muted-foreground tracking-wider">
                or with email
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignUp && (
                <div className="space-y-1 text-left">
                  <Label htmlFor="name" className="text-xs font-semibold">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={isSignUp}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1 text-left">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || oauthLoading !== null}
                className="w-full h-9 text-xs font-bold gap-1.5 shadow-md cursor-pointer mt-2"
              >
                <span>{loading ? "Authenticating..." : isSignUp ? "Create Free Account" : "Sign In"}</span>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </Button>
            </form>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3.5 px-6 sm:px-10 text-xs text-muted-foreground bg-background border-t border-border/70 z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <span>Tokens Platform {LATEST_VERSION}</span>
          <span>Self-hosted DTCG 2025.10 schema registry &amp; role-based workspace access</span>
        </div>
      </footer>
    </div>
  );
};
