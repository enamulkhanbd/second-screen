import { describe, expect, it } from "vitest";
import { buildThemeMatrixAsync, resolveTokensAsync } from "../tokenEngine";
import { extractThemeGroups } from "@/utils/themeHelpers";
import type { RawTokensDocument } from "@/types/tokens";

describe("lib/compute/tokenEngine async worker facade", () => {
  it("resolves nested aliases cleanly via fallback in non-worker environments", async () => {
    const doc: RawTokensDocument = {
      core: {
        brand: {
          primary: { $value: "#2563eb", $type: "color" },
        },
      },
      semantic: {
        buttonBg: { $value: "{brand.primary}", $type: "color" },
      },
    };

    const resolved = await resolveTokensAsync(doc, "ALL");
    const semanticBtn = resolved.find((t) => t.name === "buttonBg");
    expect(semanticBtn).toBeDefined();
    expect(semanticBtn?.resolvedValue).toBe("#2563eb");
    expect(semanticBtn?.isAlias).toBe(true);
  });

  it("computes theme matrix rows asynchronously", async () => {
    const doc: RawTokensDocument = {
      $themes: [
        { id: "light", name: "Light", group: "Mode", selectedTokenSets: { "theme/light": "enabled" } },
        { id: "dark", name: "Dark", group: "Mode", selectedTokenSets: { "theme/dark": "enabled" } },
      ],
      "theme/light": {
        bg: { $value: "#ffffff", $type: "color" },
      },
      "theme/dark": {
        bg: { $value: "#0f172a", $type: "color" },
      },
    };

    const groups = extractThemeGroups(doc);
    expect(groups.length).toBeGreaterThan(0);

    const rows = await buildThemeMatrixAsync(doc, groups[0], {}, groups);
    expect(rows.length).toBe(1);
    expect(rows[0].tokenKey).toBe("bg");
    expect(rows[0].cells.Light?.resolvedValue).toBe("#ffffff");
    expect(rows[0].cells.Dark?.resolvedValue).toBe("#0f172a");
  });
});
