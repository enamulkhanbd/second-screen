import { NextRequest } from "next/server";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { generateApiKey } from "@/utils/patAuth";
import { saveApiKey } from "@/utils/cloudStorage";
import { getOrganization, getOrgProjectSummaries } from "@/services/organizationService";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

interface PairingSession {
  code: string;
  status: "pending" | "approved" | "expired";
  createdAt: number;
  expiresAt: number;
  serverUrl?: string;
  pat?: string;
  orgId?: string;
  projectId?: string;
  orgName?: string;
  projectName?: string;
}

// In-memory runtime cache
const pairingSessions = new Map<string, PairingSession>();

function getDbClient() {
  return createAdminClient();
}

function getRequestOrigin(req: NextRequest): string {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const originHeader = req.headers.get("origin");
  if (originHeader && originHeader !== "null") {
    return originHeader;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  return req.nextUrl.origin || "http://localhost:3000";
}

import { generatePairingCode } from "./generatePairingCode";

export async function OPTIONS() {
  return handleOptionsCors();
}

/**
 * POST: Generate a new pairing session from the Figma Plugin
 */
export async function POST(req: NextRequest) {
  const code = generatePairingCode();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes
  const origin = getRequestOrigin(req);
  const connectUrl = `https://tokensplatform.enamulkhan.com/connect?code=${code}`;

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
  if ((!session || session.status !== "approved") && isSupabaseConfigured) {
    try {
      const client = getDbClient();
      const { data, error } = await client
        .from("pairing_sessions")
        .select("*")
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

  if (session.expiresAt < Date.now()) {
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
    const responseData = {
      status: "approved",
      pat: session.pat,
      orgId: session.orgId,
      projectId: session.projectId,
      orgName: session.orgName,
      projectName: session.projectName,
      serverUrl: session.serverUrl,
    };

    return jsonWithCors(responseData);
  }

  return jsonWithCors({
    status: "pending",
    expiresInSeconds: Math.max(0, Math.round((session.expiresAt - Date.now()) / 1000)),
  });
}

/**
 * PUT: Approve pairing session from the authenticated Tokens Platform web app
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, orgId, projectId, orgName, projectName, uid, userEmail } = body;

    const cleanCode = (code || "").trim().toUpperCase();
    if (!cleanCode) {
      return jsonWithCors({ error: "Pairing code is required." }, { status: 400 });
    }

    let session = pairingSessions.get(cleanCode);

    if (!session && isSupabaseConfigured) {
      try {
        const client = getDbClient();
        const { data, error } = await client
          .from("pairing_sessions")
          .select("*")
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
      session = {
        code: cleanCode,
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
    }

    const origin = getRequestOrigin(req);

    let resolvedOrgName = (orgName || "").trim();
    let resolvedProjName = (projectName || "").trim();

    if (orgId && !resolvedOrgName) {
      try {
        const org = await getOrganization(orgId);
        if (org?.name) resolvedOrgName = org.name;
      } catch {}
    }

    if (orgId && projectId && !resolvedProjName) {
      try {
        const projs = await getOrgProjectSummaries(orgId);
        const proj = projs.find((p) => p.id === projectId);
        if (proj?.name) resolvedProjName = proj.name;
      } catch {}
    }

    // Generate valid PAT record and persist it into cloud API keys store
    const { plaintextKey, record } = generateApiKey(
      `Figma Plugin (${resolvedOrgName || resolvedProjName || "Design Tokens"})`,
      ["read:tokens", "write:tokens", "manage:releases"],
      undefined,
      {
        uid: uid || "usr_default",
        userEmail: userEmail || undefined,
        orgId: orgId || "",
        projectId: projectId || "",
        orgName: resolvedOrgName || "",
        projectName: resolvedProjName || "",
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
