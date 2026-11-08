import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasTrustedMutationOrigin } from "@/utils/auth";
import { findInvitationByToken, inviterMayGrant, resolveInviteState } from "@/lib/invitations";

export const dynamic = "force-dynamic";

/**
 * POST /api/invitations/[token]/accept
 * Adds the signed-in user to the organization if their verified email matches the invitation.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  if (!hasTrustedMutationOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  try {
    const { data: { user } } = await createServerSupabaseClient().auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in to accept this invitation.", code: "unauthenticated" }, { status: 401 });
    }

    const invitation = await findInvitationByToken(params.token);
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found.", code: "not_found" }, { status: 404 });
    }

    const state = resolveInviteState(invitation);
    if (state !== "pending") {
      return NextResponse.json({ error: `This invitation is ${state}.`, code: state }, { status: 410 });
    }

    if (!user.email_confirmed_at || user.email.trim().toLowerCase() !== invitation.email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: `This invitation was sent to a different email address than ${user.email}.`, code: "email_mismatch" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .select("id, slug, owner_uid")
      .eq("id", invitation.org_id)
      .maybeSingle();
    if (organizationError) throw organizationError;
    if (organization?.owner_uid === user.id) {
      return NextResponse.json(
        { error: "You are already the owner of this workspace.", code: "already_member" },
        { status: 409 }
      );
    }

    // Re-validate the inviter's current authority to grant the stored role (H1 / R2.2)
    if (process.env.INVITE_REVALIDATE_INVITER !== "off") {
      const authorized = await inviterMayGrant(
        admin,
        invitation.org_id,
        invitation.inviter_uid,
        invitation.role
      );
      if (!authorized) {
        await admin
          .from("invitations")
          .update({ status: "revoked" })
          .eq("id", invitation.id)
          .eq("status", "pending");
        return NextResponse.json(
          { error: "The user who sent this invitation is not authorized to grant this role.", code: "inviter_not_authorized" },
          { status: 403 }
        );
      }
    }

    // Targeted duplicate checks instead of downloading every org member (A4 / R2.2)
    const normalizedEmail = user.email.trim().toLowerCase();
    const [{ data: sameEmailMembership, error: emailError }, { data: existingUserMembership, error: userError }] =
      await Promise.all([
        admin
          .from("organization_members")
          .select("user_id, email")
          .eq("org_id", invitation.org_id)
          .ilike("email", normalizedEmail)
          .limit(1)
          .maybeSingle(),
        admin
          .from("organization_members")
          .select("user_id")
          .eq("org_id", invitation.org_id)
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle(),
      ]);
    if (emailError) throw emailError;
    if (userError) throw userError;

    if (sameEmailMembership && sameEmailMembership.user_id !== user.id) {
      return NextResponse.json(
        { error: "This email is already a member of the workspace under another account.", code: "email_already_member" },
        { status: 409 }
      );
    }

    // Claim the pending invitation first; if 0 rows affected, do not create membership (A4 / R2.2)
    const { data: acceptedRows, error: acceptErr } = await admin
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id)
      .eq("status", "pending")
      .select("id");
    if (acceptErr) throw acceptErr;
    if (!acceptedRows || acceptedRows.length === 0) {
      return NextResponse.json(
        { error: "This invitation has already been accepted.", code: "already_accepted" },
        { status: 409 }
      );
    }

    if (!existingUserMembership) {
      const { error: memberErr } = await admin.from("organization_members").insert({
        org_id: invitation.org_id,
        user_id: user.id,
        email: normalizedEmail,
        display_name:
          user.user_metadata?.full_name || user.user_metadata?.name || user.email.split("@")[0],
        role: invitation.role,
        joined_at: new Date().toISOString(),
      });
      if (memberErr?.code === "23505") {
        return NextResponse.json(
          { error: "This email is already a member of the workspace.", code: "email_already_member" },
          { status: 409 }
        );
      }
      if (memberErr) {
        await admin
          .from("invitations")
          .update({ status: "pending" })
          .eq("id", invitation.id)
          .eq("status", "accepted");
        throw memberErr;
      }
    }

    return NextResponse.json({
      success: true,
      orgId: invitation.org_id,
      orgSlug: organization?.slug || null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to accept invitation." }, { status: 500 });
  }
}
