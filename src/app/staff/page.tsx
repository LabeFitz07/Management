import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getUnreadNotificationCount } from "@/lib/notification-store";
import {
  getAssignedTasksForUser,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "@/lib/task-store";
import {
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  formatTaskDateTime,
  getTaskDueClass,
  getTaskDueLabel,
  getTaskWorkSortValue,
  isTaskOverdue,
} from "@/lib/task-ui";
import { logout } from "../auth-actions";
import { updateTaskStatus } from "../task-actions";

type StaffPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

const METRIC_TONE_CLASS = {
  slate: "border-slate-200 bg-white text-slate-950",
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
} as const;

function isTaskStatus(value: string | undefined): value is TaskStatus {
  return Boolean(value && TASK_STATUSES.includes(value as TaskStatus));
}

function StaffMetric({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: keyof typeof METRIC_TONE_CLASS;
  value: number;
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

function ProgressActions({ task }: { task: Task }) {
  if (task.status === "submitted" || task.status === "approved") {
    return null;
  }

  const canSetInProgress = task.status !== "in_progress";
  const canSetTodo = task.status !== "todo";

  return (
    <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto]">
      {canSetInProgress ? (
        <form action={updateTaskStatus}>
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="status" value="in_progress" />
          <button
            type="submit"
            className="min-h-12 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            {task.status === "changes_requested" ? "Resume Task" : "Start Task"}
          </button>
        </form>
      ) : (
        <Link
          href={`/staff/tasks/${task.id}`}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Continue Work
        </Link>
      )}

      <div className="grid grid-cols-1 gap-2 sm:flex">
        {canSetTodo ? (
          <form action={updateTaskStatus}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="status" value="todo" />
            <button
              type="submit"
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              Move to To Do
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const taskIsOverdue = isTaskOverdue(task);

  return (
    <article
      className={`rounded-3xl border bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.07)] ${
        taskIsOverdue ? "border-red-200" : "border-slate-200"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-semibold text-slate-950">{task.title}</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${TASK_PRIORITY_META[task.priority].className}`}
            >
              {TASK_PRIORITY_META[task.priority].label}
            </span>
          </div>
          {task.description ? (
            <p className="mt-2 break-words text-sm leading-6 text-slate-600">{task.description}</p>
          ) : null}
          <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
            <p>Reviewer {task.reviewerName}</p>
            {task.submittedAt ? <p>Latest submission {formatTaskDateTime(task.submittedAt)}</p> : null}
            {task.approvedAt ? <p>Approved {formatTaskDateTime(task.approvedAt)}</p> : null}
          </div>
        </div>
        <Link
          href={`/staff/tasks/${task.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
        >
          Open Workspace
        </Link>
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

      {task.status === "submitted" ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your work has been submitted and is waiting for reviewer approval.
        </div>
      ) : null}

      {task.status === "approved" ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          This task was approved. Open the workspace to review the final record and attachments.
        </div>
      ) : null}

      {task.status === "changes_requested" ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          The reviewer requested revisions. Open the workspace, check the feedback, then resubmit.
        </div>
      ) : null}

      <ProgressActions task={task} />
    </article>
  );
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/");
  }

  if (accessProfile.roles.includes("admin") || accessProfile.roles.includes("hr")) {
    redirect("/dashboard");
  }

  const [taskResult, notificationResult] = await Promise.allSettled([
    getAssignedTasksForUser(accessProfile.userId),
    getUnreadNotificationCount(),
  ]);

  const tasks = taskResult.status === "fulfilled" ? taskResult.value : [];
  const unreadNotifications = notificationResult.status === "fulfilled" ? notificationResult.value : 0;
  const taskLoadError =
    taskResult.status === "rejected"
      ? taskResult.reason instanceof Error
        ? taskResult.reason.message
        : String(taskResult.reason)
      : null;

  const params = (await searchParams) ?? {};
  const selectedStatus = isTaskStatus(params.status) ? params.status : "all";
  const filteredTasks =
    selectedStatus === "all" ? tasks : tasks.filter((task) => task.status === selectedStatus);
  const sortedTasks = [...filteredTasks].sort((left, right) => getTaskWorkSortValue(left) - getTaskWorkSortValue(right));
  const activeCount = tasks.filter(
    (task) => task.status === "in_progress" || task.status === "changes_requested",
  ).length;
  const awaitingReviewCount = tasks.filter((task) => task.status === "submitted").length;
  const approvedCount = tasks.filter((task) => task.status === "approved").length;
  const overdueCount = tasks.filter(isTaskOverdue).length;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#e0f2fe_48%,_#ecfdf5_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] lg:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Field Workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                My Task Queue
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {accessProfile.fullName} signed in and ready to submit work for review.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/notifications"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15"
              >
                Notifications
                <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-xs font-semibold text-slate-950">
                  {unreadNotifications}
                </span>
              </Link>
              <Link
                href="/account"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15"
              >
                My Account
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

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaffMetric detail="assigned to you" label="Assigned" tone="slate" value={tasks.length} />
          <StaffMetric detail="active or rework" label="Working" tone="blue" value={activeCount} />
          <StaffMetric
            detail="waiting on reviewer"
            label="Awaiting Review"
            tone="amber"
            value={awaitingReviewCount}
          />
          <StaffMetric detail={`${overdueCount} overdue`} label="Approved" tone="emerald" value={approvedCount} />
        </section>

        {taskLoadError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Task storage is not ready yet. Ask the admin to apply the updated Supabase schema.
            Backend error: {taskLoadError}
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Work Queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Assigned to me</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/staff"
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
                  href={`/staff?status=${status}`}
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

          <div className="px-5 py-5 lg:px-7">
            {sortedTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <h3 className="text-lg font-semibold text-slate-950">No tasks in this view</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {tasks.length === 0
                    ? "New work appears here after an admin or HR reviewer assigns it to your account."
                    : "Switch filters to review another workflow state."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {sortedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
