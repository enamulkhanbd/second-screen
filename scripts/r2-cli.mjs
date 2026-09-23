#!/usr/bin/env node
/**
 * Cloudflare R2 Helper CLI
 * =========================
 * Usage:
 *   node --env-file=.env.local scripts/r2-cli.mjs list [prefix]
 *   node --env-file=.env.local scripts/r2-cli.mjs presign <key> [contentType]
 *   node --env-file=.env.local scripts/r2-cli.mjs upload <filePath> [key]
 */

import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "node:fs";
import path from "node:path";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || "second-screen-assets";
const publicUrl = process.env.R2_PUBLIC_URL;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error("❌ Error: Missing R2 credentials in environment or .env.local.");
  console.error("Please ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are set.");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const [,, command, arg1, arg2] = process.argv;

async function listObjects(prefix = "") {
  console.log(`📦 Listing objects in bucket "${bucketName}" (prefix: "${prefix || "/"}"):\n`);
  let total = 0;
  let totalSize = 0;
  let continuationToken;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix || undefined,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    if (res.Contents && res.Contents.length > 0) {
      for (const obj of res.Contents) {
        total++;
        totalSize += obj.Size || 0;
        const sizeKb = ((obj.Size || 0) / 1024).toFixed(2);
        const url = publicUrl ? `${publicUrl.replace(/\/+$/, "")}/${obj.Key}` : `https://${bucketName}.r2.dev/${obj.Key}`;
        console.log(`  • ${obj.Key} (${sizeKb} KB) -> ${url}`);
      }
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  if (total === 0) {
    console.log("  (Bucket is empty or no objects matched the prefix)");
  } else {
    console.log(`\n✅ Total: ${total} object(s), ${(totalSize / 1024).toFixed(2)} KB`);
  }
}

async function generatePresignedUrl(key, contentType = "application/octet-stream") {
  if (!key) {
    console.error("Usage: node scripts/r2-cli.mjs presign <key> [contentType]");
    process.exit(1);
  }

  const putCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, putCommand, { expiresIn: 3600 });
  const viewUrl = publicUrl ? `${publicUrl.replace(/\/+$/, "")}/${key}` : `https://${bucketName}.r2.dev/${key}`;

  console.log(`\n🔑 Presigned Upload URL generated for "${key}" (valid 1 hour):\n`);
  console.log(uploadUrl);
  console.log(`\n🌐 Public view URL once uploaded: ${viewUrl}\n`);
  console.log(`To upload with curl:\ncurl -X PUT "${uploadUrl}" -H "Content-Type: ${contentType}" --data-binary @your-file\n`);
}

async function uploadFile(filePath, customKey) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const filename = path.basename(filePath);
  const key = customKey || `uploads/${filename}`;
  const fileBuffer = fs.readFileSync(filePath);

  console.log(`⬆️ Uploading ${filePath} -> s3://${bucketName}/${key}...`);

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: "application/octet-stream",
    })
  );

  const viewUrl = publicUrl ? `${publicUrl.replace(/\/+$/, "")}/${key}` : `https://${bucketName}.r2.dev/${key}`;
  console.log(`✅ Upload successful!`);
  console.log(`📍 Key: ${key}`);
  console.log(`🌐 Public URL: ${viewUrl}`);
}

async function main() {
  switch (command) {
    case "list":
      await listObjects(arg1);
      break;
    case "presign":
      await generatePresignedUrl(arg1, arg2);
      break;
    case "upload":
      await uploadFile(arg1, arg2);
      break;
    default:
      console.log(`Cloudflare R2 CLI Helper
Commands:
  node --env-file=.env.local scripts/r2-cli.mjs list [prefix]
  node --env-file=.env.local scripts/r2-cli.mjs presign <key> [contentType]
  node --env-file=.env.local scripts/r2-cli.mjs upload <filePath> [key]
`);
  }
}

main().catch((err) => {
  console.error("❌ R2 Error:", err.message);
  process.exit(1);
});
