import { NextRequest, NextResponse } from "next/server";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { generateApiKey } from "@/utils/patAuth";
import { saveApiKey } from "@/utils/cloudStorage";

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

// In-memory pairing sessions map (10-minute lifecycle)
const pairingSessions = new Map<string, PairingSession>();

// Cleanup expired sessions periodically
function cleanupExpiredSessions() {
  const now = Date.now();
  pairingSessions.forEach((session, code) => {
    if (session.expiresAt < now) {
      pairingSessions.delete(code);
    }
  });
}

/**
 * Helper to dynamically detect the public deployment domain / origin on Vercel or custom domain
 */
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

/**
 * Generate a random 6-character alphanumeric pairing code (e.g. TK-8492)
 */
function generatePairingCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // excludes 0, 1, O, I for clarity
  let code = "TK-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * OPTIONS /api/v1/auth/pair
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return handleOptionsCors();
}

/**
 * POST: Generate a new pairing session from the Figma Plugin
 */
export async function POST(req: NextRequest) {
  cleanupExpiredSessions();

  let code = generatePairingCode();
  // Ensure uniqueness
  while (pairingSessions.has(code)) {
    code = generatePairingCode();
  }

  const now = Date.now();
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
  cleanupExpiredSessions();

  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim().toUpperCase();

  if (!code) {
    return jsonWithCors({ error: "Missing pairing code parameter" }, { status: 400 });
  }

  const session = pairingSessions.get(code);

  if (!session) {
    return jsonWithCors({
      status: "expired",
      error: "Pairing code not found or expired. Please generate a new code.",
    });
  }

  if (session.expiresAt < Date.now()) {
    pairingSessions.delete(code);
    return jsonWithCors({
      status: "expired",
      error: "Pairing code has expired. Please generate a new code.",
    });
  }

  if (session.status === "approved") {
    // Return credentials and delete session after single-use handshake
    const responseData = {
      status: "approved",
      pat: session.pat,
      orgId: session.orgId,
      projectId: session.projectId,
      orgName: session.orgName,
      projectName: session.projectName,
      serverUrl: session.serverUrl,
    };

    // Clean up consumed session after slight delay
    setTimeout(() => {
      pairingSessions.delete(code);
    }, 15000);

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
  cleanupExpiredSessions();

  try {
    const body = await req.json();
    const { code, pat, orgId, projectId, orgName, projectName, uid, userEmail } = body;

    const cleanCode = (code || "").trim().toUpperCase();
    if (!cleanCode) {
      return jsonWithCors({ error: "Pairing code is required." }, { status: 400 });
    }

    const session = pairingSessions.get(cleanCode);

    if (!session) {
      return jsonWithCors(
        { error: "Pairing code not found or expired. Please check the code in Figma." },
        { status: 404 }
      );
    }

    if (session.expiresAt < Date.now()) {
      pairingSessions.delete(cleanCode);
      return jsonWithCors({ error: "Pairing code has expired." }, { status: 400 });
    }

    const origin = getRequestOrigin(req);
    
    // Generate valid PAT record and persist it into cloud API keys store
    const { plaintextKey, record } = generateApiKey(
      `Figma Plugin (${orgName || "Design System"})`,
      ["read:tokens", "write:tokens", "manage:releases"],
      undefined,
      {
        uid: uid || "usr_default",
        userEmail: userEmail || undefined,
        orgId: orgId || "org-default",
        projectId: projectId || "proj-main",
        orgName: orgName || "My Organization",
        projectName: projectName || "Core Design System",
      }
    );
    saveApiKey(record);

    session.status = "approved";
    session.pat = plaintextKey;
    session.orgId = orgId || "org-default";
    session.projectId = projectId || "proj-main";
    session.orgName = orgName || "Default Organization";
    session.projectName = projectName || "Main Design System";
    session.serverUrl = origin;

    pairingSessions.set(cleanCode, session);

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
