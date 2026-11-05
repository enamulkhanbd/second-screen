/**
 * Bounded concurrency worker pool.
 * Executes `fn` across `items` with at most `limit` in-flight promises at any time,
 * preserving input order and returning settled results without short-circuiting on rejection.
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  if (items.length === 0) return out;

  const safeLimit = Math.max(1, Math.floor(limit || 1));
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(safeLimit, items.length) }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        try {
          out[i] = { status: "fulfilled", value: await fn(items[i], i) };
        } catch (reason) {
          out[i] = { status: "rejected", reason };
        }
      }
    })
  );

  return out;
}

