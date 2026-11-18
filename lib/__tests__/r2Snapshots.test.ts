import { describe, expect, it } from "vitest";
import zlib from "zlib";
import {
  __setSnapshotR2ClientForTests,
  hydrateProjectFromR2Snapshot,
  loadProjectSnapshot,
  stripBranchPayloads,
  uploadProjectSnapshot,
} from "../r2Snapshots";
import type { Project } from "@/types/tenant";

describe("lib/r2Snapshots gzipped R2 project snapshot storage", () => {
  it("uploads gzipped snapshots under content-addressed R2 keys and roundtrips cleanly", async () => {
    const store = new Map<string, Uint8Array>();
    __setSnapshotR2ClientForTests({
      send: async (cmd: any) => {
        if (cmd.input?.Body) {
          store.set(cmd.input.Key, cmd.input.Body);
          return {};
        }
        const bytes = store.get(cmd.input.Key);
        if (!bytes) throw new Error("NotFound");
        return {
          Body: {
            transformToByteArray: async () => bytes,
          },
        };
      },
    } as any);

    const payload = {
      rawTokens: {
        core: {
          brand: { primary: { $value: "#2563eb", $type: "color" } },
        },
      },
      themeGroups: [],
      branches: [
        {
          id: "b1",
          name: "main",
          title: "Main",
          isDefault: true,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
          createdBy: { name: "Dev", email: "dev@example.com" },
          rawTokens: { core: { brand: { primary: { $value: "#2563eb", $type: "color" } } } },
          themeGroups: [],
          commits: [],
          comments: [],
        },
      ],
    };

    const meta = await uploadProjectSnapshot("org_1", "proj_1", payload);
    expect(meta.key).toMatch(/^orgs\/org_1\/projects\/proj_1\/snapshots\/[a-f0-9]{64}\.json\.gz$/);
    const storedBytes = store.get(meta.key)!;
    expect(storedBytes[0]).toBe(0x1f);
    expect(storedBytes[1]).toBe(0x8b);
    expect(JSON.parse(zlib.gunzipSync(storedBytes).toString("utf8")).rawTokens.core.brand.primary.$value).toBe("#2563eb");

    const loaded = await loadProjectSnapshot(meta.key);
    expect(loaded.rawTokens).toEqual(payload.rawTokens);
    expect(loaded.branches).toHaveLength(1);

    const hydrated = await hydrateProjectFromR2Snapshot({
      id: "proj_1",
      orgId: "org_1",
      name: "P1",
      slug: "p1",
      storageMode: "r2",
      snapshotR2Key: meta.key,
      rawTokens: {},
      branches: stripBranchPayloads(payload.branches),
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    } satisfies Project);
    expect(hydrated.rawTokens).toEqual(payload.rawTokens);
    expect(hydrated.branches?.[0].rawTokens).toEqual(payload.branches[0].rawTokens);

    __setSnapshotR2ClientForTests(null);
  });

  it("stripBranchPayloads removes heavy token trees while keeping branch metadata", () => {
    const slim = stripBranchPayloads([
      {
        id: "b1",
        name: "main",
        title: "Main",
        isDefault: true,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
        createdBy: { name: "A", email: "a@example.com" },
        rawTokens: { huge: { a: { $value: "#000", $type: "color" } } },
        themeGroups: [{ id: "g1", name: "Mode", color: "#000", options: [] }],
        commits: [],
        comments: [],
      },
    ]);

    expect(slim[0].name).toBe("main");
    expect(slim[0].commits).toEqual([]);
    expect(slim[0].rawTokens).toEqual({});
    expect(slim[0].themeGroups).toEqual([]);
  });
});
