import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import {
  getCurrentUserNotifications,
  getUnreadNotificationCount,
  type NotificationRecord,
} from "@/lib/notification-store";
import { getPendingStaffApprovalCountForAccess } from "@/lib/staff-approval-alerts";
import { canAccessDashboard, isManagerRole } from "@/lib/roles";
import { formatTaskDateTime } from "@/lib/task-ui";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { logout } from "../auth-actions";
import { markAllNotificationsAsRead, openNotificationTask } from "../notification-actions";

const NOTIFICATION_TYPE_META: Record<
  NotificationRecord["type"],
  { badgeClass: string; label: string }
> = {
  task_assigned: {
    badgeClass: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-cyan-950/60 dark:text-cyan-200 dark:ring-cyan-900",
    label: "Assigned",
  },
  task_submitted: {
    badgeClass: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
    label: "Review Needed",
  },
  task_approved: {
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    label: "Approved",
  },
  task_changes_requested: {
    badgeClass: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
    label: "Changes Requested",
  },
};

function getBackHref(roles: string[]) {
  return canAccessDashboard(roles) ? "/dashboard" : "/staff";
}

function getNotificationHref(notification: NotificationRecord, roles: string[]) {
  const baseHref = getBackHref(roles);

  if (!notification.taskId) {
    return baseHref;
  }

  return isManagerRole(roles)
    ? `/dashboard/tasks/${notification.taskId}`
    : `/staff/tasks/${notification.taskId}`;
}

export default async function NotificationsPage() {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/");
  }

  const [notifications, unreadCount] = await Promise.all([
    getCurrentUserNotifications(40),
    getUnreadNotificationCount(),
  ]);
  const pendingApprovalCount = canAccessDashboard(accessProfile.roles)
    ? await getPendingStaffApprovalCountForAccess(accessProfile).catch(() => 0)
    : 0;
  const backHref = getBackHref(accessProfile.roles);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#e0f2fe_48%,_#ecfdf5_100%)] px-4 py-6 text-slate-950 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_52%,_#082f49_100%)] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] lg:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Notifications
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Activity Inbox
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Review assignments, approvals, and change requests tied to your tasks.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ThemeToggle className="border-white/15 bg-white/10 text-white shadow-none hover:border-cyan-200 hover:bg-white/15 hover:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-cyan-400 dark:hover:bg-slate-950 dark:hover:text-cyan-300" />
              <Link
                href={backHref}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15"
              >
                Back
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15 sm:w-auto"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </section>

        {pendingApprovalCount > 0 ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50/90 p-5 shadow-[0_18px_50px_rgba(244,63,94,0.12)] backdrop-blur dark:border-rose-900 dark:bg-rose-950/35 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700 dark:text-rose-300">
                  Approval Queue
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-rose-950 dark:text-white">
                  Staff approvals need attention
                </h2>
                <p className="mt-2 text-sm leading-6 text-rose-800 dark:text-rose-200">
                  {pendingApprovalCount} pending staff signup{pendingApprovalCount === 1 ? "" : "s"} waiting for review.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white dark:bg-rose-400 dark:text-rose-950">
                  {pendingApprovalCount} waiting
                </span>
                <Link
                  href="/dashboard/staff#approval-queue"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:border-rose-700 dark:hover:bg-rose-950/70"
                >
                  Open Staff Approvals
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Updates
              </p>
              <h2 className="mt-2 text-2xl font-semibold dark:text-white">Recent activity</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-cyan-300 dark:text-slate-950">
                {unreadCount} unread
              </span>
              {unreadCount > 0 ? (
                <form action={markAllNotificationsAsRead}>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                  >
                    Mark All Read
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 px-5 py-5 lg:px-7">
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/70">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">No notifications yet</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Task assignments, submissions, approvals, and change requests will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-3xl border p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)] ${
                    notification.isRead
                      ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/80"
                      : "border-cyan-200 bg-cyan-50/40 dark:border-cyan-900 dark:bg-cyan-950/30"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-lg font-semibold text-slate-950 dark:text-white">
                          {notification.title}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${NOTIFICATION_TYPE_META[notification.type].badgeClass}`}
                        >
                          {NOTIFICATION_TYPE_META[notification.type].label}
                        </span>
                        {!notification.isRead ? (
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white dark:bg-cyan-300 dark:text-slate-950">
                            Unread
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {notification.body || "Open the related task to see the latest workflow details."}
                      </p>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatTaskDateTime(notification.createdAt)}
                      </p>
                    </div>

                    <form action={openNotificationTask}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <input
                        type="hidden"
                        name="redirectTo"
                        value={getNotificationHref(notification, accessProfile.roles)}
                      />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                      >
                        Open Task
                      </button>
                    </form>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
