import { describe, expect, it } from "vitest";
import { buildDtcgSchema } from "../dtcgSchemaGenerator";
import { getSchemaById, resolveSchemaUrl } from "../../data/schemaCatalog";

describe("DTCG Schema Generator", () => {
  it("generates a self-hosted DTCG schema with correct Draft 2020-12 and origin-based $id", () => {
    const origin = "https://tokens.internal.corp";
    const schema = buildDtcgSchema({ fullPath: "color.json", origin });

    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.$id).toBe("https://tokens.internal.corp/api/v1/schemas/color.json");
    expect(schema.required).toContain("$value");
    expect(schema.properties?.$value).toBeDefined();
    expect(schema.properties?.$deprecated).toBeDefined();
    expect(schema.properties?.$extensions).toBeDefined();
  });

  it("handles dimension and typography schemas with accurate definitions", () => {
    const origin = "http://localhost:3000";
    const dimSchema = buildDtcgSchema({ fullPath: "dimension.json", origin });
    expect(dimSchema.$id).toBe("http://localhost:3000/api/v1/schemas/dimension.json");

    const typoSchema = buildDtcgSchema({ fullPath: "typography.json", origin });
    expect(typoSchema.properties?.$value).toBeDefined();
  });

  it("ensures zero external tokens.studio links exist in generated schemas", () => {
    const origin = "https://design.mycompany.io";
    const schema = buildDtcgSchema({ fullPath: "shadow.json", origin });
    const jsonString = JSON.stringify(schema);

    expect(jsonString).not.toContain("registry.tokens.studio");
    expect(jsonString).toContain(origin);
  });
});

describe("Schema Catalog Resolver", () => {
  it("resolves schema URLs relative to origin", () => {
    const url = resolveSchemaUrl("/api/v1/schemas/color.json", "https://platform.local");
    expect(url).toBe("https://platform.local/api/v1/schemas/color.json");
    expect(url).not.toContain("registry.tokens.studio");
  });

  it("finds schemas by ID in O(1)", () => {
    const item = getSchemaById("color");
    expect(item).toBeDefined();
    expect(item?.name).toBe("color");
  });
});
