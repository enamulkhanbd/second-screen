import { NextRequest, NextResponse } from "next/server";
import { GitCredentials } from "@/types/tokens";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";
import { computeLineDiff } from "@/utils/tokenDiff";

export interface CommitFileChange {
  filename: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions?: number;
  deletions?: number;
  patch?: string;
  oldContent?: string;
  newContent?: string;
}

export interface CommitDetailsResponse {
  sha: string;
  stats?: { additions: number; deletions: number; total: number };
  files: CommitFileChange[];
}

/**
 * Normalizes text content: if it's JSON tokens, formats it with standard 2-space indentation
 * to guarantee clear line-by-line diffs.
 */
function normalizeFileText(raw: string): string {
  if (!raw || !raw.trim()) return "";
  try {
    const parsed = JSON.parse(raw);
    // Reject Azure DevOps metadata envelope if accidentally returned
    if (parsed.objectId && parsed.gitObjectType && (parsed.url || parsed._links)) {
      return "";
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

/**
 * Robustly fetches raw file content from Azure DevOps using blob objectId or path
 */
async function fetchAzureRawContent(
  azOrg: string,
  azProject: string,
  azRepo: string,
  basicAuth: string,
  objectId?: string,
  path?: string,
  versionSha?: string
): Promise<string> {
  const headers = {
    Authorization: `Basic ${basicAuth}`,
    Accept: "application/octet-stream, text/plain, */*",
  };

  // 1. If objectId is available, fetch blob directly (fastest and purest raw content)
  if (objectId) {
    try {
      const blobUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/blobs/${objectId}?api-version=7.0`;
      const res = await fetch(blobUrl, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const text = await res.text();
        return normalizeFileText(text);
      }
    } catch {}
  }

  // 2. Fetch by path & version
  if (path && versionSha) {
    try {
      const itemUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/items?path=${encodeURIComponent(
        path
      )}&versionDescriptor.version=${encodeURIComponent(versionSha)}&versionDescriptor.versionType=commit&includeContent=true&$format=octetStream&api-version=7.0`;
      const res = await fetch(itemUrl, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed.content && typeof parsed.content === "string") {
            return normalizeFileText(parsed.content);
          }
          if (parsed.objectId) {
            return await fetchAzureRawContent(azOrg, azProject, azRepo, basicAuth, parsed.objectId);
          }
        } catch {
          return normalizeFileText(text);
        }
        return normalizeFileText(text);
      }
    } catch {}
  }

  return "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commitSha, ...rawCreds } = body;
    const creds = sanitizeGitCredentials(rawCreds as GitCredentials);
    const { provider, owner, project, repo, pat } = creds;

    if (!commitSha || !provider || !owner || !repo || !pat) {
      return NextResponse.json(
        { error: "Missing required parameters (commitSha, provider, owner, repo, pat)." },
        { status: 400 }
      );
    }

    const files: CommitFileChange[] = [];
    let stats: { additions: number; deletions: number; total: number } | undefined = undefined;

    // -------------------------------------------------------------
    // GITHUB COMMIT DETAILS
    // -------------------------------------------------------------
    if (provider === "github") {
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TokensPlatform-Cloud/1.0",
      };

      const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/commits/${encodeURIComponent(commitSha)}`;

      const res = await fetch(url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `GitHub error (${res.status}): ${errText}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      if (data.stats) {
        stats = {
          additions: data.stats.additions || 0,
          deletions: data.stats.deletions || 0,
          total: data.stats.total || 0,
        };
      }

      for (const f of data.files || []) {
        let status: "added" | "modified" | "deleted" | "renamed" = "modified";
        if (f.status === "added") status = "added";
        else if (f.status === "removed") status = "deleted";
        else if (f.status === "renamed") status = "renamed";

        files.push({
          filename: f.filename,
          status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch,
        });
      }
    }

    // -------------------------------------------------------------
    // AZURE DEVOPS COMMIT DETAILS
    // -------------------------------------------------------------
    else if (provider === "azure") {
      const azOrg = encodeURIComponent(owner);
      const azProject = encodeURIComponent(project || owner);
      const azRepo = encodeURIComponent(repo);
      const basicAuth = Buffer.from(`:${pat}`).toString("base64");

      const jsonHeaders = {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json",
      };

      // 1. Fetch Commit metadata to get parent commit SHA
      let parentSha: string | null = null;
      try {
        const commitInfoUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/commits/${encodeURIComponent(
          commitSha
        )}?api-version=7.0`;
        const cRes = await fetch(commitInfoUrl, { headers: jsonHeaders, cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (cRes.ok) {
          const cData = await cRes.json();
          parentSha = cData.parents?.[0] || null;
        }
      } catch {}

      // 2. Fetch list of changes
      const changesUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/commits/${encodeURIComponent(
        commitSha
      )}/changes?api-version=7.0`;

      const res = await fetch(changesUrl, {
        headers: jsonHeaders,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `Azure DevOps error (${res.status}): ${errText}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      const changes: any[] = Array.isArray(data.changes) ? data.changes : [];

      let totalAdd = 0;
      let totalDel = 0;

      for (const ch of changes) {
        if (ch.item?.isFolder || ch.item?.gitObjectType === "tree") {
          continue;
        }
        const path = (ch.item?.path || "").replace(/^\/+/, "");
        if (!path) continue;

        let status: "added" | "modified" | "deleted" | "renamed" = "modified";
        const ct = String(ch.changeType || "").toLowerCase();
        if (ct.includes("add")) status = "added";
        else if (ct.includes("delete")) status = "deleted";
        else if (ct.includes("rename")) status = "renamed";

        let oldContent = "";
        let newContent = "";

        // Fetch new content at this commit using blob objectId or path
        if (status !== "deleted") {
          newContent = await fetchAzureRawContent(
            azOrg,
            azProject,
            azRepo,
            basicAuth,
            ch.item?.objectId,
            path,
            commitSha
          );
        }

        // Fetch old content at parent commit
        if (parentSha && status !== "added") {
          oldContent = await fetchAzureRawContent(
            azOrg,
            azProject,
            azRepo,
            basicAuth,
            undefined,
            path,
            parentSha
          );
        }

        // Calculate line differences
        let additions = 0;
        let deletions = 0;
        if (oldContent || newContent) {
          const lineDiff = computeLineDiff(oldContent, newContent);
          for (const chunk of lineDiff) {
            if (chunk.type === "added") additions++;
            else if (chunk.type === "removed") deletions++;
          }
        }

        totalAdd += additions;
        totalDel += deletions;

        files.push({
          filename: path,
          status,
          oldContent,
          newContent,
          additions,
          deletions,
        });
      }

      stats = {
        additions: totalAdd,
        deletions: totalDel,
        total: totalAdd + totalDel,
      };
    }

    // -------------------------------------------------------------
    // GITLAB COMMIT DETAILS
    // -------------------------------------------------------------
    else if (provider === "gitlab") {
      const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
      const headers = {
        "PRIVATE-TOKEN": pat,
      };

      const url = `https://gitlab.com/api/v4/projects/${encodedProjectPath}/repository/commits/${encodeURIComponent(
        commitSha
      )}/diff`;

      const res = await fetch(url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `GitLab error (${res.status}): ${errText}` },
          { status: res.status }
        );
      }

      const diffs: any[] = await res.json();
      for (const d of Array.isArray(diffs) ? diffs : []) {
        let status: "added" | "modified" | "deleted" | "renamed" = "modified";
        if (d.new_file) status = "added";
        else if (d.deleted_file) status = "deleted";
        else if (d.renamed_file) status = "renamed";

        files.push({
          filename: d.new_path || d.old_path,
          status,
          patch: d.diff,
        });
      }
    }

    // -------------------------------------------------------------
    // BITBUCKET COMMIT DETAILS
    // -------------------------------------------------------------
    else if (provider === "bitbucket") {
      const authHeader = pat.includes(":")
        ? `Basic ${Buffer.from(pat).toString("base64")}`
        : `Bearer ${pat}`;

      const headers = {
        Authorization: authHeader,
        Accept: "application/json",
      };

      const url = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(repo)}/diffstat/${encodeURIComponent(commitSha)}`;

      const res = await fetch(url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `Bitbucket error (${res.status}): ${errText}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      const values: any[] = Array.isArray(data.values) ? data.values : [];
      for (const val of values) {
        let status: "added" | "modified" | "deleted" | "renamed" = "modified";
        if (val.status === "added") status = "added";
        else if (val.status === "removed") status = "deleted";
        else if (val.status === "modified") status = "modified";

        files.push({
          filename: val.new?.path || val.old?.path || "file",
          status,
          additions: val.lines_added,
          deletions: val.lines_removed,
        });
      }
    }

    const targetPath = (creds.filePath || creds.path || "").trim().replace(/^\/+/, "").toLowerCase();
    let finalFiles = files;
    if (targetPath) {
      const matchingFiles = files.filter((f) => {
        const fn = (f.filename || "").replace(/^\/+/, "").toLowerCase();
        return fn === targetPath || fn.startsWith(`${targetPath}/`) || fn.startsWith(targetPath);
      });
      if (matchingFiles.length > 0) {
        finalFiles = matchingFiles;
      }
    }

    return NextResponse.json({
      sha: commitSha,
      stats,
      files: finalFiles,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load commit details." },
      { status: 500 }
    );
  }
}
