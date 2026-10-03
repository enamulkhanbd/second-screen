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
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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
        setIsInviteModalOpen(false);
        setPreviewInvitation(inv);
        setMembersSubTab("invites");
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
    const inviteUrl = `${origin}/invite/${token}`;
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

  const isCustomOrgColor = useMemo(() => {
    if (!currentOrg?.color) return false;
    const trimmed = currentOrg.color.trim().toLowerCase();
    return !["#171717", "#0a0a0a", "#2e9401", "#2d9401", "#6366f1", "neutral"].includes(trimmed);
  }, [currentOrg?.color]);

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
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background text-foreground font-sans select-none">
      {/* Top Page Header - Spans full width from far left to far right */}
      <div className="w-full px-6 md:px-8 py-5 border-b border-border/60 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs shrink-0 overflow-hidden border border-border/80 ${
                isCustomOrgColor ? "text-white" : "bg-primary/10 text-primary"
              }`}
              style={isCustomOrgColor ? { backgroundColor: currentOrg?.color } : undefined}
            >
              {currentOrg?.logoUrl ? (
                <img
                  src={currentOrg.logoUrl}
                  alt={currentOrg.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <span>{currentOrg?.icon || currentOrg?.name?.[0]?.toUpperCase() || "🏢"}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Members &amp; Access
                </h1>
                <Badge variant="outline" className="text-[10px] font-mono capitalize px-2 py-0.5 text-muted-foreground border-border/80">
                  {currentOrg.name}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Manage team members, roles, and pending invitations for this workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-2.5 py-1 gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
            </Badge>
            {activePendingInvitations.length > 0 && (
              <Badge variant="outline" className="text-xs px-2.5 py-1 gap-1.5 font-medium text-amber-500 border-amber-500/30 bg-amber-500/10">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{activePendingInvitations.length} pending</span>
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area - Sized to 960px */}
      <div className="max-w-[960px] w-full mx-auto p-6 md:p-8 space-y-6 flex-1">
        {/* Modal Dialog for Invite New Team Member */}
        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
            <form onSubmit={handleSendInvite} className="flex flex-col">
              <DialogHeader className="px-6 py-5 border-b border-border/80 bg-card/40 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 flex-shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <DialogTitle className="text-base font-bold text-foreground">
                      Invite New Team Member
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Send an email invite to join <span className="font-semibold text-foreground">{currentOrg.name}</span> or generate a secure direct join link.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6 space-y-4">
                {/* Colleague Email */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Colleague Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="designer@company.com"
                    required
                    autoFocus
                    className="h-9 text-xs"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Role</Label>
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

                {/* Role Permissions Hint */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/70 text-xs text-muted-foreground flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">{selectedRoleDef.title} Role: </span>
                    <span>{selectedRoleDef.description}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t border-border/80 bg-card/40 flex items-center justify-end gap-2 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || !inviteEmail.trim()}
                  className="gap-1.5 font-semibold shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? "Sending..." : "Send Invite"}</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Toolbar: Active / Invitations Tabs on Left, Send Invite Button on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/40 p-2.5 rounded-xl border border-border">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMembersSubTab("members")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                membersSubTab !== "invites"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Active</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  membersSubTab !== "invites"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {members.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMembersSubTab("invites")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                membersSubTab === "invites"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Invitations</span>
              {activePendingInvitations.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    membersSubTab === "invites"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {activePendingInvitations.length}
                </span>
              )}
            </button>
          </div>

          {canInvite && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsInviteModalOpen(true)}
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Send Invite</span>
              </Button>
            </div>
          )}
        </div>

        {/* Members & Invitations Table List View Container */}
        <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border shadow-2xs">

              {membersSubTab !== "invites" ? (
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
              ) : activePendingInvitations.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                    <Mail className="w-6 h-6 opacity-40 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">No pending invitations</span>
                    <span className="text-[11px] text-muted-foreground max-w-xs mt-1 block">
                      Invited teammates will appear here until they accept their invitation.
                    </span>
                  </div>
                  {canInvite && (
                    <Button
                      size="sm"
                      onClick={() => setIsInviteModalOpen(true)}
                      className="mt-2 h-8 gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Send Invite</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {activePendingInvitations.map((inv) => {
                    const expiry = getExpiryStatus(inv.expiresAt);
                    const isExpired = expiry.isExpired;
                    const roleDef = ROLE_DEFINITIONS[inv.role] || ROLE_DEFINITIONS.editor;

                    return (
                      <div
                        key={inv.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors ${
                          isExpired ? "bg-destructive/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/20 flex-shrink-0">
                            {inv.inviteeEmail.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                {inv.inviteeEmail}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-normal capitalize">
                                {roleDef.title}
                              </Badge>
                              {isExpired && (
                                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 gap-1 font-semibold">
                                  <AlertTriangle className="size-2.5" />
                                  <span>Expired</span>
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                              <span>Invited by {inv.invitedByName || inv.invitedByEmail}</span>
                              <span>•</span>
                              <span>Sent {formatDateTime(inv.createdAt)}</span>
                              <span>•</span>
                              <span className={isExpired ? "text-destructive font-medium" : ""}>
                                {expiry.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isExpired ? (
                            <Button
                              size="sm"
                              onClick={() => handleResendInvite(inv.id)}
                              disabled={resendingId === inv.id}
                              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${resendingId === inv.id ? "animate-spin" : ""}`} />
                              <span>{resendingId === inv.id ? "Resending..." : "Resend"}</span>
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyLink(inv.token)}
                                className="h-8 text-xs gap-1.5 cursor-pointer"
                                title="Copy direct join link"
                              >
                                {copiedToken === inv.token ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-emerald-500 font-medium">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendInvite(inv.id)}
                                disabled={resendingId === inv.id}
                                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Renew invitation with fresh 7-day link"
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
                              className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                              title="Revoke invitation"
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
