"use client";

import React, { useMemo, useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { buildThemeMatrix, MatrixRowData, MatrixCellData } from "@/utils/themeHelpers";
import { formatTypographySummary } from "@/utils/transformTokens";
import {
  Folder,
  MoreVertical,
  Plus,
  Settings,
  FolderGit2,
  RefreshCw,
  Sparkles,
  Search,
  Type,
  X,
  Check,
} from "lucide-react";

interface ThemeMatrixProps {
  onOpenSettings?: () => void;
}

export const ThemeMatrix: React.FC<ThemeMatrixProps> = ({ onOpenSettings }) => {
  const {
    rawTokens,
    themeGroups,
    activeThemeGroupId,
    updateSingleToken,
    credentials,
    setRawTokens,
    setSyncStatus,
    addToast,
    loadSampleData,
  } = useTokenStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const hasCredentials = Boolean(credentials.owner && credentials.repo && credentials.pat);
  const isTotallyEmpty = Object.keys(rawTokens).length === 0;

  // Active theme group (e.g. Theme, Semantic, Components, Brands, Typography, Mode)
  const activeGroup = useMemo(() => {
    return (
      themeGroups.find((g) => g.id === activeThemeGroupId) ||
      themeGroups[0] ||
      null
    );
  }, [themeGroups, activeThemeGroupId]);

  // Build matrix rows for active theme group
  const matrixRows = useMemo(() => {
    if (!activeGroup) return [];
    const rows = buildThemeMatrix(rawTokens, activeGroup);
    if (!searchQuery.trim()) return rows;

    const q = searchQuery.toLowerCase();
    return rows.filter((r) => {
      const matchKey = r.tokenKey.toLowerCase().includes(q);
      const matchCell = Object.values(r.cells).some((c) =>
        c?.rawValue.toLowerCase().includes(q) || c?.resolvedValue.toLowerCase().includes(q)
      );
      return matchKey || matchCell;
    });
  }, [rawTokens, activeGroup, searchQuery]);

  const handleFetchNow = async () => {
    if (!hasCredentials) {
      if (onOpenSettings) onOpenSettings();
      return;
    }

    setIsFetching(true);
    setSyncStatus("fetching");

    try {
      const res = await fetch("/api/git/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Fetch failed (${res.status})`);
      }

      setRawTokens(data.tokens, data.syncMeta);
      setSyncStatus("success");
      addToast({
        type: "success",
        title: "Tokens Synced Successfully",
        message: `Fetched tokens from ${credentials.provider === "github" ? "GitHub" : "Azure DevOps"} (${credentials.repo}@${credentials.branch}).`,
      });
    } catch (err: any) {
      setSyncStatus("error", err.message);
      addToast({
        type: "error",
        title: "Git Sync Failed",
        message: err.message,
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Empty Application State
  if (isTotallyEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#09090d] text-center select-none">
        {hasCredentials ? (
          <div className="max-w-md w-full bg-[#121217] border border-zinc-800/80 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  credentials.provider === "github" ? "bg-violet-400" : "bg-blue-400"
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {credentials.provider === "github" ? "GitHub" : "Azure DevOps"} Connected
              </span>
            </div>
            <h3 className="text-base font-semibold text-white">Ready to Sync Theme Matrix</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-mono">
              {credentials.owner}/{credentials.repo} @ {credentials.branch}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full">
              <button
                onClick={handleFetchNow}
                disabled={isFetching}
                className="w-full flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                {isFetching ? "Syncing..." : "Fetch Tokens Now"}
              </button>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-md w-full bg-[#121217] border border-zinc-800/80 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Tokens Studio Second Screen</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Connect to your Git repository to load themes, or load the built-in demo theme matrix.
            </p>

            <div className="flex flex-col gap-3 mt-6 w-full">
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
                >
                  <FolderGit2 className="w-4 h-4" />
                  Configure Git Repository
                </button>
              )}
              <button
                onClick={loadSampleData}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Load Sample Demo Theme Matrix
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090d] overflow-hidden text-xs">
      {/* Top Header Bar of Matrix: 📁 Theme 🟠 ⋮ | + Add option */}
      <div className="h-12 border-b border-zinc-900 bg-[#0d0d11] px-6 flex items-center justify-between flex-shrink-0 select-none">
        {/* Left: Group Title */}
        <div className="flex items-center gap-2 text-zinc-200">
          <Folder className="w-4 h-4 text-zinc-400" />
          <span className="font-semibold text-sm">{activeGroup?.name || "Theme"}</span>
          <span
            className="w-2.5 h-2.5 rounded-full ml-0.5"
            style={{ backgroundColor: activeGroup?.color || "#f97316" }}
          />
          <button
            onClick={onOpenSettings}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800/60 ml-1 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Search Filter & + Add option Button */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-700 w-44 font-mono"
            />
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-3 py-1 bg-white text-black font-semibold rounded-md text-xs hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add option</span>
          </button>
        </div>
      </div>

      {/* Main Table Matrix */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Table Header: TOKEN | OPTION_A ⚙️ | OPTION_B ⚙️ */}
          <thead className="sticky top-0 z-10 bg-[#0d0d11] border-b border-zinc-900 text-[11px] font-bold text-zinc-400 tracking-wider">
            <tr>
              <th className="py-3 px-6 w-1/3 font-semibold uppercase text-zinc-500">
                TOKEN
              </th>
              {activeGroup?.options.map((option) => (
                <th
                  key={option.id}
                  className="py-3 px-6 font-semibold uppercase text-zinc-400"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{option.name}</span>
                    <Settings className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body: Rows with Pill Swatch Containers */}
          <tbody className="divide-y divide-zinc-900/60 font-mono">
            {matrixRows.map((row) => (
              <tr key={row.tokenKey} className="hover:bg-zinc-900/30 transition-colors">
                {/* Token Key Name */}
                <td className="py-2.5 px-6 text-zinc-300 text-xs font-mono select-text align-middle">
                  {row.tokenKey}
                </td>

                {/* Option Columns */}
                {activeGroup?.options.map((option) => {
                  const cellData = row.cells[option.name];

                  return (
                    <td key={option.id} className="py-2 px-6 align-middle">
                      <MatrixPillCell
                        cellData={cellData}
                        tokenType={row.type}
                        tokenKey={row.tokenKey}
                        optionName={option.name}
                        onUpdate={updateSingleToken}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface MatrixPillCellProps {
  cellData?: MatrixCellData;
  tokenType: string;
  tokenKey: string;
  optionName: string;
  onUpdate: (path: string[], newValue: any) => void;
}

const MatrixPillCell: React.FC<MatrixPillCellProps> = ({
  cellData,
  tokenType,
  tokenKey,
  optionName,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(cellData?.rawValue || "");
  const [showTypographyModal, setShowTypographyModal] = useState(false);

  React.useEffect(() => {
    setVal(cellData?.rawValue || "");
  }, [cellData?.rawValue]);

  if (!cellData) {
    return (
      <div className="text-zinc-600 text-[11px] font-mono italic px-3 py-1">
        -
      </div>
    );
  }

  // Check if cell is a composite typography object
  const isCompositeTypography =
    tokenType === "typography" ||
    (typeof cellData.rawValue === "string" &&
      cellData.rawValue.includes("fontFamily") &&
      cellData.rawValue.startsWith("{"));

  const isColor =
    tokenType === "color" ||
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(cellData.resolvedValue.trim()) ||
    /^rgba?\(.+\)$/i.test(cellData.resolvedValue.trim()) ||
    /^hsla?\(.+\)$/i.test(cellData.resolvedValue.trim());

  const handleBlur = () => {
    setIsEditing(false);
    if (val !== cellData.rawValue) {
      onUpdate(cellData.tokenPath, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setVal(cellData.rawValue);
      setIsEditing(false);
    }
  };

  // If composite typography token, render typography pill with popover inspector
  if (isCompositeTypography) {
    let typoObj: Record<string, string> = {};
    try {
      typoObj = JSON.parse(cellData.rawValue);
    } catch {
      typoObj = {};
    }

    const summaryText = formatTypographySummary(cellData.rawValue);

    return (
      <>
        <div
          onClick={() => setShowTypographyModal(true)}
          className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-800/80 bg-[#121217] hover:border-zinc-700 hover:bg-[#16161d] transition-all max-w-sm w-full cursor-pointer"
          title="Click to inspect/edit typography token properties"
        >
          {/* Left: Aa Badge */}
          <div className="w-4 h-4 rounded flex items-center justify-center bg-violet-600/20 text-violet-400 border border-violet-500/30 text-[10px] font-serif font-bold flex-shrink-0">
            Aa
          </div>

          {/* Right: Typography Summary */}
          <span className="flex-1 font-mono text-xs text-zinc-300 group-hover:text-white truncate">
            {summaryText}
          </span>
        </div>

        {/* Typography Inspector / Editor Modal */}
        {showTypographyModal && (
          <TypographyModal
            tokenKey={tokenKey}
            optionName={optionName}
            typoObj={typoObj}
            onClose={() => setShowTypographyModal(false)}
            onSave={(newObj) => {
              onUpdate(cellData.tokenPath, JSON.stringify(newObj));
              setShowTypographyModal(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div
      className={`group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all max-w-sm w-full ${
        isEditing
          ? "border-violet-500 bg-[#171722] ring-1 ring-violet-500 shadow-md shadow-violet-500/10"
          : "border-zinc-800/80 bg-[#121217] hover:border-zinc-700 hover:bg-[#16161d]"
      }`}
    >
      {/* Left: Swatch Circle */}
      <div
        className="w-4 h-4 rounded-full flex-shrink-0 border border-black/40 overflow-hidden shadow-inner bg-[conic-gradient(#333_25%,#222_0_50%,#333_0_75%,#222_0)] bg-[length:6px_6px]"
        title={`Computed: ${cellData.resolvedValue}`}
      >
        {isColor ? (
          <div
            className="w-full h-full"
            style={{ backgroundColor: cellData.resolvedValue }}
          />
        ) : (
          <div className="w-full h-full bg-violet-400" />
        )}
      </div>

      {/* Right: Editable Monospace Alias Text */}
      {isEditing ? (
        <input
          type="text"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-xs text-violet-200 outline-none font-mono min-w-0"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className="flex-1 font-mono text-xs text-zinc-300 group-hover:text-white truncate cursor-text select-text"
          title={`Raw: ${cellData.rawValue} | Computed: ${cellData.resolvedValue}`}
        >
          {cellData.rawValue}
        </span>
      )}
    </div>
  );
};

interface TypographyModalProps {
  tokenKey: string;
  optionName: string;
  typoObj: Record<string, string>;
  onClose: () => void;
  onSave: (newObj: Record<string, string>) => void;
}

const TypographyModal: React.FC<TypographyModalProps> = ({
  tokenKey,
  optionName,
  typoObj,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<Record<string, string>>({
    fontFamily: typoObj.fontFamily || "",
    fontWeight: typoObj.fontWeight || "",
    fontSize: typoObj.fontSize || "",
    lineHeight: typoObj.lineHeight || "",
    letterSpacing: typoObj.letterSpacing || "",
    paragraphSpacing: typoObj.paragraphSpacing || "",
    textCase: typoObj.textCase || "",
    textDecoration: typoObj.textDecoration || "",
  });

  const fields = [
    { key: "fontFamily", label: "Font Family", placeholder: "e.g. {font-families.primary}" },
    { key: "fontWeight", label: "Font Weight", placeholder: "e.g. {font-weights.regular} or 400" },
    { key: "fontSize", label: "Font Size", placeholder: "e.g. {font-sizes.base} or 16px" },
    { key: "lineHeight", label: "Line Height", placeholder: "e.g. {line-heights.base} or 24px" },
    { key: "letterSpacing", label: "Letter Spacing", placeholder: "e.g. 0% or 0.5px" },
    { key: "paragraphSpacing", label: "Paragraph Spacing", placeholder: "e.g. 0px" },
    { key: "textCase", label: "Text Case", placeholder: "none, uppercase, lowercase" },
    { key: "textDecoration", label: "Text Decoration", placeholder: "none, underline" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/20">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white font-mono">{tokenKey}</h3>
              <p className="text-xs text-zinc-400">Typography composite token for {optionName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1 font-mono text-xs">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className="grid grid-cols-3 items-center gap-3">
              <label className="text-zinc-400 font-sans text-xs">{label}</label>
              <input
                type="text"
                value={form[key] || ""}
                placeholder={placeholder}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="col-span-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-all"
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-zinc-800 bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-violet-600/30 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Save Typography
          </button>
        </div>
      </div>
    </div>
  );
};
