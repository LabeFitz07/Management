"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notification-store";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getDepartments, getManagedDepartmentIdsForUser } from "@/lib/department-store";
import { isDepartmentAdminRole, isManagerRole } from "@/lib/roles";
import {
  createTaskAssignment,
  createTaskSubmission,
  deleteTaskById,
  getAssignableStaffUsers,
  getTaskDetailById,
  reviewTaskSubmission,
  updateTaskAssignmentById,
  updateTaskProgressById,
  type TaskInput,
} from "@/lib/task-store";
import { getTaskReferenceFiles, getTaskSubmissionFiles } from "@/lib/task-file-storage";

function getTaskInput(formData: FormData): TaskInput {
  return {
    assigneeId: String(formData.get("assigneeId") ?? "").trim(),
    reviewerId: String(formData.get("reviewerId") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
    priority: String(formData.get("priority") ?? "").trim(),
    dueDate: String(formData.get("dueDate") ?? "").trim(),
  };
}

function getReferenceFileIdsToRemove(formData: FormData) {
  return formData
    .getAll("removeReferenceFileIds")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

async function requireAccessProfile() {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/?error=session");
  }

  return accessProfile;
}

async function requireTaskManager() {
  const accessProfile = await requireAccessProfile();

  if (!isManagerRole(accessProfile.roles) && !isDepartmentAdminRole(accessProfile.roles)) {
    redirect("/staff");
  }

  return accessProfile;
}

async function getDepartmentAdminScope(accessProfile: Awaited<ReturnType<typeof requireTaskManager>>) {
  if (!isDepartmentAdminRole(accessProfile.roles)) {
    return null;
  }

  const managedDepartmentIds = await getManagedDepartmentIdsForUser(accessProfile.userId);
  const departments = await getDepartments(managedDepartmentIds);
  const visibleDepartments = departments.map((department) => department.name);
  return { visibleDepartments };
}

function revalidateTaskPaths(taskId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/staff");
  revalidatePath("/notifications");
  revalidatePath(`/dashboard/tasks/${taskId}`);
  revalidatePath(`/staff/tasks/${taskId}`);
}

export async function createTask(formData: FormData) {
  const accessProfile = await requireTaskManager();
  const departmentAdminScope = await getDepartmentAdminScope(accessProfile);
  const referenceFiles = getTaskReferenceFiles(formData);

  if (referenceFiles === "invalid-files") {
    redirect("/dashboard/workflow?add=1&upload=invalid");
  }

  if (departmentAdminScope) {
    const assignableStaff = await getAssignableStaffUsers(departmentAdminScope.visibleDepartments);
    const assigneeId = String(formData.get("assigneeId") ?? "").trim();
    const reviewerId = String(formData.get("reviewerId") ?? "").trim() || accessProfile.userId;

    if (!assignableStaff.some((staff) => staff.userId === assigneeId) || reviewerId !== accessProfile.userId) {
      redirect("/dashboard/workflow?add=1&error=unauthorized");
    }
  }

  const task = await createTaskAssignment(accessProfile.userId, getTaskInput(formData), referenceFiles);

  if (task.assigneeId !== accessProfile.userId) {
    await createNotification({
      recipientUserId: task.assigneeId,
      actorUserId: accessProfile.userId,
      taskId: task.id,
      type: "task_assigned",
      title: `New task assigned: ${task.title}`,
      body: `Open your task queue to start working on ${task.title}.`,
    });
  }

  revalidateTaskPaths(task.id);
  redirect("/dashboard/workflow");
}

export async function updateTask(formData: FormData) {
  const taskId = String(formData.get("id") ?? "").trim();

  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  const accessProfile = await requireTaskManager();
  const departmentAdminScope = await getDepartmentAdminScope(accessProfile);
  const referenceFiles = getTaskReferenceFiles(formData);
  const referenceFileIdsToRemove = getReferenceFileIdsToRemove(formData);

  if (referenceFiles === "invalid-files") {
    redirect(`/dashboard/workflow?edit=${taskId}&upload=invalid`);
  }

  if (departmentAdminScope) {
    const assignableStaff = await getAssignableStaffUsers(departmentAdminScope.visibleDepartments);
    const detail = await getTaskDetailById(taskId, departmentAdminScope.visibleDepartments);
    const assigneeId = String(formData.get("assigneeId") ?? "").trim();
    const reviewerId = String(formData.get("reviewerId") ?? "").trim() || accessProfile.userId;

    if (!detail || !assignableStaff.some((staff) => staff.userId === assigneeId) || reviewerId !== accessProfile.userId) {
      redirect("/dashboard/workflow?error=unauthorized");
    }
  }

  const task = await updateTaskAssignmentById(
    taskId,
    accessProfile.userId,
    getTaskInput(formData),
    referenceFiles,
    referenceFileIdsToRemove,
  );

  if (task.assigneeId !== accessProfile.userId) {
    await createNotification({
      recipientUserId: task.assigneeId,
      actorUserId: accessProfile.userId,
      taskId: task.id,
      type: "task_assigned",
      title: `Task updated: ${task.title}`,
      body: `The assignment details for ${task.title} were updated. Review the latest instructions.`,
    });
  }

  revalidateTaskPaths(task.id);
  redirect("/dashboard/workflow");
}

export async function updateTaskStatus(formData: FormData) {
  const taskId = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  const accessProfile = await requireAccessProfile();
  const isManager = isManagerRole(accessProfile.roles);

  await updateTaskProgressById(taskId, status, accessProfile.userId, isManager);
  revalidateTaskPaths(taskId);
}

export async function submitTaskForReview(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "").trim();
  const note = String(formData.get("submissionNote") ?? "").trim();
  const files = getTaskSubmissionFiles(formData);

  if (files === "invalid-files") {
    redirect(`/staff/tasks/${taskId}?status=files`);
  }

  const accessProfile = await requireAccessProfile();

  if (isManagerRole(accessProfile.roles)) {
    throw new Error("Managers cannot submit staff work for review.");
  }

  const result = await createTaskSubmission(accessProfile.userId, {
    taskId,
    note,
    files,
  });

  if (result.reviewerUserId) {
    await createNotification({
      recipientUserId: result.reviewerUserId,
      actorUserId: accessProfile.userId,
      taskId: result.taskId,
      submissionId: result.submissionId,
      type: "task_submitted",
      title: `Review needed: ${result.taskTitle}`,
      body: `${accessProfile.fullName} submitted new work for review.`,
    });
  }

  revalidateTaskPaths(result.taskId);
  redirect(`/staff/tasks/${result.taskId}?status=submitted`);
}

export async function reviewTaskSubmissionAction(formData: FormData) {
  const accessProfile = await requireTaskManager();
  const departmentAdminScope = await getDepartmentAdminScope(accessProfile);
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  const result = await reviewTaskSubmission(accessProfile.userId, {
    submissionId,
    decision: decision === "changes_requested" ? "changes_requested" : "approved",
    reviewNote,
  }, departmentAdminScope?.visibleDepartments);

  await createNotification({
    recipientUserId: result.recipientUserId,
    actorUserId: accessProfile.userId,
    taskId: result.taskId,
    submissionId: result.submissionId,
    type: result.decision === "approved" ? "task_approved" : "task_changes_requested",
    title:
      result.decision === "approved"
        ? `Task approved: ${result.taskTitle}`
        : `Changes requested: ${result.taskTitle}`,
    body:
      result.decision === "approved"
        ? "Your submitted work was approved."
        : "Your reviewer requested changes. Open the task to review feedback.",
  });

  revalidateTaskPaths(result.taskId);
  redirect(`/dashboard/tasks/${result.taskId}?status=${result.decision}`);
}

export async function approveTaskSubmissionFromWorkflow(formData: FormData) {
  const accessProfile = await requireTaskManager();
  const departmentAdminScope = await getDepartmentAdminScope(accessProfile);
  const submissionId = String(formData.get("submissionId") ?? "").trim();

  const result = await reviewTaskSubmission(accessProfile.userId, {
    submissionId,
    decision: "approved",
    reviewNote: "",
  }, departmentAdminScope?.visibleDepartments);

  await createNotification({
    recipientUserId: result.recipientUserId,
    actorUserId: accessProfile.userId,
    taskId: result.taskId,
    submissionId: result.submissionId,
    type: "task_approved",
    title: `Task approved: ${result.taskTitle}`,
    body: "Your submitted work was approved.",
  });

  revalidateTaskPaths(result.taskId);
  redirect("/dashboard/workflow?status=submitted");
}

export async function cancelTask(formData: FormData) {
  const taskId = String(formData.get("id") ?? "").trim();

  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  const accessProfile = await requireTaskManager();
  const departmentAdminScope = await getDepartmentAdminScope(accessProfile);

  if (departmentAdminScope) {
    const detail = await getTaskDetailById(taskId, departmentAdminScope.visibleDepartments);

    if (!detail) {
      redirect("/dashboard/workflow?error=unauthorized");
    }
  }

  await deleteTaskById(taskId);
  revalidateTaskPaths(taskId);
  redirect("/dashboard/workflow?status=todo");
}

export async function deleteTask(formData: FormData) {
  const taskId = String(formData.get("id") ?? "").trim();

  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  const accessProfile = await requireTaskManager();
  const departmentAdminScope = await getDepartmentAdminScope(accessProfile);

  if (departmentAdminScope) {
    const detail = await getTaskDetailById(taskId, departmentAdminScope.visibleDepartments);

    if (!detail) {
      redirect("/dashboard/workflow?error=unauthorized");
    }
  }

  await deleteTaskById(taskId);
  revalidateTaskPaths(taskId);
}
