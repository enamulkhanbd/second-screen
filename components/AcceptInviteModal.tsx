"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ROLE_DEFINITIONS } from "@/types/tenant";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Sparkles,
  Check,
  Building2,
  Shield,
  ArrowRight,
  UserCheck,
  X,
  AlertCircle,
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
  const [error, setError] = useState<string | null>(null);

  if (!pendingInvitePrompt) return null;

  const roleDef = ROLE_DEFINITIONS[pendingInvitePrompt.role] || ROLE_DEFINITIONS.editor;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!currentUser) {
      await handleGoogleSignIn();
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
        <DialogHeader className="p-6 border-b border-border bg-gradient-to-b from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
              {pendingInvitePrompt.orgName[0]?.toUpperCase() || "T"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold">
                  Team Invitation
                </DialogTitle>
                <Badge variant="violet" className="text-[10px] gap-1 font-bold">
                  <span>{roleDef.icon}</span>
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
              <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                <span>{roleDef.icon}</span>
                <span>Role Privileges:</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {roleDef.description}
              </p>
            </div>
          </div>

          {!currentUser ? (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3 text-center">
              <p className="text-xs text-muted-foreground">
                Sign in with your Google account to accept and verify your membership.
              </p>
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full gap-2 text-xs font-bold"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? "Signing In..." : "Sign In with Google to Join"}</span>
              </Button>
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
            disabled={loading}
            className="text-xs"
          >
            Decline
          </Button>

          {currentUser && (
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={loading}
              className="gap-1.5 text-xs font-bold"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{loading ? "Joining..." : "Accept & Join Workspace"}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
