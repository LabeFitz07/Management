import { getSupabaseAdminClient } from "./supabase-admin";
import { isDepartmentAdminRole, isManagerRole, STAFF_ROLE_CODE } from "./roles";
import { getSupabaseServerClient } from "./supabase-server";
import {
  createTaskSubmissionSignedUrl,
  removeTaskSubmissionFiles,
  uploadTaskReferenceFiles,
  uploadTaskSubmissionFiles,
  type UploadedTaskSubmissionFile,
  type UploadedTaskReferenceFile,
} from "./task-file-storage";

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "submitted",
  "changes_requested",
  "approved",
] as const;
export const MANAGER_ASSIGNABLE_TASK_STATUSES = ["todo", "in_progress"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export const TASK_SUBMISSION_REVIEW_STATUSES = [
  "submitted",
  "approved",
  "changes_requested",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type ManagerAssignableTaskStatus = (typeof MANAGER_ASSIGNABLE_TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskSubmissionReviewStatus = (typeof TASK_SUBMISSION_REVIEW_STATUSES)[number];

export type AssignableStaffUser = {
  userId: string;
  email: string;
  fullName: string;
};

export type ReviewerUser = {
  userId: string;
  email: string;
  fullName: string;
};

export type Task = {
  id: string;
  assigneeId: string;
  assignedById: string | null;
  reviewerId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  createdAt: string;
  updatedAt: string;
  assigneeName: string;
  assigneeEmail: string;
  reviewerName: string;
  reviewerEmail: string;
};

export type TaskSubmissionFile = {
  id: string;
  submissionId: string;
  taskId: string;
  uploadedById: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string | null;
};

export type TaskReferenceFile = {
  id: string;
  taskId: string;
  uploadedById: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string | null;
};

export type TaskSubmission = {
  id: string;
  taskId: string;
  submittedById: string;
  submittedByName: string;
  version: number;
  submissionNote: string;
  reviewStatus: TaskSubmissionReviewStatus;
  reviewNote: string;
  reviewedById: string | null;
  reviewedByName: string;
  submittedAt: string;
  reviewedAt: string | null;
  files: TaskSubmissionFile[];
};

export type TaskDetail = {
  task: Task;
  referenceFiles: TaskReferenceFile[];
  submissions: TaskSubmission[];
};

export type TaskInput = {
  assigneeId: string;
  reviewerId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
};

export type TaskSubmissionInput = {
  taskId: string;
  note: string;
  files: File[];
};

export type TaskReviewDecision = "approved" | "changes_requested";

export type TaskReviewInput = {
  submissionId: string;
  decision: TaskReviewDecision;
  reviewNote: string;
};

type RoleAssignmentRow = {
  app_roles: {
    code: string;
  } | null;
};

type UserDirectoryRow = {
  user_id: string;
  email: string;
  full_name: string;
  department?: string | null;
  profile_image_url?: string | null;
  is_active: boolean;
  user_role_assignments: RoleAssignmentRow[];
};

type VisibleUser = {
  userId: string;
  email: string;
  fullName: string;
  department: string;
  roles: string[];
};

type TaskRow = {
  id: string;
  user_id: string;
  created_by: string | null;
  reviewer_user_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

type TaskSubmissionRow = {
  id: string;
  task_id: string;
  submitted_by: string;
  version: number;
  submission_note: string;
  review_status: TaskSubmissionReviewStatus;
  review_note: string | null;
  reviewed_by: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type TaskSubmissionFileRow = {
  id: string;
  submission_id: string;
  task_id: string;
  uploaded_by: string;
  storage_bucket: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type TaskReferenceFileRow = {
  id: string;
  task_id: string;
  uploaded_by: string;
  storage_bucket: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

const TASK_SELECT =
  "id, user_id, created_by, reviewer_user_id, title, description, status, priority, due_date, submitted_at, approved_at, approved_by, created_at, updated_at";
const PROFILE_SELECT =
  "user_id, email, full_name, department, is_active, user_role_assignments(app_roles(code))";
const SUBMISSION_SELECT =
  "id, task_id, submitted_by, version, submission_note, review_status, review_note, reviewed_by, submitted_at, reviewed_at";
const SUBMISSION_FILE_SELECT =
  "id, submission_id, task_id, uploaded_by, storage_bucket, storage_path, original_name, mime_type, size_bytes, created_at";
const REFERENCE_FILE_SELECT =
  "id, task_id, uploaded_by, storage_bucket, storage_path, original_name, mime_type, size_bytes, created_at";

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

function isManagerAssignableTaskStatus(value: string): value is ManagerAssignableTaskStatus {
  return MANAGER_ASSIGNABLE_TASK_STATUSES.includes(value as ManagerAssignableTaskStatus);
}

function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

function isTaskSubmissionReviewStatus(value: string): value is TaskSubmissionReviewStatus {
  return TASK_SUBMISSION_REVIEW_STATUSES.includes(value as TaskSubmissionReviewStatus);
}

function getRoles(row: UserDirectoryRow) {
  return row.user_role_assignments
    .map((assignment) => assignment.app_roles?.code)
    .filter((role): role is string => Boolean(role));
}

function mapVisibleUser(row: UserDirectoryRow): VisibleUser | null {
  if (!row.is_active) {
    return null;
  }

  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    department: row.department ?? "",
    roles: getRoles(row),
  };
}

function mapVisibleUsersById(users: VisibleUser[]) {
  return new Map(users.map((user) => [user.userId, user]));
}

function mapTask(row: TaskRow, usersById: Map<string, VisibleUser>): Task {
  const assignee = usersById.get(row.user_id);
  const reviewer = row.reviewer_user_id ? usersById.get(row.reviewer_user_id) : null;

  return {
    id: row.id,
    assigneeId: row.user_id,
    assignedById: row.created_by,
    reviewerId: row.reviewer_user_id,
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    approvedById: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assigneeName: assignee?.fullName ?? "Assigned staff",
    assigneeEmail: assignee?.email ?? "",
    reviewerName: reviewer?.fullName ?? "Task reviewer",
    reviewerEmail: reviewer?.email ?? "",
  };
}

function mapSubmissionFile(
  row: TaskSubmissionFileRow,
  signedUrlByPath: Map<string, string>,
): TaskSubmissionFile {
  return {
    id: row.id,
    submissionId: row.submission_id,
    taskId: row.task_id,
    uploadedById: row.uploaded_by,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    downloadUrl: signedUrlByPath.get(row.storage_path) ?? null,
  };
}

function mapReferenceFile(
  row: TaskReferenceFileRow,
  signedUrlByPath: Map<string, string>,
): TaskReferenceFile {
  return {
    id: row.id,
    taskId: row.task_id,
    uploadedById: row.uploaded_by,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    downloadUrl: signedUrlByPath.get(row.storage_path) ?? null,
  };
}

function mapSubmission(
  row: TaskSubmissionRow,
  task: Task,
  usersById: Map<string, VisibleUser>,
  files: TaskSubmissionFile[],
): TaskSubmission {
  const submittedBy = usersById.get(row.submitted_by);
  const reviewedBy = row.reviewed_by ? usersById.get(row.reviewed_by) : null;

  return {
    id: row.id,
    taskId: row.task_id,
    submittedById: row.submitted_by,
    submittedByName: submittedBy?.fullName ?? task.assigneeName,
    version: row.version,
    submissionNote: row.submission_note,
    reviewStatus: row.review_status,
    reviewNote: row.review_note ?? "",
    reviewedById: row.reviewed_by,
    reviewedByName: reviewedBy?.fullName ?? task.reviewerName,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    files,
  };
}

function normalizeTaskInput(input: TaskInput, defaultReviewerId: string) {
  const assigneeId = input.assigneeId.trim();
  const reviewerId = input.reviewerId.trim() || defaultReviewerId;
  const title = input.title.trim();
  const description = input.description.trim();
  const status = input.status.trim() || "todo";
  const priority = input.priority.trim() || "medium";
  const dueDate = input.dueDate.trim();

  if (!assigneeId) {
    throw new Error("Assigned staff is required.");
  }

  if (!reviewerId) {
    throw new Error("Task reviewer is required.");
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
    reviewerId,
    title,
    description,
    status,
    priority,
    dueDate: dueDate || null,
  };
}

function normalizeManagerAssignmentStatus(status: string) {
  const normalized = status.trim() || "todo";

  if (!isManagerAssignableTaskStatus(normalized)) {
    throw new Error("Managers can only assign tasks in To Do or In Progress.");
  }

  return normalized;
}

function canManagerEditWorkflowStatus(status: TaskStatus) {
  return status === "todo" || status === "in_progress";
}

function normalizeProgressStatus(status: string) {
  const normalized = status.trim();

  if (normalized !== "todo" && normalized !== "in_progress") {
    throw new Error("Task progress status is invalid.");
  }

  return normalized;
}

function normalizeTaskReviewInput(input: TaskReviewInput) {
  const submissionId = input.submissionId.trim();
  const reviewNote = input.reviewNote.trim();

  if (!submissionId) {
    throw new Error("Submission ID is required.");
  }

  if (!isTaskSubmissionReviewStatus(input.decision)) {
    throw new Error("Review decision is invalid.");
  }

  if (input.decision === "changes_requested" && !reviewNote) {
    throw new Error("A review note is required when requesting changes.");
  }

  return {
    submissionId,
    decision: input.decision,
    reviewNote,
  };
}

function normalizeDepartments(visibleDepartments?: string[]) {
  return visibleDepartments?.map((department) => department.trim().toLowerCase()).filter(Boolean);
}

async function getVisibleUsers(userIds?: string[], visibleDepartments?: string[]) {
  if (userIds && userIds.length === 0) {
    return [] satisfies VisibleUser[];
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("app_user_profiles")
    .select(PROFILE_SELECT)
    .order("full_name", { ascending: true });

  if (userIds) {
    query = query.in("user_id", userIds);
  }

  const { data, error } = await query.returns<UserDirectoryRow[]>();

  if (error) {
    throw new Error(`Failed to fetch user directory: ${error.message}`);
  }

  const normalizedDepartments = normalizeDepartments(visibleDepartments);

  return data
    .map(mapVisibleUser)
    .filter((user): user is VisibleUser => Boolean(user))
    .filter((user) => {
      if (!normalizedDepartments || normalizedDepartments.length === 0) {
        return true;
      }

      return normalizedDepartments.includes(user.department.trim().toLowerCase());
    });
}

async function getUsersByTaskRows(taskRows: TaskRow[]) {
  const userIds = Array.from(
    new Set(
      taskRows
        .flatMap((row) => [row.user_id, row.created_by, row.reviewer_user_id, row.approved_by])
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return mapVisibleUsersById(await getVisibleUsers(userIds));
}

async function getSignedUrlByStoragePath(fileRows: Array<{ storage_path: string }>) {
  if (fileRows.length === 0) {
    return new Map<string, string>();
  }

  let adminSupabase: ReturnType<typeof getSupabaseAdminClient>;

  try {
    adminSupabase = getSupabaseAdminClient();
  } catch {
    return new Map<string, string>();
  }

  const signedUrlByPath = new Map<string, string>();

  for (const fileRow of fileRows) {
    const signedUrl = await createTaskSubmissionSignedUrl(adminSupabase, fileRow.storage_path);

    if (signedUrl) {
      signedUrlByPath.set(fileRow.storage_path, signedUrl);
    }
  }

  return signedUrlByPath;
}

async function getTaskRowById(taskId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", taskId)
    .maybeSingle<TaskRow>();

  if (error) {
    throw new Error(`Failed to fetch task: ${error.message}`);
  }

  return data;
}

async function getLatestSubmissionVersion(taskId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("task_submissions")
    .select("version")
    .eq("task_id", taskId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<{ version: number }>();

  if (error) {
    throw new Error(`Failed to inspect existing submissions: ${error.message}`);
  }

  return data?.version ?? 0;
}

async function deleteSubmissionRecord(submissionId: string, submittedById: string) {
  const supabase = await getSupabaseServerClient();
  await supabase
    .from("task_submissions")
    .delete()
    .eq("id", submissionId)
    .eq("submitted_by", submittedById);
}

async function insertTaskReferenceFiles(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  taskId: string,
  uploadedById: string,
  files: UploadedTaskReferenceFile[],
) {
  if (files.length === 0) {
    return;
  }

  const { error } = await adminSupabase.from("task_reference_files").insert(
    files.map((file) => ({
      task_id: taskId,
      uploaded_by: uploadedById,
      storage_bucket: file.storageBucket,
      storage_path: file.storagePath,
      original_name: file.originalName,
      mime_type: file.mimeType,
      size_bytes: file.sizeBytes,
    })),
  );

  if (error) {
    throw new Error(`Failed to save task reference files: ${error.message}`);
  }
}

async function removeTaskReferenceFilesById(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  taskId: string,
  referenceFileIds: string[],
) {
  const uniqueIds = Array.from(new Set(referenceFileIds.map((value) => value.trim()).filter(Boolean)));

  if (uniqueIds.length === 0) {
    return;
  }

  const { data: existingFiles, error: lookupError } = await adminSupabase
    .from("task_reference_files")
    .select("id, storage_path")
    .eq("task_id", taskId)
    .in("id", uniqueIds)
    .returns<Array<{ id: string; storage_path: string }>>();

  if (lookupError) {
    throw new Error(`Failed to load task reference files for removal: ${lookupError.message}`);
  }

  if (!existingFiles || existingFiles.length === 0) {
    return;
  }

  await removeTaskSubmissionFiles(
    adminSupabase,
    existingFiles.map((file) => file.storage_path),
  );

  const { error: deleteError } = await adminSupabase
    .from("task_reference_files")
    .delete()
    .eq("task_id", taskId)
    .in("id", existingFiles.map((file) => file.id));

  if (deleteError) {
    throw new Error(`Failed to delete task reference files: ${deleteError.message}`);
  }
}

export async function getAssignableStaffUsers(visibleDepartments?: string[]) {
  const users = await getVisibleUsers(undefined, visibleDepartments);

  return users
    .filter((user) => user.roles.includes(STAFF_ROLE_CODE))
    .map((user) => ({
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
    }));
}

export async function getTaskReviewerUsers(
  reviewerUserIds?: string[],
  visibleDepartments?: string[],
) {
  const users = await getVisibleUsers(reviewerUserIds, visibleDepartments);

  return users
    .filter((user) => isManagerRole(user.roles) || isDepartmentAdminRole(user.roles))
    .map((user) => ({
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName));
}

export async function getManagedTasks(visibleDepartments?: string[]) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  const usersById = await getUsersByTaskRows(data);
  const normalizedDepartments = normalizeDepartments(visibleDepartments);

  return data
    .map((task) => mapTask(task, usersById))
    .filter((task) => {
      if (!normalizedDepartments || normalizedDepartments.length === 0) {
        return true;
      }

      const assigneeDepartment = usersById.get(task.assigneeId)?.department?.trim().toLowerCase() ?? "";
      return normalizedDepartments.includes(assigneeDepartment);
    });
}

export async function getAdminTasks() {
  return getManagedTasks();
}

export async function getAssignedTasksForUser(userId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();

  if (error) {
    throw new Error(`Failed to fetch assigned tasks: ${error.message}`);
  }

  const usersById = await getUsersByTaskRows(data);
  return data.map((task) => mapTask(task, usersById));
}

export async function getTaskDetailById(taskId: string, visibleDepartments?: string[]) {
  const taskRow = await getTaskRowById(taskId);

  if (!taskRow) {
    return null;
  }

  const usersById = await getUsersByTaskRows([taskRow]);
  const task = mapTask(taskRow, usersById);
  const normalizedDepartments = normalizeDepartments(visibleDepartments);

  if (normalizedDepartments && normalizedDepartments.length > 0) {
    const assigneeDepartment = usersById.get(task.assigneeId)?.department?.trim().toLowerCase() ?? "";

    if (!normalizedDepartments.includes(assigneeDepartment)) {
      return null;
    }
  }

  const supabase = await getSupabaseServerClient();
  const { data: submissionRows, error: submissionError } = await supabase
    .from("task_submissions")
    .select(SUBMISSION_SELECT)
    .eq("task_id", taskId)
    .order("version", { ascending: false })
    .returns<TaskSubmissionRow[]>();

  if (submissionError) {
    throw new Error(`Failed to fetch task submissions: ${submissionError.message}`);
  }

  const { data: fileRows, error: fileError } = await supabase
    .from("task_submission_files")
    .select(SUBMISSION_FILE_SELECT)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
    .returns<TaskSubmissionFileRow[]>();

  if (fileError) {
    throw new Error(`Failed to fetch submission files: ${fileError.message}`);
  }

  const { data: referenceFileRows, error: referenceFileError } = await supabase
    .from("task_reference_files")
    .select(REFERENCE_FILE_SELECT)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
    .returns<TaskReferenceFileRow[]>();

  if (referenceFileError) {
    throw new Error(`Failed to fetch task reference files: ${referenceFileError.message}`);
  }

  const submissionUsersById = mapVisibleUsersById(
    await getVisibleUsers(
      Array.from(
        new Set(
          submissionRows
            .flatMap((row) => [row.submitted_by, row.reviewed_by, task.assigneeId, task.reviewerId])
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    ),
  );
  const signedUrlByPath = await getSignedUrlByStoragePath([...fileRows, ...referenceFileRows]);
  const filesBySubmissionId = new Map<string, TaskSubmissionFile[]>();

  for (const fileRow of fileRows) {
    const mappedFile = mapSubmissionFile(fileRow, signedUrlByPath);
    const submissionFiles = filesBySubmissionId.get(fileRow.submission_id) ?? [];
    submissionFiles.push(mappedFile);
    filesBySubmissionId.set(fileRow.submission_id, submissionFiles);
  }

  return {
    task,
    referenceFiles: referenceFileRows.map((fileRow) => mapReferenceFile(fileRow, signedUrlByPath)),
    submissions: submissionRows.map((submissionRow) =>
      mapSubmission(
        submissionRow,
        task,
        submissionUsersById,
        filesBySubmissionId.get(submissionRow.id) ?? [],
      ),
    ),
  } satisfies TaskDetail;
}

export async function createTaskAssignment(
  managerUserId: string,
  input: TaskInput,
  referenceFiles: File[] = [],
) {
  const normalized = normalizeTaskInput(input, managerUserId);
  const assignmentStatus = normalizeManagerAssignmentStatus(normalized.status);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: normalized.assigneeId,
      created_by: managerUserId,
      reviewer_user_id: normalized.reviewerId,
      title: normalized.title,
      description: normalized.description || null,
      status: assignmentStatus,
      priority: normalized.priority,
      due_date: normalized.dueDate,
      submitted_at: null,
      approved_at: null,
      approved_by: null,
    })
    .select(TASK_SELECT)
    .single<TaskRow>();

  if (error) {
    throw new Error(`Failed to assign task: ${error.message}`);
  }

  let uploadedReferenceFiles: UploadedTaskReferenceFile[] = [];

  try {
    if (referenceFiles.length > 0) {
      uploadedReferenceFiles = await uploadTaskReferenceFiles(supabase, data.id, referenceFiles);
      await insertTaskReferenceFiles(supabase, data.id, managerUserId, uploadedReferenceFiles);
    }
  } catch (fileError) {
    if (uploadedReferenceFiles.length > 0) {
      await removeTaskSubmissionFiles(
        supabase,
        uploadedReferenceFiles.map((file) => file.storagePath),
      );
    }

    await supabase.from("tasks").delete().eq("id", data.id);
    throw fileError;
  }

  const usersById = await getUsersByTaskRows([data]);
  return mapTask(data, usersById);
}

export async function updateTaskAssignmentById(
  taskId: string,
  managerUserId: string,
  input: TaskInput,
  referenceFiles: File[] = [],
  referenceFileIdsToRemove: string[] = [],
) {
  const normalized = normalizeTaskInput(input, managerUserId);
  const taskRow = await getTaskRowById(taskId);

  if (!taskRow) {
    throw new Error("Task not found.");
  }

  const supabase = getSupabaseAdminClient();
  const updatePayload: {
    user_id: string;
    reviewer_user_id: string;
    title: string;
    description: string | null;
    priority: TaskPriority;
    due_date: string | null;
    status?: ManagerAssignableTaskStatus;
    submitted_at?: null;
    approved_at?: null;
    approved_by?: null;
  } = {
    user_id: normalized.assigneeId,
    reviewer_user_id: normalized.reviewerId,
    title: normalized.title,
    description: normalized.description || null,
    priority: normalized.priority,
    due_date: normalized.dueDate,
  };

  if (canManagerEditWorkflowStatus(taskRow.status)) {
    updatePayload.status = normalizeManagerAssignmentStatus(normalized.status);
    updatePayload.submitted_at = null;
    updatePayload.approved_at = null;
    updatePayload.approved_by = null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single<TaskRow>();

  if (error) {
    throw new Error(`Failed to update assigned task: ${error.message}`);
  }

  if (referenceFileIdsToRemove.length > 0) {
    await removeTaskReferenceFilesById(supabase, taskId, referenceFileIdsToRemove);
  }

  if (referenceFiles.length > 0) {
    let uploadedReferenceFiles: UploadedTaskReferenceFile[] = [];

    try {
      uploadedReferenceFiles = await uploadTaskReferenceFiles(supabase, taskId, referenceFiles);
      await insertTaskReferenceFiles(supabase, taskId, managerUserId, uploadedReferenceFiles);
    } catch (fileError) {
      if (uploadedReferenceFiles.length > 0) {
        await removeTaskSubmissionFiles(
          supabase,
          uploadedReferenceFiles.map((file) => file.storagePath),
        );
      }

      throw fileError;
    }
  }

  const usersById = await getUsersByTaskRows([data]);
  return mapTask(data, usersById);
}

export async function updateTaskProgressById(
  taskId: string,
  status: string,
  actorUserId: string,
  isManager = false,
) {
  const normalizedStatus = normalizeProgressStatus(status);
  const taskRow = await getTaskRowById(taskId);

  if (!taskRow) {
    throw new Error("Task not found.");
  }

  if (!isManager && taskRow.user_id !== actorUserId) {
    throw new Error("You are not allowed to update this task.");
  }

  if (taskRow.status === "submitted" || taskRow.status === "approved") {
    throw new Error("This task is locked while it is under review or already approved.");
  }

  const supabase = await getSupabaseServerClient();
  let query = supabase.from("tasks").update({
    status: normalizedStatus,
  });

  query = query.eq("id", taskId);

  if (!isManager) {
    query = query.eq("user_id", actorUserId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to update task progress: ${error.message}`);
  }
}

export async function createTaskSubmission(actorUserId: string, input: TaskSubmissionInput) {
  const taskId = input.taskId.trim();
  const note = input.note.trim();

  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  if (!note) {
    throw new Error("A work description is required before submitting.");
  }

  const taskRow = await getTaskRowById(taskId);

  if (!taskRow || taskRow.user_id !== actorUserId) {
    throw new Error("Task not found or no longer assigned to this account.");
  }

  if (taskRow.status === "submitted") {
    throw new Error("This task is already waiting for review.");
  }

  if (taskRow.status === "approved") {
    throw new Error("This task is already approved.");
  }

  if (taskRow.status !== "in_progress" && taskRow.status !== "changes_requested") {
    throw new Error("Start or resume the task before submitting it for review.");
  }

  const version = (await getLatestSubmissionVersion(taskId)) + 1;
  const submissionId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  let uploadedFiles: UploadedTaskSubmissionFile[] = [];
  let adminSupabase: ReturnType<typeof getSupabaseAdminClient> | null = null;
  let submissionInserted = false;
  const supabase = await getSupabaseServerClient();

  try {
    if (input.files.length > 0) {
      adminSupabase = getSupabaseAdminClient();
      uploadedFiles = await uploadTaskSubmissionFiles(adminSupabase, taskId, submissionId, input.files);
    }

    const { error: submissionError } = await supabase.from("task_submissions").insert({
      id: submissionId,
      task_id: taskId,
      submitted_by: actorUserId,
      version,
      submission_note: note,
      review_status: "submitted",
      submitted_at: submittedAt,
    });

    if (submissionError) {
      throw new Error(`Failed to save task submission: ${submissionError.message}`);
    }

    submissionInserted = true;

    if (uploadedFiles.length > 0) {
      const { error: attachmentError } = await supabase.from("task_submission_files").insert(
        uploadedFiles.map((file) => ({
          submission_id: submissionId,
          task_id: taskId,
          uploaded_by: actorUserId,
          storage_bucket: file.storageBucket,
          storage_path: file.storagePath,
          original_name: file.originalName,
          mime_type: file.mimeType,
          size_bytes: file.sizeBytes,
        })),
      );

      if (attachmentError) {
        throw new Error(`Failed to save task submission files: ${attachmentError.message}`);
      }
    }

    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        status: "submitted",
        submitted_at: submittedAt,
        approved_at: null,
        approved_by: null,
      })
      .eq("id", taskId)
      .eq("user_id", actorUserId);

    if (taskError) {
      throw new Error(`Failed to move task into review: ${taskError.message}`);
    }

    return {
      taskId,
      submissionId,
      taskTitle: taskRow.title,
      reviewerUserId: taskRow.reviewer_user_id ?? taskRow.created_by,
    };
  } catch (error) {
    if (submissionInserted) {
      await deleteSubmissionRecord(submissionId, actorUserId);
    }

    if (adminSupabase && uploadedFiles.length > 0) {
      await removeTaskSubmissionFiles(
        adminSupabase,
        uploadedFiles.map((file) => file.storagePath),
      );
    }

    throw error;
  }
}

export async function reviewTaskSubmission(
  actorUserId: string,
  input: TaskReviewInput,
  visibleDepartments?: string[],
) {
  const normalized = normalizeTaskReviewInput(input);
  const supabase = getSupabaseAdminClient();
  const { data: submissionRow, error: submissionError } = await supabase
    .from("task_submissions")
    .select(SUBMISSION_SELECT)
    .eq("id", normalized.submissionId)
    .maybeSingle<TaskSubmissionRow>();

  if (submissionError) {
    throw new Error(`Failed to fetch submission for review: ${submissionError.message}`);
  }

  if (!submissionRow) {
    throw new Error("Submission not found.");
  }

  if (submissionRow.review_status !== "submitted") {
    throw new Error("This submission has already been reviewed.");
  }

  const taskRow = await getTaskRowById(submissionRow.task_id);

  if (!taskRow) {
    throw new Error("Task not found.");
  }

  const usersById = await getUsersByTaskRows([taskRow]);
  const normalizedDepartments = normalizeDepartments(visibleDepartments);

  if (normalizedDepartments && normalizedDepartments.length > 0) {
    const assigneeDepartment = usersById.get(taskRow.user_id)?.department?.trim().toLowerCase() ?? "";

    if (!normalizedDepartments.includes(assigneeDepartment)) {
      throw new Error("You are not allowed to review this task.");
    }
  }

  const { data: latestSubmission, error: latestError } = await supabase
    .from("task_submissions")
    .select("id")
    .eq("task_id", submissionRow.task_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (latestError) {
    throw new Error(`Failed to validate submission version: ${latestError.message}`);
  }

  if (latestSubmission?.id !== submissionRow.id) {
    throw new Error("Only the latest staff submission can be reviewed.");
  }

  const reviewedAt = new Date().toISOString();
  const { error: updateSubmissionError } = await supabase
    .from("task_submissions")
    .update({
      review_status: normalized.decision,
      review_note: normalized.reviewNote || null,
      reviewed_by: actorUserId,
      reviewed_at: reviewedAt,
    })
    .eq("id", submissionRow.id);

  if (updateSubmissionError) {
    throw new Error(`Failed to save review decision: ${updateSubmissionError.message}`);
  }

  const { error: updateTaskError } = await supabase
    .from("tasks")
    .update({
      status: normalized.decision === "approved" ? "approved" : "changes_requested",
      approved_at: normalized.decision === "approved" ? reviewedAt : null,
      approved_by: normalized.decision === "approved" ? actorUserId : null,
    })
    .eq("id", submissionRow.task_id);

  if (updateTaskError) {
    throw new Error(`Failed to update task review status: ${updateTaskError.message}`);
  }

  return {
    taskId: submissionRow.task_id,
    taskTitle: taskRow.title,
    submissionId: submissionRow.id,
    decision: normalized.decision,
    recipientUserId: taskRow.user_id,
  };
}

export async function deleteTaskById(taskId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`);
  }
}
