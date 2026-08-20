"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { updateOrgMember } from "@/services/organizationService";
import { UserRole } from "@/types/tenant";
import {
  Users,
  X,
  UserPlus,
  Shield,
  Check,
  Mail,
  Crown,
  CheckCircle2,
  Trash2,
} from "lucide-react";

interface ManageOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageOrgModal: React.FC<ManageOrgModalProps> = ({ isOpen, onClose }) => {
  const { currentOrg, currentUser, addToast } = useTokenStore();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("editor");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !currentOrg) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-900 dark:text-zinc-100 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pb-1 border-b border-zinc-200 dark:border-zinc-800/80">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/60 flex items-center justify-center text-violet-600 dark:text-violet-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {currentOrg.name} — Members & Roles
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage organization access, team members, and role permissions
            </p>
          </div>
        </div>

        {/* Invite Member Form */}
        {isOwnerOrAdmin && (
          <form onSubmit={handleInvite} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>Invite Team Member</span>
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-violet-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 font-medium outline-none cursor-pointer"
              >
                <option value="editor">Editor (Can edit tokens)</option>
                <option value="viewer">Viewer (Read-only)</option>
                <option value="admin">Admin (Full project control)</option>
              </select>
              <button
                type="submit"
                disabled={loading || !inviteEmail.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Adding..." : "Invite"}
              </button>
            </div>
          </form>
        )}

        {/* Member List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
            Active Members ({currentOrg.members?.length || 1})
          </h3>

          {currentOrg.members?.map((m) => {
            const isSelf = m.uid === currentUser?.uid;
            return (
              <div
                key={m.email}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-violet-600/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 font-bold text-xs flex items-center justify-center">
                    {m.displayName?.[0]?.toUpperCase() || m.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>{m.displayName || m.email}</span>
                      {isSelf && (
                        <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.2 rounded font-normal">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {m.role === "owner" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[11px] font-bold">
                      <Crown className="w-3 h-3 text-amber-500" />
                      <span>Owner</span>
                    </span>
                  ) : isOwnerOrAdmin && !isSelf ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.email, e.target.value as UserRole)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium capitalize">
                      {m.role}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
