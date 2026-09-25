import { describe, it, expect } from "vitest";
import { getContrastTextColor, hexToRgb, normalizeHexColor, COLOR_FAMILIES } from "../colorPalettes";

describe("getContrastTextColor", () => {
  it("returns dark text (#0a0a0a) for light background colors", () => {
    expect(getContrastTextColor("#ffffff")).toBe("#0a0a0a");
    expect(getContrastTextColor("#fef9c3")).toBe("#0a0a0a");
    expect(getContrastTextColor("#e0e7ff")).toBe("#0a0a0a");
  });

  it("returns light text (#ffffff) for dark background colors", () => {
    expect(getContrastTextColor("#000000")).toBe("#ffffff");
    expect(getContrastTextColor("#1e1b4b")).toBe("#ffffff");
    expect(getContrastTextColor("#0f172a")).toBe("#ffffff");
  });

  it("handles 3-digit shorthand hex codes correctly", () => {
    expect(getContrastTextColor("#fff")).toBe("#0a0a0a");
    expect(getContrastTextColor("#000")).toBe("#ffffff");
    expect(getContrastTextColor("#f00")).toBe("#ffffff"); // Red (r=255, g=0, b=0 -> YIQ = 76.245 < 140)
  });

  it("handles whitespace and uppercase hex strings", () => {
    expect(getContrastTextColor("  #FFFFFF  ")).toBe("#0a0a0a");
    expect(getContrastTextColor(" #000000 ")).toBe("#ffffff");
    expect(getContrastTextColor("FFF")).toBe("#0a0a0a");
  });

  it("returns light text (#ffffff) as fallback for invalid hex strings", () => {
    expect(getContrastTextColor("")).toBe("#ffffff");
    expect(getContrastTextColor("invalid")).toBe("#ffffff");
    expect(getContrastTextColor("#1234")).toBe("#ffffff");
    expect(getContrastTextColor("#xyz")).toBe("#ffffff");
  });

  it("evaluates YIQ threshold boundaries accurately (YIQ >= 140 -> #0a0a0a, YIQ < 140 -> #ffffff)", () => {
    // RGB (140, 140, 140) -> YIQ = 140.0 -> >= 140 -> #0a0a0a
    expect(getContrastTextColor("#8c8c8c")).toBe("#0a0a0a");

    // RGB (139, 139, 139) -> YIQ = 139.0 -> < 140 -> #ffffff
    expect(getContrastTextColor("#8b8b8b")).toBe("#ffffff");
  });
});

describe("hexToRgb", () => {
  describe("3-digit shorthand hex codes", () => {
    it("converts 3-digit hex code with leading hash (#)", () => {
      expect(hexToRgb("#f00")).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb("#0f0")).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb("#00f")).toEqual({ r: 0, g: 0, b: 255 });
    });

    it("converts 3-digit hex code without leading hash", () => {
      expect(hexToRgb("fff")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("000")).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb("abc")).toEqual({ r: 170, g: 187, b: 204 });
    });

    it("handles uppercase 3-digit hex codes", () => {
      expect(hexToRgb("#FFF")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("ABC")).toEqual({ r: 170, g: 187, b: 204 });
    });
  });

  describe("6-digit full hex codes", () => {
    it("converts 6-digit hex code with leading hash (#)", () => {
      expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb("#6366f1")).toEqual({ r: 99, g: 102, b: 241 });
    });

    it("converts 6-digit hex code without leading hash", () => {
      expect(hexToRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb("123456")).toEqual({ r: 18, g: 52, b: 86 });
    });

    it("handles uppercase 6-digit hex codes", () => {
      expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("000000")).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe("whitespace handling", () => {
    it("trims leading and trailing spaces", () => {
      expect(hexToRgb("  #ffffff  ")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("\t#f00\n")).toEqual({ r: 255, g: 0, b: 0 });
    });
  });

  describe("invalid hex codes", () => {
    it("returns null for non-hex characters", () => {
      expect(hexToRgb("#xyz")).toBeNull();
      expect(hexToRgb("ggg")).toBeNull();
      expect(hexToRgb("#12345z")).toBeNull();
    });

    it("returns null for invalid string lengths", () => {
      expect(hexToRgb("")).toBeNull();
      expect(hexToRgb("#f")).toBeNull();
      expect(hexToRgb("#ff")).toBeNull();
      expect(hexToRgb("#ffff")).toBeNull();
      expect(hexToRgb("#fffff")).toBeNull();
      expect(hexToRgb("#fffffff")).toBeNull();
    });

    it("returns null for strings with special characters or invalid formatting", () => {
      expect(hexToRgb("#12 345")).toBeNull();
      expect(hexToRgb("hello")).toBeNull();
    });
  });
});

describe("normalizeHexColor & Neutral Palette", () => {
  it("defaults to #171717 fallback for invalid colors", () => {
    expect(normalizeHexColor("invalid")).toBe("#171717");
    expect(normalizeHexColor("")).toBe("#171717");
  });

  it("normalizes 3-character hex to 6-character hex", () => {
    expect(normalizeHexColor("#fff")).toBe("#ffffff");
    expect(normalizeHexColor("171717")).toBe("#171717");
  });

  it("includes neutral family in COLOR_FAMILIES", () => {
    const neutral = COLOR_FAMILIES.find((f) => f.id === "neutral");
    expect(neutral).toBeDefined();
    expect(neutral?.baseHex).toBe("#171717");
    expect(neutral?.shades[900]).toBe("#171717");
    expect(neutral?.shades[50]).toBe("#fafafa");
  });
});
