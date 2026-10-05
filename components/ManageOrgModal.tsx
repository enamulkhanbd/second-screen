"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { UserRole, ROLE_DEFINITIONS, OrganizationInvitation } from "@/types/tenant";
import { updateOrgMember } from "@/services/organizationService";
import { InviteEmailPreviewModal } from "@/components/InviteEmailPreviewModal";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Crown,
  Copy,
  Check,
  Trash2,
  Clock,
  ExternalLink,
  Eye,
  Sliders,
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ManageOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageOrgModal: React.FC<ManageOrgModalProps> = ({ isOpen, onClose }) => {
  const {
    currentOrg,
    currentUser,
    pendingInvitations,
    loadInvitations,
    sendInvitationAction,
    revokeInvitationAction,
    removeMemberAction,
    addToast,
  } = useTokenStore();

  const [activeTab, setActiveTab] = useState<"members" | "invites">("members");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("editor");
  const [loading, setLoading] = useState(false);
  const [previewInvitation, setPreviewInvitation] = useState<OrganizationInvitation | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentOrg?.id) {
      loadInvitations(currentOrg.id);
    }
  }, [isOpen, currentOrg?.id, loadInvitations]);

  if (!currentOrg) return null;

  const isOwner = currentOrg.ownerUid === currentUser?.uid;
  const currentMember = currentOrg.members?.find((m) => m.uid === currentUser?.uid || m.email === currentUser?.email);
  const isOwnerOrAdmin = isOwner || currentMember?.role === "admin" || currentMember?.role === "owner";

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setLoading(true);
    try {
      const inv = await sendInvitationAction(inviteEmail.trim(), inviteRole);
      if (inv) {
        addToast({
          type: "success",
          title: "Invitation Created",
          message: `Invited ${inviteEmail} as ${ROLE_DEFINITIONS[inviteRole].title}.`,
        });
        setInviteEmail("");
        setPreviewInvitation(inv);
      }
    } catch (e: any) {
      addToast({
        type: "error",
        title: "Failed to Send Invite",
        message: e.message || "Error creating invitation",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberEmail: string, newRole: UserRole) => {
    const member = currentOrg.members?.find((m) => m.email === memberEmail);
    if (!member) return;

    try {
      const updated = { ...member, role: newRole };
      await updateOrgMember(currentOrg.id, updated);
      member.role = newRole;
      addToast({
        type: "info",
        title: "Role Updated",
        message: `Updated ${memberEmail} to ${ROLE_DEFINITIONS[newRole].title}.`,
      });
    } catch (e: any) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: e.message,
      });
    }
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const link = `${origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    addToast({
      type: "success",
      title: "Invite Link Copied",
      message: "Direct link copied to clipboard.",
    });
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden font-sans">
          {/* Header */}
          <DialogHeader className="p-6 border-b border-border bg-muted/20 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-sm">
                {currentOrg?.name?.[0]?.toUpperCase() || "T"}
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {currentOrg?.name || "Workspace"} — Team &amp; Permissions
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Manage organization access, assign roles, and dispatch email invitations.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Tab Navigation */}
          <div className="px-6 pt-3 border-b border-border bg-card">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="h-9 p-0 bg-transparent border-0 gap-4">
                <TabsTrigger
                  value="members"
                  className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-semibold gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Active Members ({currentOrg.members?.length || 1})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="invites"
                  className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-semibold gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Pending Invitations ({pendingInvitations.length})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Invite New Member Form (Available to Owners & Admins) */}
            {isOwnerOrAdmin && (
              <form
                onSubmit={handleSendInvite}
                className="p-4 rounded-xl bg-muted/40 border border-border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-primary" />
                    <span>Invite New Teammate</span>
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    Free signup for invitees
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-7">
                    <Input
                      type="email"
                      required
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Select
                      value={inviteRole}
                      onValueChange={(val: UserRole) => setInviteRole(val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">🛡️ Admin</SelectItem>
                        <SelectItem value="editor">✏️ Editor</SelectItem>
                        <SelectItem value="viewer">👁️ Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      size="sm"
                      className="w-full h-8 text-xs font-bold gap-1"
                    >
                      <span>{loading ? "Sending..." : "Invite"}</span>
                    </Button>
                  </div>
                </div>

                {/* Role Description Preview */}
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                  <span>{ROLE_DEFINITIONS[inviteRole].icon}</span>
                  <span>{ROLE_DEFINITIONS[inviteRole].description}</span>
                </div>
              </form>
            )}

            {/* TAB 1: MEMBERS */}
            {activeTab === "members" && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Organization Roster
                </div>

                <div className="space-y-2">
                  {currentOrg.members?.map((member) => {
                    const isSelf = member.uid === currentUser?.uid || member.email === currentUser?.email;
                    const isOrgOwner = member.role === "owner" || member.uid === currentOrg.ownerUid;
                    const roleInfo = ROLE_DEFINITIONS[member.role] || ROLE_DEFINITIONS.editor;

                    return (
                      <div
                        key={member.uid || member.email}
                        className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-xs gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {member.displayName?.[0]?.toUpperCase() || member.email[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground truncate">
                                {member.displayName || member.email.split("@")[0]}
                              </span>
                              {isSelf && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate font-mono">
                              {member.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isOwnerOrAdmin && !isOrgOwner && !isSelf ? (
                            <Select
                              value={member.role}
                              onValueChange={(val: UserRole) => handleRoleChange(member.email, val)}
                            >
                              <SelectTrigger className="h-7 text-xs w-28 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">🛡️ Admin</SelectItem>
                                <SelectItem value="editor">✏️ Editor</SelectItem>
                                <SelectItem value="viewer">👁️ Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={isOrgOwner ? "violet" : "secondary"} className="gap-1 text-[11px]">
                              <span>{roleInfo.icon}</span>
                              <span>{roleInfo.title}</span>
                            </Badge>
                          )}

                          {isOwnerOrAdmin && !isOrgOwner && !isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Remove ${member.email} from ${currentOrg.name}?`)) {
                                  removeMemberAction(member.uid || member.email);
                                }
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title="Remove Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: PENDING INVITATIONS */}
            {activeTab === "invites" && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active Invites
                </div>

                {pendingInvitations.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground text-xs space-y-1">
                    <Mail className="w-6 h-6 mx-auto text-muted-foreground/60 mb-2" />
                    <p className="font-semibold text-foreground">No pending invitations</p>
                    <p className="text-[11px]">Invite teammates using the form above to grant access.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingInvitations.map((inv) => {
                      const roleInfo = ROLE_DEFINITIONS[inv.role] || ROLE_DEFINITIONS.editor;
                      const isCopied = copiedToken === inv.token;

                      return (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-xs gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate">
                                {inv.inviteeEmail}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <span>Role: <strong>{roleInfo.title}</strong></span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Valid</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewInvitation(inv)}
                              className="h-7 text-xs gap-1"
                              title="Preview Email Template"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Preview Email</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyLink(inv.token)}
                              className="h-7 text-xs gap-1"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? "Copied" : "Copy Link"}</span>
                            </Button>

                            {isOwnerOrAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeInvitationAction(inv.id)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Revoke Invitation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Preview Modal */}
      <InviteEmailPreviewModal
        invitation={previewInvitation}
        isOpen={Boolean(previewInvitation)}
        onClose={() => setPreviewInvitation(null)}
      />
    </>
  );
};
