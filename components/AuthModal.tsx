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
  X,
  Mail,
  Lock,
  User,
  Sparkles,
  ArrowRight,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser, addToast } = useTokenStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
            title: "Welcome to Second Screen!",
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
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch {}
    }
    setCurrentUser(null);
    addToast({
      type: "info",
      title: "Signed Out",
      message: "You have been logged out of Second Screen.",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-900 dark:text-zinc-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {currentUser ? (
          /* Profile & Logout View */
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 mx-auto flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-500/20">
              {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {currentUser.displayName || "Design Tokens User"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                {currentUser.email}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 text-left text-xs space-y-1">
              <div className="flex items-center justify-between text-zinc-500">
                <span>User ID:</span>
                <span className="font-mono text-[10px] text-zinc-400 truncate max-w-[180px]">
                  {currentUser.uid}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-500">
                <span>Status:</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Active Session
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold text-xs hover:bg-red-100 dark:hover:bg-red-900/60 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* Login / Sign Up Form */
          <>
            <div className="space-y-1 text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/80 text-violet-700 dark:text-violet-300 text-[11px] font-semibold mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Second Screen Cloud</span>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {isSignUp ? "Create an account" : "Welcome back"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isSignUp
                  ? "Sign up to collaborate across organizations and projects"
                  : "Sign in to access your organizations and design tokens"}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 text-xs text-red-600 dark:text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="line-clamp-2">{error}</span>
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-200 font-semibold text-xs shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800 flex-1" />
              <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
                Or with email
              </span>
              <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800 flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-violet-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-violet-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-violet-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>{loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium cursor-pointer"
              >
                {isSignUp
                  ? "Already have an account? Sign In"
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
