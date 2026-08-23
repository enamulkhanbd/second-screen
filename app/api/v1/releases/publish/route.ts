import { NextRequest, NextResponse } from "next/server";
import {
  DistributionTarget,
  ReleasePackage,
  TargetPublishResult,
} from "@/types/tokens";
import { getPlatformArtifactContent } from "@/utils/releaseCompiler";

interface PublishRequestBody {
  targets: DistributionTarget[];
  release: ReleasePackage;
  defaultPat?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: PublishRequestBody = await req.json();
    const { targets, release, defaultPat } = body;

    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json(
        { error: "No distribution targets specified." },
        { status: 400 }
      );
    }

    if (!release) {
      return NextResponse.json(
        { error: "Missing release package payload." },
        { status: 400 }
      );
    }

    const results: TargetPublishResult[] = [];

    // Process all targets in parallel
    await Promise.all(
      targets.map(async (target) => {
        const pat = target.pat || defaultPat;
        if (!pat) {
          results.push({
            targetId: target.id,
            targetName: target.name,
            provider: target.provider,
            repo: target.repo,
            branch: target.branch,
            status: "error",
            message: "Missing Personal Access Token (PAT) for this target repository.",
          });
          return;
        }

        const enabledFormats = (target.formats || []).filter((f) => f.enabled);
        if (enabledFormats.length === 0) {
          results.push({
            targetId: target.id,
            targetName: target.name,
            provider: target.provider,
            repo: target.repo,
            branch: target.branch,
            status: "error",
            message: "No platform formats enabled for this target.",
          });
          return;
        }

        // Map files to commit: filePath -> content
        const filesToPush: { path: string; content: string }[] = [];
        enabledFormats.forEach((f) => {
          const artifact = getPlatformArtifactContent(f.formatId, release);
          const targetPath = (f.targetPath || artifact.filename).replace(/^\/+/, "");
          filesToPush.push({
            path: targetPath,
            content: artifact.content,
          });
        });

        const commitMsg = `chore(tokens): release ${release.version} - ${release.title}\n\n${release.notes || ""}`;

        // -------------------------------------------------------------
        // GITHUB PUBLISHER
        // -------------------------------------------------------------
        if (target.provider === "github") {
          try {
            const headers = {
              Authorization: `Bearer ${pat}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "TokensPlatform-Cloud/1.0",
              "Content-Type": "application/json",
            };

            let pushBranch = target.branch;

            // If PR mode, create a feature branch first
            if (target.publishMode === "pull_request") {
              const newBranchName = `tokens-release-${release.version.replace(/[^a-zA-Z0-9.-]+/g, "-")}-${Date.now().toString().slice(-4)}`;

              // 1. Get base branch SHA
              const baseRefUrl = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(
                target.repo
              )}/git/ref/heads/${encodeURIComponent(target.branch)}`;

              const baseRefRes = await fetch(baseRefUrl, { headers });
              if (!baseRefRes.ok) {
                throw new Error(`Failed to read base branch '${target.branch}' (${baseRefRes.status})`);
              }
              const baseRefData = await baseRefRes.json();
              const baseSha = baseRefData.object?.sha;

              // 2. Create new branch
              const createRefUrl = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(
                target.repo
              )}/git/refs`;

              const createRefRes = await fetch(createRefUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  ref: `refs/heads/${newBranchName}`,
                  sha: baseSha,
                }),
              });

              if (!createRefRes.ok) {
                throw new Error(`Failed to create release branch '${newBranchName}'`);
              }

              pushBranch = newBranchName;
            }

            // Commit each file
            for (const file of filesToPush) {
              const getFileUrl = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(
                target.repo
              )}/contents/${encodeURIComponent(file.path)}?ref=${encodeURIComponent(pushBranch)}`;

              let sha: string | undefined = undefined;
              try {
                const getRes = await fetch(getFileUrl, { headers, cache: "no-store" });
                if (getRes.ok) {
                  const fData = await getRes.json();
                  sha = fData.sha;
                }
              } catch {
                // ignore
              }

              const putFileUrl = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(
                target.repo
              )}/contents/${encodeURIComponent(file.path)}`;

              const putRes = await fetch(putFileUrl, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                  message: `${commitMsg} (${file.path})`,
                  content: Buffer.from(file.content).toString("base64"),
                  branch: pushBranch,
                  ...(sha ? { sha } : {}),
                }),
              });

              if (!putRes.ok) {
                const errJson = await putRes.json().catch(() => ({}));
                throw new Error(errJson.message || `Failed to commit '${file.path}' (${putRes.status})`);
              }
            }

            // If PR mode, create Pull Request
            let prUrl: string | undefined = undefined;
            let prNum: number | undefined = undefined;

            if (target.publishMode === "pull_request") {
              const prCreateUrl = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(
                target.repo
              )}/pulls`;

              const prRes = await fetch(prCreateUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  title: `Design Tokens Release: ${release.version} (${release.title})`,
                  body: `### 🎨 Design Tokens Update (${release.version})\n\n**Title:** ${release.title}\n**Date:** ${new Date().toISOString()}\n\n#### Release Notes\n${release.notes || "No notes provided."}\n\n---\n*Automated release via [Second Screen](https://second-screen.vercel.app)*`,
                  head: pushBranch,
                  base: target.branch,
                }),
              });

              if (prRes.ok) {
                const prData = await prRes.json();
                prUrl = prData.html_url;
                prNum = prData.number;
              }
            }

            results.push({
              targetId: target.id,
              targetName: target.name,
              provider: "github",
              repo: target.repo,
              branch: target.branch,
              status: "success",
              message: target.publishMode === "pull_request" && prUrl
                ? `Pull Request #${prNum} created on GitHub`
                : `Committed ${filesToPush.length} files to branch '${target.branch}'`,
              pullRequestUrl: prUrl,
              pullRequestNumber: prNum,
              filesCount: filesToPush.length,
            });
          } catch (err: any) {
            results.push({
              targetId: target.id,
              targetName: target.name,
              provider: "github",
              repo: target.repo,
              branch: target.branch,
              status: "error",
              message: err.message || "GitHub publish failed.",
            });
          }
          return;
        }

        // -------------------------------------------------------------
        // AZURE DEVOPS PUBLISHER
        // -------------------------------------------------------------
        if (target.provider === "azure") {
          try {
            const azOrg = encodeURIComponent(target.owner);
            const azProject = encodeURIComponent(target.project || target.owner);
            const azRepo = encodeURIComponent(target.repo);
            const basicAuth = Buffer.from(`:${pat}`).toString("base64");

            // 1. Get branch heads
            const getRefsUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/refs?filter=heads/&api-version=7.0`;
            const refRes = await fetch(getRefsUrl, {
              headers: {
                Authorization: `Basic ${basicAuth}`,
                "Content-Type": "application/json",
              },
            });

            if (!refRes.ok) {
              throw new Error(`Azure DevOps repo access failed (${refRes.status})`);
            }

            const refData = await refRes.json();
            const targetHead = (refData.value || []).find(
              (r: any) => r.name === `refs/heads/${target.branch}`
            );

            if (!targetHead) {
              throw new Error(`Branch 'refs/heads/${target.branch}' not found on Azure DevOps.`);
            }

            const oldObjectId = targetHead.objectId;

            // Check existing items to decide "edit" vs "add"
            const changes = await Promise.all(
              filesToPush.map(async (file) => {
                const itemCheckUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/items?path=${encodeURIComponent(
                  "/" + file.path
                )}&versionDescriptor.version=${encodeURIComponent(target.branch)}&versionDescriptor.versionType=branch&api-version=7.0`;

                let changeType = "add";
                try {
                  const check = await fetch(itemCheckUrl, {
                    headers: { Authorization: `Basic ${basicAuth}` },
                  });
                  if (check.ok) changeType = "edit";
                } catch {
                  // ignore
                }

                return {
                  changeType,
                  item: { path: "/" + file.path },
                  newContent: {
                    content: file.content,
                    contentType: "rawtext",
                  },
                };
              })
            );

            // Push commit
            const pushUrl = `https://dev.azure.com/${azOrg}/${azProject}/_apis/git/repositories/${azRepo}/pushes?api-version=7.0`;
            const pushRes = await fetch(pushUrl, {
              method: "POST",
              headers: {
                Authorization: `Basic ${basicAuth}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                refUpdates: [
                  {
                    name: `refs/heads/${target.branch}`,
                    oldObjectId,
                  },
                ],
                commits: [
                  {
                    comment: commitMsg,
                    changes,
                  },
                ],
              }),
            });

            if (!pushRes.ok) {
              const errData = await pushRes.json().catch(() => ({}));
              throw new Error(errData.message || `Azure DevOps push failed (${pushRes.status})`);
            }

            results.push({
              targetId: target.id,
              targetName: target.name,
              provider: "azure",
              repo: target.repo,
              branch: target.branch,
              status: "success",
              message: `Pushed ${filesToPush.length} files to Azure DevOps branch '${target.branch}'`,
              filesCount: filesToPush.length,
            });
          } catch (err: any) {
            results.push({
              targetId: target.id,
              targetName: target.name,
              provider: "azure",
              repo: target.repo,
              branch: target.branch,
              status: "error",
              message: err.message || "Azure DevOps publish failed.",
            });
          }
        }
      })
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error during release publishing." },
      { status: 500 }
    );
  }
}
