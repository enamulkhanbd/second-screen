import { describe, it, expect } from "vitest";
import { generatePairingCode } from "./generatePairingCode";

describe("generatePairingCode", () => {
  it("should generate pairing code in correct XXXX-XXXX format", () => {
    const code = generatePairingCode();
    expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  });

  it("should only contain allowed character set", () => {
    const allowedChars = new Set("23456789ABCDEFGHJKLMNPQRSTUVWXYZ-".split(""));
    for (let i = 0; i < 50; i++) {
      const code = generatePairingCode();
      for (const char of code) {
        expect(allowedChars.has(char)).toBe(true);
      }
    }
  });

  it("should generate unique codes across multiple calls", () => {
    const codes = new Set<string>();
    const count = 500;
    for (let i = 0; i < count; i++) {
      codes.add(generatePairingCode());
    }
    expect(codes.size).toBe(count);
  });
});
