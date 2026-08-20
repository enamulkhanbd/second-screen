"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Building2,
  ChevronDown,
  Layers,
  Plus,
  Users,
  Check,
  Sparkles,
  FolderGit2,
  Settings,
} from "lucide-react";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { ManageOrgModal } from "@/components/ManageOrgModal";

interface OrgSwitcherProps {
  onOpenAuth: () => void;
}

export const OrgSwitcher: React.FC<OrgSwitcherProps> = ({ onOpenAuth }) => {
  const {
    currentUser,
    userOrgs,
    currentOrg,
    orgProjects,
    currentProject,
    setCurrentOrg,
    setCurrentProject,
    createOrgAction,
    addToast,
  } = useTokenStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [showCreateProj, setShowCreateProj] = useState(false);
  const [showManageOrg, setShowManageOrg] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreateOrg(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    const org = await createOrgAction(newOrgName.trim());
    if (org) {
      addToast({
        type: "success",
        title: "Organization Created",
        message: `Created organization "${org.name}".`,
      });
      setNewOrgName("");
      setShowCreateOrg(false);
    }
  };

  if (!currentUser) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 font-semibold text-xs transition-all cursor-pointer shadow-xs"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Sign In / Workspace</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer shadow-xs"
      >
        {/* Org Icon */}
        <div className="w-5 h-5 rounded-md bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-[10px]">
          {currentOrg?.name?.[0]?.toUpperCase() || "O"}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="truncate max-w-[100px] text-zinc-900 dark:text-white">
            {currentOrg?.name || "Personal Workspace"}
          </span>
          <span className="text-zinc-400 font-normal">/</span>
          <span className="truncate max-w-[120px] text-emerald-600 dark:text-emerald-400 font-medium">
            {currentProject?.name || "Default Project"}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-[#111116] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
          {/* Organizations Section */}
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              <span>Organizations</span>
              <button
                onClick={() => setShowCreateOrg(!showCreateOrg)}
                className="text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>New Org</span>
              </button>
            </div>

            {showCreateOrg && (
              <form onSubmit={handleCreateOrg} className="mb-2 flex gap-1.5">
                <input
                  type="text"
                  required
                  placeholder="Org Name..."
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="flex-1 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-xs font-semibold"
                >
                  Add
                </button>
              </form>
            )}

            <div className="space-y-0.5 max-h-36 overflow-y-auto">
              {userOrgs.map((org) => {
                const isSelected = org.id === currentOrg?.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      setCurrentOrg(org);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-violet-50 dark:bg-violet-600/20 text-violet-700 dark:text-violet-300 font-semibold"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
                  </button>
                );
              })}
            </div>

            {currentOrg && (
              <button
                onClick={() => {
                  setShowManageOrg(true);
                  setIsOpen(false);
                }}
                className="mt-1.5 w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                <Users className="w-3 h-3 text-violet-500" />
                <span>Manage Members & Roles ({currentOrg.members?.length || 1})</span>
              </button>
            )}
          </div>

          {/* Projects Section */}
          <div className="p-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              <span>Projects ({orgProjects.length})</span>
              <button
                onClick={() => {
                  setShowCreateProj(true);
                  setIsOpen(false);
                }}
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>New Project</span>
              </button>
            </div>

            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {orgProjects.map((proj) => {
                const isSelected = proj.id === currentProject?.id;
                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setCurrentProject(proj);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                      <span className="truncate">{proj.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateProj}
        onClose={() => setShowCreateProj(false)}
      />

      <ManageOrgModal
        isOpen={showManageOrg}
        onClose={() => setShowManageOrg(false)}
      />
    </div>
  );
};
