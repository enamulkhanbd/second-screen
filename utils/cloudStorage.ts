import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { ApiKeyRecord } from "./patAuth";

// In-memory runtime store
const inMemoryApiKeys = new Map<string, ApiKeyRecord>();

/**
 * Dynamically fetches all API keys from Firestore
 */
export async function getStoredApiKeys(): Promise<ApiKeyRecord[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "api_keys"));
      const keys: ApiKeyRecord[] = [];
      snap.forEach((d) => {
        const item = d.data() as ApiKeyRecord;
        keys.push(item);
        inMemoryApiKeys.set(item.id, item);
      });
      return keys;
    } catch (e) {
      console.warn("Firestore error fetching api keys:", e);
    }
  }
  return Array.from(inMemoryApiKeys.values());
}

/**
 * Dynamically saves an API key to Firestore
 */
export async function saveApiKey(record: ApiKeyRecord): Promise<void> {
  inMemoryApiKeys.set(record.id, record);
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "api_keys", record.id), record);
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
