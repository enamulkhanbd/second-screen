import { NextRequest } from "next/server";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { generateApiKey } from "@/utils/patAuth";
import { saveApiKey } from "@/utils/cloudStorage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { hasTrustedMutationOrigin } from "@/utils/auth";
import { generatePairingCode } from "./generatePairingCode";
import {
  PairingSession,
  PAIRING_SELECT_COLUMNS,
  pairingSessions,
  getDbClient,
  getRequestOrigin,
  getClientIp,
  checkPairingRateLimit,
  prunePairingSessions,
} from "./pairingStore";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptionsCors();
}

/**
 * POST: Generate a new pairing session from the Figma Plugin
 */
export async function POST(req: NextRequest) {
  const now = Date.now();
  const ip = getClientIp(req);
  const rateCheck = checkPairingRateLimit(ip, now);
  if (!rateCheck.allowed) {
    const res = jsonWithCors(
      {
        success: false,
        code: "rate_limited",
        error: "Too many pairing requests. Please wait before generating a new code.",
      },
      { status: 429 }
    );
    res.headers.set("Retry-After", String(rateCheck.retryAfterSeconds));
    return res;
  }

  prunePairingSessions(now);

  const code = generatePairingCode();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes
  const origin = getRequestOrigin(req);
  const connectUrl = `${origin}/connect?code=${code}`;

  const session: PairingSession = {
    code,
    status: "pending",
    createdAt: now,
    expiresAt,
    serverUrl: origin,
  };

  pairingSessions.set(code, session);

  if (isSupabaseConfigured) {
    try {
      const client = getDbClient();
      await client.from("pairing_sessions").upsert({
        code,
        status: "pending",
        created_at: now,
        expires_at: expiresAt,
        server_url: origin,
      });
    } catch (e) {
      console.warn("Supabase save pairing session error:", e);
    }
  }

  return jsonWithCors({
    success: true,
    code,
    connectUrl,
    expiresAt,
    expiresInSeconds: 600,
  });
}

function recommendedPollIntervalSeconds(createdAt: number, now: number): number {
  const elapsedMs = Math.max(0, now - createdAt);
  if (elapsedMs < 30_000) return 2;
  if (elapsedMs < 120_000) return 5;
  return 10;
}

/**
 * GET: Poll pairing status from the Figma Plugin
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim().toUpperCase();

  if (!code) {
    return jsonWithCors({ error: "Missing pairing code parameter" }, { status: 400 });
  }

  let session = pairingSessions.get(code);

  // Fallback to Supabase to share state across localhost, production, and serverless edge
  if ((!session || session.status !== "approved" || !session.pat) && isSupabaseConfigured) {
    try {
      const client = getDbClient();
      const { data, error } = await client
        .from("pairing_sessions")
        .select(PAIRING_SELECT_COLUMNS)
        .eq("code", code)
        .maybeSingle();

      if (!error && data) {
        session = {
          code: data.code,
          status: data.status as any,
          createdAt: Number(data.created_at),
          expiresAt: Number(data.expires_at),
          serverUrl: data.server_url || undefined,
          pat: data.pat || undefined,
          orgId: data.org_id || undefined,
          projectId: data.project_id || undefined,
          orgName: data.org_name || undefined,
          projectName: data.project_name || undefined,
        };
        pairingSessions.set(code, session);
      }
    } catch (e) {
      console.warn("Supabase fetch pairing session error:", e);
    }
  }

  if (!session) {
    return jsonWithCors({
      status: "expired",
      error: "Pairing code not found or expired. Please generate a new code.",
    });
  }

  const now = Date.now();
  if (session.expiresAt < now) {
    pairingSessions.delete(code);
    if (isSupabaseConfigured) {
      try {
        const client = getDbClient();
        await client.from("pairing_sessions").delete().eq("code", code);
      } catch {}
    }
    return jsonWithCors({
      status: "expired",
      error: "Pairing code has expired. Please generate a new code.",
    });
  }

  if (session.status === "approved") {
    const deliveredPat = session.pat;
    const responseData = {
      status: "approved",
      pat: deliveredPat,
      orgId: session.orgId,
      projectId: session.projectId,
      orgName: session.orgName,
      projectName: session.projectName,
      serverUrl: session.serverUrl,
    };

    // Immediately scrub the plaintext PAT after the first poll that reads it (A6 / R7)
    if (deliveredPat) {
      session.pat = undefined;
      pairingSessions.set(code, session);
      if (isSupabaseConfigured) {
        try {
          await getDbClient()
            .from("pairing_sessions")
            .update({ pat: null })
            .eq("code", code);
        } catch (e) {
          console.warn("Supabase pairing secret cleanup on GET error:", e);
        }
      }
    }

    return jsonWithCors(responseData);
  }

  return jsonWithCors({
    status: "pending",
    expiresInSeconds: Math.max(0, Math.round((session.expiresAt - now) / 1000)),
    pollIntervalSeconds: recommendedPollIntervalSeconds(session.createdAt, now),
  });
}

/**
 * PATCH: Acknowledge that the plugin saved the approved session.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/.test(code)) {
    return jsonWithCors({ error: "A valid pairing code is required." }, { status: 400 });
  }

  let session = pairingSessions.get(code);
  if (!session && isSupabaseConfigured) {
    try {
      const { data, error } = await getDbClient()
        .from("pairing_sessions")
        .select("status")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      if (data?.status === "approved") session = { code, status: "approved", createdAt: 0, expiresAt: 0 };
    } catch (e) {
      console.warn("Supabase pairing acknowledgement lookup error:", e);
      return jsonWithCors({ error: "Could not confirm plugin connection." }, { status: 503 });
    }
  }

  if (session?.status !== "approved") {
    return jsonWithCors({ error: "Approved pairing session not found." }, { status: 404 });
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await getDbClient().from("pairing_sessions").update({ pat: null }).eq("code", code);
      if (error) throw error;
    } catch (e) {
      console.warn("Supabase pairing secret cleanup error:", e);
      return jsonWithCors({ error: "Could not confirm plugin connection." }, { status: 503 });
    }
  }

  session.pat = undefined;
  pairingSessions.set(code, session);

  return jsonWithCors({ success: true });
}

/**
 * PUT: Approve pairing session from the authenticated Tokens Platform web app
 */
export async function PUT(req: NextRequest) {
  try {
    if (!hasTrustedMutationOrigin(req)) {
      return jsonWithCors({ error: "Cross-origin session request rejected." }, { status: 403 });
    }

    const authClient = createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user || !user.email_confirmed_at) {
      return jsonWithCors({ error: "Sign in before approving a pairing request." }, { status: 401 });
    }

    const body = await req.json();
    const { code, orgId, projectId } = body;

    const cleanCode = (code || "").trim().toUpperCase();
    if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/.test(cleanCode)) {
      return jsonWithCors({ error: "Enter a valid pairing code in XXXX-XXXX format." }, { status: 400 });
    }
    if (!orgId || !projectId) {
      return jsonWithCors({ error: "Select an organization and project before approving." }, { status: 400 });
    }

    let session = pairingSessions.get(cleanCode);

    if (!session && isSupabaseConfigured) {
      try {
        const client = getDbClient();
        const { data, error } = await client
          .from("pairing_sessions")
          .select(PAIRING_SELECT_COLUMNS)
          .eq("code", cleanCode)
          .maybeSingle();

        if (!error && data) {
          session = {
            code: data.code,
            status: data.status as any,
            createdAt: Number(data.created_at),
            expiresAt: Number(data.expires_at),
            serverUrl: data.server_url || undefined,
            pat: data.pat || undefined,
            orgId: data.org_id || undefined,
            projectId: data.project_id || undefined,
            orgName: data.org_name || undefined,
            projectName: data.project_name || undefined,
          };
        }
      } catch {}
    }

    if (!session) {
      return jsonWithCors({ error: "Pairing code not found. Generate a new code in the plugin." }, { status: 404 });
    }
    if (session.expiresAt < Date.now()) {
      return jsonWithCors({ error: "Pairing code has expired. Generate a new code in the plugin." }, { status: 410 });
    }
    if (session.status !== "pending") {
      return jsonWithCors({ error: "This pairing code has already been approved." }, { status: 409 });
    }

    const admin = getDbClient();
    const [{ data: organization }, { data: project }] = await Promise.all([
      admin.from("organizations").select("id, name, owner_uid").eq("id", orgId).maybeSingle(),
      admin.from("projects").select("id, name").eq("id", projectId).eq("org_id", orgId).maybeSingle(),
    ]);
    if (!organization || !project) {
      return jsonWithCors({ error: "The selected organization or project was not found." }, { status: 404 });
    }

    let role = organization.owner_uid === user.id ? "owner" : "";
    if (!role) {
      const { data: membership } = await admin
        .from("organization_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle();
      role = membership?.role || "";
    }
    if (!role) {
      return jsonWithCors({ error: "You are not a member of the selected organization." }, { status: 403 });
    }

    const origin = getRequestOrigin(req);
    const resolvedOrgName = organization.name;
    const resolvedProjName = project.name;
    const scopes: ("read:tokens" | "write:tokens" | "manage:releases")[] = ["read:tokens"];
    if (["owner", "admin", "editor"].includes(role)) scopes.push("write:tokens");
    if (["owner", "admin", "editor"].includes(role)) scopes.push("manage:releases");

    const { plaintextKey, record } = generateApiKey(
      `Figma Plugin (${resolvedOrgName || resolvedProjName || "Design Tokens"})`,
      scopes,
      90,
      {
        uid: user.id,
        userEmail: user.email || undefined,
        orgId,
        projectId,
        orgName: resolvedOrgName,
        projectName: resolvedProjName,
      }
    );
    await saveApiKey(record);

    session.status = "approved";
    session.pat = plaintextKey;
    session.orgId = orgId || "";
    session.projectId = projectId || "";
    session.orgName = resolvedOrgName || "";
    session.projectName = resolvedProjName || "";
    session.serverUrl = origin;

    pairingSessions.set(cleanCode, session);

    if (isSupabaseConfigured) {
      try {
        const client = getDbClient();
        await client.from("pairing_sessions").upsert({
          code: cleanCode,
          status: "approved",
          pat: plaintextKey,
          user_id: user.id,
          user_email: user.email || null,
          org_id: orgId || null,
          project_id: projectId || null,
          org_name: resolvedOrgName || null,
          project_name: resolvedProjName || null,
          server_url: origin,
          created_at: session.createdAt,
          expires_at: session.expiresAt,
        });
      } catch (e) {
        console.warn("Supabase update pairing session error:", e);
      }
    }

    return jsonWithCors({
      success: true,
      message: "Figma companion plugin authorized successfully.",
      orgName: session.orgName,
      projectName: session.projectName,
    });
  } catch (err: any) {
    return jsonWithCors({ error: err.message || "Failed to approve pairing" }, { status: 500 });
  }
}
