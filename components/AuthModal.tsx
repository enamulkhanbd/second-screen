"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Sparkles,
  ArrowRight,
  LogOut,
  AlertCircle,
  Building2,
  Crown,
  Github,
  Loader2,
} from "lucide-react";
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
            <DialogHeader className="gap-1 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base">
                      {title || (isSignUp ? "Create Workspace Account" : "Sign In to Tokens Platform")}
                    </DialogTitle>
                    <Badge variant="success" className="text-[10px] py-0 font-semibold">
                      100% Free
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs">
                    {subtitle || (isSignUp
                      ? "Get started with multi-tenant design token management — no credit card needed"
                      : "Access your cloud organizations and token repositories")}
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
                  <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
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

            <div className="text-center pt-1 border-t border-border">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignUp
                  ? "Already have an account? Sign In"
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
