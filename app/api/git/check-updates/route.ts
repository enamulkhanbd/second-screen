import { NextRequest, NextResponse } from "next/server";
import { GitCredentials } from "@/types/tokens";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";

export async function POST(req: NextRequest) {
  try {
    const rawCreds: GitCredentials = await req.json();
    const creds = sanitizeGitCredentials(rawCreds);
    const { provider, owner, project, repo, branch, pat } = creds;

    if (!provider || !owner || !repo || !pat || !branch) {
      return NextResponse.json(
        { error: "Missing required fields: provider, owner, repo, branch, and PAT are mandatory." },
        { status: 400 }
      );
    }

    let latestSha = "";
    let commitMessage = "";

    // -------------------------------------------------------------
    // GITHUB COMMITS
    // -------------------------------------------------------------
    if (provider === "github") {
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TokensPlatform-Cloud/1.0",
      };

      const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/commits/${encodeURIComponent(branch)}`;

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
      latestSha = data.sha || "";
      commitMessage = data.commit?.message || "";
    }

    // -------------------------------------------------------------
    // AZURE DEVOPS COMMITS
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

      const url = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/commits?searchCriteria.itemVersion.version=${encodeURIComponent(
        branch
      )}&$top=1&api-version=7.0`;

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
      if (Array.isArray(data.value) && data.value.length > 0) {
        latestSha = data.value[0].commitId || "";
        commitMessage = data.value[0].comment || "";
      }
    }

    // -------------------------------------------------------------
    // GITLAB COMMITS
    // -------------------------------------------------------------
    else if (provider === "gitlab") {
      const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
      const headers = {
        "PRIVATE-TOKEN": pat,
      };

      const url = `https://gitlab.com/api/v4/projects/${encodedProjectPath}/repository/commits?ref_name=${encodeURIComponent(
        branch
      )}&per_page=1`;

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

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        latestSha = data[0].id || "";
        commitMessage = data[0].message || "";
      }
    }

    // -------------------------------------------------------------
    // BITBUCKET COMMITS
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
      )}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(branch)}?pagelen=1`;

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
      if (Array.isArray(data.values) && data.values.length > 0) {
        latestSha = data.values[0].hash || "";
        commitMessage = data.values[0].message || "";
      }
    } else {
      return NextResponse.json({ error: `Unsupported provider '${provider}'.` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      branch,
      latestSha,
      commitMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to check remote updates." },
      { status: 500 }
    );
  }
}
