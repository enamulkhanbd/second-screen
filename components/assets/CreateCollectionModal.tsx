"use client";

import { useState } from "react";
import { AssetCollection, AssetType, CustomMetadataField } from "@/types/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "image", label: "Image" },
  { value: "icon", label: "SVG" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "font", label: "Font" },
  { value: "lottie", label: "Lottie" },
  { value: "document", label: "Document" },
];
const FIELD_TYPES: CustomMetadataField["type"][] = ["text", "number", "select", "date", "boolean"];
interface CreateCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (collection: Omit<AssetCollection, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}

export function CreateCollectionModal({ open, onOpenChange, onCreate }: CreateCollectionModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowedAssetTypes, setAllowedAssetTypes] = useState<AssetType[]>([]);
  const [fields, setFields] = useState<CustomMetadataField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setDescription("");
    setAllowedAssetTypes([]);
    setFields([]);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isSaving) reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a collection name.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        allowedAssetTypes,
        customFields: fields.filter((field) => field.label.trim()),
        icon: "Folder",
        color: "blue",
      });
      reset();
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create collection.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (id: string, updates: Partial<CustomMetadataField>) => {
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...updates } : field));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    setFields((current) => {
      const reordered = [...current];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle className="text-base">Create Asset Collection</DialogTitle>
          <DialogDescription className="sr-only">Create a collection to organize assets and define their metadata.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="collection-name" className="text-xs">Name <span aria-hidden="true">*</span></Label>
            <Input
              id="collection-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g., Brand Assets, Icons, Images"
              required
              autoFocus
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="collection-description" className="text-xs">Description</Label>
            <Textarea
              id="collection-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description for this collection"
              rows={2}
              className="min-h-16 resize-y text-xs"
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-medium">Allowed Asset Types</legend>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {ASSET_TYPES.map(({ value, label }) => {
                const checked = allowedAssetTypes.includes(value);
                return (
                  <label key={value} className="flex cursor-pointer items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setAllowedAssetTypes((current) =>
                        checked ? current.filter((item) => item !== value) : [...current, value]
                      )}
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <section className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-medium">Custom Metadata Fields</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setFields((current) => [
                  ...current,
                  { id: `field_${Date.now()}_${current.length}`, label: "", type: "text", required: false },
                ])}
              >
                <Plus className="h-3 w-3" />
                Add field
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Add fields to collect structured metadata for assets in this collection.
            </p>
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_110px_auto]">
                <Input
                  aria-label="Metadata field label"
                  placeholder="Field label"
                  value={field.label}
                  onChange={(event) => updateField(field.id, { label: event.target.value })}
                  className="h-8 text-xs"
                />
                <select
                  aria-label="Metadata field type"
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={field.type}
                  onChange={(event) => updateField(field.id, { type: event.target.value as CustomMetadataField["type"] })}
                >
                  {FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                {field.type === "select" && (
                  <Input
                    aria-label="Select field options"
                    placeholder="Options, comma-separated"
                    value={(field.options || []).join(", ")}
                    onChange={(event) => updateField(field.id, { options: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                    className="h-8 text-xs sm:col-span-2"
                  />
                )}
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(field.id, { required: event.target.checked })} />
                  Required
                </label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" aria-label="Move field up" disabled={index === 0} onClick={() => moveField(index, -1)}>↑</Button>
                  <Button type="button" variant="ghost" size="sm" aria-label="Move field down" disabled={index === fields.length - 1} onClick={() => moveField(index, 1)}>↓</Button>
                  <Button type="button" variant="ghost" size="sm" aria-label="Remove field" onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))}>×</Button>
                </div>
              </div>
            ))}
          </section>

          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <DialogFooter className="border-t border-border pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isSaving}>{isSaving ? "Creating..." : "Create Collection"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
