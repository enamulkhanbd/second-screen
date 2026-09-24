import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { ApiKeyRecord } from "./patAuth";

// In-memory runtime store
const inMemoryApiKeys = new Map<string, ApiKeyRecord>();

function getClient() {
  if (typeof window === "undefined") {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  }
  return supabase;
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

    // 3. Fallback: Fetch from 'pairing_sessions' for approved companion plugin PATs
    try {
      const { data: pairData, error: pairErr } = await client
        .from("pairing_sessions")
        .select("*");
      if (!pairErr && pairData) {
        pairData.forEach((session: any) => {
          if (session && session.pat && session.pat.startsWith("sec_pat_")) {
            const keyHash = crypto.createHash("sha256").update(session.pat).digest("hex");
            const sessionKeyId = `pair-${session.code}`;
            const record: ApiKeyRecord = {
              id: sessionKeyId,
              name: `Figma Companion (${session.org_name || session.project_name || "Plugin"})`,
              keyPrefix: `${session.pat.slice(0, 16)}...${session.pat.slice(-4)}`,
              keyHash,
              scopes: ["read:tokens", "write:tokens", "manage:releases"],
              createdAt: new Date(Number(session.created_at) || Date.now()).toISOString(),
              orgId: session.org_id,
              projectId: session.project_id,
              orgName: session.org_name,
              projectName: session.project_name,
            };
            keysMap.set(sessionKeyId, record);
            inMemoryApiKeys.set(sessionKeyId, record);
          }
        });
      }
    } catch (e) {
      console.warn("Supabase error scanning pairing sessions for api keys:", e);
    }
  }

  return Array.from(keysMap.values());
}

/**
 * Dynamically saves an API key to Supabase
 */
export async function saveApiKey(record: ApiKeyRecord): Promise<void> {
  inMemoryApiKeys.set(record.id, record);
  if (isSupabaseConfigured) {
    try {
      const client = getClient();
      await client.from("api_keys").upsert({
        id: record.id,
        name: record.name,
        key_prefix: record.keyPrefix,
        key_hash: record.keyHash,
        scopes: record.scopes || [],
        created_at: record.createdAt || new Date().toISOString(),
        org_id: record.orgId || null,
        project_id: record.projectId || null,
        org_name: record.orgName || null,
        project_name: record.projectName || null,
      });
    } catch (e) {
      console.warn("Supabase error saving api key:", e);
    }
  }
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
