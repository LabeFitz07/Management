"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import {
  createTaskAssignment,
  deleteTaskById,
  updateTaskAssignmentById,
  updateTaskStatusById,
  type TaskInput,
} from "@/lib/task-store";

function getTaskInput(formData: FormData): TaskInput {
  return {
    assigneeId: String(formData.get("assigneeId") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
    priority: String(formData.get("priority") ?? "").trim(),
    dueDate: String(formData.get("dueDate") ?? "").trim(),
  };
}

async function requireAccessProfile() {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/?error=session");
  }

  return accessProfile;
}

async function requireAdmin() {
  const accessProfile = await requireAccessProfile();

  if (!accessProfile.roles.includes("admin")) {
    redirect("/staff");
  }

  return accessProfile;
}

export async function createTask(formData: FormData) {
  const accessProfile = await requireAdmin();
  await createTaskAssignment(accessProfile.userId, getTaskInput(formData));
  revalidatePath("/dashboard");
  revalidatePath("/staff");
  redirect("/dashboard");
}

export async function updateTask(formData: FormData) {
  const taskId = String(formData.get("id") ?? "").trim();

  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  await requireAdmin();
  await updateTaskAssignmentById(taskId, getTaskInput(formData));
  revalidatePath("/dashboard");
  revalidatePath("/staff");
  redirect("/dashboard");
}

export async function updateTaskStatus(formData: FormData) {
  const taskId = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  const accessProfile = await requireAccessProfile();

  if (accessProfile.roles.includes("admin")) {
    await updateTaskStatusById(taskId, status);
    revalidatePath("/dashboard");
    revalidatePath("/staff");
    return;
  }

  await updateTaskStatusById(taskId, status, accessProfile.userId);
  revalidatePath("/staff");
}

export async function deleteTask(formData: FormData) {
  const taskId = String(formData.get("id") ?? "").trim();

  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  await requireAdmin();
  await deleteTaskById(taskId);
  revalidatePath("/dashboard");
  revalidatePath("/staff");
}
