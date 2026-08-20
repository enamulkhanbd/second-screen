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
} from "lucide-react";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { ManageOrgModal } from "@/components/ManageOrgModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenAuth}
        className="gap-1.5 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/60 font-semibold shadow-xs"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Sign In / Workspace</span>
      </Button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border hover:bg-secondary text-foreground transition-all cursor-pointer shadow-xs text-xs font-medium"
      >
        {/* Org Icon */}
        <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
          {currentOrg?.name?.[0]?.toUpperCase() || "O"}
        </div>

        <div className="flex items-center gap-1.5 font-semibold">
          <span className="truncate max-w-[100px] text-foreground">
            {currentOrg?.name || "Personal Workspace"}
          </span>
          <span className="text-muted-foreground font-normal">/</span>
          <span className="truncate max-w-[120px] text-primary font-medium">
            {currentProject?.name || "Default Project"}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
          {/* Organizations Section */}
          <div className="p-2 border-b border-border/80">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              <span>Organizations</span>
              <button
                onClick={() => setShowCreateOrg(!showCreateOrg)}
                className="text-primary hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>New Org</span>
              </button>
            </div>

            {showCreateOrg && (
              <form onSubmit={handleCreateOrg} className="mb-2 flex gap-1.5">
                <Input
                  type="text"
                  required
                  placeholder="Org Name..."
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="h-8 text-xs flex-1"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Add
                </Button>
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
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
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
                className="mt-1.5 w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Users className="w-3 h-3 text-primary" />
                <span>Manage Members & Roles ({currentOrg.members?.length || 1})</span>
              </button>
            )}
          </div>

          {/* Projects Section */}
          <div className="p-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              <span>Projects ({orgProjects.length})</span>
              <button
                onClick={() => {
                  setShowCreateProj(true);
                  setIsOpen(false);
                }}
                className="text-primary hover:underline flex items-center gap-0.5"
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
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{proj.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
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
