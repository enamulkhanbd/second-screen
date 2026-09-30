"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { getContrastTextColor, hexToRgb, rgbToHsl, normalizeHexColor } from "@/utils/colorPalettes";

/**
 * Client component that syncs the Zustand themeMode state
 * with the `dark` class on <html>, enabling Tailwind dark mode.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeMode, currentOrg, sidebarTab } = useTokenStore();

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      const isWorkspaces =
        sidebarTab === "workspaces" ||
        (typeof window !== "undefined" && window.location.pathname === "/");
      const isDark =
        isWorkspaces
          ? true
          : themeMode === "dark"
          ? true
          : themeMode === "light"
          ? false
          : window.matchMedia("(prefers-color-scheme: dark)").matches;

      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();

    if (themeMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [themeMode, sidebarTab]);

  useEffect(() => {
    const root = document.documentElement;

    // On Workspaces list view, always clear organization color overrides to preserve apps default theme
    if (sidebarTab === "workspaces") {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
      return;
    }

    const rawColor = currentOrg?.color?.trim().toLowerCase();
    // If color is default brand (#171717, legacy #6366f1, or legacy #2e9401/#2d9401) or not customized, remove inline override so globals.css controls both light & dark mode!
    const isDefaultBrand =
      !rawColor ||
      rawColor === "#171717" ||
      rawColor === "#6366f1" ||
      rawColor === "#2e9401" ||
      rawColor === "#2d9401" ||
      rawColor === "#0a0a0a" ||
      rawColor === "neutral";

    if (isDefaultBrand) {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
      return;
    }

    const color = normalizeHexColor(rawColor, "#171717");
    const rgb = hexToRgb(color);
    if (!rgb) return;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    root.style.setProperty("--primary", `${hsl.h * 360} ${hsl.s * 100}% ${hsl.l * 100}%`);
    root.style.setProperty("--primary-foreground", getContrastTextColor(color) === "#ffffff" ? "0 0% 100%" : "0 0% 9%");
    root.style.setProperty("--ring", `${hsl.h * 360} ${hsl.s * 100}% ${hsl.l * 100}%`);
  }, [currentOrg?.id, currentOrg?.color]);

  return <>{children}</>;
}
