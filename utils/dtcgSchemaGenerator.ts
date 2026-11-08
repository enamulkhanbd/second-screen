/**
 * DTCG 2025.10 & JSON Schema Draft 2020-12 Generator
 * Self-hosted schema definitions for Design Tokens Community Group standard.
 *
 * All schemas resolve dynamically to the platform's origin (Zero external registry links).
 */

import { SchemaItem } from "@/data/schemaCatalog";

export interface DtcgSchemaPayload {
  $schema: string;
  $id: string;
  title: string;
  description: string;
  type: "object";
  $defs?: Record<string, any>;
  properties?: Record<string, any>;
  required: string[];
  additionalProperties: boolean;
}

const TOKEN_REF_DEF = {
  type: "string",
  pattern: "^\\{[^\\}]+\\}$",
  description: "A reference alias to another design token using {path.to.token} syntax.",
};

const COMMON_DEFS = {
  tokenReference: TOKEN_REF_DEF,
  colorSpaceEnum: {
    type: "string",
    enum: [
      "srgb",
      "srgb-linear",
      "display-p3",
      "a98-rgb",
      "prophoto-rgb",
      "rec2020",
      "lab",
      "oklab",
      "lch",
      "oklch",
      "xyz",
      "xyz-d50",
      "xyz-d65",
      "hsl",
      "hwb",
    ],
  },
  dimensionString: {
    type: "string",
    pattern: "^-?[0-9]+(\\.[0-9]+)?(px|rem|em|%|vw|vh|vmin|vmax|ch|ex|pt|dp|sp)?$",
    description: "Numeric value with valid CSS or design dimension unit.",
  },
};

/**
 * Returns the Draft 2020-12 $value schema for a given DTCG token type.
 */
function getValueSchemaForType(typeKey: string): Record<string, any> {
  const normKey = typeKey.toLowerCase();

  switch (normKey) {
    case "color":
    case "color-space":
    case "srgb":
    case "oklch":
    case "lch":
    case "p3":
    case "display-p3":
      return {
        oneOf: [
          {
            $ref: "#/$defs/tokenReference",
          },
          {
            type: "string",
            description: "Hex, RGB(A), HSL(A), OKLCH, LCH, or CSS color string.",
          },
          {
            type: "object",
            description: "DTCG structured color object with explicit colorSpace and components.",
            properties: {
              colorSpace: { $ref: "#/$defs/colorSpaceEnum" },
              components: {
                type: "array",
                items: { type: ["number", "string"] },
                minItems: 3,
                maxItems: 4,
                description: "Channels: [r, g, b] or [l, c, h] etc.",
              },
              alpha: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Optional alpha transparency between 0 and 1.",
              },
              hex: {
                type: "string",
                description: "Optional fallback hex representation.",
              },
            },
            required: ["colorSpace", "components"],
            additionalProperties: false,
          },
        ],
      };

    case "dimension":
    case "fontsize":
    case "spacing":
    case "size":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          { type: "number", description: "Raw numeric pixel or unitless value." },
          { $ref: "#/$defs/dimensionString" },
          {
            type: "object",
            properties: {
              value: { type: "number" },
              unit: { type: "string" },
            },
            required: ["value", "unit"],
            additionalProperties: false,
          },
        ],
      };

    case "duration":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          {
            type: "string",
            pattern: "^[0-9]+(\\.[0-9]+)?(ms|s)$",
            description: "Duration string with ms or s unit (e.g. '200ms', '0.3s').",
          },
          {
            type: "number",
            minimum: 0,
            description: "Duration in milliseconds.",
          },
        ],
      };

    case "cubicbezier":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          {
            type: "array",
            items: { type: "number" },
            minItems: 4,
            maxItems: 4,
            description: "Cubic bezier timing curve [x1, y1, x2, y2].",
          },
        ],
      };

    case "fontfamily":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          { type: "string", description: "Font family name or font stack string." },
          {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            description: "Font stack array of fallback family names.",
          },
        ],
      };

    case "fontweight":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          {
            type: "number",
            minimum: 1,
            maximum: 1000,
            description: "Numeric font weight between 1 and 1000 (e.g. 400, 700).",
          },
          {
            type: "string",
            description: "Font weight named keyword or numeric string.",
          },
        ],
      };

    case "number":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          { type: "number", description: "Unitless numeric token value." },
        ],
      };

    case "boolean":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          { type: "boolean", description: "Boolean true/false token value." },
        ],
      };

    case "opacity":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Alpha opacity value between 0 and 1.",
          },
          {
            type: "string",
            pattern: "^[0-9]+(\\.[0-9]+)?%$",
            description: "Alpha opacity percentage (e.g. '80%').",
          },
        ],
      };

    case "lineheight":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          { type: "number", description: "Unitless line-height multiplier (e.g. 1.5)." },
          { $ref: "#/$defs/dimensionString" },
        ],
      };

    case "letterspacing":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          { type: "number", description: "Tracking offset in pixels." },
          { $ref: "#/$defs/dimensionString" },
        ],
      };

    case "shadow":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          {
            type: "object",
            description: "Single drop shadow or inner shadow definition.",
            properties: {
              color: { type: "string" },
              offsetX: { $ref: "#/$defs/dimensionString" },
              offsetY: { $ref: "#/$defs/dimensionString" },
              x: { $ref: "#/$defs/dimensionString" },
              y: { $ref: "#/$defs/dimensionString" },
              blur: { $ref: "#/$defs/dimensionString" },
              spread: { $ref: "#/$defs/dimensionString" },
              inset: { type: "boolean" },
            },
            required: ["color"],
            additionalProperties: true,
          },
          {
            type: "array",
            items: {
              type: "object",
              properties: {
                color: { type: "string" },
                offsetX: { $ref: "#/$defs/dimensionString" },
                offsetY: { $ref: "#/$defs/dimensionString" },
                x: { $ref: "#/$defs/dimensionString" },
                y: { $ref: "#/$defs/dimensionString" },
                blur: { $ref: "#/$defs/dimensionString" },
                spread: { $ref: "#/$defs/dimensionString" },
                inset: { type: "boolean" },
              },
              required: ["color"],
              additionalProperties: true,
            },
            description: "Array of layered shadow objects.",
          },
        ],
      };

    case "border":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          {
            type: "object",
            description: "Composite border token definition.",
            properties: {
              color: { type: "string" },
              width: {
                oneOf: [{ type: "number" }, { $ref: "#/$defs/dimensionString" }],
              },
              style: {
                type: "string",
                enum: [
                  "solid",
                  "dashed",
                  "dotted",
                  "double",
                  "groove",
                  "ridge",
                  "inset",
                  "outset",
                  "none",
                  "hidden",
                ],
              },
            },
            required: ["color", "width", "style"],
            additionalProperties: false,
          },
        ],
      };

    case "borderradius":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          { type: "number" },
          { $ref: "#/$defs/dimensionString" },
          {
            type: "object",
            properties: {
              topLeft: { $ref: "#/$defs/dimensionString" },
              topRight: { $ref: "#/$defs/dimensionString" },
              bottomRight: { $ref: "#/$defs/dimensionString" },
              bottomLeft: { $ref: "#/$defs/dimensionString" },
            },
            additionalProperties: false,
          },
        ],
      };

    case "borderwidth":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          { type: "number" },
          { $ref: "#/$defs/dimensionString" },
        ],
      };

    case "gradient":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          {
            type: "object",
            description: "Gradient specification with color stops.",
            properties: {
              type: {
                type: "string",
                enum: ["linear", "radial", "conic", "diamond"],
              },
              kind: {
                type: "string",
                enum: ["linear", "radial", "conic", "diamond"],
              },
              stops: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    color: { type: "string" },
                    position: { type: "number" },
                  },
                  required: ["color", "position"],
                },
              },
              angle: { type: ["number", "string"] },
            },
            required: ["stops"],
            additionalProperties: true,
          },
        ],
      };

    case "asset":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          { type: "string", description: "URL, asset file path, or base64 data URI." },
          {
            type: "object",
            properties: {
              src: { type: "string" },
              type: { type: "string" },
            },
            required: ["src"],
            additionalProperties: true,
          },
        ],
      };

    case "typography":
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          {
            type: "object",
            description: "Composite typography token specification.",
            properties: {
              fontFamily: {
                oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
              },
              fontSize: {
                oneOf: [{ type: "number" }, { $ref: "#/$defs/dimensionString" }],
              },
              fontWeight: {
                oneOf: [{ type: "number" }, { type: "string" }],
              },
              lineHeight: {
                oneOf: [{ type: "number" }, { $ref: "#/$defs/dimensionString" }],
              },
              letterSpacing: {
                oneOf: [{ type: "number" }, { $ref: "#/$defs/dimensionString" }],
              },
            },
            additionalProperties: true,
          },
        ],
      };

    default:
      // Generic fallback supporting any JSON value or token reference
      return {
        oneOf: [
          { $ref: "#/$defs/tokenReference" },
          { type: ["string", "number", "boolean", "object", "array"] },
        ],
      };
  }
}

/**
 * Builds a complete Draft 2020-12 compliant JSON Schema for a DTCG 2025.10 token.
 */
export function buildDtcgSchema(options: {
  origin: string;
  fullPath: string;
  matchedItem?: SchemaItem;
  typeId?: string;
}): DtcgSchemaPayload {
  const { origin, fullPath, matchedItem, typeId } = options;

  const targetId = matchedItem?.id || typeId || fullPath.split("/").pop() || "token";
  const schemaTitle = matchedItem?.name || targetId;
  const schemaDescription =
    matchedItem?.description || `DTCG 2025.10 design token schema for '${schemaTitle}'.`;

  // If the catalog item specifies a concrete custom schema, incorporate it
  if (matchedItem?.schema && Object.keys(matchedItem.schema).length > 0) {
    return {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: `${origin}/api/v1/schemas/${fullPath}`,
      title: schemaTitle,
      description: schemaDescription,
      type: "object",
      $defs: COMMON_DEFS,
      properties: matchedItem.schema.properties || {},
      ...matchedItem.schema,
      required: matchedItem.schema.required || ["$value"],
      additionalProperties:
        matchedItem.schema.additionalProperties !== undefined
          ? matchedItem.schema.additionalProperties
          : true,
    };
  }

  const valueSchema = getValueSchemaForType(targetId);

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${origin}/api/v1/schemas/${fullPath}`,
    title: schemaTitle,
    description: schemaDescription,
    type: "object",
    $defs: COMMON_DEFS,
    properties: {
      $type: {
        type: "string",
        const: matchedItem?.name || targetId,
        description: "The DTCG design token type identifier.",
      },
      $value: {
        description: `The design token value conforming to the '${schemaTitle}' specification.`,
        ...valueSchema,
      },
      $description: {
        type: "string",
        description: "An optional explanation of the token's purpose and usage guidelines.",
      },
      $extensions: {
        type: "object",
        description: "Vendor- or tool-specific metadata (e.g. studio, figma, style-dictionary).",
        additionalProperties: true,
      },
      $deprecated: {
        oneOf: [
          { type: "boolean" },
          { type: "string" },
          {
            type: "object",
            properties: {
              message: { type: "string" },
              replacement: { type: "string" },
              removeAfter: { type: "string" },
              severity: { type: "string", enum: ["warning", "error", "info"] },
            },
            additionalProperties: true,
          },
        ],
        description: "Deprecation status, replacement guidance, or sunset milestones.",
      },
    },
    required: ["$value"],
    additionalProperties: true,
  };
}
