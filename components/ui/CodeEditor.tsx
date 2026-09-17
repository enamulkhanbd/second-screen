"use client";

import React, { useRef, useMemo, useCallback } from "react";
import {
  tokenizeJsonLine,
  tokenizeCssLine,
  tokenizeTsLine,
  tokenizeBashLine,
  getTokenClass,
  Token,
} from "./CodeViewer";

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = "json",
  disabled = false,
  placeholder,
  className = "",
  showLineNumbers = true,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const underlayRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => value.split("\n"), [value]);

  const lang = (language || "").toLowerCase();
  const isJson = lang.includes("json");
  const isTs =
    lang.includes("typescript") ||
    lang.includes("javascript") ||
    lang.includes("ts") ||
    lang.includes("js") ||
    lang.includes("d.ts") ||
    lang.includes("cjs");
  const isBash =
    lang.includes("bash") ||
    lang.includes("sh") ||
    lang.includes("shell") ||
    lang.includes("cli");

  const tokenizeLine = useCallback(
    (line: string): Token[] => {
      if (isJson) return tokenizeJsonLine(line);
      if (isTs) return tokenizeTsLine(line);
      if (isBash) return tokenizeBashLine(line);
      return tokenizeCssLine(line);
    },
    [isJson, isTs, isBash]
  );

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (underlayRef.current) {
      underlayRef.current.scrollTop = scrollTop;
      underlayRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  return (
    <div
      className={`flex-1 flex h-full w-full overflow-hidden bg-white dark:bg-[#0d0d12] relative select-text ${className}`}
    >
      {/* Line Numbers Gutter */}
      {showLineNumbers && (
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-12 py-4 pl-2 pr-3 select-none text-right font-mono text-xs md:text-[13px] leading-[22px] text-muted-foreground/40 border-r border-border/50 flex-shrink-0 overflow-hidden bg-muted/10"
        >
          {lines.map((_, idx) => (
            <div key={idx} className="h-[22px]">
              {idx + 1}
            </div>
          ))}
        </div>
      )}

      {/* Editor Canvas Viewport */}
      <div className="flex-1 relative h-full w-full overflow-hidden">
        {/* Syntax-Highlighted Underlay */}
        <div
          ref={underlayRef}
          aria-hidden="true"
          className="absolute inset-0 p-4 font-mono text-xs md:text-[13px] leading-[22px] whitespace-pre pointer-events-none select-none overflow-hidden"
        >
          <div className="min-w-fit w-full">
            {lines.map((line, idx) => {
              const tokens = tokenizeLine(line);
              return (
                <div key={idx} className="h-[22px] whitespace-pre">
                  {tokens.length === 0 ? (
                    "\u00A0"
                  ) : (
                    tokens.map((t, tIdx) => (
                      <span key={tIdx} className={getTokenClass(t.type)}>
                        {t.value}
                      </span>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Transparent Interactive Textarea Overlay */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          placeholder={placeholder}
          className="absolute inset-0 w-full h-full p-4 font-mono text-xs md:text-[13px] leading-[22px] whitespace-pre text-transparent bg-transparent caret-foreground resize-none focus:outline-none selection:bg-blue-500/25 border-none select-text overflow-auto"
        />
      </div>
    </div>
  );
};
