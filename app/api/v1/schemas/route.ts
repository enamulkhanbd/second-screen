import { NextRequest, NextResponse } from "next/server";
import { SCHEMA_CATALOG, SchemaCategory } from "@/data/schemaCatalog";

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

  return NextResponse.json({
    counts,
    total: items.length,
    schemas: items,
  });
}
