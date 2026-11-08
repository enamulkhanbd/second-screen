import { NextRequest, NextResponse } from "next/server";
import { SCHEMA_CATALOG, SchemaCategory } from "@/data/schemaCatalog";
import { jsonWithCors, handleOptionsCors, corsHeaders } from "@/utils/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptionsCors();
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as SchemaCategory | null;
  const query = searchParams.get("q")?.toLowerCase().trim() || "";

  let items = SCHEMA_CATALOG;

  if (category) {
    items = items.filter((item) => item.category === category);
  }

  if (query) {
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
    );
  }

  const counts = {
    all: SCHEMA_CATALOG.length,
    core: SCHEMA_CATALOG.filter((s) => s.category === "core").length,
    colorSpaces: SCHEMA_CATALOG.filter((s) => s.category === "color-spaces").length,
    functions: SCHEMA_CATALOG.filter((s) => s.category === "functions").length,
  };

  return jsonWithCors(
    {
      counts,
      total: items.length,
      schemas: items,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
