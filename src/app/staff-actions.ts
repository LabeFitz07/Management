"use server";

import { revalidatePath } from "next/cache";
import {
  addStaffMember,
  removeStaffMember,
  updateStaffMemberById,
  type StaffInput,
} from "@/lib/staff-store";

function getStaffInput(formData: FormData): StaffInput {
  return {
    employeeId: String(formData.get("employeeId") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
    startDate: String(formData.get("startDate") ?? "").trim(),
  };
}

export async function createStaffMember(formData: FormData) {
  await addStaffMember(getStaffInput(formData));
  revalidatePath("/");
}

export async function updateStaffMember(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Staff member ID is required.");
  }

  await updateStaffMemberById(id, getStaffInput(formData));
  revalidatePath("/");
}

export async function deleteStaffMember(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Staff member ID is required.");
  }

  await removeStaffMember(id);
  revalidatePath("/");
}
