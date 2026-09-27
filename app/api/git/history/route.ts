import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/utils/auth";
import { GitCredentials } from "@/types/tokens";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";

export interface GitCommitHistoryItem {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
    avatarUrl?: string;
  };
  url?: string;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, "read:tokens");
  if (!auth.isValid) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  try {
    const rawCreds: GitCredentials = await req.json();
    const creds = sanitizeGitCredentials(rawCreds);
    const { provider, owner, project, repo, branch, pat } = creds;
    const targetPath = (creds.filePath || creds.path || "").trim().replace(/^\/+/, "");

    if (!provider || !owner || !repo || !pat || !branch) {
      return NextResponse.json(
        { error: "Missing required git credentials (provider, owner, repo, branch, PAT)." },
        { status: 400 }
      );
    }

    const commits: GitCommitHistoryItem[] = [];

    // -------------------------------------------------------------
    // GITHUB REVISION HISTORY
    // -------------------------------------------------------------
    if (provider === "github") {
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TokensPlatform-Cloud/1.0",
      };

      const pathParam = targetPath ? `&path=${encodeURIComponent(targetPath)}` : "";
      const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/commits?sha=${encodeURIComponent(branch)}${pathParam}&per_page=30`;

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

      const data: any[] = await res.json();
      for (const item of Array.isArray(data) ? data : []) {
        commits.push({
          sha: item.sha,
          shortSha: (item.sha || "").substring(0, 7),
          message: item.commit?.message || "No commit message",
          author: {
            name: item.commit?.author?.name || item.author?.login || "Unknown Author",
            email: item.commit?.author?.email || "",
            date: item.commit?.author?.date || item.commit?.committer?.date || new Date().toISOString(),
            avatarUrl: item.author?.avatar_url,
          },
          url: item.html_url,
        });
      }
    }

    // -------------------------------------------------------------
    // AZURE DEVOPS REVISION HISTORY
    // -------------------------------------------------------------
    else if (provider === "azure") {
      const azOrg = encodeURIComponent(owner);
      const azProject = encodeURIComponent(project || owner);
      const azRepo = encodeURIComponent(repo);
      const basicAuth = Buffer.from(`:${pat}`).toString("base64");

      const headers = {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json",
      };

      const azureItemPath = targetPath ? (targetPath.startsWith("/") ? targetPath : "/" + targetPath) : "";
      const pathParam = azureItemPath ? `&searchCriteria.itemPath=${encodeURIComponent(azureItemPath)}` : "";
      const url = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/commits?searchCriteria.itemVersion.version=${encodeURIComponent(
        branch
      )}${pathParam}&$top=30&api-version=7.0`;

      const res = await fetch(url, {
        method: "GET",
        headers,
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
      const items: any[] = Array.isArray(data.value) ? data.value : [];
      for (const item of items) {
        commits.push({
          sha: item.commitId,
          shortSha: (item.commitId || "").substring(0, 7),
          message: item.comment || "No commit message",
          author: {
            name: item.author?.name || item.committer?.name || "Azure User",
            email: item.author?.email || item.committer?.email || "",
            date: item.author?.date || item.committer?.date || new Date().toISOString(),
            avatarUrl: item.author?.imageUrl,
          },
          url: item.remoteUrl || item.url,
        });
      }
    }

    // -------------------------------------------------------------
    // GITLAB REVISION HISTORY
    // -------------------------------------------------------------
    else if (provider === "gitlab") {
      const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
      const headers = {
        "PRIVATE-TOKEN": pat,
      };

      const pathParam = targetPath ? `&path=${encodeURIComponent(targetPath)}` : "";
      const url = `https://gitlab.com/api/v4/projects/${encodedProjectPath}/repository/commits?ref_name=${encodeURIComponent(
        branch
      )}${pathParam}&per_page=30`;

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

      const data: any[] = await res.json();
      for (const item of Array.isArray(data) ? data : []) {
        commits.push({
          sha: item.id,
          shortSha: (item.short_id || item.id || "").substring(0, 7),
          message: item.message || "No commit message",
          author: {
            name: item.author_name || "GitLab User",
            email: item.author_email || "",
            date: item.authored_date || item.created_at || new Date().toISOString(),
          },
          url: item.web_url,
        });
      }
    }

    // -------------------------------------------------------------
    // BITBUCKET REVISION HISTORY
    // -------------------------------------------------------------
    else if (provider === "bitbucket") {
      const authHeader = pat.includes(":")
        ? `Basic ${Buffer.from(pat).toString("base64")}`
        : `Bearer ${pat}`;

      const headers = {
        Authorization: authHeader,
        Accept: "application/json",
      };

      const pathParam = targetPath ? `?path=${encodeURIComponent(targetPath)}&pagelen=30` : `?pagelen=30`;
      const url = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(branch)}${pathParam}`;

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
      for (const item of values) {
        commits.push({
          sha: item.hash,
          shortSha: (item.hash || "").substring(0, 7),
          message: item.message || "No commit message",
          author: {
            name: item.author?.user?.display_name || item.author?.raw || "Bitbucket User",
            email: item.author?.user?.email || "",
            date: item.date || new Date().toISOString(),
            avatarUrl: item.author?.user?.links?.avatar?.href,
          },
          url: item.links?.html?.href,
        });
      }
    } else {
      return NextResponse.json({ error: `Unsupported provider '${provider}'.` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      branch,
      path: targetPath || null,
      commits,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load commit history." },
      { status: 500 }
    );
  }
}
