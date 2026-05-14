"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
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
    (!accessProfile.roles.includes("admin") && !accessProfile.roles.includes("hr"))
  ) {
    throw new Error("Unauthorized");
  }
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

  await assertCanApproveStaff();
  await approveStaffRegistrationRequest(requestId);
  revalidatePath("/dashboard");
}
