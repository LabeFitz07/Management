"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarItem = {
  href: string;
  label: string;
  shortLabel: string;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { href: "/dashboard", label: "Overview", shortLabel: "Home" },
  { href: "/dashboard/workflow", label: "Workflow", shortLabel: "Flow" },
  { href: "/dashboard/staff", label: "Staff", shortLabel: "Staff" },
  { href: "/dashboard/departments", label: "Departments", shortLabel: "Dept" },
  { href: "/dashboard/roles", label: "Roles", shortLabel: "Roles" },
];

export const DEPARTMENT_ADMIN_SIDEBAR_ITEMS: SidebarItem[] = [
  { href: "/dashboard", label: "Overview", shortLabel: "Home" },
  { href: "/dashboard/workflow", label: "Workflow", shortLabel: "Flow" },
  { href: "/dashboard/staff", label: "Staff", shortLabel: "Staff" },
  { href: "/dashboard/departments", label: "Departments", shortLabel: "Dept" },
  { href: "/dashboard/roles", label: "Roles", shortLabel: "Roles" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items = SIDEBAR_ITEMS }: { items?: SidebarItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2" aria-label="Dashboard sections">
      {items.map((item) => {
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
              isActive
                ? "bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] dark:bg-cyan-300 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isActive
                  ? "bg-white/15 text-white dark:bg-slate-950/15 dark:text-slate-950"
                  : "bg-slate-200 text-slate-500 group-hover:bg-slate-300 group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-slate-200"
              }`}
            >
              {item.shortLabel}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
