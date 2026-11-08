import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  __setR2ClientForTests,
  loadMetadataIndex,
  updateMetadataIndex,
  MetadataConflictError,
} from "../r2";
import type { ProjectAsset } from "@/types/tenant";

/**
 * In-memory fake R2 client implementing conditional PutObject (IfMatch / IfNoneMatch)
 * and GetObject with deterministic ETag generation.
 */
function createFakeR2Client(options?: { alwaysFailPrecondition?: boolean }) {
  const store = new Map<string, { body: string; etag: string }>();
  let versionCounter = 0;

  return {
    store,
    client: {
      send: async (command: any) => {
        const name = command?.constructor?.name;
        const input = command?.input || {};
        const key: string = input.Key;

        if (name === "GetObjectCommand") {
          const entry = store.get(key);
          if (!entry) {
            const err: any = new Error("The specified key does not exist.");
            err.name = "NoSuchKey";
            err.$metadata = { httpStatusCode: 404 };
            throw err;
          }
          return {
            ETag: entry.etag,
            Body: {
              transformToString: async () => entry.body,
            },
          };
        }

        if (name === "PutObjectCommand") {
          // Yield to microtask queue to simulate network interleaving across concurrent callers
          await new Promise((resolve) => setImmediate(resolve));

          if (options?.alwaysFailPrecondition) {
            const err: any = new Error("At least one of the pre-conditions you specified did not hold");
            err.name = "PreconditionFailed";
            err.$metadata = { httpStatusCode: 412 };
            throw err;
          }

          const current = store.get(key);
          if (input.IfNoneMatch === "*" && current) {
            const err: any = new Error("Object already exists");
            err.name = "PreconditionFailed";
            err.$metadata = { httpStatusCode: 412 };
            throw err;
          }
          if (input.IfMatch && (!current || current.etag !== input.IfMatch)) {
            const err: any = new Error("ETag mismatch");
            err.name = "PreconditionFailed";
            err.$metadata = { httpStatusCode: 412 };
            throw err;
          }

          const nextEtag = `"etag-${++versionCounter}"`;
          const bodyStr = Buffer.isBuffer(input.Body)
            ? input.Body.toString("utf-8")
            : String(input.Body ?? "");
          store.set(key, { body: bodyStr, etag: nextEtag });
          return { ETag: nextEtag };
        }

        return {};
      },
    },
  };
}

function makeAsset(id: string, folderId?: string): ProjectAsset {
  return {
    id,
    name: id,
    title: id.toUpperCase(),
    folderId,
    updatedAt: new Date().toISOString(),
    source: "upload",
  };
}

describe("R2 metadata index optimistic concurrency (M3 / R6)", () => {
  beforeEach(() => {
    __setR2ClientForTests(null);
  });

  afterEach(() => {
    __setR2ClientForTests(null);
  });

  it("preserves all concurrent upload, delete, and move mutations across 100 iterations", async () => {
    for (let iter = 0; iter < 100; iter++) {
      const fake = createFakeR2Client();
      __setR2ClientForTests(fake.client as any);

      // Seed initial assets C (to be deleted) and D (to be moved)
      await updateMetadataIndex(
        "org_1",
        "proj_1",
        () => [makeAsset("C"), makeAsset("D", "folder-old")],
        { maxAttempts: 8, backoffBaseMs: 1 }
      );

      // Run 4 concurrent operations: upload(A), upload(B), delete(C), move(D)
      await Promise.all([
        updateMetadataIndex(
          "org_1",
          "proj_1",
          (items) => [makeAsset("A"), ...items.filter((x) => x.id !== "A")],
          { maxAttempts: 8, backoffBaseMs: 1 }
        ),
        updateMetadataIndex(
          "org_1",
          "proj_1",
          (items) => [makeAsset("B"), ...items.filter((x) => x.id !== "B")],
          { maxAttempts: 8, backoffBaseMs: 1 }
        ),
        updateMetadataIndex(
          "org_1",
          "proj_1",
          (items) => items.filter((x) => x.id !== "C"),
          { maxAttempts: 8, backoffBaseMs: 1 }
        ),
        updateMetadataIndex(
          "org_1",
          "proj_1",
          (items) =>
            items.map((x) => (x.id === "D" ? { ...x, folderId: "folder-new" } : x)),
          { maxAttempts: 8, backoffBaseMs: 1 }
        ),
      ]);

      const finalItems = await loadMetadataIndex("org_1", "proj_1");
      const ids = finalItems.map((i) => i.id).sort();
      expect(ids).toEqual(["A", "B", "D"]);
      expect(finalItems.find((i) => i.id === "D")?.folderId).toBe("folder-new");
    }
  });

  it("resolves first-write races using If-None-Match: *", async () => {
    const fake = createFakeR2Client();
    __setR2ClientForTests(fake.client as any);

    await Promise.all([
      updateMetadataIndex(
        "org_1",
        "proj_init",
        (items) => [...items, makeAsset("first-1")],
        { maxAttempts: 5, backoffBaseMs: 1 }
      ),
      updateMetadataIndex(
        "org_1",
        "proj_init",
        (items) => [...items, makeAsset("first-2")],
        { maxAttempts: 5, backoffBaseMs: 1 }
      ),
    ]);

    const finalItems = await loadMetadataIndex("org_1", "proj_init");
    expect(finalItems.map((i) => i.id).sort()).toEqual(["first-1", "first-2"]);
  });

  it("throws MetadataConflictError (409) when 412 retries are exhausted", async () => {
    const fake = createFakeR2Client({ alwaysFailPrecondition: true });
    __setR2ClientForTests(fake.client as any);

    await expect(
      updateMetadataIndex("org_1", "proj_busy", (items) => [...items, makeAsset("X")], {
        maxAttempts: 3,
        backoffBaseMs: 1,
      })
    ).rejects.toThrow(MetadataConflictError);
  });
});

