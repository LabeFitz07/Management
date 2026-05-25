"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getDepartments, getManagedDepartmentIdsForUser } from "@/lib/department-store";
import { isDepartmentAdminRole, isManagerRole } from "@/lib/roles";
import {
  approveStaffRegistrationRequest,
  isMissingRegistrationTableError,
  submitStaffRegistrationRequest,
  type StaffRegistrationInput,
} from "@/lib/registration-store";

function getRegistrationInput(formData: FormData): StaffRegistrationInput {
  return {
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    startDate: String(formData.get("startDate") ?? "").trim(),
  };
}

async function assertCanApproveStaff() {
  const accessProfile = await getCurrentUserAccessProfile();

  if (
    !accessProfile?.isActive ||
    (!isManagerRole(accessProfile.roles) && !isDepartmentAdminRole(accessProfile.roles))
  ) {
    throw new Error("Unauthorized");
  }

  return accessProfile;
}

export async function registerStaffRequest(formData: FormData) {
  try {
    await submitStaffRegistrationRequest(getRegistrationInput(formData));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (isMissingRegistrationTableError(message)) {
      redirect("/?register=1&register_error=schema");
    }

    redirect("/?register=1&register_error=submit");
  }

  redirect("/?registered=success");
}

export async function approveStaffRequest(formData: FormData) {
  const requestId = String(formData.get("id") ?? "").trim();

  if (!requestId) {
    throw new Error("Registration request ID is required.");
  }

  const accessProfile = await assertCanApproveStaff();
  const managedDepartmentNames =
    accessProfile && isDepartmentAdminRole(accessProfile.roles)
      ? await getManagedDepartmentIdsForUser(accessProfile.userId)
          .then((departmentIds) => getDepartments(departmentIds))
          .then((departments) => departments.map((department) => department.name))
      : undefined;

  if (accessProfile && isDepartmentAdminRole(accessProfile.roles) && (!managedDepartmentNames || managedDepartmentNames.length === 0)) {
    throw new Error("Unauthorized");
  }

  await approveStaffRegistrationRequest(requestId, { managedDepartmentNames });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
  redirect("/dashboard/staff?staff=approved");
}
