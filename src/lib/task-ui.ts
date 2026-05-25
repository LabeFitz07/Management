import type { Task, TaskPriority, TaskStatus } from "./task-store";

export const TASK_STATUS_META: Record<
  TaskStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    columnClass: string;
    headerClass: string;
    accentClass: string;
    badgeClass: string;
  }
> = {
  todo: {
    label: "To Do",
    shortLabel: "Queued",
    description: "Ready to start",
    columnClass: "border-slate-200 bg-white",
    headerClass: "bg-slate-50",
    accentClass: "bg-slate-400",
    badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  },
  in_progress: {
    label: "In Progress",
    shortLabel: "Working",
    description: "Staff is actively working",
    columnClass: "border-slate-200 bg-white",
    headerClass: "bg-blue-50",
    accentClass: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  },
  submitted: {
    label: "Submitted",
    shortLabel: "Review",
    description: "Waiting for manager review",
    columnClass: "border-slate-200 bg-white",
    headerClass: "bg-amber-50",
    accentClass: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  },
  changes_requested: {
    label: "Changes Requested",
    shortLabel: "Rework",
    description: "Reviewer asked for corrections",
    columnClass: "border-slate-200 bg-white",
    headerClass: "bg-rose-50",
    accentClass: "bg-rose-500",
    badgeClass: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  },
  approved: {
    label: "Approved",
    shortLabel: "Done",
    description: "Work accepted and closed",
    columnClass: "border-slate-200 bg-white",
    headerClass: "bg-emerald-50",
    accentClass: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  },
};

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  {
    label: string;
    className: string;
  }
> = {
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

export function formatTaskDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatTaskDateTime(dateTime: string) {
  const d = new Date(dateTime);
  if (Number.isNaN(d.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function isTaskOverdue(task: Pick<Task, "dueDate" | "status">) {
  if (!task.dueDate || task.status === "approved") {
    return false;
  }

  const due = new Date(`${task.dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function isTaskDueToday(task: Pick<Task, "dueDate" | "status">) {
  if (!task.dueDate || task.status === "approved") {
    return false;
  }

  const due = new Date(`${task.dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}

export function getTaskDueLabel(task: Pick<Task, "dueDate" | "status">) {
  if (!task.dueDate) {
    return "No due date";
  }

  if (isTaskOverdue(task)) {
    return `Overdue ${formatTaskDate(task.dueDate)}`;
  }

  if (isTaskDueToday(task)) {
    return "Due today";
  }

  return `Due ${formatTaskDate(task.dueDate)}`;
}

export function getTaskDueClass(task: Pick<Task, "dueDate" | "status">) {
  if (!task.dueDate) {
    return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
  }

  if (isTaskOverdue(task)) {
    return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";
  }

  if (isTaskDueToday(task)) {
    return "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200";
  }

  return "bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-200";
}

export function getTaskWorkSortValue(task: Pick<Task, "status" | "priority" | "dueDate">) {
  const statusWeight: Record<TaskStatus, number> = {
    changes_requested: 0,
    in_progress: 1,
    todo: 2,
    submitted: 3,
    approved: 4,
  };
  const priorityWeight: Record<TaskPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  const dueTime = task.dueDate
    ? (function () {
        const d = new Date(`${task.dueDate}T00:00:00`);
        return Number.isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
      })()
    : Number.MAX_SAFE_INTEGER;

  return (
    statusWeight[task.status] * 10_000_000_000 +
    priorityWeight[task.priority] * 1_000_000_000 +
    dueTime
  );
}

export function formatTaskFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
