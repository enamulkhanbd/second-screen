import { describe, expect, it } from "vitest";
import {
  compareResolvedValues,
  compareTokens,
  setTokenAtKeyPath,
  createTokenAtKeyPath,
  deleteTokenAtKeyPath,
  resolveTokenAlias,
  evaluateTokenMath,
  flattenAndResolveTokens,
  buildTokenLookupIndex,
} from "../transformTokens";
import { RawTokensDocument } from "@/types/tokens";

describe("color token sorting", () => {
  const colors = ["#ff0000", "#00ff00", "#0000ff"];

  it("sorts colors by perceptual lightness in both directions", () => {
    const ascending = [...colors].sort((left, right) =>
      compareResolvedValues(left, right, "asc")
    );
    const descending = [...colors].sort((left, right) =>
      compareResolvedValues(left, right, "desc")
    );

    expect(ascending).toEqual(["#00ff00", "#ff0000", "#0000ff"]);
    expect(descending).toEqual([...ascending].reverse());
  });

  it("uses token names to break ties between identical color values", () => {
    const tokens = [
      { name: "color.secondary", resolvedValue: "#808080" },
      { name: "color.primary", resolvedValue: "#808080" },
    ];

    expect(tokens.sort((left, right) => compareTokens(left, right))).toEqual([
      { name: "color.primary", resolvedValue: "#808080" },
      { name: "color.secondary", resolvedValue: "#808080" },
    ]);
  });
});

describe("structural sharing token mutations", () => {
  const originalDoc: RawTokensDocument = {
    core: {
      color: {
        primary: { value: "#1e40af", type: "color" },
        secondary: { value: "#3b82f6", type: "color" },
      },
    },
    semantic: {
      action: {
        bg: { value: "{core.color.primary}", type: "color" },
      },
    },
  };

  it("preserves object references of unaffected sets (structural sharing)", () => {
    const updated = setTokenAtKeyPath(originalDoc, ["core", "color", "primary"], "#2563eb");

    expect(updated.core).not.toBe(originalDoc.core);
    expect(updated.core.color.primary.value).toBe("#2563eb");
    expect(originalDoc.core.color.primary.value).toBe("#1e40af"); // Immutable
    expect(updated.semantic).toBe(originalDoc.semantic); // Re-used!
  });

  it("creates tokens with copy-on-write structural sharing", () => {
    const updated = createTokenAtKeyPath(
      originalDoc,
      ["core", "color", "accent"],
      { value: "#f59e0b", type: "color" }
    );

    expect(updated.core.color.accent.value).toBe("#f59e0b");
    expect(updated.semantic).toBe(originalDoc.semantic);
  });

  it("deletes tokens while keeping untouched sets identical by reference", () => {
    const updated = deleteTokenAtKeyPath(originalDoc, ["core", "color", "secondary"]);

    expect(updated.core.color.secondary).toBeUndefined();
    expect(updated.core.color.primary).toBeDefined();
    expect(updated.semantic).toBe(originalDoc.semantic);
  });
});

describe("token alias & arithmetic resolution", () => {
  const doc: RawTokensDocument = {
    core: {
      color: {
        blue500: { value: "#3b82f6", type: "color" },
        brand: { value: "{core.color.blue500}", type: "color" },
        loopA: { value: "{core.color.loopB}", type: "color" },
        loopB: { value: "{core.color.loopA}", type: "color" },
      },
      spacing: {
        base: { value: "8px", type: "spacing" },
        double: { value: "{core.spacing.base} * 2", type: "spacing" },
      },
    },
  };

  it("resolves multi-hop aliases correctly", () => {
    const resolved = resolveTokenAlias("{core.color.brand}", doc);
    expect(resolved).toBe("#3b82f6");
  });

  it("handles circular references gracefully without crashing or infinite loops", () => {
    const resolved = resolveTokenAlias("{core.color.loopA}", doc);
    expect(resolved).toBeDefined();
  });

  it("evaluates mathematical token expressions safely", () => {
    const mathResult = evaluateTokenMath("16 * 1.5");
    expect(mathResult).toBe("24");

    const pxResult = evaluateTokenMath("8px * 2");
    expect(pxResult).toBe("16px");

    const roundResult = evaluateTokenMath("roundTo(14.75, 4)");
    expect(roundResult).toBe("16");
  });

  it("indexes and flattens tokens into sorted table structures", () => {
    const flattened = flattenAndResolveTokens(doc);
    expect(flattened.length).toBeGreaterThan(0);
    const brandToken = flattened.find((t) => t.name === "color.brand");
    expect(brandToken?.resolvedValue).toBe("#3b82f6");
  });

  it("reuses cached token lookup index across calls", () => {
    const index1 = buildTokenLookupIndex(doc);
    const index2 = buildTokenLookupIndex(doc);
    expect(index1).toBe(index2); // Cached reference
  });
});
