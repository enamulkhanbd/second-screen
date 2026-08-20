"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { updateOrgMember } from "@/services/organizationService";
import { UserRole } from "@/types/tenant";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ManageOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageOrgModal: React.FC<ManageOrgModalProps> = ({ isOpen, onClose }) => {
  const { currentOrg, currentUser, addToast } = useTokenStore();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("editor");
  const [loading, setLoading] = useState(false);

  if (!currentOrg) return null;

  const isOwnerOrAdmin =
    currentOrg.ownerUid === currentUser?.uid ||
    currentOrg.members?.some(
      (m) => m.uid === currentUser?.uid && (m.role === "owner" || m.role === "admin")
    );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setLoading(true);
    try {
      const newMember = {
        uid: `usr_${inviteEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
        email: inviteEmail.trim(),
        displayName: inviteEmail.split("@")[0],
        role: inviteRole,
        joinedAt: new Date().toISOString(),
      };

      await updateOrgMember(currentOrg.id, newMember);

      // Update local store
      if (!currentOrg.members) currentOrg.members = [];
      currentOrg.members = currentOrg.members.filter((m) => m.email !== inviteEmail.trim());
      currentOrg.members.push(newMember);

      addToast({
        type: "success",
        title: "Member Added",
        message: `Added ${inviteEmail} as ${inviteRole} in ${currentOrg.name}.`,
      });

      setInviteEmail("");
    } catch (e: any) {
      addToast({
        type: "error",
        title: "Failed to Add Member",
        message: e.message || "Error adding member",
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
        message: `Updated ${memberEmail} to ${newRole}.`,
      });
    } catch (e: any) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: e.message,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="gap-1 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <DialogTitle>{currentOrg.name} — Members & Roles</DialogTitle>
          </div>
          <DialogDescription>
            Manage organization access, team members, and role permissions
          </DialogDescription>
        </DialogHeader>

        {/* Invite Member Form */}
        {isOwnerOrAdmin && (
          <form
            onSubmit={handleInvite}
            className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-3 mt-1"
          >
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-primary" />
              <span>Invite Team Member</span>
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 text-xs"
              />
              <div className="w-32">
                <Select
                  value={inviteRole}
                  onValueChange={(val) => setInviteRole(val as UserRole)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !inviteEmail.trim()}
              >
                {loading ? "Adding..." : "Invite"}
              </Button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Current Members ({currentOrg.members?.length || 1})
          </div>

          <div className="space-y-1.5">
            {currentOrg.members && currentOrg.members.length > 0 ? (
              currentOrg.members.map((member) => {
                const isOwner = member.role === "owner";
                return (
                  <div
                    key={member.uid || member.email}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-card-foreground text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {member.displayName?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground truncate">
                            {member.displayName || member.email.split("@")[0]}
                          </span>
                          {isOwner && (
                            <Badge variant="violet" className="gap-1 py-0 px-1.5 text-[10px]">
                              <Crown className="w-3 h-3 text-amber-500" />
                              <span>Owner</span>
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                    </div>

                    {!isOwner && isOwnerOrAdmin ? (
                      <div className="w-28 flex-shrink-0">
                        <Select
                          value={member.role}
                          onValueChange={(val) => handleRoleChange(member.email, val as UserRole)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs capitalize">
                        {member.role}
                      </Badge>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No members found.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
