import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    // Call Figma REST API Local Variables Endpoint
    const figmaRes = await fetch(
      `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/variables/local`,
      {
        headers: {
          "X-Figma-Token": pat.trim(),
        },
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
    return NextResponse.json(
      { error: err.message || "Failed to fetch variables from Figma." },
      { status: 500 }
    );
  }
}
