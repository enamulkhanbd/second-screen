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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const allSetKeys = useMemo(() => {
    return Object.keys(rawTokens).filter((k) => !k.startsWith("$"));
  }, [rawTokens]);

  const currentSetKey = activeSet && activeSet !== "ALL" ? activeSet : allSetKeys[0] || "";

  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (currentSetKey && rawTokens[currentSetKey] !== undefined) {
      try {
        const formatted = JSON.stringify(rawTokens[currentSetKey], null, 2);
        setCode(formatted);
        setError(null);
      } catch {
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

  const hasUnsavedChanges = useMemo(() => {
    if (!currentSetKey || rawTokens[currentSetKey] === undefined) return false;
    try {
      const original = JSON.stringify(rawTokens[currentSetKey], null, 2);
      return code.trim() !== original.trim();
    } catch {
      return false;
    }
  }, [code, currentSetKey, rawTokens]);

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

  const handleDiscard = () => {
    if (currentSetKey && rawTokens[currentSetKey] !== undefined) {
      setCode(JSON.stringify(rawTokens[currentSetKey], null, 2));
      setError(null);
    }
  };

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

  const lineCount = useMemo(() => {
    return code.split("\n").length;
  }, [code]);

  if (!currentSetKey && allSetKeys.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-muted-foreground font-sans">
        <FileJson className="w-12 h-12 mb-3 opacity-40" />
        <h3 className="text-base font-bold text-foreground">
          No JSON File Selected
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
          Select a token set from the Tokens tab on the left to view and edit its JSON source.
        </p>
      </div>
    );
  }

  const relativeFileName = `${currentSetKey}.json`;
  const repoFilePath = syncMeta?.files?.[currentSetKey] || relativeFileName;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background font-sans">
      {/* 1. Header Toolbar */}
      <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-card select-none flex-shrink-0">
        {/* Left: File Name, Path & Unsaved Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 font-mono">
            <FileCode className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-bold text-foreground truncate">
              {relativeFileName}
            </span>
          </div>

          {repoFilePath !== relativeFileName && (
            <span className="text-xs text-muted-foreground font-mono hidden md:inline truncate max-w-xs" title={repoFilePath}>
              ({repoFilePath})
            </span>
          )}

          {hasUnsavedChanges && (
            <Badge variant="warning" className="text-[11px] font-mono animate-pulse">
              Unsaved
            </Badge>
          )}

          {isSaved && (
            <Badge variant="success" className="text-[11px] font-mono gap-1">
              <Check className="w-3 h-3" />
              <span>Saved</span>
            </Badge>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFormat}
            className="gap-1.5 h-8 text-xs font-semibold"
            title="Prettify JSON"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Format</span>
          </Button>

          {hasUnsavedChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              className="gap-1 h-8 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="gap-1.5 h-8 text-xs font-bold"
            title="Save JSON (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save JSON</span>
          </Button>
        </div>
      </div>

      {/* 2. Syntax Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/30 text-destructive text-xs flex items-center gap-2 font-mono select-text flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* 3. Code Editor View with Line Numbers */}
      <div className="flex-1 flex overflow-hidden font-mono text-[13px]">
        {/* Line Numbers Bar */}
        <div className="w-12 py-4 select-none text-right pr-3 bg-muted/40 border-r border-border text-muted-foreground text-xs font-mono flex-shrink-0 overflow-hidden leading-[22px]">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1}>{i + 1}</div>
          ))}
        </div>

        {/* JSON Code Textarea */}
        <div className="flex-1 relative overflow-hidden bg-background">
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
            className="w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-[13px] leading-[22px] text-foreground selection:bg-primary/20 selection:text-primary"
            placeholder="{\n  \n}"
          />
        </div>
      </div>

      {/* 4. Editor Status Footer */}
      <div className="h-8 border-t border-border px-4 flex items-center justify-between text-xs text-muted-foreground bg-muted/40 select-none flex-shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <span>JSON</span>
          <span>•</span>
          <span>{lineCount} lines</span>
          <span>•</span>
          <span>{new Blob([code]).size} bytes</span>
        </div>

        <div className="flex items-center gap-2">
          {error ? (
            <span className="text-destructive flex items-center gap-1 font-semibold">
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
