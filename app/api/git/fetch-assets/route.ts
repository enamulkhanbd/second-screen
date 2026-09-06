import { NextRequest, NextResponse } from "next/server";
import { AssetGitConfig, ProjectAsset } from "@/types/tenant";

export const dynamic = "force-dynamic";

/**
 * Sanitizes SVG string to strip out scripts and dangerous tags
 */
function sanitizeSvg(rawSvg: string): string {
  let cleaned = rawSvg.trim();
  cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, "");
  cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, "");
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  return cleaned.trim();
}

/**
 * Normalizes string keys for matching (e.g., "IconUnavailable" -> "unavailable", "add-circle" -> "addcircle")
 */
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/^icon[-_]?/i, "")
    .replace(/[^a-z0-9]/g, "");
}

interface RawMetadataItem {
  name?: string;
  title?: string;
  type?: string;
  iconType?: string;
  icon_type?: string;
  tag?: string;
  category?: string;
  [key: string]: any;
}

const KNOWN_TYPE_NAMES = new Set([
  "stroke", "twotone", "two-tone", "solid", "filled", "outline", "bulk", "broken", "linear",
  "bold", "curved", "light", "thin", "duotone", "duo-tone", "regular", "glyph", "sharp", "flat"
]);

function parseMetadataJson(content: string): Map<string, RawMetadataItem> {
  const map = new Map<string, RawMetadataItem>();
  try {
    const parsed = JSON.parse(content);
    const items: RawMetadataItem[] = Array.isArray(parsed)
      ? parsed
      : parsed.icons && Array.isArray(parsed.icons)
      ? parsed.icons
      : typeof parsed === "object"
      ? Object.entries(parsed).map(([k, v]: [string, any]) => ({
          name: k,
          ...(typeof v === "object" && v !== null ? v : {}),
        }))
      : [];

    for (const item of items) {
      if (!item) continue;
      const typeKey = (item.type || item.iconType || item.icon_type || item.variant || "").toLowerCase();

      if (item.name) {
        const normName = normalizeKey(item.name);
        map.set(normName, item);
        map.set(item.name.toLowerCase(), item);
        if (typeKey) {
          map.set(`${normalizeKey(typeKey)}::${normName}`, item);
        }
      }
      if (item.title) {
        const normTitle = normalizeKey(item.title);
        map.set(normTitle, item);
        map.set(item.title.toLowerCase(), item);
        if (typeKey) {
          map.set(`${normalizeKey(typeKey)}::${normTitle}`, item);
        }
      }
    }
  } catch (err) {
    console.warn("Failed to parse metadata.json:", err);
  }
  return map;
}

/**
 * Derives icon name, title, type, and category from a multi-layer file path and metadata map
 */
function parseIconMeta(
  filePath: string,
  baseFolder?: string,
  metadataMap?: Map<string, RawMetadataItem>
): { name: string; title?: string; type?: string; category: string; tag?: string } {
  let normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (baseFolder) {
    const cleanBase = baseFolder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    if (normalized.toLowerCase().startsWith(cleanBase.toLowerCase() + "/")) {
      normalized = normalized.slice(cleanBase.length + 1);
    }
  }

  const parts = normalized.split("/");
  const fileName = parts.pop() || "";
  const stem = fileName.replace(/\.svg$/i, "");

  let derivedType: string | undefined = undefined;
  let derivedCategory = "general";

  if (parts.length >= 2) {
    derivedType = parts[0];
    derivedCategory = parts.slice(1).join("-");
  } else if (parts.length === 1) {
    const singleFolder = parts[0];
    if (KNOWN_TYPE_NAMES.has(singleFolder.toLowerCase())) {
      derivedType = singleFolder;
      derivedCategory = "general";
    } else {
      derivedCategory = singleFolder;
    }
  }

  // Check against metadataMap (exact composite type::stem match first, then stem fallback)
  if (metadataMap) {
    const matched =
      (derivedType ? metadataMap.get(`${normalizeKey(derivedType)}::${normalizeKey(stem)}`) : undefined) ||
      metadataMap.get(normalizeKey(stem)) ||
      metadataMap.get(stem.toLowerCase()) ||
      metadataMap.get(normalizeKey(fileName));

    if (matched) {
      const resolvedType = matched.type || matched.iconType || matched.icon_type || matched.variant || derivedType || undefined;
      return {
        name: matched.name || stem,
        title: matched.title || stem,
        type: resolvedType,
        category: matched.category || derivedCategory,
        tag: matched.tag || undefined,
      };
    }
  }

  return { name: stem, title: stem, type: derivedType, category: derivedCategory };
}

export async function POST(req: NextRequest) {
  try {
    const body: AssetGitConfig = await req.json();
    const { provider, owner, project, repo, branch = "main", assetFolder, pat } = body;

    if (!provider || !owner || !repo || !pat) {
      return NextResponse.json(
        { success: false, error: "Missing required Git connection credentials (provider, owner, repo, pat)." },
        { status: 400 }
      );
    }

    const cleanFolder = assetFolder ? assetFolder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase() : "";
    const assets: ProjectAsset[] = [];
    let metadataMap = new Map<string, RawMetadataItem>();

    if (provider === "github") {
      // 1. Fetch Repository Tree Recursively from GitHub
      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
      const treeRes = await fetch(treeUrl, {
        headers: {
          Authorization: `token ${pat}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Tokens-Platform-Asset-Sync",
        },
      });

      if (!treeRes.ok) {
        const errData = await treeRes.json().catch(() => ({}));
        throw new Error(errData.message || `GitHub tree request failed (${treeRes.status})`);
      }

      const treeData = await treeRes.json();
      const treeItems: Array<{ path: string; type: string }> = treeData.tree || [];

      // Check if metadata.json exists
      const metadataItem = treeItems.find((item) => {
        const p = item.path.toLowerCase();
        if (cleanFolder) {
          return p === `${cleanFolder}/metadata.json` || p === `${cleanFolder}/$metadata.json` || p === "metadata.json";
        }
        return p.endsWith("metadata.json");
      });

      if (metadataItem) {
        try {
          const metaUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${metadataItem.path}`;
          const metaRes = await fetch(metaUrl, {
            headers: { Authorization: `token ${pat}`, "User-Agent": "Tokens-Platform-Asset-Sync" },
          });
          if (metaRes.ok) {
            const metaText = await metaRes.text();
            metadataMap = parseMetadataJson(metaText);
          }
        } catch (e) {
          console.warn("Could not fetch metadata.json from GitHub:", e);
        }
      }

      // Filter for SVG files
      const svgFiles = treeItems.filter((item) => {
        if (item.type !== "blob" || !item.path.toLowerCase().endsWith(".svg")) return false;
        if (!cleanFolder) return true;
        const itemLower = item.path.toLowerCase();
        return itemLower.startsWith(cleanFolder + "/") || itemLower === cleanFolder;
      });

      const targetFiles = svgFiles.slice(0, 5000);

      // Fetch raw contents in concurrent batches of 10
      const batchSize = 10;
      for (let i = 0; i < targetFiles.length; i += batchSize) {
        const batch = targetFiles.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (file) => {
            try {
              const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${file.path}`;
              const fileRes = await fetch(rawUrl, {
                headers: {
                  Authorization: `token ${pat}`,
                  "User-Agent": "Tokens-Platform-Asset-Sync",
                },
              });

              if (fileRes.ok) {
                const rawSvg = await fileRes.text();
                const sanitized = sanitizeSvg(rawSvg);
                if (sanitized.includes("<svg")) {
                  const meta = parseIconMeta(file.path, cleanFolder, metadataMap);
                  assets.push({
                    id: `git_${file.path.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
                    name: meta.name,
                    title: meta.title,
                    type: meta.type,
                    tag: meta.tag,
                    category: meta.category,
                    svg: sanitized,
                    path: file.path,
                    updatedAt: new Date().toISOString(),
                    source: "git",
                  });
                }
              }
            } catch (err) {
              console.warn(`Failed fetching SVG file ${file.path}:`, err);
            }
          })
        );
      }
    } else if (provider === "gitlab") {
      // 2. Fetch from GitLab
      const projectId = encodeURIComponent(`${owner}/${repo}`);
      const treeUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?ref=${encodeURIComponent(
        branch
      )}&recursive=true&per_page=100`;

      const treeRes = await fetch(treeUrl, {
        headers: { "PRIVATE-TOKEN": pat },
      });

      if (!treeRes.ok) {
        throw new Error(`GitLab tree request failed (${treeRes.status})`);
      }

      const treeData: Array<{ path: string; type: string }> = await treeRes.json();

      const metaFile = treeData.find((item) => item.path.toLowerCase().endsWith("metadata.json"));
      if (metaFile) {
        try {
          const metaUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(
            metaFile.path
          )}/raw?ref=${encodeURIComponent(branch)}`;
          const metaRes = await fetch(metaUrl, { headers: { "PRIVATE-TOKEN": pat } });
          if (metaRes.ok) {
            const metaText = await metaRes.text();
            metadataMap = parseMetadataJson(metaText);
          }
        } catch (e) {
          console.warn("Could not fetch metadata.json from GitLab:", e);
        }
      }

      const svgFiles = treeData.filter((item) => {
        if (item.type !== "blob" || !item.path.toLowerCase().endsWith(".svg")) return false;
        if (!cleanFolder) return true;
        const itemLower = item.path.toLowerCase();
        return itemLower.startsWith(cleanFolder + "/") || itemLower === cleanFolder;
      });

      const targetFiles = svgFiles.slice(0, 5000);
      for (const file of targetFiles) {
        try {
          const rawUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(
            file.path
          )}/raw?ref=${encodeURIComponent(branch)}`;
          const fileRes = await fetch(rawUrl, {
            headers: { "PRIVATE-TOKEN": pat },
          });
          if (fileRes.ok) {
            const rawSvg = await fileRes.text();
            const sanitized = sanitizeSvg(rawSvg);
            if (sanitized.includes("<svg")) {
              const meta = parseIconMeta(file.path, cleanFolder, metadataMap);
              assets.push({
                id: `git_${file.path.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
                name: meta.name,
                title: meta.title,
                type: meta.type,
                tag: meta.tag,
                category: meta.category,
                svg: sanitized,
                path: file.path,
                updatedAt: new Date().toISOString(),
                source: "git",
              });
            }
          }
        } catch (err) {
          console.warn(`Failed fetching GitLab SVG ${file.path}:`, err);
        }
      }
    } else if (provider === "azure") {
      // 3. Fetch from Azure DevOps
      const azureOrg = owner;
      const azureProj = project || repo;
      const treeUrl = `https://dev.azure.com/${azureOrg}/${azureProj}/_apis/git/repositories/${repo}/items?recursionLevel=full&versionDescriptor.version=${encodeURIComponent(
        branch
      )}&api-version=6.0`;

      const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
      const treeRes = await fetch(treeUrl, {
        headers: { Authorization: authHeader },
      });

      if (!treeRes.ok) {
        throw new Error(`Azure DevOps items request failed (${treeRes.status})`);
      }

      const treeData = await treeRes.json();
      const items: Array<{ path: string; isFolder?: boolean; url?: string }> = treeData.value || [];

      const metaItem = items.find((i) => !i.isFolder && i.path?.toLowerCase().endsWith("metadata.json"));
      if (metaItem) {
        try {
          const metaUrl = `https://dev.azure.com/${azureOrg}/${azureProj}/_apis/git/repositories/${repo}/items?path=${encodeURIComponent(
            metaItem.path
          )}&versionDescriptor.version=${encodeURIComponent(branch)}&includeContent=true&api-version=6.0`;
          const metaRes = await fetch(metaUrl, { headers: { Authorization: authHeader } });
          if (metaRes.ok) {
            const metaText = await metaRes.text();
            metadataMap = parseMetadataJson(metaText);
          }
        } catch (e) {
          console.warn("Could not fetch metadata.json from Azure:", e);
        }
      }

      const svgFiles = items.filter((item) => {
        if (item.isFolder || !item.path?.toLowerCase().endsWith(".svg")) return false;
        if (!cleanFolder) return true;
        const itemLower = item.path.replace(/^\//, "").toLowerCase();
        return itemLower.startsWith(cleanFolder + "/") || itemLower === cleanFolder;
      });

      const targetFiles = svgFiles.slice(0, 5000);
      const batchSize = 15;
      for (let i = 0; i < targetFiles.length; i += batchSize) {
        const batch = targetFiles.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (file) => {
            try {
              const itemUrl = `https://dev.azure.com/${azureOrg}/${azureProj}/_apis/git/repositories/${repo}/items?path=${encodeURIComponent(
                file.path
              )}&versionDescriptor.version=${encodeURIComponent(branch)}&includeContent=true&api-version=6.0`;

              const fileRes = await fetch(itemUrl, {
                headers: { Authorization: authHeader },
              });

              if (fileRes.ok) {
                const rawSvg = await fileRes.text();
                const sanitized = sanitizeSvg(rawSvg);
                if (sanitized.includes("<svg")) {
                  const meta = parseIconMeta(file.path.replace(/^\//, ""), cleanFolder, metadataMap);
                  assets.push({
                    id: `git_${file.path.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
                    name: meta.name,
                    title: meta.title,
                    type: meta.type,
                    tag: meta.tag,
                    category: meta.category,
                    svg: sanitized,
                    path: file.path,
                    updatedAt: new Date().toISOString(),
                    source: "git",
                  });
                }
              }
            } catch (err) {
              console.warn(`Failed fetching Azure DevOps SVG ${file.path}:`, err);
            }
          })
        );
      }
    } else if (provider === "bitbucket") {
      // 4. Fetch from Bitbucket
      const bbUrl = `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/src/${encodeURIComponent(branch)}/${cleanFolder}`;
      const authHeader = `Basic ${Buffer.from(`x-token-auth:${pat}`).toString("base64")}`;
      const bbRes = await fetch(bbUrl, {
        headers: { Authorization: authHeader },
      });

      if (!bbRes.ok) {
        throw new Error(`Bitbucket directory request failed (${bbRes.status})`);
      }

      const bbData = await bbRes.json();
      const values: Array<{ path: string; type: string; links?: { self?: { href: string } } }> = bbData.values || [];
      const svgFiles = values.filter((v) => v.type === "commit_file" && v.path.toLowerCase().endsWith(".svg"));

      for (const file of svgFiles) {
        try {
          const rawUrl = `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/src/${encodeURIComponent(branch)}/${encodeURIComponent(file.path)}`;
          const fileRes = await fetch(rawUrl, {
            headers: { Authorization: authHeader },
          });
          if (fileRes.ok) {
            const rawSvg = await fileRes.text();
            const sanitized = sanitizeSvg(rawSvg);
            if (sanitized.includes("<svg")) {
              const meta = parseIconMeta(file.path, cleanFolder, metadataMap);
              assets.push({
                id: `git_${file.path.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
                name: meta.name,
                title: meta.title,
                type: meta.type,
                tag: meta.tag,
                category: meta.category,
                svg: sanitized,
                path: file.path,
                updatedAt: new Date().toISOString(),
                source: "git",
              });
            }
          }
        } catch (err) {
          console.warn(`Failed fetching Bitbucket SVG ${file.path}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      assets,
      total: assets.length,
      folder: cleanFolder || "/",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to sync assets from Git repository." },
      { status: 500 }
    );
  }
}
