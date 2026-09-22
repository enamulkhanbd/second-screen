import { describe, it, expect } from "vitest";
import { computeLineDiff } from "../tokenDiff";

describe("computeLineDiff", () => {
  it("returns empty array for empty inputs", () => {
    const result = computeLineDiff("", "");
    expect(result).toEqual([]);
  });

  it("handles empty old string (all additions)", () => {
    const newStr = "line1\nline2";
    const result = computeLineDiff("", newStr);

    expect(result).toEqual([
      { type: "added", content: "line1", newLineNumber: 1 },
      { type: "added", content: "line2", newLineNumber: 2 },
    ]);
  });

  it("handles empty new string (all removals)", () => {
    const oldStr = "line1\nline2";
    const result = computeLineDiff(oldStr, "");

    expect(result).toEqual([
      { type: "removed", content: "line1", oldLineNumber: 1 },
      { type: "removed", content: "line2", oldLineNumber: 2 },
    ]);
  });

  it("returns unchanged chunks when strings are identical", () => {
    const text = "a\nb\nc";
    const result = computeLineDiff(text, text);

    expect(result).toEqual([
      { type: "unchanged", content: "a", oldLineNumber: 1, newLineNumber: 1 },
      { type: "unchanged", content: "b", oldLineNumber: 2, newLineNumber: 2 },
      { type: "unchanged", content: "c", oldLineNumber: 3, newLineNumber: 3 },
    ]);
  });

  it("detects single line substitution", () => {
    const oldStr = "a\nb\nc";
    const newStr = "a\nx\nc";
    const result = computeLineDiff(oldStr, newStr);

    expect(result).toEqual([
      { type: "unchanged", content: "a", oldLineNumber: 1, newLineNumber: 1 },
      { type: "removed", content: "b", oldLineNumber: 2 },
      { type: "added", content: "x", newLineNumber: 2 },
      { type: "unchanged", content: "c", oldLineNumber: 3, newLineNumber: 3 },
    ]);
  });

  it("detects line insertion", () => {
    const oldStr = "line1\nline3";
    const newStr = "line1\nline2\nline3";
    const result = computeLineDiff(oldStr, newStr);

    expect(result).toEqual([
      { type: "unchanged", content: "line1", oldLineNumber: 1, newLineNumber: 1 },
      { type: "added", content: "line2", newLineNumber: 2 },
      { type: "unchanged", content: "line3", oldLineNumber: 2, newLineNumber: 3 },
    ]);
  });

  it("detects line deletion", () => {
    const oldStr = "line1\nline2\nline3";
    const newStr = "line1\nline3";
    const result = computeLineDiff(oldStr, newStr);

    expect(result).toEqual([
      { type: "unchanged", content: "line1", oldLineNumber: 1, newLineNumber: 1 },
      { type: "removed", content: "line2", oldLineNumber: 2 },
      { type: "unchanged", content: "line3", oldLineNumber: 3, newLineNumber: 2 },
    ]);
  });

  it("handles complex multiline diffs with LCS lookahead", () => {
    const oldStr = "alpha\nbeta\ngamma\ndelta";
    const newStr = "alpha\nbeta-modified\ngamma\nepsilon\ndelta";
    const result = computeLineDiff(oldStr, newStr);

    expect(result).toEqual([
      { type: "unchanged", content: "alpha", oldLineNumber: 1, newLineNumber: 1 },
      { type: "removed", content: "beta", oldLineNumber: 2 },
      { type: "added", content: "beta-modified", newLineNumber: 2 },
      { type: "unchanged", content: "gamma", oldLineNumber: 3, newLineNumber: 3 },
      { type: "added", content: "epsilon", newLineNumber: 4 },
      { type: "unchanged", content: "delta", oldLineNumber: 4, newLineNumber: 5 },
    ]);
  });
});
