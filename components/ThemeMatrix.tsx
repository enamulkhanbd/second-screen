"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  buildThemeMatrix,
  MatrixRowData,
  MatrixCellData,
} from "@/utils/themeHelpers";
import { formatTypographySummary, toHexFast } from "@/utils/transformTokens";
import { ThemeOptionSheet } from "@/components/ThemeOptionSheet";
import { EditThemeGroupModal } from "@/components/EditThemeGroupModal";
import { EditTokenDrawer } from "@/components/EditTokenDrawer";
import { ThemeSwitcherDropdown } from "@/components/ThemeSwitcherDropdown";
import { FlattenedToken, ThemeOption } from "@/types/tokens";
import {
  AlertTriangle,
  Copy,
  GripVertical,
  MoreHorizontal,
  MoreVertical,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const INITIAL_BATCH_SIZE = 100;
const BATCH_INCREMENT = 100;

interface ThemeMatrixProps {
  onOpenSettings?: () => void;
  onOpenContextNavigation?: () => void;
}

function isColorValue(value: string): boolean {
  const v = value.trim();
  return (
    /^#([0-9a-f]{3,8})$/i.test(v) ||
    /^rgba?\(/i.test(v) ||
    /^hsla?\(/i.test(v) ||
    /^lch\(/i.test(v) ||
    /^lab\(/i.test(v) ||
    /^oklch\(/i.test(v) ||
    /^oklab\(/i.test(v) ||
    /^color\(/i.test(v)
  );
}

function cellToToken(row: MatrixRowData, option: ThemeOption, cell: MatrixCellData): FlattenedToken {
  const path = cell.tokenPath.length > 0 ? cell.tokenPath : [cell.setName, ...row.tokenKey.split(".")];
  return {
    id: `${cell.setName}.${row.tokenKey}`,
    name: row.tokenKey,
    path,
    group: row.group || row.tokenKey.split(".")[0] || "other",
    setName: cell.setName,
    type: row.type,
    rawValue: cell.rawValue,
    resolvedValue: cell.resolvedValue,
    isAlias: cell.isAlias,
  };
}

const MatrixValueCell = React.memo(function MatrixValueCell({
  row,
  option,
  cell,
  isActive,
  onOpen,
}: {
  row: MatrixRowData;
  option: ThemeOption;
  cell?: MatrixCellData;
  isActive: boolean;
  onOpen: (token: FlattenedToken) => void;
}) {
  if (!cell) {
    return <span className="text-muted-foreground/50 font-mono text-[11px]">—</span>;
  }

  const isAlias = cell.isAlias || (/^\{[^}]+\}$/.test(cell.rawValue.trim()));
  const resolved = String(cell.resolvedValue || "");
  const colorish = isColorValue(resolved) || isColorValue(cell.rawValue);
  const isTypography =
    row.type === "typography" ||
    (typeof cell.rawValue === "string" && cell.rawValue.includes("fontFamily"));

  return (
    <button
      type="button"
      onClick={() => onOpen(cellToToken(row, option, cell))}
      className={cn(
        "w-full text-left flex items-center gap-2 min-w-0 py-0.5 rounded-md cursor-pointer",
        isActive ? "text-foreground" : "text-foreground"
      )}
    >
      {colorish && (
        <span
          className="size-3.5 rounded-full border border-border shrink-0"
          style={{ backgroundColor: isColorValue(resolved) ? resolved : cell.rawValue }}
        />
      )}
      {isAlias && !colorish ? (
        <span className="font-mono text-[11px] text-violet-600 dark:text-violet-400 truncate">
          {cell.rawValue}
        </span>
      ) : isTypography ? (
        <span className="font-mono text-[11px] text-muted-foreground truncate">
          {formatTypographySummary(cell.rawValue)}
        </span>
      ) : (
        <span className="font-mono text-[11px] truncate">
          {colorish ? toHexFast(resolved) || resolved : resolved || cell.rawValue}
        </span>
      )}
    </button>
  );
});

const MatrixTokenRow = React.memo(function MatrixTokenRow({
  row,
  options,
  activeOptionId,
  onOpenCell,
}: {
  row: MatrixRowData;
  options: ThemeOption[];
  activeOptionId?: string;
  onOpenCell: (token: FlattenedToken) => void;
}) {
  return (
    <tr className="group border-b border-border/40 hover:bg-muted/20">
      <td className="sticky left-0 z-[5] bg-background group-hover:bg-muted py-2 px-4 font-mono text-xs text-foreground whitespace-nowrap border-r border-border/30">
        {row.tokenKey}
      </td>
      {options.map((option) => (
        <td
          key={option.id}
          className="py-2 px-4 border-r border-border/30 min-w-[180px]"
        >
          <MatrixValueCell
            row={row}
            option={option}
            cell={row.cells[option.name]}
            isActive={activeOptionId === option.id}
            onOpen={onOpenCell}
          />
        </td>
      ))}
    </tr>
  );
});

export const ThemeMatrix: React.FC<ThemeMatrixProps> = ({
  onOpenContextNavigation,
}) => {
  const {
    rawTokens,
    themeGroups,
    activeThemeGroupId,
    activeThemeOptionId,
    activeThemeOptionIds,
    setActiveThemeOption,
    updateSingleToken,
    addThemeOption,
    deleteThemeGroup,
    canUserEdit,
    setSidebarTab,
    createLightDarkThemes,
  } = useTokenStore();

  const isEditable = canUserEdit();
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [editingToken, setEditingToken] = useState<FlattenedToken | null>(null);
  const [optionSheet, setOptionSheet] = useState<{ mode: "add" | "edit"; optionId?: string } | null>(
    null
  );
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const activeGroup = useMemo(
    () => themeGroups.find((g) => g.id === activeThemeGroupId) || themeGroups[0] || null,
    [themeGroups, activeThemeGroupId]
  );

  const currentActiveOptionId =
    (activeGroup && activeThemeOptionIds[activeGroup.id]) || activeThemeOptionId;

  const matrixRows = useMemo(() => {
    if (!activeGroup) return [];
    return buildThemeMatrix(rawTokens, activeGroup, activeThemeOptionIds, themeGroups);
  }, [rawTokens, activeGroup, activeThemeOptionIds, themeGroups]);

  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [activeThemeGroupId, matrixRows.length]);

  const displayRows = useMemo(
    () => matrixRows.slice(0, visibleCount),
    [matrixRows, visibleCount]
  );

  const hasMore = visibleCount < matrixRows.length;
  const hasTokens = Object.keys(rawTokens).some((k) => !k.startsWith("$"));

  const handleDuplicateOption = (option: ThemeOption) => {
    if (!activeGroup) return;
    addThemeOption({
      groupId: activeGroup.id,
      name: `${option.name} copy`,
      color: option.color,
      description: option.description,
      selectedTokenSets: option.selectedTokenSets || {},
    });
  };

  if (!hasTokens) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
        <h2 className="text-base font-bold">Add tokens before creating themes</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Themes map the same tokens to Light, Dark, or a brand. Add a token set first, then come back to set up themes.
        </p>
        <Button className="mt-4 text-xs" size="sm" onClick={() => setSidebarTab("tokens")}>
          Go to Tokens
        </Button>
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
        <h2 className="text-base font-bold">Create your first theme</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Themes map the same tokens to Light, Dark, or a brand.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button className="text-xs" size="sm" disabled={!isEditable} onClick={createLightDarkThemes}>
            Create Light and Dark
          </Button>
          <Button
            className="text-xs"
            size="sm"
            variant="outline"
            disabled={!isEditable}
            onClick={() => setOptionSheet({ mode: "add" })}
          >
            <Plus className="size-3.5 mr-1.5" />
            Add theme
          </Button>
        </div>
        <ThemeOptionSheet
          mode="add"
          open={optionSheet?.mode === "add"}
          onClose={() => setOptionSheet(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden select-none">
      <div className="h-12 px-4 border-b border-border flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onOpenContextNavigation && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onOpenContextNavigation}
              className="xl:hidden h-8 w-8 flex-shrink-0"
              aria-label="Open theme groups"
            >
              <PanelLeftOpen className="size-3.5" />
            </Button>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {activeGroup.options.slice(0, 6).map((opt) => (
              <span
                key={opt.id}
                className="size-2 rounded-full border border-border"
                style={{ backgroundColor: opt.color || activeGroup.color || "hsl(var(--primary))" }}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-foreground truncate">{activeGroup.name}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                title="Group options"
                aria-label="Group options"
              >
                <MoreVertical className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 text-xs">
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer"
                onClick={() => setShowEditGroupModal(true)}
              >
                <Pencil className="size-3.5" />
                Edit / Rename
              </DropdownMenuItem>
              {isEditable && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete Group
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {/* Global Theme Context Switcher Dropdown */}
          <ThemeSwitcherDropdown />

          {isEditable && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-medium"
              onClick={() => setOptionSheet({ mode: "add" })}
            >
              <Plus className="size-3.5" />
              Add option
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {matrixRows.length === 0 ? (
          <div className="py-24 text-center text-xs text-muted-foreground">
            No tokens are enabled for this theme group. Configure an option to include token sets.
          </div>
        ) : (
          <table className="w-full min-w-max text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-background border-b border-border">
              <tr>
                <th className="sticky left-0 z-20 bg-background py-2.5 px-4 text-xs font-semibold text-muted-foreground border-r border-border/30 min-w-[220px]">
                  Token
                </th>
                {activeGroup.options.map((option) => (
                  <th
                    key={option.id}
                    className="py-2 px-3 border-r border-border/30 min-w-[200px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 min-w-0 cursor-pointer"
                        onClick={() => setActiveThemeOption(option.id)}
                      >
                        <GripVertical className="size-3.5 text-muted-foreground/70 shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate">
                          {option.name}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`${option.name} options`}
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs">
                          <DropdownMenuItem
                            className="text-xs cursor-pointer"
                            onClick={() => setOptionSheet({ mode: "edit", optionId: option.id })}
                          >
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-xs cursor-pointer"
                            onClick={() => handleDuplicateOption(option)}
                          >
                            <Copy className="size-3.5" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-xs cursor-pointer"
                            onClick={() => setOptionSheet({ mode: "edit", optionId: option.id })}
                          >
                            <Pencil className="size-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => setOptionSheet({ mode: "edit", optionId: option.id })}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => (
                <MatrixTokenRow
                  key={row.tokenKey}
                  row={row}
                  options={activeGroup.options}
                  activeOptionId={currentActiveOptionId}
                  onOpenCell={setEditingToken}
                />
              ))}
            </tbody>
          </table>
        )}
        {hasMore && (
          <div className="py-4 flex justify-center border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, matrixRows.length))
              }
            >
              Load {Math.min(BATCH_INCREMENT, matrixRows.length - visibleCount)} more
            </Button>
          </div>
        )}
      </div>

      <EditTokenDrawer
        token={editingToken}
        isOpen={Boolean(editingToken)}
        onClose={() => setEditingToken(null)}
        onSave={updateSingleToken}
      />

      <ThemeOptionSheet
        mode={optionSheet?.mode || "add"}
        open={Boolean(optionSheet)}
        onClose={() => setOptionSheet(null)}
        groupId={activeGroup.id}
        optionId={optionSheet?.optionId}
      />

      <EditThemeGroupModal
        isOpen={showEditGroupModal}
        onClose={() => setShowEditGroupModal(false)}
        groupId={activeGroup.id}
      />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Delete Theme Group
            </DialogTitle>
            <DialogDescription>
              Delete <span className="font-semibold text-foreground">&ldquo;{activeGroup.name}&rdquo;</span> and
              all {activeGroup.options.length} options in this group?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                deleteThemeGroup(activeGroup.id);
                setShowDeleteConfirm(false);
              }}
            >
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
