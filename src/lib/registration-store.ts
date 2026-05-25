import { getSupabaseAdminClient } from "./supabase-admin";
import { getSupabaseServerClient } from "./supabase-server";

export type StaffRegistrationRequest = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  startDate: string;
  status: "pending" | "approved";
  temporaryPassword: string;
  requestedAt: string;
  approvedAt: string | null;
};

export type StaffRegistrationApprovalContext = {
  managedDepartmentNames?: string[];
};

type StaffRegistrationRequestRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  start_date: string;
  status: "pending" | "approved";
  temporary_password: string | null;
  requested_at: string;
  approved_at: string | null;
};

export type StaffRegistrationInput = {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  startDate: string;
};

function isMissingRegistrationTableError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("staff_registration_requests") &&
    (normalized.includes("schema cache") || normalized.includes("could not find the table"))
  );
}

function mapRequest(row: StaffRegistrationRequestRow): StaffRegistrationRequest {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    department: row.department,
    role: row.role,
    startDate: row.start_date,
    status: row.status,
    temporaryPassword: row.temporary_password ?? "",
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
  };
}

function normalizeRequestInput(input: StaffRegistrationInput) {
  const normalized = {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    department: input.department.trim(),
    role: input.role.trim(),
    startDate: input.startDate.trim(),
  };

  const missingField = Object.entries(normalized).find(([, value]) => !value);

  if (missingField) {
    throw new Error(`${missingField[0]} is required.`);
  }

  return normalized;
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
    "",
  );
}

function normalizeDepartmentNames(departments?: string[]) {
  return (departments ?? []).map((department) => department.trim().toLowerCase()).filter(Boolean);
}

async function resolveStaffRoleId() {
  const adminSupabase = getSupabaseAdminClient();
  const { data: roleRow, error: roleError } = await adminSupabase
    .from("app_roles")
    .select("id")
    .eq("code", "staff")
    .single<{ id: string }>();

  if (roleError) {
    throw new Error(`Failed to resolve staff role: ${roleError.message}`);
  }

  return roleRow.id;
}

async function upsertPendingRegistrationRequest(input: StaffRegistrationInput) {
  const adminSupabase = getSupabaseAdminClient();
  const normalized = normalizeRequestInput(input);

  const { data, error } = await adminSupabase
    .from("staff_registration_requests")
    .upsert({
      full_name: normalized.fullName,
      email: normalized.email,
      phone: normalized.phone,
      department: normalized.department,
      role: normalized.role,
      start_date: normalized.startDate,
      status: "pending",
      approved_at: null,
      temporary_password: null,
    }, {
      onConflict: "email",
    })
    .select(
      "id, full_name, email, phone, department, role, start_date, status, temporary_password, requested_at, approved_at",
    )
    .single<StaffRegistrationRequestRow>();

  if (error) {
    throw new Error(`Failed to submit registration request: ${error.message}`);
  }

  return mapRequest(data);
}

export async function submitStaffRegistrationRequest(input: StaffRegistrationInput) {
  return upsertPendingRegistrationRequest(input);
}

export async function upsertStaffRegistrationRequest(input: StaffRegistrationInput) {
  return upsertPendingRegistrationRequest(input);
}

export async function getStaffRegistrationRequests() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff_registration_requests")
    .select(
      "id, full_name, email, phone, department, role, start_date, status, temporary_password, requested_at, approved_at",
    )
    .order("requested_at", { ascending: true })
    .returns<StaffRegistrationRequestRow[]>();

  if (error) {
    if (isMissingRegistrationTableError(error.message)) {
      return [];
    }

    throw new Error(`Failed to fetch registration requests: ${error.message}`);
  }

  return data.map(mapRequest);
}

export async function getPendingStaffRegistrationRequests(visibleDepartments?: string[]) {
  const adminSupabase = getSupabaseAdminClient();
  const { data, error } = await adminSupabase
    .from("staff_registration_requests")
    .select(
      "id, full_name, email, phone, department, role, start_date, status, temporary_password, requested_at, approved_at",
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
    .returns<StaffRegistrationRequestRow[]>();

  if (error) {
    if (isMissingRegistrationTableError(error.message)) {
      return [];
    }

    throw new Error(`Failed to fetch pending registration requests: ${error.message}`);
  }

  const normalizedDepartments = normalizeDepartmentNames(visibleDepartments);

  return data
    .filter((row) => {
      if (normalizedDepartments.length === 0) {
        return true;
      }

      return normalizedDepartments.includes(row.department.trim().toLowerCase());
    })
    .map(mapRequest);
}

export async function getPendingStaffRegistrationRequestCount(visibleDepartments?: string[]) {
  const adminSupabase = getSupabaseAdminClient();
  const normalizedDepartments = normalizeDepartmentNames(visibleDepartments);
  let query = adminSupabase
    .from("staff_registration_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (normalizedDepartments.length > 0) {
    query = query.in("department", normalizedDepartments);
  }

  const { count, error } = await query;

  if (error) {
    if (isMissingRegistrationTableError(error.message)) {
      return 0;
    }

    throw new Error(`Failed to count pending registration requests: ${error.message}`);
  }

  return count ?? 0;
}

async function upsertApprovedUserProfile(userId: string, request: StaffRegistrationRequestRow) {
  const adminSupabase = getSupabaseAdminClient();
  const { data: existingProfile, error: existingProfileError } = await adminSupabase
    .from("app_user_profiles")
    .select(
      "first_name, middle_name, last_name, gender, age, phone, profile_image_url, address_line1, address_line2, city, state_province, postal_code, country, department, job_title, start_date, created_at",
    )
    .eq("user_id", userId)
    .maybeSingle<{
      first_name?: string | null;
      middle_name?: string | null;
      last_name?: string | null;
      gender?: string | null;
      age?: number | null;
      phone?: string | null;
      profile_image_url?: string | null;
      address_line1?: string | null;
      address_line2?: string | null;
      city?: string | null;
      state_province?: string | null;
      postal_code?: string | null;
      country?: string | null;
      department?: string | null;
      job_title?: string | null;
      start_date?: string | null;
      created_at?: string | null;
    }>();

  if (existingProfileError) {
    throw new Error(`Failed to inspect user profile: ${existingProfileError.message}`);
  }

  const { error: profileError } = await adminSupabase.from("app_user_profiles").upsert({
    user_id: userId,
    email: request.email,
    full_name: request.full_name,
    first_name: existingProfile?.first_name ?? null,
    middle_name: existingProfile?.middle_name ?? null,
    last_name: existingProfile?.last_name ?? null,
    gender: existingProfile?.gender ?? null,
    age: existingProfile?.age ?? null,
    phone: existingProfile?.phone ?? request.phone,
    profile_image_url: existingProfile?.profile_image_url ?? null,
    address_line1: existingProfile?.address_line1 ?? null,
    address_line2: existingProfile?.address_line2 ?? null,
    city: existingProfile?.city ?? null,
    state_province: existingProfile?.state_province ?? null,
    postal_code: existingProfile?.postal_code ?? null,
    country: existingProfile?.country ?? null,
    department: existingProfile?.department ?? request.department,
    job_title: existingProfile?.job_title ?? request.role,
    start_date: existingProfile?.start_date ?? request.start_date,
    is_active: true,
  });

  if (profileError) {
    throw new Error(`Failed to activate user profile: ${profileError.message}`);
  }
}

async function ensureStaffRoleAssignment(userId: string) {
  const adminSupabase = getSupabaseAdminClient();
  const roleId = await resolveStaffRoleId();
  const { error: assignmentError } = await adminSupabase.from("user_role_assignments").upsert({
    user_id: userId,
    role_id: roleId,
  });

  if (assignmentError) {
    throw new Error(`Failed to assign staff role: ${assignmentError.message}`);
  }
}

async function getOrCreateDepartmentId(name: string) {
  const adminSupabase = getSupabaseAdminClient();
  const { data: existingDepartment, error: existingDepartmentError } = await adminSupabase
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

  const { data, error } = await adminSupabase
    .from("departments")
    .insert({ name })
    .select("id")
    .single<{ id: string }>();

  if (!error) {
    return data.id;
  }

  const { data: retryDepartment, error: retryDepartmentError } = await adminSupabase
    .from("departments")
    .select("id")
    .eq("name", name)
    .maybeSingle<{ id: string }>();

  if (retryDepartmentError || !retryDepartment) {
    throw new Error(`Failed to create department: ${error.message}`);
  }

  return retryDepartment.id;
}

async function getOrCreateJobRoleId(title: string, departmentId: string) {
  const adminSupabase = getSupabaseAdminClient();
  const { data: existingJobRole, error: existingJobRoleError } = await adminSupabase
    .from("job_roles")
    .select("id")
    .eq("title", title)
    .eq("department_id", departmentId)
    .maybeSingle<{ id: string }>();

  if (existingJobRoleError) {
    throw new Error(`Failed to read job role: ${existingJobRoleError.message}`);
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

  const { data: retryJobRole, error: retryJobRoleError } = await adminSupabase
    .from("job_roles")
    .select("id")
    .eq("title", title)
    .eq("department_id", departmentId)
    .maybeSingle<{ id: string }>();

  if (retryJobRoleError || !retryJobRole) {
    throw new Error(`Failed to create job role: ${error.message}`);
  }

  return retryJobRole.id;
}

async function activateStaffMember(request: StaffRegistrationRequestRow) {
  const adminSupabase = getSupabaseAdminClient();
  const departmentId = await getOrCreateDepartmentId(request.department);
  const jobRoleId = await getOrCreateJobRoleId(request.role, departmentId);

  const { data: existingStaffMember, error: existingStaffError } = await adminSupabase
    .from("staff_members")
    .select("id, employee_id, profile_image_url")
    .eq("email", request.email)
    .maybeSingle<{ id: string; employee_id: string; profile_image_url: string | null }>();

  if (existingStaffError) {
    throw new Error(`Failed to check existing staff member: ${existingStaffError.message}`);
  }

  const payload = {
    full_name: request.full_name,
    email: request.email,
    phone: request.phone,
    department_id: departmentId,
    job_role_id: jobRoleId,
    status: "Active",
    start_date: request.start_date,
    profile_image_url: existingStaffMember?.profile_image_url ?? null,
  };

  if (existingStaffMember) {
    const { error: updateError } = await adminSupabase
      .from("staff_members")
      .update(payload)
      .eq("id", existingStaffMember.id);

    if (updateError && !updateError.message.toLowerCase().includes("profile_image_url")) {
      throw new Error(`Failed to activate staff member: ${updateError.message}`);
    }

    if (updateError) {
      const { error: legacyUpdateError } = await adminSupabase
        .from("staff_members")
        .update({
          full_name: request.full_name,
          email: request.email,
          phone: request.phone,
          department_id: departmentId,
          job_role_id: jobRoleId,
          status: "Active",
          start_date: request.start_date,
        })
        .eq("id", existingStaffMember.id);

      if (legacyUpdateError) {
        throw new Error(`Failed to activate staff member: ${legacyUpdateError.message}`);
      }
    }

    return;
  }

  const { data: latestEmployeeId, error: employeeIdError } = await adminSupabase
    .from("staff_members")
    .select("employee_id")
    .order("employee_id", { ascending: false })
    .limit(1)
    .maybeSingle<{ employee_id: string }>();

  if (employeeIdError) {
    throw new Error(`Failed to generate employee ID: ${employeeIdError.message}`);
  }

  const nextNumericId =
    Math.max(
      1000,
      Number.parseInt(latestEmployeeId?.employee_id.replace("EMP-", "") ?? "", 10) || 999,
    ) + 1;
  const employeeId = `EMP-${String(nextNumericId).padStart(4, "0")}`;

  const { error: insertError } = await adminSupabase.from("staff_members").insert({
    employee_id: employeeId,
    ...payload,
  });

  if (insertError && !insertError.message.toLowerCase().includes("profile_image_url")) {
    throw new Error(`Failed to create staff member: ${insertError.message}`);
  }

  if (insertError) {
    const { error: legacyInsertError } = await adminSupabase.from("staff_members").insert({
      employee_id: employeeId,
      full_name: request.full_name,
      email: request.email,
      phone: request.phone,
      department_id: departmentId,
      job_role_id: jobRoleId,
      status: "Active",
      start_date: request.start_date,
    });

    if (legacyInsertError) {
      throw new Error(`Failed to create staff member: ${legacyInsertError.message}`);
    }
  }
}

export async function approveStaffRegistrationRequest(
  requestId: string,
  context: StaffRegistrationApprovalContext = {},
) {
  const adminSupabase = getSupabaseAdminClient();

  const { data: request, error: requestError } = await adminSupabase
    .from("staff_registration_requests")
    .select(
      "id, full_name, email, phone, department, role, start_date, status, temporary_password, requested_at, approved_at",
    )
    .eq("id", requestId)
    .single<StaffRegistrationRequestRow>();

  if (requestError) {
    throw new Error(`Failed to read registration request: ${requestError.message}`);
  }

  const normalizedManagedDepartments = normalizeDepartmentNames(context.managedDepartmentNames);

  if (
    normalizedManagedDepartments.length > 0 &&
    !normalizedManagedDepartments.includes(request.department.trim().toLowerCase())
  ) {
    throw new Error("Unauthorized");
  }

  if (request.status === "approved") {
    return mapRequest(request);
  }

  const temporaryPassword = generateTemporaryPassword();

  const { data: existingUsers, error: existingUsersError } = await adminSupabase.auth.admin.listUsers();

  if (existingUsersError) {
    throw new Error(`Failed to inspect auth users: ${existingUsersError.message}`);
  }

  const existingUser = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === request.email.toLowerCase(),
  );

  let userId = existingUser?.id;

  if (!userId) {
    const { data: createdUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: request.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: request.full_name,
      },
    });

    if (createUserError) {
      throw new Error(`Failed to create auth account: ${createUserError.message}`);
    }

    userId = createdUser.user.id;
  }

  await upsertApprovedUserProfile(userId, request);
  await ensureStaffRoleAssignment(userId);
  await activateStaffMember(request);

  const { data: updatedRequest, error: updateError } = await adminSupabase
    .from("staff_registration_requests")
    .update({
      status: "approved",
      temporary_password: existingUser ? null : temporaryPassword,
      approved_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select(
      "id, full_name, email, phone, department, role, start_date, status, temporary_password, requested_at, approved_at",
    )
    .single<StaffRegistrationRequestRow>();

  if (updateError) {
    throw new Error(`Failed to finalize approval: ${updateError.message}`);
  }

  return mapRequest(updatedRequest);
}

export { isMissingRegistrationTableError };
