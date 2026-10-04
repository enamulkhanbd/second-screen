"use client";

import { InputHTMLAttributes, useEffect, useRef, useState } from "react";
import { AssetCollection, ProjectAsset } from "@/types/tenant";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AssetDimensions = NonNullable<ProjectAsset["dimensions"]>;

interface UploadAssetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: AssetCollection[];
  initialCollectionId: string | null;
  initialFiles?: File[];
  onUpload: (files: File[], collectionId: string | null, dimensions: Map<string, AssetDimensions>) => Promise<void>;
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function getAspectRatio(width: number, height: number) {
  let left = width;
  let right = height;
  while (right !== 0) [left, right] = [right, left % right];
  return `${width / left}:${height / left}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadAssetsModal({
  open,
  onOpenChange,
  collections,
  initialCollectionId,
  initialFiles = [],
  onUpload,
}: UploadAssetsModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [collectionId, setCollectionId] = useState(initialCollectionId || "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [dimensions, setDimensions] = useState<Map<string, AssetDimensions>>(new Map());
  const [isInspecting, setIsInspecting] = useState(false);

  useEffect(() => {
    if (open) setCollectionId(initialCollectionId || "");
  }, [initialCollectionId, open]);

  useEffect(() => {
    if (open && initialFiles.length > 0) {
      setFiles((current) => {
        const known = new Set(current.map(fileKey));
        return [...current, ...initialFiles.filter((file) => !known.has(fileKey(file)))];
      });
    }
  }, [initialFiles, open]);

  useEffect(() => {
    const nextPreviews = new Map<string, string>();
    let isCurrent = true;
    const imageFiles = files.filter((file) => file.type.startsWith("image/") && !file.type.includes("svg"));

    for (const file of imageFiles) nextPreviews.set(fileKey(file), URL.createObjectURL(file));

    setPreviews(nextPreviews);
    setDimensions(new Map());
    setIsInspecting(imageFiles.length > 0);
    Promise.all(imageFiles.map(async (file) => {
      try {
        const bitmap = await createImageBitmap(file);
        const size = {
          width: bitmap.width,
          height: bitmap.height,
          aspect: getAspectRatio(bitmap.width, bitmap.height),
        };
        bitmap.close();
        return [fileKey(file), size] as const;
      } catch {
        if (isCurrent) setError(`Could not inspect image dimensions for ${file.name}.`);
        return null;
      }
    })).then((results) => {
      if (isCurrent) setDimensions(new Map(results.filter((result): result is NonNullable<typeof result> => result !== null)));
    }).finally(() => {
      if (isCurrent) setIsInspecting(false);
    });
    return () => {
      isCurrent = false;
      nextPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const addFiles = (incoming: File[]) => {
    setError(null);
    setFiles((current) => {
      const known = new Set(current.map(fileKey));
      return [...current, ...incoming.filter((file) => !known.has(fileKey(file)))];
    });
  };

  const reset = () => {
    if (isUploading) return;
    setFiles([]);
    setError(null);
    onOpenChange(false);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Choose at least one file to upload.");
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      await onUpload(files, collectionId || null, dimensions);
      setFiles([]);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The files could not be uploaded.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : reset()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload assets</DialogTitle>
          <DialogDescription>Stage several files, review their details, and choose a destination collection.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            Target collection
            <select
              value={collectionId}
              onChange={(event) => setCollectionId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Assets (no collection)</option>
              {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
            </select>
          </label>

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addFiles(Array.from(event.dataTransfer.files));
            }}
            className="flex min-h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 text-center"
          >
            <p className="text-sm font-medium">Drop files here</p>
            <p className="mt-1 text-xs text-muted-foreground">Images, SVGs, videos, documents, ZIPs, or a folder</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>
              Browse files
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => directoryInputRef.current?.click()}>
              Choose folder
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".svg,.png,.jpg,.jpeg,.webp,.gif,.ico,.avif,.mp4,.webm,.mov,.pdf,.json,.zip"
              className="hidden"
              onChange={(event) => {
                addFiles(Array.from(event.target.files || []));
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={directoryInputRef}
              type="file"
              multiple
              {...({ webkitdirectory: "", directory: "" } as InputHTMLAttributes<HTMLInputElement>)}
              className="hidden"
              onChange={(event) => {
                addFiles(Array.from(event.target.files || []));
                event.currentTarget.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {files.map((file) => {
                const key = fileKey(file);
                const size = dimensions.get(key);
                return (
                  <li key={key} className="flex items-center gap-3 rounded-lg border border-border p-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {previews.get(key) ? (
                        <img src={previews.get(key)} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">{file.name.split(".").pop()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={file.name}>{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}{size ? ` · ${size.width} × ${size.height} · ${size.aspect}` : ""}
                      </p>
                      {isUploading && (
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-primary">Uploading…</p>
                          <progress aria-label={`Uploading ${file.name}`} className="h-1 w-full" />
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${file.name}`}
                      disabled={isUploading}
                      onClick={() => setFiles((current) => current.filter((item) => fileKey(item) !== key))}
                    >
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={reset} disabled={isUploading}>Cancel</Button>
          <Button type="button" onClick={handleUpload} disabled={isUploading || isInspecting || files.length === 0}>
            {isInspecting ? "Inspecting…" : isUploading ? "Uploading…" : `Upload ${files.length || ""} ${files.length === 1 ? "file" : "files"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
