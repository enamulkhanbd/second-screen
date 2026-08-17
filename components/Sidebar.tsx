"use client";

import React from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Folder, Plus } from "lucide-react";

interface SidebarProps {
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const {
    themeGroups,
    activeThemeGroupId,
    activeThemeOptionId,
    setActiveThemeGroup,
    setActiveThemeOption,
    rawTokens,
  } = useTokenStore();

  const isEmpty = Object.keys(rawTokens).length === 0;

  return (
    <aside className="w-56 flex-shrink-0 border-r border-zinc-900 bg-[#0d0d11] p-3 flex flex-col justify-between select-none overflow-y-auto text-xs">
      <div>
        {/* Header: THEME GROUPS + */}
        <div className="flex items-center justify-between px-2 py-1.5 mb-2 text-zinc-400">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Theme Groups
          </span>
          <button
            onClick={onOpenSettings}
            className="text-zinc-400 hover:text-white p-0.5 rounded hover:bg-zinc-800 transition-colors"
            title="Configure Themes & Token Sets"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme Groups Tree */}
        {isEmpty || themeGroups.length === 0 ? (
          <div className="px-2 py-4 text-center text-zinc-600 text-[11px]">
            No theme groups loaded
          </div>
        ) : (
          <div className="space-y-3">
            {themeGroups.map((group) => {
              const isGroupActive = group.id === activeThemeGroupId;

              return (
                <div key={group.id} className="space-y-0.5">
                  {/* Group Folder Header */}
                  <div
                    onClick={() => setActiveThemeGroup(group.id)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      isGroupActive
                        ? "text-zinc-100 bg-zinc-900/60 font-medium"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                      <span className="truncate text-xs font-semibold">{group.name}</span>
                    </div>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                  </div>

                  {/* Child Options List */}
                  <div className="pl-6 pr-1 space-y-0.5">
                    {group.options.map((option) => {
                      const isOptionActive =
                        isGroupActive && option.id === activeThemeOptionId;

                      return (
                        <div
                          key={option.id}
                          onClick={() => {
                            setActiveThemeGroup(group.id);
                            setActiveThemeOption(option.id);
                          }}
                          className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer text-[11px] transition-colors ${
                            isOptionActive
                              ? "text-zinc-100 font-medium bg-zinc-900"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                          }`}
                        >
                          <span className="truncate">{option.name}</span>
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: option.color || "#ffffff" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="px-2 pt-4 border-t border-zinc-900 text-[10px] text-zinc-600 font-mono">
        Tokens Studio v2.0
      </div>
    </aside>
  );
};
