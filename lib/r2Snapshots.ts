import crypto from "crypto";
import zlib from "zlib";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { isR2Configured } from "@/lib/r2";
import type { Project } from "@/types/tenant";
import type { ProjectBranch, RawTokensDocument, ThemeGroup } from "@/types/tokens";

export const SNAPSHOT_OFFLOAD_THRESHOLD_BYTES = 100 * 1024; // 100 KB

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "second-screen-assets";

let _snapshotS3Client: Pick<S3Client, "send"> | null = null;
let _testClientOverride: Pick<S3Client, "send"> | null = null;

export function __setSnapshotR2ClientForTests(client: Pick<S3Client, "send"> | null): void {
  _testClientOverride = client;
}

function getSnapshotClient(): Pick<S3Client, "send"> {
  if (_testClientOverride) return _testClientOverride;
  if (!_snapshotS3Client) {
    if (!isR2Configured) {
      throw new Error("Cloudflare R2 is not configured for project snapshots.");
    }
    _snapshotS3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _snapshotS3Client;
}

export interface ProjectSnapshotPayload {
  rawTokens?: RawTokensDocument;
  themeGroups?: ThemeGroup[];
  branches?: ProjectBranch[];
}

export interface UploadedSnapshotMeta {
  key: string;
  hash: string;
  rawBytes: number;
  gzipBytes: number;
}

export function buildProjectSnapshotKey(
  orgId: string,
  projectId: string,
  hash: string
): string {
  const safeOrg = orgId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeProj = projectId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `orgs/${safeOrg}/projects/${safeProj}/snapshots/${hash}.json.gz`;
}

/**
 * Strips heavy token trees from branch records so Supabase Postgres retains
 * lightweight branch navigation/commit metadata without multi-MB JSONB bloat.
 */
export function stripBranchPayloads(branches: ProjectBranch[] = []): ProjectBranch[] {
  return branches.map((b) => ({
    ...b,
    rawTokens: {},
    themeGroups: [],
  }));
}

/**
 * Gzip-compresses and uploads a project snapshot to R2 using a content-addressed key.
 */
export async function uploadProjectSnapshot(
  orgId: string,
  projectId: string,
  payload: ProjectSnapshotPayload
): Promise<UploadedSnapshotMeta> {
  const jsonStr = JSON.stringify({
    rawTokens: payload.rawTokens || {},
    themeGroups: payload.themeGroups || [],
    branches: payload.branches || [],
  });
  const rawBuffer = Buffer.from(jsonStr, "utf8");
  const hash = crypto.createHash("sha256").update(rawBuffer).digest("hex");
  const gzipBuffer = zlib.gzipSync(rawBuffer, { level: 6 });
  const key = buildProjectSnapshotKey(orgId, projectId, hash);

  const client = getSnapshotClient();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: gzipBuffer,
      ContentType: "application/gzip",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    hash,
    rawBytes: rawBuffer.byteLength,
    gzipBytes: gzipBuffer.byteLength,
  };
}

/**
 * Downloads and gunzips a project snapshot from Cloudflare R2.
 */
export async function loadProjectSnapshot(
  key: string
): Promise<ProjectSnapshotPayload> {
  if (!key) {
    throw new Error("Snapshot R2 key is required.");
  }

  const client = getSnapshotClient();
  const response: any = await client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );

  let rawBytes: Uint8Array;
  if (response?.Body?.transformToByteArray) {
    rawBytes = await response.Body.transformToByteArray();
  } else if (typeof response?.Body?.transformToString === "function") {
    const text = await response.Body.transformToString("utf-8");
    return JSON.parse(text) as ProjectSnapshotPayload;
  } else {
    throw new Error("Empty snapshot body returned from R2.");
  }

  const buf = Buffer.from(rawBytes);
  // Check gzip magic header (0x1f 0x8b)
  const jsonBuf =
    buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b
      ? zlib.gunzipSync(buf)
      : buf;

  return JSON.parse(jsonBuf.toString("utf8")) as ProjectSnapshotPayload;
}

/**
 * Server-side hydration helper: if a project has its payload offloaded to R2,
 * loads and merges { rawTokens, themeGroups, branches } transparently.
 */
export async function hydrateProjectFromR2Snapshot(project: Project): Promise<Project> {
  if (project.storageMode !== "r2" || !project.snapshotR2Key) {
    return project;
  }
  const snapshot = await loadProjectSnapshot(project.snapshotR2Key);
  return {
    ...project,
    rawTokens: snapshot.rawTokens ?? project.rawTokens ?? {},
    themeGroups: snapshot.themeGroups ?? project.themeGroups ?? [],
    branches:
      Array.isArray(snapshot.branches) && snapshot.branches.length > 0
        ? snapshot.branches
        : project.branches || [],
  };
}
