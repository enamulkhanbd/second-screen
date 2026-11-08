import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasTrustedMutationOrigin } from "@/utils/auth";
import { InvitationRow, inviterMayGrant, resolveInviteState, roleMayGrant } from "@/lib/invitations";
import { sendInviteEmail } from "@/lib/inviteEmail";
import type { UserRole } from "@/types/tenant";

export const dynamic = "force-dynamic";

/**
 * POST /api/invitations/send  { invitationId }
 * Emails the invitation link. Caller must be an owner, admin, or the original inviter
 * with authority to grant the invitation's role.
 */
export async function POST(req: NextRequest) {
  if (!hasTrustedMutationOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  try {
    const { data: { user } } = await createServerSupabaseClient().auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const invitationId = typeof body?.invitationId === "string" ? body.invitationId : "";
    if (!invitationId) {
      return NextResponse.json({ error: "invitationId is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data } = await admin.from("invitations").select("*").eq("id", invitationId).maybeSingle();
    const invitation = data as InvitationRow | null;
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    const [{ data: org }, { data: member }] = await Promise.all([
      admin.from("organizations").select("owner_uid").eq("id", invitation.org_id).maybeSingle(),
      admin
        .from("organization_members")
        .select("role")
        .eq("org_id", invitation.org_id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const callerRole = org?.owner_uid === user.id ? "owner" : (member?.role ?? "");
    const canManageInvitation =
      callerRole === "owner" ||
      callerRole === "admin" ||
      (callerRole === "editor" && invitation.inviter_uid === user.id);

    if (!canManageInvitation || !roleMayGrant(callerRole, invitation.role)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Also verify the original inviter still holds authority to grant this role
    const inviterAuthorized = await inviterMayGrant(
      admin,
      invitation.org_id,
      invitation.inviter_uid,
      invitation.role
    );
    if (!inviterAuthorized) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (resolveInviteState(invitation) !== "pending") {
      return NextResponse.json({ error: "Invitation is no longer pending." }, { status: 409 });
    }

    const sent = await sendInviteEmail({
      to: invitation.email,
      orgName: invitation.org_name,
      inviterName: invitation.inviter_name || invitation.inviter_email.split("@")[0],
      inviterEmail: invitation.inviter_email,
      role: invitation.role as UserRole,
      inviteUrl: `${req.nextUrl.origin}/invite/${invitation.token}`,
      expiresAt: invitation.expires_at,
    });

    return NextResponse.json({ sent });
  } catch {
    return NextResponse.json({ sent: false }, { status: 500 });
  }
}
