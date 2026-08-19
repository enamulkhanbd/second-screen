import { GitCredentials } from "@/types/tokens";

/**
 * Sanitizes and normalizes Git credentials for GitHub and Azure DevOps.
 * Gracefully extracts org, project, repo, and branch even if the user pastes
 * full browser URLs, repo clone URLs, or adds extraneous slashes/protocols/colons.
 */
export function sanitizeGitCredentials(rawCreds: GitCredentials): GitCredentials {
  let { provider, owner, project, repo, branch, path, pat } = rawCreds;

  owner = (owner || "").trim();
  project = (project || "").trim();
  repo = (repo || "").trim();
  branch = (branch || "main").trim();
  path = (path || "").trim();
  pat = (pat || "").trim();

  // ----------------------------------------------------------------
  // GITHUB SANITIZATION
  // ----------------------------------------------------------------
  if (provider === "github") {
    // If full GitHub URL was pasted: e.g. https://github.com/owner/repo
    if (repo.includes("github.com") || repo.includes("http")) {
      const parts = repo
        .replace(/^https?:\/\//i, "")
        .replace(/^github\.com\//i, "")
        .split("/")
        .filter(Boolean);
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts[1];
      } else if (parts.length === 1) {
        repo = parts[0];
      }
    } else if (repo.includes("/")) {
      // User entered "owner/repo" in the Repository field
      const parts = repo.split("/").filter(Boolean);
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts[1];
      }
    }

    if (owner.includes("github.com") || owner.includes("http")) {
      const parts = owner
        .replace(/^https?:\/\//i, "")
        .replace(/^github\.com\//i, "")
        .split("/")
        .filter(Boolean);
      if (parts.length >= 1) owner = parts[0];
      if (parts.length >= 2 && !repo) repo = parts[1];
    }
  }

  // ----------------------------------------------------------------
  // AZURE DEVOPS SANITIZATION
  // ----------------------------------------------------------------
  if (provider === "azure") {
    const fullUrlMatch = (owner + " " + repo).match(
      /(?:https?:\/\/)?dev\.azure\.com\/([^/?#\s]+)(?:\/([^/?#\s]+))?(?:\/_git\/([^/?#\s]+))?/i
    );
    const legacyUrlMatch = (owner + " " + repo).match(
      /(?:https?:\/\/)?([^.]+)\.visualstudio\.com(?:\/([^/?#\s]+))?(?:\/_git\/([^/?#\s]+))?/i
    );

    if (fullUrlMatch) {
      if (fullUrlMatch[1]) owner = fullUrlMatch[1];
      if (fullUrlMatch[2] && !project) project = fullUrlMatch[2];
      if (fullUrlMatch[3] && !repo) repo = fullUrlMatch[3];
    } else if (legacyUrlMatch) {
      if (legacyUrlMatch[1]) owner = legacyUrlMatch[1];
      if (legacyUrlMatch[2] && !project) project = legacyUrlMatch[2];
      if (legacyUrlMatch[3] && !repo) repo = legacyUrlMatch[3];
    }

    owner = owner
      .replace(/^https?:\/\//i, "")
      .replace(/^dev\.azure\.com\//i, "")
      .replace(/\.visualstudio\.com\/?/i, "")
      .split("/")[0] || owner;

    if (project.includes("dev.azure.com") || project.includes("http")) {
      const parts = project.split("/").filter(Boolean);
      project = parts[parts.length - 1] || project;
    }

    if (repo.includes("/_git/")) {
      repo = repo.split("/_git/")[1] || repo;
    } else if (repo.includes("/")) {
      const parts = repo.split("/").filter(Boolean);
      repo = parts[parts.length - 1] || repo;
    }
  }

  // Strip extraneous protocol artifacts, colons, slashes, or '.git' suffixes
  owner = owner.replace(/^(https?:\/\/)?/i, "").replace(/^[/:\s]+|[/:\s]+$/g, "");
  project = project.replace(/^(https?:\/\/)?/i, "").replace(/^[/:\s]+|[/:\s]+$/g, "");
  repo = repo
    .replace(/^(https?:\/\/)?/i, "")
    .replace(/^[/:\s]+|[/:\s]+$/g, "")
    .replace(/\.git$/i, "");
  branch = branch.replace(/^refs\/heads\//i, "").replace(/^[/:\s]+|[/:\s]+$/g, "");
  path = path.replace(/^[/\s]+|[/\s]+$/g, "");

  return {
    provider,
    owner: owner || repo.split("/")[0] || "",
    project: project || owner,
    repo: repo.includes("/") ? repo.split("/")[1] : repo,
    branch: branch || "main",
    path: path || "",
    pat,
  };
}
