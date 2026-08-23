"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Sparkles,
  ArrowRight,
  LogOut,
  AlertCircle,
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
  const { currentUser, setCurrentUser, addToast } = useTokenStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isFirebaseConfigured && auth) {
        if (isSignUp) {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          if (name && cred.user) {
            await updateProfile(cred.user, { displayName: name });
          }
          setCurrentUser({
            uid: cred.user.uid,
            email: cred.user.email || email,
            displayName: name || cred.user.email?.split("@")[0] || "User",
          });
          addToast({
            type: "success",
            title: "Welcome to Tokens Platform!",
            message: `Account created successfully for ${email}.`,
          });
        } else {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          setCurrentUser({
            uid: cred.user.uid,
            email: cred.user.email || email,
            displayName: cred.user.displayName || email.split("@")[0],
          });
          addToast({
            type: "success",
            title: "Logged In",
            message: `Welcome back, ${cred.user.displayName || email}!`,
          });
        }
      } else {
        // Local Dev / Demo Mode Login
        const mockUid = `usr_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
        setCurrentUser({
          uid: mockUid,
          email,
          displayName: name || email.split("@")[0] || "Designer",
        });
        addToast({
          type: "success",
          title: "Logged In (Local Mode)",
          message: `Signed in as ${name || email}.`,
        });
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
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      // Local fallback for Google sign-in
      setCurrentUser({
        uid: "usr_google_demo",
        email: "designer@company.com",
        displayName: "Design Lead",
      });
      addToast({
        type: "success",
        title: "Signed In with Google (Demo)",
        message: "Logged in as Design Lead.",
      });
      onClose();
      if (onSuccess) onSuccess();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setCurrentUser({
        uid: cred.user.uid,
        email: cred.user.email || "",
        displayName: cred.user.displayName || "Google User",
        avatarUrl: cred.user.photoURL || undefined,
      });
      addToast({
        type: "success",
        title: "Signed In with Google",
        message: `Welcome ${cred.user.displayName || cred.user.email}!`,
      });
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    setCurrentUser(null);
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
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-xs">
                  {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email[0].toUpperCase()}
                </div>
                <div>
                  <DialogTitle className="text-base">{currentUser.displayName || "User Profile"}</DialogTitle>
                  <DialogDescription className="text-xs">{currentUser.email}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-3.5 rounded-xl bg-muted/50 border border-border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-[11px] text-foreground">{currentUser.uid}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Session Status</span>
                <Badge variant="success">Active Session</Badge>
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full gap-2 text-xs"
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
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full gap-2 text-xs h-9"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Continue with Google</span>
            </Button>

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
                disabled={loading}
                className="w-full gap-1.5 text-xs h-9 mt-2"
              >
                <span>{loading ? "Authenticating..." : isSignUp ? "Create Account" : "Sign In"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
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
