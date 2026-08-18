"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  X,
  Plus,
  Layers,
  Folder,
  Palette,
  Copy,
  Check,
  Sparkles,
  Info,
} from "lucide-react";

interface AddThemeOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroupId?: string;
}

const COLOR_PRESETS = [
  "#ffffff",
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f97316", // Orange
  "#ef4444", // Red
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#eab308", // Yellow
];

export const AddThemeOptionModal: React.FC<AddThemeOptionModalProps> = ({
  isOpen,
  onClose,
  defaultGroupId,
}) => {
  const {
    themeGroups,
    rawTokens,
    activeThemeGroupId,
    addThemeOption,
  } = useTokenStore();

  const currentGroup = useMemo(() => {
    return (
      themeGroups.find((g) => g.id === (defaultGroupId || activeThemeGroupId)) ||
      themeGroups[0] ||
      null
    );
  }, [themeGroups, defaultGroupId, activeThemeGroupId]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    currentGroup?.id || ""
  );
  const [optionName, setOptionName] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [selectedSets, setSelectedSets] = useState<
    Record<string, "enabled" | "disabled" | "source">
  >({});
  const [createNewSet, setCreateNewSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [cloneFromOptionId, setCloneFromOptionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Available token set keys in rawTokens (exclude $-prefixed metadata)
  const availableSetNames = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  }, [rawTokens]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && currentGroup) {
      setSelectedGroupId(currentGroup.id);
      setOptionName("");
      setColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
      setError(null);
      setCreateNewSet(false);
      setNewSetName("");
      setCloneFromOptionId("");

      // Initialize sets with defaults from first existing option in group if available
      const existingOpt = currentGroup.options[0];
      const initialSets: Record<string, "enabled" | "disabled" | "source"> = {};

      availableSetNames.forEach((setName) => {
        if (existingOpt && existingOpt.selectedTokenSets[setName]) {
          initialSets[setName] = existingOpt.selectedTokenSets[setName];
        } else if (setName.toLowerCase() === "global") {
          initialSets[setName] = "source";
        } else {
          initialSets[setName] = "disabled";
        }
      });

      setSelectedSets(initialSets);
    }
  }, [isOpen, currentGroup, availableSetNames]);

  if (!isOpen) return null;

  const targetGroup =
    themeGroups.find((g) => g.id === selectedGroupId) || currentGroup;

  const handleSetStatusChange = (
    setName: string,
    status: "enabled" | "disabled" | "source"
  ) => {
    setSelectedSets((prev) => ({
      ...prev,
      [setName]: status,
    }));
  };

  const handleOptionNameChange = (val: string) => {
    setOptionName(val);
    if (createNewSet || !newSetName) {
      setNewSetName(val.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = optionName.trim();

    if (!trimmedName) {
      setError("Please enter a name for the theme option.");
      return;
    }

    if (
      targetGroup?.options.some(
        (o) => o.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError(`An option named "${trimmedName}" already exists in ${targetGroup.name}.`);
      return;
    }

    const enabledCount = Object.values(selectedSets).filter(
      (s) => s === "enabled"
    ).length;

    if (enabledCount === 0 && (!createNewSet || !newSetName.trim())) {
      setError("Please enable at least one token set or create a new token set.");
      return;
    }

    addThemeOption({
      groupId: targetGroup?.id || selectedGroupId,
      name: trimmedName,
      color,
      selectedTokenSets: selectedSets,
      cloneFromOptionId: cloneFromOptionId || undefined,
      newSetName: createNewSet && newSetName.trim() ? newSetName.trim() : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-white dark:bg-[#121217] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0d0d11]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Add Theme Option</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Create a new theme variation in{" "}
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {targetGroup?.name || "Theme"}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Theme Group Selection */}
          {themeGroups.length > 1 && (
            <div className="space-y-1.5">
              <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-medium">Theme Group</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {themeGroups.map((grp) => {
                  const isSel = grp.id === selectedGroupId;
                  return (
                    <button
                      type="button"
                      key={grp.id}
                      onClick={() => setSelectedGroupId(grp.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        isSel
                          ? "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-500"
                          : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: grp.color }}
                      />
                      <span className="truncate">{grp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Option Name */}
          <div className="space-y-1.5">
            <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-medium">
              Option Name <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. High Contrast, Dimmed, Atlas Pro, Compact"
              value={optionName}
              onChange={(e) => handleOptionNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none transition-all"
            />
          </div>

          {/* Accent / Dot Color */}
          <div className="space-y-1.5">
            <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-medium">Accent Color</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setColor(preset)}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      color === preset
                        ? "scale-110 ring-2 ring-violet-500 dark:ring-white border-transparent"
                        : "border-black/20 dark:border-black/40 hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-800 dark:text-zinc-300 outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                />
              </div>
            </div>
          </div>

          {/* Token Sets Configuration */}
          <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <label className="block text-zinc-800 dark:text-zinc-300 text-xs font-semibold">
                Included Token Sets
              </label>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Configure sets applied to this option
              </span>
            </div>

            {/* List of sets */}
            <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/60 max-h-48 overflow-y-auto">
              {availableSetNames.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No token sets found.</p>
              ) : (
                availableSetNames.map((setName) => {
                  const status = selectedSets[setName] || "disabled";

                  return (
                    <div
                      key={setName}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/40 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Layers className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                        <span className="font-mono text-zinc-800 dark:text-zinc-300 text-xs truncate">
                          {setName}
                        </span>
                      </div>

                      {/* 3-State Toggle: Enabled / Source / Disabled */}
                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 text-[10px] font-medium flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetStatusChange(setName, "enabled")}
                          className={`px-2 py-0.5 rounded-md transition-colors ${
                            status === "enabled"
                              ? "bg-emerald-600 text-white font-semibold shadow-sm"
                              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                          }`}
                        >
                          Enabled
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatusChange(setName, "source")}
                          className={`px-2 py-0.5 rounded-md transition-colors ${
                            status === "source"
                              ? "bg-blue-600 text-white font-semibold shadow-sm"
                              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                          }`}
                        >
                          Source
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatusChange(setName, "disabled")}
                          className={`px-2 py-0.5 rounded-md transition-colors ${
                            status === "disabled"
                              ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400"
                              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                          }`}
                        >
                          Off
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Optional: Create a Dedicated New Token Set */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createNewSet}
                onChange={(e) => setCreateNewSet(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-violet-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                Create a new dedicated token set for this option
              </span>
            </label>

            {createNewSet && (
              <div className="pl-5 space-y-2 animate-in fade-in duration-100">
                <input
                  type="text"
                  placeholder="Set name (e.g. high-contrast or atlas-pro)"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-900 dark:text-zinc-200 outline-none focus:border-violet-500"
                />

                {/* Clone values from option dropdown */}
                {targetGroup && targetGroup.options.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                      Clone initial token values from:
                    </label>
                    <select
                      value={cloneFromOptionId}
                      onChange={(e) => setCloneFromOptionId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-300 outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                    >
                      <option value="">Start empty</option>
                      {targetGroup.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} ({targetGroup.name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0d0d11]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Theme Option</span>
          </button>
        </div>
      </div>
    </div>
  );
};
