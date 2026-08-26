import { RawTokensDocument } from "@/types/tokens";

export interface TokenDiffItem {
  key: string;
  name: string;
  setName: string;
  type: string;
  changeType: "added" | "modified" | "deleted";
  oldValue?: any;
  newValue?: any;
  oldDescription?: string;
  newDescription?: string;
}

export interface FileDiffItem {
  fileName: string;
  setName: string;
  oldJson: string;
  newJson: string;
  changeType: "added" | "modified" | "deleted";
  tokens: TokenDiffItem[];
  lineDiff: LineDiffChunk[];
  addedCount: number;
  modifiedCount: number;
  deletedCount: number;
}

export interface LineDiffChunk {
  type: "added" | "removed" | "unchanged";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface SideBySideRow {
  left?: {
    lineNumber?: number;
    content: string;
    type: "removed" | "context" | "empty";
  };
  right?: {
    lineNumber?: number;
    content: string;
    type: "added" | "context" | "empty";
  };
}

export interface SideBySideHunk {
  header?: string;
  rows: SideBySideRow[];
}

export interface DocumentDiffSummary {
  files: FileDiffItem[];
  totalAdded: number;
  totalModified: number;
  totalDeleted: number;
  hasChanges: boolean;
}

/**
 * Recursively extracts all tokens from a raw set object into a flat key-value map.
 */
function extractTokensFlat(
  obj: any,
  prefix: string[] = []
): Record<string, { value: any; type: string; description?: string }> {
  const result: Record<string, { value: any; type: string; description?: string }> = {};
  if (!obj || typeof obj !== "object") return result;

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    if (val && typeof val === "object") {
      const isToken = "value" in val || "$value" in val;
      if (isToken) {
        const rawVal = (val as any).value !== undefined ? (val as any).value : (val as any).$value;
        const type = (val as any).type || (val as any).$type || "unknown";
        const description = (val as any).description || (val as any).$description;
        const fullKey = [...prefix, key].join(".");
        result[fullKey] = { value: rawVal, type, description };
      } else {
        Object.assign(result, extractTokensFlat(val, [...prefix, key]));
      }
    }
  }

  return result;
}

/**
 * Standard line-by-line unified diff calculation between two text strings.
 */
export function computeLineDiff(oldStr: string, newStr: string): LineDiffChunk[] {
  const oldLines = oldStr ? oldStr.split("\n") : [];
  const newLines = newStr ? newStr.split("\n") : [];

  const chunks: LineDiffChunk[] = [];
  let oldIdx = 0;
  let newIdx = 0;

  // Simple and fast line comparison with LCS lookahead
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx];
    const newLine = newLines[newIdx];

    if (oldIdx < oldLines.length && newIdx < newLines.length && oldLine === newLine) {
      chunks.push({
        type: "unchanged",
        content: oldLine,
        oldLineNumber: oldIdx + 1,
        newLineNumber: newIdx + 1,
      });
      oldIdx++;
      newIdx++;
    } else if (newIdx >= newLines.length) {
      chunks.push({
        type: "removed",
        content: oldLine,
        oldLineNumber: oldIdx + 1,
      });
      oldIdx++;
    } else if (oldIdx >= oldLines.length) {
      chunks.push({
        type: "added",
        content: newLine,
        newLineNumber: newIdx + 1,
      });
      newIdx++;
    } else {
      // Lookahead to find next match
      let foundMatch = false;
      for (let offset = 1; offset < 6; offset++) {
        if (newIdx + offset < newLines.length && oldLine === newLines[newIdx + offset]) {
          for (let i = 0; i < offset; i++) {
            chunks.push({
              type: "added",
              content: newLines[newIdx + i],
              newLineNumber: newIdx + i + 1,
            });
          }
          newIdx += offset;
          foundMatch = true;
          break;
        } else if (oldIdx + offset < oldLines.length && oldLines[oldIdx + offset] === newLine) {
          for (let i = 0; i < offset; i++) {
            chunks.push({
              type: "removed",
              content: oldLines[oldIdx + i],
              oldLineNumber: oldIdx + i + 1,
            });
          }
          oldIdx += offset;
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        chunks.push({
          type: "removed",
          content: oldLine,
          oldLineNumber: oldIdx + 1,
        });
        chunks.push({
          type: "added",
          content: newLine,
          newLineNumber: newIdx + 1,
        });
        oldIdx++;
        newIdx++;
      }
    }
  }

  return chunks;
}

/**
 * Computes semantic token diffs and file-level line diffs between an original document and an updated document.
 */
export function computeTokensDiff(
  originalDoc: RawTokensDocument,
  updatedDoc: RawTokensDocument,
  syncMetaFiles?: Record<string, string>
): DocumentDiffSummary {
  const allSetKeys = Array.from(
    new Set([...Object.keys(originalDoc || {}), ...Object.keys(updatedDoc || {})])
  );

  const fileDiffs: FileDiffItem[] = [];
  let totalAdded = 0;
  let totalModified = 0;
  let totalDeleted = 0;

  for (const setKey of allSetKeys) {
    const oldSetObj = originalDoc?.[setKey];
    const newSetObj = updatedDoc?.[setKey];

    const oldJson = oldSetObj !== undefined ? JSON.stringify(oldSetObj, null, 2) : "";
    const newJson = newSetObj !== undefined ? JSON.stringify(newSetObj, null, 2) : "";

    // If identical string representation, skip
    if (oldJson.trim() === newJson.trim()) {
      continue;
    }

    const filePath = syncMetaFiles?.[setKey] || `${setKey}.json`;
    let fileChangeType: "added" | "modified" | "deleted" = "modified";
    if (oldSetObj === undefined && newSetObj !== undefined) {
      fileChangeType = "added";
    } else if (oldSetObj !== undefined && newSetObj === undefined) {
      fileChangeType = "deleted";
    }

    const oldTokensFlat = extractTokensFlat(oldSetObj);
    const newTokensFlat = extractTokensFlat(newSetObj);
    const allTokenKeys = Array.from(
      new Set([...Object.keys(oldTokensFlat), ...Object.keys(newTokensFlat)])
    );

    const tokenDiffs: TokenDiffItem[] = [];
    let setAdded = 0;
    let setModified = 0;
    let setDeleted = 0;

    for (const tKey of allTokenKeys) {
      const oldT = oldTokensFlat[tKey];
      const newT = newTokensFlat[tKey];

      if (!oldT && newT) {
        tokenDiffs.push({
          key: tKey,
          name: tKey,
          setName: setKey,
          type: newT.type,
          changeType: "added",
          newValue: newT.value,
          newDescription: newT.description,
        });
        setAdded++;
      } else if (oldT && !newT) {
        tokenDiffs.push({
          key: tKey,
          name: tKey,
          setName: setKey,
          type: oldT.type,
          changeType: "deleted",
          oldValue: oldT.value,
          oldDescription: oldT.description,
        });
        setDeleted++;
      } else if (oldT && newT) {
        const valChanged = JSON.stringify(oldT.value) !== JSON.stringify(newT.value);
        const descChanged = (oldT.description || "") !== (newT.description || "");
        const typeChanged = oldT.type !== newT.type;

        if (valChanged || descChanged || typeChanged) {
          tokenDiffs.push({
            key: tKey,
            name: tKey,
            setName: setKey,
            type: newT.type,
            changeType: "modified",
            oldValue: oldT.value,
            newValue: newT.value,
            oldDescription: oldT.description,
            newDescription: newT.description,
          });
          setModified++;
        }
      }
    }

    const lineDiff = computeLineDiff(oldJson, newJson);

    fileDiffs.push({
      fileName: filePath,
      setName: setKey,
      oldJson,
      newJson,
      changeType: fileChangeType,
      tokens: tokenDiffs,
      lineDiff,
      addedCount: setAdded,
      modifiedCount: setModified,
      deletedCount: setDeleted,
    });

    totalAdded += setAdded;
    totalModified += setModified;
    totalDeleted += setDeleted;
  }

  return {
    files: fileDiffs,
    totalAdded,
    totalModified,
    totalDeleted,
    hasChanges: fileDiffs.length > 0,
  };
}

/**
 * Computes side-by-side aligned diff rows with context folding from old and new text.
 */
export function computeSideBySideDiff(
  oldStr: string,
  newStr: string,
  contextLines: number = 4
): SideBySideHunk[] {
  const lineDiff = computeLineDiff(oldStr, newStr);
  if (lineDiff.length === 0) return [];

  // Identify changed indices
  const changedIndices: number[] = [];
  lineDiff.forEach((c, idx) => {
    if (c.type === "added" || c.type === "removed") {
      changedIndices.push(idx);
    }
  });

  if (changedIndices.length === 0) {
    // No changes, return entire context or empty
    return [
      {
        header: `1 - ${lineDiff.length}`,
        rows: lineDiff.slice(0, 15).map((c) => ({
          left: { lineNumber: c.oldLineNumber, content: c.content, type: "context" },
          right: { lineNumber: c.newLineNumber, content: c.content, type: "context" },
        })),
      },
    ];
  }

  // Create ranges with context
  const ranges: [number, number][] = [];
  changedIndices.forEach((idx) => {
    const start = Math.max(0, idx - contextLines);
    const end = Math.min(lineDiff.length - 1, idx + contextLines);

    if (ranges.length === 0) {
      ranges.push([start, end]);
    } else {
      const last = ranges[ranges.length - 1];
      if (start <= last[1] + 1) {
        last[1] = Math.max(last[1], end);
      } else {
        ranges.push([start, end]);
      }
    }
  });

  const hunks: SideBySideHunk[] = [];

  for (const [start, end] of ranges) {
    const slice = lineDiff.slice(start, end + 1);
    const rows: SideBySideRow[] = [];

    let i = 0;
    while (i < slice.length) {
      const chunk = slice[i];

      if (chunk.type === "unchanged") {
        rows.push({
          left: { lineNumber: chunk.oldLineNumber, content: chunk.content, type: "context" },
          right: { lineNumber: chunk.newLineNumber, content: chunk.content, type: "context" },
        });
        i++;
      } else {
        // Collect consecutive removed and added chunks
        const removed: LineDiffChunk[] = [];
        const added: LineDiffChunk[] = [];

        while (i < slice.length && slice[i].type === "removed") {
          removed.push(slice[i]);
          i++;
        }
        while (i < slice.length && slice[i].type === "added") {
          added.push(slice[i]);
          i++;
        }

        const maxLen = Math.max(removed.length, added.length);
        for (let k = 0; k < maxLen; k++) {
          const r = removed[k];
          const a = added[k];

          rows.push({
            left: r
              ? { lineNumber: r.oldLineNumber, content: r.content, type: "removed" }
              : { content: "", type: "empty" },
            right: a
              ? { lineNumber: a.newLineNumber, content: a.content, type: "added" }
              : { content: "", type: "empty" },
          });
        }
      }
    }

    const firstOld = slice.find((s) => s.oldLineNumber)?.oldLineNumber || 1;
    const firstNew = slice.find((s) => s.newLineNumber)?.newLineNumber || 1;

    hunks.push({
      header: `@@ -${firstOld} +${firstNew} @@`,
      rows,
    });
  }

  return hunks;
}

/**
 * Parses a standard Git unified patch string (e.g. from GitHub/GitLab) into SideBySideHunks.
 */
export function parseUnifiedPatchToSideBySide(patchStr: string): SideBySideHunk[] {
  if (!patchStr || !patchStr.trim()) return [];

  const lines = patchStr.split("\n");
  const hunks: SideBySideHunk[] = [];
  let currentHunk: SideBySideHunk | null = null;

  let oldLine = 1;
  let newLine = 1;

  let removedBuffer: { lineNum: number; content: string }[] = [];
  let addedBuffer: { lineNum: number; content: string }[] = [];

  const flushBuffers = () => {
    if (!currentHunk) return;
    const maxLen = Math.max(removedBuffer.length, addedBuffer.length);
    for (let i = 0; i < maxLen; i++) {
      const r = removedBuffer[i];
      const a = addedBuffer[i];
      currentHunk.rows.push({
        left: r ? { lineNumber: r.lineNum, content: r.content, type: "removed" } : { content: "", type: "empty" },
        right: a ? { lineNumber: a.lineNum, content: a.content, type: "added" } : { content: "", type: "empty" },
      });
    }
    removedBuffer = [];
    addedBuffer = [];
  };

  for (const line of lines) {
    if (line.startsWith("@@")) {
      flushBuffers();
      const match = line.match(/@@\s*-(\d+)(?:,\d+)?\s*\+(\d+)(?:,\d+)?\s*@@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      currentHunk = {
        header: line,
        rows: [],
      };
      hunks.push(currentHunk);
    } else if (currentHunk) {
      if (line.startsWith("-")) {
        removedBuffer.push({ lineNum: oldLine, content: line.substring(1) });
        oldLine++;
      } else if (line.startsWith("+")) {
        addedBuffer.push({ lineNum: newLine, content: line.substring(1) });
        newLine++;
      } else {
        flushBuffers();
        const content = line.startsWith(" ") ? line.substring(1) : line;
        currentHunk.rows.push({
          left: { lineNumber: oldLine, content, type: "context" },
          right: { lineNumber: newLine, content, type: "context" },
        });
        oldLine++;
        newLine++;
      }
    }
  }

  flushBuffers();
  return hunks;
}
