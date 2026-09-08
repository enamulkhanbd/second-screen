"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { UserRole, ROLE_DEFINITIONS, OrganizationInvitation } from "@/types/tenant";
import { UserActivityItem } from "@/types/tokens";
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
  RotateCcw,
  AlertTriangle,
  Calendar,
  Activity,
  GitCommit,
  GitBranch,
  UploadCloud,
  Package,
  Layers,
  FolderGit2,
  Search,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    currentProject,
    pendingInvitations,
    loadInvitations,
    sendInvitationAction,
    resendInvitationAction,
    revokeInvitationAction,
    removeMemberAction,
    addToast,
    getCurrentUserRole,
    membersSubTab,
    setMembersSubTab,
    userActivities,
    clearUserActivities,
    credentials,
  } = useTokenStore();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("editor");
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [previewInvitation, setPreviewInvitation] = useState<OrganizationInvitation | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Activity tab filters & search
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [activitySearch, setActivitySearch] = useState("");

  useEffect(() => {
    if (currentOrg) {
      loadInvitations(currentOrg.id);
    }
  }, [currentOrg, loadInvitations]);

  const userRole = getCurrentUserRole();
  const isOwner = currentOrg?.ownerUid === currentUser?.uid;
  const canManageRoles = isOwner || userRole === "admin";
  const canInvite = isOwner || userRole === "admin" || userRole === "editor";

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    if (!canInvite) {
      addToast({
        type: "error",
        title: "Permission Denied",
        message: "Viewer role cannot send invitations.",
      });
      return;
    }

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
    if (!canManageRoles) {
      addToast({
        type: "error",
        title: "Permission Denied",
        message: "Only Admin and Owner can change member roles.",
      });
      return;
    }
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

  const handleResendInvite = async (invId: string) => {
    setResendingId(invId);
    try {
      const refreshed = await resendInvitationAction(invId);
      if (refreshed) {
        addToast({
          type: "success",
          title: "Invitation Renewed & Sent",
          message: `New 7-day invitation link generated for ${refreshed.inviteeEmail}.`,
        });
        setPreviewInvitation(refreshed);
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Failed to Resend",
        message: err.message || "Could not renew invitation.",
      });
    } finally {
      setResendingId(null);
    }
  };

  // Format date and time
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Calculate expiration status
  const getExpiryStatus = (expiresAt?: string) => {
    if (!expiresAt) return { isExpired: false, label: "No expiration" };
    const expireTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffMs = expireTime - now;

    if (diffMs <= 0) {
      return { isExpired: true, label: `Expired on ${formatDateTime(expiresAt)}` };
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return { isExpired: false, label: `Expires in ${diffDays}d ${diffHours}h (${formatDateTime(expiresAt)})` };
    }
    return { isExpired: false, label: `Expires in ${diffHours}h (${formatDateTime(expiresAt)})` };
  };

  const memberEmails = useMemo(() => {
    return new Set((currentOrg?.members || []).map((m) => m.email.toLowerCase()));
  }, [currentOrg?.members]);

  const activePendingInvitations = useMemo(() => {
    return pendingInvitations.filter(
      (inv) => inv.status === "pending" && !memberEmails.has(inv.inviteeEmail.toLowerCase())
    );
  }, [pendingInvitations, memberEmails]);

  // Real workspace activities (no mock fallbacks)
  const allActivities: UserActivityItem[] = useMemo(() => {
    return userActivities || [];
  }, [userActivities]);

  const filteredActivities = useMemo(() => {
    let list = allActivities;
    if (activityFilter !== "all") {
      list = list.filter((a) => a.type === activityFilter);
    }
    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.actor?.name?.toLowerCase().includes(q) ||
          a.actor?.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allActivities, activityFilter, activitySearch]);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getActivityIcon = (type: UserActivityItem["type"]) => {
    switch (type) {
      case "git":
        return <GitCommit className="w-4 h-4 text-blue-500" />;
      case "token":
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case "figma":
        return <Layers className="w-4 h-4 text-rose-500" />;
      case "asset":
        return <ImageIcon className="w-4 h-4 text-indigo-500" />;
      case "release":
        return <Package className="w-4 h-4 text-amber-500" />;
      case "team":
        return <Users className="w-4 h-4 text-emerald-500" />;
      case "project":
        return <FolderGit2 className="w-4 h-4 text-cyan-500" />;
      default:
        return <Activity className="w-4 h-4 text-primary" />;
    }
  };

  const getActivityBadgeVariant = (type: UserActivityItem["type"]) => {
    switch (type) {
      case "git":
        return "outline";
      case "token":
        return "secondary";
      case "asset":
        return "secondary";
      case "figma":
        return "outline";
      case "release":
        return "warning";
      case "team":
        return "success";
      default:
        return "outline";
    }
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
      <div className="px-8 py-6 border-b border-border/80 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>{currentOrg.name}</span>
              <span>/</span>
              <span className="text-foreground font-semibold">Members</span>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Team &amp; Access Management</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-2.5 py-1 gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{members.length} {members.length === 1 ? "Member" : "Members"}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl w-full mx-auto p-8 space-y-8">
        <div className="space-y-8">
            {/* Section 1: Invite New Member */}
            {canInvite && (
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
                        {canManageRoles && (
                          <SelectItem value="admin">
                            <span className="font-semibold text-xs">Admin</span>
                          </SelectItem>
                        )}
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              {member.displayName || member.email.split("@")[0]}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">You</Badge>
                            )}
                            {isMemberOwner && (
                              <Badge variant="default" className="text-[9px] px-1.5 py-0 gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <Crown className="size-2.5" />
                                <span>Owner</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Role Selector or Badge */}
                        {isMemberOwner ? (
                          <Badge variant="outline" className="text-xs capitalize font-medium px-2.5 py-1">
                            Owner
                          </Badge>
                        ) : canManageRoles ? (
                          <Select
                            value={member.role}
                            onValueChange={(val: any) => handleRoleChange(member.email, val as UserRole)}
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue placeholder="Role" />
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
                        ) : (
                          <Badge variant="outline" className="text-xs capitalize font-medium px-2.5 py-1">
                            {roleDef.title}
                          </Badge>
                        )}

                        {/* Remove Action */}
                        {canManageRoles && !isMemberOwner && !isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMemberAction(member.email)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
