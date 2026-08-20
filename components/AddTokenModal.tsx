"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSetName?: string;
}

export const AddTokenModal: React.FC<AddTokenModalProps> = ({
  isOpen,
  onClose,
  defaultSetName,
}) => {
  const { rawTokens, activeSet, addNewToken } = useTokenStore();

  const availableSets = Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  const initialSet =
    defaultSetName && availableSets.includes(defaultSetName)
      ? defaultSetName
      : activeSet !== "ALL" && availableSets.includes(activeSet)
      ? activeSet
      : availableSets[0] || "global";

  const [targetSet, setTargetSet] = useState(initialSet);
  const [tokenType, setTokenType] = useState<string>("color");
  const [tokenName, setTokenName] = useState("");
  const [description, setDescription] = useState("");

  // Value states for different categories
  const [colorValue, setColorValue] = useState("#7c3aed");
  const [dimensionValue, setDimensionValue] = useState("16px");

  // Composite Typography state
  const [typoFamily, setTypoFamily] = useState("Inter, sans-serif");
  const [typoWeight, setTypoWeight] = useState("600");
  const [typoSize, setTypoSize] = useState("16px");
  const [typoLineHeight, setTypoLineHeight] = useState("24px");
  const [typoTracking, setTypoTracking] = useState("normal");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;

    const pathSegments = tokenName.trim().replace(/^[\.\/]+|[\.\/]+$/g, "").split(/[\.\/]+/);

    let finalValue: any;
    if (tokenType === "typography") {
      finalValue = {
        fontFamily: typoFamily,
        fontWeight: typoWeight,
        fontSize: typoSize,
        lineHeight: typoLineHeight,
        ...(typoTracking && typoTracking !== "normal" ? { letterSpacing: typoTracking } : {}),
      };
    } else if (tokenType === "color") {
      finalValue = colorValue;
    } else {
      finalValue = dimensionValue;
    }

    addNewToken(targetSet, pathSegments, {
      value: finalValue,
      type: tokenType,
      description: description.trim() || undefined,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Create New Token</DialogTitle>
              <DialogDescription className="text-xs">
                Add a design token to set <code className="font-mono text-foreground font-semibold">{targetSet}</code>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Target Set & Token Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Token Set</Label>
              <Select value={targetSet} onValueChange={setTargetSet}>
                <SelectTrigger className="text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSets.map((s) => (
                    <SelectItem key={s} value={s} className="font-mono">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Token Type</Label>
              <Select value={tokenType} onValueChange={setTokenType}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="typography">Typography (Composite)</SelectItem>
                  <SelectItem value="dimension">Dimension / Spacing</SelectItem>
                  <SelectItem value="borderRadius">Border Radius</SelectItem>
                  <SelectItem value="fontFamily">Font Family</SelectItem>
                  <SelectItem value="fontWeight">Font Weight</SelectItem>
                  <SelectItem value="fontSize">Font Size</SelectItem>
                  <SelectItem value="lineHeight">Line Height</SelectItem>
                  <SelectItem value="letterSpacing">Letter Spacing</SelectItem>
                  <SelectItem value="boxShadow">Box Shadow</SelectItem>
                  <SelectItem value="opacity">Opacity</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Token Name / Path */}
          <div className="space-y-1.5">
            <Label htmlFor="tok-name">
              Token Name / Hierarchy <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tok-name"
              type="text"
              required
              autoFocus
              placeholder="e.g. brand.primary or button.padding.x"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Use dot or slash notation for nested groups (e.g. <code className="font-mono bg-muted px-1 rounded">colors.primary.500</code>).
            </p>
          </div>

          {/* Type Specific Fields */}
          {tokenType === "color" && (
            <div className="space-y-1.5">
              <Label htmlFor="tok-color">Color Value</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tok-color"
                  type="text"
                  value={colorValue}
                  onChange={(e) => setColorValue(e.target.value)}
                  placeholder="#7c3aed or {colors.purple.600}"
                  className="font-mono text-xs flex-1"
                />
                <input
                  type="color"
                  value={colorValue.startsWith("#") ? colorValue : "#7c3aed"}
                  onChange={(e) => setColorValue(e.target.value)}
                  className="w-9 h-9 rounded-md border border-input p-0.5 cursor-pointer bg-transparent"
                />
              </div>
            </div>
          )}

          {tokenType === "typography" && (
            <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border">
              <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                Composite Typography Properties
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="typo-fam" className="text-[11px]">Font Family</Label>
                  <Input
                    id="typo-fam"
                    type="text"
                    value={typoFamily}
                    onChange={(e) => setTypoFamily(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="typo-w" className="text-[11px]">Font Weight</Label>
                  <Input
                    id="typo-w"
                    type="text"
                    value={typoWeight}
                    onChange={(e) => setTypoWeight(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="typo-sz" className="text-[11px]">Font Size</Label>
                  <Input
                    id="typo-sz"
                    type="text"
                    value={typoSize}
                    onChange={(e) => setTypoSize(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="typo-lh" className="text-[11px]">Line Height</Label>
                  <Input
                    id="typo-lh"
                    type="text"
                    value={typoLineHeight}
                    onChange={(e) => setTypoLineHeight(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {tokenType !== "color" && tokenType !== "typography" && (
            <div className="space-y-1.5">
              <Label htmlFor="tok-dim">Token Value</Label>
              <Input
                id="tok-dim"
                type="text"
                value={dimensionValue}
                onChange={(e) => setDimensionValue(e.target.value)}
                placeholder="e.g. 16px, 1rem, or {spacing.4}"
                className="font-mono text-xs"
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="tok-desc">Description (Optional)</Label>
            <Input
              id="tok-desc"
              type="text"
              placeholder="e.g. Primary action color for buttons and links"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Token</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
