import { describe, it, expect } from "vitest";
import { getContrastTextColor } from "../colorPalettes";

describe("getContrastTextColor", () => {
  it("returns dark text (#0f172a) for light background colors", () => {
    expect(getContrastTextColor("#ffffff")).toBe("#0f172a");
    expect(getContrastTextColor("#fef9c3")).toBe("#0f172a");
    expect(getContrastTextColor("#e0e7ff")).toBe("#0f172a");
  });

  it("returns light text (#ffffff) for dark background colors", () => {
    expect(getContrastTextColor("#000000")).toBe("#ffffff");
    expect(getContrastTextColor("#1e1b4b")).toBe("#ffffff");
    expect(getContrastTextColor("#0f172a")).toBe("#ffffff");
  });

  it("handles 3-digit shorthand hex codes correctly", () => {
    expect(getContrastTextColor("#fff")).toBe("#0f172a");
    expect(getContrastTextColor("#000")).toBe("#ffffff");
    expect(getContrastTextColor("#f00")).toBe("#ffffff"); // Red (r=255, g=0, b=0 -> YIQ = 76.245 < 140)
  });

  it("handles whitespace and uppercase hex strings", () => {
    expect(getContrastTextColor("  #FFFFFF  ")).toBe("#0f172a");
    expect(getContrastTextColor(" #000000 ")).toBe("#ffffff");
    expect(getContrastTextColor("FFF")).toBe("#0f172a");
  });

  it("returns light text (#ffffff) as fallback for invalid hex strings", () => {
    expect(getContrastTextColor("")).toBe("#ffffff");
    expect(getContrastTextColor("invalid")).toBe("#ffffff");
    expect(getContrastTextColor("#1234")).toBe("#ffffff");
    expect(getContrastTextColor("#xyz")).toBe("#ffffff");
  });

  it("evaluates YIQ threshold boundaries accurately (YIQ >= 140 -> #0f172a, YIQ < 140 -> #ffffff)", () => {
    // RGB (140, 140, 140) -> YIQ = 140.0 -> >= 140 -> #0f172a
    expect(getContrastTextColor("#8c8c8c")).toBe("#0f172a");

    // RGB (139, 139, 139) -> YIQ = 139.0 -> < 140 -> #ffffff
    expect(getContrastTextColor("#8b8b8b")).toBe("#ffffff");
  });
});
