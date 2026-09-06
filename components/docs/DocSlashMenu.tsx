"use client";

import React, { useState, useEffect, useRef } from "react";
import { DocBlockType } from "@/types/documentation";
import {
  Table,
  Palette,
  Type,
  Info,
  CheckCircle2,
  FileText,
  Layers,
  Heading,
  Search,
} from "lucide-react";

interface SlashOption {
  type: DocBlockType;
  title: string;
  description: string;
  icon: React.ElementType;
  keywords: string[];
}

const SLASH_OPTIONS: SlashOption[] = [
  {
    type: "variables-table",
    title: "Variables Table",
    description: "Display multi-mode Figma variables with value columns",
    icon: Table,
    keywords: ["var", "variable", "table", "figma", "modes"],
  },
  {
    type: "color-swatches",
    title: "Variable Color Swatches",
    description: "Visual grid of color swatches with click-to-copy tokens",
    icon: Palette,
    keywords: ["color", "swatch", "palette", "hex", "theme"],
  },
  {
    type: "typography-scale",
    title: "Variable Typography",
    description: "Font hierarchy specimens with sizes and line heights",
    icon: Type,
    keywords: ["type", "typography", "font", "scale", "heading"],
  },
  {
    type: "callout",
    title: "Callout Alert",
    description: "Highlight important context, tips, warnings, or instructions",
    icon: Info,
    keywords: ["callout", "alert", "tip", "warning", "info", "note"],
  },
  {
    type: "dodont",
    title: "Do's & Don'ts",
    description: "Side-by-side guidelines comparing correct and incorrect usages",
    icon: CheckCircle2,
    keywords: ["do", "dont", "guideline", "rule", "best practice"],
  },
  {
    type: "heading",
    title: "Heading",
    description: "Section heading (H1, H2, or H3)",
    icon: Heading,
    keywords: ["heading", "title", "header", "h1", "h2", "h3"],
  },
  {
    type: "paragraph",
    title: "Markdown Content",
    description: "Rich text paragraphs, formatting, and markdown",
    icon: FileText,
    keywords: ["markdown", "text", "paragraph", "content"],
  },
  {
    type: "tokens-table",
    title: "Tokens Table",
    description: "Filterable list of repository design tokens",
    icon: Layers,
    keywords: ["tokens", "token", "dictionary", "repository"],
  },
];

interface DocSlashMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: DocBlockType) => void;
  initialQuery?: string;
}

export const DocSlashMenu: React.FC<DocSlashMenuProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialQuery = "",
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialQuery]);

  const filteredOptions = SLASH_OPTIONS.filter((opt) => {
    if (!query) return true;
    const q = query.toLowerCase().replace(/^\//, "");
    return (
      opt.title.toLowerCase().includes(q) ||
      opt.description.toLowerCase().includes(q) ||
      opt.keywords.some((k) => k.includes(q))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredOptions.length - 1) : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[selectedIndex]) {
        onSelect(filteredOptions[selectedIndex].type);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="z-50 w-80 overflow-hidden rounded-xl border border-border/80 bg-popover shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Search Header */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Filter block types..."
          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
          esc
        </span>
      </div>

      {/* Options List */}
      <div className="max-h-72 overflow-y-auto p-1.5">
        {filteredOptions.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No matching blocks found
          </div>
        ) : (
          filteredOptions.map((opt, index) => {
            const Icon = opt.icon;
            const isSelected = index === selectedIndex;

            return (
              <button
                key={opt.type + opt.title}
                type="button"
                onClick={() => {
                  onSelect(opt.type);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  isSelected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted/50"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">{opt.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {opt.description}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
