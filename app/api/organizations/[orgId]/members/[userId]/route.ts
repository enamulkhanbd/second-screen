import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasTrustedMutationOrigin } from "@/utils/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { orgId: string; userId: string } }
) {
  if (!hasTrustedMutationOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  try {
    const { data: { user } } = await createServerSupabaseClient().auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const [{ data: organization }, { data: actorMembership }] = await Promise.all([
      admin.from("organizations").select("owner_uid").eq("id", params.orgId).maybeSingle(),
      admin
        .from("organization_members")
        .select("role")
        .eq("org_id", params.orgId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const isOwner = organization?.owner_uid === user.id;
    const canManageMembers = isOwner || actorMembership?.role === "admin" || actorMembership?.role === "owner";
    if (!canManageMembers) return NextResponse.json({ error: "You cannot remove members from this workspace." }, { status: 403 });

    const { data: target, error: targetError } = await admin
      .from("organization_members")
      .select("role")
      .eq("org_id", params.orgId)
      .eq("user_id", params.userId)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!target) return NextResponse.json({ error: "This member is no longer in the workspace." }, { status: 404 });
    if (target.role === "owner" || params.userId === organization?.owner_uid) {
      return NextResponse.json({ error: "The workspace owner cannot be removed." }, { status: 403 });
    }

    const { data: deleted, error: deleteError } = await admin
      .from("organization_members")
      .delete()
      .eq("org_id", params.orgId)
      .eq("user_id", params.userId)
      .select("user_id");

    if (deleteError) throw deleteError;
    if (!deleted?.length) return NextResponse.json({ error: "Member was not removed." }, { status: 409 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove organization member:", error);
    return NextResponse.json({ error: "Failed to remove member. Please try again." }, { status: 500 });
  }
}