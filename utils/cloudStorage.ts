import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiKeyRecord } from "./patAuth";

// In-memory runtime store used only when Supabase is not configured
const inMemoryApiKeys = new Map<string, ApiKeyRecord>();

const API_KEY_COLUMNS =
  "id,name,key_prefix,key_hash,scopes,created_at,expires_at,user_id,user_email,org_id,project_id,org_name,project_name";

function getClient() {
  return typeof window === "undefined" ? createAdminClient() : supabase;
}

function mapApiKeyRow(row: any): ApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    keyHash: row.key_hash,
    scopes: row.scopes || [],
    createdAt: row.created_at,
    expiresAt: row.expires_at || undefined,
    uid: row.user_id || undefined,
    userEmail: row.user_email || undefined,
    orgId: row.org_id || undefined,
    projectId: row.project_id || undefined,
    orgName: row.org_name || undefined,
    projectName: row.project_name || undefined,
  };
}

/**
 * Look up a single API key by its SHA-256 hash using the indexed key_hash column.
 * Does not merge process-local inMemoryApiKeys when Supabase is configured, so
 * revocations on any instance take effect immediately across all instances.
 */
export async function findApiKeyByHash(hash: string): Promise<ApiKeyRecord | null> {
  if (!hash) return null;

  if (isSupabaseConfigured) {
    const client = getClient();
    const { data, error } = await client
      .from("api_keys")
      .select(API_KEY_COLUMNS)
      .eq("key_hash", hash)
      .maybeSingle();

    if (error) {
      console.warn("Supabase error looking up API key by hash:", error);
      return null;
    }
    if (!data || !data.key_hash) return null;
    return mapApiKeyRow(data);
  }

  for (const record of Array.from(inMemoryApiKeys.values())) {
    if (record.keyHash === hash) return record;
  }
  return null;
}

/**
 * Lists API keys belonging to a specific user.
 */
export async function listApiKeysForUser(userId: string): Promise<ApiKeyRecord[]> {
  if (!userId) return [];

  if (isSupabaseConfigured) {
    const client = getClient();
    const { data, error } = await client
      .from("api_keys")
      .select(API_KEY_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase error listing user API keys:", error);
      throw new Error("Could not load API keys.");
    }
    return (data || []).filter((r: any) => r && r.key_hash).map(mapApiKeyRow);
  }

  return Array.from(inMemoryApiKeys.values()).filter((k) => k.uid === userId);
}

/**
 * Legacy helper retained for rollback compatibility (API_KEY_LOOKUP=legacy).
 * Fetches API keys from Supabase without merging stale process-local entries when Supabase is active.
 */
export async function getStoredApiKeysLegacy(): Promise<ApiKeyRecord[]> {
  if (isSupabaseConfigured) {
    const client = getClient();
    try {
      const { data, error } = await client.from("api_keys").select(API_KEY_COLUMNS);
      if (!error && data) {
        return data.filter((row: any) => row && row.key_hash).map(mapApiKeyRow);
      }
    } catch (e) {
      console.warn("Supabase error fetching api keys:", e);
    }
    return [];
  }

  return Array.from(inMemoryApiKeys.values());
}

export const getStoredApiKeys = getStoredApiKeysLegacy;

/**
 * Dynamically saves an API key to Supabase
 */
export async function saveApiKey(record: ApiKeyRecord): Promise<void> {
  if (isSupabaseConfigured) {
    const client = getClient();
    const { error } = await client.from("api_keys").upsert({
      id: record.id,
      name: record.name,
      key_prefix: record.keyPrefix,
      key_hash: record.keyHash,
      scopes: record.scopes || [],
      created_at: record.createdAt || new Date().toISOString(),
      expires_at: record.expiresAt || null,
      user_id: record.uid || null,
      user_email: record.userEmail || null,
      org_id: record.orgId || null,
      project_id: record.projectId || null,
      org_name: record.orgName || null,
      project_name: record.projectName || null,
    });
    if (error) {
      console.warn("Supabase error saving API key:", error);
      throw new Error("Could not persist the API key. Please try again.");
    }
    return;
  }
  inMemoryApiKeys.set(record.id, record);
}

/**
 * Authoritatively deletes an API key (scoped to ownerUid when provided).
 * Throws if the database delete fails, and returns true only when a row was deleted.
 */
export async function deleteApiKey(id: string, ownerUid?: string): Promise<boolean> {
  if (!id) return false;

  if (isSupabaseConfigured) {
    const client = getClient();
    let query = client.from("api_keys").delete().eq("id", id);
    if (ownerUid) {
      query = query.eq("user_id", ownerUid);
    }
    const { data, error } = await query.select("id");
    if (error) {
      console.warn("Supabase error deleting api key:", error);
      throw new Error("Could not revoke the API key. Please try again.");
    }
    inMemoryApiKeys.delete(id);
    return (data?.length ?? 0) > 0;
  }

  const existing = inMemoryApiKeys.get(id);
  if (!existing) return false;
  if (ownerUid && existing.uid !== ownerUid) return false;
  return inMemoryApiKeys.delete(id);
}

/**
 * Clears in-memory keys (for unit tests).
 */
export function __clearInMemoryApiKeysForTests(): void {
  inMemoryApiKeys.clear();
}
