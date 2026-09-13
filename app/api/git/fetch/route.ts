import { NextRequest, NextResponse } from "next/server";
import { GitCredentials } from "@/types/tokens";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";

// Ignored files during folder auto-discovery
const IGNORED_JSON_FILES = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "jsconfig.json",
  ".eslintrc.json",
  "tslint.json",
  "vercel.json",
  "project.json",
  "composer.json",
  "angular.json",
]);

function isIgnored(filePath: string): boolean {
  const normalized = filePath.toLowerCase().replace(/\\/g, "/");
  if (
    normalized.includes("/node_modules/") ||
    normalized.includes("/.git/") ||
    normalized.includes("/.next/") ||
    normalized.includes("/.vscode/") ||
    normalized.includes("/dist/") ||
    normalized.includes("/build/")
  ) {
    return true;
  }
  const fileName = normalized.split("/").pop() || "";
  return IGNORED_JSON_FILES.has(fileName);
}

function jsonFileBaseName(filePath: string): string {
  return (filePath.split(/[/\\]/).pop() || "").replace(/\.json$/i, "").toLowerCase();
}

function specialTokenFileKind(filePath: string): "$themes" | "$metadata" | null {
  const base = jsonFileBaseName(filePath);
  if (base === "$themes" || base === "$theme") return "$themes";
  if (base === "$metadata") return "$metadata";
  return null;
}

function hoistNestedStudioKeys(
  parsed: any,
  aggregated: Record<string, any>,
  filesMeta: Record<string, string>,
  filePath: string
) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
  const nestedThemes = parsed["$themes"] ?? parsed["$themes.json"] ?? parsed["$theme"] ?? parsed["$theme.json"];
  const nestedMeta = parsed["$metadata"] ?? parsed["$metadata.json"];
  if (nestedThemes !== undefined && aggregated["$themes"] === undefined) {
    aggregated["$themes"] = nestedThemes;
    filesMeta["$themes"] = filePath;
  }
  if (nestedMeta !== undefined && aggregated["$metadata"] === undefined) {
    aggregated["$metadata"] = nestedMeta;
    filesMeta["$metadata"] = filePath;
  }
}

/**
 * Scopes aggregated tokens strictly to the token root (based on $themes.json / $metadata.json or folder path)
 * and excludes non-token repository JSON files.
 */
function scopeAggregatedTokens(
  rawMap: Record<string, any>,
  filesMeta: Record<string, string>,
  requestedFolder?: string
): { tokens: Record<string, any>; files: Record<string, string> } {
  let tokenRoot = requestedFolder ? requestedFolder.replace(/^\/+|\/+$/g, "").toLowerCase() : "";

  if (!tokenRoot) {
    for (const [key, filePath] of Object.entries(filesMeta)) {
      const fileName = filePath.split("/").pop()?.toLowerCase() || "";
      if (
        fileName === "$themes.json" ||
        fileName === "$theme.json" ||
        fileName === "$metadata.json" ||
        fileName === "$themes" ||
        fileName === "$theme" ||
        fileName === "$metadata"
      ) {
        const parentDir = filePath.substring(0, filePath.lastIndexOf("/")).replace(/^\/+|\/+$/g, "");
        if (parentDir) {
          tokenRoot = parentDir.toLowerCase();
          break;
        }
      }
    }
  }

  const resultTokens: Record<string, any> = {};
  const resultFiles: Record<string, string> = {};

  const assignSpecial = (canonical: "$themes" | "$metadata", aliases: string[]) => {
    for (const alias of aliases) {
      if (rawMap[alias] !== undefined) {
        resultTokens[canonical] = rawMap[alias];
        if (filesMeta[alias]) resultFiles[canonical] = filesMeta[alias];
        return;
      }
    }
    for (const [key, val] of Object.entries(rawMap)) {
      if (specialTokenFileKind(key) === canonical) {
        resultTokens[canonical] = val;
        resultFiles[canonical] = filesMeta[key] || filesMeta[canonical] || key;
        return;
      }
    }
  };

  assignSpecial("$themes", ["$themes", "$themes.json", "$theme", "$theme.json"]);
  assignSpecial("$metadata", ["$metadata", "$metadata.json"]);

  for (const [key, val] of Object.entries(rawMap)) {
    if (key.startsWith("$") || specialTokenFileKind(key)) continue;
    const filePath = (filesMeta[key] || key).replace(/^\/+/, "");
    const lowerPath = filePath.toLowerCase();

    if (tokenRoot && !lowerPath.startsWith(`${tokenRoot}/`) && lowerPath !== tokenRoot) {
      continue;
    }

    let relativeKey = key;
    if (tokenRoot && lowerPath.startsWith(`${tokenRoot}/`)) {
      relativeKey = filePath.slice(tokenRoot.length + 1).replace(/\.json$/i, "");
    }

    const baseName = relativeKey.split("/").pop()?.toLowerCase() || "";
    if (
      baseName.startsWith("staticwebapp") ||
      baseName.startsWith("package") ||
      baseName === "metadata" ||
      relativeKey.toLowerCase().startsWith("apps/") ||
      relativeKey.toLowerCase().startsWith("assets/icons") ||
      relativeKey.toLowerCase().startsWith("assets/illustrations") ||
      relativeKey.toLowerCase().startsWith("assets/logos")
    ) {
      continue;
    }

    resultTokens[relativeKey] = val;
    resultFiles[relativeKey] = filePath;
  }

  return { tokens: resultTokens, files: resultFiles };
}

/**
 * Robustly fetches raw file content from Azure DevOps using blob objectId or path
 */
async function fetchAzureItemText(
  azOrg: string,
  azProject: string,
  azRepo: string,
  branch: string,
  item: any,
  basicAuth: string
): Promise<string | null> {
  if (item.content && typeof item.content === "string") {
    return item.content;
  }

  // 1. Fetch by blob objectId (Fastest and works on all Azure DevOps instances)
  if (item.objectId) {
    try {
      const blobUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/blobs/${item.objectId}?api-version=7.0`;
      const blobRes = await fetch(blobUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/octet-stream",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store",
      });
      if (blobRes.ok) {
        return await blobRes.text();
      }
    } catch {
      // fallback
    }
  }

  // 2. Fetch by items path with $format=octetStream
  if (item.path) {
    try {
      const itemUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/items?path=${encodeURIComponent(
        item.path
      )}&versionDescriptor.version=${encodeURIComponent(branch)}&versionDescriptor.versionType=branch&$format=octetStream&api-version=7.0`;
      const itemRes = await fetch(itemUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store",
      });
      if (itemRes.ok) {
        return await itemRes.text();
      }
    } catch {
      // fallback
    }

    // 3. Fetch with includeContent=true
    try {
      const itemUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/items?path=${encodeURIComponent(
        item.path
      )}&versionDescriptor.version=${encodeURIComponent(branch)}&includeContent=true&api-version=7.0`;
      const itemRes = await fetch(itemUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (itemRes.ok) {
        const itemJson = await itemRes.json();
        if (itemJson.content) return itemJson.content;
      }
    } catch {
      // fallback
    }
  }

  return null;
}

/**
 * Concurrency-limited batch execution to prevent rate limiting (429) and socket pool exhaustion
 */
async function batchProcess<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawCreds: GitCredentials = await req.json();
    const creds = sanitizeGitCredentials(rawCreds);
    const { provider, owner, project, repo, branch, path, pat } = creds;

    if (!provider || !owner || !repo || !branch || !pat) {
      return NextResponse.json(
        { error: "Missing required fields: provider, owner/org, repo, branch, and PAT are mandatory." },
        { status: 400 }
      );
    }

    // Path traversal defense
    const cleanPath = path.replace(/\.\./g, "").replace(/^\/+|\/+$/g, "");

    // -------------------------------------------------------------
    // GITHUB FETCH HANDLER
    // -------------------------------------------------------------
    if (provider === "github") {
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TokensPlatform-Cloud/1.0",
      };

      const treeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

      const treeRes = await fetch(treeUrl, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });

      if (!treeRes.ok) {
        const errorText = await treeRes.text();
        let parsedMessage = treeRes.statusText;
        try {
          const errObj = JSON.parse(errorText);
          parsedMessage = errObj.message || parsedMessage;
        } catch {}

        if (treeRes.status === 404) {
          // Check whether the repo itself exists to provide a specific, actionable error
          try {
            const repoRes = await fetch(
              `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
              { headers, cache: "no-store", signal: AbortSignal.timeout(10000) }
            );
            if (repoRes.ok) {
              const repoData = await repoRes.json();
              const defaultBranch = repoData.default_branch || "main";
              if (defaultBranch !== branch) {
                return NextResponse.json(
                  {
                    error: `Branch '${branch}' was not found in repository '${owner}/${repo}'. The default branch is '${defaultBranch}'. Please switch to '${defaultBranch}' in Git Settings or the branch selector.`,
                  },
                  { status: 404 }
                );
              }
              return NextResponse.json(
                {
                  error: `Branch '${branch}' was not found in repository '${owner}/${repo}'. Please verify the branch name.`,
                },
                { status: 404 }
              );
            }
          } catch {}

          return NextResponse.json(
            {
              error: `GitHub repository '${owner}/${repo}' or branch '${branch}' was not found (404). Please verify the repository name, branch name (e.g. 'main' vs 'master'), and ensure your Personal Access Token has 'repo' scope permissions.`,
            },
            { status: 404 }
          );
        }

        if (treeRes.status === 401) {
          return NextResponse.json(
            {
              error: `GitHub authentication failed (401 Bad credentials). Please verify your Personal Access Token in Git Settings.`,
            },
            { status: 401 }
          );
        }

        if (treeRes.status === 403) {
          const resetHeader = treeRes.headers.get("x-ratelimit-reset");
          let resetMsg = "";
          if (resetHeader) {
            const resetTime = new Date(parseInt(resetHeader, 10) * 1000);
            const mins = Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 60000));
            resetMsg = ` Rate limit resets in ~${mins} min (${resetTime.toLocaleTimeString()}).`;
          }
          return NextResponse.json(
            {
              error: `GitHub API rate limit exceeded (403).${resetMsg} Please wait for the quota to reset, or supply a Personal Access Token with higher limits in Git Settings.`,
            },
            { status: 403 }
          );
        }

        if (treeRes.status === 409) {
          return NextResponse.json(
            {
              error: `Git repository '${owner}/${repo}' is empty (no commits yet on branch '${branch}').`,
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { error: `GitHub API error (${treeRes.status}): ${parsedMessage}` },
          { status: treeRes.status }
        );
      }

      const treeData = await treeRes.json();
      const allItems: any[] = Array.isArray(treeData.tree) ? treeData.tree : [];

      // Filter STRICTLY for valid .json files across the repository, ignoring non-json and non-token configs
      const allJsonBlobs: Array<{ path: string; url: string }> = allItems.filter(
        (node: any) =>
          node.type === "blob" &&
          typeof node.path === "string" &&
          node.path.toLowerCase().endsWith(".json") &&
          !isIgnored(node.path)
      );

      if (allJsonBlobs.length === 0) {
        if (allItems.length === 0) {
          return NextResponse.json(
            { error: `Repository '${owner}/${repo}' on branch '${branch}' is empty.` },
            { status: 404 }
          );
        }
        return NextResponse.json(
          {
            error: `No design token JSON files found in repository '${owner}/${repo}' on branch '${branch}' (${allItems.length} other files inspected). Ensure your token files have a .json extension and are not ignored.`,
          },
          { status: 404 }
        );
      }

      // If cleanPath is specified (e.g. "assets/tokens/platforms/web" or "tokens.json"),
      // strictly scope to files under that path
      let targetBlobs = allJsonBlobs;
      if (cleanPath) {
        const normC = cleanPath.toLowerCase();
        const filtered = allJsonBlobs.filter((b) => {
          const normP = b.path.replace(/^\/+/, "").toLowerCase();
          return normP === normC || normP.startsWith(`${normC}/`) || normP.startsWith(normC);
        });

        if (filtered.length === 0) {
          const sample = allJsonBlobs.slice(0, 3).map((b) => b.path).join(", ");
          return NextResponse.json(
            {
              error: `No JSON files found matching configured path '${cleanPath}' on branch '${branch}'. Found ${allJsonBlobs.length} JSON file(s) elsewhere in repository (e.g. ${sample}). Please update the token folder path in Git Settings.`,
            },
            { status: 404 }
          );
        }

        targetBlobs = filtered;
      }

      const aggregated: Record<string, any> = {};
      const filesMeta: Record<string, string> = {};

      // Concurrency-limited batching (12 at a time) to prevent GitHub 429 rate-limiting
      await batchProcess(targetBlobs, 12, async (blob) => {
        const blobRes = await fetch(blob.url, { headers, cache: "no-store" });
        if (blobRes.ok) {
          const bData = await blobRes.json();
          if (bData.content) {
            const decoded = Buffer.from(bData.content, "base64").toString("utf-8");
            try {
              const parsed = JSON.parse(decoded);
              const cleanBlobPath = blob.path.replace(/^\/+/, "");
              const normC = cleanPath.toLowerCase();

              // Strip base configured path from set key so it doesn't show full repository prefix
              let relativeSetName = cleanBlobPath.replace(/\.json$/i, "");
              if (normC && cleanBlobPath.toLowerCase().startsWith(`${normC}/`)) {
                relativeSetName = cleanBlobPath.slice(cleanPath.length + 1).replace(/\.json$/i, "");
              } else if (normC && cleanBlobPath.toLowerCase() === normC) {
                relativeSetName = cleanBlobPath.split("/").pop()!.replace(/\.json$/i, "");
              }

              const specialKind = specialTokenFileKind(cleanBlobPath);

              if (specialKind) {
                aggregated[specialKind] = parsed;
                filesMeta[specialKind] = cleanBlobPath;
              } else {
                hoistNestedStudioKeys(parsed, aggregated, filesMeta, cleanBlobPath);
                aggregated[relativeSetName] = parsed;
                filesMeta[relativeSetName] = blob.path;
              }
            } catch {
              // ignore non-json
            }
          }
        }
      });

      // Fetch user profile avatar if available
      let userProfile = undefined;
      try {
        const uRes = await fetch("https://api.github.com/user", { headers });
        if (uRes.ok) {
          const uData = await uRes.json();
          userProfile = {
            avatarUrl: uData.avatar_url,
            displayName: uData.name || uData.login,
            username: uData.login,
          };
        }
      } catch {
        // ignore
      }

      const scoped = scopeAggregatedTokens(aggregated, filesMeta, cleanPath);
      if (Object.keys(scoped.tokens).length === 0) {
        return NextResponse.json(
          {
            error: `Found ${targetBlobs.length} JSON file(s) in '${owner}/${repo}', but could not parse valid design token sets from them.`,
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        tokens: scoped.tokens,
        userProfile,
        commitSha: treeData.sha || "",
        syncMeta: { mode: "folder", targetFolder: cleanPath, files: scoped.files },
      });
    }

    // -------------------------------------------------------------
    // AZURE DEVOPS FETCH HANDLER
    // -------------------------------------------------------------
    if (provider === "azure") {
      const azOrg = encodeURIComponent(owner);
      const azProject = encodeURIComponent(project || owner);
      const azRepo = encodeURIComponent(repo);
      const basicAuth = Buffer.from(`:${pat}`).toString("base64");

      const headers = {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      };

      // 1. Fetch repository items tree (prioritize cleanPath if provided)
      const specificPath = cleanPath ? (cleanPath.startsWith("/") ? cleanPath : "/" + cleanPath) : "/";
      const itemsUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/items?scopePath=${encodeURIComponent(
        specificPath
      )}&recursionLevel=Full&versionDescriptor.version=${encodeURIComponent(branch)}&versionDescriptor.versionType=branch&includeContentMetadata=true&api-version=7.0`;

      let response = await fetch(itemsUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      // Fallback to root query if scoped query failed
      if (!response.ok && specificPath !== "/") {
        const fallbackUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/items?scopePath=/&recursionLevel=Full&versionDescriptor.version=${encodeURIComponent(
          branch
        )}&versionDescriptor.versionType=branch&includeContentMetadata=true&api-version=7.0`;

        response = await fetch(fallbackUrl, {
          method: "GET",
          headers,
          cache: "no-store",
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = response.statusText;
        try {
          const errObj = JSON.parse(errorText);
          parsedMessage = errObj.message || parsedMessage;
        } catch {
          // ignore
        }
        return NextResponse.json(
          { error: `Azure DevOps API error (${response.status}): ${parsedMessage}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const allItems: any[] = Array.isArray(data.value) ? data.value : data ? [data] : [];

      // Filter STRICTLY for valid .json files across the repository
      const allJsonItems = allItems.filter((item) => {
        return (
          !item.isFolder &&
          item.path &&
          typeof item.path === "string" &&
          item.path.toLowerCase().endsWith(".json") &&
          !isIgnored(item.path)
        );
      });

      if (allJsonItems.length === 0) {
        return NextResponse.json(
          {
            error: `Connected to repository '${repo}@${branch}', but no .json token files were found (${allItems.length} other items inspected).`,
          },
          { status: 404 }
        );
      }

      let targetJsonItems = allJsonItems;
      if (cleanPath) {
        const normC = cleanPath.toLowerCase();
        const filtered = allJsonItems.filter((item) => {
          const normP = item.path.replace(/^\/+/, "").toLowerCase();
          return normP === normC || normP.startsWith(`${normC}/`) || normP.startsWith(normC);
        });

        if (filtered.length === 0) {
          const sample = allJsonItems.slice(0, 3).map((item) => item.path.replace(/^\/+/, "")).join(", ");
          return NextResponse.json(
            {
              error: `No JSON files found matching configured path '${cleanPath}' on branch '${branch}'. Found ${allJsonItems.length} JSON file(s) elsewhere in repository (e.g. ${sample}). Please update the token folder path in Git Settings.`,
            },
            { status: 404 }
          );
        }

        targetJsonItems = filtered;
      }

      // Fetch ALL JSON token files in concurrency-limited batches (12 at a time)
      const aggregated: Record<string, any> = {};
      const filesMeta: Record<string, string> = {};

      await batchProcess(targetJsonItems, 12, async (item) => {
        const rawText = await fetchAzureItemText(azOrg, azProject, azRepo, branch, item, basicAuth);
        if (rawText) {
          try {
            const cleanItemPath = item.path.replace(/^\/+/, "");
            const normC = cleanPath.toLowerCase();

            // Strip base configured path from set key so it doesn't show full repository prefix
            let relativeSetName = cleanItemPath.replace(/\.json$/i, "");
            if (normC && cleanItemPath.toLowerCase().startsWith(`${normC}/`)) {
              relativeSetName = cleanItemPath.slice(cleanPath.length + 1).replace(/\.json$/i, "");
            } else if (normC && cleanItemPath.toLowerCase() === normC) {
              relativeSetName = cleanItemPath.split("/").pop()!.replace(/\.json$/i, "");
            }

            const specialKind = specialTokenFileKind(cleanItemPath);
            const parsed = JSON.parse(rawText);

            if (specialKind) {
              aggregated[specialKind] = parsed;
              filesMeta[specialKind] = cleanItemPath;
            } else {
              hoistNestedStudioKeys(parsed, aggregated, filesMeta, cleanItemPath);
              aggregated[relativeSetName] = parsed;
              filesMeta[relativeSetName] = cleanItemPath;
            }
          } catch {
            // ignore invalid json files
          }
        }
      });

      const userProfile = {
        displayName: owner,
        username: owner,
      };

      const scoped = scopeAggregatedTokens(aggregated, filesMeta, cleanPath);

      if (Object.keys(scoped.tokens).length === 0) {
        return NextResponse.json(
          { error: `Found JSON files, but could not parse token data from them.` },
          { status: 422 }
        );
      }

      return NextResponse.json({
        tokens: scoped.tokens,
        userProfile,
        commitSha: targetJsonItems[0]?.commitId || "",
        syncMeta: { mode: "folder", targetFolder: cleanPath, files: scoped.files },
      });
    }

    return NextResponse.json({ error: `Unsupported provider '${provider}'.` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error while discovering design tokens." },
      { status: 500 }
    );
  }
}
