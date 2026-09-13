import { NextRequest, NextResponse } from "next/server";
import { SCHEMA_CATALOG } from "@/data/schemaCatalog";

export async function GET(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const pathSegments = params.path || [];
  const fullPath = pathSegments.join("/").toLowerCase();

  // Find corresponding schema in catalog by matching ID or URL segment
  const matched = SCHEMA_CATALOG.find((item) => {
    const normUrl = item.schemaUrl.toLowerCase();
    return (
      normUrl.includes(fullPath) ||
      pathSegments.includes(item.id.toLowerCase()) ||
      pathSegments.includes(item.name.toLowerCase().replace(/\s+/g, "-"))
    );
  });

  const origin = req.nextUrl.origin || "http://localhost:3000";
  const schemaTitle = matched?.name || pathSegments[pathSegments.length - 1] || "Design Token Schema";
  const schemaDescription = matched?.description || "Design Token schema definition.";

  // Generate a valid draft-2020-12 JSON schema
  const schemaPayload = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${origin}/api/v1/schemas/${fullPath}`,
    title: schemaTitle,
    description: schemaDescription,
    type: "object",
    properties: {
      $type: {
        type: "string",
        description: "The design token type identifier.",
      },
      $value: {
        description: "The value of the design token conforming to this schema.",
      },
      $description: {
        type: "string",
        description: "An optional explanation of the token's purpose.",
      },
    },
    required: ["$value"],
    additionalProperties: true,
  };

  return new NextResponse(JSON.stringify(schemaPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/schema+json",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
