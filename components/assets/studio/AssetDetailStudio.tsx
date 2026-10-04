"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetCollection, ProjectAsset } from "@/types/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Minus,
  MoreVertical,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

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

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function normalizeCategory(category?: string) {
  return category?.trim().toLocaleLowerCase() || "";
}

function getAssetTags(tag?: string) {
  return new Set(
    (tag || "")
      .split(",")
      .map((value) => value.trim().toLocaleLowerCase())
      .filter(Boolean)
  );
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
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [customMetadata, setCustomMetadata] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const collectionId = asset?.collectionId || asset?.folderId;
  const collection = collections.find((item) => item.id === collectionId);
  const assetCategory = normalizeCategory(asset?.category);
  const assetTags = useMemo(() => getAssetTags(asset?.tag), [asset?.tag]);
  const similarAssets = useMemo(
    () => {
      if (!asset || (!assetCategory && assetTags.size === 0)) return [];

      return assets
        .flatMap((item, index) => {
          if (item.id === asset.id) return [];

          const categoryMatches = Boolean(
            assetCategory && normalizeCategory(item.category) === assetCategory
          );
          const sharedTagCount = Array.from(getAssetTags(item.tag)).filter((tag) => assetTags.has(tag)).length;
          const relevance = (categoryMatches ? 2 : 0) + sharedTagCount;

          return relevance > 0 ? [{ item, index, relevance }] : [];
        })
        .sort((left, right) => right.relevance - left.relevance || left.index - right.index)
        .slice(0, 6)
        .map(({ item }) => item);
    },
    [asset, assets, assetCategory, assetTags]
  );

  useEffect(() => {
    setTab("details");
    setZoom(100);
    setName(asset?.title || asset?.name || "");
    setDescription(asset?.description || "");
    setCategory(asset?.category || "");
    setTags(asset?.tag || "");
    setCustomMetadata(asset?.customMetadata || {});
    setError(null);
    setCopyStatus("");
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
        category: category.trim(),
        tag: tags.trim(),
        customMetadata,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save asset details.");
    }
  };

  const copyAssetUrl = async () => {
    if (!asset.url) return;
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopyStatus("Asset link copied.");
    } catch {
      setCopyStatus("Could not copy the asset link.");
    }
  };

  const imageSource = asset.url || (asset.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svg)}` : undefined);
  const mediaType = asset.assetType || (
    asset.contentType?.startsWith("image/") || asset.svg
      ? "image"
      : asset.contentType?.startsWith("video/")
      ? "video"
      : asset.contentType?.startsWith("audio/")
      ? "audio"
      : "other"
  );
  const versionEntries = asset.history?.length
    ? [...asset.history].reverse()
    : [{
        id: `created-${asset.id}`,
        version: asset.version || 1,
        title: "Asset added",
        timestamp: asset.createdAt || asset.updatedAt,
        author: asset.uploadedBy,
      }];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose className="h-[75dvh] max-h-[75dvh] w-[calc(100vw-2rem)] max-w-none gap-0 overflow-hidden p-0 sm:h-[75dvh] sm:w-[85vw] sm:p-0 md:w-[75vw] lg:w-[min(75vw,1600px)]">
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex min-h-14 items-center gap-3 border-b border-border px-4 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-[11px] capitalize text-muted-foreground">{mediaType}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close asset preview" title="Close" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <main className="relative flex min-h-[38vh] min-w-0 flex-1 flex-col bg-muted/30 md:min-h-0">
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 sm:p-8">
                <div className="flex h-full w-full items-center justify-center">
                  {mediaType === "video" && asset.url ? (
                    <video
                      src={asset.url}
                      controls
                      className="max-h-full max-w-full object-contain"
                      style={{ transform: `scale(${zoom / 100})` }}
                    />
                  ) : mediaType === "audio" && asset.url ? (
                    <audio src={asset.url} controls className="w-full max-w-md" />
                  ) : mediaType === "font" ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="text-2xl font-medium">Aa Bb Cc 123</span>
                      <span className="text-sm text-muted-foreground">{asset.name}</span>
                      {asset.url && (
                        <Button asChild variant="outline" size="sm">
                          <a href={asset.url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" /> Open font file
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : mediaType === "lottie" ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="text-sm font-medium">{asset.name}</span>
                      {asset.url && (
                        <Button asChild variant="outline" size="sm">
                          <a href={asset.url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" /> Open animation file
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : mediaType === "document" ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="text-sm font-medium">{asset.name}</span>
                      {asset.url && (
                        <Button asChild variant="outline" size="sm">
                          <a href={asset.url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" /> Open document
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : ["image", "icon", "illustration"].includes(mediaType) && imageSource ? (
                    <img
                      src={imageSource}
                      alt={asset.title || asset.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-150"
                      style={{ transform: `scale(${zoom / 100})` }}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">Preview is unavailable for this asset.</div>
                  )}
                </div>
              </div>
              <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-border bg-background/95 px-1 py-0.5 shadow-sm">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(25, value - 25))}><Minus className="h-3.5 w-3.5" /></Button>
                <span className="min-w-9 text-center text-[10px] tabular-nums">{zoom}%</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(300, value + 25))}><Plus className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full" aria-label="Reset zoom" onClick={() => setZoom(100)}><RotateCcw className="h-3 w-3" /></Button>
              </div>
              <footer className="flex h-12 min-h-12 shrink-0 items-center justify-between border-t border-border bg-background px-2">
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]">
                        <Download className="h-3.5 w-3.5" />
                        Download
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top">
                      <DropdownMenuItem onClick={() => onDownload(asset)}>
                        <Download className="mr-2 h-4 w-4" /> Download original
                      </DropdownMenuItem>
                      {asset.url && (
                        <DropdownMenuItem asChild>
                          <a href={asset.url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" /> Open original file
                          </a>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Copy asset link"
                    title={copyStatus || "Copy asset link"}
                    disabled={!asset.url}
                    onClick={copyAssetUrl}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <span role="status" className="sr-only">{copyStatus}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="More asset actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top">
                    {canEdit && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(asset)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete asset
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
            </footer>
            </main>

            <aside className="flex min-h-0 max-h-[40vh] w-full shrink-0 flex-col border-t border-border md:max-h-none md:w-[420px] md:border-l md:border-t-0 lg:w-[420px]">
              <div role="tablist" aria-label="Asset inspector" className="flex shrink-0 border-b border-border">
                {(["details", "history"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={tab === item}
                    onClick={() => setTab(item)}
                    className={`flex-1 border-b-2 px-4 py-2.5 text-xs capitalize transition-colors ${tab === item ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {tab === "details" ? (
                <div className="flex-1 space-y-4 overflow-y-auto p-3.5">
                  <section className="space-y-2 border-b border-border pb-3">
                    <h3 className="text-xs font-medium">Description</h3>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      onBlur={saveDetails}
                      disabled={!canEdit}
                      rows={3}
                      className="min-h-16 resize-y text-xs"
                      placeholder="Add a description…"
                    />
                  </section>
                  {(asset.category || asset.tag) && (
                    <section className="grid grid-cols-2 gap-3 border-b border-border pb-3 text-xs">
                      {asset.category && (
                        <div className="min-w-0 space-y-1">
                          <h3 className="font-medium">Category</h3>
                          <p className="truncate text-muted-foreground" title={asset.category}>{asset.category}</p>
                        </div>
                      )}
                      {asset.tag && (
                        <div className="min-w-0 space-y-1">
                          <h3 className="font-medium">Tags</h3>
                          <p className="break-words text-muted-foreground">{asset.tag}</p>
                        </div>
                      )}
                  </section>
                  )}
                  <section className="space-y-2 border-b border-border pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium">Versions</h3>
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{versionEntries.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {versionEntries.map((entry, index) => (
                        <div key={entry.id} className="rounded-md bg-muted/60 px-2.5 py-2 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">Version {entry.version}</span>
                            <span className="text-muted-foreground">{formatDate(entry.timestamp)}</span>
                          </div>
                          {index === 0 ? (
                            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-muted-foreground">
                              <dt>Size</dt><dd>{formatSize(asset.size)}</dd>
                              <dt>Type</dt><dd className="capitalize">{asset.assetType || mediaType}</dd>
                              {asset.dimensions && <><dt>Dimensions</dt><dd>{asset.dimensions.width} × {asset.dimensions.height}px</dd></>}
                              <dt>Filename</dt><dd className="truncate" title={asset.name}>{asset.name}</dd>
                            </dl>
                          ) : (
                            <p className="mt-1 text-muted-foreground">{entry.title}{entry.author ? ` · ${entry.author}` : ""}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-2 border-b border-border pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium">Similar assets</h3>
                      <span className="text-[10px] text-muted-foreground">{similarAssets.length}</span>
                    </div>
                    {similarAssets.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {similarAssets.map((item) => (
                          <div key={item.id} className="flex aspect-square items-center justify-center overflow-hidden rounded border border-border bg-muted/30 p-1" title={item.title || item.name}>
                            {item.url && item.contentType?.startsWith("image/") ? <img src={item.url} alt="" className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="truncate text-[9px]">{item.name}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No similar assets found.</p>
                    )}
                  </section>
                  <section className="space-y-2 border-b border-border pb-3">
                    <h3 className="text-xs font-medium">File information</h3>
                    <dl className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">MIME type</dt><dd className="truncate">{asset.contentType || "—"}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Media type</dt><dd className="capitalize">{asset.assetType || mediaType}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Format</dt><dd>{asset.format || asset.contentType?.split("/").pop()?.toUpperCase() || "—"}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Color space</dt><dd>{asset.colorSpace || "—"}</dd></div>
                    </dl>
                  </section>
                  {collection?.customFields?.length ? (
                    <section className="space-y-3">
                      <h3 className="text-xs font-medium">Custom metadata</h3>
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
                    <h3 className="text-xs font-medium">Provenance</h3>
                    <dl className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Added</dt><dd>{formatDate(asset.createdAt || asset.updatedAt)}</dd></div>
                      {asset.uploadedBy && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Author</dt><dd className="truncate">{asset.uploadedBy}</dd></div>}
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Source</dt><dd className="capitalize">{asset.source}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Original file</dt><dd className="max-w-40 truncate" title={asset.path || asset.name}>{asset.path || asset.name}</dd></div>
                      {asset.figmaUrl && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Source link</dt><dd><a href={asset.figmaUrl} target="_blank" rel="noreferrer" className="text-primary underline">Figma</a></dd></div>}
                    </dl>
                  </section>
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                </div>
              ) : (
                <ol className="flex-1 space-y-4 overflow-y-auto p-4">
                  {versionEntries.map((entry) => (
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
