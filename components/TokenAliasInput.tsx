"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { FlattenedToken } from "@/types/tokens";
import { flattenAndResolveTokens } from "@/utils/transformTokens";
import { Link2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TokenAliasInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  categoryFilter?: string | string[];
  excludeTokenId?: string;
  excludeTokenName?: string;
  autoFocus?: boolean;
}

export const TokenAliasInput: React.FC<TokenAliasInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  categoryFilter,
  excludeTokenId,
  excludeTokenName,
  autoFocus,
}) => {
  const { rawTokens, resolvedTokens } = useTokenStore();
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
    const arr = Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
    return arr.map((c) => String(c || "").toLowerCase().trim()).filter(Boolean);
  }, [categoryFilter]);

  // Retrieve all tokens across all sets in the project
  const allAvailableTokens = useMemo(() => {
    if (!rawTokens || Object.keys(rawTokens).length === 0) {
      return resolvedTokens || [];
    }
    return flattenAndResolveTokens(rawTokens, "ALL");
  }, [rawTokens, resolvedTokens]);

  // Extract query from value (e.g. "{blue.5" -> "blue.5")
  const currentQuery = useMemo(() => {
    if (!value) return "";
    const str = String(value);
    const lastOpenBrace = str.lastIndexOf("{");
    if (lastOpenBrace !== -1) {
      const afterBrace = str.slice(lastOpenBrace + 1);
      return afterBrace.replace(/\}.*$/, "").trim().toLowerCase();
    }
    return str.trim().toLowerCase();
  }, [value]);

  // Suggestions filtered and ranked
  const suggestions = useMemo(() => {
    if (!allAvailableTokens || allAvailableTokens.length === 0) return [];

    const query = String(currentQuery || "").toLowerCase();

    // Score and filter tokens
    const scored = allAvailableTokens.map((token) => {
      const name = String(token.name || "").toLowerCase();
      const type = String(token.type || "").toLowerCase();
      const group = String(token.group || "").toLowerCase();
      const setName = String(token.setName || "").toLowerCase();
      const resolved = String(token.resolvedValue || "").toLowerCase();

      // Exclude current token to prevent circular reference
      if (
        (excludeTokenId && token.id === excludeTokenId) ||
        (excludeTokenName && name === excludeTokenName.toLowerCase().trim())
      ) {
        return { token, score: 0 };
      }

      // Check category match
      if (targetCategories.length > 0) {
        const matchesCategory = targetCategories.some(
          (cat) =>
            type === cat ||
            type.includes(cat) ||
            group === cat ||
            group.includes(cat) ||
            name.includes(cat)
        );
        // If a category filter is active (e.g. 'color'), omit tokens that don't match
        if (!matchesCategory) {
          return { token, score: 0 };
        }
      }

      let score = 30; // Base match

      // Query matching
      if (!query) {
        score += 10;
      } else if (name === query) {
        score += 100;
      } else if (name.startsWith(query)) {
        score += 70;
      } else if (name.includes(query)) {
        score += 40;
      } else if (setName.includes(query)) {
        score += 20;
      } else if (resolved.includes(query)) {
        score += 15;
      } else {
        score = 0; // Does not match search query
      }

      return { token, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 16)
      .map((item) => item.token);
  }, [allAvailableTokens, currentQuery, targetCategories, excludeTokenId, excludeTokenName]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "{" || e.key === "ArrowDown") {
      setIsOpen(true);
    }

    if (!isOpen || suggestions.length === 0) {
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
            if (value.includes("{") || suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={
            className ||
            `w-full font-mono text-xs pl-3 pr-8 py-2 rounded-md border border-input bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors ${
              isAlias ? "text-primary font-semibold" : ""
            }`
          }
        />

        {/* Alias / Reference shortcut button */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (!value.includes("{")) {
              onChange(value ? `{${value}}` : "{");
            }
            setIsOpen(true);
            inputRef.current?.focus();
          }}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/80 transition-colors flex items-center gap-1 ${
            isAlias ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Browse token references ({)"
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Suggestion Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[300px] max-w-md bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 divide-y divide-border">
          <div className="px-3 py-1.5 bg-muted/70 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Token Suggestions</span>
            </span>
            <span>{suggestions.length} matching</span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
            {suggestions.map((token, idx) => {
              const isSelected = idx === selectedIndex;
              const formattedName = `{${token.name}}`;
              const isColor = token.type === "color" || targetCategories.includes("color");
              const resolvedStr = String(token.resolvedValue || token.rawValue || "");

              return (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => selectSuggestion(token)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    {isColor && (
                      <span
                        className="w-4 h-4 rounded-full border border-border flex-shrink-0 shadow-xs ring-1 ring-black/10"
                        style={{
                          backgroundColor: resolvedStr.startsWith("#") || resolvedStr.startsWith("rgb") || resolvedStr.startsWith("hsl") ? resolvedStr : undefined,
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-semibold truncate flex items-center gap-1.5">
                        <span className="text-primary">{formattedName}</span>
                        <span className="text-[10px] text-muted-foreground font-normal truncate">
                          in {token.setName}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5 font-sans">
                        {typeof (token.resolvedValue || token.rawValue) === "object"
                          ? JSON.stringify(token.resolvedValue || token.rawValue)
                          : resolvedStr}
                      </div>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[10px] font-mono flex-shrink-0">
                    {token.type}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
