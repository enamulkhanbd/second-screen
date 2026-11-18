import { flattenAndResolveTokens, sortFlattenedTokens } from "@/utils/transformTokens";
import { buildThemeMatrix } from "@/utils/themeHelpers";
import { computeTokensDiff } from "@/utils/tokenDiff";
import type {
  FlattenedToken,
  RawTokensDocument,
  ThemeGroup,
  ThemeResolutionConfig,
} from "@/types/tokens";

export interface ZipWorkerFile {
  path: string;
  content: string;
}

export type TokenWorkerRequest =
  | {
      id: number;
      type: "resolveTokens";
      payload: {
        rawDoc: RawTokensDocument;
        selectedSet?: string;
        themeConfig?: ThemeResolutionConfig;
        options?: { sort?: boolean };
      };
    }
  | {
      id: number;
      type: "buildThemeMatrix";
      payload: {
        rawDoc: RawTokensDocument;
        group: ThemeGroup;
        activeThemeOptionIds?: Record<string, string>;
        allThemeGroups?: ThemeGroup[];
      };
    }
  | {
      id: number;
      type: "computeTokensDiff";
      payload: {
        originalDoc: RawTokensDocument;
        updatedDoc: RawTokensDocument;
        syncMetaFiles?: Record<string, string>;
      };
    }
  | {
      id: number;
      type: "buildZip";
      payload: {
        files: ZipWorkerFile[];
      };
    };

export type TokenWorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

interface WasmTokenEngineModule {
  default: (input?: string | URL) => Promise<unknown>;
  flatten_and_resolve_tokens_json: (
    rawDocJson: string,
    selectedSet?: string | null,
    themeConfigJson?: string | null
  ) => string;
  build_theme_matrix_json: (
    rawDocJson: string,
    groupJson: string,
    activeOptionIdsJson?: string | null,
    allGroupsJson?: string | null
  ) => string;
  compute_tokens_diff_json: (
    originalDocJson: string,
    updatedDocJson: string,
    syncMetaFilesJson?: string | null
  ) => string;
  build_zip_archive: (filesJson: string) => Uint8Array;
}

let wasmModulePromise: Promise<WasmTokenEngineModule | null> | null = null;

function getWasmEngine(): Promise<WasmTokenEngineModule | null> {
  if (wasmModulePromise) return wasmModulePromise;
  if (typeof self === "undefined" || !self.location?.origin) {
    wasmModulePromise = Promise.resolve(null);
    return wasmModulePromise;
  }

  wasmModulePromise = (async () => {
    try {
      const origin = self.location.origin;
      const jsUrl = new URL("/wasm/token_engine.js", origin).href;
      const wasmUrl = new URL("/wasm/token_engine_bg.wasm", origin).href;
      const mod = (await import(/* webpackIgnore: true */ jsUrl)) as WasmTokenEngineModule;
      await mod.default(wasmUrl);
      return mod;
    } catch {
      return null;
    }
  })();

  return wasmModulePromise;
}

function hasJsOnlyFormulaSyntax(rawJson: string): boolean {
  return /\b(ts_lighten|ts_darken|ts_mix|roundTo|Math\.)\b/i.test(rawJson);
}

function postWorkerResponse(msg: TokenWorkerResponse, transfer?: Transferable[]): void {
  const workerScope = self as unknown as {
    postMessage: (message: TokenWorkerResponse, transfer?: Transferable[]) => void;
  };
  if (transfer && transfer.length > 0) {
    workerScope.postMessage(msg, transfer);
  } else {
    workerScope.postMessage(msg);
  }
}

self.addEventListener("message", async (event: MessageEvent<TokenWorkerRequest>) => {
  const msg = event.data;
  if (!msg || typeof msg.id !== "number") return;

  try {
    const wasm = await getWasmEngine();

    if (msg.type === "resolveTokens") {
      const { rawDoc, selectedSet, themeConfig, options } = msg.payload;
      if (wasm) {
        try {
          const rawJson = JSON.stringify(rawDoc);
          if (!hasJsOnlyFormulaSyntax(rawJson)) {
            const themeConfigJson = themeConfig ? JSON.stringify(themeConfig) : null;
            const outJson = wasm.flatten_and_resolve_tokens_json(
              rawJson,
              selectedSet || null,
              themeConfigJson
            );
            const parsed = JSON.parse(outJson) as FlattenedToken[];
            // If any arithmetic / formula expression remained unresolved in WASM, fall back to TS seamlessly.
            const hasUnresolvedFormula = parsed.some(
              (t) => t.isAlias && typeof t.resolvedValue === "string" && /[+\-*/()]/.test(t.resolvedValue) && t.resolvedValue === t.rawValue
            );
            if (!hasUnresolvedFormula) {
              const finalResult = options?.sort === false
                ? parsed
                : sortFlattenedTokens(parsed, "resolved", "asc");
              self.postMessage({ id: msg.id, ok: true, result: finalResult } satisfies TokenWorkerResponse);
              return;
            }
          }
        } catch {
          // Fall back to TypeScript resolver below.
        }
      }

      const result = flattenAndResolveTokens(rawDoc, selectedSet, themeConfig, options);
      self.postMessage({ id: msg.id, ok: true, result } satisfies TokenWorkerResponse);
      return;
    }

    if (msg.type === "buildThemeMatrix") {
      const { rawDoc, group, activeThemeOptionIds, allThemeGroups } = msg.payload;
      if (wasm) {
        try {
          const rawJson = JSON.stringify(rawDoc);
          if (!hasJsOnlyFormulaSyntax(rawJson)) {
            const matrixJson = wasm.build_theme_matrix_json(
              rawJson,
              JSON.stringify(group),
              activeThemeOptionIds ? JSON.stringify(activeThemeOptionIds) : null,
              allThemeGroups ? JSON.stringify(allThemeGroups) : null
            );
            const result = JSON.parse(matrixJson);
            self.postMessage({ id: msg.id, ok: true, result } satisfies TokenWorkerResponse);
            return;
          }
        } catch {
          // Fall back to TypeScript matrix builder below.
        }
      }

      const result = buildThemeMatrix(rawDoc, group, activeThemeOptionIds, allThemeGroups);
      self.postMessage({ id: msg.id, ok: true, result } satisfies TokenWorkerResponse);
      return;
    }

    if (msg.type === "computeTokensDiff") {
      const { originalDoc, updatedDoc, syncMetaFiles } = msg.payload;
      if (wasm) {
        try {
          const diffJson = wasm.compute_tokens_diff_json(
            JSON.stringify(originalDoc || {}),
            JSON.stringify(updatedDoc || {}),
            syncMetaFiles ? JSON.stringify(syncMetaFiles) : null
          );
          const result = JSON.parse(diffJson);
          self.postMessage({ id: msg.id, ok: true, result } satisfies TokenWorkerResponse);
          return;
        } catch {
          // Fall back to TypeScript diff below.
        }
      }

      const result = computeTokensDiff(originalDoc, updatedDoc, syncMetaFiles);
      self.postMessage({ id: msg.id, ok: true, result } satisfies TokenWorkerResponse);
      return;
    }

    if (msg.type === "buildZip") {
      const { files } = msg.payload;
      if (wasm) {
        try {
          const bytes = wasm.build_zip_archive(JSON.stringify(files || []));
          const copy = new Uint8Array(bytes);
          postWorkerResponse(
            { id: msg.id, ok: true, result: copy },
            [copy.buffer]
          );
          return;
        } catch {
          // Fall back to JSZip below.
        }
      }

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const f of files || []) {
        zip.file(f.path, f.content);
      }
      const bytes = await zip.generateAsync({ type: "uint8array" });
      postWorkerResponse(
        { id: msg.id, ok: true, result: bytes },
        [bytes.buffer as ArrayBuffer]
      );
      return;
    }

    self.postMessage({
      id: (msg as { id: number }).id,
      ok: false,
      error: "Unknown worker message type",
    } satisfies TokenWorkerResponse);
  } catch (err: any) {
    self.postMessage({
      id: msg.id,
      ok: false,
      error: err?.message || "Worker computation failed",
    } satisfies TokenWorkerResponse);
  }
});
