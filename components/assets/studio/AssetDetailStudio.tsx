"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetCollection, ProjectAsset } from "@/types/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, Minus, Plus, RotateCcw, Trash2, X } from "lucide-react";

interface AssetDetailStudioProps {
  asset: ProjectAsset | null;
  collections: AssetCollection[];
  assets: ProjectAsset[];
  canEdit: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ProjectAsset>) => Promise<void>;
  onDownload: (asset: ProjectAsset) => void;
  onDelete: (asset: ProjectAsset) => void;
}

function formatSize(size?: number) {
  if (size === undefined) return "—";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetDetailStudio({
  asset,
  collections,
  assets,
  canEdit,
  onClose,
  onUpdate,
  onDownload,
  onDelete,
}: AssetDetailStudioProps) {
  const [tab, setTab] = useState<"details" | "history">("details");
  const [zoom, setZoom] = useState(100);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customMetadata, setCustomMetadata] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const collectionId = asset?.collectionId || asset?.folderId;
  const collection = collections.find((item) => item.id === collectionId);
  const similarAssets = useMemo(
    () => asset ? assets.filter((item) =>
      item.id !== asset.id &&
      ((item.collectionId || item.folderId) === collectionId || Boolean(item.category && item.category === asset.category))
    ).slice(0, 6) : [],
    [asset, assets, collectionId]
  );

  useEffect(() => {
    setTab("details");
    setZoom(100);
    setName(asset?.title || asset?.name || "");
    setDescription(asset?.description || "");
    setCustomMetadata(asset?.customMetadata || {});
    setError(null);
  }, [asset]);

  if (!asset) return null;

  const saveDetails = async () => {
    const missingRequired = (collection?.customFields || []).find(
      (field) => field.required && (customMetadata[field.id] === undefined || customMetadata[field.id] === "")
    );
    if (missingRequired) {
      setError(`${missingRequired.label} is required.`);
      return;
    }
    setError(null);
    try {
      await onUpdate(asset.id, {
        name: name.trim() || asset.name,
        title: name.trim() || asset.name,
        description,
        customMetadata,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save asset details.");
    }
  };

  const imageSource = asset.url || (asset.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svg)}` : undefined);
  const mediaType = asset.assetType || (asset.contentType?.startsWith("image/") ? "image" : "other");

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="h-[92vh] max-h-[92vh] w-[96vw] max-w-[1440px] overflow-hidden p-0">
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex min-h-14 items-center gap-3 border-b border-border px-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] text-muted-foreground">
                Assets{collection ? ` / ${collection.name}` : ""} / {asset.title || asset.name}
              </p>
              <input
                aria-label="Asset title"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={saveDetails}
                disabled={!canEdit}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onDownload(asset)} aria-label="Download asset">
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            {canEdit && (
              <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(asset)} aria-label="Delete asset">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close asset details">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex min-h-0 flex-1">
            <main className="relative flex min-w-0 flex-1 flex-col bg-muted/30">
              <div className="flex flex-1 items-center justify-center overflow-auto p-8">
                <div className="flex h-full w-full items-center justify-center">
                  {mediaType === "video" && asset.url ? (
                    <video src={asset.url} controls className="max-h-full max-w-full rounded-lg" style={{ transform: `scale(${zoom / 100})` }} />
                  ) : mediaType === "document" ? (
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-sm font-medium">{asset.name}</span>
                      {asset.url && <a href={asset.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Open document</a>}
                    </div>
                  ) : imageSource ? (
                    <img
                      src={imageSource}
                      alt={asset.title || asset.name}
                      className="max-h-full max-w-full object-contain transition-transform"
                      style={{ transform: `scale(${zoom / 100})` }}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">Preview is unavailable for this asset.</div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 border-t border-border bg-background/90 p-2">
                <Button type="button" variant="ghost" size="icon" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(25, value - 25))}><Minus className="h-4 w-4" /></Button>
                <span className="w-12 text-center text-xs tabular-nums">{zoom}%</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(300, value + 25))}><Plus className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setZoom(100)}>100%</Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Zoom to fit" onClick={() => setZoom(100)}><RotateCcw className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap justify-center gap-2 border-t border-border bg-background/70 px-3 py-2">
                {["Original", "Layer Extraction", "Smart Variations", "Vector Conversion", "Upscale 2×", "Upscale 4×", "Regenerate"].map((action) => (
                  <Button key={action} type="button" variant="outline" size="sm" disabled title="Transformation tools are not available yet" className="h-7 text-[11px]">
                    {action}
                  </Button>
                ))}
              </div>
            </main>

            <aside className="flex w-[340px] shrink-0 flex-col border-l border-border">
              <div role="tablist" aria-label="Asset inspector" className="flex border-b border-border">
                {(["details", "history"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={tab === item}
                    onClick={() => setTab(item)}
                    className={`flex-1 px-4 py-3 text-sm capitalize ${tab === item ? "border-b-2 border-primary font-medium text-primary" : "text-muted-foreground"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {tab === "details" ? (
                <div className="flex-1 space-y-5 overflow-y-auto p-4">
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h3>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      onBlur={saveDetails}
                      disabled={!canEdit}
                      rows={3}
                      className="w-full resize-y rounded-md border border-input bg-background p-2 text-sm"
                      placeholder="Add a description…"
                    />
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Technical specifications</h3>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <dt className="text-muted-foreground">Version</dt><dd>v{asset.version || 1}</dd>
                      <dt className="text-muted-foreground">Dimensions</dt><dd>{asset.dimensions ? `${asset.dimensions.width} × ${asset.dimensions.height}` : "—"}</dd>
                      <dt className="text-muted-foreground">Aspect ratio</dt><dd>{asset.dimensions?.aspect || "—"}</dd>
                      <dt className="text-muted-foreground">Color space</dt><dd>{asset.colorSpace || "—"}</dd>
                      <dt className="text-muted-foreground">Format</dt><dd>{asset.format || asset.contentType?.split("/").pop()?.toUpperCase() || "—"}</dd>
                      <dt className="text-muted-foreground">File size</dt><dd>{formatSize(asset.size)}</dd>
                      <dt className="text-muted-foreground">Type</dt><dd className="capitalize">{asset.assetType || "other"}</dd>
                    </dl>
                  </section>
                  {collection?.customFields?.length ? (
                    <section className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom metadata</h3>
                      {collection.customFields.map((field) => (
                        <label key={field.id} className="block space-y-1 text-xs">
                          <span>{field.label}{field.required ? " *" : ""}</span>
                          {field.type === "boolean" ? (
                            <input
                              type="checkbox"
                              checked={Boolean(customMetadata[field.id])}
                              onChange={(event) => setCustomMetadata((current) => ({ ...current, [field.id]: event.target.checked }))}
                              onBlur={saveDetails}
                              disabled={!canEdit}
                            />
                          ) : field.type === "select" ? (
                            <select
                              value={String(customMetadata[field.id] ?? "")}
                              onChange={(event) => setCustomMetadata((current) => ({ ...current, [field.id]: event.target.value }))}
                              onBlur={saveDetails}
                              disabled={!canEdit}
                              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                            >
                              <option value="">Select…</option>
                              {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              value={String(customMetadata[field.id] ?? "")}
                              onChange={(event) => setCustomMetadata((current) => ({
                                ...current,
                                [field.id]: field.type === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value,
                              }))}
                              onBlur={saveDetails}
                              required={field.required}
                              disabled={!canEdit}
                              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                            />
                          )}
                        </label>
                      ))}
                    </section>
                  ) : null}
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provenance</h3>
                    <dl className="space-y-1 text-xs">
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Added</dt><dd>{asset.createdAt || asset.updatedAt ? new Date(asset.createdAt || asset.updatedAt).toLocaleDateString() : "—"}</dd></div>
                      {asset.uploadedBy && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Author</dt><dd className="truncate">{asset.uploadedBy}</dd></div>}
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Source</dt><dd className="capitalize">{asset.source}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Original file</dt><dd className="max-w-40 truncate" title={asset.path || asset.name}>{asset.path || asset.name}</dd></div>
                      {asset.figmaUrl && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Source link</dt><dd><a href={asset.figmaUrl} target="_blank" rel="noreferrer" className="text-primary underline">Figma</a></dd></div>}
                    </dl>
                  </section>
                  {similarAssets.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Similar assets</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {similarAssets.map((item) => (
                          <div key={item.id} className="flex aspect-square items-center justify-center overflow-hidden rounded border border-border bg-muted/30 p-1" title={item.title || item.name}>
                            {item.url && item.contentType?.startsWith("image/") ? <img src={item.url} alt="" className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="truncate text-[9px]">{item.name}</span>}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                  {canEdit && <Button type="button" className="w-full" onClick={saveDetails}>Save details</Button>}
                </div>
              ) : (
                <ol className="flex-1 space-y-4 overflow-y-auto p-4">
                  {(asset.history || [{
                    id: `created-${asset.id}`,
                    version: asset.version || 1,
                    title: "Asset added",
                    timestamp: asset.updatedAt,
                    author: asset.uploadedBy,
                  }]).slice().reverse().map((entry) => (
                    <li key={entry.id} className="relative border-l border-border pl-4">
                      <span className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-sm font-medium">{entry.title} <Badge variant="outline" className="ml-1 text-[10px]">v{entry.version}</Badge></p>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "—"}</p>
                      {entry.author && <p className="text-xs text-muted-foreground">{entry.author}</p>}
                      {entry.notes && <p className="mt-1 text-xs">{entry.notes}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
