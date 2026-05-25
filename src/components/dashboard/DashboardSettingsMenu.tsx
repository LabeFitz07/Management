"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/auth-actions";
import { useDashboardTheme } from "./DashboardThemeProvider";

type DashboardSettingsMenuProps = {
  displayName: string;
  email: string;
  roleLabel: string;
  profileImageUrl: string;
};

function getInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "TM";
}

export function DashboardSettingsMenu({
  displayName,
  email,
  roleLabel,
  profileImageUrl,
}: DashboardSettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { theme, setTheme } = useDashboardTheme();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="flex flex-col items-end">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        Settings
      </button>

      {isOpen ? (
        <div className="z-30 mt-3 w-full min-w-[320px] max-w-[320px] rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center gap-3 rounded-[1.25rem] bg-slate-50 p-3 dark:bg-slate-900">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt={`${displayName} profile`}
                className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white dark:bg-cyan-300 dark:text-slate-950">
                {getInitials(displayName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{displayName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{email}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                {roleLabel}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Theme
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
                className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                  theme === "light"
                    ? "bg-slate-950 text-white dark:bg-cyan-300 dark:text-slate-950"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                }`}
              >
                Light Mode
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
                className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                  theme === "dark"
                    ? "bg-slate-950 text-white dark:bg-cyan-300 dark:text-slate-950"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                }`}
              >
                Dark Mode
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Link
              href="/account"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
              onClick={() => setIsOpen(false)}
            >
              My Account
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
