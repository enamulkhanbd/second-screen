import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findInvitationByToken, resolveInviteState } from "@/lib/invitations";

export const dynamic = "force-dynamic";

/**
 * GET /api/invitations/[token]
 * Public, read-only invitation summary for the signed-out invite landing page.
 */
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const row = await findInvitationByToken(params.token);
    if (!row) {
      return NextResponse.json({ state: "not_found" }, { status: 404 });
    }

    const { data: org } = await createAdminClient()
      .from("organizations")
      .select("icon, color, logo_url")
      .eq("id", row.org_id)
      .maybeSingle();

    return NextResponse.json(
      {
        state: resolveInviteState(row),
        orgName: row.org_name,
        orgIcon: org?.icon || null,
        orgColor: org?.color || null,
        orgLogoUrl: org?.logo_url || null,
        role: row.role,
        invitedByName: row.inviter_name || row.inviter_email.split("@")[0],
        inviteeEmail: row.email,
        expiresAt: row.expires_at,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Could not load invitation." }, { status: 500 });
  }
}
