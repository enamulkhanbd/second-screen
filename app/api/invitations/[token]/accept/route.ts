import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasTrustedMutationOrigin } from "@/utils/auth";
import { findInvitationByToken, resolveInviteState } from "@/lib/invitations";

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

    // Never downgrade an existing membership (e.g. the org owner) through an invitation.
    const { data: existing, error: existingError } = await admin
      .from("organization_members")
      .select("user_id, email")
      .eq("org_id", invitation.org_id);
    if (existingError) throw existingError;

    const normalizedEmail = user.email.trim().toLowerCase();
    const sameEmailMembership = existing?.find(
      (member) => member.email?.trim().toLowerCase() === normalizedEmail
    );
    if (sameEmailMembership && sameEmailMembership.user_id !== user.id) {
      return NextResponse.json(
        { error: "This email is already a member of the workspace under another account.", code: "email_already_member" },
        { status: 409 }
      );
    }

    const existingUserMembership = existing?.find((member) => member.user_id === user.id);

    if (!existingUserMembership) {
      const { error: memberErr } = await admin.from("organization_members").insert({
        org_id: invitation.org_id,
        user_id: user.id,
        email: user.email.trim().toLowerCase(),
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
      if (memberErr) throw memberErr;
    }

    await admin
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id)
      .eq("status", "pending");

    const { data: org } = await admin
      .from("organizations")
      .select("id, slug")
      .eq("id", invitation.org_id)
      .maybeSingle();

    return NextResponse.json({ success: true, orgId: invitation.org_id, orgSlug: org?.slug || null });
  } catch {
    return NextResponse.json({ error: "Failed to accept invitation." }, { status: 500 });
  }
}
