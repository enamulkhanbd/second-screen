import { describe, expect, it } from "vitest";
import { compareResolvedValues, compareTokens } from "../transformTokens";

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