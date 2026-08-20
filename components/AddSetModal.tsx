"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { X, FolderPlus, Plus, ArrowRight } from "lucide-react";

interface AddSetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddSetModal: React.FC<AddSetModalProps> = ({ isOpen, onClose }) => {
  const { addNewSet, rawTokens } = useTokenStore();
  const [setName, setSetName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = setName.trim();
    if (!clean) return;

    if (rawTokens[clean]) {
      alert(`Token set "${clean}" already exists.`);
      return;
    }

    addNewSet(clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Create Token Set</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Add a new set or folder to your design system
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Set Path / Name
            </label>
            <input
              type="text"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="e.g. components/button or themes/brand-b"
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs focus:border-violet-500 focus:outline-none"
              required
              autoFocus
            />
            <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
              Use forward slash <code className="font-mono">/</code> to organize sets into folders (e.g. <code className="font-mono">components/card</code>).
            </p>
          </div>

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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Set</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
