"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  FolderGit2,
  Lock,
  Mail,
  User,
  CheckCircle2,
  Sun,
  Moon,
  AlertCircle,
  Code2,
  Palette,
  Github,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const AuthGatewayView: React.FC = () => {
  const { setCurrentUser, themeMode, setThemeMode, addToast } = useTokenStore();
  const [isSignUp, setIsSignUp] = useState(false);
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
      if (authErr) {
        setError(decodeURIComponent(authErr));
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("auth_error");
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
      const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
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
      const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
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

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#fbfbfe] dark:bg-[#08080c] text-foreground font-sans relative overflow-hidden select-none transition-colors">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="h-16 px-6 sm:px-12 flex items-center justify-between border-b border-border/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white shadow-md">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">
            Tokens Platform
          </span>
          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 ml-1 border-primary/30 text-primary">
            v1.3.0
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Toggle theme"
          >
            {themeMode === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Hero Container */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 sm:p-12 gap-12 max-w-6xl mx-auto w-full z-10">
        {/* Left Column: Product Value Proposition */}
        <div className="flex-1 space-y-6 max-w-lg text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Design System Hub</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-foreground">
            Govern, collaborate &amp; sync your{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-indigo-500 bg-clip-text text-transparent">
              design tokens
            </span>
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Multi-theme token matrix, real-time bi-directional Git and Figma variable synchronization, and instant code generation for modern design engineering teams.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-left">
            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Palette className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>Multi-Theme Matrix</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Manage Light, Dark, Brand and density modes seamlessly.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <FolderGit2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Bi-Directional Sync</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Pull &amp; push directly to GitHub, GitLab &amp; Figma Plugin.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Code2 className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                <span>Multi-Target Compilers</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Instant CSS, Tailwind, SCSS &amp; Style Dictionary exports.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>Tenant Isolation</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Secure multi-org workspaces with role-based member permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Dedicated Auth Card */}
        <div className="w-full max-w-md">
          <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl relative space-y-5">
            {/* Card Header */}
            <div className="text-center space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {isSignUp ? "Create Workspace Account" : "Sign in to Tokens Platform"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isSignUp
                  ? "Get started with your free multi-project design system"
                  : "Enter your credentials or continue with Google or GitHub to access your workspaces"}
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
              <span className="relative px-3 bg-card text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
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

            {/* Toggle Mode */}
            <div className="text-center pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {isSignUp ? (
                  <span>
                    Already have an account? <strong className="text-primary font-semibold">Sign In</strong>
                  </span>
                ) : (
                  <span>
                    Don&apos;t have an account? <strong className="text-primary font-semibold">Create one for free</strong>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 text-center text-xs text-muted-foreground border-t border-border/30 z-10">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
          <span>Protected by Supabase Cloud Authentication</span>
          <span>•</span>
          <span>End-to-End Git &amp; Figma Encryption</span>
          <span>•</span>
          <span>Tokens Platform © 2026</span>
        </div>
      </footer>
    </div>
  );
};
