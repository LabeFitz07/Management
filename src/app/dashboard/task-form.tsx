import type { ReactNode } from "react";
import type { AssignableStaffUser, ReviewerUser, Task, TaskReferenceFile } from "@/lib/task-store";
import { MANAGER_ASSIGNABLE_TASK_STATUSES } from "@/lib/task-store";
import { formatTaskFileSize, TASK_STATUS_META } from "@/lib/task-ui";

type TaskFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  existingReferenceFiles: TaskReferenceFile[];
  isTaskStorageReady: boolean;
  reviewerUsers: ReviewerUser[];
  staffUsers: AssignableStaffUser[];
  taskToEdit: Task | null;
};

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500";

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function TaskForm({
  action,
  existingReferenceFiles,
  isTaskStorageReady,
  reviewerUsers,
  staffUsers,
  taskToEdit,
}: TaskFormProps) {
  const hasStaffUsers = staffUsers.length > 0;
  const hasReviewerUsers = reviewerUsers.length > 0;
  const canSubmit = hasStaffUsers && hasReviewerUsers && isTaskStorageReady;
  const canEditWorkflowStatus =
    !taskToEdit ||
    MANAGER_ASSIGNABLE_TASK_STATUSES.includes(taskToEdit.status as (typeof MANAGER_ASSIGNABLE_TASK_STATUSES)[number]);

  return (
    <form action={action} className="space-y-5">
      {taskToEdit ? <input type="hidden" name="id" value={taskToEdit.id} /> : null}

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Assignment
        </p>
        <div className="mt-4 grid gap-4">
          <Field label="Assign To">
            <select
              name="assigneeId"
              defaultValue={taskToEdit?.assigneeId ?? staffUsers[0]?.userId ?? ""}
              required
              disabled={!hasStaffUsers}
              className={inputClassName}
            >
              {hasStaffUsers ? null : <option value="">No staff accounts available</option>}
              {staffUsers.map((staff) => (
                <option key={staff.userId} value={staff.userId}>
                  {staff.fullName} {staff.email ? `(${staff.email})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reviewer">
            <select
              name="reviewerId"
              defaultValue={taskToEdit?.reviewerId ?? reviewerUsers[0]?.userId ?? ""}
              required
              disabled={!hasReviewerUsers}
              className={inputClassName}
            >
              {hasReviewerUsers ? null : <option value="">No reviewers available</option>}
              {reviewerUsers.map((reviewer) => (
                <option key={reviewer.userId} value={reviewer.userId}>
                  {reviewer.fullName} {reviewer.email ? `(${reviewer.email})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Task Title">
            <input
              name="title"
              defaultValue={taskToEdit?.title}
              required
              className={inputClassName}
              placeholder="Prepare project presentation"
            />
          </Field>

          <Field label="Description">
            <textarea
              name="description"
              defaultValue={taskToEdit?.description}
              rows={4}
              className={`${inputClassName} resize-none`}
              placeholder="Details, notes, or acceptance criteria"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Work State
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Workflow Status">
            {canEditWorkflowStatus ? (
              <select
                name="status"
                defaultValue={taskToEdit?.status ?? "todo"}
                className={inputClassName}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
              </select>
            ) : (
              <>
                <input type="hidden" name="status" value={taskToEdit?.status ?? "todo"} />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-950">
                    {TASK_STATUS_META[taskToEdit?.status ?? "todo"].label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This task is already inside the review workflow. Change its state from the
                    staff workspace or the reviewer page instead of the assignment editor.
                  </p>
                </div>
              </>
            )}
          </Field>

          <Field label="Priority">
            <select
              name="priority"
              defaultValue={taskToEdit?.priority ?? "medium"}
              className={inputClassName}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>

          <Field label="Due Date">
            <input
              type="date"
              name="dueDate"
              defaultValue={taskToEdit?.dueDate ?? ""}
              className={inputClassName}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Reference Files
        </p>
        <div className="mt-4 grid gap-4">
          {taskToEdit ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Current Assignment Files</p>
              {existingReferenceFiles.length > 0 ? (
                <div className="space-y-2">
                  {existingReferenceFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {file.originalName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {file.mimeType} | {formatTaskFileSize(file.sizeBytes)}
                        </p>
                        {file.downloadUrl ? (
                          <a
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-semibold text-blue-700 hover:text-blue-800"
                          >
                            Open current file
                          </a>
                        ) : null}
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          name="removeReferenceFileIds"
                          value={file.id}
                          className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-blue-500"
                        />
                        Remove on save
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No assignment files have been uploaded yet for this task.
                </div>
              )}
            </div>
          ) : null}

          <Field label="Admin Attachments">
            <input
              type="file"
              name="taskReferenceFiles"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.wps,.zip,.txt,.csv,.mp4,.mov,.webm"
              className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </Field>
          <p className="text-xs leading-5 text-slate-500">
            Upload papers, forms, photos, or work references that the staff member needs to open while doing this task.
            You can add up to 5 files, each under 25 MB.
            {taskToEdit
              ? " New uploads are added to the task's existing reference files, and checked files are removed after you save."
              : " These files will be visible to the assigned staff member in the task workspace."}
          </p>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-12 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {taskToEdit ? "Save Assignment" : "Assign Task"}
        </button>

        {!isTaskStorageReady ? (
          <p className="mt-3 text-center text-sm text-amber-700">
            Task storage is not ready yet. Apply the Supabase task schema before assigning work.
          </p>
        ) : null}

        {!hasReviewerUsers ? (
          <p className="mt-3 text-center text-sm text-amber-700">
            At least one active admin or HR account is required so tasks have a reviewer.
          </p>
        ) : null}

        {isTaskStorageReady ? (
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">
            {taskToEdit
              ? canEditWorkflowStatus
                ? `Current status: ${TASK_STATUS_META[taskToEdit.status].label}.`
                : "Review-phase tasks keep their workflow status here. Use the workspace and review pages for status decisions."
              : "New tasks usually start in To Do or In Progress."}
          </p>
        ) : null}
      </div>
    </form>
  );
}
