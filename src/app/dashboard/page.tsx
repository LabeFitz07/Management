import Link from "next/link";
import { getCurrentAccountProfile, getStaffAccountSummaries } from "@/lib/account-store";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getDepartments, getManagedDepartmentIdsForUser } from "@/lib/department-store";
import { getRoles } from "@/lib/role-store";
import { getManagedTasks } from "@/lib/task-store";
import { isDepartmentAdminRole } from "@/lib/roles";
import { isTaskDueToday, isTaskOverdue } from "@/lib/task-ui";

const DASHBOARD_TIME_ZONE = "Asia/Manila";

function getCalendarDays(referenceDate: Date) {
  const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const startOffset = (startOfMonth.getDay() + 6) % 7;
  const calendarStart = new Date(startOfMonth);
  calendarStart.setDate(startOfMonth.getDate() - startOffset);

  return Array.from({ length: 35 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
        <p className="max-w-28 text-right text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
    </article>
  );
}

export default async function DashboardOverviewPage() {
  const accessProfile = await getCurrentUserAccessProfile();
  const isDepartmentAdmin = accessProfile ? isDepartmentAdminRole(accessProfile.roles) : false;
  const managedDepartmentIds =
    isDepartmentAdmin && accessProfile ? await getManagedDepartmentIdsForUser(accessProfile.userId).catch(() => []) : [];
  const departments = await getDepartments(isDepartmentAdmin ? managedDepartmentIds : undefined).catch(() => []);
  const visibleDepartmentNames = departments.map((department) => department.name);
  const [accountProfile, tasks, staffAccounts, roles] = await Promise.all([
    getCurrentAccountProfile().catch(() => null),
    getManagedTasks(isDepartmentAdmin ? visibleDepartmentNames : undefined).catch(() => []),
    getStaffAccountSummaries(isDepartmentAdmin ? visibleDepartmentNames : undefined).catch(() => []),
    isDepartmentAdmin ? Promise.resolve([]) : getRoles().catch(() => []),
  ]);

  const approvedCount = tasks.filter((task) => task.status === "approved").length;
  const awaitingReviewCount = tasks.filter((task) => task.status === "submitted").length;
  const inProgressCount = tasks.filter(
    (task) => task.status === "in_progress" || task.status === "changes_requested",
  ).length;
  const overdueCount = tasks.filter(isTaskOverdue).length;
  const dueTodayCount = tasks.filter(isTaskDueToday).length;
  const displayName = accountProfile?.fullName || accessProfile?.fullName || "Manager";
  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: DASHBOARD_TIME_ZONE,
  }).format(now);
  const weekdayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: DASHBOARD_TIME_ZONE,
  }).format(now);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: DASHBOARD_TIME_ZONE,
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DASHBOARD_TIME_ZONE,
  }).format(now);
  const calendarDays = getCalendarDays(now);
  const todayDayNumber = Number(
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      timeZone: DASHBOARD_TIME_ZONE,
    }).format(now),
  );
  const currentMonthNumber = Number(
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: DASHBOARD_TIME_ZONE,
    }).format(now),
  );
  const currentYearNumber = Number(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone: DASHBOARD_TIME_ZONE,
    }).format(now),
  );
  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] dark:border-cyan-950 dark:bg-[linear-gradient(135deg,_#020617_0%,_#082f49_55%,_#0f172a_100%)] lg:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-96 bg-[radial-gradient(circle_at_center,_rgba(103,232,249,0.18),_transparent_68%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Overview</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back, {displayName}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              {isDepartmentAdmin
                ? "This dashboard keeps the same management layout, but only shows the department and staff records you are assigned to manage."
                : "This dashboard is now split into focused pages, so workflow, staff, departments, and roles each have a clearer home."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/workflow?add=1"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
            >
              Assign Task
            </Link>
            <Link
              href="/dashboard/staff?staffModal=1"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15"
            >
              Create Staff
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Staff Accounts" value={staffAccounts.length} detail="active team members" />
        <MetricCard label="Departments" value={departments.length} detail="organizational groups" />
        <MetricCard
          label={isDepartmentAdmin ? "Your Scope" : "Roles"}
          value={isDepartmentAdmin ? visibleDepartmentNames.length : roles.length}
          detail={isDepartmentAdmin ? "managed departments" : "access definitions"}
        />
        <MetricCard
          label={isDepartmentAdmin ? "Due Today" : "In Motion"}
          value={isDepartmentAdmin ? dueTodayCount : inProgressCount}
          detail={isDepartmentAdmin ? "tasks due for your team" : "active or rework"}
        />
        <MetricCard
          label={isDepartmentAdmin ? "Review Queue" : "Awaiting Review"}
          value={awaitingReviewCount}
          detail={isDepartmentAdmin ? `${approvedCount} approved` : `${approvedCount} approved`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Schedule</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Calendar and local time</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                A simple view of today so the dashboard feels less crowded and easier to scan.
              </p>

              <div className="mt-6 rounded-[1.75rem] bg-[linear-gradient(135deg,_#0f172a_0%,_#1d4ed8_55%,_#38bdf8_100%)] p-5 text-white shadow-[0_18px_50px_rgba(37,99,235,0.22)] dark:bg-[linear-gradient(135deg,_#082f49_0%,_#0f172a_45%,_#155e75_100%)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
                  {weekdayLabel}
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-tight">{timeLabel}</p>
                <p className="mt-2 text-sm text-sky-100">{dateLabel}</p>
                <div className="mt-5 flex items-center gap-2 text-xs text-cyan-100">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                    {DASHBOARD_TIME_ZONE}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                    {dueTodayCount} due today
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950 dark:text-white">{monthLabel}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Use this as a quick planning view for your team.</p>
                </div>
                <Link
                  href="/dashboard/workflow"
                  className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                >
                  Open workflow
                </Link>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2 text-center">
                {weekdayNames.map((weekday) => (
                  <div
                    key={weekday}
                    className="rounded-2xl px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
                  >
                    {weekday}
                  </div>
                ))}
                {calendarDays.map((day) => {
                  const isCurrentMonth =
                    day.getMonth() + 1 === currentMonthNumber && day.getFullYear() === currentYearNumber;
                  const isToday =
                    isCurrentMonth && day.getDate() === todayDayNumber;

                  return (
                    <div
                      key={day.toISOString()}
                      className={[
                        "flex h-14 items-start justify-end rounded-2xl border px-3 py-2 text-sm font-medium transition",
                        isToday
                          ? "border-blue-500 bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.28)] dark:border-cyan-400 dark:bg-cyan-300 dark:text-slate-950"
                          : isCurrentMonth
                            ? "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                            : "border-transparent bg-transparent text-slate-300 dark:text-slate-700",
                      ].join(" ")}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Attention</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Today&apos;s signals</h3>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Due today</p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{dueTodayCount} tasks need same-day follow-up.</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">Overdue</p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-200">{overdueCount} tasks are behind schedule.</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Approved</p>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">{approvedCount} tasks are fully closed.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
