import crypto from "crypto";

/**
 * Builds the canonical Upstash Redis cache key for Git branch/file HEAD SHA lookups.
 * Shared by check-updates (read/write) and push (invalidation).
 */
export function buildGitShaCacheKey(
  provider: string,
  owner: string,
  project: string | undefined,
  repo: string,
  branch: string,
  targetPath: string,
  pat: string
): string {
  const digest = crypto
    .createHash("sha256")
    .update(`${provider}:${owner}:${project || ""}:${repo}:${branch}:${targetPath}:${pat}`)
    .digest("hex");
  return `git:sha:${digest}`;
}
