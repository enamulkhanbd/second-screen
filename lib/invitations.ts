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
