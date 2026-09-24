"use client";

import React, { useState } from "react";
import { OrganizationInvitation, ROLE_DEFINITIONS } from "@/types/tenant";
import {
  Mail,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
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
import { TokensPlatformLogo } from "@/components/TokensPlatformLogo";
import { useTokenStore } from "@/store/useTokenStore";

interface InviteEmailPreviewModalProps {
  invitation: OrganizationInvitation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InviteEmailPreviewModal: React.FC<InviteEmailPreviewModalProps> = ({
  invitation,
  isOpen,
  onClose,
}) => {
  const { addToast } = useTokenStore();
  const [copied, setCopied] = useState(false);

  if (!invitation) return null;

  const roleDef = ROLE_DEFINITIONS[invitation.role];
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const inviteLink = `${origin}/?invite=${invitation.token}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    addToast({
      type: "success",
      title: "Invite Link Copied",
      message: "Direct workspace invitation link copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden font-sans">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Invitation Email Preview
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Email invitation dispatched to <span className="font-semibold text-foreground">{invitation.inviteeEmail}</span>
                </DialogDescription>
              </div>
            </div>

            <Badge variant="violet" className="text-xs capitalize gap-1">
              <span>{roleDef.icon}</span>
              <span>{roleDef.title} Role</span>
            </Badge>
          </div>
        </DialogHeader>

        {/* Email Body Container (Styled HTML Card) */}
        <div className="p-6 bg-slate-50 dark:bg-zinc-950/60 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Email Envelope Meta */}
          <div className="p-3 rounded-lg bg-card border border-border space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span>From: <strong className="text-foreground">Tokens Platform &lt;invites@tokensplatform.io&gt;</strong></span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Valid for 7 days</span>
            </div>
            <div className="text-muted-foreground text-[11px]">
              <span>To: <strong className="text-foreground">{invitation.inviteeEmail}</strong></span>
            </div>
            <div className="text-foreground font-semibold text-xs pt-1 border-t border-border/50">
              Subject: You&apos;ve been invited to join &quot;{invitation.orgName}&quot; on Tokens Platform
            </div>
          </div>

          {/* Rendered Email Template */}
          <div className="p-6 rounded-xl bg-card border border-border shadow-sm space-y-5 text-left">
            {/* Brand Logo */}
            <div className="flex items-center gap-2">
              <TokensPlatformLogo variant="full" size={20} />
            </div>

            {/* Main Message */}
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">
                Join {invitation.orgName} on Tokens Platform
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{invitation.invitedByName}</strong> ({invitation.invitedByEmail}) has invited you to collaborate on design tokens in <strong className="text-foreground">{invitation.orgName}</strong> with the <strong className="text-primary">{roleDef.title}</strong> role.
              </p>
            </div>

            {/* Role Permissions Card */}
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <span>{roleDef.icon}</span>
                <span>Your Permissions as {roleDef.title}:</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {roleDef.description}
              </p>
            </div>

            {/* CTA Button in Email */}
            <div className="pt-2">
              <a
                href={inviteLink}
                onClick={(e) => {
                  e.preventDefault();
                  handleCopyLink();
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              >
                <span>Accept Invitation & Join Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="pt-4 border-t border-border text-[11px] text-muted-foreground">
              If the button doesn&apos;t work, copy and paste this link in your browser:
              <div className="mt-1 font-mono text-[10px] bg-muted/60 p-2 rounded border border-border/80 break-all select-all text-foreground">
                {inviteLink}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Preview
          </Button>

          <Button
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 text-xs font-bold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Link Copied!" : "Copy Direct Invitation Link"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
