import { performance } from "perf_hooks";

// Simulated network delay in ms
const SIMULATED_LATENCY_MS = 50;

function simulatedFetch(url) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        json: async () => ({
          images: {
            "node_1": "https://figma.com/img1",
            "node_2": "https://figma.com/img2"
          }
        }),
        text: async () => `<svg>mock svg</svg>`
      });
    }, SIMULATED_LATENCY_MS);
  });
}

// 1. Sequential approach (Current Code)
async function fetchImageUrlsSequential(fileKey, nodeIds, chunkSize = 80) {
  const imageUrlMap = {};
  for (let i = 0; i < nodeIds.length; i += chunkSize) {
    const chunk = nodeIds.slice(i, i + chunkSize);
    const imgRes = await simulatedFetch(
      `https://api.figma.com/v1/images/${fileKey}?ids=${chunk.join(",")}&format=svg`
    );

    if (imgRes.ok) {
      const imgData = await imgRes.json();
      if (imgData.images) {
        Object.assign(imageUrlMap, imgData.images);
      }
    }
  }
  return imageUrlMap;
}

// 2. Parallel approach (Optimized Code)
async function fetchImageUrlsParallel(fileKey, nodeIds, chunkSize = 80) {
  const imageUrlMap = {};
  const chunks = [];
  for (let i = 0; i < nodeIds.length; i += chunkSize) {
    chunks.push(nodeIds.slice(i, i + chunkSize));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const imgRes = await simulatedFetch(
          `https://api.figma.com/v1/images/${fileKey}?ids=${chunk.join(",")}&format=svg`
        );

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          if (imgData.images) {
            Object.assign(imageUrlMap, imgData.images);
          }
        }
      } catch (err) {
        console.warn(`Error fetching chunk:`, err);
      }
    })
  );

  return imageUrlMap;
}

async function runBenchmark() {
  // Generate 800 node IDs (10 chunks of size 80)
  const nodeIds = Array.from({ length: 800 }, (_, i) => `node_${i}`);
  const fileKey = "testFileKey";

  console.log(`--- Figma Asset Fetch Benchmark ---`);
  console.log(`Total Node IDs: ${nodeIds.length}, Chunk Size: 80, Simulated Network Latency: ${SIMULATED_LATENCY_MS}ms/request\n`);

  // Sequential Benchmark
  const startSeq = performance.now();
  await fetchImageUrlsSequential(fileKey, nodeIds);
  const endSeq = performance.now();
  const seqTime = endSeq - startSeq;

  console.log(`Sequential execution time: ${seqTime.toFixed(2)} ms`);

  // Parallel Benchmark
  const startPar = performance.now();
  await fetchImageUrlsParallel(fileKey, nodeIds);
  const endPar = performance.now();
  const parTime = endPar - startPar;

  console.log(`Parallel execution time:   ${parTime.toFixed(2)} ms`);

  const speedup = ((seqTime - parTime) / seqTime) * 100;
  console.log(`\nImprovement: ${speedup.toFixed(2)}% faster (${(seqTime / parTime).toFixed(2)}x speedup)`);
}

runBenchmark();
