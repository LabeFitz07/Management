import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import {
  getCurrentUserNotifications,
  getUnreadNotificationCount,
  type NotificationRecord,
} from "@/lib/notification-store";
import { formatTaskDateTime } from "@/lib/task-ui";
import { logout } from "../auth-actions";
import { markAllNotificationsAsRead } from "../notification-actions";

const NOTIFICATION_TYPE_META: Record<
  NotificationRecord["type"],
  { badgeClass: string; label: string }
> = {
  task_assigned: {
    badgeClass: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    label: "Assigned",
  },
  task_submitted: {
    badgeClass: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    label: "Review Needed",
  },
  task_approved: {
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    label: "Approved",
  },
  task_changes_requested: {
    badgeClass: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    label: "Changes Requested",
  },
};

function getBackHref(roles: string[]) {
  return roles.includes("admin") || roles.includes("hr") ? "/dashboard" : "/staff";
}

function getNotificationHref(notification: NotificationRecord, roles: string[]) {
  const baseHref = getBackHref(roles);

  if (!notification.taskId) {
    return baseHref;
  }

  return roles.includes("admin") || roles.includes("hr")
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
  const backHref = getBackHref(accessProfile.roles);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#e0f2fe_48%,_#ecfdf5_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
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

        <section className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Updates
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Recent activity</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                {unreadCount} unread
              </span>
              {unreadCount > 0 ? (
                <form action={markAllNotificationsAsRead}>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                  >
                    Mark All Read
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 px-5 py-5 lg:px-7">
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <h3 className="text-lg font-semibold text-slate-950">No notifications yet</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Task assignments, submissions, approvals, and change requests will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-3xl border p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)] ${
                    notification.isRead ? "border-slate-200 bg-white" : "border-cyan-200 bg-cyan-50/40"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-lg font-semibold text-slate-950">
                          {notification.title}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${NOTIFICATION_TYPE_META[notification.type].badgeClass}`}
                        >
                          {NOTIFICATION_TYPE_META[notification.type].label}
                        </span>
                        {!notification.isRead ? (
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                            Unread
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {notification.body || "Open the related task to see the latest workflow details."}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">
                        {formatTaskDateTime(notification.createdAt)}
                      </p>
                    </div>

                    <Link
                      href={getNotificationHref(notification, accessProfile.roles)}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                    >
                      Open Task
                    </Link>
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
