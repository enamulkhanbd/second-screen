import { describe, it, expect } from "vitest";
import { mapLimit } from "../pool";

describe("mapLimit", () => {
  it("never exceeds the specified concurrency limit and preserves result order", async () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const limit = 4;
    let inFlight = 0;
    let maxInFlight = 0;

    const results = await mapLimit(items, limit, async (item) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5 + (item % 3) * 5));
      inFlight--;
      return item * 2;
    });

    expect(maxInFlight).toBeLessThanOrEqual(limit);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(results).toHaveLength(items.length);
    results.forEach((res, idx) => {
      expect(res).toEqual({ status: "fulfilled", value: idx * 2 });
    });
  });

  it("collects rejections without aborting other items", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapLimit(items, 2, async (item) => {
      if (item === 3) throw new Error("boom-3");
      return item * 10;
    });

    expect(results[0]).toEqual({ status: "fulfilled", value: 10 });
    expect(results[1]).toEqual({ status: "fulfilled", value: 20 });
    expect(results[2].status).toBe("rejected");
    expect((results[2] as PromiseRejectedResult).reason.message).toBe("boom-3");
    expect(results[3]).toEqual({ status: "fulfilled", value: 40 });
    expect(results[4]).toEqual({ status: "fulfilled", value: 50 });
  });

  it("handles empty input arrays", async () => {
    const results = await mapLimit([], 5, async () => 1);
    expect(results).toEqual([]);
  });
});

