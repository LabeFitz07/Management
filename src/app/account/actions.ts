"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAccountProfile } from "@/lib/account-store";
import { getProfileImageFile, uploadProfileImage } from "@/lib/profile-image-storage";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type AdminSupabaseClient = ReturnType<typeof getSupabaseAdminClient>;

type AccountInput = {
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  gender: string;
  age: number;
  phone: string;
  email: string;
  password: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  department: string;
  jobTitle: string;
  startDate: string;
  profileImageFile: File | null;
  profileImageUrl: string;
};

const EMPLOYEE_ID_PREFIX = "EMP-";
const EMPLOYEE_ID_START = 1000;
const ALLOWED_GENDERS = new Set(["Female", "Male", "Non-binary", "Prefer not to say"]);

function readTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function getAccountInput(formData: FormData): AccountInput | "invalid" | "mismatch" | "invalid-photo" {
  const firstName = readTrimmed(formData, "firstName");
  const middleName = readTrimmed(formData, "middleName");
  const lastName = readTrimmed(formData, "lastName");
  const gender = readTrimmed(formData, "gender");
  const ageValue = Number.parseInt(readTrimmed(formData, "age"), 10);
  const phone = readTrimmed(formData, "phone");
  const email = readTrimmed(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const addressLine1 = readTrimmed(formData, "addressLine1");
  const addressLine2 = readTrimmed(formData, "addressLine2");
  const city = readTrimmed(formData, "city");
  const stateProvince = readTrimmed(formData, "stateProvince");
  const postalCode = readTrimmed(formData, "postalCode");
  const country = readTrimmed(formData, "country");
  const department = readTrimmed(formData, "department");
  const jobTitle = readTrimmed(formData, "jobTitle");
  const startDate = readTrimmed(formData, "startDate");
  const profileImageFile = getProfileImageFile(formData);

  if (profileImageFile === "invalid-photo") {
    return "invalid-photo";
  }

  const requiredValues = [
    firstName,
    lastName,
    gender,
    phone,
    email,
    addressLine1,
    city,
    stateProvince,
    postalCode,
    country,
    department,
    jobTitle,
    startDate,
  ];

  if (
    requiredValues.some((value) => !value) ||
    !email.includes("@") ||
    !Number.isInteger(ageValue) ||
    ageValue < 1 ||
    ageValue > 130 ||
    !ALLOWED_GENDERS.has(gender) ||
    !isIsoDate(startDate)
  ) {
    return "invalid";
  }

  if (password || confirmPassword) {
    if (password.length < 6 || password !== confirmPassword) {
      return "mismatch";
    }
  }

  return {
    firstName,
    middleName,
    lastName,
    fullName: [firstName, middleName, lastName].filter(Boolean).join(" "),
    gender,
    age: ageValue,
    phone,
    email,
    password,
    addressLine1,
    addressLine2,
    city,
    stateProvince,
    postalCode,
    country,
    department,
    jobTitle,
    startDate,
    profileImageFile,
    profileImageUrl: "",
  };
}

async function getOrCreateDepartmentId(adminSupabase: AdminSupabaseClient, name: string) {
  const { data: existingDepartment, error: existingError } = await adminSupabase
    .from("departments")
    .select("id")
    .eq("name", name)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw new Error(`Failed to read department: ${existingError.message}`);
  }

  if (existingDepartment) {
    return existingDepartment.id;
  }

  const { data, error } = await adminSupabase
    .from("departments")
    .insert({ name })
    .select("id")
    .single<{ id: string }>();

  if (!error) {
    return data.id;
  }

  const { data: retryDepartment, error: retryError } = await adminSupabase
    .from("departments")
    .select("id")
    .eq("name", name)
    .maybeSingle<{ id: string }>();

  if (retryError || !retryDepartment) {
    throw new Error(`Failed to create department: ${error.message}`);
  }

  return retryDepartment.id;
}

async function getOrCreateJobRoleId(adminSupabase: AdminSupabaseClient, title: string, departmentId: string) {
  const { data: existingJobRole, error: existingError } = await adminSupabase
    .from("job_roles")
    .select("id")
    .eq("title", title)
    .eq("department_id", departmentId)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw new Error(`Failed to read job role: ${existingError.message}`);
  }

  if (existingJobRole) {
    return existingJobRole.id;
  }

  const { data, error } = await adminSupabase
    .from("job_roles")
    .insert({ title, department_id: departmentId })
    .select("id")
    .single<{ id: string }>();

  if (!error) {
    return data.id;
  }

  const { data: retryJobRole, error: retryError } = await adminSupabase
    .from("job_roles")
    .select("id")
    .eq("title", title)
    .eq("department_id", departmentId)
    .maybeSingle<{ id: string }>();

  if (retryError || !retryJobRole) {
    throw new Error(`Failed to create job role: ${error.message}`);
  }

  return retryJobRole.id;
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

async function upsertProfile(adminSupabase: AdminSupabaseClient, userId: string, input: AccountInput) {
  const { error } = await adminSupabase.from("app_user_profiles").upsert({
    user_id: userId,
    email: input.email,
    full_name: input.fullName,
    first_name: input.firstName,
    middle_name: input.middleName || null,
    last_name: input.lastName,
    gender: input.gender,
    age: input.age,
    phone: input.phone,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2 || null,
    city: input.city,
    state_province: input.stateProvince,
    postal_code: input.postalCode,
    country: input.country,
    department: input.department,
    job_title: input.jobTitle,
    start_date: input.startDate,
    profile_image_url: input.profileImageUrl || null,
    is_active: true,
  });

  if (error) {
    throw new Error(`Failed to update account profile: ${error.message}`);
  }
}

async function findStaffMemberId(
  adminSupabase: AdminSupabaseClient,
  currentEmail: string,
  nextEmail: string,
) {
  const emails = Array.from(new Set([currentEmail.toLowerCase(), nextEmail.toLowerCase()]));

  for (const email of emails) {
    const { data, error } = await adminSupabase
      .from("staff_members")
      .select("id")
      .eq("email", email)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error(`Failed to inspect staff account: ${error.message}`);
    }

    if (data) {
      return data.id;
    }
  }

  return "";
}

async function syncStaffMember(
  adminSupabase: AdminSupabaseClient,
  input: AccountInput,
  currentEmail: string,
  shouldEnsureStaffMember: boolean,
) {
  if (!shouldEnsureStaffMember) {
    return;
  }

  const departmentId = await getOrCreateDepartmentId(adminSupabase, input.department);
  const jobRoleId = await getOrCreateJobRoleId(adminSupabase, input.jobTitle, departmentId);
  const staffMemberId = await findStaffMemberId(adminSupabase, currentEmail, input.email);
  const payload = {
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    profile_image_url: input.profileImageUrl || null,
    department_id: departmentId,
    job_role_id: jobRoleId,
    status: "Active",
    start_date: input.startDate,
  };

  if (staffMemberId) {
    const { error } = await adminSupabase
      .from("staff_members")
      .update(payload)
      .eq("id", staffMemberId);

    if (error) {
      throw new Error(`Failed to update staff account: ${error.message}`);
    }

    return;
  }

  const { error } = await adminSupabase.from("staff_members").insert({
    employee_id: await generateEmployeeId(adminSupabase),
    ...payload,
  });

  if (error) {
    throw new Error(`Failed to create staff account details: ${error.message}`);
  }
}

export async function updateAccount(formData: FormData) {
  const input = getAccountInput(formData);

  if (input === "invalid") {
    redirect("/account?status=invalid");
  }

  if (input === "mismatch") {
    redirect("/account?status=mismatch");
  }

  if (input === "invalid-photo") {
    redirect("/account?status=photo");
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const currentProfile = await getCurrentAccountProfile();

  if (!currentProfile) {
    redirect("/account?status=setup");
  }

  let adminSupabase: AdminSupabaseClient;

  try {
    adminSupabase = getSupabaseAdminClient();
  } catch {
    redirect("/account?status=setup");
  }

  let didProfileImageUploadFail = false;

  try {
    input.profileImageUrl =
      (await uploadProfileImage(adminSupabase, user.id, input.profileImageFile)) ||
      currentProfile.profileImageUrl;
  } catch {
    input.profileImageUrl = currentProfile.profileImageUrl;
    didProfileImageUploadFail = Boolean(input.profileImageFile);
  }

  const userMetadata = {
    full_name: input.fullName,
    first_name: input.firstName,
    middle_name: input.middleName,
    last_name: input.lastName,
    gender: input.gender,
    age: input.age,
    phone: input.phone,
    profile_image_url: input.profileImageUrl,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2,
    city: input.city,
    state_province: input.stateProvince,
    postal_code: input.postalCode,
    country: input.country,
    department: input.department,
    job_title: input.jobTitle,
    start_date: input.startDate,
  };
  const authPayload = input.password
    ? { email: input.email, password: input.password, user_metadata: userMetadata }
    : { email: input.email, user_metadata: userMetadata };
  const { error: authError } = await adminSupabase.auth.admin.updateUserById(
    user.id,
    authPayload,
  );

  if (authError) {
    const message = authError.message.toLowerCase();

    if (message.includes("already") || message.includes("registered")) {
      redirect("/account?status=exists");
    }

    redirect("/account?status=credentials");
  }

  try {
    await upsertProfile(adminSupabase, user.id, input);
    await syncStaffMember(
      adminSupabase,
      input,
      currentProfile.email,
      currentProfile.roles.includes("staff"),
    );
  } catch {
    redirect("/account?status=setup");
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/staff");
  redirect(didProfileImageUploadFail ? "/account?status=photo-upload" : "/account?status=saved");
}
