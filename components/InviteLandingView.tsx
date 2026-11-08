"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ROLE_DEFINITIONS, UserRole } from "@/types/tenant";
import { TokensPlatformLogo } from "@/components/TokensPlatformLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Github,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  User,
} from "lucide-react";

type InviteState = "pending" | "accepted" | "revoked" | "expired";

interface InviteInfo {
  state: InviteState;
  orgName: string;
  orgIcon: string | null;
  orgColor: string | null;
  orgLogoUrl: string | null;
  role: UserRole;
  invitedByName: string;
  inviteeEmail: string;
  expiresAt: string;
}

interface SessionUser {
  email: string;
  name: string;
}

type Busy = "form" | "google" | "github" | "join" | null;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const TERMINAL_COPY: Record<Exclude<InviteState, "pending"> | "not_found", { title: string; body: string }> = {
  expired: {
    title: "This invitation has expired",
    body: "Ask the person who invited you to send a new invitation.",
  },
  revoked: {
    title: "This invitation was withdrawn",
    body: "The workspace admin cancelled it. Contact them if this is unexpected.",
  },
  accepted: {
    title: "This invitation was already used",
    body: "Sign in to open the workspace if you have already joined.",
  },
  not_found: {
    title: "We couldn't find this invitation",
    body: "The link may be incomplete or no longer valid. Check the email you received, or ask for a new invitation.",
  },
};

const Stepper: React.FC<{ step: 1 | 2; hasAccount: boolean }> = ({ step, hasAccount }) => {
  const steps = [hasAccount ? "Sign in" : "Create account", "Join workspace"];
  return (
    <ol className="flex items-center gap-3 text-xs font-medium">
      {steps.map((label, index) => {
        const number = index + 1;
        const done = number < step;
        const active = number === step;
        return (
          <li key={label} className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                    ? "bg-primary/15 text-primary ring-1 ring-primary/50"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : number}
              </span>
              <span className={active || done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            </span>
            {index < steps.length - 1 && <span className="w-8 h-px bg-border" />}
          </li>
        );
      })}
    </ol>
  );
};

const OrgAvatar: React.FC<{ info: InviteInfo }> = ({ info }) => {
  if (info.orgLogoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={info.orgLogoUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border border-border" />;
  }
  return (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-sm"
      style={{ backgroundColor: info.orgColor || "#6d28d9" }}
    >
      {info.orgIcon || info.orgName[0]?.toUpperCase() || "T"}
    </div>
  );
};

const AUTH_CARD_CLASS =
  "w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl space-y-5";

const ErrorNotice: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-start gap-2">
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
    <span className="leading-snug">{message}</span>
  </div>
);

const GoogleIcon: React.FC = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const InviteLandingView: React.FC<{ token: string }> = ({ token }) => {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not_found" | "error">("loading");
  const [sessionUser, setSessionUser] = useState<SessionUser | null | undefined>(undefined);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  // True when this visit follows an auth step taken on this page, so joining is automatic.
  const autoJoin = useRef(false);
  const joinStarted = useRef(false);

  const invitePath = `/invite/${token}`;

  useEffect(() => {
    autoJoin.current = new URLSearchParams(window.location.search).get("flow") === "auth";
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/invitations/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) return setLoadState("not_found");
        if (!res.ok) return setLoadState("error");
        setInfo(await res.json());
        setLoadState("ready");
      })
      .catch(() => !cancelled && setLoadState("error"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSessionUser(null);
      return;
    }
    const toSessionUser = (user: any): SessionUser | null =>
      user?.email
        ? {
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split("@")[0],
          }
        : null;

    supabase.auth.getSession().then(({ data }: any) => setSessionUser(toSessionUser(data.session?.user)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSessionUser(toSessionUser(session?.user));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const join = useCallback(async () => {
    setBusy("join");
    setError(null);
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        joinStarted.current = false;
        setError(payload?.error || "Could not join the workspace.");
        setBusy(null);
        return;
      }
      try {
        localStorage.setItem("ts_active_org_id", payload.orgId);
        sessionStorage.removeItem("ts_pending_invite_token");
      } catch {}
      window.location.assign(payload.orgSlug ? `/${encodeURIComponent(payload.orgSlug)}` : "/");
    } catch {
      joinStarted.current = false;
      setError("Network error. Please try again.");
      setBusy(null);
    }
  }, [token]);

  const emailMatches =
    Boolean(info && sessionUser) && normalizeEmail(sessionUser!.email) === normalizeEmail(info!.inviteeEmail);

  useEffect(() => {
    if (info?.state === "pending" && emailMatches && autoJoin.current && !joinStarted.current) {
      joinStarted.current = true;
      void join();
    }
  }, [info, emailMatches, join]);

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(`${invitePath}?flow=auth`)}`;

  const handleOAuth = async (provider: "google" | "github") => {
    if (!info || !supabase) return;
    setBusy(provider);
    setError(null);
    const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl(),
        ...(provider === "google" ? { queryParams: { login_hint: info.inviteeEmail } } : {}),
      },
    });
    if (oAuthErr) {
      setError(oAuthErr.message);
      setBusy(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info || !supabase) return;
    setBusy("form");
    setError(null);
    autoJoin.current = true;

    if (mode === "signup") {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: info.inviteeEmail,
        password,
        options: {
          data: { full_name: name.trim(), name: name.trim() },
          emailRedirectTo: callbackUrl(),
        },
      });
      if (signUpErr) {
        autoJoin.current = false;
        setError(signUpErr.message);
      } else if (!data.session) {
        autoJoin.current = false;
        setConfirmationSent(true);
      }
    } else {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: info.inviteeEmail,
        password,
      });
      if (signInErr) {
        autoJoin.current = false;
        setError(signInErr.message);
      }
    }
    setBusy(null);
  };

  const handleSwitchAccount = async () => {
    await supabase?.auth.signOut();
    autoJoin.current = false;
    setError(null);
  };

  const renderTerminal = (key: keyof typeof TERMINAL_COPY) => (
    <div className="max-w-md w-full text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold">{TERMINAL_COPY[key].title}</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">{TERMINAL_COPY[key].body}</p>
      <Button onClick={() => window.location.assign("/")} variant="outline">
        {key === "accepted" ? "Go to sign in" : "Back to Tokens Platform"}
      </Button>
    </div>
  );

  const renderRightPanel = () => {
    if (!info) return null;

    if (info.state !== "pending") return renderTerminal(info.state);

    if (sessionUser === undefined) {
      return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
    }

    if (sessionUser && !emailMatches) {
      return (
        <>
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight">Wrong account</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You&apos;re signed in as <strong className="text-foreground">{sessionUser.email}</strong>, but this
              invitation was sent to <strong className="text-foreground">{info.inviteeEmail}</strong>.
            </p>
          </div>
          <Button className="w-full h-9 text-xs font-bold shadow-md" onClick={handleSwitchAccount}>
            Sign out and use {info.inviteeEmail}
          </Button>
        </>
      );
    }

    if (sessionUser && emailMatches) {
      return (
        <>
          <div className="flex justify-center">
            <Stepper step={2} hasAccount />
          </div>
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight">
              {busy === "join" ? `Joining ${info.orgName}...` : `Join ${info.orgName}`}
            </h2>
            <p className="text-xs text-muted-foreground">
              Signed in as <strong className="text-foreground">{sessionUser.email}</strong>
            </p>
          </div>
          {error && <ErrorNotice message={error} />}
          <Button className="w-full h-9 text-xs font-bold gap-1.5 shadow-md" onClick={join} disabled={busy === "join"}>
            <span>{busy === "join" ? "Joining..." : `Join ${info.orgName}`}</span>
            {busy === "join" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </Button>
        </>
      );
    }

    if (confirmationSent) {
      return (
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <MailCheck className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Confirm your email</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We sent a confirmation link to <strong className="text-foreground">{info.inviteeEmail}</strong>. Open it
            and you&apos;ll join {info.orgName} automatically.
          </p>
        </div>
      );
    }

    const isSignUp = mode === "signup";
    return (
      <>
        <div className="flex justify-center">
          <Stepper step={1} hasAccount={!isSignUp} />
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight">
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isSignUp
              ? `Set up your account to join ${info.orgName}`
              : `Sign in with ${info.inviteeEmail} to join ${info.orgName}`}
          </p>
        </div>

        {error && <ErrorNotice message={error} />}

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => handleOAuth("google")}
            className="w-full h-10 gap-2 text-xs font-semibold bg-background hover:bg-muted border-border/80 shadow-xs"
          >
            {busy === "google" ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <GoogleIcon />}
            <span>{busy === "google" ? "Connecting..." : "Google"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => handleOAuth("github")}
            className="w-full h-10 gap-2 text-xs font-semibold bg-background hover:bg-muted border-border/80 shadow-xs"
          >
            {busy === "github" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Github className="w-4 h-4 flex-shrink-0 text-foreground" />
            )}
            <span>{busy === "github" ? "Connecting..." : "GitHub"}</span>
          </Button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <span className="relative px-3 bg-card text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            or with email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div className="space-y-1 text-left">
              <Label htmlFor="invite-name" className="text-xs font-semibold">
                Full Name
              </Label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="invite-name"
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          )}

          <div className="space-y-1 text-left">
            <Label htmlFor="invite-email" className="text-xs font-semibold">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="invite-email"
                type="email"
                value={info.inviteeEmail}
                readOnly
                className="pl-9 h-9 text-xs bg-muted/40 text-muted-foreground cursor-not-allowed"
              />
              <Lock className="w-3 h-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <Label htmlFor="invite-password" className="text-xs font-semibold">
              Password
            </Label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="invite-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={6}
                required
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy !== null}
            className="w-full h-9 text-xs font-bold gap-1.5 shadow-md mt-2"
          >
            <span>
              {busy === "form" ? "Authenticating..." : isSignUp ? "Create Account & Join" : "Sign In & Join"}
            </span>
            {busy === "form" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? "signin" : "signup");
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
                New to Tokens Platform? <strong className="text-primary font-semibold">Create an account</strong>
              </span>
            )}
          </button>
        </div>
      </>
    );
  };

  if (loadState === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (loadState !== "ready" || !info) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        {loadState === "not_found" ? (
          renderTerminal("not_found")
        ) : (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">Something went wrong loading this invitation.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        )}
      </main>
    );
  }

  const roleDef = ROLE_DEFINITIONS[info.role] ?? ROLE_DEFINITIONS.editor;

  return (
    <main className="min-h-screen grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] bg-background text-foreground font-sans">
      <section className="relative flex flex-col justify-between p-8 sm:p-12 bg-muted/20 border-b lg:border-b-0 lg:border-r border-border">
        <TokensPlatformLogo variant="full" />

        <div className="py-10 lg:py-0 space-y-6 max-w-md">
          <OrgAvatar info={info} />
          <div className="space-y-2.5">
            <p className="text-xs font-mono font-medium text-muted-foreground">Workspace invitation</p>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
              Join <span className="text-primary">{info.orgName}</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">{info.invitedByName}</strong> invited you to collaborate on design
              tokens as {roleDef.title === "Admin" ? "an" : "a"}{" "}
              <strong className="text-foreground">{roleDef.title}</strong>.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card text-xs space-y-1.5">
            <div className="font-semibold text-foreground">
              {roleDef.title} permissions
            </div>
            <p className="text-muted-foreground leading-relaxed">{roleDef.description}</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Invitation expires {new Date(info.expiresAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        {info.state === "pending" && sessionUser !== undefined ? (
          <div className={AUTH_CARD_CLASS}>{renderRightPanel()}</div>
        ) : (
          renderRightPanel()
        )}
      </section>
    </main>
  );
};
