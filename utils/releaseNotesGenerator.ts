import { ReleasePackage, ReleaseThemeChange, ThemeGroup } from "@/types/tokens";

/**
 * Compare two theme groups arrays and detect added/deleted theme options
 */
export function computeThemeChanges(
  oldGroups: ThemeGroup[] = [],
  newGroups: ThemeGroup[] = []
): ReleaseThemeChange[] {
  const changes: ReleaseThemeChange[] = [];
  const oldMap = new Map<string, Set<string>>();
  for (const g of oldGroups) {
    oldMap.set(g.name, new Set((g.options || []).map((o) => o.name)));
  }
  const newMap = new Map<string, Set<string>>();
  for (const g of newGroups) {
    newMap.set(g.name, new Set((g.options || []).map((o) => o.name)));
  }

  for (const g of newGroups) {
    const oldOpts = oldMap.get(g.name);
    if (!oldOpts) {
      for (const opt of g.options || []) {
        changes.push({ groupName: g.name, optionName: opt.name, changeType: "added" });
      }
    } else {
      for (const opt of g.options || []) {
        if (!oldOpts.has(opt.name)) {
          changes.push({ groupName: g.name, optionName: opt.name, changeType: "added" });
        }
      }
    }
  }

  for (const g of oldGroups) {
    const newOpts = newMap.get(g.name);
    if (!newOpts) {
      for (const opt of g.options || []) {
        changes.push({ groupName: g.name, optionName: opt.name, changeType: "deleted" });
      }
    } else {
      for (const opt of g.options || []) {
        if (!newOpts.has(opt.name)) {
          changes.push({ groupName: g.name, optionName: opt.name, changeType: "deleted" });
        }
      }
    }
  }

  return changes;
}

/**
 * Format bytes into human-readable size e.g. "610 B", "184 KB", "1.2 MB"
 */
export function formatByteSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val < 10 && i > 0 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

/**
 * Trigger download of text/blob content in browser
 */
export function downloadBlob(content: string, filename: string, mimeType: string = "text/plain;charset=utf-8"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate manifest.json object string for a release
 */
export function generateReleaseManifest(release: ReleasePackage): string {
  const manifest = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    name: release.title,
    version: release.version,
    releaseId: release.id,
    createdAt: release.createdAt,
    branch: release.branch || "main",
    author: release.author || { name: "Second Screen Studio" },
    summary: release.summary || release.title,
    stats: {
      tokensCount: release.tokenCount,
      themesCount: release.themesCount,
      changesCount: release.changesCount || 0,
    },
    artifacts: release.artifacts || [
      { name: "Manifest", filename: "manifest.json", type: "manifest" },
      { name: "Raw JSON", filename: "tokens.json", type: "raw_json" },
    ],
    generator: "Second Screen Tokens Platform",
  };
  return JSON.stringify(manifest, null, 2);
}

/**
 * Generate Markdown release notes document (.md)
 */
export function generateMarkdownReleaseNotes(release: ReleasePackage): string {
  const dateFormatted = release.createdAt
    ? new Date(release.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recent";

  const authorName = release.author?.name || "Team";
  const authorEmail = release.author?.email ? ` (${release.author.email})` : "";

  let md = `# ${release.title} \`${release.version}\`\n\n`;
  md += `> **Released:** ${dateFormatted}  \n`;
  md += `> **Author:** ${authorName}${authorEmail}  \n`;
  md += `> **Branch:** \`${release.branch || "main"}\`  \n`;
  md += `> **Tokens:** ${release.tokenCount.toLocaleString()} tokens | **Themes:** ${release.themesCount} themes\n\n`;

  if (release.summary) {
    md += `## Overview\n\n${release.summary}\n\n`;
  }

  if (release.notes && release.notes.trim() !== release.summary?.trim()) {
    md += `## Release Notes\n\n${release.notes}\n\n`;
  }

  // Changed Tokens section
  const diffFiles = release.diffSummary?.files || [];
  if (diffFiles.length > 0) {
    md += `## Changed Tokens\n\n`;
    for (const file of diffFiles) {
      if (!file.tokens || file.tokens.length === 0) continue;
      md += `### \`${file.setName || file.fileName}\` (${file.tokens.length} changes)\n\n`;
      md += `| Change | Token | Type | Value |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;

      for (const t of file.tokens) {
        const symbol =
          t.changeType === "added" ? "➕ Added" : t.changeType === "deleted" ? "➖ Removed" : "✏️ Modified";
        const val =
          t.changeType === "deleted"
            ? `\`${JSON.stringify(t.oldValue)}\``
            : `\`${JSON.stringify(t.newValue)}\``;
        md += `| ${symbol} | \`${t.key}\` | \`${t.type || "unknown"}\` | ${val} |\n`;
      }
      md += `\n`;
    }
  }

  // Changed Themes section
  if (release.themeChanges && release.themeChanges.length > 0) {
    md += `## Changed Themes\n\n`;
    for (const tc of release.themeChanges) {
      const mark = tc.changeType === "added" ? "+" : tc.changeType === "deleted" ? "-" : "~";
      md += `- \`[${mark}]\` Theme Group: **${tc.groupName}** > Option: **${tc.optionName}**\n`;
    }
    md += `\n`;
  }

  md += `---\n*Generated by Second Screen Design Tokens Platform*\n`;
  return md;
}

/**
 * Generate Unified Diff text (.diff)
 */
export function generateDiffText(release: ReleasePackage): string {
  const diffFiles = release.diffSummary?.files || [];
  if (diffFiles.length === 0) {
    return `# Unified Diff for Release ${release.version}\n# No file changes recorded or initial release snapshot.\n`;
  }

  let diffOut = `diff --git a/tokens b/tokens\n`;
  diffOut += `# Release: ${release.title} (${release.version})\n`;
  diffOut += `# Date: ${release.createdAt}\n`;
  diffOut += `# Branch: ${release.branch || "main"}\n\n`;

  for (const file of diffFiles) {
    diffOut += `--- a/${file.fileName}\n`;
    diffOut += `+++ b/${file.fileName}\n`;

    if (file.lineDiff && file.lineDiff.length > 0) {
      for (const chunk of file.lineDiff) {
        if (chunk.type === "added") {
          diffOut += `+ ${chunk.content}\n`;
        } else if (chunk.type === "removed") {
          diffOut += `- ${chunk.content}\n`;
        } else {
          diffOut += `  ${chunk.content}\n`;
        }
      }
    } else if (file.tokens && file.tokens.length > 0) {
      for (const t of file.tokens) {
        if (t.changeType === "added") {
          diffOut += `+ "${t.key}": ${JSON.stringify(t.newValue)}\n`;
        } else if (t.changeType === "deleted") {
          diffOut += `- "${t.key}": ${JSON.stringify(t.oldValue)}\n`;
        } else {
          diffOut += `~ "${t.key}": ${JSON.stringify(t.oldValue)} -> ${JSON.stringify(t.newValue)}\n`;
        }
      }
    }
    diffOut += `\n`;
  }

  return diffOut;
}
