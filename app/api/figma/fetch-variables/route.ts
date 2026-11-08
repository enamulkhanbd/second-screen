import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/utils/auth";

export const dynamic = "force-dynamic";

const FIGMA_VARIABLES_TIMEOUT_MS = 20_000;

/**
 * Parses Figma URL into fileKey
 */
function parseFigmaUrl(url: string): string {
  const cleanUrl = url.trim();
  const fileKeyMatch = cleanUrl.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9_-]+)/i);
  return fileKeyMatch ? fileKeyMatch[1] : cleanUrl;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, "read:tokens");
    if (!auth.isValid) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fileUrl, fileKey: rawFileKey, pat } = body;

    const fileKey = rawFileKey || (fileUrl ? parseFigmaUrl(fileUrl) : null);

    if (!fileKey) {
      return NextResponse.json(
        { error: "Figma file key or URL is required." },
        { status: 400 }
      );
    }

    if (!pat) {
      return NextResponse.json(
        { error: "Figma Personal Access Token (PAT) is required to access Figma Variables API." },
        { status: 400 }
      );
    }

    // Call Figma REST API Local Variables Endpoint with 20s deadline
    const figmaRes = await fetch(
      `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/variables/local`,
      {
        headers: {
          "X-Figma-Token": pat.trim(),
        },
        signal: AbortSignal.timeout(FIGMA_VARIABLES_TIMEOUT_MS),
      }
    );

    if (!figmaRes.ok) {
      const errText = await figmaRes.text();
      return NextResponse.json(
        {
          error: `Figma API returned ${figmaRes.status}: ${figmaRes.statusText}`,
          details: errText,
        },
        { status: figmaRes.status }
      );
    }

    const data = await figmaRes.json();
    const meta = data.meta || {};
    const collections = meta.variableCollections || {};
    const variables = meta.variables || {};

    // Map into simplified reference list
    const collectionsList = Object.values(collections).map((col: any) => ({
      id: col.id,
      name: col.name,
      modes: col.modes || [],
      defaultModeId: col.defaultModeId,
    }));

    const variablesList = Object.values(variables).map((v: any) => ({
      id: v.id,
      name: v.name.replace(/\//g, "."),
      rawName: v.name,
      key: v.key,
      variableCollectionId: v.variableCollectionId,
      resolvedType: v.resolvedType,
      valuesByMode: v.valuesByMode,
    }));

    return NextResponse.json({
      success: true,
      fileKey,
      collections: collectionsList,
      variables: variablesList,
      totalCount: variablesList.length,
    });
  } catch (err: any) {
    if (
      err?.name === "TimeoutError" ||
      err?.name === "AbortError" ||
      /timed?\s*out|aborted/i.test(String(err?.message || ""))
    ) {
      return NextResponse.json(
        { error: "Figma Variables API request timed out.", code: "timeout" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: err.message || "Failed to fetch variables from Figma." },
      { status: 500 }
    );
  }
}
