"use client";

import React, { useMemo, useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Check, ChevronDown, ChevronUp, SwatchBook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeSwitcherDropdownProps {
  className?: string;
}

export const ThemeSwitcherDropdown: React.FC<ThemeSwitcherDropdownProps> = ({
  className,
}) => {
  const {
    themeGroups,
    activeThemeOptionIds,
    setActiveThemeOptionForGroup,
  } = useTokenStore();

  const [isOpen, setIsOpen] = useState(false);

  // Calculate active themes count based on valid active options across all groups
  const activeCount = useMemo(() => {
    let count = 0;
    themeGroups.forEach((group) => {
      const activeOptionId = activeThemeOptionIds[group.id];
      if (activeOptionId && group.options.some((opt) => opt.id === activeOptionId)) {
        count++;
      }
    });
    return count;
  }, [themeGroups, activeThemeOptionIds]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 px-2.5 text-xs rounded-lg border border-border bg-background hover:bg-muted/60 text-foreground font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer select-none transition-colors",
            isOpen && "bg-muted/80 border-border",
            className
          )}
          aria-label="Theme switcher"
          title="Switch active themes"
        >
          <SwatchBook className="size-3.5 text-foreground/80 shrink-0" />
          <span className="tabular-nums">
            {activeCount} {activeCount === 1 ? "theme" : "themes"}
          </span>
          {isOpen ? (
            <ChevronUp className="size-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="size-3 text-muted-foreground shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-56 max-h-[80vh] overflow-y-auto select-none"
      >
        {themeGroups.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No theme groups defined
          </div>
        ) : (
          themeGroups.map((group, groupIdx) => {
            const currentActiveOptionId = activeThemeOptionIds[group.id];

            return (
              <React.Fragment key={group.id}>
                {groupIdx > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="flex items-center justify-between gap-2">
                  <span className="truncate">{group.name}</span>
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: group.color || "hsl(var(--primary))" }}
                  />
                </DropdownMenuLabel>

                <div className="space-y-0.5">
                  {group.options.map((option) => {
                    const isSelected = currentActiveOptionId === option.id;

                    return (
                      <DropdownMenuItem
                        key={option.id}
                        onSelect={(e) => {
                          e.preventDefault();
                          setActiveThemeOptionForGroup(group.id, option.id);
                        }}
                        className={cn(
                          "justify-between",
                          isSelected && "bg-accent/60 font-semibold text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: option.color || group.color || "hsl(var(--primary))" }}
                          />
                          <span className="truncate">{option.name}</span>
                        </div>
                        {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </React.Fragment>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
