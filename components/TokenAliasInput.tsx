"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { FlattenedToken } from "@/types/tokens";
import { Link2, Sparkles, Check } from "lucide-react";

interface TokenAliasInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  categoryFilter?: string | string[];
  autoFocus?: boolean;
}

export const TokenAliasInput: React.FC<TokenAliasInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  categoryFilter,
  autoFocus,
}) => {
  const { resolvedTokens } = useTokenStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter categories helper
  const targetCategories = useMemo(() => {
    if (!categoryFilter) return [];
    return Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
  }, [categoryFilter]);

  // Extract query from value (e.g. "{font-families.pri" -> "font-families.pri")
  const currentQuery = useMemo(() => {
    if (!value) return "";
    const lastOpenBrace = value.lastIndexOf("{");
    if (lastOpenBrace !== -1) {
      const afterBrace = value.slice(lastOpenBrace + 1);
      return afterBrace.replace(/\}.*$/, "").trim().toLowerCase();
    }
    return value.trim().toLowerCase();
  }, [value]);

  // Suggestions filtered and ranked
  const suggestions = useMemo(() => {
    if (!resolvedTokens || resolvedTokens.length === 0) return [];

    const query = currentQuery.toLowerCase();

    // Score and filter tokens
    const scored = resolvedTokens.map((token) => {
      const name = token.name.toLowerCase();
      const type = (token.type || "").toLowerCase();
      const group = (token.group || "").toLowerCase();

      let score = 0;

      // Category matching bonus
      if (targetCategories.length > 0) {
        const matchesCategory = targetCategories.some(
          (cat) =>
            type.includes(cat.toLowerCase()) ||
            group.includes(cat.toLowerCase()) ||
            name.includes(cat.toLowerCase())
        );
        if (matchesCategory) score += 20;
      }

      // Query matching
      if (!query) {
        score += 1;
      } else if (name === query) {
        score += 100;
      } else if (name.startsWith(query)) {
        score += 50;
      } else if (name.includes(query)) {
        score += 25;
      } else if (type.includes(query) || token.resolvedValue.toLowerCase().includes(query)) {
        score += 10;
      } else {
        score = 0; // No match
      }

      return { token, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((item) => item.token);
  }, [resolvedTokens, currentQuery, targetCategories]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" || e.key === "{" ) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (suggestions[selectedIndex]) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const selectSuggestion = (token: FlattenedToken) => {
    // If the input already has a partial "{alias...", replace the brace portion
    const lastOpenBrace = value.lastIndexOf("{");
    if (lastOpenBrace !== -1) {
      const before = value.slice(0, lastOpenBrace);
      const after = value.slice(lastOpenBrace).replace(/^\{[^}]*\}?/, "");
      onChange(`${before}{${token.name}}${after}`);
    } else {
      onChange(`{${token.name}}`);
    }
    setIsOpen(false);
  };

  const isAlias = value.includes("{");

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={
            className ||
            `w-full font-mono text-xs px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all ${
              isAlias ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""
            }`
          }
        />

        {isAlias && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono pointer-events-none">
            <Link2 className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Suggestion Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[280px] max-w-sm bg-white dark:bg-[#121218] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 divide-y divide-zinc-100 dark:divide-zinc-800/60">
          <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Token Suggestions</span>
            </span>
            <span>{suggestions.length} matching</span>
          </div>

          <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
            {suggestions.map((token, idx) => {
              const isSelected = idx === selectedIndex;
              const formattedName = `{${token.name}}`;

              return (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => selectSuggestion(token)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-mono text-xs font-semibold truncate flex items-center gap-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {formattedName}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-sans">
                      {token.resolvedValue || token.rawValue}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-mono flex-shrink-0">
                    {token.type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
