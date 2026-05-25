"use client";

import { useAppTheme } from "@/components/dashboard/DashboardThemeProvider";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useAppTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      className={`inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:border-cyan-400 dark:hover:text-cyan-300 ${className}`}
    >
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
