"use client";

import { useState } from "react";
import { AssetCollection, AssetType, CustomMetadataField } from "@/types/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ASSET_TYPES: AssetType[] = ["image", "icon", "illustration", "document", "video"];
const FIELD_TYPES: CustomMetadataField["type"][] = ["text", "number", "select", "date", "boolean"];

interface CreateCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (collection: Omit<AssetCollection, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}

export function CreateCollectionModal({ open, onOpenChange, onCreate }: CreateCollectionModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowedAssetTypes, setAllowedAssetTypes] = useState<AssetType[]>([...ASSET_TYPES]);
  const [fields, setFields] = useState<CustomMetadataField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setDescription("");
    setAllowedAssetTypes([...ASSET_TYPES]);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Asset Collection</DialogTitle>
          <DialogDescription>Organize assets and define the metadata your team needs.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="collection-name">Name</Label>
              <Input id="collection-name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-description">Description</Label>
              <Input id="collection-description" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Allowed asset types</legend>
            <div className="flex flex-wrap gap-2">
              {ASSET_TYPES.map((type) => {
                const checked = allowedAssetTypes.includes(type);
                return (
                  <label key={type} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs capitalize">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setAllowedAssetTypes((current) =>
                        checked ? current.filter((item) => item !== type) : [...current, type]
                      )}
                    />
                    {type}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Custom metadata</h3>
                <p className="text-xs text-muted-foreground">Add fields to capture collection-specific asset details.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFields((current) => [
                  ...current,
                  { id: `field_${Date.now()}_${current.length}`, label: "", type: "text", required: false },
                ])}
              >
                Add field
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_140px_1fr_auto]">
                <Input
                  aria-label="Metadata field label"
                  placeholder="Field label"
                  value={field.label}
                  onChange={(event) => updateField(field.id, { label: event.target.value })}
                />
                <select
                  aria-label="Metadata field type"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={field.type}
                  onChange={(event) => updateField(field.id, { type: event.target.value as CustomMetadataField["type"] })}
                >
                  {FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                {field.type === "select" ? (
                  <Input
                    aria-label="Select field options"
                    placeholder="Options, comma-separated"
                    value={(field.options || []).join(", ")}
                    onChange={(event) => updateField(field.id, { options: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                  />
                ) : (
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(field.id, { required: event.target.checked })} />
                    Required
                  </label>
                )}
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" aria-label="Move field up" disabled={index === 0} onClick={() => moveField(index, -1)}>↑</Button>
                  <Button type="button" variant="ghost" size="sm" aria-label="Move field down" disabled={index === fields.length - 1} onClick={() => moveField(index, 1)}>↓</Button>
                  <Button type="button" variant="ghost" size="sm" aria-label="Remove field" onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))}>×</Button>
                </div>
                {field.type === "select" && (
                  <label className="flex items-center gap-2 text-xs sm:col-start-3">
                    <input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(field.id, { required: event.target.checked })} />
                    Required
                  </label>
                )}
              </div>
            ))}
          </section>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Creating..." : "Create collection"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
