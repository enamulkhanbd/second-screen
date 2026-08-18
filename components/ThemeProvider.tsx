"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";

/**
 * Client component that syncs the Zustand themeMode state
 * with the `dark` class on <html>, enabling Tailwind dark mode.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeMode } = useTokenStore();

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themeMode]);

  return <>{children}</>;
}
