/**
 * WCAG 2.1 Color Contrast and Accessibility Utilities
 */

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface WcagCompliance {
  ratio: number;
  formattedRatio: string;
  aaNormal: boolean; // >= 4.5:1
  aaLarge: boolean; // >= 3.0:1
  aaaNormal: boolean; // >= 7.0:1
  aaaLarge: boolean; // >= 4.5:1
  uiComponent: boolean; // >= 3.0:1
  scoreLabel: "FAIL" | "AA Large" | "AA" | "AAA";
  statusColor: string; // Tailwind class
}

/**
 * Parses any color string (hex3, hex6, hex8, rgb, rgba, hsl, hsla) to RGB {0-255}
 */
export function parseColorToRgb(colorStr: string): ColorRGB | null {
  if (!colorStr || typeof colorStr !== "string") return null;
  const s = colorStr.trim().toLowerCase();

  // Hex format: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: parseInt(hex[3] + hex[3], 16) / 255,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // RGB/RGBA format: rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = s.match(/^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (rgbMatch) {
    return {
      r: Math.min(255, Math.max(0, parseFloat(rgbMatch[1]))),
      g: Math.min(255, Math.max(0, parseFloat(rgbMatch[2]))),
      b: Math.min(255, Math.max(0, parseFloat(rgbMatch[3]))),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // Named CSS Colors (common fallback set)
  const NAMED_COLORS: Record<string, ColorRGB> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    transparent: { r: 0, g: 0, b: 0, a: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 },
  };

  if (NAMED_COLORS[s]) {
    return NAMED_COLORS[s];
  }

  return null;
}

/**
 * Converts RGB color to Hex string format
 */
export function rgbToHex({ r, g, b }: ColorRGB): string {
  const toHex = (n: number) => {
    const clamped = Math.min(255, Math.max(0, Math.round(n)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB color.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export function calculateRelativeLuminance(rgb: ColorRGB): number {
  const transformChannel = (val: number) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const r = transformChannel(rgb.r);
  const g = transformChannel(rgb.g);
  const b = transformChannel(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates the WCAG 2.1 contrast ratio between two colors (1:1 to 21:1).
 */
export function calculateContrastRatio(fgColor: string, bgColor: string): WcagCompliance | null {
  const fgRgb = parseColorToRgb(fgColor);
  const bgRgb = parseColorToRgb(bgColor);

  if (!fgRgb || !bgRgb) return null;

  const l1 = calculateRelativeLuminance(fgRgb);
  const l2 = calculateRelativeLuminance(bgRgb);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  const roundedRatio = Math.round(ratio * 100) / 100;
  const formattedRatio = `${roundedRatio.toFixed(2)}:1`;

  const aaNormal = roundedRatio >= 4.5;
  const aaLarge = roundedRatio >= 3.0;
  const aaaNormal = roundedRatio >= 7.0;
  const aaaLarge = roundedRatio >= 4.5;
  const uiComponent = roundedRatio >= 3.0;

  let scoreLabel: WcagCompliance["scoreLabel"] = "FAIL";
  let statusColor = "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60";

  if (aaaNormal) {
    scoreLabel = "AAA";
    statusColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60";
  } else if (aaNormal) {
    scoreLabel = "AA";
    statusColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60";
  } else if (aaLarge) {
    scoreLabel = "AA Large";
    statusColor = "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60";
  }

  return {
    ratio: roundedRatio,
    formattedRatio,
    aaNormal,
    aaLarge,
    aaaNormal,
    aaaLarge,
    uiComponent,
    scoreLabel,
    statusColor,
  };
}

/**
 * Color Vision Deficiency (CVD) Simulation
 * Transforms an RGB color into Protanopia, Deuteranopia, Tritanopia, or Achromatopsia simulation.
 */
export type CvdType = "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

export function simulateColorVisionDeficiency(colorStr: string, type: CvdType): string {
  const rgb = parseColorToRgb(colorStr);
  if (!rgb) return colorStr;

  const { r, g, b } = rgb;

  if (type === "protanopia") {
    // Red-blind simulation matrix
    const nr = 0.56667 * r + 0.43333 * g + 0.0 * b;
    const ng = 0.55833 * r + 0.44167 * g + 0.0 * b;
    const nb = 0.0 * r + 0.24167 * g + 0.75833 * b;
    return rgbToHex({ r: nr, g: ng, b: nb });
  }

  if (type === "deuteranopia") {
    // Green-blind simulation matrix
    const nr = 0.625 * r + 0.375 * g + 0.0 * b;
    const ng = 0.7 * r + 0.3 * g + 0.0 * b;
    const nb = 0.0 * r + 0.3 * g + 0.7 * b;
    return rgbToHex({ r: nr, g: ng, b: nb });
  }

  if (type === "tritanopia") {
    // Blue-blind simulation matrix
    const nr = 0.95 * r + 0.05 * g + 0.0 * b;
    const ng = 0.0 * r + 0.43333 * g + 0.56667 * b;
    const nb = 0.0 * r + 0.475 * g + 0.525 * b;
    return rgbToHex({ r: nr, g: ng, b: nb });
  }

  if (type === "achromatopsia") {
    // Monochromacy (luminance)
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    return rgbToHex({ r: lum, g: lum, b: lum });
  }

  return colorStr;
}
