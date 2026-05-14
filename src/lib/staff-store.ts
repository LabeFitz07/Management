import { getSupabaseServerClient } from "./supabase-server";

export type StaffMember = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  profileImageUrl: string;
  department: string;
  role: string;
  status: string;
  startDate: string;
  createdAt: string;
};

export type StaffInput = Omit<StaffMember, "id" | "createdAt">;

const AUTO_EMPLOYEE_ID_PREFIX = "EMP-";
const AUTO_EMPLOYEE_ID_START = 1000;

type StaffRow = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_image_url: string | null;
  status: string;
  start_date: string;
  created_at: string;
  departments: {
    name: string;
  } | null;
  job_roles: {
    title: string;
  } | null;
};

function isMissingProfileImageColumnError(message: string) {
  return message.toLowerCase().includes("profile_image_url");
}

function normalizeStaffInput(input: StaffInput): StaffInput {
  const normalized = {
    employeeId: input.employeeId.trim(),
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    profileImageUrl: input.profileImageUrl.trim(),
    department: input.department.trim(),
    role: input.role.trim(),
    status: input.status.trim(),
    startDate: input.startDate.trim(),
  };

  const missingField = Object.entries(normalized).find(
    ([key, value]) => key !== "employeeId" && !value,
  );

  if (missingField) {
    throw new Error(`${missingField[0]} is required.`);
  }

  return normalized;
}

async function generateUniqueEmployeeId() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
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
      AUTO_EMPLOYEE_ID_START,
      Number.parseInt(data?.employee_id.replace(AUTO_EMPLOYEE_ID_PREFIX, "") ?? "", 10) ||
        AUTO_EMPLOYEE_ID_START - 1,
    ) + 1;

  return `${AUTO_EMPLOYEE_ID_PREFIX}${String(nextNumericId).padStart(4, "0")}`;
}

function mapStaffMember(row: StaffRow): StaffMember {
  return {
    id: row.id,
    employeeId: row.employee_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    profileImageUrl: row.profile_image_url ?? "",
    department: row.departments?.name ?? "",
    role: row.job_roles?.title ?? "",
    status: row.status,
    startDate: row.start_date,
    createdAt: row.created_at,
  };
}

async function getOrCreateDepartmentId(name: string) {
  const supabase = await getSupabaseServerClient();
  const { data: existingDepartment, error: existingDepartmentError } = await supabase
    .from("departments")
    .select("id")
    .eq("name", name)
    .maybeSingle<{ id: string }>();

  if (existingDepartmentError) {
    throw new Error(`Failed to read department: ${existingDepartmentError.message}`);
  }

  if (existingDepartment) {
    return existingDepartment.id;
  }

  const { data, error } = await supabase
    .from("departments")
    .insert({
      name,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    const { data: retryDepartment, error: retryDepartmentError } = await supabase
      .from("departments")
      .select("id")
      .eq("name", name)
      .maybeSingle<{ id: string }>();

    if (retryDepartmentError) {
      throw new Error(`Failed to create department: ${error.message}`);
    }

    if (retryDepartment) {
      return retryDepartment.id;
    }

    throw new Error(`Failed to create department: ${error.message}`);
  }

  return data.id;
}

async function getOrCreateJobRoleId(title: string) {
  const supabase = await getSupabaseServerClient();
  const { data: existingJobRole, error: existingJobRoleError } = await supabase
    .from("job_roles")
    .select("id")
    .eq("title", title)
    .maybeSingle<{ id: string }>();

  if (existingJobRoleError) {
    throw new Error(`Failed to read job role: ${existingJobRoleError.message}`);
  }

  if (existingJobRole) {
    return existingJobRole.id;
  }

  const { data, error } = await supabase
    .from("job_roles")
    .insert({
      title,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    const { data: retryJobRole, error: retryJobRoleError } = await supabase
      .from("job_roles")
      .select("id")
      .eq("title", title)
      .maybeSingle<{ id: string }>();

    if (retryJobRoleError) {
      throw new Error(`Failed to create job role: ${error.message}`);
    }

    if (retryJobRole) {
      return retryJobRole.id;
    }

    throw new Error(`Failed to create job role: ${error.message}`);
  }

  return data.id;
}

export async function getStaffMembers() {
  const supabase = await getSupabaseServerClient();
  const baseSelect =
    "id, employee_id, full_name, email, phone, status, start_date, created_at, departments(name), job_roles(title)";
  const profileImageSelect = `id, employee_id, full_name, email, phone, profile_image_url, status, start_date, created_at, departments(name), job_roles(title)`;

  const { data, error } = await supabase
    .from("staff_members")
    .select(profileImageSelect)
    .order("full_name", { ascending: true })
    .returns<StaffRow[]>();

  if (error) {
    if (!isMissingProfileImageColumnError(error.message)) {
      throw new Error(`Failed to fetch staff members: ${error.message}`);
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("staff_members")
      .select(baseSelect)
      .order("full_name", { ascending: true })
      .returns<StaffRow[]>();

    if (fallbackError) {
      throw new Error(`Failed to fetch staff members: ${fallbackError.message}`);
    }

    return fallbackData.map(mapStaffMember);
  }

  return data.map(mapStaffMember);
}

export async function addStaffMember(input: StaffInput) {
  const supabase = await getSupabaseServerClient();
  const normalized = normalizeStaffInput(input);
  const departmentId = await getOrCreateDepartmentId(normalized.department);
  const jobRoleId = await getOrCreateJobRoleId(normalized.role);
  const maxAttempts = normalized.employeeId ? 1 : 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const employeeId = normalized.employeeId || (await generateUniqueEmployeeId());
    const payload = {
      employee_id: employeeId,
      full_name: normalized.fullName,
      email: normalized.email,
      phone: normalized.phone,
      profile_image_url: normalized.profileImageUrl || null,
      department_id: departmentId,
      job_role_id: jobRoleId,
      status: normalized.status,
      start_date: normalized.startDate,
    };
    const legacyPayload = {
      employee_id: employeeId,
      full_name: normalized.fullName,
      email: normalized.email,
      phone: normalized.phone,
      department_id: departmentId,
      job_role_id: jobRoleId,
      status: normalized.status,
      start_date: normalized.startDate,
    };

    const { data, error } = await supabase
      .from("staff_members")
      .insert(payload)
      .select(
        "id, employee_id, full_name, email, phone, profile_image_url, status, start_date, created_at, departments(name), job_roles(title)",
      )
      .single<StaffRow>();

    if (!error) {
      return mapStaffMember(data);
    }

    if (isMissingProfileImageColumnError(error.message)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("staff_members")
        .insert(legacyPayload)
        .select(
          "id, employee_id, full_name, email, phone, status, start_date, created_at, departments(name), job_roles(title)",
        )
        .single<StaffRow>();

      if (fallbackError) {
        throw new Error(`Failed to add staff member: ${fallbackError.message}`);
      }

      return mapStaffMember(fallbackData);
    }

    if (normalized.employeeId || !error.message.toLowerCase().includes("employee_id")) {
      throw new Error(`Failed to add staff member: ${error.message}`);
    }
  }

  throw new Error("Failed to add staff member: could not generate a unique employee ID.");
}

export async function updateStaffMemberById(id: string, input: StaffInput) {
  const supabase = await getSupabaseServerClient();
  const normalized = normalizeStaffInput(input);
  const departmentId = await getOrCreateDepartmentId(normalized.department);
  const jobRoleId = await getOrCreateJobRoleId(normalized.role);

  const payload = {
    employee_id: normalized.employeeId,
    full_name: normalized.fullName,
    email: normalized.email,
    phone: normalized.phone,
    profile_image_url: normalized.profileImageUrl || null,
    department_id: departmentId,
    job_role_id: jobRoleId,
    status: normalized.status,
    start_date: normalized.startDate,
  };
  const legacyPayload = {
    employee_id: normalized.employeeId,
    full_name: normalized.fullName,
    email: normalized.email,
    phone: normalized.phone,
    department_id: departmentId,
    job_role_id: jobRoleId,
    status: normalized.status,
    start_date: normalized.startDate,
  };

  const { data, error } = await supabase
    .from("staff_members")
    .update(payload)
    .eq("id", id)
    .select(
      "id, employee_id, full_name, email, phone, profile_image_url, status, start_date, created_at, departments(name), job_roles(title)",
    )
    .single<StaffRow>();

  if (error) {
    if (!isMissingProfileImageColumnError(error.message)) {
      throw new Error(`Failed to update staff member: ${error.message}`);
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("staff_members")
      .update(legacyPayload)
      .eq("id", id)
      .select(
        "id, employee_id, full_name, email, phone, status, start_date, created_at, departments(name), job_roles(title)",
      )
      .single<StaffRow>();

    if (fallbackError) {
      throw new Error(`Failed to update staff member: ${fallbackError.message}`);
    }

    return mapStaffMember(fallbackData);
  }

  return mapStaffMember(data);
}

export async function removeStaffMember(id: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("staff_members").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete staff member: ${error.message}`);
  }
}
