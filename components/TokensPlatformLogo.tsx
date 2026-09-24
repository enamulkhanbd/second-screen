import React from "react";

export interface TokensPlatformLogoProps {
  /** Size in pixels (applies to width & height of the icon) */
  size?: number;
  /** Visual presentation variant */
  variant?: "mark" | "app-icon" | "full";
  /** Optional custom CSS classes */
  className?: string;
  /** Optional text styling for "full" variant */
  textClassName?: string;
}

/**
 * Official Tokens Platform Brand Icon & Logo
 * ===========================================
 * A precision geometric monogram representing the 4 pillars of the design tokens specification:
 * - Top Left Pill: Figma & Design Variables (Emerald to Cyan)
 * - Top Right Pill: Git & Code Delivery (Cyan to Indigo)
 * - Center Node: Token Resolution & Aliasing Core
 * - Bottom Foundation: Design System Core Foundation
 *
 * Designed with pure mathematical symmetry for crisp rendering at 16px favicon up to 512px app icon.
 */
export const TokensPlatformLogo: React.FC<TokensPlatformLogoProps> = ({
  size = 28,
  variant = "mark",
  className = "",
  textClassName = "",
}) => {
  const uniqueId = React.useId().replace(/:/g, "_");

  const markSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 select-none"
      aria-label="Tokens Platform Logo"
    >
      <defs>
        {/* Top-Left Pill: Emerald to Cyan */}
        <linearGradient
          id={`tp_left_${uniqueId}`}
          x1="4"
          y1="5"
          x2="15"
          y2="12"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Top-Right Pill: Cyan to Indigo */}
        <linearGradient
          id={`tp_right_${uniqueId}`}
          x1="17"
          y1="5"
          x2="28"
          y2="12"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Center Resolver Node: Indigo to Cyan */}
        <linearGradient
          id={`tp_node_${uniqueId}`}
          x1="13"
          y1="13"
          x2="19"
          y2="19"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        {/* Vertical Foundation Pillar: Cyan to Emerald */}
        <linearGradient
          id={`tp_stem_${uniqueId}`}
          x1="13"
          y1="20"
          x2="19"
          y2="27"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Ambient Dark Squircle Gradient (for app-icon variant) */}
        <linearGradient
          id={`tp_bg_${uniqueId}`}
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
      </defs>

      {/* Top Left Token Pill (Figma / Design) */}
      <rect
        x="4.5"
        y="6"
        width="10.5"
        height="5.5"
        rx="2.75"
        fill={`url(#tp_left_${uniqueId})`}
      />

      {/* Top Right Token Pill (Code / Git) */}
      <rect
        x="17"
        y="6"
        width="10.5"
        height="5.5"
        rx="2.75"
        fill={`url(#tp_right_${uniqueId})`}
      />

      {/* Center Token Resolver Node */}
      <circle
        cx="16"
        cy="16.25"
        r="2.75"
        fill={`url(#tp_node_${uniqueId})`}
      />

      {/* Vertical Foundation Pillar (Design System Core) */}
      <rect
        x="13.25"
        y="20.5"
        width="5.5"
        height="6"
        rx="2.75"
        fill={`url(#tp_stem_${uniqueId})`}
      />
    </svg>
  );

  if (variant === "app-icon") {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-zinc-800/90 to-zinc-950 border border-white/10 shadow-md overflow-hidden ${className}`}
        style={{
          width: size * 1.35,
          height: size * 1.35,
        }}
      >
        {/* Subtle radial sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-indigo-500/15 pointer-events-none" />
        {markSvg}
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        {markSvg}
        <div className={`flex flex-col leading-tight ${textClassName}`}>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-foreground">
              Tokens
            </span>
            <span className="font-normal text-sm tracking-tight text-muted-foreground">
              Platform
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <div className={`inline-flex items-center justify-center ${className}`}>{markSvg}</div>;
};

export default TokensPlatformLogo;
