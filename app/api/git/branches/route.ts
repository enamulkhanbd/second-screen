import { NextRequest, NextResponse } from "next/server";
import { GitCredentials } from "@/types/tokens";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";

export async function POST(req: NextRequest) {
  try {
    const rawCreds: GitCredentials = await req.json();
    const creds = sanitizeGitCredentials(rawCreds);
    const { provider, owner, project, repo, pat } = creds;

    if (!provider || !owner || !repo || !pat) {
      return NextResponse.json(
        { error: "Missing required fields: provider, owner/org, repo, and PAT are mandatory." },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------
    // GITHUB BRANCHES
    // -------------------------------------------------------------
    if (provider === "github") {
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TokensStudio-SecondScreen-Viewer",
      };

      const branchesUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/branches?per_page=100`;

      const res = await fetch(branchesUrl, { headers, cache: "no-store" });
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `GitHub error (${res.status}): ${errText}` },
          { status: res.status }
        );
      }

      const data: Array<{ name: string }> = await res.json();
      const branchNames = (Array.isArray(data) ? data : []).map((b) => b.name);

      return NextResponse.json({ branches: branchNames });
    }

    // -------------------------------------------------------------
    // AZURE DEVOPS BRANCHES
    // -------------------------------------------------------------
    if (provider === "azure") {
      const azOrg = encodeURIComponent(owner);
      const azProject = encodeURIComponent(project || owner);
      const azRepo = encodeURIComponent(repo);
      const basicAuth = Buffer.from(`:${pat}`).toString("base64");

      const headers = {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json",
      };

      const refsUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/refs?filter=heads/&api-version=7.0`;

      const res = await fetch(refsUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `Azure DevOps error (${res.status}): ${errText}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      const allRefs: Array<{ name: string }> = Array.isArray(data.value) ? data.value : [];
      const branchNames = allRefs.map((r) => r.name.replace(/^refs\/heads\//i, ""));

      return NextResponse.json({ branches: branchNames });
    }

    return NextResponse.json({ error: `Unsupported provider '${provider}'.` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load branches." },
      { status: 500 }
    );
  }
}
