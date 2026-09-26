"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { resolveAccessibleBrandTokens, isCustomBrandColor } from "@/utils/colorPalettes";

/**
 * Client component that syncs the Zustand themeMode state
 * with the `dark` class on <html>, enabling Tailwind dark mode,
 * and dynamically calculates dual-theme accessible tokens for
 * custom workspace brand colors.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeMode, currentOrg } = useTokenStore();

  useEffect(() => {
    const root = document.documentElement;

    const applyThemeAndTokens = () => {
      const isDark =
        themeMode === "dark"
          ? true
          : themeMode === "light"
          ? false
          : window.matchMedia("(prefers-color-scheme: dark)").matches;

      // 1. Toggle dark class on root
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      // 2. Resolve accessible brand tokens
      const rawColor = currentOrg?.color?.trim();
      if (!isCustomBrandColor(rawColor)) {
        root.style.removeProperty("--primary");
        root.style.removeProperty("--primary-foreground");
        root.style.removeProperty("--ring");
        root.style.removeProperty("--primary-subtle");
        root.style.removeProperty("--primary-border");
        return;
      }

      const tokens = resolveAccessibleBrandTokens(rawColor);
      const activeTokens = isDark ? tokens.dark : tokens.light;

      root.style.setProperty("--primary", activeTokens.primaryHsl);
      root.style.setProperty("--primary-foreground", activeTokens.foregroundHsl);
      root.style.setProperty("--ring", activeTokens.primaryHsl);
      root.style.setProperty("--primary-subtle", activeTokens.subtleHex);

      if (!isDark && tokens.light.isUltraLight) {
        root.style.setProperty("--primary-border", tokens.light.borderHex);
      } else {
        root.style.removeProperty("--primary-border");
      }
    };

    applyThemeAndTokens();

    if (themeMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyThemeAndTokens();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [themeMode, currentOrg?.id, currentOrg?.color]);

  return <>{children}</>;
}

