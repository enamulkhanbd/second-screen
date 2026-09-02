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
 * Finds the closest matching ColorFamily for a given hex color
 */
export function findMatchingColorFamily(hex: string): ColorFamily {
  const cleanHex = hex.toLowerCase().trim();
  
  // 1. Direct exact shade match in known families
  for (const family of COLOR_FAMILIES) {
    if (Object.values(family.shades).some((s) => s.toLowerCase() === cleanHex)) {
      return family;
    }
  }

  // 2. Compute closest hue by RGB distance
  let closestFamily = COLOR_FAMILIES[0];
  let minDistance = Infinity;

  const targetRgb = hexToRgb(cleanHex) || { r: 99, g: 102, b: 241 };

  for (const family of COLOR_FAMILIES) {
    const baseRgb = hexToRgb(family.baseHex);
    if (!baseRgb) continue;
    const dist = Math.sqrt(
      Math.pow(targetRgb.r - baseRgb.r, 2) +
      Math.pow(targetRgb.g - baseRgb.g, 2) +
      Math.pow(targetRgb.b - baseRgb.b, 2)
    );
    if (dist < minDistance) {
      minDistance = dist;
      closestFamily = family;
    }
  }

  return closestFamily;
}

/**
 * Generates an 11-step tint & shade scale dynamically for any arbitrary custom HEX color
 */
export function generateDynamicShades(hex: string): Record<ColorShade["step"], string> {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return COLOR_FAMILIES[0].shades;
  }

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const lightnessMap: Record<ColorShade["step"], number> = {
    50: 0.96,
    100: 0.92,
    200: 0.84,
    300: 0.74,
    400: 0.62,
    500: hsl.l, // Keep custom base lightness
    600: Math.max(0.08, hsl.l * 0.85),
    700: Math.max(0.06, hsl.l * 0.70),
    800: Math.max(0.04, hsl.l * 0.55),
    900: Math.max(0.03, hsl.l * 0.40),
    950: Math.max(0.02, hsl.l * 0.25),
  };

  const result = {} as Record<ColorShade["step"], string>;

  for (const step of SHADE_STEPS) {
    if (step === 500) {
      result[step] = hex.toLowerCase();
    } else {
      const newL = lightnessMap[step];
      const newRgb = hslToRgb(hsl.h, hsl.s, newL);
      result[step] = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    }
  }

  return result;
}

// -------------------------------------------------------------
// Color Math Helpers
// -------------------------------------------------------------
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

export function normalizeHexColor(hex: string, fallback = "#6366f1"): string {
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
  return yiq >= 140 ? "#0f172a" : "#ffffff";
}
