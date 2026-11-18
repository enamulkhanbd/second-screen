import { NextRequest, NextResponse } from "next/server";
import { authorizeProjectRequest } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isR2Configured } from "@/lib/r2";
import {
  SNAPSHOT_OFFLOAD_THRESHOLD_BYTES,
  loadProjectSnapshot,
  stripBranchPayloads,
  uploadProjectSnapshot,
} from "@/lib/r2Snapshots";
import { cacheDel } from "@/lib/cache/redis";
import { extractThemeGroups } from "@/utils/themeHelpers";
import type { ProjectBranch, RawTokensDocument, ThemeGroup } from "@/types/tokens";

export const dynamic = "force-dynamic";

function isMissingSnapshotColumnError(error: any): boolean {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  const code = String(error?.code || "");
  return (
    code === "42703" ||
    code === "PGRST204" ||
    msg.includes("storage_mode") ||
    msg.includes("snapshot_r2_key") ||
    msg.includes("snapshot_hash") ||
    msg.includes("snapshot_bytes")
  );
}

/**
 * GET /api/projects/snapshot?orgId=...&projectId=...
 * Hydrates a project's token tree and branch snapshots from Cloudflare R2 (or inline DB fallback).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const projectId = searchParams.get("projectId");

    if (!orgId || !projectId) {
      return NextResponse.json(
        { success: false, error: "Both orgId and projectId are required." },
        { status: 400 }
      );
    }

    const access = await authorizeProjectRequest(req, orgId, projectId, "read");
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json(
        { success: false, error: "Project not found." },
        { status: error ? 503 : 404 }
      );
    }

    const snapshotKey: string | undefined =
      row.snapshot_r2_key || row.extra_data?.r2Snapshot?.key || undefined;
    const isR2 =
      Boolean(snapshotKey) &&
      (row.storage_mode === "r2" || row.extra_data?.r2Snapshot?.storageMode === "r2");

    if (isR2 && snapshotKey) {
      if (!isR2Configured) {
        return NextResponse.json(
          { success: false, error: "R2 storage is not configured to read project snapshot." },
          { status: 503 }
        );
      }
      const snapshot = await loadProjectSnapshot(snapshotKey);
      return NextResponse.json({
        success: true,
        storageMode: "r2",
        snapshotR2Key: snapshotKey,
        snapshotHash: row.snapshot_hash || row.extra_data?.r2Snapshot?.hash || null,
        rawTokens: snapshot.rawTokens || {},
        themeGroups: snapshot.themeGroups || row.theme_groups || [],
        branches: snapshot.branches || row.branches || [],
      });
    }

    return NextResponse.json({
      success: true,
      storageMode: "inline",
      rawTokens: row.raw_tokens || {},
      themeGroups: row.theme_groups || [],
      branches: row.branches || [],
    });
  } catch (err: any) {
    console.error("Snapshot GET error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load project snapshot." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/snapshot
 * Persists project tokens and branches, automatically offloading >= 100 KB payloads
 * to gzipped Cloudflare R2 objects while keeping slim metadata in Supabase Postgres.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orgId,
      projectId,
      rawTokens,
      themeGroups,
      branches,
      activeBranch,
    }: {
      orgId?: string;
      projectId?: string;
      rawTokens?: RawTokensDocument;
      themeGroups?: ThemeGroup[];
      branches?: ProjectBranch[];
      activeBranch?: string;
    } = body || {};

    if (!orgId || !projectId) {
      return NextResponse.json(
        { success: false, error: "Both orgId and projectId are required." },
        { status: 400 }
      );
    }

    const access = await authorizeProjectRequest(req, orgId, projectId, "write");
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const safeBranches = Array.isArray(branches) ? branches : [];
    const resolvedThemeGroups =
      themeGroups !== undefined
        ? themeGroups
        : rawTokens !== undefined
          ? extractThemeGroups(rawTokens)
          : undefined;

    const approxBytes = Buffer.byteLength(
      JSON.stringify({
        rawTokens: rawTokens ?? {},
        branches: safeBranches,
        themeGroups: resolvedThemeGroups ?? [],
      }),
      "utf8"
    );

    const shouldOffloadToR2 =
      isR2Configured && approxBytes >= SNAPSHOT_OFFLOAD_THRESHOLD_BYTES;

    const admin = createAdminClient();
    const now = new Date().toISOString();

    if (shouldOffloadToR2) {
      const { data: existingRow, error: readErr } = await admin
        .from("projects")
        .select("extra_data, raw_tokens, theme_groups")
        .eq("id", projectId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (readErr || !existingRow) {
        return NextResponse.json(
          { success: false, error: "Project not found." },
          { status: readErr ? 503 : 404 }
        );
      }

      const effectiveRawTokens =
        rawTokens !== undefined ? rawTokens : (existingRow.raw_tokens || {});
      const effectiveThemeGroups =
        resolvedThemeGroups !== undefined
          ? resolvedThemeGroups
          : (existingRow.theme_groups || []);

      const uploaded = await uploadProjectSnapshot(orgId, projectId, {
        rawTokens: effectiveRawTokens,
        themeGroups: effectiveThemeGroups,
        branches: safeBranches,
      });

      const nextExtraData = {
        ...(existingRow.extra_data || {}),
        r2Snapshot: {
          storageMode: "r2",
          key: uploaded.key,
          hash: uploaded.hash,
          bytes: uploaded.gzipBytes,
          rawBytes: uploaded.rawBytes,
          updatedAt: now,
        },
      };

      const baseUpdate: Record<string, any> = {
        raw_tokens: {},
        branches: stripBranchPayloads(safeBranches),
        theme_groups: effectiveThemeGroups,
        extra_data: nextExtraData,
        updated_at: now,
      };
      if (activeBranch) baseUpdate.active_branch = activeBranch;

      const withColumnsUpdate = {
        ...baseUpdate,
        storage_mode: "r2",
        snapshot_r2_key: uploaded.key,
        snapshot_hash: uploaded.hash,
        snapshot_bytes: uploaded.gzipBytes,
      };

      let { data: updatedRows, error: updateErr } = await admin
        .from("projects")
        .update(withColumnsUpdate)
        .eq("id", projectId)
        .eq("org_id", orgId)
        .select("id");

      // Graceful compatibility before 20261117_project_r2_snapshots.sql is applied
      if (updateErr && isMissingSnapshotColumnError(updateErr)) {
        const retry = await admin
          .from("projects")
          .update(baseUpdate)
          .eq("id", projectId)
          .eq("org_id", orgId)
          .select("id");
        updatedRows = retry.data;
        updateErr = retry.error;
      }

      if (updateErr) {
        throw updateErr;
      }
      if (!updatedRows?.length) {
        return NextResponse.json({ success: false, error: "Project not found." }, { status: 404 });
      }

      await cacheDel(
        `tokens:etag:${orgId}:${projectId}:${activeBranch || "main"}`,
        `tokens:etag:${orgId}:${projectId}:default`
      );

      return NextResponse.json({
        success: true,
        storageMode: "r2",
        snapshotR2Key: uploaded.key,
        snapshotHash: uploaded.hash,
        rawBytes: uploaded.rawBytes,
        gzipBytes: uploaded.gzipBytes,
      });
    }

    // Inline fallback for small payloads (< 100 KB) or when R2 is unconfigured
    const inlineUpdate: Record<string, any> = {
      branches: safeBranches,
      updated_at: now,
    };
    if (rawTokens !== undefined) {
      inlineUpdate.raw_tokens = rawTokens;
      inlineUpdate.theme_groups = resolvedThemeGroups || [];
    } else if (resolvedThemeGroups !== undefined) {
      inlineUpdate.theme_groups = resolvedThemeGroups;
    }
    if (activeBranch) inlineUpdate.active_branch = activeBranch;

    const withInlineCols = {
      ...inlineUpdate,
      storage_mode: "inline",
      snapshot_r2_key: null,
      snapshot_hash: null,
      snapshot_bytes: null,
    };

    let { data: updatedRows, error: updateErr } = await admin
      .from("projects")
      .update(withInlineCols)
      .eq("id", projectId)
      .eq("org_id", orgId)
      .select("id");

    if (updateErr && isMissingSnapshotColumnError(updateErr)) {
      const retry = await admin
        .from("projects")
        .update(inlineUpdate)
        .eq("id", projectId)
        .eq("org_id", orgId)
        .select("id");
      updatedRows = retry.data;
      updateErr = retry.error;
    }

    if (updateErr) throw updateErr;
    if (!updatedRows?.length) {
      return NextResponse.json({ success: false, error: "Project not found." }, { status: 404 });
    }

    await cacheDel(
      `tokens:etag:${orgId}:${projectId}:${activeBranch || "main"}`,
      `tokens:etag:${orgId}:${projectId}:default`
    );

    return NextResponse.json({
      success: true,
      storageMode: "inline",
      rawBytes: approxBytes,
    });
  } catch (err: any) {
    console.error("Snapshot POST error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to persist project snapshot." },
      { status: 500 }
    );
  }
}
