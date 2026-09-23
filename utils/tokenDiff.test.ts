import { describe, it, expect } from "vitest";
import {
  computeTokensDiff,
  computeLineDiff,
  computeSideBySideDiff,
  parseUnifiedPatchToSideBySide,
} from "./tokenDiff";
import { RawTokensDocument } from "@/types/tokens";

describe("utils/tokenDiff", () => {
  describe("computeTokensDiff", () => {
    it("returns hasChanges: false when documents are identical", () => {
      const doc: RawTokensDocument = {
        global: {
          colors: {
            primary: { value: "#000000", type: "color" },
          },
        },
      };

      const result = computeTokensDiff(doc, doc);

      expect(result.hasChanges).toBe(false);
      expect(result.files).toHaveLength(0);
      expect(result.totalAdded).toBe(0);
      expect(result.totalModified).toBe(0);
      expect(result.totalDeleted).toBe(0);
    });

    it("handles undefined or empty documents gracefully", () => {
      const result1 = computeTokensDiff(
        undefined as unknown as RawTokensDocument,
        undefined as unknown as RawTokensDocument
      );
      expect(result1.hasChanges).toBe(false);
      expect(result1.files).toHaveLength(0);

      const result2 = computeTokensDiff({}, {});
      expect(result2.hasChanges).toBe(false);
      expect(result2.files).toHaveLength(0);
    });

    it("detects added token sets", () => {
      const originalDoc: RawTokensDocument = {};
      const updatedDoc: RawTokensDocument = {
        brand: {
          color: {
            primary: { value: "#FF0000", type: "color" },
          },
        },
      };

      const result = computeTokensDiff(originalDoc, updatedDoc);

      expect(result.hasChanges).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].setName).toBe("brand");
      expect(result.files[0].fileName).toBe("brand.json");
      expect(result.files[0].changeType).toBe("added");
      expect(result.files[0].addedCount).toBe(1);
      expect(result.totalAdded).toBe(1);

      const token = result.files[0].tokens[0];
      expect(token).toEqual({
        key: "color.primary",
        name: "color.primary",
        setName: "brand",
        type: "color",
        changeType: "added",
        newValue: "#FF0000",
        newDescription: undefined,
      });
    });

    it("detects deleted token sets", () => {
      const originalDoc: RawTokensDocument = {
        brand: {
          color: {
            primary: { value: "#FF0000", type: "color" },
          },
        },
      };
      const updatedDoc: RawTokensDocument = {};

      const result = computeTokensDiff(originalDoc, updatedDoc);

      expect(result.hasChanges).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].setName).toBe("brand");
      expect(result.files[0].changeType).toBe("deleted");
      expect(result.files[0].deletedCount).toBe(1);
      expect(result.totalDeleted).toBe(1);

      const token = result.files[0].tokens[0];
      expect(token).toEqual({
        key: "color.primary",
        name: "color.primary",
        setName: "brand",
        type: "color",
        changeType: "deleted",
        oldValue: "#FF0000",
        oldDescription: undefined,
      });
    });

    it("detects added, modified, and deleted tokens within a set", () => {
      const originalDoc: RawTokensDocument = {
        global: {
          color: {
            primary: { value: "#000000", type: "color", description: "Primary black" },
            secondary: { value: "#111111", type: "color" },
          },
        },
      };

      const updatedDoc: RawTokensDocument = {
        global: {
          color: {
            primary: { value: "#0000ff", type: "color", description: "Primary blue" },
            tertiary: { value: "#222222", type: "color" },
          },
        },
      };

      const result = computeTokensDiff(originalDoc, updatedDoc);

      expect(result.hasChanges).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].changeType).toBe("modified");
      expect(result.files[0].addedCount).toBe(1);
      expect(result.files[0].modifiedCount).toBe(1);
      expect(result.files[0].deletedCount).toBe(1);

      expect(result.totalAdded).toBe(1);
      expect(result.totalModified).toBe(1);
      expect(result.totalDeleted).toBe(1);

      const tokens = result.files[0].tokens;

      const modifiedToken = tokens.find((t) => t.key === "color.primary");
      expect(modifiedToken).toEqual({
        key: "color.primary",
        name: "color.primary",
        setName: "global",
        type: "color",
        changeType: "modified",
        oldValue: "#000000",
        newValue: "#0000ff",
        oldDescription: "Primary black",
        newDescription: "Primary blue",
      });

      const deletedToken = tokens.find((t) => t.key === "color.secondary");
      expect(deletedToken).toEqual({
        key: "color.secondary",
        name: "color.secondary",
        setName: "global",
        type: "color",
        changeType: "deleted",
        oldValue: "#111111",
        oldDescription: undefined,
      });

      const addedToken = tokens.find((t) => t.key === "color.tertiary");
      expect(addedToken).toEqual({
        key: "color.tertiary",
        name: "color.tertiary",
        setName: "global",
        type: "color",
        changeType: "added",
        newValue: "#222222",
        newDescription: undefined,
      });
    });

    it("supports DTCG token format ($value, $type, $description)", () => {
      const originalDoc: RawTokensDocument = {
        theme: {
          spacing: {
            sm: { $value: "4px", $type: "dimension", $description: "Small padding" },
          },
        },
      };

      const updatedDoc: RawTokensDocument = {
        theme: {
          spacing: {
            sm: { $value: "8px", $type: "dimension", $description: "Small padding updated" },
          },
        },
      };

      const result = computeTokensDiff(originalDoc, updatedDoc);

      expect(result.hasChanges).toBe(true);
      expect(result.files[0].tokens[0]).toEqual({
        key: "spacing.sm",
        name: "spacing.sm",
        setName: "theme",
        type: "dimension",
        changeType: "modified",
        oldValue: "4px",
        newValue: "8px",
        oldDescription: "Small padding",
        newDescription: "Small padding updated",
      });
    });

    it("ignores metadata keys starting with $ at top level of set objects", () => {
      const originalDoc: RawTokensDocument = {
        global: {
          $name: "Global Set",
          color: {
            base: { value: "#ffffff", type: "color" },
          },
        },
      };

      const updatedDoc: RawTokensDocument = {
        global: {
          $name: "Global Set Modified Name",
          color: {
            base: { value: "#ffffff", type: "color" },
          },
        },
      };

      const result = computeTokensDiff(originalDoc, updatedDoc);

      // JSON string of the set changed due to $name, but token diff will show no token changes
      expect(result.files[0].tokens).toHaveLength(0);
      expect(result.files[0].modifiedCount).toBe(0);
    });

    it("uses syncMetaFiles mapping if provided", () => {
      const originalDoc: RawTokensDocument = {
        core: {
          token: { value: "1", type: "number" },
        },
      };
      const updatedDoc: RawTokensDocument = {
        core: {
          token: { value: "2", type: "number" },
        },
      };

      const syncMetaFiles = {
        core: "tokens/core-tokens.json",
      };

      const result = computeTokensDiff(originalDoc, updatedDoc, syncMetaFiles);

      expect(result.files[0].fileName).toBe("tokens/core-tokens.json");
    });

    it("detects type changes in tokens", () => {
      const originalDoc: RawTokensDocument = {
        theme: {
          size: { value: "16", type: "number" },
        },
      };
      const updatedDoc: RawTokensDocument = {
        theme: {
          size: { value: "16px", type: "dimension" },
        },
      };

      const result = computeTokensDiff(originalDoc, updatedDoc);

      expect(result.files[0].tokens[0]).toEqual({
        key: "size",
        name: "size",
        setName: "theme",
        type: "dimension",
        changeType: "modified",
        oldValue: "16",
        newValue: "16px",
        oldDescription: undefined,
        newDescription: undefined,
      });
    });
  });

  describe("computeLineDiff", () => {
    it("returns empty array for empty inputs", () => {
      const chunks = computeLineDiff("", "");
      expect(chunks).toEqual([]);
    });

    it("detects unchanged lines", () => {
      const text = "line1\nline2";
      const chunks = computeLineDiff(text, text);

      expect(chunks).toEqual([
        { type: "unchanged", content: "line1", oldLineNumber: 1, newLineNumber: 1 },
        { type: "unchanged", content: "line2", oldLineNumber: 2, newLineNumber: 2 },
      ]);
    });

    it("detects added and removed lines", () => {
      const oldText = "line1\nline2\nline3";
      const newText = "line1\nline2-modified\nline3\nline4";

      const chunks = computeLineDiff(oldText, newText);

      expect(chunks.some((c) => c.type === "added")).toBe(true);
      expect(chunks.some((c) => c.type === "removed")).toBe(true);
      expect(chunks.some((c) => c.type === "unchanged")).toBe(true);
    });
  });

  describe("computeSideBySideDiff", () => {
    it("returns empty array when no line diff exists", () => {
      const hunks = computeSideBySideDiff("", "");
      expect(hunks).toEqual([]);
    });

    it("returns context hunk when strings are identical", () => {
      const text = "a\nb\nc";
      const hunks = computeSideBySideDiff(text, text);

      expect(hunks).toHaveLength(1);
      expect(hunks[0].rows).toHaveLength(3);
      expect(hunks[0].rows[0].left?.type).toBe("context");
      expect(hunks[0].rows[0].right?.type).toBe("context");
    });

    it("generates side by side hunks for differences", () => {
      const oldStr = "line 1\nline 2\nline 3";
      const newStr = "line 1\nline 2 changed\nline 3";

      const hunks = computeSideBySideDiff(oldStr, newStr, 2);

      expect(hunks.length).toBeGreaterThan(0);
      expect(hunks[0].header).toContain("@@");
      expect(hunks[0].rows.some((r) => r.left?.type === "removed" || r.right?.type === "added")).toBe(true);
    });
  });

  describe("parseUnifiedPatchToSideBySide", () => {
    it("returns empty array for empty patch string", () => {
      expect(parseUnifiedPatchToSideBySide("")).toEqual([]);
      expect(parseUnifiedPatchToSideBySide("   ")).toEqual([]);
    });

    it("parses standard git patch string", () => {
      const patch = [
        "@@ -1,3 +1,3 @@",
        " line 1",
        "-line 2",
        "+line 2 modified",
        " line 3",
      ].join("\n");

      const hunks = parseUnifiedPatchToSideBySide(patch);

      expect(hunks).toHaveLength(1);
      expect(hunks[0].header).toBe("@@ -1,3 +1,3 @@");
      expect(hunks[0].rows).toHaveLength(3); // context, modified (removed+added in same row), context

      const modifiedRow = hunks[0].rows[1];
      expect(modifiedRow.left).toEqual({ lineNumber: 2, content: "line 2", type: "removed" });
      expect(modifiedRow.right).toEqual({ lineNumber: 2, content: "line 2 modified", type: "added" });
    });
  });
});
