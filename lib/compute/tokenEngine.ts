import { flattenAndResolveTokens } from "@/utils/transformTokens";
import { buildThemeMatrix, type MatrixRowData } from "@/utils/themeHelpers";
import { computeTokensDiff, type DocumentDiffSummary } from "@/utils/tokenDiff";
import type {
  FlattenedToken,
  RawTokensDocument,
  ThemeGroup,
  ThemeResolutionConfig,
} from "@/types/tokens";
import type {
  TokenWorkerRequest,
  TokenWorkerResponse,
  ZipWorkerFile,
} from "@/workers/tokenCompute.worker";

let workerInstance: Worker | null = null;
let workerFailed = false;
let nextRequestId = 1;

const pendingRequests = new Map<
  number,
  { resolve: (value: any) => void; reject: (reason?: any) => void }
>();

function getWorker(): Worker | null {
  if (workerFailed || typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (workerInstance) return workerInstance;

  try {
    workerInstance = new Worker(
      new URL("../../workers/tokenCompute.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerInstance.onmessage = (event: MessageEvent<TokenWorkerResponse>) => {
      const msg = event.data;
      if (!msg || typeof msg.id !== "number") return;
      const entry = pendingRequests.get(msg.id);
      if (!entry) return;
      pendingRequests.delete(msg.id);
      if (msg.ok) {
        entry.resolve(msg.result);
      } else {
        entry.reject(new Error(msg.error));
      }
    };
    workerInstance.onerror = () => {
      workerFailed = true;
      for (const [id, entry] of Array.from(pendingRequests.entries())) {
        pendingRequests.delete(id);
        entry.reject(new Error("Token compute worker failed"));
      }
      workerInstance?.terminate();
      workerInstance = null;
    };
    return workerInstance;
  } catch {
    workerFailed = true;
    return null;
  }
}

function runInWorker<T>(
  request: Omit<TokenWorkerRequest, "id">
): Promise<T> | null {
  const worker = getWorker();
  if (!worker) return null;

  const id = nextRequestId++;
  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    try {
      worker.postMessage({ ...request, id } as TokenWorkerRequest);
    } catch (err) {
      pendingRequests.delete(id);
      reject(err);
    }
  });
}

/**
 * Resolves and flattens tokens off the main browser thread when Web Workers are available,
 * falling back seamlessly to synchronous TS execution (or future WASM engine).
 */
export async function resolveTokensAsync(
  rawDoc: RawTokensDocument,
  selectedSet?: string,
  themeConfig?: ThemeResolutionConfig,
  options?: { sort?: boolean }
): Promise<FlattenedToken[]> {
  const workerPromise = runInWorker<FlattenedToken[]>({
    type: "resolveTokens",
    payload: { rawDoc, selectedSet, themeConfig, options },
  });
  if (workerPromise) {
    try {
      return await workerPromise;
    } catch {
      // Fallback to synchronous execution if worker fails
    }
  }
  return flattenAndResolveTokens(rawDoc, selectedSet, themeConfig, options);
}

/**
 * Computes multi-mode theme matrix rows off the main browser thread when available.
 */
export async function buildThemeMatrixAsync(
  rawDoc: RawTokensDocument,
  group: ThemeGroup,
  activeThemeOptionIds: Record<string, string> = {},
  allThemeGroups: ThemeGroup[] = []
): Promise<MatrixRowData[]> {
  const workerPromise = runInWorker<MatrixRowData[]>({
    type: "buildThemeMatrix",
    payload: { rawDoc, group, activeThemeOptionIds, allThemeGroups },
  });
  if (workerPromise) {
    try {
      return await workerPromise;
    } catch {
      // Fallback to synchronous execution if worker fails
    }
  }
  return buildThemeMatrix(rawDoc, group, activeThemeOptionIds, allThemeGroups);
}

/**
 * Computes semantic token and file line diffs asynchronously via Rust-WASM / Worker when available.
 */
export async function computeTokensDiffAsync(
  originalDoc: RawTokensDocument,
  updatedDoc: RawTokensDocument,
  syncMetaFiles?: Record<string, string>
): Promise<DocumentDiffSummary> {
  const workerPromise = runInWorker<DocumentDiffSummary>({
    type: "computeTokensDiff",
    payload: { originalDoc, updatedDoc, syncMetaFiles },
  });
  if (workerPromise) {
    try {
      return await workerPromise;
    } catch {
      // Fallback to synchronous TS diff if worker fails
    }
  }
  return computeTokensDiff(originalDoc, updatedDoc, syncMetaFiles);
}

/**
 * Builds a standard PKZIP archive off the main thread via Rust-WASM when available,
 * falling back to JSZip in non-worker environments.
 */
export async function buildZipAsync(files: ZipWorkerFile[]): Promise<Uint8Array> {
  const workerPromise = runInWorker<Uint8Array>({
    type: "buildZip",
    payload: { files },
  });
  if (workerPromise) {
    try {
      return await workerPromise;
    } catch {
      // Fallback to JSZip below
    }
  }
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const f of files || []) {
    zip.file(f.path, f.content);
  }
  return zip.generateAsync({ type: "uint8array" });
}

export function disposeTokenComputeWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  pendingRequests.clear();
}
