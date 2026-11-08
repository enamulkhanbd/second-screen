"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Boxes,
  Code2,
  Download,
  FileText,
  FolderGit2,
  GitBranch,
  Hexagon,
  Home,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Package,
  Palette,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTokenStore } from "@/store/useTokenStore";
import { getValidTokenSetNames } from "@/utils/themeHelpers";
import { cn } from "@/lib/utils";

type SidebarTabId = Parameters<ReturnType<typeof useTokenStore.getState>["setSidebarTab"]>[0];

interface PaletteItem {
  id: string;
  group: "Pages" | "Projects" | "Token sets" | "Workspaces";
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

const MAX_RESULTS = 50;

/**
 * Global jump palette (Cmd/Ctrl+K). Everything is filtered locally from the store,
 * and results are capped so projects with thousands of token sets stay responsive.
 */
export const CommandPalette: React.FC = () => {
  const {
    currentOrg,
    userOrgs,
    orgProjects,
    currentProject,
    rawTokens,
    credentials,
    setCurrentOrg,
    setCurrentProject,
    setSidebarTab,
    setActiveSet,
    setMembersSubTab,
    setProjectSettingsTab,
  } = useTokenStore(
    useShallow((state) => ({
      currentOrg: state.currentOrg,
      userOrgs: state.userOrgs,
      orgProjects: state.orgProjects,
      currentProject: state.currentProject,
      rawTokens: state.rawTokens,
      credentials: state.credentials,
      setCurrentOrg: state.setCurrentOrg,
      setCurrentProject: state.setCurrentProject,
      setSidebarTab: state.setSidebarTab,
      setActiveSet: state.setActiveSet,
      setMembersSubTab: state.setMembersSubTab,
      setProjectSettingsTab: state.setProjectSettingsTab,
    }))
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    if (!open) return [];
    const list: PaletteItem[] = [];
    const go = (fn: () => void) => () => {
      fn();
      setOpen(false);
    };

    if (currentOrg) {
      const workspacePages: Array<[string, string, PaletteItem["icon"], () => void]> = [
        ["dashboard", "Overview", Home, () => setSidebarTab("dashboard")],
        ["projects", "Projects", FolderGit2, () => setSidebarTab("projects")],
        [
          "members",
          "Members",
          Users,
          () => {
            setSidebarTab("members");
            setMembersSubTab("members");
          },
        ],
        ["org-settings", "Workspace settings", Settings, () => setSidebarTab("org-settings")],
      ];
      for (const [id, label, icon, action] of workspacePages) {
        list.push({
          id: `page-${id}`,
          group: "Pages",
          label,
          hint: currentOrg.name,
          icon,
          run: go(() => {
            setCurrentProject(null);
            action();
          }),
        });
      }
    }

    if (currentProject) {
      const isGitConfigured = Boolean(
        (credentials.provider && credentials.repo) ||
        (currentProject?.gitConfig?.provider && currentProject?.gitConfig?.repo)
      );
      const projectPages: Array<[SidebarTabId, string, PaletteItem["icon"]]> = [
        ["tokens", "Tokens", Layers],
        ["themes", "Themes", Palette],
        ["variables", "Figma Variables", Hexagon],
        ...(!isGitConfigured
          ? ([["branches", "Branches", GitBranch]] as Array<[SidebarTabId, string, PaletteItem["icon"]]>)
          : []),
        ["documentation", "Documentation", FileText],
        ["assets", "Assets", ImageIcon],
        ["exports", "Exports", Download],
        ["releases", "Releases", Package],
        ["extensions", "Extensions", Lightbulb],
        ["mcp", "Developers (MCP & CLI)", Code2],
      ];
      for (const [id, label, icon] of projectPages) {
        list.push({
          id: `page-${id}`,
          group: "Pages",
          label,
          hint: currentProject.name,
          icon,
          run: go(() => setSidebarTab(id)),
        });
      }
      list.push({
        id: "page-project-settings",
        group: "Pages",
        label: "Project settings",
        hint: currentProject.name,
        icon: Settings,
        run: go(() => {
          setProjectSettingsTab("details");
          setSidebarTab("project-settings");
        }),
      });
      list.push({
        id: "page-git-settings",
        group: "Pages",
        label: "Git settings",
        hint: currentProject.name,
        icon: FolderGit2,
        run: go(() => {
          setProjectSettingsTab("sync");
          setSidebarTab("project-settings");
        }),
      });
    }

    for (const project of orgProjects) {
      list.push({
        id: `project-${project.id}`,
        group: "Projects",
        label: project.name,
        hint: "Open project",
        icon: Boxes,
        run: go(() => {
          setCurrentProject(project);
          setSidebarTab("tokens");
        }),
      });
    }

    if (currentProject) {
      for (const setName of getValidTokenSetNames(rawTokens)) {
        list.push({
          id: `set-${setName}`,
          group: "Token sets",
          label: setName,
          hint: "Open token set",
          icon: Layers,
          run: go(() => {
            setSidebarTab("tokens");
            setActiveSet(setName);
          }),
        });
      }
    }

    for (const org of userOrgs) {
      if (org.id === currentOrg?.id) continue;
      list.push({
        id: `org-${org.id}`,
        group: "Workspaces",
        label: org.name,
        hint: "Switch workspace",
        icon: Home,
        run: go(() => {
          setCurrentOrg(org);
          setCurrentProject(null);
          setSidebarTab("dashboard");
        }),
      });
    }

    return list;
  }, [
    open,
    currentOrg,
    currentProject,
    orgProjects,
    userOrgs,
    rawTokens,
    setCurrentOrg,
    setCurrentProject,
    setSidebarTab,
    setActiveSet,
    setMembersSubTab,
    setProjectSettingsTab,
  ]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? items.filter((item) => `${item.label} ${item.hint ?? ""}`.toLowerCase().includes(needle))
      : items;
    return matches.slice(0, MAX_RESULTS);
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      results[activeIndex]?.run();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden font-sans">
        <DialogTitle className="sr-only">Jump to</DialogTitle>
        <DialogDescription className="sr-only">
          Search projects, pages, token sets, and workspaces.
        </DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to a project, page, or token set"
            aria-label="Jump to"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={results[activeIndex] ? `command-item-${activeIndex}` : undefined}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          className="max-h-80 overflow-y-auto p-1.5"
        >
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Nothing matches &ldquo;{query}&rdquo;.
            </p>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const showGroup = index === 0 || results[index - 1].group !== item.group;
              return (
                <React.Fragment key={item.id}>
                  {showGroup && (
                    <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground">
                      {item.group}
                    </div>
                  )}
                  <div
                    id={`command-item-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={item.run}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs",
                      index === activeIndex ? "bg-muted text-foreground" : "text-foreground/80"
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">{item.label}</span>
                    {item.hint && (
                      <span className="max-w-[40%] truncate text-[11px] text-muted-foreground">{item.hint}</span>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
