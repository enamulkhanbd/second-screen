"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ROLE_DEFINITIONS } from "@/types/tenant";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  UserCheck,
  AlertCircle,
  Github,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const GoogleIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const AcceptInviteModal: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    pendingInvitePrompt,
    setPendingInvitePrompt,
    acceptInvitationAction,
    addToast,
  } = useTokenStore();

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

    return () => {
      window.removeEventListener("pageshow", handleReset);
      window.removeEventListener("focus", handleReset);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (!pendingInvitePrompt) return null;

  const roleDef = ROLE_DEFINITIONS[pendingInvitePrompt.role] || ROLE_DEFINITIONS.editor;

  const handleGoogleSignIn = async () => {
    setError(null);
    setOauthLoading("google");
    try {
      if (isSupabaseConfigured && supabase) {
        const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
        const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: callbackUrl,
          },
        });
        if (oAuthErr) throw oAuthErr;
      } else {
        throw new Error("Supabase Database & Authentication are not configured.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
      setOauthLoading(null);
    }
  };

  const handleGithubSignIn = async () => {
    setError(null);
    setOauthLoading("github");
    try {
      if (isSupabaseConfigured && supabase) {
        const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
        const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
          provider: "github",
          options: {
            redirectTo: callbackUrl,
          },
        });
        if (oAuthErr) throw oAuthErr;
      } else {
        throw new Error("Supabase Database & Authentication are not configured.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in with GitHub.");
      setOauthLoading(null);
    }
  };

  const handleAccept = async () => {
    if (!currentUser) {
      await handleGoogleSignIn();
      return;
    }

    if (currentUser.email.trim().toLowerCase() !== pendingInvitePrompt.inviteeEmail.trim().toLowerCase()) {
      setError(`This invitation was sent to ${pendingInvitePrompt.inviteeEmail}. Sign in with that email to join.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const success = await acceptInvitationAction(pendingInvitePrompt.token);
      if (success) {
        addToast({
          type: "success",
          title: "Joined Workspace!",
          message: `You are now a member of "${pendingInvitePrompt.orgName}" as ${roleDef.title}.`,
        });
        setPendingInvitePrompt(null);
      } else {
        setError("Could not accept invitation. It may have expired.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to join workspace.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setPendingInvitePrompt(null);
  };

  return (
    <Dialog
      open={Boolean(pendingInvitePrompt)}
      onOpenChange={(open) => !open && handleDismiss()}
    >
      <DialogContent className="sm:max-w-md p-0 overflow-hidden font-sans">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-xs">
              {pendingInvitePrompt.orgName[0]?.toUpperCase() || "T"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold">
                  Team Invitation
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] gap-1 font-mono font-semibold">
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  <span>{roleDef.title}</span>
                </Badge>
              </div>
              <DialogDescription className="text-xs mt-0.5">
                Join <strong className="text-foreground">{pendingInvitePrompt.orgName}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">{pendingInvitePrompt.invitedByName}</strong> (
              <span className="font-mono text-[11px]">{pendingInvitePrompt.invitedByEmail}</span>) has invited you to join the design system team with the{" "}
              <strong className="text-primary">{roleDef.title}</strong> role.
            </div>

            <div className="pt-3 border-t border-border/70 space-y-1.5">
              <div className="font-semibold text-foreground text-xs">
                Role permissions
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {roleDef.description}
              </p>
            </div>
          </div>

          {!currentUser ? (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3 text-center">
              <p className="text-xs text-muted-foreground">
                Sign in with your Google or GitHub account to accept and verify your membership.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading || oauthLoading !== null}
                  className="w-full gap-2 text-xs font-semibold cursor-pointer"
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
                  className="w-full gap-2 text-xs font-semibold cursor-pointer"
                >
                  {oauthLoading === "github" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground flex-shrink-0" />
                  ) : (
                    <Github className="w-3.5 h-3.5 flex-shrink-0 text-foreground" />
                  )}
                  <span>{oauthLoading === "github" ? "Connecting..." : "GitHub"}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                  {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-foreground leading-tight">
                    {currentUser.displayName || "Signed In"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <Badge variant="success" className="text-[10px]">
                Ready to Join
              </Badge>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            disabled={loading || oauthLoading !== null}
            className="text-xs"
          >
            Decline
          </Button>

          {currentUser && (
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={loading || oauthLoading !== null}
              className="gap-1.5 text-xs font-bold"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              <span>{loading ? "Joining..." : "Accept & Join Workspace"}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
