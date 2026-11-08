"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ArrowRight,
  LogOut,
  AlertCircle,
  Building2,
  Crown,
  Github,
  Loader2,
} from "lucide-react";

const GoogleIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TokensPlatformLogo } from "@/components/TokensPlatformLogo";
import { ROLE_DEFINITIONS } from "@/types/tenant";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  onSuccess,
}) => {
  const {
    currentUser,
    setCurrentUser,
    signOutUser,
    currentOrg,
    getCurrentUserRole,
    addToast,
  } = useTokenStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset loading states when returning via browser back/forward (bfcache) or tab focus
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
              message: `Account created successfully for ${email}.`,
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
              title: "Logged In",
              message: `Welcome back, ${data.user.user_metadata?.full_name || email}!`,
            });
          }
        }
      } else {
        throw new Error("Supabase Database & Authentication are not configured.");
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
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
      setError(err.message || "Google sign in failed");
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
      setError(err.message || "GitHub sign in failed");
      setOauthLoading(null);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    addToast({
      type: "info",
      title: "Signed Out",
      message: "You have signed out of your account.",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {currentUser ? (
          // Authenticated Profile View
          <div className="space-y-4 pt-1">
            <DialogHeader className="gap-1 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                  {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-bold truncate">
                    {currentUser.displayName || "User Profile"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate">
                    {currentUser.email}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Clean Workspace & Role Card */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Workspace</span>
                </span>
                <span className="font-medium text-foreground truncate max-w-[180px]">
                  {currentOrg?.name || "Personal Workspace"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>Role</span>
                </span>
                <Badge variant="violet" className="text-[10px] capitalize font-medium">
                  {ROLE_DEFINITIONS[getCurrentUserRole()]?.title || "Owner"}
                </Badge>
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full gap-2 text-xs font-semibold h-9 shadow-xs cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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

            <DialogHeader className="gap-1 text-left">
              <div className="flex items-center gap-2.5">
                <TokensPlatformLogo variant="app-icon" size={32} />
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base">
                      {isSignUp
                        ? title
                          ? "Create an account to connect your plugin"
                          : "Create your account"
                        : title || "Sign in to Tokens Platform"}
                    </DialogTitle>
                    <Badge variant="success" className="text-[10px] py-0 font-semibold">
                      100% Free
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs">
                    {isSignUp
                      ? "Create an account to connect this device."
                      : subtitle || "Access your workspaces and projects."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs space-y-2 font-medium">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
                {error.includes("redirect_uri") && (
                  <div className="pt-2 border-t border-destructive/20 flex flex-col gap-2">
                    <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
                      Use <span className="font-mono font-semibold text-foreground">http://localhost:3000</span>, or configure your domain in your Supabase Auth Redirect URLs.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading || oauthLoading !== null}
                className="w-full gap-2 text-xs h-9 cursor-pointer"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{oauthLoading === "google" ? "Connecting..." : "Google"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleGithubSignIn}
                disabled={loading || oauthLoading !== null}
                className="w-full gap-2 text-xs h-9 cursor-pointer"
              >
                {oauthLoading === "github" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground flex-shrink-0" />
                ) : (
                  <Github className="w-3.5 h-3.5 flex-shrink-0 text-foreground" />
                )}
                <span>{oauthLoading === "github" ? "Connecting..." : "GitHub"}</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Or with email
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <div className="space-y-1">
                  <Label htmlFor="auth-name">Display Name</Label>
                  <Input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="auth-email">Work Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  required
                  placeholder="designer@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || oauthLoading !== null}
                className="w-full gap-1.5 text-xs h-9 mt-2"
              >
                <span>{loading ? "Authenticating..." : isSignUp ? "Create Account" : "Sign In"}</span>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </Button>
            </form>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
