/**
 * Cloudflare R2 Object Storage Client
 * ====================================
 * S3-compatible client for managing project assets (SVG, PNG, PDF, etc.)
 * in Cloudflare R2 as the high-performance asset persistence layer.
 *
 * Environment Variables Required:
 *   R2_ACCOUNT_ID          — Cloudflare Account ID
 *   R2_ACCESS_KEY_ID       — R2 API Token Access Key
 *   R2_SECRET_ACCESS_KEY   — R2 API Token Secret Key
 *   R2_BUCKET_NAME         — R2 bucket name (default: "second-screen-assets")
 *   R2_PUBLIC_URL          — Public URL base (e.g. https://assets.example.com or https://bucket.r2.dev)
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "second-screen-assets";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

/** Whether R2 storage is properly configured and available */
export const isR2Configured =
  Boolean(R2_ACCOUNT_ID) &&
  Boolean(R2_ACCESS_KEY_ID) &&
  Boolean(R2_SECRET_ACCESS_KEY) &&
  Boolean(R2_BUCKET_NAME);

// ---------------------------------------------------------------------------
// Singleton Client
// ---------------------------------------------------------------------------

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    if (!isR2Configured) {
      throw new Error(
        "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables."
      );
    }
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Key Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the R2 object key for an asset.
 * Format: {orgId}/{projectId}/{assetId}.{ext}
 */
export function buildAssetKey(
  orgId: string,
  projectId: string,
  assetId: string,
  extension: string = "svg"
): string {
  const cleanExt = extension.replace(/^\./, "");
  return `${orgId}/${projectId}/${assetId}.${cleanExt}`;
}

/**
 * Builds the R2 object key for a project's asset metadata index.
 * Format: {orgId}/{projectId}/metadata.json
 */
export function buildMetadataKey(orgId: string, projectId: string): string {
  return `${orgId}/${projectId}/metadata.json`;
}

/**
 * Builds the R2 object key for a project's asset configuration.
 * Format: {orgId}/{projectId}/config.json
 */
export function buildConfigKey(orgId: string, projectId: string): string {
  return `${orgId}/${projectId}/config.json`;
}

/**
 * Returns the public CDN URL for an R2 object key.
 */
export function getPublicUrl(key: string): string {
  if (R2_PUBLIC_URL) {
    const base = R2_PUBLIC_URL.replace(/\/+$/, "");
    return `${base}/${key}`;
  }
  // Fallback: construct from bucket name (works with R2 public access enabled)
  return `https://${R2_BUCKET_NAME}.r2.dev/${key}`;
}

// ---------------------------------------------------------------------------
// Content Type Detection
// ---------------------------------------------------------------------------

const EXTENSION_MIME_MAP: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  ico: "image/x-icon",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  json: "application/json",
};

/**
 * Detects MIME type from file extension.
 */
export function detectContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_MIME_MAP[ext] || "application/octet-stream";
}

/**
 * Extracts file extension from a MIME content type.
 */
export function extensionFromContentType(contentType: string): string {
  for (const [ext, mime] of Object.entries(EXTENSION_MIME_MAP)) {
    if (mime === contentType) return ext;
  }
  return "bin";
}

/**
 * Derives the semantic asset type ("icon" | "image" | "video" | "document" | "other")
 * from the MIME contentType and filename extension.
 */
export function deriveAssetType(contentType: string = "", filename: string = ""): AssetType {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mime = contentType.toLowerCase();
  if (mime.includes("svg") || ext === "svg") return "icon";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "ico", "bmp", "avif"].includes(ext)) return "image";
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "mkv", "avi"].includes(ext)) return "video";
  if (mime.includes("pdf") || mime.includes("document") || ["pdf", "doc", "docx", "ppt", "pptx", "txt"].includes(ext)) return "document";
  return "other";
}

// ---------------------------------------------------------------------------
// Core Operations
// ---------------------------------------------------------------------------

export interface R2UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

/**
 * Uploads a file (Buffer or string) to R2.
 *
 * @param orgId       - Organization ID
 * @param projectId   - Project ID
 * @param assetId     - Unique asset identifier
 * @param body        - File content (Buffer for binary, string for SVG/text)
 * @param contentType - MIME type (e.g. "image/svg+xml")
 * @param extension   - File extension (e.g. "svg", "png")
 * @returns Upload result with key, public URL, size, and content type
 */
export async function uploadAsset(
  orgId: string,
  projectId: string,
  assetId: string,
  body: Buffer | string,
  contentType: string,
  extension: string = "svg"
): Promise<R2UploadResult> {
  const client = getClient();
  const key = buildAssetKey(orgId, projectId, assetId, extension);
  const bodyBuffer = typeof body === "string" ? Buffer.from(body, "utf-8") : body;

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: bodyBuffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: getPublicUrl(key),
    size: bodyBuffer.length,
    contentType,
  };
}

import { AssetType, ProjectAsset } from "@/types/tenant";

/**
 * Uploads the asset metadata index (lightweight JSON) for a project.
 * This replaces the Firestore asset document storage.
 */
export async function uploadMetadataIndex(
  orgId: string,
  projectId: string,
  metadata: ProjectAsset[]
): Promise<void> {
  const client = getClient();
  const key = buildMetadataKey(orgId, projectId);
  const body = JSON.stringify(metadata, null, 2);

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(body, "utf-8"),
      ContentType: "application/json",
      CacheControl: "no-cache, no-store, must-revalidate",
    })
  );
}

/**
 * Loads the asset metadata index for a project from R2.
 * Returns an empty array if the metadata file doesn't exist yet.
 */
export async function loadMetadataIndex(
  orgId: string,
  projectId: string
): Promise<ProjectAsset[]> {
  const client = getClient();
  const key = buildMetadataKey(orgId, projectId);

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    if (response.Body) {
      const bodyStr = await response.Body.transformToString("utf-8");
      return JSON.parse(bodyStr);
    }
    return [];
  } catch (err: any) {
    // NoSuchKey = metadata index doesn't exist yet (new project)
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return [];
    }
    throw err;
  }
}

/**
 * Saves a project's asset configuration (Git sync & Figma sync settings) to R2.
 * Key: {orgId}/{projectId}/config.json
 */
export async function uploadAssetConfig(
  orgId: string,
  projectId: string,
  config: Record<string, any>
): Promise<void> {
  const client = getClient();
  const key = buildConfigKey(orgId, projectId);
  const payload = JSON.stringify(config, null, 2);

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(payload, "utf-8"),
      ContentType: "application/json",
      CacheControl: "no-cache, no-store, must-revalidate",
    })
  );
}

/**
 * Loads a project's asset configuration from R2.
 * Returns null if the configuration file does not exist yet.
 */
export async function loadAssetConfig(
  orgId: string,
  projectId: string
): Promise<Record<string, any> | null> {
  const client = getClient();
  const key = buildConfigKey(orgId, projectId);

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    if (response.Body) {
      const bodyStr = await response.Body.transformToString("utf-8");
      return JSON.parse(bodyStr);
    }
    return null;
  } catch (err: any) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Loads the raw binary content of an asset from R2 by key.
 */
export async function loadAssetRawContent(
  key: string
): Promise<{ data: Uint8Array; contentType: string } | null> {
  const client = getClient();
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    if (response.Body) {
      const data = await response.Body.transformToByteArray();
      return {
        data,
        contentType: response.ContentType || "application/octet-stream",
      };
    }
    return null;
  } catch (err: any) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}


/**
 * Deletes a project's asset configuration from R2.
 */
export async function deleteAssetConfig(
  orgId: string,
  projectId: string
): Promise<void> {
  const client = getClient();
  const key = buildConfigKey(orgId, projectId);

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
  } catch (err: any) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return;
    }
    throw err;
  }
}

/**
 * Deletes a single asset from R2.
 */
export async function deleteAsset(
  orgId: string,
  projectId: string,
  assetId: string,
  extension: string = "svg"
): Promise<void> {
  const client = getClient();
  const key = buildAssetKey(orgId, projectId, assetId, extension);

  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Deletes multiple assets from R2 in a single batch operation.
 * R2 supports up to 1000 objects per batch delete.
 */
export async function deleteAssets(
  keys: string[]
): Promise<void> {
  if (keys.length === 0) return;
  const client = getClient();

  // R2 batch delete limit: 1000 objects per request
  const BATCH_SIZE = 1000;
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: true,
        },
      })
    );
  }
}

/**
 * Lists all asset object keys under a project prefix.
 * Useful for migration and cleanup operations.
 */
export async function listProjectAssetKeys(
  orgId: string,
  projectId: string
): Promise<string[]> {
  const client = getClient();
  const prefix = `${orgId}/${projectId}/`;
  const keys: string[] = [];

  let continuationToken: string | undefined;
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (
          obj.Key &&
          !obj.Key.endsWith("metadata.json") &&
          !obj.Key.endsWith("config.json")
        ) {
          keys.push(obj.Key);
        }
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

/**
 * Checks if an asset exists in R2 without downloading it.
 */
export async function assetExists(key: string): Promise<boolean> {
  const client = getClient();
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes all assets, metadata, and config for a project from R2.
 * Used when a project is deleted.
 */
export async function deleteAllProjectAssets(
  orgId: string,
  projectId: string
): Promise<void> {
  const keys = await listProjectAssetKeys(orgId, projectId);
  // Also include the metadata index and project asset config
  const metaKey = buildMetadataKey(orgId, projectId);
  const configKey = buildConfigKey(orgId, projectId);
  const allKeys = [...keys, metaKey, configKey];
  await deleteAssets(allKeys);
}

/**
 * Lists all objects across the entire R2 bucket.
 */
export async function listAllBucketObjects(prefix?: string): Promise<
  Array<{
    key: string;
    size?: number;
    lastModified?: Date;
    url: string;
  }>
> {
  const client = getClient();
  const objects: Array<{
    key: string;
    size?: number;
    lastModified?: Date;
    url: string;
  }> = [];

  let continuationToken: string | undefined;
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          objects.push({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            url: getPublicUrl(obj.Key),
          });
        }
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

/**
 * Generates a presigned PUT URL for direct client-side upload to R2.
 * Valid for the specified duration (default: 3600 seconds / 1 hour).
 */
export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<{ presignedUrl: string; key: string; publicUrl: string }> {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    presignedUrl,
    key,
    publicUrl: getPublicUrl(key),
  };
}

/**
 * Generates a presigned GET URL for private object download from R2.
 */
export async function getDownloadPresignedUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });
}
