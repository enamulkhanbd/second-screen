export interface ColorShade {
  step: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
  hex: string;
}

export interface ColorFamily {
  id: string;
  name: string;
  baseHex: string; // 500 level
  shades: Record<ColorShade["step"], string>;
}

export const COLOR_FAMILIES: ColorFamily[] = [
  {
    id: "neutral",
    name: "Neutral",
    baseHex: "#171717",
    shades: {
      50: "#fafafa",
      100: "#f5f5f5",
      200: "#e5e5e5",
      300: "#d4d4d4",
      400: "#a3a3a3",
      500: "#737373",
      600: "#525252",
      700: "#404040",
      800: "#262626",
      900: "#171717",
      950: "#0a0a0a",
    },
  },
  {
    id: "indigo",
    name: "Indigo",
    baseHex: "#6366f1",
    shades: {
      50: "#eef2ff",
      100: "#e0e7ff",
      200: "#c7d2fe",
      300: "#a5b4fc",
      400: "#818cf8",
      500: "#6366f1",
      600: "#4f46e5",
      700: "#4338ca",
      800: "#3730a3",
      900: "#312e81",
      950: "#1e1b4b",
    },
  },
  {
    id: "violet",
    name: "Violet",
    baseHex: "#8b5cf6",
    shades: {
      50: "#f5f3ff",
      100: "#ede9fe",
      200: "#ddd6fe",
      300: "#c4b5fd",
      400: "#a78bfa",
      500: "#8b5cf6",
      600: "#7c3aed",
      700: "#6d28d9",
      800: "#5b21b6",
      900: "#4c1d95",
      950: "#2e1065",
    },
  },
  {
    id: "purple",
    name: "Purple",
    baseHex: "#a855f7",
    shades: {
      50: "#faf5ff",
      100: "#f3e8ff",
      200: "#e9d5ff",
      300: "#d8b4fe",
      400: "#c084fc",
      500: "#a855f7",
      600: "#9333ea",
      700: "#7e22ce",
      800: "#6b21a8",
      900: "#581c87",
      950: "#3b0764",
    },
  },
  {
    id: "fuchsia",
    name: "Fuchsia",
    baseHex: "#d946ef",
    shades: {
      50: "#fdf4ff",
      100: "#fae8ff",
      200: "#f5d0fe",
      300: "#f0abfc",
      400: "#e879f9",
      500: "#d946ef",
      600: "#c026d3",
      700: "#a21caf",
      800: "#86198f",
      900: "#701a75",
      950: "#4a044e",
    },
  },
  {
    id: "pink",
    name: "Pink",
    baseHex: "#ec4899",
    shades: {
      50: "#fdf2f8",
      100: "#fce7f3",
      200: "#fbcfe8",
      300: "#f9a8d4",
      400: "#f472b6",
      500: "#ec4899",
      600: "#db2777",
      700: "#be185d",
      800: "#9d174d",
      900: "#831843",
      950: "#500724",
    },
  },
  {
    id: "rose",
    name: "Rose",
    baseHex: "#f43f5e",
    shades: {
      50: "#fff1f2",
      100: "#ffe4e6",
      200: "#fecdd3",
      300: "#fda4af",
      400: "#fb7185",
      500: "#f43f5e",
      600: "#e11d48",
      700: "#be123c",
      800: "#9f1239",
      900: "#881337",
      950: "#4c0519",
    },
  },
  {
    id: "red",
    name: "Red",
    baseHex: "#ef4444",
    shades: {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d",
      950: "#450a0a",
    },
  },
  {
    id: "orange",
    name: "Orange",
    baseHex: "#f97316",
    shades: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c",
      800: "#9a3412",
      900: "#7c2d12",
      950: "#431407",
    },
  },
  {
    id: "amber",
    name: "Amber",
    baseHex: "#f59e0b",
    shades: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
      950: "#451a03",
    },
  },
  {
    id: "yellow",
    name: "Yellow",
    baseHex: "#eab308",
    shades: {
      50: "#fefce8",
      100: "#fef9c3",
      200: "#fef08a",
      300: "#fde047",
      400: "#facc15",
      500: "#eab308",
      600: "#ca8a04",
      700: "#a16207",
      800: "#854d0e",
      900: "#713f12",
      950: "#422006",
    },
  },
  {
    id: "lime",
    name: "Lime",
    baseHex: "#84cc16",
    shades: {
      50: "#f7fee7",
      100: "#ecfccb",
      200: "#d9f99d",
      300: "#bef264",
      400: "#a3e635",
      500: "#84cc16",
      600: "#65a30d",
      700: "#4d7c0f",
      800: "#3f6212",
      900: "#365314",
      950: "#1a2e05",
    },
  },
  {
    id: "green",
    name: "Green",
    baseHex: "#22c55e",
    shades: {
      50: "#f0fdf4",
      100: "#dcfce7",
      200: "#bbf7d0",
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
      800: "#166534",
      900: "#14532d",
      950: "#052e16",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    baseHex: "#10b981",
    shades: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
      950: "#022c22",
    },
  },
  {
    id: "teal",
    name: "Teal",
    baseHex: "#14b8a6",
    shades: {
      50: "#f0fdfa",
      100: "#ccfbf1",
      200: "#99f6e4",
      300: "#5eead4",
      400: "#2dd4bf",
      500: "#14b8a6",
      600: "#0d9488",
      700: "#0f766e",
      800: "#115e59",
      900: "#134e4a",
      950: "#042f2e",
    },
  },
  {
    id: "cyan",
    name: "Cyan",
    baseHex: "#06b6d4",
    shades: {
      50: "#ecfeff",
      100: "#cffafe",
      200: "#a5f3fc",
      300: "#67e8f9",
      400: "#22d3ee",
      500: "#06b6d4",
      600: "#0891b2",
      700: "#0e7490",
      800: "#155e75",
      900: "#164e63",
      950: "#083344",
    },
  },
  {
    id: "sky",
    name: "Sky",
    baseHex: "#0ea5e9",
    shades: {
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c4a6e",
      950: "#082f49",
    },
  },
  {
    id: "blue",
    name: "Blue",
    baseHex: "#3b82f6",
    shades: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      950: "#172554",
    },
  },
  {
    id: "slate",
    name: "Slate",
    baseHex: "#64748b",
    shades: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
      950: "#020617",
    },
  },
  {
    id: "zinc",
    name: "Zinc",
    baseHex: "#71717a",
    shades: {
      50: "#fafafa",
      100: "#f4f4f5",
      200: "#e4e4e7",
      300: "#d4d4d8",
      400: "#a1a1aa",
      500: "#71717a",
      600: "#52525b",
      700: "#3f3f46",
      800: "#27272a",
      900: "#18181b",
      950: "#09090b",
    },
  },
];

export const SHADE_STEPS: Array<ColorShade["step"]> = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
];

/**
 * Checks if a hex color directly matches a known standard ColorFamily shade
 */
export function findExactColorFamily(hex: string): ColorFamily | null {
  const cleanHex = hex.toLowerCase().trim();
  for (const family of COLOR_FAMILIES) {
    if (Object.values(family.shades).some((s) => s.toLowerCase() === cleanHex) || family.baseHex.toLowerCase() === cleanHex) {
      return family;
    }
  }
  return null;
}

/**
 * Finds the closest matching ColorFamily for a given hex color using true circular HUE distance
 */
export function findMatchingColorFamily(hex: string): ColorFamily {
  const cleanHex = hex.toLowerCase().trim();
  
  // 1. Direct exact shade match in known families
  const exact = findExactColorFamily(cleanHex);
  if (exact) return exact;

  const targetRgb = hexToRgb(cleanHex);
  if (!targetRgb) return COLOR_FAMILIES[0];

  const targetHsl = rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b);

  // If very desaturated, it belongs to the Neutral / Slate / Zinc families
  if (targetHsl.s < 0.12 || targetHsl.l < 0.06 || targetHsl.l > 0.98) {
    return COLOR_FAMILIES.find((f) => f.id === "neutral") || COLOR_FAMILIES[0];
  }

  const targetHueDeg = targetHsl.h * 360;

  let closestFamily = COLOR_FAMILIES[1]; // default to first colored family
  let minHueDiff = Infinity;

  for (const family of COLOR_FAMILIES) {
    if (family.id === "neutral" || family.id === "zinc" || family.id === "slate") continue;
    const baseRgb = hexToRgb(family.baseHex);
    if (!baseRgb) continue;
    const baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
    const baseHueDeg = baseHsl.h * 360;

    let diff = Math.abs(targetHueDeg - baseHueDeg);
    if (diff > 180) diff = 360 - diff;

    if (diff < minHueDiff) {
      minHueDiff = diff;
      closestFamily = family;
    }
  }

  return closestFamily;
}

/**
 * Maps any arbitrary color to the closest standard tonal shade step (50 - 950) by lightness
 */
export function getBestMatchingShadeStep(hex: string): ColorShade["step"] {
  const rgb = hexToRgb(hex);
  if (!rgb) return 500;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const targetLightness: Record<ColorShade["step"], number> = {
    50: 0.96,
    100: 0.92,
    200: 0.84,
    300: 0.74,
    400: 0.62,
    500: 0.50,
    600: 0.40,
    700: 0.30,
    800: 0.20,
    900: 0.13,
    950: 0.07,
  };

  let bestStep: ColorShade["step"] = 500;
  let minDiff = Infinity;
  for (const step of SHADE_STEPS) {
    const diff = Math.abs(hsl.l - targetLightness[step]);
    if (diff < minDiff) {
      minDiff = diff;
      bestStep = step;
    }
  }
  return bestStep;
}

/**
 * Generates an 11-step tint & shade scale dynamically for any arbitrary custom HEX color.
 * Maintains strict monotonic lightness to avoid duplicate shades or duplicate indicator dots.
 */
export function generateDynamicShades(hex: string): Record<ColorShade["step"], string> {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return COLOR_FAMILIES[0].shades;
  }

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const cleanHex = hex.toLowerCase().trim();
  const bestStep = getBestMatchingShadeStep(cleanHex);

  const targetLightness: Record<ColorShade["step"], number> = {
    50: 0.96,
    100: 0.92,
    200: 0.84,
    300: 0.74,
    400: 0.62,
    500: 0.50,
    600: 0.40,
    700: 0.30,
    800: 0.20,
    900: 0.13,
    950: 0.07,
  };

  const result = {} as Record<ColorShade["step"], string>;

  for (const step of SHADE_STEPS) {
    if (step === bestStep) {
      result[step] = cleanHex;
    } else {
      const l = targetLightness[step];
      let s = hsl.s;
      if (step <= 100) s = Math.min(s, 0.85);
      if (step >= 900) s = Math.min(s, 0.75);

      const newRgb = hslToRgb(hsl.h, s, l);
      result[step] = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    }
  }

  return result;
}

// -------------------------------------------------------------
// Color Math Helpers
// -------------------------------------------------------------
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clean)) {
    return null;
  }
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

export function normalizeHexColor(hex: string, fallback = "#171717"): string {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clean)) return fallback;
  const expanded = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  return `#${expanded.toLowerCase()}`;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.round(Math.min(255, Math.max(0, c))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function getContrastTextColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 140 ? "#0a0a0a" : "#ffffff";
}

// -------------------------------------------------------------
// WCAG 2.1 & OKLCH Perceptual Accessibility Engine
// -------------------------------------------------------------

/**
 * Calculates WCAG 2.1 Relative Luminance (0.0 to 1.0)
 * Uses precise sRGB inverse gamma expansion.
 */
export function calculateRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rLin = toLinear(rgb.r);
  const gLin = toLinear(rgb.g);
  const bLin = toLinear(rgb.b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculates WCAG 2.1 Contrast Ratio from two relative luminances (1.0 to 21.0)
 */
export function getContrastRatioFromLuminance(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Calculates WCAG 2.1 Contrast Ratio between two hex colors.
 */
export function getWcagContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1.0;
  const l1 = calculateRelativeLuminance(rgb1);
  const l2 = calculateRelativeLuminance(rgb2);
  return getContrastRatioFromLuminance(l1, l2);
}

/**
 * Determines the accessible text color (#ffffff or #0a0a0a) for any background color
 * strictly following WCAG 2.1 AA/AAA contrast guidelines.
 */
export function getAccessibleForeground(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const bgL = calculateRelativeLuminance(rgb);
  const ratioWhite = getContrastRatioFromLuminance(bgL, 1.0);
  const darkL = calculateRelativeLuminance({ r: 10, g: 10, b: 10 });
  const ratioDark = getContrastRatioFromLuminance(bgL, darkL);

  return ratioWhite >= ratioDark ? "#ffffff" : "#0a0a0a";
}

/**
 * Converts sRGB [0..255] to OKLCH perceptual color space:
 * L: Perceptual Lightness [0..1]
 * C: Chroma [0..~0.37]
 * H: Hue angle [0..360)
 */
export function srgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rLin = toLinear(r);
  const gLin = toLinear(g);
  const bLin = toLinear(b);

  const l = Math.cbrt(0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin);
  const m = Math.cbrt(0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin);
  const s = Math.cbrt(0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const oklabB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.sqrt(a * a + oklabB * oklabB);
  let h = (Math.atan2(oklabB, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { l: Math.max(0, Math.min(1, L)), c, h };
}

/**
 * Converts OKLCH perceptual color space back to standard sRGB [0..255]
 */
export function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lLin = l_ * l_ * l_;
  const mLin = m_ * m_ * m_;
  const sLin = s_ * s_ * s_;

  const rLin = +4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin;
  const gLin = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin;
  const bLin = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.707614701 * sLin;

  const toSrgb = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  return {
    r: Math.round(toSrgb(rLin) * 255),
    g: Math.round(toSrgb(gLin) * 255),
    b: Math.round(toSrgb(bLin) * 255),
  };
}

export interface AccessibleBrandTokens {
  rawHex: string;
  normalizedHex: string;
  light: {
    primaryHex: string;
    primaryHsl: string;
    foregroundHex: string;
    foregroundHsl: string;
    contrastRatio: number;
    isUltraLight: boolean;
    borderHex: string;
    subtleHex: string;
  };
  dark: {
    primaryHex: string;
    primaryHsl: string;
    foregroundHex: string;
    foregroundHsl: string;
    contrastRatio: number;
    subtleHex: string;
  };
  shades: Record<ColorShade["step"], string>;
  oklch: { l: number; c: number; h: number };
}

/**
 * Resolves full dual-theme accessible tokens for any user-selected brand color.
 * Automatically computes optimal foreground colors and adapts dark mode
 * lightness/chroma to guarantee WCAG compliance and visual comfort.
 */
export function resolveAccessibleBrandTokens(rawHex: string): AccessibleBrandTokens {
  const normalizedHex = normalizeHexColor(rawHex, "#171717");
  const rgb = hexToRgb(normalizedHex) || { r: 23, g: 23, b: 23 };
  const oklch = srgbToOklch(rgb.r, rgb.g, rgb.b);
  const shades = generateDynamicShades(normalizedHex);

  // --- Light Mode ---
  const lightPrimaryHex = normalizedHex;
  const lightForegroundHex = getAccessibleForeground(lightPrimaryHex);
  const lightRgb = hexToRgb(lightPrimaryHex) || rgb;
  const lightHsl = rgbToHsl(lightRgb.r, lightRgb.g, lightRgb.b);
  const lightFgRgb = hexToRgb(lightForegroundHex) || { r: 255, g: 255, b: 255 };
  const lightFgHsl = rgbToHsl(lightFgRgb.r, lightFgRgb.g, lightFgRgb.b);
  const lightContrast = getWcagContrastRatio(lightPrimaryHex, lightForegroundHex);

  // Ultra-light check: Relative luminance > 0.70 means on pure white cards it needs a perimeter border
  const relLum = calculateRelativeLuminance(lightRgb);
  const isUltraLight = relLum > 0.70;
  const borderHex = shades[300] || shades[200] || "#d4d4d4";
  const lightSubtleHex = shades[100] || "#f5f5f5";

  // --- Dark Mode ---
  // If the color is deep/dark in OKLCH (L < 0.55), shift lightness to 0.70 so it pops on dark surfaces
  let darkPrimaryHex: string;
  if (oklch.l < 0.55) {
    const targetL = Math.max(0.68, Math.min(0.76, oklch.l + 0.38));
    const targetC = Math.min(oklch.c, 0.16);
    const shiftedRgb = oklchToRgb(targetL, targetC, oklch.h);
    darkPrimaryHex = rgbToHex(shiftedRgb.r, shiftedRgb.g, shiftedRgb.b);
  } else if (oklch.c > 0.20) {
    // Clamp extreme neon saturation to avoid halation on dark surfaces
    const clampedRgb = oklchToRgb(Math.min(oklch.l, 0.85), 0.17, oklch.h);
    darkPrimaryHex = rgbToHex(clampedRgb.r, clampedRgb.g, clampedRgb.b);
  } else {
    darkPrimaryHex = normalizedHex;
  }

  const darkForegroundHex = getAccessibleForeground(darkPrimaryHex);
  const darkRgb = hexToRgb(darkPrimaryHex) || rgb;
  const darkHsl = rgbToHsl(darkRgb.r, darkRgb.g, darkRgb.b);
  const darkFgRgb = hexToRgb(darkForegroundHex) || { r: 10, g: 10, b: 10 };
  const darkFgHsl = rgbToHsl(darkFgRgb.r, darkFgRgb.g, darkFgRgb.b);
  const darkContrast = getWcagContrastRatio(darkPrimaryHex, darkForegroundHex);
  const darkSubtleHex = shades[900] || "#262626";

  return {
    rawHex,
    normalizedHex,
    light: {
      primaryHex: lightPrimaryHex,
      primaryHsl: `${Math.round(lightHsl.h * 360)} ${Math.round(lightHsl.s * 100)}% ${Math.round(lightHsl.l * 100)}%`,
      foregroundHex: lightForegroundHex,
      foregroundHsl: `${Math.round(lightFgHsl.h * 360)} ${Math.round(lightFgHsl.s * 100)}% ${Math.round(lightFgHsl.l * 100)}%`,
      contrastRatio: lightContrast,
      isUltraLight,
      borderHex,
      subtleHex: lightSubtleHex,
    },
    dark: {
      primaryHex: darkPrimaryHex,
      primaryHsl: `${Math.round(darkHsl.h * 360)} ${Math.round(darkHsl.s * 100)}% ${Math.round(darkHsl.l * 100)}%`,
      foregroundHex: darkForegroundHex,
      foregroundHsl: `${Math.round(darkFgHsl.h * 360)} ${Math.round(darkFgHsl.s * 100)}% ${Math.round(darkFgHsl.l * 100)}%`,
      contrastRatio: darkContrast,
      subtleHex: darkSubtleHex,
    },
    shades,
    oklch,
  };
}

/**
 * Determines whether a color is a custom brand color (not the neutral dark/light default)
 */
export function isCustomBrandColor(rawHex?: string | null): rawHex is string {
  if (!rawHex) return false;
  const clean = rawHex.trim().toLowerCase();
  return !["#171717", "#0a0a0a", "neutral", ""].includes(clean);
}
