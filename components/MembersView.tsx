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

  // Seed default activities if list is currently empty
  const allActivities: UserActivityItem[] = useMemo(() => {
    if (userActivities && userActivities.length > 0) {
      return userActivities;
    }

    const now = Date.now();
    const actorName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "Enamul Khan";
    const actorEmail = currentUser?.email || "anamul.ipa@gmail.com";
    const actorAvatar = currentUser?.avatarUrl;
    const roleDef = ROLE_DEFINITIONS[userRole];

    return [
      {
        id: "act_1",
        type: "git",
        title: "Tokens Pushed to Remote",
        description: `Pushed latest typography and color tokens to branch "${credentials.branch || "main"}" on ${credentials.repo || "planet"}.`,
        timestamp: new Date(now - 12 * 60 * 1000).toISOString(),
        actor: { name: actorName, email: actorEmail, avatarUrl: actorAvatar },
        metadata: { branch: credentials.branch || "main", files: 3 },
      },
      {
        id: "act_2",
        type: "token",
        title: "Token Updated",
        description: 'Modified token "fontSize.heading.h1" value from "32px" to "36px".',
        timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
        actor: { name: actorName, email: actorEmail, avatarUrl: actorAvatar },
        metadata: { token: "fontSize.heading.h1", set: "typography/global" },
      },
      {
        id: "act_3",
        type: "git",
        title: "Branch Switched",
        description: `Switched active workspace branch to "${credentials.branch || "main"}".`,
        timestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
        actor: { name: actorName, email: actorEmail, avatarUrl: actorAvatar },
        metadata: { branch: credentials.branch || "main" },
      },
      {
        id: "act_4",
        type: "figma",
        title: "Figma Variables Synced",
        description: "Imported 48 design variables from Figma via Tokens Studio plugin bridge.",
        timestamp: new Date(now - 5 * 3600 * 1000).toISOString(),
        actor: { name: actorName, email: actorEmail, avatarUrl: actorAvatar },
        metadata: { variableCount: 48, source: "Figma Bridge" },
      },
      {
        id: "act_5",
        type: "release",
        title: "Release Package Published",
        description: "Compiled and published Release v1.2.0 for Web CSS & Style Dictionary.",
        timestamp: new Date(now - 24 * 3600 * 1000).toISOString(),
        actor: { name: actorName, email: actorEmail, avatarUrl: actorAvatar },
        metadata: { version: "v1.2.0", targets: ["Web App", "NPM"] },
      },
      {
        id: "act_6",
        type: "team",
        title: "Team Workspace Active",
        description: `Logged in to organization "${currentOrg?.name || "Planet Design System"}" with role "${roleDef.title}".`,
        timestamp: new Date(now - 48 * 3600 * 1000).toISOString(),
        actor: { name: actorName, email: actorEmail, avatarUrl: actorAvatar },
        metadata: { role: roleDef.title, org: currentOrg?.name },
      },
    ];
  }, [userActivities, currentUser, credentials.branch, credentials.repo, currentOrg?.name, userRole]);

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
          a.actor.name.toLowerCase().includes(q)
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

      if (diffMins < 2) return "Just now";
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
      {/* Top Header & Sub-Navigation */}
      <div className="px-8 pt-6 pb-0 border-b border-border/80 bg-card/40 backdrop-blur sticky top-0 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>{currentOrg.name}</span>
              <span>/</span>
              <span className="text-foreground font-semibold">Team &amp; Activity</span>
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

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-border/50 pt-2 pb-0 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setMembersSubTab("members")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              membersSubTab === "members"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Members</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
              {members.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setMembersSubTab("invites")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              membersSubTab === "invites"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Pending Invites</span>
            {activePendingInvitations.length > 0 && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                {activePendingInvitations.length}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMembersSubTab("activity")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              membersSubTab === "activity"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Activity Log</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
              {allActivities.length}
            </Badge>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl w-full mx-auto p-8 space-y-8">
        {/* ========================================================================= */}
        {/* SUBTAB 1: TEAM MEMBERS */}
        {/* ========================================================================= */}
        {membersSubTab === "members" && (
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
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 2: PENDING INVITATIONS */}
        {/* ========================================================================= */}
        {membersSubTab === "invites" && (
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-6 border-b border-border/70 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>Pending Invitations ({activePendingInvitations.length})</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Invitations waiting to be accepted. Direct join links expire after 7 days.
                </p>
              </div>
            </div>

            {activePendingInvitations.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <CheckCircle className="w-8 h-8 opacity-40 text-emerald-500" />
                <span className="text-xs font-semibold">No pending invitations</span>
                <span className="text-[11px] text-muted-foreground max-w-xs">
                  All invited teammates have joined, or no active invites have been issued.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {activePendingInvitations.map((inv) => {
                  const expiry = getExpiryStatus(inv.expiresAt);
                  const isExpired = expiry.isExpired;

                  return (
                    <div
                      key={inv.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors ${
                        isExpired ? "bg-destructive/5" : ""
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                          <span>{inv.inviteeEmail}</span>
                          <Badge variant="outline" className="text-[10px] font-normal capitalize">
                            {inv.role}
                          </Badge>
                          {isExpired && (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 gap-1 font-semibold">
                              <AlertTriangle className="size-2.5" />
                              <span>Expired</span>
                            </Badge>
                          )}
                        </div>

                        {/* Timestamps */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>Invited by {inv.invitedByName || inv.invitedByEmail}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Send className="size-3 text-muted-foreground/70" />
                            <span>Sent: {formatDateTime(inv.createdAt)}</span>
                          </span>
                          <span>•</span>
                          <span className={`flex items-center gap-1 ${isExpired ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            <Clock className="size-3" />
                            <span>{expiry.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isExpired ? (
                          <Button
                            size="sm"
                            onClick={() => handleResendInvite(inv.id)}
                            disabled={resendingId === inv.id}
                            className="h-8 text-xs font-semibold gap-1.5"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${resendingId === inv.id ? "animate-spin" : ""}`} />
                            <span>{resendingId === inv.id ? "Resending..." : "Resend Invitation"}</span>
                          </Button>
                        ) : (
                          <>
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

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendInvite(inv.id)}
                              disabled={resendingId === inv.id}
                              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                              title="Generate fresh 7-day invite link"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${resendingId === inv.id ? "animate-spin" : ""}`} />
                              <span>{resendingId === inv.id ? "Renewing..." : "Resend"}</span>
                            </Button>
                          </>
                        )}

                        {canManageRoles && (
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 3: USER & WORKSPACE ACTIVITY LOG */}
        {/* ========================================================================= */}
        {membersSubTab === "activity" && (
          <div className="space-y-6">
            {/* Top Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground">Total Events</span>
                <div className="text-xl font-bold text-foreground mt-1 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span>{allActivities.length}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground">Git Syncs</span>
                <div className="text-xl font-bold text-foreground mt-1 flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-blue-500" />
                  <span>{allActivities.filter((a) => a.type === "git").length}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground">Token Changes</span>
                <div className="text-xl font-bold text-foreground mt-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>{allActivities.filter((a) => a.type === "token" || a.type === "figma").length}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground">Releases</span>
                <div className="text-xl font-bold text-foreground mt-1 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-500" />
                  <span>{allActivities.filter((a) => a.type === "release").length}</span>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {[
                  { id: "all", label: "All Events" },
                  { id: "token", label: "Tokens" },
                  { id: "git", label: "Git Operations" },
                  { id: "figma", label: "Figma" },
                  { id: "release", label: "Releases" },
                  { id: "team", label: "Team" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivityFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activityFilter === tab.id
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search activities..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="pl-8 h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-6">
              {filteredActivities.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Clock className="w-8 h-8 opacity-40" />
                  <span className="text-xs font-semibold">No activity logs match your filter</span>
                  <span className="text-[11px] text-muted-foreground max-w-xs">
                    {activitySearch ? "Try searching for a different keyword." : "Recent actions will be logged here automatically."}
                  </span>
                </div>
              ) : (
                <div className="relative border-l-2 border-border/80 ml-4 pl-6 space-y-6">
                  {filteredActivities.map((act) => (
                    <div key={act.id} className="relative group">
                      {/* Timeline Node */}
                      <div className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-xs">
                        {getActivityIcon(act.type)}
                      </div>

                      {/* Card Content */}
                      <div className="p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-colors shadow-2xs space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-foreground">
                              {act.title}
                            </span>
                            <Badge
                              variant={getActivityBadgeVariant(act.type)}
                              className="text-[9px] font-mono py-0 px-1.5 capitalize"
                            >
                              {act.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                            <span>{formatTimeAgo(act.timestamp)}</span>
                            <span>•</span>
                            <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {act.description}
                        </p>

                        {/* Metadata Tags */}
                        {act.metadata && Object.keys(act.metadata).length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {Object.entries(act.metadata).map(([k, v]) => (
                              <span
                                key={k}
                                className="px-2 py-0.5 rounded bg-muted/80 text-foreground/80 font-mono text-[10px] border border-border/60"
                              >
                                {k}: <span className="font-bold">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actor details */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 rounded-full">
                              {act.actor.avatarUrl && (
                                <AvatarImage src={act.actor.avatarUrl} alt={act.actor.name} />
                              )}
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                                {act.actor.name[0]?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{act.actor.name}</span>
                            <span className="font-mono text-muted-foreground text-[10px]">({act.actor.email})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
