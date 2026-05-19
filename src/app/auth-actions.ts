"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  getProfileImageFile,
  uploadProfileImage,
} from "@/lib/profile-image-storage";

type AdminSupabaseClient = ReturnType<typeof getSupabaseAdminClient>;

type SignupInput = {
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
const OPTIONAL_PROFILE_COLUMNS = [
  "first_name",
  "middle_name",
  "last_name",
  "gender",
  "age",
  "phone",
  "address_line1",
  "address_line2",
  "city",
  "state_province",
  "postal_code",
  "country",
  "department",
  "job_title",
  "start_date",
  "profile_image_url",
];
const ALLOWED_GENDERS = new Set(["Female", "Male", "Non-binary", "Prefer not to say"]);

function readTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function getSignupInput(formData: FormData): SignupInput | "invalid" | "mismatch" | "invalid-photo" {
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
    password.length < 6 ||
    !Number.isInteger(ageValue) ||
    ageValue < 1 ||
    ageValue > 130 ||
    !ALLOWED_GENDERS.has(gender) ||
    !isIsoDate(startDate)
  ) {
    return "invalid";
  }

  if (password !== confirmPassword) {
    return "mismatch";
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

function isMissingExpandedProfileColumn(message: string) {
  const normalized = message.toLowerCase();
  return OPTIONAL_PROFILE_COLUMNS.some((column) => normalized.includes(column));
}

async function upsertUserProfile(
  adminSupabase: AdminSupabaseClient,
  userId: string,
  input: SignupInput,
) {
  const basePayload = {
    user_id: userId,
    email: input.email,
    full_name: input.fullName,
    is_active: true,
  };

  const { error } = await adminSupabase.from("app_user_profiles").upsert({
    ...basePayload,
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
  });

  if (!error) {
    return;
  }

  if (!isMissingExpandedProfileColumn(error.message)) {
    throw new Error(`Failed to create user profile: ${error.message}`);
  }

  const { error: fallbackError } = await adminSupabase
    .from("app_user_profiles")
    .upsert(basePayload);

  if (fallbackError) {
    throw new Error(`Failed to create user profile: ${fallbackError.message}`);
  }
}

async function getOrCreateDepartmentId(adminSupabase: AdminSupabaseClient, name: string) {
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
    throw new Error(`Failed to create departments: ${error.message}`);
  }

  return retryRow.id;
}

async function getOrCreateJobRoleId(adminSupabase: AdminSupabaseClient, title: string) {
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
    throw new Error(`Failed to create job roles: ${error.message}`);
  }

  return retryRow.id;
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

async function createStaffMemberProfile(adminSupabase: AdminSupabaseClient, input: SignupInput) {
  const { data: existingStaffMember, error: existingStaffError } = await adminSupabase
    .from("staff_members")
    .select("id")
    .eq("email", input.email)
    .maybeSingle<{ id: string }>();

  if (existingStaffError) {
    throw new Error(`Failed to check existing staff member: ${existingStaffError.message}`);
  }

  if (existingStaffMember) {
    return;
  }

  const departmentId = await getOrCreateDepartmentId(adminSupabase, input.department);
  const jobRoleId = await getOrCreateJobRoleId(adminSupabase, input.jobTitle);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await adminSupabase.from("staff_members").insert({
      employee_id: await generateEmployeeId(adminSupabase),
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      profile_image_url: input.profileImageUrl || null,
      department_id: departmentId,
      job_role_id: jobRoleId,
      status: "Active",
      start_date: input.startDate,
    });

    if (!error) {
      return;
    }

    if (error.message.toLowerCase().includes("profile_image_url")) {
      const { error: fallbackError } = await adminSupabase.from("staff_members").insert({
        employee_id: await generateEmployeeId(adminSupabase),
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        department_id: departmentId,
        job_role_id: jobRoleId,
        status: "Active",
        start_date: input.startDate,
      });

      if (!fallbackError) {
        return;
      }

      throw new Error(`Failed to create staff member: ${fallbackError.message}`);
    }

    if (!error.message.toLowerCase().includes("employee_id")) {
      throw new Error(`Failed to create staff member: ${error.message}`);
    }
  }

  throw new Error("Failed to create staff member: could not generate a unique employee ID.");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/?error=invalid");
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/?error=invalid");
  }

  redirect("/portal");
}

export async function signUp(formData: FormData) {
  const input = getSignupInput(formData);

  if (input === "invalid") {
    redirect("/?signup=invalid");
  }

  if (input === "mismatch") {
    redirect("/?signup=mismatch");
  }

  if (input === "invalid-photo") {
    redirect("/?signup=photo");
  }

  let adminSupabase: ReturnType<typeof getSupabaseAdminClient>;

  try {
    adminSupabase = getSupabaseAdminClient();
  } catch {
    redirect("/?signup=setup");
  }

  const { data: createdUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      first_name: input.firstName,
      middle_name: input.middleName,
      last_name: input.lastName,
      gender: input.gender,
      age: input.age,
      phone: input.phone,
      profile_image_url: "",
      address_line1: input.addressLine1,
      address_line2: input.addressLine2,
      city: input.city,
      state_province: input.stateProvince,
      postal_code: input.postalCode,
      country: input.country,
      department: input.department,
      job_title: input.jobTitle,
      start_date: input.startDate,
    },
  });

  if (createError) {
    const message = createError.message.toLowerCase();

    if (message.includes("already") || message.includes("registered")) {
      redirect("/?signup=exists");
    }

    if (message.includes("rate limit")) {
      redirect("/?signup=rate-limit");
    }

    redirect("/?signup=error");
  }

  if (!createdUser.user?.id) {
    redirect("/?signup=setup");
  }

  let didProfileImageUploadFail = false;

  try {
    input.profileImageUrl = await uploadProfileImage(
      adminSupabase,
      createdUser.user.id,
      input.profileImageFile,
    );
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
      },
    });
  }

  const { data: staffRole, error: roleError } = await adminSupabase
    .from("app_roles")
    .select("id")
    .eq("code", "staff")
    .single<{ id: string }>();

  if (roleError) {
    redirect("/?signup=setup");
  }

  try {
    await upsertUserProfile(adminSupabase, createdUser.user.id, input);
  } catch {
    redirect("/?signup=setup");
  }

  const { error: assignmentError } = await adminSupabase.from("user_role_assignments").upsert({
    user_id: createdUser.user.id,
    role_id: staffRole.id,
  });

  if (assignmentError) {
    redirect("/?signup=setup");
  }

  try {
    await createStaffMemberProfile(adminSupabase, input);
  } catch {
    redirect("/?signup=setup");
  }

  redirect(didProfileImageUploadFail ? "/?signup=photo-upload" : "/?signup=created");
}

export async function logout() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
