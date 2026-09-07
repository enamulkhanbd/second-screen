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
  Building2,
  Crown,
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
    currentOrg,
    getCurrentUserRole,
    addToast,
  } = useTokenStore();
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
      if (err.code === "auth/unauthorized-domain" || err.message?.includes("unauthorized-domain")) {
        setError("Firebase auth/unauthorized-domain: This domain is not in Firebase Authorized Domains. Access via http://localhost:3000 or add this domain in Firebase Console.");
      } else {
        setError(err.message || "Google sign in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    setCurrentUser({
      uid: "usr_google_demo",
      email: "designer@company.com",
      displayName: "Design Lead",
    });
    addToast({
      type: "success",
      title: "Signed In (Demo Mode)",
      message: "Logged in as Design Lead.",
    });
    onClose();
    if (onSuccess) onSuccess();
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
                {error.includes("unauthorized-domain") && (
                  <div className="pt-2 border-t border-destructive/20 flex flex-col gap-2">
                    <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
                      Use <span className="font-mono font-semibold text-foreground">http://localhost:3000</span> instead of <span className="font-mono">127.0.0.1</span>, or add your current domain to Firebase Authorized Domains.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleDemoSignIn}
                      className="h-7 text-xs self-start cursor-pointer font-semibold"
                    >
                      Bypass &amp; Continue in Demo Mode
                    </Button>
                  </div>
                )}
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
