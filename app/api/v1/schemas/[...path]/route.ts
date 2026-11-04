import { NextRequest, NextResponse } from "next/server";
import { getSchemaByPath, getSchemaById, SCHEMA_CATALOG } from "@/data/schemaCatalog";
import { buildDtcgSchema } from "@/utils/dtcgSchemaGenerator";
import { handleOptionsCors, corsHeaders } from "@/utils/cors";

export const dynamic = "force-dynamic";

/**
 * OPTIONS /api/v1/schemas/[...path]
 * Handles preflight requests for cross-origin schema fetching (e.g. Figma plugin, CLI tools)
 */
export async function OPTIONS() {
  return handleOptionsCors();
}

/**
 * HEAD /api/v1/schemas/[...path]
 * Checks schema existence and returns caching/CORS metadata without body payload
 */
export async function HEAD(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const pathSegments = params.path || [];
  const fullPath = pathSegments.join("/").toLowerCase();

  const matched =
    getSchemaByPath(fullPath) ||
    (pathSegments.length > 0 ? getSchemaById(pathSegments[pathSegments.length - 1]) : undefined);

  if (!matched && pathSegments.length === 0) {
    return new NextResponse(null, { status: 404, headers: corsHeaders });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/schema+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

/**
 * GET /api/v1/schemas/[...path]
 * Returns Draft 2020-12 & DTCG 2025.10 compliant JSON Schema dynamically bound to request origin.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const pathSegments = params.path || [];
  const fullPath = pathSegments.join("/").toLowerCase();

  // 1. Try fast path lookup
  let matched = getSchemaByPath(fullPath);

  // 2. Try ID lookup from path segments (e.g. types/tokens/color/0/schema.json -> 'color')
  if (!matched) {
    for (const segment of pathSegments) {
      const found = getSchemaById(segment);
      if (found) {
        matched = found;
        break;
      }
    }
  }

  // 3. Fallback scan across SCHEMA_CATALOG
  if (!matched) {
    matched = SCHEMA_CATALOG.find((item) => {
      const normUrl = item.schemaUrl.toLowerCase();
      return (
        normUrl.includes(fullPath) ||
        pathSegments.includes(item.id.toLowerCase()) ||
        pathSegments.includes(item.name.toLowerCase().replace(/\s+/g, "-"))
      );
    });
  }

  const origin = req.nextUrl.origin || "http://localhost:3000";
  const typeId = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1].replace(/\.json$/, "") : "token";

  // Build the complete DTCG 2025.10 & Draft 2020-12 schema payload
  const schemaPayload = buildDtcgSchema({
    origin,
    fullPath,
    matchedItem: matched,
    typeId: matched?.id || typeId,
  });

  return new NextResponse(JSON.stringify(schemaPayload, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/schema+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
