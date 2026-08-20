"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  X,
  Plus,
  Type,
  Palette,
  Maximize2,
  Box,
  Layers,
  Sparkles,
  Eye,
  Sliders,
  Check,
} from "lucide-react";

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
  const { rawTokens, activeSet, addNewToken, resolvedTokens } = useTokenStore();

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Create New Token</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Add a design token to set <code className="font-mono">{targetSet}</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Target Set & Token Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Token Set
              </label>
              <select
                value={targetSet}
                onChange={(e) => setTargetSet(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-medium focus:border-violet-500 focus:outline-none cursor-pointer"
              >
                {availableSets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Token Type
              </label>
              <select
                value={tokenType}
                onChange={(e) => setTokenType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold focus:border-violet-500 focus:outline-none cursor-pointer"
              >
                <option value="color">Color</option>
                <option value="typography">Typography (Composite)</option>
                <option value="spacing">Spacing</option>
                <option value="sizing">Sizing</option>
                <option value="borderRadius">Border Radius</option>
                <option value="boxShadow">Box Shadow</option>
                <option value="opacity">Opacity</option>
              </select>
            </div>
          </div>

          {/* Token Name (Keypath) */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Token Name / Keypath
            </label>
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder={tokenType === "color" ? "colors.brand.primary" : "heading.h2.semibold"}
              className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs focus:border-violet-500 focus:outline-none"
              required
            />
            <p className="text-[10px] text-zinc-400 mt-1">
              Use dot notation for nesting (e.g. <code className="font-mono">accent.button.hover</code>)
            </p>
          </div>

          {/* Dynamic Category Value Inputs */}
          {tokenType === "color" && (
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Color Hex / Alias
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorValue.startsWith("#") && colorValue.length === 7 ? colorValue : "#7c3aed"}
                  onChange={(e) => setColorValue(e.target.value)}
                  className="w-9 h-9 rounded-xl border border-zinc-300 dark:border-zinc-700 p-0.5 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={colorValue}
                  onChange={(e) => setColorValue(e.target.value)}
                  placeholder="#7c3aed or {colors.brand.primary}"
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs focus:border-violet-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {tokenType === "typography" && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Font Family</label>
                  <input
                    type="text"
                    value={typoFamily}
                    onChange={(e) => setTypoFamily(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Font Weight</label>
                  <select
                    value={typoWeight}
                    onChange={(e) => setTypoWeight(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs"
                  >
                    <option value="400">Regular (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semi Bold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">Extra Bold (800)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Font Size</label>
                  <input
                    type="text"
                    value={typoSize}
                    onChange={(e) => setTypoSize(e.target.value)}
                    placeholder="16px"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Line Height</label>
                  <input
                    type="text"
                    value={typoLineHeight}
                    onChange={(e) => setTypoLineHeight(e.target.value)}
                    placeholder="24px"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {tokenType !== "color" && tokenType !== "typography" && (
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Value / Dimension / Alias
              </label>
              <input
                type="text"
                value={dimensionValue}
                onChange={(e) => setDimensionValue(e.target.value)}
                placeholder="16px, 1rem, or {spacing.base}"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs focus:border-violet-500 focus:outline-none"
                required
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Primary action color for buttons and links"
              className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs focus:border-violet-500 focus:outline-none"
            />
          </div>

          {/* Live Preview Card */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Live Specimen Preview</span>
            </div>

            {tokenType === "color" && (
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg border border-black/10 dark:border-white/20 shadow-xs"
                  style={{ backgroundColor: colorValue }}
                />
                <span className="font-mono text-xs font-bold">{colorValue}</span>
              </div>
            )}

            {tokenType === "typography" && (
              <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {typoFamily} - {typoWeight} - {typoSize} - {typoLineHeight}
              </div>
            )}

            {tokenType !== "color" && tokenType !== "typography" && (
              <div className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {dimensionValue}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Token</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
