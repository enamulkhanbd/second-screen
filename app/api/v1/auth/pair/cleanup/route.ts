import { NextRequest, NextResponse } from "next/server";
import { cleanupPairingSessionsStorage } from "../pairingStore";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(req: NextRequest): boolean {
  const configuredSecret =
    process.env.PAIRING_CLEANUP_SECRET || process.env.CRON_SECRET || "";
  if (!configuredSecret) return false;

  const headerSecret = req.headers.get("x-cron-secret") || "";
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  return headerSecret === configuredSecret || bearerToken === configuredSecret;
}

/**
 * POST /api/v1/auth/pair/cleanup
 * Scheduled cleanup endpoint for hosts without pg_cron.
 * Requires `x-cron-secret` or `Authorization: Bearer <CRON_SECRET>`.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await cleanupPairingSessionsStorage();
  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

