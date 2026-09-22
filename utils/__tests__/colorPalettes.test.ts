import { describe, it, expect } from "vitest";
import { hexToRgb } from "../colorPalettes";

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
