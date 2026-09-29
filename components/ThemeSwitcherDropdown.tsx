"use client";

import React, { useMemo, useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { Check, ChevronDown, ChevronUp, SwatchBook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
          <span>
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
        className="w-56 p-2 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl space-y-2.5 max-h-[80vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 select-none"
      >
        {themeGroups.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No theme groups defined
          </div>
        ) : (
          themeGroups.map((group) => {
            const currentActiveOptionId = activeThemeOptionIds[group.id];

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header: Uppercase title + color dot indicator */}
                <div className="flex items-center gap-1.5 px-1.5 pt-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  <span>{group.name}</span>
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: group.color || "hsl(var(--primary))" }}
                  />
                </div>

                {/* Group Options List */}
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
                          "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors outline-none",
                          isSelected
                            ? "bg-muted/80 text-foreground font-semibold"
                            : "text-foreground/90 hover:bg-muted/40 font-medium"
                        )}
                      >
                        {/* Custom Square Checkbox */}
                        <div
                          className={cn(
                            "size-4 rounded-[4px] flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "border border-muted-foreground/40 bg-transparent"
                          )}
                        >
                          {isSelected && <Check className="size-3 stroke-[3]" />}
                        </div>

                        {/* Option Name */}
                        <span className="truncate flex-1">{option.name}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
