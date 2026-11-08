/**
 * Core default schema IDs for DTCG design token validation.
 * Extracted into a lightweight module to prevent bundling the full 57KB schemaCatalog
 * into the main application client bundle shell.
 */
export const DEFAULT_ENABLED_SCHEMA_IDS: string[] = [
  "border",
  "borderRadius",
  "borderWidth",
  "color",
  "dimension",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "number",
  "opacity",
  "shadow",
  "size",
  "space",
  "text",
  "typography",
  "hex",
  "hsl",
  "rgb",
  "srgb",
];
