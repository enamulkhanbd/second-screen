import { NextRequest } from "next/server";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { generateApiKey } from "@/utils/patAuth";
import { saveApiKey } from "@/utils/cloudStorage";
import { getOrganization, getOrgProjects } from "@/services/organizationService";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

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

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "pairing_sessions", code), session);
    } catch (e) {
      console.warn("Firestore save pairing session error:", e);
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

  // Fallback to Firestore to share state across localhost, production, and serverless lambdas
  if ((!session || session.status !== "approved") && isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, "pairing_sessions", code));
      if (snap.exists()) {
        session = snap.data() as PairingSession;
        pairingSessions.set(code, session);
      }
    } catch (e) {
      console.warn("Firestore fetch pairing session error:", e);
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
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, "pairing_sessions", code));
      } catch { }
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

    if (!session && isFirebaseConfigured && db) {
      try {
        const snap = await getDoc(doc(db, "pairing_sessions", cleanCode));
        if (snap.exists()) {
          session = snap.data() as PairingSession;
        }
      } catch { }
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
      } catch { }
    }

    if (orgId && projectId && !resolvedProjName) {
      try {
        const projs = await getOrgProjects(orgId);
        const proj = projs.find((p) => p.id === projectId);
        if (proj?.name) resolvedProjName = proj.name;
      } catch { }
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

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "pairing_sessions", cleanCode), session);
      } catch (e) {
        console.warn("Firestore update pairing session error:", e);
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
