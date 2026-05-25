"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getManagedDepartmentIdsForUser } from "@/lib/department-store";
import { getProfileImageFile, uploadProfileImage } from "@/lib/profile-image-storage";
import { isDepartmentAdminRole, isManagerRole, STAFF_ROLE_CODE } from "@/lib/roles";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type AdminSupabaseClient = ReturnType<typeof getSupabaseAdminClient>;

type DepartmentLookup = {
  id: string;
  name: string;
};

type JobRoleLookup = {
  id: string;
  title: string;
  department_id: string | null;
};

type BaseStaffInput = {
  userId: string;
  employeeId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  startDate: string;
  departmentId: string;
  jobRoleId: string;
  profileImageFile: File | null;
  profileImageUrl: string;
};

type StaffCreationInput = BaseStaffInput & {
  password: string;
};

type StaffUpdateInput = BaseStaffInput & {
  password: string;
};

const EMPLOYEE_ID_PREFIX = "EMP-";
const EMPLOYEE_ID_START = 1000;
const ALLOWED_STATUSES = new Set(["Active", "On Leave", "Inactive"]);

function readTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function getBaseStaffInput(formData: FormData) {
  const firstName = readTrimmed(formData, "firstName");
  const middleName = readTrimmed(formData, "middleName");
  const lastName = readTrimmed(formData, "lastName");
  const email = readTrimmed(formData, "email").toLowerCase();
  const phone = readTrimmed(formData, "phone");
  const employeeId = readTrimmed(formData, "employeeId");
  const status = readTrimmed(formData, "status") || "Active";
  const startDate = readTrimmed(formData, "startDate");
  const departmentId = readTrimmed(formData, "departmentId");
  const jobRoleId = readTrimmed(formData, "jobRoleId");
  const userId = readTrimmed(formData, "userId");
  const profileImageFile = getProfileImageFile(formData);

  if (profileImageFile === "invalid-photo") {
    return "invalid-photo" as const;
  }

  if (
    !firstName ||
    !lastName ||
    !email.includes("@") ||
    !phone ||
    !departmentId ||
    !jobRoleId ||
    !isIsoDate(startDate) ||
    !ALLOWED_STATUSES.has(status)
  ) {
    return "invalid" as const;
  }

  return {
    userId,
    employeeId,
    firstName,
    middleName,
    lastName,
    fullName: [firstName, middleName, lastName].filter(Boolean).join(" "),
    email,
    phone,
    status,
    startDate,
    departmentId,
    jobRoleId,
    profileImageFile,
    profileImageUrl: "",
  } satisfies BaseStaffInput;
}

function getStaffCreationInput(
  formData: FormData,
): StaffCreationInput | "invalid" | "mismatch" | "invalid-photo" {
  const baseInput = getBaseStaffInput(formData);

  if (typeof baseInput === "string") {
    return baseInput;
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) {
    return "invalid";
  }

  if (password !== confirmPassword) {
    return "mismatch";
  }

  return {
    ...baseInput,
    password,
  };
}

function getStaffUpdateInput(
  formData: FormData,
): StaffUpdateInput | "invalid" | "mismatch" | "invalid-photo" {
  const baseInput = getBaseStaffInput(formData);

  if (typeof baseInput === "string") {
    return baseInput;
  }

  if (!baseInput.userId) {
    return "invalid";
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password || confirmPassword) {
    if (password.length < 6 || password !== confirmPassword) {
      return "mismatch";
    }
  }

  return {
    ...baseInput,
    password,
  };
}

async function assertCanManageStaff() {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive || (!isManagerRole(accessProfile.roles) && !isDepartmentAdminRole(accessProfile.roles))) {
    redirect("/?error=unauthorized");
  }

  return accessProfile;
}

function getStaffRedirectHref(state: string) {
  return `/dashboard/staff?staff=${state}`;
}

async function generateEmployeeId(adminSupabase: AdminSupabaseClient) {
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
      EMPLOYEE_ID_START,
      Number.parseInt(data?.employee_id.replace(EMPLOYEE_ID_PREFIX, "") ?? "", 10) ||
        EMPLOYEE_ID_START - 1,
    ) + 1;

  return `${EMPLOYEE_ID_PREFIX}${String(nextNumericId).padStart(4, "0")}`;
}

async function getDepartmentById(adminSupabase: AdminSupabaseClient, departmentId: string) {
  const { data, error } = await adminSupabase
    .from("departments")
    .select("id, name")
    .eq("id", departmentId)
    .maybeSingle<DepartmentLookup>();

  if (error) {
    throw new Error(`Failed to load department: ${error.message}`);
  }

  if (!data) {
    throw new Error("Selected department no longer exists.");
  }

  return data;
}

async function getJobRoleById(adminSupabase: AdminSupabaseClient, jobRoleId: string) {
  const { data, error } = await adminSupabase
    .from("job_roles")
    .select("id, title, department_id")
    .eq("id", jobRoleId)
    .maybeSingle<JobRoleLookup>();

  if (error) {
    throw new Error(`Failed to load department role: ${error.message}`);
  }

  if (!data) {
    throw new Error("Selected department role no longer exists.");
  }

  return data;
}

async function getProfileByUserId(adminSupabase: AdminSupabaseClient, userId: string) {
  const { data, error } = await adminSupabase
    .from("app_user_profiles")
    .select("user_id, email, profile_image_url, department")
    .eq("user_id", userId)
    .maybeSingle<{ user_id: string; email: string; profile_image_url: string | null; department: string | null }>();

  if (error) {
    throw new Error(`Failed to load staff profile: ${error.message}`);
  }

  if (!data) {
    throw new Error("Staff account profile no longer exists.");
  }

  return data;
}

async function assertDepartmentAdminCanManageDepartment(
  accessProfile: Awaited<ReturnType<typeof getCurrentUserAccessProfile>>,
  departmentId: string,
) {
  if (!accessProfile || !isDepartmentAdminRole(accessProfile.roles)) {
    return;
  }

  const managedDepartmentIds = await getManagedDepartmentIdsForUser(accessProfile.userId);

  if (!managedDepartmentIds.includes(departmentId)) {
    redirect("/dashboard/staff?staff=error");
  }
}

function assertJobRoleBelongsToDepartment(jobRole: JobRoleLookup, departmentId: string) {
  if (jobRole.department_id && jobRole.department_id !== departmentId) {
    throw new Error("Selected department role does not belong to the selected department.");
  }
}

async function getStaffMemberDepartmentIdByEmail(adminSupabase: AdminSupabaseClient, email: string) {
  const { data, error } = await adminSupabase
    .from("staff_members")
    .select("department_id")
    .eq("email", email)
    .maybeSingle<{ department_id: string | null }>();

  if (error) {
    throw new Error(`Failed to load staff member scope: ${error.message}`);
  }

  return data?.department_id ?? null;
}

async function getAssignedRoleCodes(adminSupabase: AdminSupabaseClient, userId: string) {
  const { data, error } = await adminSupabase
    .from("user_role_assignments")
    .select("app_roles(code)")
    .eq("user_id", userId)
    .returns<Array<{ app_roles: { code: string } | null }>>();

  if (error) {
    throw new Error(`Failed to load assigned roles: ${error.message}`);
  }

  return data.map((assignment) => assignment.app_roles?.code).filter((role): role is string => Boolean(role));
}

async function upsertUserProfile(
  adminSupabase: AdminSupabaseClient,
  userId: string,
  input: BaseStaffInput,
  department: DepartmentLookup,
  jobRole: JobRoleLookup,
) {
  const { error } = await adminSupabase.from("app_user_profiles").upsert({
    user_id: userId,
    email: input.email,
    full_name: input.fullName,
    first_name: input.firstName,
    middle_name: input.middleName || null,
    last_name: input.lastName,
    phone: input.phone,
    department: department.name,
    job_title: jobRole.title,
    start_date: input.startDate,
    profile_image_url: input.profileImageUrl || null,
    is_active: input.status === "Active",
  });

  if (error) {
    throw new Error(`Failed to save user profile: ${error.message}`);
  }
}

async function replaceRoleAssignments(
  adminSupabase: AdminSupabaseClient,
  userId: string,
  roleId: string,
) {
  const { error: deleteError } = await adminSupabase
    .from("user_role_assignments")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`Failed to clear role assignments: ${deleteError.message}`);
  }

  const { error: insertError } = await adminSupabase.from("user_role_assignments").insert({
    user_id: userId,
    role_id: roleId,
  });

  if (insertError) {
    throw new Error(`Failed to assign role: ${insertError.message}`);
  }
}

async function createStaffRecord(
  adminSupabase: AdminSupabaseClient,
  input: BaseStaffInput,
  department: DepartmentLookup,
  jobRole: JobRoleLookup,
) {
  const employeeId = input.employeeId || (await generateEmployeeId(adminSupabase));
  const payload = {
    employee_id: employeeId,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    profile_image_url: input.profileImageUrl || null,
    department_id: department.id,
    job_role_id: jobRole.id,
    status: input.status,
    start_date: input.startDate,
  };
  const fallbackPayload = {
    employee_id: employeeId,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    department_id: department.id,
    job_role_id: jobRole.id,
    status: input.status,
    start_date: input.startDate,
  };

  const { error } = await adminSupabase.from("staff_members").insert(payload);

  if (!error) {
    return;
  }

  if (!error.message.toLowerCase().includes("profile_image_url")) {
    throw new Error(`Failed to create staff member: ${error.message}`);
  }

  const { error: fallbackError } = await adminSupabase.from("staff_members").insert(fallbackPayload);

  if (fallbackError) {
    throw new Error(`Failed to create staff member: ${fallbackError.message}`);
  }
}

async function updateStaffRecord(
  adminSupabase: AdminSupabaseClient,
  currentEmail: string,
  input: BaseStaffInput,
  department: DepartmentLookup,
  jobRole: JobRoleLookup,
) {
  const payload = {
    employee_id: input.employeeId || (await generateEmployeeId(adminSupabase)),
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    profile_image_url: input.profileImageUrl || null,
    department_id: department.id,
    job_role_id: jobRole.id,
    status: input.status,
    start_date: input.startDate,
  };
  const fallbackPayload = {
    employee_id: payload.employee_id,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    department_id: department.id,
    job_role_id: jobRole.id,
    status: input.status,
    start_date: input.startDate,
  };

  const { error } = await adminSupabase
    .from("staff_members")
    .update(payload)
    .eq("email", currentEmail);

  if (!error) {
    return;
  }

  if (!error.message.toLowerCase().includes("profile_image_url")) {
    throw new Error(`Failed to update staff member: ${error.message}`);
  }

  const { error: fallbackError } = await adminSupabase
    .from("staff_members")
    .update(fallbackPayload)
    .eq("email", currentEmail);

  if (fallbackError) {
    throw new Error(`Failed to update staff member: ${fallbackError.message}`);
  }
}

export async function createStaffMember(formData: FormData) {
  const accessProfile = await assertCanManageStaff();

  const input = getStaffCreationInput(formData);

  if (input === "invalid") {
    redirect(getStaffRedirectHref("invalid"));
  }

  if (input === "mismatch") {
    redirect(getStaffRedirectHref("mismatch"));
  }

  if (input === "invalid-photo") {
    redirect(getStaffRedirectHref("photo"));
  }

  let adminSupabase: AdminSupabaseClient;

  try {
    adminSupabase = getSupabaseAdminClient();
  } catch {
    redirect(getStaffRedirectHref("setup"));
  }

  const department = await getDepartmentById(adminSupabase, input.departmentId);
  const jobRole = await getJobRoleById(adminSupabase, input.jobRoleId);
  await assertDepartmentAdminCanManageDepartment(accessProfile, department.id);
  assertJobRoleBelongsToDepartment(jobRole, department.id);
  const staffRoleId = await adminSupabase
    .from("app_roles")
    .select("id")
    .eq("code", STAFF_ROLE_CODE)
    .maybeSingle<{ id: string }>()
    .then(({ data, error }) => {
      if (error || !data) {
        throw new Error(error?.message ?? "Staff role is missing.");
      }

      return data.id;
    });

  const { data: createdUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      first_name: input.firstName,
      middle_name: input.middleName,
      last_name: input.lastName,
      phone: input.phone,
      department: department.name,
      job_title: jobRole.title,
      start_date: input.startDate,
      profile_image_url: "",
    },
  });

  if (createError || !createdUser.user?.id) {
    const message = createError?.message.toLowerCase() ?? "";

    if (message.includes("already") || message.includes("registered")) {
      redirect(getStaffRedirectHref("exists"));
    }

    redirect(getStaffRedirectHref("error"));
  }

  let didProfileImageUploadFail = false;

  try {
    input.profileImageUrl = await uploadProfileImage(adminSupabase, createdUser.user.id, input.profileImageFile);
  } catch {
    didProfileImageUploadFail = Boolean(input.profileImageFile);
  }

  if (input.profileImageUrl) {
    await adminSupabase.auth.admin.updateUserById(createdUser.user.id, {
      user_metadata: {
        full_name: input.fullName,
        first_name: input.firstName,
        middle_name: input.middleName,
        last_name: input.lastName,
        phone: input.phone,
        department: department.name,
        job_title: jobRole.title,
        start_date: input.startDate,
        profile_image_url: input.profileImageUrl,
      },
    });
  }

  try {
    await upsertUserProfile(adminSupabase, createdUser.user.id, input, department, jobRole);
    await replaceRoleAssignments(adminSupabase, createdUser.user.id, staffRoleId);
    await createStaffRecord(adminSupabase, input, department, jobRole);
  } catch {
    redirect(getStaffRedirectHref("setup"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
  revalidatePath("/staff");
  revalidatePath("/account");
  redirect(getStaffRedirectHref(didProfileImageUploadFail ? "photo-upload" : "created"));
}

export async function updateStaffMember(formData: FormData) {
  const accessProfile = await assertCanManageStaff();

  const input = getStaffUpdateInput(formData);

  if (input === "invalid") {
    redirect(getStaffRedirectHref("invalid"));
  }

  if (input === "mismatch") {
    redirect(getStaffRedirectHref("mismatch"));
  }

  if (input === "invalid-photo") {
    redirect(getStaffRedirectHref("photo"));
  }

  const adminSupabase = getSupabaseAdminClient();
  const department = await getDepartmentById(adminSupabase, input.departmentId);
  const jobRole = await getJobRoleById(adminSupabase, input.jobRoleId);
  const currentProfile = await getProfileByUserId(adminSupabase, input.userId);
  const currentDepartmentId = await getStaffMemberDepartmentIdByEmail(adminSupabase, currentProfile.email);
  const currentRoleCodes = await getAssignedRoleCodes(adminSupabase, input.userId);
  await assertDepartmentAdminCanManageDepartment(accessProfile, department.id);
  assertJobRoleBelongsToDepartment(jobRole, department.id);
  const staffRoleId = await adminSupabase
    .from("app_roles")
    .select("id")
    .eq("code", STAFF_ROLE_CODE)
    .maybeSingle<{ id: string }>()
    .then(({ data, error }) => {
      if (error || !data) {
        throw new Error(error?.message ?? "Staff role is missing.");
      }

      return data.id;
    });

  if (currentDepartmentId) {
    await assertDepartmentAdminCanManageDepartment(accessProfile, currentDepartmentId);
  }

  if (isDepartmentAdminRole(accessProfile.roles) && !currentRoleCodes.includes(STAFF_ROLE_CODE)) {
    redirect(getStaffRedirectHref("error"));
  }

  let didProfileImageUploadFail = false;
  input.profileImageUrl = currentProfile.profile_image_url ?? "";

  try {
    const uploadedUrl = await uploadProfileImage(adminSupabase, input.userId, input.profileImageFile);
    input.profileImageUrl = uploadedUrl || input.profileImageUrl;
  } catch {
    didProfileImageUploadFail = Boolean(input.profileImageFile);
  }

  const userMetadata = {
    full_name: input.fullName,
    first_name: input.firstName,
    middle_name: input.middleName,
    last_name: input.lastName,
    phone: input.phone,
    department: department.name,
    job_title: jobRole.title,
    start_date: input.startDate,
    profile_image_url: input.profileImageUrl,
  };
  const authPayload = input.password
    ? { email: input.email, password: input.password, user_metadata: userMetadata }
    : { email: input.email, user_metadata: userMetadata };

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(input.userId, authPayload);

  if (authError) {
    const message = authError.message.toLowerCase();

    if (message.includes("already") || message.includes("registered")) {
      redirect(getStaffRedirectHref("exists"));
    }

    redirect(getStaffRedirectHref("error"));
  }

  try {
    await upsertUserProfile(adminSupabase, input.userId, input, department, jobRole);
    await replaceRoleAssignments(adminSupabase, input.userId, staffRoleId);
    await updateStaffRecord(adminSupabase, currentProfile.email, input, department, jobRole);
  } catch {
    redirect(getStaffRedirectHref("setup"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
  revalidatePath("/staff");
  revalidatePath("/account");
  redirect(getStaffRedirectHref(didProfileImageUploadFail ? "photo-upload" : "updated"));
}

export async function deleteStaffMember(formData: FormData) {
  const accessProfile = await assertCanManageStaff();

  const userId = readTrimmed(formData, "userId");

  if (!userId) {
    redirect(getStaffRedirectHref("error"));
  }

  const adminSupabase = getSupabaseAdminClient();
  const currentProfile = await getProfileByUserId(adminSupabase, userId);
  const currentDepartmentId = await getStaffMemberDepartmentIdByEmail(adminSupabase, currentProfile.email);
  const currentRoleCodes = await getAssignedRoleCodes(adminSupabase, userId);

  if (currentDepartmentId) {
    await assertDepartmentAdminCanManageDepartment(accessProfile, currentDepartmentId);
  }

  if (isDepartmentAdminRole(accessProfile.roles) && !currentRoleCodes.includes(STAFF_ROLE_CODE)) {
    redirect(getStaffRedirectHref("error"));
  }

  const { error: deleteStaffError } = await adminSupabase
    .from("staff_members")
    .delete()
    .eq("email", currentProfile.email);

  if (deleteStaffError) {
    redirect(getStaffRedirectHref("error"));
  }

  const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    redirect(getStaffRedirectHref("error"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
  revalidatePath("/staff");
  revalidatePath("/account");
  redirect(getStaffRedirectHref("deleted"));
}
