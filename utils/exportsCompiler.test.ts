import { describe, it, expect } from "vitest";
import { formatFileSize, formatColorValue } from "./exportsCompiler";

describe("formatFileSize", () => {
  describe("Bytes formatting (< 1024 B)", () => {
    it("formats 0 bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("formats small byte counts correctly", () => {
      expect(formatFileSize(1)).toBe("1 B");
      expect(formatFileSize(512)).toBe("512 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });
  });

  describe("Kilobytes formatting (1024 B to < 1 MB)", () => {
    it("formats exact 1 KB boundary (1024 bytes)", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
    });

    it("formats fractional KB sizes", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(2048)).toBe("2.0 KB");
    });

    it("formats upper boundary of KB range (1048575 bytes)", () => {
      expect(formatFileSize(1024 * 1024 - 1)).toBe("1024.0 KB");
    });
  });

  describe("Megabytes formatting (>= 1 MB)", () => {
    it("formats exact 1 MB boundary (1048576 bytes)", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
    });

    it("formats fractional MB sizes", () => {
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.50 MB");
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.50 MB");
      expect(formatFileSize(10 * 1024 * 1024)).toBe("10.00 MB");
    });
  });
});

describe("formatColorValue", () => {
  it("returns original value when colorSpace is as-authored", () => {
    expect(formatColorValue("#ff0000", "as-authored")).toBe("#ff0000");
  });

  it("returns original value for non-color strings or non-hex/rgb values", () => {
    expect(formatColorValue("var(--my-var)", "hex")).toBe("var(--my-var)");
    expect(formatColorValue("", "hex")).toBe("");
  });
});
