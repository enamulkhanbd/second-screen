"use client";

import React, { useState } from "react";
import { OrganizationInvitation, ROLE_DEFINITIONS } from "@/types/tenant";
import {
  Copy,
  Check,
  ExternalLink,
  Clock,
  Link2,
  Mail,
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
  const inviteLink = `${origin}/invite/${invitation.token}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      addToast({
        type: "success",
        title: "Invite Link Copied",
        message: "Share the link with the invited person.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addToast({
        type: "error",
        title: "Could Not Copy Link",
        message: "Select and copy the invitation link instead.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden font-sans">
        <DialogHeader className="p-6 border-b border-border bg-muted/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-base font-bold">Invitation created</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                Share this invite with <span className="font-semibold text-foreground break-all">{invitation.inviteeEmail}</span>.
                They&apos;ll join using this email address.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-xs">
            <dt className="text-muted-foreground">Workspace</dt>
            <dd className="font-semibold text-foreground break-words">{invitation.orgName}</dd>
            <dt className="text-muted-foreground">Invited by</dt>
            <dd className="font-medium text-foreground break-words">
              {invitation.invitedByName} <span className="text-muted-foreground">({invitation.invitedByEmail})</span>
            </dd>
            <dt className="text-muted-foreground">Role</dt>
            <dd>
              <Badge variant="violet" className="text-[11px] gap-1">
                <span>{roleDef.icon}</span>
                <span>{roleDef.title}</span>
              </Badge>
            </dd>
            <dt className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Expires
            </dt>
            <dd className="text-foreground">
              {new Date(invitation.expiresAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </dd>
          </dl>

          <div className="space-y-2">
            <label htmlFor="invite-share-link" className="text-xs font-semibold">Invitation link</label>
            <div className="flex items-stretch gap-2">
              <div
                id="invite-share-link"
                className="min-w-0 flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 text-xs font-mono text-muted-foreground break-all select-all"
              >
                {inviteLink}
              </div>
              <Button type="button" onClick={handleCopyLink} className="shrink-0 gap-1.5 text-xs">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy link"}</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              The invitee can create an account or sign in, then join the workspace.
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 sm:justify-between">
          <Button asChild variant="outline" className="gap-1.5 text-xs">
            <a href={inviteLink} target="_blank" rel="noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open invite page</span>
            </a>
          </Button>
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
