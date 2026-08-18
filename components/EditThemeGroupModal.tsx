"use client";

import React, { useState, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { X, Check, Folder, Palette } from "lucide-react";
import { GROUP_PALETTE } from "@/utils/themeHelpers";

interface EditThemeGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export const EditThemeGroupModal: React.FC<EditThemeGroupModalProps> = ({
  isOpen,
  onClose,
  groupId,
}) => {
  const { themeGroups, updateThemeGroup } = useTokenStore();
  const group = themeGroups.find((g) => g.id === groupId);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && group) {
      setName(group.name);
      setColor(group.color || "#3b82f6");
      setError(null);
    }
  }, [isOpen, group]);

  if (!isOpen || !group) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a group name.");
      return;
    }

    if (
      trimmed.toLowerCase() !== group.name.toLowerCase() &&
      themeGroups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setError(`A theme group named "${trimmed}" already exists.`);
      return;
    }

    updateThemeGroup(group.id, trimmed, color);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md bg-[#121217] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0d0d11]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Edit Theme Group</h3>
              <p className="text-[11px] text-zinc-400">Rename or change color for {group.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-xs font-medium">
              Group Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mode, Brands, Typography, Density"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-all"
            />
          </div>

          {/* Group Color Dot */}
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-xs font-medium">Indicator Color</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {GROUP_PALETTE.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setColor(preset)}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      color === preset
                        ? "scale-110 ring-2 ring-white border-transparent"
                        : "border-black/40 hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-300 outline-none focus:border-zinc-700"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
