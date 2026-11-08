import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/utils/auth";
import { ProjectAsset, FigmaSourceLink } from "@/types/tenant";
import { mapLimit } from "@/utils/pool";

export const dynamic = "force-dynamic";

const FIGMA_IMAGE_CONCURRENCY = 3;
const FIGMA_SVG_CONCURRENCY = 8;
const FIGMA_REQUEST_TIMEOUT_MS = 15_000;
const FIGMA_OVERALL_DEADLINE_MS = 50_000;
const FIGMA_MAX_COMPONENTS = 2_000;
const MAX_RETRY_AFTER_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createRequestSignal(overallSignal: AbortSignal, timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  const onOverallAbort = () => {
    controller.abort(overallSignal.reason || new DOMException("Overall deadline exceeded", "TimeoutError"));
  };

  if (overallSignal.aborted) {
    clearTimeout(timer);
    controller.abort(overallSignal.reason || new DOMException("Overall deadline exceeded", "TimeoutError"));
  } else {
    overallSignal.addEventListener("abort", onOverallAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      overallSignal.removeEventListener("abort", onOverallAbort);
    },
  };
}

async function fetchWithDeadlineAndRetry(
  url: string,
  init: RequestInit,
  overallSignal: AbortSignal,
  timeoutMs: number = FIGMA_REQUEST_TIMEOUT_MS
): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (overallSignal.aborted) {
      throw new DOMException("Overall deadline exceeded", "TimeoutError");
    }
    const { signal, cleanup } = createRequestSignal(overallSignal, timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal });
      if (res.status === 429 && attempt === 0 && !overallSignal.aborted) {
        const retryHeader = res.headers.get("retry-after");
        const retrySeconds = retryHeader ? Number.parseFloat(retryHeader) : NaN;
        const waitMs = Number.isFinite(retrySeconds)
          ? Math.min(Math.max(100, retrySeconds * 1000), MAX_RETRY_AFTER_MS)
          : 1_000;
        await sleep(waitMs);
        continue;
      }
      return res;
    } finally {
      cleanup();
    }
  }
  throw new Error("Exhausted retry attempts");
}

function isAbortOrTimeout(err: any): boolean {
  if (!err) return false;
  return (
    err.name === "TimeoutError" ||
    err.name === "AbortError" ||
    /timed?\s*out|aborted|deadline/i.test(String(err.message || err))
  );
}

/**
 * Sanitizes SVG string to strip out scripts and dangerous tags
 */
function sanitizeSvg(rawSvg: string): string {
  let cleaned = rawSvg.trim();
  cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, "");
  cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, "");
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  return cleaned.trim();
}

/**
 * Parses Figma URL into fileKey and nodeId
 */
function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } {
  const cleanUrl = url.trim();

  // 1. Extract File Key: /file/:key/... or /design/:key/...
  const fileKeyMatch = cleanUrl.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9_-]+)/i);
  const fileKey = fileKeyMatch ? fileKeyMatch[1] : "";

  // 2. Extract Node ID: node-id=102-450 or node-id=102%3A450 or node-id=102:450
  let nodeId: string | undefined = undefined;
  const nodeIdMatch = cleanUrl.match(/[?&]node-id=([a-zA-Z0-9%:-]+)/i);
  if (nodeIdMatch && nodeIdMatch[1]) {
    const rawId = decodeURIComponent(nodeIdMatch[1]);
    nodeId = rawId.includes(":") ? rawId : rawId.replace("-", ":");
  }

  return { fileKey, nodeId };
}

const KNOWN_TYPE_NAMES = new Set([
  "stroke", "twotone", "two-tone", "solid", "filled", "outline", "bulk", "broken", "linear",
  "bold", "curved", "light", "thin", "duotone", "duo-tone", "regular", "glyph", "sharp", "flat"
]);

/**
 * Parses component name / variant string into structured metadata
 */
function parseComponentMetadata(
  nodeName: string,
  parentName?: string,
  description?: string
): { name: string; title: string; type?: string; category: string; tag?: string } {
  const rawName = nodeName.trim();
  let derivedType: string | undefined = undefined;
  let derivedCategory = "general";
  let title = rawName;

  // 1. Check if name is a variant property string (e.g. "Style=Two Tone, Size=24")
  if (rawName.includes("=")) {
    const pairs = rawName.split(",").map((p) => p.trim());
    for (const pair of pairs) {
      const [k, v] = pair.split("=").map((s) => s.trim());
      if (!k || !v) continue;
      const lowerK = k.toLowerCase();
      if (lowerK === "style" || lowerK === "type" || lowerK === "variant" || lowerK === "mode") {
        derivedType = v;
      } else if (lowerK === "category" || lowerK === "group" || lowerK === "section") {
        derivedCategory = v;
      } else if (lowerK === "name" || lowerK === "icon") {
        title = v;
      }
    }

    if (parentName) {
      const parentParts = parentName.split("/").map((p) => p.trim()).filter(Boolean);
      if (parentParts.length > 1) {
        derivedCategory = parentParts[0];
        title = parentParts.slice(1).join(" ");
      } else {
        title = parentName;
      }
    }
  } else {
    // 2. Slash-delimited path (e.g. "Icons / Navigation / Arrow Right / Two Tone")
    const parts = rawName.split("/").map((p) => p.trim()).filter(Boolean);
    const cleanParts = parts.filter(
      (p) => !/^(icons?|assets?|svgs?|components?|glyphs?)$/i.test(p)
    );

    if (cleanParts.length >= 3) {
      derivedCategory = cleanParts[0];
      title = cleanParts[1];
      derivedType = cleanParts[2];
    } else if (cleanParts.length === 2) {
      const part0Lower = cleanParts[0].toLowerCase();
      const part1Lower = cleanParts[1].toLowerCase();

      if (KNOWN_TYPE_NAMES.has(part0Lower)) {
        derivedType = cleanParts[0];
        title = cleanParts[1];
      } else if (KNOWN_TYPE_NAMES.has(part1Lower)) {
        title = cleanParts[0];
        derivedType = cleanParts[1];
      } else {
        derivedCategory = cleanParts[0];
        title = cleanParts[1];
      }
    } else if (cleanParts.length === 1) {
      title = cleanParts[0];
    }
  }

  // Derive kebab-case stem
  const stem = title
    .toLowerCase()
    .replace(/^icon[-_]?/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const cleanTitle = title
    .replace(/^icon[-_\s]?/i, "")
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return {
    name: stem || "icon",
    title: cleanTitle || "Icon",
    type: derivedType,
    category: derivedCategory || "general",
    tag: description ? description.split("\n")[0] : undefined,
  };
}

interface ComponentNodeInfo {
  id: string;
  name: string;
  parentName?: string;
  description?: string;
}

/**
 * Recursively extracts all COMPONENT nodes from a Figma node tree
 */
function extractComponentNodes(node: any, parentName?: string): ComponentNodeInfo[] {
  const list: ComponentNodeInfo[] = [];
  if (!node) return list;

  if (node.type === "COMPONENT") {
    list.push({
      id: node.id,
      name: node.name || "Icon",
      parentName: parentName,
      description: node.description || undefined,
    });
  } else if (node.type === "COMPONENT_SET") {
    const setChildren = node.children || [];
    for (const child of setChildren) {
      list.push(...extractComponentNodes(child, node.name));
    }
  } else if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      list.push(...extractComponentNodes(child, node.name || parentName));
    }
  }

  return list;
}

export interface FailedFigmaAsset {
  id: string;
  reason: string;
}

/**
 * Helper to process a single Figma link source with bounded concurrency and deadlines
 */
async function processSingleFigmaSource(
  target: {
    sourceId?: string;
    sourceName?: string;
    fileUrl?: string;
    fileKey?: string;
    nodeId?: string;
  },
  pat: string,
  overallSignal: AbortSignal
): Promise<{
  sourceId?: string;
  nodeName: string;
  fileKey: string;
  nodeId?: string;
  assets: ProjectAsset[];
  failed: FailedFigmaAsset[];
  totalFound: number;
  truncated: boolean;
  timedOut: boolean;
}> {
  let fileKey = target.fileKey || "";
  let nodeId = target.nodeId;

  if (target.fileUrl) {
    const parsed = parseFigmaUrl(target.fileUrl);
    if (parsed.fileKey) fileKey = parsed.fileKey;
    if (parsed.nodeId) nodeId = parsed.nodeId;
  }

  if (!fileKey) {
    throw new Error("Invalid Figma Link. Could not extract file key.");
  }

  const headers = {
    "X-Figma-Token": pat.trim(),
  };

  let targetTree: any = null;
  let nodeName = target.sourceName || "Figma File";

  // 1. Fetch Node tree or File tree from Figma API
  if (nodeId) {
    const nodeRes = await fetchWithDeadlineAndRetry(
      `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&geometry=paths`,
      { headers },
      overallSignal
    );

    if (!nodeRes.ok) {
      const errText = await nodeRes.text();
      throw new Error(`Figma API Error (${nodeRes.status}): ${errText || "Failed to access target frame/node."}`);
    }

    const nodeData = await nodeRes.json();
    const nodeObj = nodeData.nodes && nodeData.nodes[nodeId];
    if (!nodeObj || !nodeObj.document) {
      throw new Error(`Node ID "${nodeId}" was not found in Figma file "${fileKey}".`);
    }

    targetTree = nodeObj.document;
    nodeName = target.sourceName || targetTree.name || `Frame (${nodeId})`;
  } else {
    // Full file fetch
    const fileRes = await fetchWithDeadlineAndRetry(
      `https://api.figma.com/v1/files/${fileKey}?depth=3`,
      { headers },
      overallSignal
    );

    if (!fileRes.ok) {
      const errText = await fileRes.text();
      throw new Error(`Figma API Error (${fileRes.status}): ${errText || "Failed to access Figma file."}`);
    }

    const fileData = await fileRes.json();
    targetTree = fileData.document;
    nodeName = target.sourceName || fileData.name || "Figma File";
  }

  // 2. Discover all COMPONENT nodes and cap at FIGMA_MAX_COMPONENTS
  const allDiscoveredNodes = extractComponentNodes(targetTree);
  const totalFound = allDiscoveredNodes.length;
  if (totalFound === 0) {
    return {
      sourceId: target.sourceId,
      nodeName,
      fileKey,
      nodeId,
      assets: [],
      failed: [],
      totalFound: 0,
      truncated: false,
      timedOut: false,
    };
  }

  const truncated = totalFound > FIGMA_MAX_COMPONENTS;
  const componentNodes = truncated
    ? allDiscoveredNodes.slice(0, FIGMA_MAX_COMPONENTS)
    : allDiscoveredNodes;

  // 3. Batch fetch SVG image rendering URLs from Figma using bounded worker pool
  const nodeIds = componentNodes.map((c) => c.id);
  const chunkSize = 80;
  const imageUrlMap: Record<string, string> = {};
  const failed: FailedFigmaAsset[] = [];
  let timedOut = false;

  const chunks: string[][] = [];
  for (let i = 0; i < nodeIds.length; i += chunkSize) {
    chunks.push(nodeIds.slice(i, i + chunkSize));
  }

  await mapLimit(chunks, FIGMA_IMAGE_CONCURRENCY, async (chunk) => {
    if (overallSignal.aborted) {
      timedOut = true;
      for (const id of chunk) failed.push({ id, reason: "timeout" });
      return;
    }
    try {
      const imgRes = await fetchWithDeadlineAndRetry(
        `https://api.figma.com/v1/images/${fileKey}?ids=${chunk.join(",")}&format=svg`,
        { headers },
        overallSignal
      );

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        if (imgData.images) {
          Object.assign(imageUrlMap, imgData.images);
        }
      } else {
        const reason = imgRes.status === 429 ? "rate_limited" : `figma_images_http_${imgRes.status}`;
        for (const id of chunk) failed.push({ id, reason });
      }
    } catch (err: any) {
      if (isAbortOrTimeout(err)) timedOut = true;
      const reason = isAbortOrTimeout(err) ? "timeout" : err?.message || "fetch_failed";
      for (const id of chunk) failed.push({ id, reason });
    }
  });

  // 4. Download and sanitize SVGs with bounded concurrency across all components
  const assets: ProjectAsset[] = [];
  const now = new Date().toISOString();
  const recordedFailedIds = new Set(failed.map((f) => f.id));

  await mapLimit(componentNodes, FIGMA_SVG_CONCURRENCY, async (comp) => {
    const svgUrl = imageUrlMap[comp.id];
    if (!svgUrl) {
      if (!recordedFailedIds.has(comp.id)) {
        failed.push({ id: comp.id, reason: timedOut ? "timeout" : "missing_render_url" });
      }
      return;
    }

    if (overallSignal.aborted) {
      timedOut = true;
      failed.push({ id: comp.id, reason: "timeout" });
      return;
    }

    try {
      const svgFetchRes = await fetchWithDeadlineAndRetry(svgUrl, {}, overallSignal);
      if (!svgFetchRes.ok) {
        failed.push({
          id: comp.id,
          reason: svgFetchRes.status === 429 ? "rate_limited" : `svg_http_${svgFetchRes.status}`,
        });
        return;
      }

      const rawSvg = await svgFetchRes.text();
      const cleanSvg = sanitizeSvg(rawSvg);
      if (!cleanSvg || !cleanSvg.includes("<svg")) {
        failed.push({ id: comp.id, reason: "invalid_svg" });
        return;
      }

      const meta = parseComponentMetadata(comp.name, comp.parentName, comp.description);
      const figmaDirectUrl = `https://www.figma.com/file/${fileKey}?node-id=${encodeURIComponent(comp.id)}`;

      assets.push({
        id: `figma_${comp.id.replace(/[^a-zA-Z0-9]/g, "_")}_${Math.random().toString(36).substring(2, 6)}`,
        name: meta.name,
        title: meta.title,
        type: meta.type,
        category: target.sourceName || meta.category,
        tag: meta.tag,
        svg: cleanSvg,
        updatedAt: now,
        source: "figma",
        figmaNodeId: comp.id,
        figmaUrl: figmaDirectUrl,
        figmaSourceId: target.sourceId,
        figmaSourceName: target.sourceName || nodeName,
      });
    } catch (err: any) {
      if (isAbortOrTimeout(err)) timedOut = true;
      failed.push({
        id: comp.id,
        reason: isAbortOrTimeout(err) ? "timeout" : err?.message || "svg_fetch_failed",
      });
    }
  });

  return {
    sourceId: target.sourceId,
    nodeName,
    fileKey,
    nodeId,
    assets,
    failed,
    totalFound,
    truncated,
    timedOut: timedOut || overallSignal.aborted,
  };
}

/**
 * POST /api/figma/fetch-assets
 * Supports single link sync OR multi-source batch link sync with unified PAT.
 */
export async function POST(req: NextRequest) {
  const overallController = new AbortController();
  const overallTimer = setTimeout(() => {
    overallController.abort(new DOMException("Overall Figma sync deadline exceeded", "TimeoutError"));
  }, FIGMA_OVERALL_DEADLINE_MS);

  try {
    const auth = await authenticateRequest(req, "read:tokens");
    if (!auth.isValid) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { pat, sources, fileUrl, fileKey, nodeId, name: sourceName, sourceId } = body;

    if (!pat || !pat.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing Figma Personal Access Token (PAT)." },
        { status: 400 }
      );
    }

    const cleanPat = pat.trim();

    // Case 1: Multi-source batch request
    if (sources && Array.isArray(sources) && sources.length > 0) {
      const enabledSources: FigmaSourceLink[] = sources.filter((s: any) => s.enabled !== false && (s.fileUrl || s.fileKey));
      if (enabledSources.length === 0) {
        return NextResponse.json({
          success: true,
          assets: [],
          failed: [],
          truncated: false,
          timedOut: false,
          totalFound: 0,
          sourcesResults: [],
          message: "No enabled Figma sources provided to sync.",
        });
      }

      const allAssets: ProjectAsset[] = [];
      const allFailed: FailedFigmaAsset[] = [];
      let anyTruncated = false;
      let anyTimedOut = false;
      let totalFoundCount = 0;

      const sourcesResults: Array<{
        sourceId: string;
        nodeName: string;
        fileKey: string;
        nodeId?: string;
        importedCount: number;
        failedCount: number;
        truncated: boolean;
        timedOut: boolean;
        lastSyncedAt: string;
      }> = [];

      for (const src of enabledSources) {
        if (overallController.signal.aborted) {
          anyTimedOut = true;
          break;
        }
        try {
          const res = await processSingleFigmaSource(
            {
              sourceId: src.id,
              sourceName: src.name,
              fileUrl: src.fileUrl,
              fileKey: src.fileKey,
              nodeId: src.nodeId,
            },
            cleanPat,
            overallController.signal
          );

          allAssets.push(...res.assets);
          allFailed.push(...res.failed);
          totalFoundCount += res.totalFound;
          if (res.truncated) anyTruncated = true;
          if (res.timedOut) anyTimedOut = true;

          sourcesResults.push({
            sourceId: src.id,
            nodeName: res.nodeName,
            fileKey: res.fileKey,
            nodeId: res.nodeId,
            importedCount: res.assets.length,
            failedCount: res.failed.length,
            truncated: res.truncated,
            timedOut: res.timedOut,
            lastSyncedAt: new Date().toISOString(),
          });
        } catch (err: any) {
          if (isAbortOrTimeout(err)) anyTimedOut = true;
          console.warn(`Error syncing Figma source "${src.name}":`, err.message);
        }
      }

      return NextResponse.json({
        success: true,
        assets: allAssets,
        failed: allFailed,
        truncated: anyTruncated,
        timedOut: anyTimedOut,
        totalFound: totalFoundCount,
        importedCount: allAssets.length,
        sourcesResults,
        lastSyncedAt: new Date().toISOString(),
        ...(anyTruncated
          ? {
              guidance: `Component count exceeded ${FIGMA_MAX_COMPONENTS}. Provide a specific frame/section node-id URL to narrow the sync scope.`,
            }
          : {}),
      });
    }

    // Case 2: Single source request
    const singleResult = await processSingleFigmaSource(
      {
        sourceId,
        sourceName,
        fileUrl,
        fileKey,
        nodeId,
      },
      cleanPat,
      overallController.signal
    );

    return NextResponse.json({
      success: true,
      nodeName: singleResult.nodeName,
      fileKey: singleResult.fileKey,
      nodeId: singleResult.nodeId,
      assets: singleResult.assets,
      failed: singleResult.failed,
      truncated: singleResult.truncated,
      timedOut: singleResult.timedOut,
      totalFound: singleResult.totalFound,
      importedCount: singleResult.assets.length,
      lastSyncedAt: new Date().toISOString(),
      ...(singleResult.truncated
        ? {
            guidance: `Found ${singleResult.totalFound} components; synced the first ${FIGMA_MAX_COMPONENTS}. Provide a narrower Figma frame/node link to sync specific sections.`,
          }
        : {}),
    });
  } catch (error: any) {
    if (isAbortOrTimeout(error)) {
      return NextResponse.json(
        {
          success: false,
          timedOut: true,
          code: "timeout",
          error: "Figma asset sync timed out. Try syncing a specific frame or node instead of the entire file.",
        },
        { status: 504 }
      );
    }
    console.error("Figma asset sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred while fetching Figma assets.",
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(overallTimer);
  }
}
