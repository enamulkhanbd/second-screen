import fs from "fs";
import path from "path";
import { ApiKeyRecord } from "./patAuth";
import { RawTokensDocument } from "@/types/tokens";

const DATA_DIR = path.join(process.cwd(), ".second-screen");
const CLOUD_STORE_FILE = path.join(DATA_DIR, "cloud_store.json");

interface CloudStoreData {
  apiKeys: ApiKeyRecord[];
  tokensDoc?: RawTokensDocument;
  updatedAt?: string;
}

function ensureStoreFile(): CloudStoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CLOUD_STORE_FILE)) {
      const initial: CloudStoreData = { apiKeys: [] };
      fs.writeFileSync(CLOUD_STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const raw = fs.readFileSync(CLOUD_STORE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { apiKeys: [] };
  }
}

function writeStoreFile(data: CloudStoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CLOUD_STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write to cloud_store.json:", err);
  }
}

export function getStoredApiKeys(): ApiKeyRecord[] {
  const store = ensureStoreFile();
  return store.apiKeys || [];
}

export function saveApiKey(record: ApiKeyRecord) {
  const store = ensureStoreFile();
  const filtered = (store.apiKeys || []).filter((k) => k.id !== record.id);
  filtered.unshift(record);
  store.apiKeys = filtered;
  writeStoreFile(store);
}

export function deleteApiKey(id: string) {
  const store = ensureStoreFile();
  store.apiKeys = (store.apiKeys || []).filter((k) => k.id !== id);
  writeStoreFile(store);
}

export function getStoredTokens(): RawTokensDocument | null {
  const store = ensureStoreFile();
  return store.tokensDoc || null;
}

export function saveStoredTokens(doc: RawTokensDocument) {
  const store = ensureStoreFile();
  store.tokensDoc = doc;
  store.updatedAt = new Date().toISOString();
  writeStoreFile(store);
}
