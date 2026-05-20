import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentAccountProfile,
  getStaffAccountSummaries,
  type StaffAccountSummary,
} from "@/lib/account-store";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getUnreadNotificationCount } from "@/lib/notification-store";
import {
  getManagedTasks,
  getTaskDetailById,
  getAssignableStaffUsers,
  getTaskReviewerUsers,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "@/lib/task-store";
import {
  TASK_STATUS_META,
  TASK_PRIORITY_META,
  formatTaskDate,
  formatTaskDateTime,
  getTaskDueClass,
  getTaskDueLabel,
  isTaskDueToday,
  isTaskOverdue,
} from "@/lib/task-ui";
import { logout } from "../auth-actions";
import { createTask, deleteTask, updateTask } from "../task-actions";
import { TaskForm } from "./task-form";

type DashboardPageProps = {
  searchParams?: Promise<{
    add?: string;
    edit?: string;
    status?: string;
    upload?: string;
  }>;
};

const METRIC_TONE_CLASS = {
  slate: "border-slate-200 bg-white text-slate-950",
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
  rose: "border-rose-200 bg-rose-50 text-rose-950",
} as const;

function isTaskStatus(value: string | undefined): value is TaskStatus {
  return Boolean(value && TASK_STATUSES.includes(value as TaskStatus));
}

function getInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join("");

  return initials || "TM";
}

function formatOptionalDate(date: string) {
  if (!date) {
    return "Not set";
  }

  return formatTaskDate(date);
}

function getManagerRoleLabel(roles: string[]) {
  return roles.includes("admin") ? "Admin" : "HR";
}

function MetricCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: keyof typeof METRIC_TONE_CLASS;
  value: string | number;
}) {
  return (
    <article
      className={`rounded-3xl border p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] ${METRIC_TONE_CLASS[tone]}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-65">
        {label}
      </p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="max-w-28 text-right text-xs leading-5 opacity-70">{detail}</p>
      </div>
    </article>
  );
}

function ProfileAvatar({
  fullName,
  profileImageUrl,
  className,
  fallbackClassName = "text-sm",
}: {
  fullName: string;
  profileImageUrl: string;
  className: string;
  fallbackClassName?: string;
}) {
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center overflow-hidden bg-slate-950 font-semibold text-white`}
    >
      {profileImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profileImageUrl} alt={`${fullName} profile`} className="h-full w-full object-cover" />
      ) : (
        <span className={fallbackClassName}>{getInitials(fullName)}</span>
      )}
    </div>
  );
}

function StaffAccountCard({ staffAccount }: { staffAccount: StaffAccountSummary }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-4">
        <ProfileAvatar
          fullName={staffAccount.fullName}
          profileImageUrl={staffAccount.profileImageUrl}
          className="h-16 w-16 rounded-2xl border border-slate-200"
          fallbackClassName="text-sm"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold text-slate-950">
              {staffAccount.fullName}
            </h3>
            {staffAccount.employeeId ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                {staffAccount.employeeId}
              </span>
            ) : null}
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              {staffAccount.status || "Active"}
            </span>
          </div>
          <p className="mt-2 break-words text-sm font-medium text-slate-700">
            {staffAccount.jobTitle || "Staff"} {staffAccount.department ? `| ${staffAccount.department}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-slate-500">
            <span>{staffAccount.email}</span>
            {staffAccount.phone ? <span>{staffAccount.phone}</span> : null}
            <span>Started {formatOptionalDate(staffAccount.startDate)}</span>
          </div>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        {staffAccount.phone ? (
          <a
            href={`tel:${staffAccount.phone}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
          >
            Call
          </a>
        ) : null}
        <a
          href={`mailto:${staffAccount.email}`}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
        >
          Email
        </a>
        <Link
          href="/dashboard?add=1"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 sm:min-w-28"
        >
          Assign Task
        </Link>
      </div>
    </article>
  );
}

function TaskCard({ task }: { task: Task }) {
  const cardBorderClass = isTaskOverdue(task) ? "border-red-200" : "border-slate-200";
  const primaryLabel =
    task.status === "submitted"
      ? "Review Submission"
      : task.status === "approved"
        ? "Open Record"
        : "Open Task";

  return (
    <article className={`rounded-3xl border bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] ${cardBorderClass}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-semibold text-white">
          {getInitials(task.assigneeName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold text-slate-950">{task.title}</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TASK_PRIORITY_META[task.priority].className}`}
            >
              {TASK_PRIORITY_META[task.priority].label}
            </span>
          </div>
          {task.description ? (
            <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-slate-600">
              {task.description}
            </p>
          ) : null}
          <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
            <p>
              Assigned to {task.assigneeName}
              {task.assigneeEmail ? ` (${task.assigneeEmail})` : ""}
            </p>
            <p>
              Reviewer {task.reviewerName}
              {task.reviewerEmail ? ` (${task.reviewerEmail})` : ""}
            </p>
            {task.submittedAt ? <p>Last submitted {formatTaskDateTime(task.submittedAt)}</p> : null}
            {task.approvedAt ? <p>Approved {formatTaskDateTime(task.approvedAt)}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${TASK_STATUS_META[task.status].badgeClass}`}
        >
          {TASK_STATUS_META[task.status].label}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getTaskDueClass(task)}`}>
          {getTaskDueLabel(task)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <Link
          href={`/dashboard/tasks/${task.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          {primaryLabel}
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard?edit=${task.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
          >
            Edit
          </Link>
          <form action={deleteTask}>
            <input type="hidden" name="id" value={task.id} />
            <button
              type="submit"
              className="min-h-11 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Delete
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/");
  }

  if (!accessProfile.roles.includes("admin") && !accessProfile.roles.includes("hr")) {
    redirect("/staff");
  }

  const accountProfile = await getCurrentAccountProfile().catch(() => null);
  const params = (await searchParams) ?? {};
  const selectedStatus = isTaskStatus(params.status) ? params.status : "all";
  const isAddMode = params.add === "1";
  const hasInvalidUpload = params.upload === "invalid";

  const [taskResult, staffResult, reviewerResult, staffAccountsResult, notificationResult] =
    await Promise.allSettled([
      getManagedTasks(),
      getAssignableStaffUsers(),
      getTaskReviewerUsers(),
      getStaffAccountSummaries(),
      getUnreadNotificationCount(),
    ]);

  const tasks = taskResult.status === "fulfilled" ? taskResult.value : [];
  const staffUsers = staffResult.status === "fulfilled" ? staffResult.value : [];
  const reviewerUsers = reviewerResult.status === "fulfilled" ? reviewerResult.value : [];
  const staffAccounts = staffAccountsResult.status === "fulfilled" ? staffAccountsResult.value : [];
  const unreadNotifications = notificationResult.status === "fulfilled" ? notificationResult.value : 0;
  const taskLoadError =
    taskResult.status === "rejected" ? taskResult.reason instanceof Error ? taskResult.reason.message : String(taskResult.reason) : null;
  const staffLoadError =
    staffResult.status === "rejected" ? staffResult.reason instanceof Error ? staffResult.reason.message : String(staffResult.reason) : null;
  const reviewerLoadError =
    reviewerResult.status === "rejected"
      ? reviewerResult.reason instanceof Error
        ? reviewerResult.reason.message
        : String(reviewerResult.reason)
      : null;
  const staffAccountsLoadError =
    staffAccountsResult.status === "rejected"
      ? staffAccountsResult.reason instanceof Error
        ? staffAccountsResult.reason.message
        : String(staffAccountsResult.reason)
      : null;

  const filteredTasks =
    selectedStatus === "all" ? tasks : tasks.filter((task) => task.status === selectedStatus);
  const taskToEdit = tasks.find((task) => task.id === params.edit) ?? null;
  const editTaskDetail = taskToEdit ? await getTaskDetailById(taskToEdit.id).catch(() => null) : null;
  const isFormOpen = isAddMode || Boolean(taskToEdit);
  const inFlightCount = tasks.filter(
    (task) => task.status === "in_progress" || task.status === "changes_requested",
  ).length;
  const awaitingReviewCount = tasks.filter((task) => task.status === "submitted").length;
  const approvedCount = tasks.filter((task) => task.status === "approved").length;
  const overdueCount = tasks.filter(isTaskOverdue).length;
  const dueTodayCount = tasks.filter(isTaskDueToday).length;
  const completionRate = tasks.length === 0 ? 0 : Math.round((approvedCount / tasks.length) * 100);
  const displayName = accountProfile?.fullName || accessProfile.fullName;
  const profileImageUrl = accountProfile?.profileImageUrl || "";
  const roleLabel = getManagerRoleLabel(accessProfile.roles);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#e0f2fe_48%,_#ecfdf5_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] lg:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_center,_rgba(103,232,249,0.18),_transparent_68%)] lg:block" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Review Command
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Task Review Board
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Assign work, review staff submissions, request corrections, and approve finished tasks.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/5 px-3 py-1 text-xs font-medium text-cyan-100/90">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {displayName} is on review duty
              </div>
            </div>

            <div className="flex w-full max-w-2xl flex-col gap-4 xl:items-end">
              <div className="flex w-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-3 shadow-[0_18px_45px_rgba(8,15,40,0.32)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-[1.45rem] bg-cyan-300/25 blur-md" />
                    <ProfileAvatar
                      fullName={displayName}
                      profileImageUrl={profileImageUrl}
                      className="relative h-[4.5rem] w-[4.5rem] rounded-[1.45rem] border border-white/15 ring-2 ring-cyan-300/25"
                      fallbackClassName="text-base"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                      Signed In
                    </p>
                    <p className="mt-1 truncate text-lg font-semibold text-white sm:text-xl">
                      {displayName}
                    </p>
                    <p className="truncate text-sm text-slate-300">{accessProfile.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    {roleLabel}
                  </span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <Link
                  href="/notifications"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition-colors hover:border-cyan-200 hover:bg-white/15"
                >
                  Notifications
                  <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-xs font-semibold text-slate-950">
                    {unreadNotifications}
                  </span>
                </Link>
                <Link
                  href="/account"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition-colors hover:border-cyan-200 hover:bg-white/15"
                >
                  My Account
                </Link>
                <Link
                  href="/dashboard?add=1"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-200"
                >
                  Assign Task
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition-colors hover:border-cyan-200 hover:bg-white/15 sm:w-auto"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard detail={`${staffAccounts.length} staff`} label="Total Tasks" tone="slate" value={tasks.length} />
          <MetricCard detail="active or rework" label="In Motion" tone="blue" value={inFlightCount} />
          <MetricCard
            detail="waiting for approval"
            label="Awaiting Review"
            tone="amber"
            value={awaitingReviewCount}
          />
          <MetricCard detail={`${completionRate}% closed`} label="Approved" tone="emerald" value={approvedCount} />
          <MetricCard detail={`${dueTodayCount} due today`} label="Overdue" tone="rose" value={overdueCount} />
        </section>

        {staffUsers.length === 0 && !staffLoadError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            No staff accounts are ready for assignment. Create staff accounts first, then assign work.
          </section>
        ) : null}

        {reviewerUsers.length === 0 && !reviewerLoadError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            No active reviewers are available yet. At least one admin or HR account should be active
            before assigning review-based work.
          </section>
        ) : null}

        {staffLoadError ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
            Staff accounts could not be loaded. Backend error: {staffLoadError}
          </section>
        ) : null}

        {reviewerLoadError ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
            Reviewer accounts could not be loaded. Backend error: {reviewerLoadError}
          </section>
        ) : null}

        {taskLoadError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Task storage is not ready yet. Apply the updated Supabase schema, then refresh the
            dashboard. Backend error: {taskLoadError}
          </section>
        ) : null}

        {hasInvalidUpload ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Reference file upload failed. Use up to 5 supported files under 25 MB each.
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Accounts
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Staff Directory</h2>
            </div>
            <span className="w-fit rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              {staffAccounts.length} staff
            </span>
          </div>

          <div className="space-y-3 px-5 py-5 lg:px-7">
            {staffAccountsLoadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
                Staff directory could not be loaded. Backend error: {staffAccountsLoadError}
              </div>
            ) : staffAccounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <h3 className="text-lg font-semibold text-slate-950">No staff accounts yet</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Staff accounts appear here after signup or admin creation.
                </p>
              </div>
            ) : (
              staffAccounts.map((staffAccount) => (
                <StaffAccountCard key={staffAccount.userId} staffAccount={staffAccount} />
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Workflow
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Review Pipeline</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                  selectedStatus === "all"
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                All
              </Link>
              {TASK_STATUSES.map((status) => (
                <Link
                  key={status}
                  href={`/dashboard?status=${status}`}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                    selectedStatus === status
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  {TASK_STATUS_META[status].label}
                </Link>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="px-5 py-12 text-center lg:px-7">
              <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                <h3 className="text-lg font-semibold text-slate-950">No tasks in this view</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Assign a task to a staff member or switch filters to review another workflow state.
                </p>
                <Link
                  href="/dashboard?add=1"
                  className="mt-5 inline-flex rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Assign Task
                </Link>
              </div>
            </div>
          ) : selectedStatus === "all" ? (
            <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 lg:px-7">
              {TASK_STATUSES.map((status) => {
                const columnTasks = filteredTasks.filter((task) => task.status === status);

                return (
                  <section
                    key={status}
                    className={`min-h-72 rounded-2xl border p-4 ${TASK_STATUS_META[status].columnClass}`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-950">{TASK_STATUS_META[status].label}</h3>
                        <p className="mt-1 text-xs text-slate-500">{TASK_STATUS_META[status].description}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {columnTasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/65 px-4 py-8 text-center text-sm text-slate-500">
                          Empty
                        </div>
                      ) : (
                        columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3 lg:px-7">
              {filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>

        {isFormOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-0 backdrop-blur-sm sm:items-start sm:px-6 sm:py-6">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)] sm:max-h-[calc(100vh-3rem)] sm:rounded-3xl">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {taskToEdit ? "Edit Assignment" : "New Assignment"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    {taskToEdit ? taskToEdit.title : "Assign a task"}
                  </h2>
                </div>
                <Link
                  href="/dashboard"
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950"
                >
                  Close
                </Link>
              </div>

              <div className="px-6 py-6">
                <TaskForm
                  action={taskToEdit ? updateTask : createTask}
                  existingReferenceFiles={editTaskDetail?.referenceFiles ?? []}
                  isTaskStorageReady={!taskLoadError}
                  reviewerUsers={reviewerUsers}
                  staffUsers={staffUsers}
                  taskToEdit={taskToEdit}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
