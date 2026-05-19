import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getStaffAccountSummaries,
  type StaffAccountSummary,
} from "@/lib/account-store";
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

const METRIC_TONE_CLASS = {
  slate: "border-slate-200 bg-white text-slate-950",
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
  red: "border-red-200 bg-red-50 text-red-950",
} as const;

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

function isDueToday(task: Task) {
  if (!task.dueDate || task.status === "completed") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.dueDate}T00:00:00`).getTime() === today.getTime();
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

function getInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join("");

  return initials || "ST";
}

function formatOptionalDate(date: string) {
  if (!date) {
    return "Not set";
  }

  return formatDate(date);
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

function StaffAccountCard({ staffAccount }: { staffAccount: StaffAccountSummary }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-sm font-semibold text-white">
          {staffAccount.profileImageUrl ? (
            // Supabase public URLs are not configured for next/image in this project.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={staffAccount.profileImageUrl}
              alt={`${staffAccount.fullName} profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(staffAccount.fullName)
          )}
        </div>
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
          href={`/dashboard?add=1`}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 sm:min-w-28"
        >
          Assign Task
        </Link>
      </div>
    </article>
  );
}

function TaskCard({ task }: { task: Task }) {
  const availableStatuses = TASK_STATUSES.filter((status) => status !== task.status);
  const taskIsOverdue = isOverdue(task);

  return (
    <article
      className={`rounded-3xl border bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] ${
        taskIsOverdue ? "border-red-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-semibold text-white">
          {getInitials(task.assigneeName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold text-slate-950">{task.title}</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_META[task.priority].className}`}
            >
              {PRIORITY_META[task.priority].label}
            </span>
          </div>
          {task.description ? (
            <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-slate-600">
              {task.description}
            </p>
          ) : null}
          <p className="mt-3 break-words text-xs font-medium text-slate-500">
            Assigned to {task.assigneeName}
            {task.assigneeEmail ? ` (${task.assigneeEmail})` : ""}
          </p>
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

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {availableStatuses.map((status) => (
          <form key={status} action={updateTaskStatus}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="status" value={status} />
            <button
              type="submit"
              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              {STATUS_META[status].action}
            </button>
          </form>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <Link
          href={`/dashboard?edit=${task.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
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
  let staffAccounts: StaffAccountSummary[] = [];
  let taskLoadError: string | null = null;
  let staffLoadError: string | null = null;
  let staffAccountsLoadError: string | null = null;

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

  try {
    staffAccounts = await getStaffAccountSummaries();
  } catch (error) {
    staffAccountsLoadError = error instanceof Error ? error.message : String(error);
  }

  const filteredTasks =
    selectedStatus === "all" ? tasks : tasks.filter((task) => task.status === selectedStatus);
  const taskToEdit = tasks.find((task) => task.id === params.edit) ?? null;
  const isFormOpen = isAddMode || Boolean(taskToEdit);
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const todoCount = tasks.filter((task) => task.status === "todo").length;
  const overdueCount = tasks.filter(isOverdue).length;
  const dueTodayCount = tasks.filter(isDueToday).length;
  const completionRate = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  const displayName = accessProfile.fullName;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#e0f2fe_48%,_#ecfdf5_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Field Command
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Admin Task Board
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {displayName} signed in as admin
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/account"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15"
              >
                My Account
              </Link>
              <Link
                href="/dashboard?add=1"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              >
                Assign Task
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            detail="staff ready"
            label="Staff"
            tone="slate"
            value={staffAccounts.length}
          />
          <MetricCard detail={`${todoCount} queued`} label="Total Tasks" tone="blue" value={tasks.length} />
          <MetricCard detail="in progress" label="Active" tone="emerald" value={inProgressCount} />
          <MetricCard detail={`${dueTodayCount} due today`} label="Overdue" tone="red" value={overdueCount} />
          <MetricCard detail="finished" label="Complete" tone="amber" value={`${completionRate}%`} />
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

        <section className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Accounts
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Staff Account Directory</h2>
            </div>
            <span className="w-fit rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              {staffAccounts.length} staff
            </span>
          </div>

          <div className="space-y-3 px-5 py-5 lg:px-7">
            {staffAccountsLoadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
                Staff account directory could not be loaded. Backend error: {staffAccountsLoadError}
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
              <h2 className="mt-2 text-2xl font-semibold">Assignment Board</h2>
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
