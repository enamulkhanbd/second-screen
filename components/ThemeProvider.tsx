"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { getContrastTextColor, hexToRgb, rgbToHsl, normalizeHexColor } from "@/utils/colorPalettes";

/**
 * Client component that syncs the Zustand themeMode state
 * with the `dark` class on <html>, enabling Tailwind dark mode.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeMode, currentOrg } = useTokenStore();

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      const isDark =
        themeMode === "dark"
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
  }, [themeMode]);

  useEffect(() => {
    const root = document.documentElement;
    const color = normalizeHexColor(currentOrg?.color || "#6366f1");
    const rgb = hexToRgb(color);
    if (!rgb) return;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    root.style.setProperty("--primary", `${hsl.h * 360} ${hsl.s * 100}% ${hsl.l * 100}%`);
    root.style.setProperty("--primary-foreground", getContrastTextColor(color) === "#ffffff" ? "0 0% 100%" : "224 71.4% 4.1%");
    root.style.setProperty("--ring", `${hsl.h * 360} ${hsl.s * 100}% ${hsl.l * 100}%`);
  }, [currentOrg?.id, currentOrg?.color]);

  return <>{children}</>;
}
