"use client";

import React, { useMemo, useState, useCallback } from "react";

export interface CodeViewerProps {
  content: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export interface Token {
  type:
    | "property"
    | "variable"
    | "keyword"
    | "function"
    | "string"
    | "alias"
    | "number"
    | "boolean"
    | "comment"
    | "selector"
    | "punctuation"
    | "text";
  value: string;
}

/**
 * Tokenize a single line of CSS / SCSS
 */
export function tokenizeCssLine(line: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|(--[\w-]+|\$[\w-]+)|(:root|html|body|@[\w-]+|[.#][\w-]+)|(\b(?:var|calc|min|max|clamp|url|rgba?|hsla?|linear-gradient)\b)|(#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|deg|ms|s|fr|vh|vw)?\b)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([{}:;(),])|([^\s{}():;,"'#]+|\s+)/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match[1]) {
      tokens.push({ type: "comment", value: match[1] });
    } else if (match[2]) {
      // CSS custom property or SCSS variable
      tokens.push({ type: "variable", value: match[2] });
    } else if (match[3]) {
      tokens.push({ type: "selector", value: match[3] });
    } else if (match[4]) {
      tokens.push({ type: "function", value: match[4] });
    } else if (match[5]) {
      tokens.push({ type: "number", value: match[5] });
    } else if (match[6]) {
      tokens.push({ type: "string", value: match[6] });
    } else if (match[7]) {
      tokens.push({ type: "punctuation", value: match[7] });
    } else {
      tokens.push({ type: "text", value: match[8] || match[0] });
    }
  }

  return tokens;
}

/**
 * Tokenize a single line of JSON
 */
export function tokenizeJsonLine(line: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\b(?:true|false|null)\b)|([{}[\]:,])|([^\s{}[\]:,"']+|\s+)/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match[1]) {
      if (match[2]) {
        // Key
        tokens.push({ type: "property", value: match[1] });
        tokens.push({ type: "punctuation", value: match[2] });
      } else {
        // String value or alias reference
        if (/^"\{[^{}]+\}"$/.test(match[1])) {
          tokens.push({ type: "alias", value: match[1] });
        } else {
          tokens.push({ type: "string", value: match[1] });
        }
      }
    } else if (match[3]) {
      tokens.push({ type: "number", value: match[3] });
    } else if (match[4]) {
      tokens.push({ type: "boolean", value: match[4] });
    } else if (match[5]) {
      tokens.push({ type: "punctuation", value: match[5] });
    } else {
      tokens.push({ type: "text", value: match[6] || match[0] });
    }
  }

  return tokens;
}

/**
 * Tokenize a single line of TypeScript / JavaScript
 */
export function tokenizeTsLine(line: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)|(\b(?:export|import|from|const|let|var|type|interface|as|default|return|function|class|extends|implements|new|typeof|keyof)\b)|(\b(?:string|number|boolean|any|unknown|void|never|null|undefined|Record|Array|Promise)\b)|(\b(?:true|false)\b)|(\b\d+(?:\.\d+)?\b)|([a-zA-Z_$][\w$]*)(\s*:)?|([{}[\]():;,.<>=+\-*/%&|^!~?])|(\s+)/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match[1]) {
      tokens.push({ type: "comment", value: match[1] });
    } else if (match[2]) {
      tokens.push({ type: "string", value: match[2] });
    } else if (match[3]) {
      tokens.push({ type: "keyword", value: match[3] });
    } else if (match[4]) {
      tokens.push({ type: "selector", value: match[4] });
    } else if (match[5]) {
      tokens.push({ type: "boolean", value: match[5] });
    } else if (match[6]) {
      tokens.push({ type: "number", value: match[6] });
    } else if (match[7]) {
      if (match[8]) {
        // Property followed by colon
        tokens.push({ type: "property", value: match[7] });
        tokens.push({ type: "punctuation", value: match[8] });
      } else {
        tokens.push({ type: "text", value: match[7] });
      }
    } else if (match[9]) {
      tokens.push({ type: "punctuation", value: match[9] });
    } else if (match[10]) {
      tokens.push({ type: "text", value: match[10] });
    } else {
      tokens.push({ type: "text", value: match[0] });
    }
  }

  return tokens;
}

/**
 * Tokenize a single line of Bash / CLI
 */
export function tokenizeBashLine(line: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /(#[^\n]*)|(--[\w-]+|-[\w]+)|(\b(?:npx|npm|git|node|pnpm|yarn|bun|curl|cd|mkdir|touch)\b)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([^\s"']+|\s+)/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match[1]) {
      tokens.push({ type: "comment", value: match[1] });
    } else if (match[2]) {
      tokens.push({ type: "variable", value: match[2] });
    } else if (match[3]) {
      tokens.push({ type: "function", value: match[3] });
    } else if (match[4]) {
      tokens.push({ type: "string", value: match[4] });
    } else {
      tokens.push({ type: "text", value: match[5] || match[0] });
    }
  }

  return tokens;
}

/**
 * Get CSS class for a given token type
 * Matches user reference screenshot:
 * - Burnt orange for variables / properties: #c2410c (light) / #fb923c (dark)
 * - Vivid blue for functions (var) / keywords: #0284c7 (light) / #38bdf8 (dark)
 * - Dark gray / slate for punctuation: #1e293b (light) / #94a3b8 (dark)
 * - Green for strings: #15803d (light) / #4ade80 (dark)
 * - Cyan for numbers: #0891b2 (light) / #22d3ee (dark)
 */
export function getTokenClass(type: Token["type"]): string {
  switch (type) {
    case "variable":
    case "property":
      return "text-[#c2410c] dark:text-[#fb923c] font-medium";
    case "function":
    case "keyword":
      return "text-[#0284c7] dark:text-[#38bdf8] font-semibold";
    case "selector":
      return "text-[#7c3aed] dark:text-[#c084fc] font-medium";
    case "string":
      return "text-[#15803d] dark:text-[#4ade80]";
    case "alias":
      return "text-[#0284c7] dark:text-[#38bdf8] font-semibold";
    case "number":
      return "text-[#0891b2] dark:text-[#22d3ee]";
    case "boolean":
      return "text-[#2563eb] dark:text-[#818cf8]";
    case "comment":
      return "text-[#64748b] dark:text-[#64748b] italic";
    case "punctuation":
      return "text-[#1e293b] dark:text-[#94a3b8]";
    case "text":
    default:
      return "text-foreground";
  }
}

const CodeLine = React.memo<{
  idx: number;
  showLineNumbers: boolean;
  tokens: Token[];
}>(({ idx, showLineNumbers, tokens }) => (
  <div className="flex items-start hover:bg-muted/30 dark:hover:bg-zinc-800/30 transition-colors px-4 py-0.5">
    {showLineNumbers && (
      <span className="w-10 pr-4 text-right select-none text-muted-foreground/50 font-mono text-[11px]">
        {idx + 1}
      </span>
    )}
    <span className="flex-1 whitespace-pre">
      {tokens.length === 0 ? (
        "\u00A0"
      ) : (
        tokens.map((t, tIdx) => (
          <span key={tIdx} className={getTokenClass(t.type)}>
            {t.value}
          </span>
        ))
      )}
    </span>
  </div>
));
CodeLine.displayName = "CodeLine";

export const CodeViewer: React.FC<CodeViewerProps> = ({
  content,
  language = "css",
  showLineNumbers = false,
  className = "",
}) => {
  const lines = useMemo(() => content.split("\n"), [content]);
  const [visibleLines, setVisibleLines] = useState(500);

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

  const displayedLines = useMemo(() => {
    return lines.slice(0, visibleLines).map((line, idx) => ({
      idx,
      tokens: tokenizeLine(line),
    }));
  }, [lines, visibleLines, tokenizeLine]);

  return (
    <div
      className={`font-mono text-xs md:text-[13px] leading-relaxed select-text bg-white dark:bg-[#0d0d12] text-foreground ${className}`}
    >
      <div className="min-w-fit w-full">
        {displayedLines.map((item) => (
          <CodeLine
            key={item.idx}
            idx={item.idx}
            showLineNumbers={showLineNumbers}
            tokens={item.tokens}
          />
        ))}
      </div>
      {lines.length > visibleLines && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/40 bg-muted/20 text-xs text-muted-foreground mt-2">
          <span>
            Showing {visibleLines} of {lines.length} lines
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibleLines((prev) => Math.min(prev + 1000, lines.length))}
              className="px-2.5 py-1 text-xs font-medium rounded hover:bg-muted text-foreground border border-border/40 transition-colors"
            >
              Load more (+1,000)
            </button>
            <button
              type="button"
              onClick={() => setVisibleLines(lines.length)}
              className="px-2.5 py-1 text-xs font-medium rounded hover:bg-muted text-foreground border border-border/40 transition-colors"
            >
              Load all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
