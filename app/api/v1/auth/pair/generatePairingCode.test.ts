import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePairingCode } from "./generatePairingCode";

describe("generatePairingCode", () => {
  it("should generate pairing code in correct XXXX-XXXX format", () => {
    const code = generatePairingCode();
    assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  });

  it("should only contain allowed character set", () => {
    const allowedChars = new Set("23456789ABCDEFGHJKLMNPQRSTUVWXYZ-".split(""));
    for (let i = 0; i < 50; i++) {
      const code = generatePairingCode();
      for (const char of code) {
        assert.equal(allowedChars.has(char), true);
      }
    }
  });

  it("should generate unique codes across multiple calls", () => {
    const codes = new Set<string>();
    const count = 500;
    for (let i = 0; i < count; i++) {
      codes.add(generatePairingCode());
    }
    assert.equal(codes.size, count);
  });
});
