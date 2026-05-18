import { getSupabaseServerClient } from "./supabase-server";

export const TASK_STATUSES = ["todo", "in_progress", "completed"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type AssignableStaffUser = {
  userId: string;
  email: string;
  fullName: string;
};

export type Task = {
  id: string;
  assigneeId: string;
  assignedById: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assigneeName: string;
  assigneeEmail: string;
};

export type TaskInput = {
  assigneeId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
};

type TaskRow = {
  id: string;
  user_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type UserProfileRow = {
  user_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  user_role_assignments: Array<{
    app_roles: {
      code: string;
    } | null;
  }>;
};

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

function mapProfilesById(profiles: AssignableStaffUser[]) {
  return new Map(profiles.map((profile) => [profile.userId, profile]));
}

function mapTask(row: TaskRow, profiles: Map<string, AssignableStaffUser>): Task {
  const assignee = profiles.get(row.user_id);

  return {
    id: row.id,
    assigneeId: row.user_id,
    assignedById: row.created_by,
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assigneeName: assignee?.fullName ?? "Unassigned staff",
    assigneeEmail: assignee?.email ?? "",
  };
}

function normalizeTaskInput(input: TaskInput) {
  const assigneeId = input.assigneeId.trim();
  const title = input.title.trim();
  const description = input.description.trim();
  const status = input.status.trim() || "todo";
  const priority = input.priority.trim() || "medium";
  const dueDate = input.dueDate.trim();

  if (!assigneeId) {
    throw new Error("Assigned staff is required.");
  }

  if (!title) {
    throw new Error("Task title is required.");
  }

  if (!isTaskStatus(status)) {
    throw new Error("Task status is invalid.");
  }

  if (!isTaskPriority(priority)) {
    throw new Error("Task priority is invalid.");
  }

  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw new Error("Task due date must use YYYY-MM-DD format.");
  }

  return {
    assigneeId,
    title,
    description,
    status,
    priority,
    dueDate: dueDate || null,
  };
}

function normalizeStatus(status: string): TaskStatus {
  const normalized = status.trim();

  if (!isTaskStatus(normalized)) {
    throw new Error("Task status is invalid.");
  }

  return normalized;
}

function mapStaffProfile(row: UserProfileRow): AssignableStaffUser | null {
  const roles = row.user_role_assignments
    .map((assignment) => assignment.app_roles?.code)
    .filter(Boolean);

  if (!row.is_active || !roles.includes("staff")) {
    return null;
  }

  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
  };
}

export async function getAssignableStaffUsers() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_user_profiles")
    .select("user_id, email, full_name, is_active, user_role_assignments(app_roles(code))")
    .order("full_name", { ascending: true })
    .returns<UserProfileRow[]>();

  if (error) {
    throw new Error(`Failed to fetch staff users: ${error.message}`);
  }

  return data.map(mapStaffProfile).filter((profile): profile is AssignableStaffUser => Boolean(profile));
}

export async function getAdminTasks() {
  const supabase = await getSupabaseServerClient();
  const [tasksResult, staffUsers] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, user_id, created_by, title, description, status, priority, due_date, created_at, updated_at")
      .order("created_at", { ascending: false })
      .returns<TaskRow[]>(),
    getAssignableStaffUsers(),
  ]);

  if (tasksResult.error) {
    throw new Error(`Failed to fetch tasks: ${tasksResult.error.message}`);
  }

  return tasksResult.data.map((task) => mapTask(task, mapProfilesById(staffUsers)));
}

export async function getAssignedTasksForUser(userId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, user_id, created_by, title, description, status, priority, due_date, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();

  if (error) {
    throw new Error(`Failed to fetch assigned tasks: ${error.message}`);
  }

  const profiles = mapProfilesById(await getAssignableStaffUsers());
  return data.map((task) => mapTask(task, profiles));
}

export async function createTaskAssignment(adminUserId: string, input: TaskInput) {
  const normalized = normalizeTaskInput(input);
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: normalized.assigneeId,
      created_by: adminUserId,
      title: normalized.title,
      description: normalized.description || null,
      status: normalized.status,
      priority: normalized.priority,
      due_date: normalized.dueDate,
    })
    .select("id, user_id, created_by, title, description, status, priority, due_date, created_at, updated_at")
    .single<TaskRow>();

  if (error) {
    throw new Error(`Failed to assign task: ${error.message}`);
  }

  return mapTask(data, mapProfilesById(await getAssignableStaffUsers()));
}

export async function updateTaskAssignmentById(taskId: string, input: TaskInput) {
  const normalized = normalizeTaskInput(input);
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      user_id: normalized.assigneeId,
      title: normalized.title,
      description: normalized.description || null,
      status: normalized.status,
      priority: normalized.priority,
      due_date: normalized.dueDate,
    })
    .eq("id", taskId)
    .select("id, user_id, created_by, title, description, status, priority, due_date, created_at, updated_at")
    .single<TaskRow>();

  if (error) {
    throw new Error(`Failed to update assigned task: ${error.message}`);
  }

  return mapTask(data, mapProfilesById(await getAssignableStaffUsers()));
}

export async function updateTaskStatusById(taskId: string, status: string, assigneeId?: string) {
  const normalizedStatus = normalizeStatus(status);
  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("tasks")
    .update({
      status: normalizedStatus,
    })
    .eq("id", taskId);

  if (assigneeId) {
    query = query.eq("user_id", assigneeId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to update task status: ${error.message}`);
  }
}

export async function deleteTaskById(taskId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`);
  }
}
