import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore/lite";
import crypto from "crypto";
import { ApiKeyRecord } from "./patAuth";

// In-memory runtime store
const inMemoryApiKeys = new Map<string, ApiKeyRecord>();

/**
 * Dynamically fetches all API keys from Firestore (including api_keys & approved pairing_sessions)
 */
export async function getStoredApiKeys(): Promise<ApiKeyRecord[]> {
  const keysMap = new Map<string, ApiKeyRecord>();

  // 1. Load from in-memory cache first
  inMemoryApiKeys.forEach((v, k) => keysMap.set(k, v));

  if (isFirebaseConfigured && db) {
    // 2. Fetch from 'api_keys' collection
    try {
      const snap = await getDocs(collection(db, "api_keys"));
      snap.forEach((d) => {
        const item = d.data() as ApiKeyRecord;
        if (item && item.keyHash) {
          keysMap.set(item.id || d.id, item);
          inMemoryApiKeys.set(item.id || d.id, item);
        }
      });
    } catch (e) {
      console.warn("Firestore error fetching api keys:", e);
    }

    // 3. Fallback: Fetch from 'pairing_sessions' collection for approved companion plugin PATs
    try {
      const pairSnap = await getDocs(collection(db, "pairing_sessions"));
      pairSnap.forEach((d) => {
        const session = d.data() as any;
        if (session && session.pat && session.pat.startsWith("sec_pat_")) {
          const keyHash = crypto.createHash("sha256").update(session.pat).digest("hex");
          const sessionKeyId = `pair-${d.id}`;
          const record: ApiKeyRecord = {
            id: sessionKeyId,
            name: `Figma Companion (${session.orgName || session.projectName || "Plugin"})`,
            keyPrefix: `${session.pat.slice(0, 16)}...${session.pat.slice(-4)}`,
            keyHash,
            scopes: ["read:tokens", "write:tokens", "manage:releases"],
            createdAt: new Date(session.createdAt || Date.now()).toISOString(),
            orgId: session.orgId,
            projectId: session.projectId,
            orgName: session.orgName,
            projectName: session.projectName,
          };
          keysMap.set(sessionKeyId, record);
          inMemoryApiKeys.set(sessionKeyId, record);
        }
      });
    } catch (e) {
      console.warn("Firestore error scanning pairing sessions for api keys:", e);
    }
  }

  return Array.from(keysMap.values());
}

/**
 * Dynamically saves an API key to Firestore
 */
export async function saveApiKey(record: ApiKeyRecord): Promise<void> {
  inMemoryApiKeys.set(record.id, record);
  if (isFirebaseConfigured && db) {
    try {
      const sanitized = Object.fromEntries(
        Object.entries(record).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, "api_keys", record.id), sanitized);
    } catch (e) {
      console.warn("Firestore error saving api key:", e);
    }
  }
}

/**
 * Dynamically deletes an API key from Firestore
 */
export async function deleteApiKey(id: string): Promise<void> {
  inMemoryApiKeys.delete(id);
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "api_keys", id));
    } catch (e) {
      console.warn("Firestore error deleting api key:", e);
    }
  }
}
