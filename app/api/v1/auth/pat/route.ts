import { NextRequest } from "next/server";
import { generateApiKey } from "@/utils/patAuth";
import { getStoredApiKeys, saveApiKey, deleteApiKey } from "@/utils/cloudStorage";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptionsCors();
}

/**
 * GET /api/v1/auth/pat
 * List all active API keys dynamically from Firestore
 */
export async function GET() {
  try {
    const keys = await getStoredApiKeys();
    return jsonWithCors({
      success: true,
      keys: keys.map(({ keyHash, ...safe }) => safe),
    });
  } catch (err: any) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/auth/pat
 * Dynamically generate and save a new Personal Access Token (PAT)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, scopes, expiresInDays } = body;

    const { plaintextKey, record } = generateApiKey(
      name || "Figma Plugin Key",
      scopes || ["read:tokens", "write:tokens"],
      expiresInDays ? parseInt(expiresInDays) : undefined
    );

    await saveApiKey(record);

    return jsonWithCors({
      success: true,
      message: "Personal Access Token generated successfully. Store it safely; it will not be shown again.",
      token: plaintextKey,
      record: {
        id: record.id,
        name: record.name,
        keyPrefix: record.keyPrefix,
        scopes: record.scopes,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
      },
    });
  } catch (err: any) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/auth/pat?id=...
 * Revoke an API key dynamically in Firestore
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonWithCors({ success: false, error: "Missing key ID" }, { status: 400 });
    }

    await deleteApiKey(id);

    return jsonWithCors({
      success: true,
      message: `API key ${id} revoked successfully.`,
    });
  } catch (err: any) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}
