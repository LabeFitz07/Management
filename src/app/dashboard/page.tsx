import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import {
  getAdminTasks,
  getAssignableStaffUsers,
  TASK_STATUSES,
  type AssignableStaffUser,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/task-store";
import { logout } from "../auth-actions";
import { createTask, deleteTask, updateTask, updateTaskStatus } from "../task-actions";
import { TaskForm } from "./task-form";

type DashboardPageProps = {
  searchParams?: Promise<{
    add?: string;
    edit?: string;
    status?: string;
  }>;
};

const STATUS_META: Record<
  TaskStatus,
  {
    label: string;
    action: string;
    columnClass: string;
    badgeClass: string;
  }
> = {
  todo: {
    label: "To Do",
    action: "Move to To Do",
    columnClass: "border-slate-200 bg-slate-50",
    badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  },
  in_progress: {
    label: "In Progress",
    action: "Start Progress",
    columnClass: "border-blue-200 bg-blue-50",
    badgeClass: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  },
  completed: {
    label: "Completed",
    action: "Complete",
    columnClass: "border-emerald-200 bg-emerald-50",
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

function isTaskStatus(value: string | undefined): value is TaskStatus {
  return Boolean(value && TASK_STATUSES.includes(value as TaskStatus));
}

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
  const availableStatuses = TASK_STATUSES.filter((status) => status !== task.status);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-slate-950">{task.title}</h3>
          {task.description ? (
            <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-slate-600">
              {task.description}
            </p>
          ) : null}
          <p className="mt-3 text-xs font-medium text-slate-500">
            Assigned to {task.assigneeName}
            {task.assigneeEmail ? ` (${task.assigneeEmail})` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_META[task.priority].className}`}>
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

      <div className="mt-4 flex flex-wrap gap-2">
        {availableStatuses.map((status) => (
          <form key={status} action={updateTaskStatus}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="status" value={status} />
            <button
              type="submit"
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              {STATUS_META[status].action}
            </button>
          </form>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <Link
          href={`/dashboard?edit=${task.id}`}
          className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Edit
        </Link>
        <form action={deleteTask}>
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Delete
          </button>
        </form>
      </div>
    </article>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/");
  }

  if (!accessProfile.roles.includes("admin")) {
    redirect("/staff");
  }

  const params = (await searchParams) ?? {};
  const selectedStatus = isTaskStatus(params.status) ? params.status : "all";
  const isAddMode = params.add === "1";
  let tasks: Task[] = [];
  let staffUsers: AssignableStaffUser[] = [];
  let taskLoadError: string | null = null;
  let staffLoadError: string | null = null;

  try {
    tasks = await getAdminTasks();
  } catch (error) {
    taskLoadError = error instanceof Error ? error.message : String(error);
  }

  try {
    staffUsers = await getAssignableStaffUsers();
  } catch (error) {
    staffLoadError = error instanceof Error ? error.message : String(error);
  }

  const filteredTasks =
    selectedStatus === "all" ? tasks : tasks.filter((task) => task.status === selectedStatus);
  const taskToEdit = tasks.find((task) => task.id === params.edit) ?? null;
  const isFormOpen = isAddMode || Boolean(taskToEdit);
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const overdueCount = tasks.filter(isOverdue).length;
  const completionRate = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  const displayName = accessProfile.fullName;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_48%,_#ecfeff_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Fitz Task Manager
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Admin Task Assignment
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {displayName} signed in as admin
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/dashboard?add=1"
                className="inline-flex items-center justify-center rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Assign Task
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950 sm:w-auto"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total</p>
            <p className="mt-3 text-3xl font-semibold">{tasks.length}</p>
          </article>
          <article className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active</p>
            <p className="mt-3 text-3xl font-semibold">{inProgressCount}</p>
          </article>
          <article className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Overdue</p>
            <p className="mt-3 text-3xl font-semibold">{overdueCount}</p>
          </article>
          <article className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Complete</p>
            <p className="mt-3 text-3xl font-semibold">{completionRate}%</p>
          </article>
        </section>

        {staffUsers.length === 0 && !staffLoadError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            No staff accounts are ready for assignment. Create staff accounts first, then assign
            tasks from this admin dashboard.
          </section>
        ) : null}

        {staffLoadError ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
            Staff accounts could not be loaded. Backend error: {staffLoadError}
          </section>
        ) : null}

        {taskLoadError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Task storage is not ready yet. Apply the updated Supabase schema, then refresh the
            dashboard. Backend error: {taskLoadError}
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Workflow
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Assignment Board</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className={`rounded-full px-4 py-2 text-sm font-medium ${
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
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
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

          {filteredTasks.length === 0 ? (
            <div className="px-5 py-12 text-center lg:px-7">
              <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                <h3 className="text-lg font-semibold text-slate-950">No tasks here yet</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Assign a task to a staff member or switch filters to review another status.
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
            <div className="grid gap-4 px-5 py-5 lg:grid-cols-3 lg:px-7">
              {TASK_STATUSES.map((status) => {
                const columnTasks = filteredTasks.filter((task) => task.status === status);

                return (
                  <section
                    key={status}
                    className={`min-h-72 rounded-2xl border p-4 ${STATUS_META[status].columnClass}`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-950">{STATUS_META[status].label}</h3>
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
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
            <div className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)]">
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
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950"
                >
                  Close
                </Link>
              </div>

              <div className="px-6 py-6">
                <TaskForm
                  action={taskToEdit ? updateTask : createTask}
                  isTaskStorageReady={!taskLoadError}
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
