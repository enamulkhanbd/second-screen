"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface TokensPlatformLogoProps {
  /** Visual display style */
  variant?: "mark" | "app-icon" | "full";
  /** Size in pixels (applies to icon/mark width and height) */
  size?: number;
  /** Custom class name for the wrapper element */
  className?: string;
  /** Custom class name applied directly to the SVG mark */
  iconClassName?: string;
  /** Custom class name for typography text in "full" variant */
  textClassName?: string;
  /** Optional badge text displayed next to brand name (e.g. "v1.3.0") */
  badge?: string;
  /** Stroke width for vector paths (default: 2) */
  strokeWidth?: number;
  /** Optional click handler */
  onClick?: () => void;
}

/**
 * 3-Tier Isometric Rounded Stack Mark
 * Exact vector paths matching Tokens Platform core brand identity.
 */
export const TokensPlatformMark: React.FC<{
  className?: string;
  size?: number | string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({ className, size, strokeWidth = 2, style }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        width: size ?? undefined,
        height: size ?? undefined,
        ...style,
      }}
      className={cn("w-6 h-6 flex-shrink-0 transition-colors", className)}
      aria-hidden="true"
    >
      {/* Top Diamond Layer */}
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      {/* Middle Chevron Layer */}
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      {/* Bottom Chevron Layer */}
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
    </svg>
  );
};

/**
 * Official Tokens Platform Brand Logo Component
 * Supports standalone mark, squircle app icon, and full wordmark.
 */
export const TokensPlatformLogo: React.FC<TokensPlatformLogoProps> = ({
  variant = "mark",
  size,
  className,
  iconClassName,
  textClassName,
  badge,
  strokeWidth = 2,
  onClick,
}) => {
  if (variant === "mark") {
    return (
      <TokensPlatformMark
        size={size}
        strokeWidth={strokeWidth}
        className={cn(className, iconClassName)}
      />
    );
  }

  if (variant === "app-icon") {
    const boxSize = size || 32;
    const innerIconSize = Math.round(boxSize * 0.58);

    return (
      <div
        onClick={onClick}
        className={cn(
          "rounded-xl bg-gradient-to-tr from-primary via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm flex-shrink-0 transition-transform select-none",
          onClick && "cursor-pointer hover:scale-105 active:scale-95",
          className
        )}
        style={{ width: boxSize, height: boxSize }}
      >
        <TokensPlatformMark
          size={innerIconSize}
          strokeWidth={strokeWidth}
          className={cn("text-white", iconClassName)}
        />
      </div>
    );
  }

  // "full" variant: App Icon + Typography Wordmark + optional Badge
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 select-none",
        onClick && "cursor-pointer hover:opacity-90 transition-opacity",
        className
      )}
    >
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
        <TokensPlatformMark
          size={18}
          strokeWidth={strokeWidth}
          className={cn("text-white", iconClassName)}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "font-bold text-sm tracking-tight text-foreground",
            textClassName
          )}
        >
          Tokens Platform
        </span>
        {badge && (
          <Badge
            variant="outline"
            className="text-[10px] font-mono py-0 px-1.5 border-primary/30 text-primary bg-primary/5"
          >
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default TokensPlatformLogo;
