import { flattenAndResolveTokens } from "@/utils/transformTokens";
import { buildThemeMatrix } from "@/utils/themeHelpers";
import type {
  RawTokensDocument,
  ThemeGroup,
  ThemeResolutionConfig,
} from "@/types/tokens";

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
    };

export type TokenWorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

self.addEventListener("message", (event: MessageEvent<TokenWorkerRequest>) => {
  const msg = event.data;
  if (!msg || typeof msg.id !== "number") return;

  try {
    if (msg.type === "resolveTokens") {
      const { rawDoc, selectedSet, themeConfig, options } = msg.payload;
      const result = flattenAndResolveTokens(rawDoc, selectedSet, themeConfig, options);
      self.postMessage({ id: msg.id, ok: true, result } satisfies TokenWorkerResponse);
      return;
    }

    if (msg.type === "buildThemeMatrix") {
      const { rawDoc, group, activeThemeOptionIds, allThemeGroups } = msg.payload;
      const result = buildThemeMatrix(rawDoc, group, activeThemeOptionIds, allThemeGroups);
      self.postMessage({ id: msg.id, ok: true, result } satisfies TokenWorkerResponse);
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
