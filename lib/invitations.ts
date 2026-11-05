import { createAdminClient } from "@/lib/supabase/admin";

export type InviteState = "pending" | "accepted" | "revoked" | "expired";

export interface InvitationRow {
  id: string;
  org_id: string;
  org_name: string;
  email: string;
  role: string;
  inviter_uid: string;
  inviter_email: string;
  inviter_name: string | null;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export async function findInvitationByToken(token: string): Promise<InvitationRow | null> {
  if (!token || token.length > 128) return null;
  const { data } = await createAdminClient()
    .from("invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return (data as InvitationRow | null) ?? null;
}

export function resolveInviteState(row: InvitationRow): InviteState {
  if (row.status === "accepted") return "accepted";
  if (row.status === "revoked") return "revoked";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return "pending";
}

export function roleMayGrant(inviterRole: string, invitedRole: string): boolean {
  if (inviterRole === "owner") return true;
  if (inviterRole === "admin") return invitedRole !== "owner" && ["admin", "editor", "viewer"].includes(invitedRole);
  if (inviterRole === "editor") return invitedRole === "editor" || invitedRole === "viewer";
  return false;
}

export async function inviterMayGrant(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  inviterUid: string,
  role: string
): Promise<boolean> {
  if (!orgId || !inviterUid || !role) return false;
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .select("owner_uid")
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr) throw orgErr;
  if (org?.owner_uid === inviterUid) return roleMayGrant("owner", role);

  const { data: m, error: memberErr } = await admin
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", inviterUid)
    .maybeSingle();
  if (memberErr) throw memberErr;
  if (!m?.role) return false;
  return roleMayGrant(m.role, role);
}
