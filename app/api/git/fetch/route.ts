import { NextRequest, NextResponse } from "next/server";
import { GitCredentials } from "@/types/tokens";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";
import { saveStoredTokens } from "@/utils/cloudStorage";

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

    const cleanPath = path.replace(/^\/+|\/+$/g, "");

    // -------------------------------------------------------------
    // GITHUB FETCH HANDLER
    // -------------------------------------------------------------
    if (provider === "github") {
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TokensStudio-SecondScreen-Viewer",
      };

      const treeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

      const treeRes = await fetch(treeUrl, { headers, cache: "no-store" });

      if (treeRes.ok) {
        const treeData = await treeRes.json();
        // ONLY pull .json files, ignoring non-json and non-token configs
        const allJsonBlobs: Array<{ path: string; url: string }> = (treeData.tree || []).filter(
          (node: any) =>
            node.type === "blob" &&
            typeof node.path === "string" &&
            node.path.toLowerCase().endsWith(".json") &&
            !isIgnored(node.path)
        );

        if (allJsonBlobs.length > 0) {
          // If cleanPath is specified (e.g. "assets/tokens/platforms/web" or "tokens.json"),
          // strictly scope to files under that path
          const filteredBlobs = cleanPath
            ? allJsonBlobs.filter((b) => {
                const normP = b.path.replace(/^\/+/, "").toLowerCase();
                const normC = cleanPath.toLowerCase();
                return (
                  normP === normC ||
                  normP.startsWith(`${normC}/`) ||
                  normP.startsWith(normC)
                );
              })
            : allJsonBlobs;

          const targetBlobs = filteredBlobs.length > 0 ? filteredBlobs : allJsonBlobs;
          const aggregated: Record<string, any> = {};
          const filesMeta: Record<string, string> = {};

          await Promise.all(
            targetBlobs.map(async (blob) => {
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

                    const baseSetName = cleanBlobPath.split("/").pop()!.replace(/\.json$/i, "");

                    if (baseSetName === "$themes" || baseSetName === "$themes.json") {
                      aggregated["$themes"] = parsed;
                    } else if (baseSetName === "$metadata" || baseSetName === "$metadata.json") {
                      aggregated["$metadata"] = parsed;
                    } else {
                      aggregated[relativeSetName] = parsed;
                    }

                    filesMeta[relativeSetName] = blob.path;
                  } catch {
                    // ignore non-json
                  }
                }
              }
            })
          );

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

          if (Object.keys(aggregated).length > 0) {
            saveStoredTokens(aggregated);
            return NextResponse.json({
              tokens: aggregated,
              userProfile,
              syncMeta: { mode: "folder", targetFolder: cleanPath, files: filesMeta },
            });
          }
        }
      }

      return NextResponse.json(
        { error: `No design token JSON files found in repository on branch '${branch}'.` },
        { status: 404 }
      );
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

      // Filter STRICTLY for valid .json files across the repository, scoped to cleanPath if set
      const allJsonItems = allItems.filter((item) => {
        if (
          item.isFolder ||
          !item.path ||
          typeof item.path !== "string" ||
          !item.path.toLowerCase().endsWith(".json") ||
          isIgnored(item.path)
        ) {
          return false;
        }
        if (cleanPath) {
          const normP = item.path.replace(/^\/+/, "").toLowerCase();
          const normC = cleanPath.toLowerCase();
          return normP === normC || normP.startsWith(`${normC}/`) || normP.startsWith(normC);
        }
        return true;
      });

      // If strict filter yielded 0 items, fallback to all valid json items
      const targetJsonItems =
        allJsonItems.length > 0
          ? allJsonItems
          : allItems.filter(
              (item) =>
                !item.isFolder &&
                item.path &&
                typeof item.path === "string" &&
                item.path.toLowerCase().endsWith(".json") &&
                !isIgnored(item.path)
            );

      if (targetJsonItems.length === 0) {
        return NextResponse.json(
          {
            error: `Connected to repository '${repo}@${branch}', but no .json token files were found.`,
          },
          { status: 404 }
        );
      }

      // Fetch ALL JSON token files concurrently so all sets and themes are available
      const aggregated: Record<string, any> = {};
      const filesMeta: Record<string, string> = {};

      await Promise.all(
        targetJsonItems.map(async (item) => {
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

              const baseSetName = cleanItemPath.split("/").pop()!.replace(/\.json$/i, "");
              const parsed = JSON.parse(rawText);

              if (baseSetName === "$themes" || baseSetName === "$themes.json") {
                aggregated["$themes"] = parsed;
              } else if (baseSetName === "$metadata" || baseSetName === "$metadata.json") {
                aggregated["$metadata"] = parsed;
              } else {
                aggregated[relativeSetName] = parsed;
              }

              filesMeta[relativeSetName] = cleanItemPath;
            } catch {
              // ignore invalid json files
            }
          }
        })
      );

      const userProfile = {
        displayName: owner,
        username: owner,
      };

      if (Object.keys(aggregated).length === 0) {
        return NextResponse.json(
          { error: `Found JSON files, but could not parse token data from them.` },
          { status: 422 }
        );
      }

      saveStoredTokens(aggregated);

      return NextResponse.json({
        tokens: aggregated,
        userProfile,
        syncMeta: { mode: "folder", targetFolder: cleanPath, files: filesMeta },
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
