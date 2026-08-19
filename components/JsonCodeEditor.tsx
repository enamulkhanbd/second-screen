"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  FileCode,
  Save,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileJson,
  Check,
} from "lucide-react";

interface JsonCodeEditorProps {
  onOpenPushModal?: () => void;
}

export const JsonCodeEditor: React.FC<JsonCodeEditorProps> = () => {
  const {
    rawTokens,
    activeSet,
    updateSetJson,
    syncMeta,
    addToast,
  } = useTokenStore();

  // Selected set key (if activeSet is "ALL", fallback to first available set key)
  const allSetKeys = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  }, [rawTokens]);

  const currentSetKey = activeSet && activeSet !== "ALL" ? activeSet : allSetKeys[0] || "";

  // Content state for the code editor
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Sync editor content when currentSetKey or rawTokens changes
  useEffect(() => {
    if (currentSetKey && rawTokens[currentSetKey] !== undefined) {
      try {
        const formatted = JSON.stringify(rawTokens[currentSetKey], null, 2);
        setCode(formatted);
        setError(null);
      } catch (err: any) {
        setCode(String(rawTokens[currentSetKey]));
      }
    } else if (rawTokens["$themes"] && currentSetKey === "$themes") {
      setCode(JSON.stringify(rawTokens["$themes"], null, 2));
      setError(null);
    } else {
      setCode("{\n  \n}");
      setError(null);
    }
  }, [currentSetKey, rawTokens]);

  // Check if current editor content differs from stored rawTokens
  const hasUnsavedChanges = useMemo(() => {
    if (!currentSetKey || rawTokens[currentSetKey] === undefined) return false;
    try {
      const original = JSON.stringify(rawTokens[currentSetKey], null, 2);
      return code.trim() !== original.trim();
    } catch {
      return false;
    }
  }, [code, currentSetKey, rawTokens]);

  // Format code
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(code);
      const formatted = JSON.stringify(parsed, null, 2);
      setCode(formatted);
      setError(null);
    } catch (err: any) {
      setError(`Invalid JSON syntax: ${err.message}`);
    }
  };

  // Discard changes and revert to stored version
  const handleDiscard = () => {
    if (currentSetKey && rawTokens[currentSetKey] !== undefined) {
      setCode(JSON.stringify(rawTokens[currentSetKey], null, 2));
      setError(null);
    }
  };

  // Save changes to store
  const handleSave = () => {
    if (!currentSetKey) return;
    try {
      const parsed = JSON.parse(code);
      updateSetJson(currentSetKey, parsed);
      setError(null);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      addToast({
        type: "success",
        title: "JSON Saved",
        message: `Saved changes to ${currentSetKey}.json`,
      });
    } catch (err: any) {
      setError(`Cannot save invalid JSON: ${err.message}`);
      addToast({
        type: "error",
        title: "Invalid JSON Syntax",
        message: err.message,
      });
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, currentSetKey]);

  // Handle Tab key in textarea to insert 2 spaces
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Calculate line numbers
  const lineCount = useMemo(() => {
    return code.split("\n").length;
  }, [code]);

  if (!currentSetKey && allSetKeys.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-[#09090d] text-zinc-500 font-sans">
        <FileJson className="w-12 h-12 text-zinc-400 mb-3 opacity-60" />
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
          No JSON File Selected
        </h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm text-center">
          Select a token set from the Tokens tab on the left to view and edit its JSON source.
        </p>
      </div>
    );
  }

  const relativeFileName = `${currentSetKey}.json`;
  const repoFilePath = syncMeta?.files?.[currentSetKey] || relativeFileName;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#0c0c10] font-sans">
      {/* 1. Header Toolbar */}
      <div className="h-12 border-b border-zinc-200 dark:border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-50/80 dark:bg-[#0e0e13] select-none flex-shrink-0">
        {/* Left: File Name, Path & Unsaved Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 font-mono">
            <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
              {relativeFileName}
            </span>
          </div>

          {repoFilePath !== relativeFileName && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono hidden md:inline truncate max-w-xs" title={repoFilePath}>
              ({repoFilePath})
            </span>
          )}

          {hasUnsavedChanges && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[11px] font-semibold font-mono animate-pulse border border-amber-300 dark:border-amber-800/60">
              Unsaved
            </span>
          )}

          {isSaved && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold font-mono flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Saved</span>
            </span>
          )}
        </div>

        {/* Right: Actions (Format, Discard, Save) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFormat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-sm"
            title="Prettify JSON"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span>Format</span>
          </button>

          {hasUnsavedChanges && (
            <button
              onClick={handleDiscard}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
              hasUnsavedChanges
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
            }`}
            title="Save JSON (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save JSON</span>
          </button>
        </div>
      </div>

      {/* 2. Syntax Error Banner (if error) */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 font-mono select-text flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* 3. Code Editor View with Line Numbers */}
      <div className="flex-1 flex overflow-hidden font-mono text-[13px]">
        {/* Line Numbers Bar */}
        <div className="w-12 py-4 select-none text-right pr-3 bg-zinc-50/60 dark:bg-[#0a0a0d] border-r border-zinc-200 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-600 text-xs font-mono flex-shrink-0 overflow-hidden leading-[22px]">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1}>{i + 1}</div>
          ))}
        </div>

        {/* JSON Code Textarea */}
        <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#0c0c10]">
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              try {
                JSON.parse(e.target.value);
                setError(null);
              } catch (err: any) {
                setError(err.message);
              }
            }}
            onKeyDown={handleTextareaKeyDown}
            spellCheck={false}
            className="w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-[13px] leading-[22px] text-zinc-900 dark:text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-200"
            placeholder="{\n  \n}"
          />
        </div>
      </div>

      {/* 4. Editor Status Footer */}
      <div className="h-8 border-t border-zinc-200 dark:border-zinc-800/80 px-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/60 dark:bg-[#0a0a0d] select-none flex-shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <span>JSON</span>
          <span>•</span>
          <span>{lineCount} lines</span>
          <span>•</span>
          <span>{new Blob([code]).size} bytes</span>
        </div>

        <div className="flex items-center gap-2">
          {error ? (
            <span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Syntax Error</span>
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Valid JSON</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
