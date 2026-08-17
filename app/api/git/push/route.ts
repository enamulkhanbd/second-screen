import { NextRequest, NextResponse } from "next/server";
import { GitCredentials, RawTokensDocument, SyncMeta } from "@/types/tokens";
import { sanitizeGitCredentials } from "@/utils/gitHelpers";

interface PushRequestBody {
  credentials: GitCredentials;
  rawTokens: RawTokensDocument;
  commitMessage?: string;
  syncMeta?: SyncMeta;
}

export async function POST(req: NextRequest) {
  try {
    const body: PushRequestBody = await req.json();
    const { credentials: rawCreds, rawTokens, commitMessage, syncMeta } = body;

    if (!rawCreds || !rawTokens) {
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

    const cleanPath = path.replace(/^\/+|\/+$/g, "");
    const finalCommitMessage =
      commitMessage ||
      `chore(tokens): update design tokens via Tokens Studio second-screen [${new Date().toISOString()}]`;

    // -------------------------------------------------------------
    // GITHUB DIRECT COMMIT HANDLER
    // -------------------------------------------------------------
    if (provider === "github") {
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TokensStudio-SecondScreen-Viewer",
        "Content-Type": "application/json",
      };

      // Determine files to commit
      const isFolderMode = syncMeta?.mode === "folder" && syncMeta?.files;

      if (isFolderMode && syncMeta.files) {
        // Multi-file folder commit: commit each set to its respective file
        for (const [setName, setFilePath] of Object.entries(syncMeta.files)) {
          if (setName.startsWith("$") && !rawTokens[setName]) continue;
          const contentObj = rawTokens[setName] || {};
          const fileJson = JSON.stringify(contentObj, null, 2);

          // Get file SHA if exists
          const getUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/contents/${setFilePath}?ref=${encodeURIComponent(branch)}`;
          let sha: string | undefined = undefined;
          const checkRes = await fetch(getUrl, {
            headers: {
              Authorization: `Bearer ${pat}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "TokensStudio-SecondScreen-Viewer",
            },
            cache: "no-store",
          });
          if (checkRes.ok) {
            const fData = await checkRes.json();
            sha = fData.sha;
          }

          const putUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/contents/${setFilePath}`;
          const payload: any = {
            message: `${finalCommitMessage} (${setName})`,
            content: Buffer.from(fileJson).toString("base64"),
            branch,
          };
          if (sha) payload.sha = sha;

          await fetch(putUrl, { method: "PUT", headers, body: JSON.stringify(payload) });
        }

        return NextResponse.json({
          success: true,
          provider: "github",
          branch,
          message: finalCommitMessage,
        });
      }

      // Single file commit
      const targetFilePath = syncMeta?.targetPath || cleanPath || "tokens.json";
      const fileJson = JSON.stringify(rawTokens, null, 2);

      const getFileUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/contents/${targetFilePath}?ref=${encodeURIComponent(branch)}`;

      let fileSha: string | undefined = undefined;
      const checkRes = await fetch(getFileUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "TokensStudio-SecondScreen-Viewer",
        },
        cache: "no-store",
      });

      if (checkRes.ok) {
        const fileData = await checkRes.json();
        fileSha = fileData.sha;
      }

      const putFileUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/contents/${targetFilePath}`;
      const payload: Record<string, any> = {
        message: finalCommitMessage,
        content: Buffer.from(fileJson).toString("base64"),
        branch: branch,
      };
      if (fileSha) {
        payload.sha = fileSha;
      }

      const commitRes = await fetch(putFileUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      if (!commitRes.ok) {
        const errText = await commitRes.text();
        let parsedMessage = commitRes.statusText;
        try {
          const errObj = JSON.parse(errText);
          parsedMessage = errObj.message || parsedMessage;
        } catch {
          // ignore
        }
        return NextResponse.json(
          { error: `GitHub Commit Failed (${commitRes.status}): ${parsedMessage}` },
          { status: commitRes.status }
        );
      }

      const commitResult = await commitRes.json();
      return NextResponse.json({
        success: true,
        provider: "github",
        commitSha: commitResult.commit?.sha || commitResult.content?.sha,
        branch: branch,
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

      // 1. Get current branch ref and latest commit SHA
      const getRefsUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/refs?filter=heads/${encodeURIComponent(
        branch
      )}&api-version=7.0`;

      const refRes = await fetch(getRefsUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!refRes.ok) {
        return NextResponse.json(
          { error: `Could not fetch branch '${branch}' on Azure DevOps repository.` },
          { status: refRes.status }
        );
      }

      const refData = await refRes.json();
      const currentBranchObj = refData.value?.[0];
      if (!currentBranchObj || !currentBranchObj.objectId) {
        return NextResponse.json(
          { error: `Branch 'refs/heads/${branch}' not found in Azure DevOps repository.` },
          { status: 404 }
        );
      }

      const oldObjectId = currentBranchObj.objectId;

      // Prepare changes list (multi-file or single file)
      const isFolderMode = syncMeta?.mode === "folder" && syncMeta?.files;
      const changes: any[] = [];

      if (isFolderMode && syncMeta.files) {
        for (const [setName, setFilePath] of Object.entries(syncMeta.files)) {
          if (setName.startsWith("$") && !rawTokens[setName]) continue;
          const contentObj = rawTokens[setName] || {};
          const fileJson = JSON.stringify(contentObj, null, 2);
          const normalizedPath = setFilePath.startsWith("/") ? setFilePath : "/" + setFilePath;

          changes.push({
            changeType: "edit",
            item: { path: normalizedPath },
            newContent: {
              content: fileJson,
              contentType: "rawText",
            },
          });
        }
      } else {
        const targetFilePath = syncMeta?.targetPath || cleanPath || "tokens.json";
        const normalizedPath = targetFilePath.startsWith("/") ? targetFilePath : "/" + targetFilePath;
        const fileJson = JSON.stringify(rawTokens, null, 2);

        changes.push({
          changeType: "edit",
          item: { path: normalizedPath },
          newContent: {
            content: fileJson,
            contentType: "rawText",
          },
        });
      }

      // Create push commit
      const pushUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/pushes?api-version=7.0`;

      const pushPayload = {
        refUpdates: [
          {
            name: `refs/heads/${branch}`,
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
