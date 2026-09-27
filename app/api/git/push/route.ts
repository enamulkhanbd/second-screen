import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/utils/auth";
import { GitCredentials, RawTokensDocument, SyncMeta } from "@/types/tokens";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";

interface PushRequestBody {
  credentials: GitCredentials;
  rawTokens: RawTokensDocument;
  commitMessage?: string;
  syncMeta?: SyncMeta;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, "write:tokens");
  if (!auth.isValid) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawTokens: RawTokensDocument = body.rawTokens || body.tokens;
    const rawCreds: GitCredentials = body.credentials || {
      provider: body.provider,
      owner: body.owner,
      project: body.project,
      repo: body.repo,
      branch: body.branch,
      path: body.path,
      pat: body.pat,
      baseUrl: body.baseUrl,
    };
    const { commitMessage, syncMeta } = body;

    if (!rawCreds || !rawTokens || Object.keys(rawTokens).length === 0) {
      return NextResponse.json(
        { error: "Missing required credentials or token payload." },
        { status: 400 }
      );
    }

    const credentials = sanitizeGitCredentials(rawCreds);
    const { provider, owner, project, repo, branch, path, pat } = credentials;

    if (!provider || !owner || !repo || !branch || !pat) {
      return NextResponse.json(
        { error: "Missing required git credentials (provider, owner, repo, branch, PAT)." },
        { status: 400 }
      );
    }

    // Path traversal defense
    const cleanPath = path.replace(/\.\./g, "").replace(/^\/+|\/+$/g, "");
    const finalCommitMessage =
      commitMessage ||
      `chore(tokens): update design tokens via Tokens Platform [${new Date().toISOString()}]`;

    // -------------------------------------------------------------
    // GITHUB DIRECT COMMIT HANDLER
    // -------------------------------------------------------------
    if (provider === "github") {
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TokensPlatform-Cloud/1.0",
        "Content-Type": "application/json",
      };

      // Deduplicate file paths to commit
      const pathToContentMap = new Map<string, string>();

      const isFolderMode = syncMeta?.mode === "folder" && syncMeta?.files;

      if (isFolderMode && syncMeta?.files) {
        for (const [setName, setFilePath] of Object.entries(syncMeta.files as Record<string, string>)) {
          if (setName.startsWith("$") && !rawTokens[setName]) continue;
          const contentObj = rawTokens[setName];
          if (contentObj !== undefined) {
            const normalizedPath = String(setFilePath).replace(/^\/+/, "");
            pathToContentMap.set(normalizedPath, JSON.stringify(contentObj, null, 2));
          }
        }
      } else {
        const targetFilePath = (syncMeta?.targetPath || cleanPath || "tokens.json").replace(/^\/+/, "");
        pathToContentMap.set(targetFilePath, JSON.stringify(rawTokens, null, 2));
      }

      // Commit each unique file
      for (const [filePath, fileJson] of Array.from(pathToContentMap.entries())) {
        const getUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
          repo
        )}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`;

        let sha: string | undefined = undefined;
        try {
          const checkRes = await fetch(getUrl, {
            headers,
            cache: "no-store",
          });
          if (checkRes.ok) {
            const fData = await checkRes.json();
            sha = fData.sha;
          }
        } catch {
          // ignore
        }

        const putUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
          repo
        )}/contents/${encodeURIComponent(filePath)}`;

        const payload: any = {
          message: `${finalCommitMessage} (${filePath})`,
          content: Buffer.from(fileJson).toString("base64"),
          branch,
        };
        if (sha) payload.sha = sha;

        const putRes = await fetch(putUrl, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });

        if (!putRes.ok) {
          const errText = await putRes.text();
          let parsedMessage = putRes.statusText;
          try {
            const errObj = JSON.parse(errText);
            parsedMessage = errObj.message || parsedMessage;
          } catch {
            // ignore
          }
          return NextResponse.json(
            { error: `GitHub Commit Failed on '${filePath}' (${putRes.status}): ${parsedMessage}` },
            { status: putRes.status }
          );
        }
      }

      return NextResponse.json({
        success: true,
        provider: "github",
        branch,
        message: finalCommitMessage,
      });
    }

    // -------------------------------------------------------------
    // AZURE DEVOPS DIRECT COMMIT HANDLER
    // -------------------------------------------------------------
    if (provider === "azure") {
      const azOrg = encodeURIComponent(owner);
      const azProject = encodeURIComponent(project || owner);
      const azRepo = encodeURIComponent(repo);
      const basicAuth = Buffer.from(`:${pat}`).toString("base64");

      // 1. Fetch branch heads to find exact oldObjectId (handles branches with slashes like experiment/v2)
      const getRefsUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/refs?filter=heads/&api-version=7.0`;

      const refRes = await fetch(getRefsUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!refRes.ok) {
        const errText = await refRes.text();
        return NextResponse.json(
          { error: `Could not connect to Azure DevOps repository: ${errText}` },
          { status: refRes.status }
        );
      }

      const refData = await refRes.json();
      const allRefs: any[] = Array.isArray(refData.value) ? refData.value : [];

      const targetRefName = `refs/heads/${branch}`;
      const currentBranchObj = allRefs.find(
        (r) =>
          r.name === targetRefName ||
          r.name.toLowerCase() === targetRefName.toLowerCase() ||
          r.name.replace(/^refs\/heads\//i, "").toLowerCase() === branch.toLowerCase()
      );

      if (!currentBranchObj || !currentBranchObj.objectId) {
        return NextResponse.json(
          { error: `Branch '${branch}' not found in Azure DevOps repository. Please verify branch name.` },
          { status: 404 }
        );
      }

      const oldObjectId = currentBranchObj.objectId;

      // 2. Prepare deduplicated changes list
      const pathToContentMap = new Map<string, string>();

      const isFolderMode = syncMeta?.mode === "folder" && syncMeta?.files;

      if (isFolderMode && syncMeta?.files) {
        for (const [setName, setFilePath] of Object.entries(syncMeta.files as Record<string, string>)) {
          if (setName.startsWith("$") && !rawTokens[setName]) continue;
          const contentObj = rawTokens[setName];
          if (contentObj !== undefined) {
            const normalizedPath = String(setFilePath).startsWith("/") ? String(setFilePath) : "/" + String(setFilePath);
            pathToContentMap.set(normalizedPath, JSON.stringify(contentObj, null, 2));
          }
        }
      } else {
        const targetFilePath = syncMeta?.targetPath || cleanPath || "tokens.json";
        const normalizedPath = targetFilePath.startsWith("/") ? targetFilePath : "/" + targetFilePath;
        pathToContentMap.set(normalizedPath, JSON.stringify(rawTokens, null, 2));
      }

      const changes = Array.from(pathToContentMap.entries()).map(([path, content]) => ({
        changeType: "edit",
        item: { path },
        newContent: {
          content,
          contentType: "rawText",
        },
      }));

      // 3. Create push commit
      const pushUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/pushes?api-version=7.0`;

      const pushPayload = {
        refUpdates: [
          {
            name: currentBranchObj.name,
            oldObjectId: oldObjectId,
          },
        ],
        commits: [
          {
            comment: finalCommitMessage,
            changes: changes,
          },
        ],
      };

      const pushRes = await fetch(pushUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(pushPayload),
      });

      if (!pushRes.ok) {
        const errText = await pushRes.text();
        let parsedMessage = pushRes.statusText;
        try {
          const errObj = JSON.parse(errText);
          parsedMessage = errObj.message || parsedMessage;
        } catch {
          // ignore
        }
        return NextResponse.json(
          { error: `Azure DevOps Push Failed (${pushRes.status}): ${parsedMessage}` },
          { status: pushRes.status }
        );
      }

      const pushResult = await pushRes.json();
      return NextResponse.json({
        success: true,
        provider: "azure",
        pushId: pushResult.pushId,
        branch: branch,
        message: finalCommitMessage,
      });
    }

    return NextResponse.json({ error: `Unsupported provider '${provider}'.` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error while committing tokens to Git." },
      { status: 500 }
    );
  }
}
