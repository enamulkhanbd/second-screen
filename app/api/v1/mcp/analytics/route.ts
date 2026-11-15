import { NextRequest } from "next/server";
import { authorizeProjectRequest } from "@/utils/auth";
import { handleTrustedOptionsCors, jsonWithTrustedCors } from "@/utils/cors";
import { getMcpProjectAnalytics, parseAnalyticsRange } from "@/lib/mcp/observability";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return handleTrustedOptionsCors(req);
}

/**
 * GET /api/v1/mcp/analytics?orgId=...&projectId=...&range=24h|7d|30d
 * Returns aggregated MCP usage, latency, tool breakdown, and recent activity
 * for an authorized workspace project.
 */
export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId")?.trim() || "";
  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() || "";
  if (!orgId || !projectId) {
    return jsonWithTrustedCors(
      req,
      { error: "orgId and projectId are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const access = await authorizeProjectRequest(req, orgId, projectId, "read");
  if (!access.authorized) {
    return jsonWithTrustedCors(
      req,
      { error: access.error },
      { status: access.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const range = parseAnalyticsRange(req.nextUrl.searchParams.get("range"));

  try {
    const analytics = await getMcpProjectAnalytics(orgId, projectId, range);
    return jsonWithTrustedCors(req, analytics, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    return jsonWithTrustedCors(
      req,
      { error: error?.message || "Could not load MCP analytics." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
