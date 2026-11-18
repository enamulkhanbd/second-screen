import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  buildThemeMatrixAsync,
  buildZipAsync,
  computeTokensDiffAsync,
  resolveTokensAsync,
} from "../tokenEngine";
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

  it("computes semantic token diffs asynchronously", async () => {
    const oldDoc: RawTokensDocument = {
      core: { primary: { $value: "#111111", $type: "color" } },
    };
    const newDoc: RawTokensDocument = {
      core: {
        primary: { $value: "#2563eb", $type: "color" },
        spacing: { $value: "8px", $type: "spacing" },
      },
    };
    const diff = await computeTokensDiffAsync(oldDoc, newDoc);
    expect(diff.hasChanges).toBe(true);
    expect(diff.totalAdded).toBe(1);
    expect(diff.totalModified).toBe(1);
    expect(diff.totalDeleted).toBe(0);
  });

  it("builds a valid ZIP archive asynchronously", async () => {
    const bytes = await buildZipAsync([
      { path: "tokens/colors.css", content: ":root { --primary: #2563eb; }\n" },
    ]);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(30);
    // PKZIP Local File Header signature: 0x50 0x4B 0x03 0x04
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("loads compiled public/wasm/token_engine_bg.wasm and runs all 5 Rust-WASM exports", async () => {
    const wasmBinaryPath = path.resolve(process.cwd(), "public/wasm/token_engine_bg.wasm");
    const wasmJsPath = path.resolve(process.cwd(), "public/wasm/token_engine.js");
    expect(fs.existsSync(wasmBinaryPath)).toBe(true);
    expect(fs.existsSync(wasmJsPath)).toBe(true);

    const wasmBytes = fs.readFileSync(wasmBinaryPath);
    const wasmMod = await import(/* @vite-ignore */ wasmJsPath);
    wasmMod.initSync({ module: wasmBytes });

    const flattened = JSON.parse(
      wasmMod.flatten_and_resolve_tokens_json(
        JSON.stringify({
          core: { brand: { $value: "#2563eb", $type: "color" } },
          semantic: { cta: { $value: "{brand}", $type: "color" } },
        }),
        null,
        null
      )
    );
    expect(flattened.find((t: any) => t.name === "cta")?.resolvedValue).toBe("#2563eb");

    const modOut = JSON.parse(
      wasmMod.apply_color_modifier_json(
        "#2563eb",
        JSON.stringify({ type: "alpha", value: "0.5", format: "rgba" }),
        null
      )
    );
    expect(modOut.resolvedValue).toBe("rgba(37, 99, 235, 0.5)");

    const matrixRows = JSON.parse(
      wasmMod.build_theme_matrix_json(
        JSON.stringify({
          light: { bg: { $value: "#ffffff", $type: "color" } },
          dark: { bg: { $value: "#000000", $type: "color" } },
        }),
        JSON.stringify({
          id: "mode",
          name: "Mode",
          options: [
            { id: "l", name: "Light", selectedTokenSets: { light: "enabled" } },
            { id: "d", name: "Dark", selectedTokenSets: { dark: "enabled" } },
          ],
        }),
        null,
        null
      )
    );
    expect(matrixRows[0].cells.Light.resolvedValue).toBe("#ffffff");

    const diff = JSON.parse(
      wasmMod.compute_tokens_diff_json(
        JSON.stringify({ core: { a: { $value: "1px", $type: "spacing" } } }),
        JSON.stringify({ core: { a: { $value: "2px", $type: "spacing" } } }),
        null
      )
    );
    expect(diff.totalModified).toBe(1);

    const zipBytes = wasmMod.build_zip_archive(
      JSON.stringify([{ path: "tokens.css", content: ":root{}" }])
    );
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
  });
});
