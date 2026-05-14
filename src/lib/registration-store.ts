import { getSupabaseServerClient } from "./supabase-server";
import { getSupabaseAdminClient } from "./supabase-admin";
import { addStaffMember } from "./staff-store";

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

export async function submitStaffRegistrationRequest(input: StaffRegistrationInput) {
  const supabase = await getSupabaseServerClient();
  const normalized = normalizeRequestInput(input);

  const { data, error } = await supabase
    .from("staff_registration_requests")
    .insert({
      full_name: normalized.fullName,
      email: normalized.email,
      phone: normalized.phone,
      department: normalized.department,
      role: normalized.role,
      start_date: normalized.startDate,
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

export async function approveStaffRegistrationRequest(requestId: string) {
  const supabase = await getSupabaseServerClient();
  const adminSupabase = getSupabaseAdminClient();

  const { data: request, error: requestError } = await supabase
    .from("staff_registration_requests")
    .select(
      "id, full_name, email, phone, department, role, start_date, status, temporary_password, requested_at, approved_at",
    )
    .eq("id", requestId)
    .single<StaffRegistrationRequestRow>();

  if (requestError) {
    throw new Error(`Failed to read registration request: ${requestError.message}`);
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

  const { data: roleRow, error: roleError } = await supabase
    .from("app_roles")
    .select("id")
    .eq("code", "staff")
    .single<{ id: string }>();

  if (roleError) {
    throw new Error(`Failed to resolve staff role: ${roleError.message}`);
  }

  const { error: profileError } = await supabase.from("app_user_profiles").upsert({
    user_id: userId,
    email: request.email,
    full_name: request.full_name,
    is_active: true,
  });

  if (profileError) {
    throw new Error(`Failed to create approved user profile: ${profileError.message}`);
  }

  const { error: assignmentError } = await supabase.from("user_role_assignments").upsert({
    user_id: userId,
    role_id: roleRow.id,
  });

  if (assignmentError) {
    throw new Error(`Failed to assign staff role: ${assignmentError.message}`);
  }

  const { data: existingStaffMember, error: existingStaffError } = await supabase
    .from("staff_members")
    .select("id")
    .eq("email", request.email)
    .maybeSingle<{ id: string }>();

  if (existingStaffError) {
    throw new Error(`Failed to check existing staff member: ${existingStaffError.message}`);
  }

  if (!existingStaffMember) {
    await addStaffMember({
      employeeId: "",
      fullName: request.full_name,
      email: request.email,
      phone: request.phone,
      profileImageUrl: "",
      department: request.department,
      role: request.role,
      status: "Active",
      startDate: request.start_date,
    });
  }

  const { data: updatedRequest, error: updateError } = await supabase
    .from("staff_registration_requests")
    .update({
      status: "approved",
      temporary_password: temporaryPassword,
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
