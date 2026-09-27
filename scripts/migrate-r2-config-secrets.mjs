import nextEnv from "@next/env";
import {
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes("--apply");
const accountId = process.env.R2_ACCOUNT_ID;
const bucketName = process.env.R2_BUCKET_NAME || "second-screen-assets";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!accountId || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials are required in the environment.");
}
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service-role credentials are required in the environment.");
}

const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

let continuationToken;
let scanned = 0;
let withCredentials = 0;
let updated = 0;

do {
    const page = await r2.send(
        new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
        })
    );

    for (const object of page.Contents || []) {
        if (!object.Key?.endsWith("/config.json")) continue;
        scanned += 1;

        const pathParts = object.Key.split("/");
        if (pathParts.length !== 3) continue;
        const [orgId, projectId] = pathParts;

        const storedObject = await r2.send(
            new GetObjectCommand({ Bucket: bucketName, Key: object.Key })
        );
        if (!storedObject.Body) continue;
        const config = JSON.parse(await storedObject.Body.transformToString("utf-8"));
        const assetGitConfig = config.assetGitConfig;
        const assetFigmaConfig = config.assetFigmaConfig;
        const hasCredentials = Boolean(assetGitConfig?.pat || assetFigmaConfig?.pat);
        if (hasCredentials) withCredentials += 1;

        if (!applyChanges) continue;

        if (hasCredentials) {
            const { data: existingIntegration, error: lookupError } = await supabase
                .from("project_integrations")
                .select("asset_git_config, asset_figma_config")
                .eq("project_id", projectId)
                .maybeSingle();
            if (lookupError) throw lookupError;

            const { error: saveError } = await supabase.from("project_integrations").upsert(
                {
                    project_id: projectId,
                    org_id: orgId,
                    asset_git_config: assetGitConfig?.pat
                        ? assetGitConfig
                        : existingIntegration?.asset_git_config || assetGitConfig || {},
                    asset_figma_config: assetFigmaConfig?.pat
                        ? assetFigmaConfig
                        : existingIntegration?.asset_figma_config || assetFigmaConfig || {},
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "project_id" }
            );
            if (saveError) throw saveError;
        }

        for (const field of ["assetGitConfig", "assetFigmaConfig"]) {
            if (config[field] && typeof config[field] === "object") {
                config[field] = { ...config[field], pat: "" };
            }
        }

        await r2.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: object.Key,
                Body: Buffer.from(JSON.stringify(config, null, 2), "utf-8"),
                ContentType: "application/json",
                CacheControl: "no-cache, no-store, must-revalidate",
            })
        );
        updated += 1;
    }

    continuationToken = page.NextContinuationToken;
} while (continuationToken);

console.log(
    `${applyChanges ? "Applied" : "Dry run"}: scanned ${scanned} config objects; ${withCredentials} contain integration credentials; ${updated} objects migrated and sanitized.`
);
if (!applyChanges) {
    console.log("No data was changed. Re-run with --apply after applying the security migration.");
}