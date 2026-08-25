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
    if (key.startsWith("$") && key !== "$type" && key !== "$value" && key !== "$description") continue;
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
