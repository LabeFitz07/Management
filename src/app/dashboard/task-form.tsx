"use client";

import type { ReactNode } from "react";
import type { AssignableStaffUser, Task } from "@/lib/task-store";

type TaskFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  isTaskStorageReady: boolean;
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

export function TaskForm({ action, isTaskStorageReady, staffUsers, taskToEdit }: TaskFormProps) {
  const hasStaffUsers = staffUsers.length > 0;
  const canSubmit = hasStaffUsers && isTaskStorageReady;

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
                  {staff.fullName}
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
          <Field label="Status">
            <select
              name="status"
              defaultValue={taskToEdit?.status ?? "todo"}
              className={inputClassName}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
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
      </div>
    </form>
  );
}
