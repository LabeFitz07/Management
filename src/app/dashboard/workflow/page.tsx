import Link from "next/link";
import { approveTaskSubmissionFromWorkflow, cancelTask, createTask, updateTask } from "@/app/task-actions";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getDepartments, getManagedDepartmentIdsForUser } from "@/lib/department-store";
import { isDepartmentAdminRole } from "@/lib/roles";
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
  getTaskDueClass,
  getTaskDueLabel,
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  formatTaskDateTime,
  isTaskOverdue,
} from "@/lib/task-ui";
import { TaskForm } from "../task-form";

type DashboardWorkflowPageProps = {
  searchParams?: Promise<{
    add?: string;
    edit?: string;
    status?: string;
    upload?: string;
    error?: string;
  }>;
};

function isTaskStatus(value: string | undefined): value is TaskStatus {
  return Boolean(value && TASK_STATUSES.includes(value as TaskStatus));
}

function getInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "TM";
}

function TaskRow({
  task,
  pendingSubmissionId,
}: {
  task: Task;
  pendingSubmissionId?: string;
}) {
  const cardBorderClass = isTaskOverdue(task) ? "border-red-200 dark:border-red-900" : "border-slate-200 dark:border-slate-800";
  const primaryLabel =
    task.status === "submitted"
      ? "Review Submission"
      : task.status === "approved"
        ? "Open Record"
        : "Open Task";
  const canEdit = task.status === "todo";
  const canCancel = task.status === "todo";
  const canApprove = task.status === "submitted" && Boolean(pendingSubmissionId);

  return (
    <article className={`rounded-[2rem] border bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] dark:bg-slate-950/80 ${cardBorderClass}`}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] bg-slate-950 text-base font-semibold text-white">
            {getInitials(task.assigneeName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words text-xl font-semibold text-slate-950 dark:text-white">{task.title}</h3>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TASK_PRIORITY_META[task.priority].className}`}>
                {TASK_PRIORITY_META[task.priority].label}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TASK_STATUS_META[task.status].badgeClass}`}>
                {TASK_STATUS_META[task.status].label}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getTaskDueClass(task)}`}>
                {getTaskDueLabel(task)}
              </span>
            </div>

            {task.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">{task.description}</p>
            ) : null}

            <div className="mt-4 grid gap-2 text-sm text-slate-500 dark:text-slate-400 md:grid-cols-2 xl:grid-cols-4">
              <span>Assigned to {task.assigneeName}</span>
              <span>Reviewer {task.reviewerName}</span>
              {task.submittedAt ? <span>Last submitted {formatTaskDateTime(task.submittedAt)}</span> : <span>No submission yet</span>}
              {task.approvedAt ? <span>Approved {formatTaskDateTime(task.approvedAt)}</span> : <span>Awaiting approval</span>}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[330px]">
          <Link
            href={`/dashboard/tasks/${task.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {primaryLabel}
          </Link>
          {canEdit ? (
            <Link
              href={`/dashboard/workflow?edit=${task.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
            >
              Edit
            </Link>
          ) : canApprove ? (
            <form action={approveTaskSubmissionFromWorkflow}>
              <input type="hidden" name="submissionId" value={pendingSubmissionId} />
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Approve
              </button>
            </form>
          ) : (
            <div />
          )}
          {canCancel ? (
            <form action={cancelTask}>
              <input type="hidden" name="id" value={task.id} />
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div />
          )}
        </div>
      </div>
    </article>
  );
}

function WorkflowGroup({
  title,
  description,
  tasks,
  pendingSubmissionIdByTaskId,
}: {
  title: string;
  description: string;
  tasks: Task[];
  pendingSubmissionIdByTaskId: Map<string, string>;
}) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <span className="w-fit rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          {tasks.length} tasks
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
            Nothing here yet.
          </div>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              pendingSubmissionId={pendingSubmissionIdByTaskId.get(task.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default async function DashboardWorkflowPage({ searchParams }: DashboardWorkflowPageProps) {
  const params = (await searchParams) ?? {};
  const accessProfile = await getCurrentUserAccessProfile();
  const isDepartmentAdmin = accessProfile ? isDepartmentAdminRole(accessProfile.roles) : false;
  const managedDepartmentIds =
    isDepartmentAdmin && accessProfile ? await getManagedDepartmentIdsForUser(accessProfile.userId).catch(() => []) : [];
  const scopedDepartments = await getDepartments(isDepartmentAdmin ? managedDepartmentIds : undefined).catch(() => []);
  const visibleDepartments = scopedDepartments.map((department) => department.name);
  const selectedStatus = isTaskStatus(params.status) ? params.status : "all";
  const isAddMode = params.add === "1";
  const hasInvalidUpload = params.upload === "invalid";
  const hasUnauthorizedError = params.error === "unauthorized";

  const [taskResult, staffResult, reviewerResult] = await Promise.allSettled([
    getManagedTasks(isDepartmentAdmin ? visibleDepartments : undefined),
    getAssignableStaffUsers(isDepartmentAdmin ? visibleDepartments : undefined),
    getTaskReviewerUsers(isDepartmentAdmin && accessProfile ? [accessProfile.userId] : undefined),
  ]);

  const tasks = taskResult.status === "fulfilled" ? taskResult.value : [];
  const staffUsers = staffResult.status === "fulfilled" ? staffResult.value : [];
  const reviewerUsers = reviewerResult.status === "fulfilled" ? reviewerResult.value : [];
  const taskLoadError =
    taskResult.status === "rejected"
      ? taskResult.reason instanceof Error
        ? taskResult.reason.message
        : String(taskResult.reason)
      : null;
  const staffLoadError =
    staffResult.status === "rejected"
      ? staffResult.reason instanceof Error
        ? staffResult.reason.message
        : String(staffResult.reason)
      : null;
  const reviewerLoadError =
    reviewerResult.status === "rejected"
      ? reviewerResult.reason instanceof Error
        ? reviewerResult.reason.message
        : String(reviewerResult.reason)
      : null;

  const filteredTasks = selectedStatus === "all" ? tasks : tasks.filter((task) => task.status === selectedStatus);
  const groupedTasks = TASK_STATUSES.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status),
  }));
  const submittedTasks = tasks.filter((task) => task.status === "submitted");
  const submittedTaskDetails = await Promise.all(
    submittedTasks.map(
      async (task) =>
        [task.id, await getTaskDetailById(task.id, isDepartmentAdmin ? visibleDepartments : undefined).catch(() => null)] as const,
    ),
  );
  const pendingSubmissionIdByTaskId = new Map(
    submittedTaskDetails
      .map(([taskId, detail]) => {
        const pendingSubmission = detail?.submissions.find((submission) => submission.reviewStatus === "submitted");
        return pendingSubmission ? ([taskId, pendingSubmission.id] as const) : null;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry)),
  );
  const taskToEdit = tasks.find((task) => task.id === params.edit) ?? null;
  const editTaskDetail = taskToEdit
    ? await getTaskDetailById(taskToEdit.id, isDepartmentAdmin ? visibleDepartments : undefined).catch(() => null)
    : null;
  const isFormOpen = isAddMode || Boolean(taskToEdit);

  return (
    <div className="flex flex-col gap-6">
      {staffUsers.length === 0 && !staffLoadError ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          No staff accounts are ready for assignment. Create staff accounts first, then assign work.
        </section>
      ) : null}

      {reviewerUsers.length === 0 && !reviewerLoadError ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          No active reviewers are available yet. At least one admin or HR account should be active before assigning review-based work.
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
          Task storage is not ready yet. Apply the updated Supabase schema, then refresh the dashboard. Backend error: {taskLoadError}
        </section>
      ) : null}

      {hasInvalidUpload ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Reference file upload failed. Use up to 5 supported files under 25 MB each.
        </section>
      ) : null}

      {hasUnauthorizedError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
          You can only manage tasks for staff inside your department.
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Workflow</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Review Pipeline</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {isDepartmentAdmin
                ? "Assign and review tasks for staff inside your department."
                : "A calmer review list that is easier to scan than a crowded board."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/workflow?add=1"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Assign Task
            </Link>
            <Link
              href="/dashboard/workflow"
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                selectedStatus === "all"
                  ? "bg-slate-950 text-white dark:bg-cyan-300 dark:text-slate-950"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
              }`}
            >
              All
            </Link>
            {TASK_STATUSES.map((status) => (
              <Link
                key={status}
                href={`/dashboard/workflow?status=${status}`}
                className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                  selectedStatus === status
                    ? "bg-slate-950 text-white dark:bg-cyan-300 dark:text-slate-950"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                }`}
              >
                {TASK_STATUS_META[status].label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {selectedStatus === "all" ? (
        groupedTasks.map(({ status, tasks: statusTasks }) => (
          <WorkflowGroup
            key={status}
            title={TASK_STATUS_META[status].label}
            description={TASK_STATUS_META[status].description}
            tasks={statusTasks}
            pendingSubmissionIdByTaskId={pendingSubmissionIdByTaskId}
          />
        ))
      ) : (
        <WorkflowGroup
          title={TASK_STATUS_META[selectedStatus].label}
          description={TASK_STATUS_META[selectedStatus].description}
          tasks={filteredTasks}
          pendingSubmissionIdByTaskId={pendingSubmissionIdByTaskId}
        />
      )}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-0 backdrop-blur-sm sm:items-start sm:px-6 sm:py-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)] dark:border-slate-800 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {taskToEdit ? "Edit Assignment" : "New Assignment"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {taskToEdit ? taskToEdit.title : "Assign a task"}
                </h2>
              </div>
              <Link
                href="/dashboard/workflow"
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
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
  );
}
