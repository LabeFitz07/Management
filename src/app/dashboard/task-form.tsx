"use client";

import type { AssignableStaffUser, Task } from "@/lib/task-store";

type TaskFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  isTaskStorageReady: boolean;
  staffUsers: AssignableStaffUser[];
  taskToEdit: Task | null;
};

export function TaskForm({ action, isTaskStorageReady, staffUsers, taskToEdit }: TaskFormProps) {
  const hasStaffUsers = staffUsers.length > 0;
  const canSubmit = hasStaffUsers && isTaskStorageReady;

  return (
    <form action={action} className="space-y-5">
      {taskToEdit ? <input type="hidden" name="id" value={taskToEdit.id} /> : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Assign To</span>
        <select
          name="assigneeId"
          defaultValue={taskToEdit?.assigneeId ?? staffUsers[0]?.userId ?? ""}
          required
          disabled={!hasStaffUsers}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {hasStaffUsers ? null : <option value="">No staff accounts available</option>}
          {staffUsers.map((staff) => (
            <option key={staff.userId} value={staff.userId}>
              {staff.fullName}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Task Title</span>
        <input
          name="title"
          defaultValue={taskToEdit?.title}
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          placeholder="Prepare project presentation"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Description</span>
        <textarea
          name="description"
          defaultValue={taskToEdit?.description}
          rows={4}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          placeholder="Add the details, notes, or acceptance criteria for this task."
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select
            name="status"
            defaultValue={taskToEdit?.status ?? "todo"}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Priority</span>
          <select
            name="priority"
            defaultValue={taskToEdit?.priority ?? "medium"}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Due Date</span>
          <input
            type="date"
            name="dueDate"
            defaultValue={taskToEdit?.dueDate ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {taskToEdit ? "Save Assignment" : "Assign Task"}
      </button>

      {!isTaskStorageReady ? (
        <p className="text-center text-sm text-amber-700">
          Task storage is not ready yet. Apply the Supabase task schema before assigning work.
        </p>
      ) : null}
    </form>
  );
}
