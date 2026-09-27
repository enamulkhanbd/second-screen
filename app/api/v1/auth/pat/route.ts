import { NextRequest } from "next/server";
import { generateApiKey } from "@/utils/patAuth";
import { getStoredApiKeys, saveApiKey, deleteApiKey } from "@/utils/cloudStorage";
import { jsonWithCors, handleOptionsCors } from "@/utils/cors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasTrustedMutationOrigin } from "@/utils/auth";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptionsCors();
}

async function getAuthenticatedUser(req: NextRequest) {
  if (!hasTrustedMutationOrigin(req)) return null;
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
}

/**
 * GET /api/v1/auth/pat
 * List all active API keys dynamically from Firestore
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonWithCors({ success: false, error: "Unauthorized" }, { status: 401 });

    const keys = await getStoredApiKeys();
    return jsonWithCors({
      success: true,
      keys: keys.filter((key) => key.uid === user.id).map(({ keyHash, ...safe }) => safe),
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
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonWithCors({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { name, scopes, expiresInDays } = body;
    const allowedScopes = ["read:tokens", "write:tokens"] as const;
    const safeScopes: (typeof allowedScopes)[number][] = Array.isArray(scopes)
      ? scopes.filter((scope): scope is (typeof allowedScopes)[number] => allowedScopes.includes(scope))
      : ["read:tokens", "write:tokens"];
    if (safeScopes.length === 0) {
      return jsonWithCors({ success: false, error: "At least one valid permission scope is required." }, { status: 400 });
    }

    const { plaintextKey, record } = generateApiKey(
      name || "Figma Plugin Key",
      safeScopes,
      expiresInDays ? Number.parseInt(String(expiresInDays), 10) : undefined,
      { uid: user.id, userEmail: user.email || undefined }
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
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonWithCors({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonWithCors({ success: false, error: "Missing key ID" }, { status: 400 });
    }

    const ownedKey = (await getStoredApiKeys()).find((key) => key.id === id && key.uid === user.id);
    if (!ownedKey) {
      return jsonWithCors({ success: false, error: "API key not found." }, { status: 404 });
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
