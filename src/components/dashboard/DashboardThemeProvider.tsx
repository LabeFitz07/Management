"use client";

import { createContext, useContext, useEffect, useState } from "react";

type DashboardThemeProviderProps = {
  children: React.ReactNode;
};

export type DashboardTheme = "light" | "dark";

export const DASHBOARD_THEME_STORAGE_KEY = "management-dashboard-theme";

type DashboardThemeContextValue = {
  theme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
};

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null);

function applyTheme(theme: DashboardTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

function getInitialTheme(): DashboardTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY);

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function DashboardThemeProvider({ children }: DashboardThemeProviderProps) {
  const [theme, setTheme] = useState<DashboardTheme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, theme);
  }, [theme]);

  return <DashboardThemeContext.Provider value={{ theme, setTheme }}>{children}</DashboardThemeContext.Provider>;
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext);

  if (!context) {
    throw new Error("useDashboardTheme must be used within DashboardThemeProvider.");
  }

  return context;
}
