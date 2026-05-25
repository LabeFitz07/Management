import Link from "next/link";

type DashboardNotificationButtonProps = {
  pendingApprovalCount: number;
  unreadNotificationCount: number;
};

function formatCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function DashboardNotificationButton({
  pendingApprovalCount,
  unreadNotificationCount,
}: DashboardNotificationButtonProps) {
  const totalAttentionCount = unreadNotificationCount + pendingApprovalCount;
  const hasUnreadNotifications = unreadNotificationCount > 0;
  const hasPendingApprovals = pendingApprovalCount > 0;
  const href = hasPendingApprovals ? "/dashboard/staff#approval-queue" : "/notifications";
  const helperText = hasPendingApprovals
    ? `${formatCountLabel(pendingApprovalCount, "staff approval", "staff approvals")} waiting`
    : hasUnreadNotifications
      ? `${formatCountLabel(unreadNotificationCount, "unread update", "unread updates")} in your inbox`
      : "No new alerts";

  return (
    <Link
      href={href}
      className={`group relative flex min-h-11 items-center gap-3 rounded-[1.35rem] border px-4 py-3 transition ${
        hasPendingApprovals
          ? "border-rose-300 bg-rose-50 text-rose-950 shadow-[0_16px_40px_rgba(244,63,94,0.16)] hover:border-rose-400 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:border-rose-700 dark:hover:bg-rose-950/55"
          : hasUnreadNotifications
            ? "border-cyan-200 bg-cyan-50/80 text-slate-950 shadow-[0_16px_40px_rgba(34,211,238,0.14)] hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/35 dark:text-white dark:hover:border-cyan-700 dark:hover:bg-cyan-950/50"
            : "border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
      }`}
    >
      <span
        className={`relative flex h-11 w-11 items-center justify-center rounded-2xl ${
          hasPendingApprovals
            ? "bg-rose-600 text-white dark:bg-rose-500"
            : hasUnreadNotifications
              ? "bg-cyan-500 text-slate-950 dark:bg-cyan-300"
              : "bg-slate-950 text-white dark:bg-slate-800"
        }`}
      >
        {hasPendingApprovals ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />
          </span>
        ) : null}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        </svg>
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-[11px] font-semibold uppercase tracking-[0.22em] ${
            hasPendingApprovals
              ? "text-rose-700 dark:text-rose-300"
              : hasUnreadNotifications
                ? "text-cyan-700 dark:text-cyan-300"
                : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Notification
        </span>
        <span className="mt-1 block truncate text-sm font-medium">{helperText}</span>
      </span>

      <span
        className={`inline-flex min-w-9 items-center justify-center rounded-full px-2.5 py-1 text-sm font-semibold ${
          hasPendingApprovals
            ? "bg-white text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-200 dark:text-rose-950 dark:ring-rose-400"
            : hasUnreadNotifications
              ? "bg-white text-cyan-700 ring-1 ring-inset ring-cyan-200 dark:bg-cyan-200 dark:text-slate-950 dark:ring-cyan-400"
              : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
        }`}
      >
        {totalAttentionCount}
      </span>
    </Link>
  );
}
