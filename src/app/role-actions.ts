"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getManagedDepartmentIdsForUser } from "@/lib/department-store";
import { isDepartmentAdminRole, isManagerRole } from "@/lib/roles";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

function getRolesRedirectHref(state?: string) {
  return state ? `/dashboard/roles?role=${state}` : "/dashboard/roles";
}

async function assertCanManageDepartmentRoles() {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive || (!isManagerRole(accessProfile.roles) && !isDepartmentAdminRole(accessProfile.roles))) {
    redirect("/?error=unauthorized");
  }

  return accessProfile;
}

export async function createRoleAction(formData: FormData) {
  const accessProfile = await assertCanManageDepartmentRoles();
  const roleName = String(formData.get("roleName") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "").trim();

  if (!roleName || !departmentId) {
    redirect(getRolesRedirectHref("invalid"));
  }

  if (isDepartmentAdminRole(accessProfile.roles)) {
    const managedDepartmentIds = await getManagedDepartmentIdsForUser(accessProfile.userId);

    if (!managedDepartmentIds.includes(departmentId)) {
      redirect(getRolesRedirectHref("error"));
    }
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: existingRole, error: existingRoleError } = await adminSupabase
    .from("job_roles")
    .select("id")
    .eq("department_id", departmentId)
    .eq("title", roleName)
    .maybeSingle<{ id: string }>();

  if (existingRoleError) {
    throw new Error(`Failed to read existing department roles: ${existingRoleError.message}`);
  }

  if (existingRole) {
    redirect(getRolesRedirectHref("exists"));
  }

  const { error: insertError } = await adminSupabase.from("job_roles").insert({
    title: roleName,
    department_id: departmentId,
  });

  if (insertError) {
    throw new Error(`Failed to create department role: ${insertError.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/roles");
  revalidatePath("/dashboard/staff");
  redirect(getRolesRedirectHref("created"));
}
