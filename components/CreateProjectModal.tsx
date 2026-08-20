"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { FolderGit2, X, Sparkles, Layers, ArrowRight } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const { currentOrg, createProjectAction, addToast } = useTokenStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentOrg) return;

    setLoading(true);
    try {
      const proj = await createProjectAction(name.trim(), description.trim());
      if (proj) {
        addToast({
          type: "success",
          title: "Project Created",
          message: `Created project "${proj.name}" under ${currentOrg.name}.`,
        });
        setName("");
        setDescription("");
        onClose();
      }
    } catch (e: any) {
      addToast({
        type: "error",
        title: "Creation Failed",
        message: e.message || "Failed to create project",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-900 dark:text-zinc-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Create New Project
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              In organization <span className="font-semibold text-emerald-600 dark:text-emerald-400">{currentOrg?.name}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Core Design System, iOS Tokens, Web Portal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Multi-brand cross-platform design token definitions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Creating..." : "Create Project"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
