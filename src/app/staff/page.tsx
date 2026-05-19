import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import {
  getAssignedTasksForUser,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/task-store";
import { logout } from "../auth-actions";
import { updateTaskStatus } from "../task-actions";

type StaffPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

const STATUS_META: Record<TaskStatus, { label: string; action: string; badgeClass: string }> = {
  todo: {
    label: "To Do",
    action: "Move to To Do",
    badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  },
  in_progress: {
    label: "In Progress",
    action: "Start Task",
    badgeClass: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  },
  completed: {
    label: "Completed",
    action: "Complete Task",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  },
};

const PRIORITY_META: Record<TaskPriority, { label: string; className: string }> = {
  low: {
    label: "Low",
    className: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  },
  medium: {
    label: "Medium",
    className: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  },
  high: {
    label: "High",
    className: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  },
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.status === "completed") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.dueDate}T00:00:00`) < today;
}

function isDueToday(task: Task) {
  if (!task.dueDate || task.status === "completed") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.dueDate}T00:00:00`).getTime() === today.getTime();
}

function isTaskStatus(value: string | undefined): value is TaskStatus {
  return Boolean(value && TASK_STATUSES.includes(value as TaskStatus));
}

function getDueLabel(task: Task) {
  if (!task.dueDate) {
    return "No due date";
  }

  if (isOverdue(task)) {
    return `Overdue ${formatDate(task.dueDate)}`;
  }

  if (isDueToday(task)) {
    return "Due today";
  }

  return `Due ${formatDate(task.dueDate)}`;
}

function getDueClass(task: Task) {
  if (!task.dueDate) {
    return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
  }

  if (isOverdue(task)) {
    return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";
  }

  if (isDueToday(task)) {
    return "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200";
  }

  return "bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-200";
}

function getPrimaryNextStatus(task: Task): TaskStatus {
  if (task.status === "todo") {
    return "in_progress";
  }

  if (task.status === "in_progress") {
    return "completed";
  }

  return "todo";
}

function getWorkSortValue(task: Task) {
  const statusWeight: Record<TaskStatus, number> = {
    in_progress: 0,
    todo: 1,
    completed: 3,
  };
  const priorityWeight: Record<TaskPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  const dueTime = task.dueDate
    ? new Date(`${task.dueDate}T00:00:00`).getTime()
    : Number.MAX_SAFE_INTEGER;

  return (
    statusWeight[task.status] * 10_000_000_000 +
    priorityWeight[task.priority] * 1_000_000_000 +
    dueTime
  );
}

function StaffMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "blue" | "amber" | "red";
}) {
  const toneClass = {
    slate: "border-slate-200 bg-white text-slate-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-950",
  }[tone];

  return (
    <article className={`rounded-3xl border p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-65">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
    </article>
  );
}

function TaskCard({ task }: { task: Task }) {
  const nextStatuses = TASK_STATUSES.filter((status) => status !== task.status);
  const primaryNextStatus = getPrimaryNextStatus(task);
  const secondaryStatuses = nextStatuses.filter((status) => status !== primaryNextStatus);
  const taskIsOverdue = isOverdue(task);

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
              className={`rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_META[task.priority].className}`}
            >
              {PRIORITY_META[task.priority].label}
            </span>
          </div>
          {task.description ? (
            <p className="mt-2 break-words text-sm leading-6 text-slate-600">{task.description}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_META[task.status].badgeClass}`}>
          {STATUS_META[task.status].label}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDueClass(task)}`}>
          {getDueLabel(task)}
        </span>
      </div>

      <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto]">
        <form action={updateTaskStatus}>
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="status" value={primaryNextStatus} />
          <button
            type="submit"
            className="min-h-12 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            {STATUS_META[primaryNextStatus].action}
          </button>
        </form>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          {secondaryStatuses.map((status) => (
            <form key={status} action={updateTaskStatus}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                {STATUS_META[status].label}
              </button>
            </form>
          ))}
        </div>
      </div>
    </article>
  );
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/");
  }

  if (accessProfile.roles.includes("admin")) {
    redirect("/dashboard");
  }

  let tasks: Task[] = [];
  let taskLoadError: string | null = null;

  try {
    tasks = await getAssignedTasksForUser(accessProfile.userId);
  } catch (error) {
    taskLoadError = error instanceof Error ? error.message : String(error);
  }

  const params = (await searchParams) ?? {};
  const selectedStatus = isTaskStatus(params.status) ? params.status : "all";
  const filteredTasks =
    selectedStatus === "all" ? tasks : tasks.filter((task) => task.status === selectedStatus);
  const sortedTasks = [...filteredTasks].sort((a, b) => getWorkSortValue(a) - getWorkSortValue(b));
  const activeCount = tasks.filter((task) => task.status === "in_progress").length;
  const overdueCount = tasks.filter(isOverdue).length;
  const dueTodayCount = tasks.filter(isDueToday).length;

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
              <p className="mt-2 text-sm text-slate-300">{accessProfile.fullName} signed in</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <StaffMetric label="Assigned" tone="slate" value={tasks.length} />
          <StaffMetric label="Active" tone="blue" value={activeCount} />
          <StaffMetric label="Due Today" tone="amber" value={dueTodayCount} />
          <StaffMetric label="Overdue" tone="red" value={overdueCount} />
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
                  {STATUS_META[status].label}
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
                    ? "New work appears here after an admin assigns it to your account."
                    : "Switch filters to review another status."}
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
