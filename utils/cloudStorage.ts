import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiKeyRecord } from "./patAuth";

// In-memory runtime store
const inMemoryApiKeys = new Map<string, ApiKeyRecord>();

function getClient() {
  return typeof window === "undefined" ? createAdminClient() : supabase;
}

/**
 * Dynamically fetches all API keys from Supabase (including api_keys & approved pairing_sessions)
 */
export async function getStoredApiKeys(): Promise<ApiKeyRecord[]> {
  const keysMap = new Map<string, ApiKeyRecord>();

  // 1. Load from in-memory cache first
  inMemoryApiKeys.forEach((v, k) => keysMap.set(k, v));

  if (isSupabaseConfigured) {
    const client = getClient();
    // 2. Fetch from 'api_keys' table
    try {
      const { data, error } = await client.from("api_keys").select("*");
      if (!error && data) {
        data.forEach((row: any) => {
          const item: ApiKeyRecord = {
            id: row.id,
            name: row.name,
            keyPrefix: row.key_prefix,
            keyHash: row.key_hash,
            scopes: row.scopes || [],
            createdAt: row.created_at,
            expiresAt: row.expires_at || undefined,
            uid: row.user_id || undefined,
            userEmail: row.user_email || undefined,
            orgId: row.org_id,
            projectId: row.project_id,
            orgName: row.org_name,
            projectName: row.project_name,
          };
          if (item && item.keyHash) {
            keysMap.set(item.id, item);
            inMemoryApiKeys.set(item.id, item);
          }
        });
      }
    } catch (e) {
      console.warn("Supabase error fetching api keys:", e);
    }

  }

  return Array.from(keysMap.values());
}

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
  }
  inMemoryApiKeys.set(record.id, record);
}

/**
 * Dynamically deletes an API key from Supabase
 */
export async function deleteApiKey(id: string): Promise<void> {
  inMemoryApiKeys.delete(id);
  if (isSupabaseConfigured) {
    try {
      const client = getClient();
      await client.from("api_keys").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase error deleting api key:", e);
    }
  }
}
