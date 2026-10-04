"use client";

import { AssetCollection, ProjectAsset } from "@/types/tenant";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/utils/assetFormatting";
import { Download, Edit2, FolderInput, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AssetListViewProps {
  assets: ProjectAsset[];
  collections: AssetCollection[];
  selectedIds: Set<string>;
  canEdit: boolean;
  onOpen: (asset: ProjectAsset) => void;
  onToggleSelected: (id: string, event: React.MouseEvent) => void;
  onDownload: (asset: ProjectAsset) => void;
  onEdit: (asset: ProjectAsset) => void;
  onMove: (asset: ProjectAsset) => void;
  onDelete: (asset: ProjectAsset) => void;
}

export function AssetListView({
  assets,
  collections,
  selectedIds,
  canEdit,
  onOpen,
  onToggleSelected,
  onDownload,
  onEdit,
  onMove,
  onDelete,
}: AssetListViewProps) {
  const collectionNames = new Map(collections.map((collection) => [collection.id, collection.name]));

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[760px] border-collapse text-left text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2"><span className="sr-only">Select</span></th>
            <th className="px-3 py-2 font-medium">Asset</th>
            <th className="px-3 py-2 font-medium">Collection</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Size</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="w-12 px-3 py-2"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {assets.map((asset) => {
            const collectionId = asset.collectionId || asset.folderId;
            const imageSource = asset.url || (asset.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svg)}` : undefined);
            return (
              <tr
                key={asset.id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => onOpen(asset)}
              >
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(asset.id)}
                    disabled={!canEdit}
                    aria-label={`Select ${asset.title || asset.name}`}
                    onClick={(event) => onToggleSelected(asset.id, event)}
                    onChange={() => undefined}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30 p-1">
                      {imageSource ? <img src={imageSource} alt="" className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="text-[9px] uppercase">{asset.contentType?.split("/").pop() || "File"}</span>}
                    </div>
                    <span className="truncate font-medium text-foreground">{asset.title || asset.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {collectionId ? collectionNames.get(collectionId) || "Unknown collection" : <span className="text-muted-foreground">All Assets</span>}
                </td>
                <td className="px-3 py-2"><Badge variant="outline" className="capitalize">{asset.assetType || "other"}</Badge></td>
                <td className="px-3 py-2 text-muted-foreground">{formatBytes(asset.size)}</td>
                <td className="px-3 py-2 text-muted-foreground">{asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Actions for ${asset.title || asset.name}`} className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(asset)}><Edit2 className="mr-2 h-4 w-4" />Rename / edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onMove(asset)}><FolderInput className="mr-2 h-4 w-4" />Move to collection</DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => onDownload(asset)}><Download className="mr-2 h-4 w-4" />Download</DropdownMenuItem>
                      {canEdit && <DropdownMenuItem className="text-destructive" onClick={() => onDelete(asset)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
