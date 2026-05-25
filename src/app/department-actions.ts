"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { uploadProfileImage, getProfileImageFile } from "@/lib/profile-image-storage";
import {
  createDepartment,
  deleteDepartment,
  getManagedDepartmentIdsForUser,
  updateDepartment,
} from "@/lib/department-store";
import { isDepartmentAdminRole, isManagerRole } from "@/lib/roles";

export async function createDepartmentAction(formData: FormData) {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive || !isManagerRole(accessProfile.roles)) {
    redirect("/?error=unauthorized");
  }

  const departmentName = String(formData.get("departmentName") ?? "").trim();

  if (!departmentName) {
    throw new Error("Department name is required.");
  }

  await createDepartment(departmentName);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

async function getOrCreateDepartmentId(adminSupabase: ReturnType<typeof getSupabaseAdminClient>, name: string) {
  const { data: existingRow, error: existingError } = await adminSupabase
    .from("departments")
    .select("id")
    .eq("name", name)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw new Error(`Failed to read departments: ${existingError.message}`);
  }

  if (existingRow) {
    return existingRow.id;
  }

  const { data, error } = await adminSupabase
    .from("departments")
    .insert({ name })
    .select("id")
    .single<{ id: string }>();

  if (!error) {
    return data.id;
  }

  const { data: retryRow, error: retryError } = await adminSupabase
    .from("departments")
    .select("id")
    .eq("name", name)
    .maybeSingle<{ id: string }>();

  if (retryError || !retryRow) {
    throw new Error(`Failed to create department: ${error.message}`);
  }

  return retryRow.id;
}

async function getOrCreateJobRoleId(adminSupabase: ReturnType<typeof getSupabaseAdminClient>, title: string) {
  const { data: existingRow, error: existingError } = await adminSupabase
    .from("job_roles")
    .select("id")
    .eq("title", title)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw new Error(`Failed to read job roles: ${existingError.message}`);
  }

  if (existingRow) {
    return existingRow.id;
  }

  const { data, error } = await adminSupabase
    .from("job_roles")
    .insert({ title })
    .select("id")
    .single<{ id: string }>();

  if (!error) {
    return data.id;
  }

  const { data: retryRow, error: retryError } = await adminSupabase
    .from("job_roles")
    .select("id")
    .eq("title", title)
    .maybeSingle<{ id: string }>();

  if (retryError || !retryRow) {
    throw new Error(`Failed to create job role: ${error.message}`);
  }

  return retryRow.id;
}

async function getOrCreateRoleId(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  code: string,
  name: string,
) {
  const { data: existingRow, error: existingError } = await adminSupabase
    .from("app_roles")
    .select("id")
    .eq("code", code)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    const { data: fallbackRows, error: fallbackError } = await adminSupabase
      .from("app_roles")
      .select("id")
      .eq("code", code)
      .limit(1)
      .returns<{ id: string }[]>();

    if (fallbackError || !fallbackRows || fallbackRows.length === 0) {
      const { data: created, error: createError } = await adminSupabase
        .from("app_roles")
        .insert({ code, name })
        .select("id")
        .single<{ id: string }>();

      if (createError || !created) {
        throw new Error(`Failed to resolve role ${code}: ${createError?.message ?? existingError.message}`);
      }

      return created.id;
    }

    return fallbackRows[0].id;
  }

  if (existingRow) {
    return existingRow.id;
  }

  const { data, error } = await adminSupabase
    .from("app_roles")
    .insert({ code, name })
    .select("id")
    .single<{ id: string }>();

  if (!error) {
    return data.id;
  }

  const { data: retryRow, error: retryError } = await adminSupabase
    .from("app_roles")
    .select("id")
    .eq("code", code)
    .maybeSingle<{ id: string }>();

  if (retryError || !retryRow) {
    throw new Error(`Failed to get or create role ${code}: ${error.message}`);
  }

  return retryRow.id;
}

async function generateEmployeeId(adminSupabase: ReturnType<typeof getSupabaseAdminClient>) {
  const { data, error } = await adminSupabase
    .from("staff_members")
    .select("employee_id")
    .order("employee_id", { ascending: false })
    .limit(1)
    .maybeSingle<{ employee_id: string }>();

  if (error) {
    throw new Error(`Failed to generate employee ID: ${error.message}`);
  }

  const nextNumericId =
    Math.max(
      1000,
      Number.parseInt(data?.employee_id.replace("EMP-", "") ?? "", 10) || 999,
    ) + 1;

  return `EMP-${String(nextNumericId).padStart(4, "0")}`;
}

async function getOrCreateAuthUser(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  email: string,
  password: string,
  firstName: string,
  middleName: string,
  lastName: string,
  phone: string,
  department: string,
) {
  const normalizedEmail = email.toLowerCase();
  const { data: existingUsers, error: listError } = await adminSupabase.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to list auth users: ${listError.message}`);
  }

  const existingUser = existingUsers.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
  const fullName = `${firstName} ${middleName ? `${middleName} ` : ""}${lastName}`.trim();

  if (existingUser?.id) {
    await adminSupabase.auth.admin.updateUserById(existingUser.id, {
      user_metadata: {
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        full_name: fullName,
        phone,
        department,
      },
    });

    return existingUser.id;
  }

  const { data: createdUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      full_name: fullName,
      phone,
      department,
    },
  });

  if (createError || !createdUser.user?.id) {
    throw new Error(`Failed to create admin user: ${createError?.message ?? "unknown error"}`);
  }

  return createdUser.user.id;
}

async function getDepartmentById(adminSupabase: ReturnType<typeof getSupabaseAdminClient>, departmentId: string) {
  const { data, error } = await adminSupabase
    .from("departments")
    .select("id, name")
    .eq("id", departmentId)
    .maybeSingle<{ id: string; name: string }>();

  if (error) {
    throw new Error(`Failed to load department: ${error.message}`);
  }

  if (!data) {
    throw new Error("Department not found.");
  }

  return data;
}

async function getDepartmentAdminAssignment(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  departmentId: string,
) {
  const { data, error } = await adminSupabase
    .from("department_admin_assignments")
    .select("user_id")
    .eq("department_id", departmentId)
    .eq("is_primary", true)
    .maybeSingle<{ user_id: string }>();

  if (error) {
    throw new Error(`Failed to load department admin assignment: ${error.message}`);
  }

  return data;
}

async function updateDepartmentMemberProfiles(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  oldDepartmentName: string,
  newDepartmentName: string,
) {
  if (oldDepartmentName === newDepartmentName) {
    return;
  }

  const { error } = await adminSupabase
    .from("app_user_profiles")
    .update({ department: newDepartmentName })
    .eq("department", oldDepartmentName);

  if (error) {
    throw new Error(`Failed to update department profiles: ${error.message}`);
  }
}

async function updateDepartmentAdminAuthUser(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  {
    email,
    password,
    firstName,
    middleName,
    lastName,
    phone,
    departmentName,
    profileImageUrl,
  }: {
    email: string;
    password: string;
    firstName: string;
    middleName: string;
    lastName: string;
    phone: string;
    departmentName: string;
    profileImageUrl: string;
  },
) {
  const fullName = `${firstName} ${middleName ? `${middleName} ` : ""}${lastName}`.trim();
  const payload = password
    ? {
        email,
        password,
        user_metadata: {
          first_name: firstName,
          middle_name: middleName || null,
          last_name: lastName,
          full_name: fullName,
          phone,
          department: departmentName,
          profile_image_url: profileImageUrl || "",
        },
      }
    : {
        email,
        user_metadata: {
          first_name: firstName,
          middle_name: middleName || null,
          last_name: lastName,
          full_name: fullName,
          phone,
          department: departmentName,
          profile_image_url: profileImageUrl || "",
        },
      };

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, payload);

  if (error) {
    throw new Error(`Failed to update department admin auth user: ${error.message}`);
  }
}

export async function createDepartmentWithAdminAction(formData: FormData) {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive || !isManagerRole(accessProfile.roles)) {
    redirect("/?error=unauthorized");
  }

  const departmentName = String(formData.get("departmentName") ?? "").trim();
  const adminFirstName = String(formData.get("adminFirstName") ?? "").trim();
  const adminMiddleName = String(formData.get("adminMiddleName") ?? "").trim();
  const adminLastName = String(formData.get("adminLastName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const adminPhone = String(formData.get("adminPhone") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "");
  const adminConfirmPassword = String(formData.get("adminConfirmPassword") ?? "");
  const profileImageFile = getProfileImageFile(formData);

  if (
    !departmentName ||
    !adminFirstName ||
    !adminLastName ||
    !adminEmail ||
    !adminPhone ||
    adminPassword.length < 6 ||
    adminPassword !== adminConfirmPassword
  ) {
    throw new Error(
      "Department name and valid admin credentials are required. Password must be at least 6 characters and match confirmation.",
    );
  }

  if (profileImageFile === "invalid-photo") {
    throw new Error("Profile image must be JPEG, PNG, or WEBP and under 5MB.");
  }

  const department = await createDepartment(departmentName);
  const adminSupabase = getSupabaseAdminClient();
  const adminFullName = `${adminFirstName} ${adminMiddleName ? `${adminMiddleName} ` : ""}${adminLastName}`.trim();
  const userId = await getOrCreateAuthUser(
    adminSupabase,
    adminEmail,
    adminPassword,
    adminFirstName,
    adminMiddleName,
    adminLastName,
    adminPhone,
    departmentName,
  );

  let profileImageUrl = "";

  if (profileImageFile) {
    profileImageUrl = await uploadProfileImage(adminSupabase, userId, profileImageFile);
    await adminSupabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        profile_image_url: profileImageUrl,
      },
    });
  }

  const roleId = await getOrCreateRoleId(adminSupabase, "department-admin", "Department Admin");

  const { error: roleAssignmentError } = await adminSupabase.from("user_role_assignments").upsert({
    user_id: userId,
    role_id: roleId,
  });

  if (roleAssignmentError) {
    throw new Error(`Failed to assign department admin role: ${roleAssignmentError.message}`);
  }

  const departmentId = await getOrCreateDepartmentId(adminSupabase, departmentName);
  const jobRoleId = await getOrCreateJobRoleId(adminSupabase, "Department Admin");

  const { error: profileError } = await adminSupabase.from("app_user_profiles").upsert({
    user_id: userId,
    email: adminEmail,
    full_name: adminFullName,
    first_name: adminFirstName,
    middle_name: adminMiddleName || null,
    last_name: adminLastName,
    phone: adminPhone,
    department: departmentName,
    job_title: "Department Admin",
    is_active: true,
    profile_image_url: profileImageUrl || null,
  });

  if (profileError) {
    throw new Error(`Failed to create admin profile: ${profileError.message}`);
  }

  const { data: existingStaff, error: existingStaffError } = await adminSupabase
    .from("staff_members")
    .select("id")
    .eq("email", adminEmail)
    .maybeSingle<{ id: string }>();

  if (existingStaffError) {
    throw new Error(`Failed to check existing staff member: ${existingStaffError.message}`);
  }

  if (!existingStaff) {
    const employeeId = await generateEmployeeId(adminSupabase);
    const { error: staffInsertError } = await adminSupabase.from("staff_members").insert({
      employee_id: employeeId,
      full_name: adminFullName,
      email: adminEmail,
      phone: adminPhone,
      department_id: departmentId,
      job_role_id: jobRoleId,
      status: "Active",
      start_date: new Date().toISOString().slice(0, 10),
    });

    if (staffInsertError) {
      throw new Error(`Failed to create staff member: ${staffInsertError.message}`);
    }
  }

  const { error: assignmentError } = await adminSupabase.from("department_admin_assignments").upsert({
    department_id: department.id,
    user_id: userId,
    is_primary: true,
  });

  if (assignmentError) {
    throw new Error(`Failed to assign department admin: ${assignmentError.message}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateDepartmentAction(formData: FormData) {
  const accessProfile = await getCurrentUserAccessProfile();
  const departmentId = String(formData.get("departmentId") ?? "").trim();
  const departmentName = String(formData.get("departmentName") ?? "").trim();
  const adminUserId = String(formData.get("adminUserId") ?? "").trim();
  const adminFirstName = String(formData.get("adminFirstName") ?? "").trim();
  const adminMiddleName = String(formData.get("adminMiddleName") ?? "").trim();
  const adminLastName = String(formData.get("adminLastName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const adminPhone = String(formData.get("adminPhone") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "");
  const adminConfirmPassword = String(formData.get("adminConfirmPassword") ?? "");
  const profileImageFile = getProfileImageFile(formData);

  if (!accessProfile?.isActive || (!isManagerRole(accessProfile.roles) && !isDepartmentAdminRole(accessProfile.roles))) {
    redirect("/?error=unauthorized");
  }

  if (!departmentId) {
    throw new Error("Department ID is required.");
  }

  if (!departmentName) {
    throw new Error("Department name is required.");
  }

  if (
    !adminFirstName ||
    !adminLastName ||
    !adminEmail ||
    !adminPhone
  ) {
    throw new Error("Department admin name, email, and phone are required.");
  }

  if (profileImageFile === "invalid-photo") {
    throw new Error("Profile image must be JPEG, PNG, or WEBP and under 5MB.");
  }

  if ((adminPassword || adminConfirmPassword) && (adminPassword.length < 6 || adminPassword !== adminConfirmPassword)) {
    throw new Error("Admin password must be at least 6 characters and match confirmation.");
  }

  const adminSupabase = getSupabaseAdminClient();
  if (isDepartmentAdminRole(accessProfile.roles)) {
    const managedDepartmentIds = await getManagedDepartmentIdsForUser(accessProfile.userId);

    if (!managedDepartmentIds.includes(departmentId)) {
      redirect("/?error=unauthorized");
    }
  }

  const existingDepartment = await getDepartmentById(adminSupabase, departmentId);
  const updatedDepartment = await updateDepartment(departmentId, departmentName);
  await updateDepartmentMemberProfiles(adminSupabase, existingDepartment.name, updatedDepartment.name);

  const roleId = await getOrCreateRoleId(adminSupabase, "department-admin", "Department Admin");
  const departmentAdminAssignment = await getDepartmentAdminAssignment(adminSupabase, departmentId);
  const resolvedAdminUserId =
    adminUserId ||
    departmentAdminAssignment?.user_id ||
    (await getOrCreateAuthUser(
      adminSupabase,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminMiddleName,
      adminLastName,
      adminPhone,
      updatedDepartment.name,
    ));

  let profileImageUrl = "";

  const { data: existingProfile, error: existingProfileError } = await adminSupabase
    .from("app_user_profiles")
    .select("profile_image_url")
    .eq("user_id", resolvedAdminUserId)
    .maybeSingle<{ profile_image_url: string | null }>();

  if (existingProfileError) {
    throw new Error(`Failed to load department admin profile: ${existingProfileError.message}`);
  }

  profileImageUrl = existingProfile?.profile_image_url ?? "";

  if (profileImageFile) {
    profileImageUrl = await uploadProfileImage(adminSupabase, resolvedAdminUserId, profileImageFile);
  }

  await updateDepartmentAdminAuthUser(adminSupabase, resolvedAdminUserId, {
    email: adminEmail,
    password: adminPassword,
    firstName: adminFirstName,
    middleName: adminMiddleName,
    lastName: adminLastName,
    phone: adminPhone,
    departmentName: updatedDepartment.name,
    profileImageUrl,
  });

  const adminFullName = `${adminFirstName} ${adminMiddleName ? `${adminMiddleName} ` : ""}${adminLastName}`.trim();

  const { error: profileError } = await adminSupabase.from("app_user_profiles").upsert({
    user_id: resolvedAdminUserId,
    email: adminEmail,
    full_name: adminFullName,
    first_name: adminFirstName,
    middle_name: adminMiddleName || null,
    last_name: adminLastName,
    phone: adminPhone,
    department: updatedDepartment.name,
    job_title: "Department Admin",
    is_active: true,
    profile_image_url: profileImageUrl || null,
  });

  if (profileError) {
    throw new Error(`Failed to update department admin profile: ${profileError.message}`);
  }

  const { error: roleAssignmentError } = await adminSupabase.from("user_role_assignments").upsert({
    user_id: resolvedAdminUserId,
    role_id: roleId,
  });

  if (roleAssignmentError) {
    throw new Error(`Failed to assign department admin role: ${roleAssignmentError.message}`);
  }

  const { error: assignmentError } = await adminSupabase.from("department_admin_assignments").upsert({
    department_id: updatedDepartment.id,
    user_id: resolvedAdminUserId,
    is_primary: true,
  });

  if (assignmentError) {
    throw new Error(`Failed to update department admin assignment: ${assignmentError.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/departments");
  revalidatePath(`/dashboard/departments/${departmentId}/edit`);
  revalidatePath("/account");
  redirect("/dashboard");
}

export async function deleteDepartmentAction(formData: FormData) {
  const accessProfile = await getCurrentUserAccessProfile();
  const departmentId = String(formData.get("departmentId") ?? "").trim();

  if (!accessProfile?.isActive || !isManagerRole(accessProfile.roles)) {
    redirect("/?error=unauthorized");
  }

  if (!departmentId) {
    throw new Error("Department ID is required.");
  }

  await deleteDepartment(departmentId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
