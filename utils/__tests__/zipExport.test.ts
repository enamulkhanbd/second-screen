import { describe, it, expect } from "vitest";
import JSZip from "jszip";

interface AssetMock {
  id: string;
  name: string;
  title?: string;
  type?: string;
  category?: string;
  contentType?: string;
  svg?: string;
  url?: string;
}

// Simulated fetch function with network latency
async function mockFetchSvgContentSafely(url: string, inlineSvg?: string, delayMs: number = 30): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (inlineSvg) return inlineSvg;
  return `<svg id="${url}"><path d="M0 0h10v10H0z"/></svg>`;
}

async function mockFetchAssetArrayBufferSafely(url: string, delayMs: number = 30): Promise<ArrayBuffer> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return new TextEncoder().encode("binary-data").buffer;
}

function enrichSvgWithName(rawSvg: string, iconName: string): string {
  if (!rawSvg || typeof rawSvg !== "string") return rawSvg;
  const nameClean = iconName.trim();
  if (!nameClean) return rawSvg;

  let formatted = rawSvg.trim();
  const svgTagMatch = formatted.match(/<svg\b[^>]*>/i);
  if (svgTagMatch) {
    let svgTag = svgTagMatch[0];
    if (/\bid=["'][^"']*["']/i.test(svgTag)) {
      svgTag = svgTag.replace(/\bid=["'][^"']*["']/i, `id="${nameClean}"`);
    } else {
      svgTag = svgTag.replace(/<svg\b/i, `<svg id="${nameClean}"`);
    }
    if (/\bdata-name=["'][^"']*["']/i.test(svgTag)) {
      svgTag = svgTag.replace(/\bdata-name=["'][^"']*["']/i, `data-name="${nameClean}"`);
    } else {
      svgTag = svgTag.replace(/<svg\b/i, `<svg data-name="${nameClean}"`);
    }
    formatted = formatted.replace(svgTagMatch[0], svgTag);
  }

  if (/<title\b[^>]*>.*?<\/title>/i.test(formatted)) {
    formatted = formatted.replace(/<title\b[^>]*>.*?<\/title>/i, `<title>${nameClean}</title>`);
  } else {
    formatted = formatted.replace(/(<svg\b[^>]*>)/i, `$1<title>${nameClean}</title>`);
  }

  return formatted;
}

// Sequential Implementation (Current Baseline)
async function processAssetsForZipSequential(targetAssets: AssetMock[], fetchDelay: number = 30) {
  const zip = new JSZip();
  for (const asset of targetAssets) {
    const typeFolder = asset.type || "general";
    const catFolder = asset.category || "general";
    const assetName = asset.name || asset.title || "asset";
    const isSvg = asset.contentType?.includes("svg") || asset.name.endsWith(".svg") || !!asset.svg;

    if (isSvg) {
      let svgContent = "";
      try {
        svgContent = await mockFetchSvgContentSafely(asset.url || "", asset.svg, fetchDelay);
      } catch { continue; }
      if (!svgContent) continue;

      const enriched = enrichSvgWithName(svgContent, assetName);
      zip.file(`${typeFolder}/${catFolder}/${assetName.endsWith(".svg") ? assetName : `${assetName}.svg`}`, enriched);
    } else if (asset.url) {
      try {
        const arrayBuffer = await mockFetchAssetArrayBufferSafely(asset.url, fetchDelay);
        zip.file(`${typeFolder}/${catFolder}/${assetName}.png`, arrayBuffer);
      } catch { continue; }
    }
  }
  return zip;
}

// Concurrent Implementation (Optimized)
async function processAssetsForZipConcurrent(targetAssets: AssetMock[], fetchDelay: number = 30) {
  const zip = new JSZip();
  const filePromises = targetAssets.map(async (asset) => {
    const typeFolder = asset.type || "general";
    const catFolder = asset.category || "general";
    const assetName = asset.name || asset.title || "asset";
    const isSvg = asset.contentType?.includes("svg") || asset.name.endsWith(".svg") || !!asset.svg;

    if (isSvg) {
      try {
        const svgContent = await mockFetchSvgContentSafely(asset.url || "", asset.svg, fetchDelay);
        if (!svgContent) return null;
        const enriched = enrichSvgWithName(svgContent, assetName);
        return {
          path: `${typeFolder}/${catFolder}/${assetName.endsWith(".svg") ? assetName : `${assetName}.svg`}`,
          content: enriched,
        };
      } catch {
        return null;
      }
    } else if (asset.url) {
      try {
        const arrayBuffer = await mockFetchAssetArrayBufferSafely(asset.url, fetchDelay);
        return {
          path: `${typeFolder}/${catFolder}/${assetName}.png`,
          content: arrayBuffer,
        };
      } catch {
        return null;
      }
    }
    return null;
  });

  const files = await Promise.all(filePromises);
  for (const file of files) {
    if (file) {
      zip.file(file.path, file.content);
    }
  }

  return zip;
}

describe("Zip Export Performance Benchmark & Correctness", () => {
  const sampleAssets: AssetMock[] = Array.from({ length: 15 }, (_, i) => ({
    id: `asset-${i}`,
    name: `icon-${i}.svg`,
    title: `Icon ${i}`,
    type: "stroke",
    category: "actions",
    contentType: "image/svg+xml",
    url: `https://example.com/icons/icon-${i}.svg`,
  }));

  it("produces identical zip contents between sequential and concurrent", async () => {
    const zipSeq = await processAssetsForZipSequential(sampleAssets, 0);
    const zipConc = await processAssetsForZipConcurrent(sampleAssets, 0);

    const filesSeq = Object.keys(zipSeq.files).filter((k) => !zipSeq.files[k].dir).sort();
    const filesConc = Object.keys(zipConc.files).filter((k) => !zipConc.files[k].dir).sort();

    expect(filesConc).toEqual(filesSeq);
    expect(filesConc.length).toBe(15);
  });

  it("demonstrates significant speedup with concurrent fetching", async () => {
    const fetchDelay = 20; // 20ms simulated per fetch

    const startSeq = Date.now();
    await processAssetsForZipSequential(sampleAssets, fetchDelay);
    const seqDuration = Date.now() - startSeq;

    const startConc = Date.now();
    await processAssetsForZipConcurrent(sampleAssets, fetchDelay);
    const concDuration = Date.now() - startConc;

    console.log(`\n📊 Zip Export Performance Benchmark (15 items @ 20ms delay):`);
    console.log(`   Sequential (Baseline): ${seqDuration}ms`);
    console.log(`   Concurrent (Optimized): ${concDuration}ms`);
    console.log(`   Speedup: ${(seqDuration / concDuration).toFixed(2)}x faster\n`);

    expect(concDuration).toBeLessThan(seqDuration / 3);
  });
});
