"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAccessProfile } from "@/lib/authz";
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
    profileImageUrl: String(formData.get("profileImageUrl") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
    startDate: String(formData.get("startDate") ?? "").trim(),
  };
}

async function assertCanManageStaff() {
  const accessProfile = await getCurrentUserAccessProfile();

  if (
    !accessProfile?.isActive ||
    (!accessProfile.roles.includes("admin") && !accessProfile.roles.includes("hr"))
  ) {
    throw new Error("Unauthorized");
  }
}

export async function createStaffMember(formData: FormData) {
  await assertCanManageStaff();
  await addStaffMember(getStaffInput(formData));
  revalidatePath("/dashboard");
}

export async function updateStaffMember(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Staff member ID is required.");
  }

  await assertCanManageStaff();
  await updateStaffMemberById(id, getStaffInput(formData));
  revalidatePath("/dashboard");
}

export async function deleteStaffMember(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Staff member ID is required.");
  }

  await assertCanManageStaff();
  await removeStaffMember(id);
  revalidatePath("/dashboard");
}
