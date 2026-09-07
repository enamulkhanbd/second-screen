import Color from "colorjs.io";

export interface ColorModifier {
  type: "lighten" | "darken" | "mix" | "alpha" | string;
  value: string | number;
  space?: "lch" | "oklch" | "srgb" | "hsl" | "p3" | "lab" | string;
  color?: string;
  format?: "hex" | "lch" | "oklch" | "hsl" | "rgb" | string;
}

/**
 * Extracts a Tokens Studio color modifier from a token leaf node, if present.
 */
export function extractColorModifier(node: any): ColorModifier | null {
  if (!node || typeof node !== "object") return null;
  const mod =
    node.$extensions?.["studio.tokens"]?.modify ||
    node.$extensions?.modify ||
    node["studio.tokens"]?.modify ||
    node.modify;

  if (mod && typeof mod === "object" && mod.type) {
    return mod as ColorModifier;
  }
  return null;
}

/**
 * Applies a Tokens Studio color modifier (lighten, darken, mix, alpha in lch, oklch, hsl, srgb, p3)
 * to a resolved base color.
 */
export function applyColorModifier(
  baseColor: string,
  modifier: ColorModifier,
  resolvedMixColor?: string
): { resolvedValue: string; hex: string } {
  if (!baseColor || typeof baseColor !== "string") {
    return { resolvedValue: baseColor || "", hex: baseColor || "" };
  }

  try {
    let color: any = new Color(baseColor.trim());
    const rawVal = String(modifier.value ?? "0").trim();
    const isPercent = rawVal.endsWith("%");
    const num = parseFloat(rawVal.replace(/%/g, ""));
    const amount = isNaN(num) ? 0 : isPercent ? num / 100 : num;

    const space = String(modifier.space || "lch").toLowerCase();
    const type = String(modifier.type || "lighten").toLowerCase();

    switch (type) {
      case "lighten": {
        if (space === "lch") {
          const lch = color.to("lch");
          const diff = 100 - lch.l;
          lch.l = Math.min(100, Math.max(0, lch.l + diff * amount));
          lch.c = Math.max(0, lch.c * (1 - amount));
          color = lch;
        } else if (space === "oklch") {
          const oklch = color.to("oklch");
          const diff = 1 - oklch.l;
          oklch.l = Math.min(1, Math.max(0, oklch.l + diff * amount));
          oklch.c = Math.max(0, oklch.c * (1 - amount));
          color = oklch;
        } else if (space === "hsl") {
          const hsl = color.to("hsl");
          hsl.l = Math.min(100, Math.max(0, hsl.l + (100 - hsl.l) * amount));
          color = hsl;
        } else if (space === "p3" || space === "srgb") {
          const rgb = color.to(space as any);
          rgb.r = Math.min(1, rgb.r + (1 - rgb.r) * amount);
          rgb.g = Math.min(1, rgb.g + (1 - rgb.g) * amount);
          rgb.b = Math.min(1, rgb.b + (1 - rgb.b) * amount);
          color = rgb;
        } else {
          color = color.lighten(amount);
        }
        break;
      }
      case "darken": {
        if (space === "lch") {
          const lch = color.to("lch");
          lch.l = Math.max(0, Math.min(100, lch.l - lch.l * amount));
          lch.c = Math.max(0, lch.c * (1 - amount));
          color = lch;
        } else if (space === "oklch") {
          const oklch = color.to("oklch");
          oklch.l = Math.max(0, Math.min(1, oklch.l - oklch.l * amount));
          oklch.c = Math.max(0, oklch.c * (1 - amount));
          color = oklch;
        } else if (space === "hsl") {
          const hsl = color.to("hsl");
          hsl.l = Math.max(0, Math.min(100, hsl.l - hsl.l * amount));
          color = hsl;
        } else if (space === "p3" || space === "srgb") {
          const rgb = color.to(space as any);
          rgb.r = Math.max(0, rgb.r - rgb.r * amount);
          rgb.g = Math.max(0, rgb.g - rgb.g * amount);
          rgb.b = Math.max(0, rgb.b - rgb.b * amount);
          color = rgb;
        } else {
          color = color.darken(amount);
        }
        break;
      }
      case "mix": {
        const targetMix = resolvedMixColor || modifier.color || "#ffffff";
        const mixColorObj = new Color(targetMix.trim());
        color = color.mix(mixColorObj, Math.max(0, Math.min(1, amount)), {
          space: space as any,
        });
        break;
      }
      case "alpha": {
        color.alpha = Math.max(0, Math.min(1, amount));
        break;
      }
      default:
        break;
    }

    let hex = "";
    try {
      hex = color.to("srgb").toString({ format: "hex" });
    } catch {
      hex = baseColor;
    }

    let resolvedValue = "";
    if (modifier.format && modifier.format.toLowerCase() === "hex") {
      resolvedValue = hex;
    } else if (modifier.format) {
      try {
        resolvedValue = color.toString({ inGamut: true, format: modifier.format });
      } catch {
        resolvedValue = color.toString({ inGamut: true });
      }
    } else if (space === "oklch") {
      resolvedValue = color.to("oklch").toString({ inGamut: true });
    } else if (space === "lch") {
      resolvedValue = color.to("lch").toString({ inGamut: true });
    } else if (space === "hsl") {
      resolvedValue = color.to("hsl").toString({ inGamut: true });
    } else if (space === "srgb" && baseColor.trim().startsWith("#")) {
      resolvedValue = hex;
    } else {
      resolvedValue = color.toString({ inGamut: true });
    }

    return { resolvedValue, hex };
  } catch {
    return { resolvedValue: baseColor, hex: baseColor };
  }
}
