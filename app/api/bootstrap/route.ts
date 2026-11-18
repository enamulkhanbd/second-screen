import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/utils/auth";
import { getOrgProjectSummaries, getUserOrganizations } from "@/services/organizationService";
import { cacheGetJson, cacheSetJson } from "@/lib/cache/redis";
import type { Organization, Project } from "@/types/tenant";

export const dynamic = "force-dynamic";

interface BootstrapPayload {
  orgs: Organization[];
  activeOrgId: string | null;
  projects: Project[];
}

/**
 * GET /api/bootstrap?orgId=...&orgSlug=...
 * Same-origin initial tenant bootstrap so the browser avoids cross-origin
 * Supabase REST CORS preflights and waterfall roundtrips on initial page load.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, "read:tokens");
    if (!auth.isValid || !auth.record?.uid) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const uid = auth.record.uid;
    const email = auth.record.userEmail;
    const { searchParams } = new URL(req.url);
    const requestedOrgSlug = (searchParams.get("orgSlug") || "").trim();
    const requestedOrgId = (searchParams.get("orgId") || "").trim();

    const cacheKey = `bootstrap:${uid}:${requestedOrgSlug || requestedOrgId || "default"}`;
    const cached = await cacheGetJson<BootstrapPayload>(cacheKey);
    if (cached) {
      return NextResponse.json(
        { success: true, ...cached, cached: true },
        { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } }
      );
    }

    const orgs = await getUserOrganizations(uid, email);
    let activeOrg = orgs[0] || null;
    if (requestedOrgSlug) {
      const found = orgs.find(
        (o) => o.slug === requestedOrgSlug || o.id === requestedOrgSlug
      );
      if (found) activeOrg = found;
    } else if (requestedOrgId) {
      const found = orgs.find((o) => o.id === requestedOrgId);
      if (found) activeOrg = found;
    }

    const projects = activeOrg ? await getOrgProjectSummaries(activeOrg.id) : [];
    const payload: BootstrapPayload = {
      orgs,
      activeOrgId: activeOrg?.id || null,
      projects,
    };

    await cacheSetJson(cacheKey, payload, 15);

    return NextResponse.json(
      { success: true, ...payload },
      { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } }
    );
  } catch (err: any) {
    console.error("Bootstrap GET error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load workspace bootstrap." },
      { status: 500 }
    );
  }
}
