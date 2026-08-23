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
  CheckCircle2,
  ShieldAlert,
  UserX,
  Send,
  Link,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const MembersView: React.FC = () => {
  const {
    currentOrg,
    currentUser,
    pendingInvitations,
    loadInvitations,
    sendInvitationAction,
    revokeInvitationAction,
    removeMemberAction,
    addToast,
    getCurrentUserRole,
  } = useTokenStore();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("editor");
  const [loading, setLoading] = useState(false);
  const [previewInvitation, setPreviewInvitation] = useState<OrganizationInvitation | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrg) {
      loadInvitations(currentOrg.id);
    }
  }, [currentOrg, loadInvitations]);

  const userRole = getCurrentUserRole();
  const isOwner = currentOrg?.ownerUid === currentUser?.uid;
  const canManageMembers = isOwner || userRole === "admin";

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
    if (!currentOrg) return;
    const member = currentOrg.members?.find((m) => m.email === memberEmail);
    if (!member) return;

    try {
      await updateOrgMember(currentOrg.id, {
        ...member,
        role: newRole,
      });

      const updatedMembers = currentOrg.members.map((m) =>
        m.email === memberEmail ? { ...m, role: newRole } : m
      );
      useTokenStore.setState((state) => ({
        currentOrg: { ...state.currentOrg!, members: updatedMembers },
        userOrgs: state.userOrgs.map((o) =>
          o.id === state.currentOrg?.id ? { ...o, members: updatedMembers } : o
        ),
      }));

      addToast({
        type: "success",
        title: "Role Updated",
        message: `Updated ${member.displayName || memberEmail}'s role to ${ROLE_DEFINITIONS[newRole].title}.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Role Update Failed",
        message: err.message || "Could not update member role.",
      });
    }
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const inviteUrl = `${origin}?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
    addToast({
      type: "success",
      title: "Invitation Link Copied",
      message: "Direct join link copied to clipboard.",
    });
  };

  if (!currentOrg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <h2 className="text-base font-bold text-foreground">No Organization Selected</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Please select or create an organization to view team members.
        </p>
      </div>
    );
  }

  const members = currentOrg.members || [];
  const selectedRoleDef = ROLE_DEFINITIONS[inviteRole];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background text-foreground font-sans">
      {/* Top Header */}
      <div className="px-8 py-6 border-b border-border/80 bg-card/40 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>{currentOrg.name}</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Members &amp; Access</span>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Team Members</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2.5 py-1 gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{members.length} {members.length === 1 ? "Member" : "Members"}</span>
          </Badge>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto p-8 space-y-8">
        {/* Section 1: Invite New Member */}
        {canManageMembers && (
          <form onSubmit={handleSendInvite} className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span>Invite New Team Member</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Send an email invite or generate a secure direct join link.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6 space-y-1.5">
                <Label className="text-xs font-semibold">Colleague Email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="designer@company.com"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(val: any) => setInviteRole(val as UserRole)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <span className="font-semibold text-xs">Admin</span>
                    </SelectItem>
                    <SelectItem value="editor">
                      <span className="font-semibold text-xs">Editor</span>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <span className="font-semibold text-xs">Viewer</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-3">
                <Button
                  type="submit"
                  disabled={loading || !inviteEmail.trim()}
                  className="w-full h-9 text-xs font-bold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? "Sending..." : "Send Invite"}</span>
                </Button>
              </div>
            </div>

            {/* Role Permissions Hint */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/70 text-xs text-muted-foreground flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">{selectedRoleDef.title} Role: </span>
                <span>{selectedRoleDef.description}</span>
              </div>
            </div>
          </form>
        )}

        {/* Section 2: Active Members Roster */}
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="p-6 border-b border-border/70 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Active Members ({members.length})</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Designers and engineers with access to this organization&apos;s design tokens and projects.
              </p>
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {members.map((member) => {
              const isMemberOwner = member.role === "owner" || member.uid === currentOrg.ownerUid;
              const isCurrentUser = member.uid === currentUser?.uid || member.email === currentUser?.email;
              const roleDef = ROLE_DEFINITIONS[member.role] || ROLE_DEFINITIONS.editor;

              return (
                <div
                  key={member.email}
                  className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 flex-shrink-0">
                      {member.displayName ? member.displayName.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <span>{member.displayName || member.email.split("@")[0]}</span>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>{member.email}</span>
                        <span>•</span>
                        <span>Joined {new Date(member.joinedAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isMemberOwner ? (
                      <Badge variant="violet" className="text-[10px] gap-1 font-semibold">
                        <Crown className="w-3 h-3" />
                        <span>Owner</span>
                      </Badge>
                    ) : canManageMembers ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => handleRoleChange(member.email, newRole as UserRole)}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="h-8 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>

                        {!isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMemberAction(member.email)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            title="Remove Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {roleDef.title}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-6 border-b border-border/70 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Pending Invitations ({pendingInvitations.length})</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Invitations waiting to be accepted by colleagues.
                </p>
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <span>{inv.inviteeEmail}</span>
                      <Badge variant="outline" className="text-[10px] font-normal capitalize">
                        {inv.role}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Invited by {inv.invitedByName || inv.invitedByEmail}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(inv.token)}
                      className="h-8 text-xs gap-1.5"
                    >
                      {copiedToken === inv.token ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedToken === inv.token ? "Copied" : "Copy Link"}</span>
                    </Button>

                    {canManageMembers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeInvitationAction(inv.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Email Preview Modal */}
      {previewInvitation && (
        <InviteEmailPreviewModal
          isOpen={Boolean(previewInvitation)}
          onClose={() => setPreviewInvitation(null)}
          invitation={previewInvitation}
        />
      )}
    </div>
  );
};
