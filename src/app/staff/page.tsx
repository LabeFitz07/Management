import { redirect } from "next/navigation";
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

const STATUS_META: Record<TaskStatus, { label: string; badgeClass: string }> = {
  todo: {
    label: "To Do",
    badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  },
  completed: {
    label: "Completed",
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

function TaskCard({ task }: { task: Task }) {
  const nextStatuses = TASK_STATUSES.filter((status) => status !== task.status);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold text-slate-950">{task.title}</h3>
          {task.description ? (
            <p className="mt-2 break-words text-sm leading-6 text-slate-600">{task.description}</p>
          ) : null}
        </div>
        <span
          className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_META[task.priority].className}`}
        >
          {PRIORITY_META[task.priority].label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_META[task.status].badgeClass}`}>
          {STATUS_META[task.status].label}
        </span>
        {task.dueDate ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isOverdue(task)
                ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
                : "bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-200"
            }`}
          >
            {isOverdue(task) ? "Overdue" : "Due"} {formatDate(task.dueDate)}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {nextStatuses.map((status) => (
          <form key={status} action={updateTaskStatus}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="status" value={status} />
            <button
              type="submit"
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              Mark {STATUS_META[status].label}
            </button>
          </form>
        ))}
      </div>
    </article>
  );
}

export default async function StaffPage() {
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

  const activeCount = tasks.filter((task) => task.status === "in_progress").length;
  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_48%,_#ecfeff_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur lg:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Staff Workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                My Assigned Tasks
              </h1>
              <p className="mt-2 text-sm text-slate-600">{accessProfile.fullName} signed in</p>
            </div>

            <form action={logout}>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950 sm:w-auto"
              >
                Logout
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Assigned</p>
            <p className="mt-3 text-3xl font-semibold">{tasks.length}</p>
          </article>
          <article className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active</p>
            <p className="mt-3 text-3xl font-semibold">{activeCount}</p>
          </article>
          <article className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Overdue</p>
            <p className="mt-3 text-3xl font-semibold">{overdueCount}</p>
          </article>
        </section>

        {taskLoadError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Task storage is not ready yet. Ask the admin to apply the updated Supabase schema.
            Backend error: {taskLoadError}
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-5 py-5 lg:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Work Queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Assigned to me</h2>
          </div>

          <div className="px-5 py-5 lg:px-7">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <h3 className="text-lg font-semibold text-slate-950">No assigned tasks yet</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  New work appears here after an admin assigns it to your account.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tasks.map((task) => (
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
