import { getSupabaseServerClient } from "./supabase-server";

export type AccountProfile = {
  userId: string;
  email: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  age: string;
  phone: string;
  profileImageUrl: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  department: string;
  jobTitle: string;
  startDate: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
  staffMemberId: string;
  employeeId: string;
  staffStatus: string;
};

export type StaffAccountSummary = {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  profileImageUrl: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  status: string;
  startDate: string;
  createdAt: string;
};

type RoleAssignmentRow = {
  app_roles: {
    code: string;
  } | null;
};

type AccountProfileRow = {
  user_id: string;
  email: string;
  full_name: string;
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
  is_active: boolean;
  created_at: string;
  user_role_assignments: RoleAssignmentRow[];
};

type StaffMemberRow = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_image_url?: string | null;
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

const EXPANDED_PROFILE_SELECT =
  "user_id, email, full_name, first_name, middle_name, last_name, gender, age, phone, profile_image_url, address_line1, address_line2, city, state_province, postal_code, country, department, job_title, start_date, is_active, created_at, user_role_assignments(app_roles(code))";
const BASE_PROFILE_SELECT =
  "user_id, email, full_name, is_active, created_at, user_role_assignments(app_roles(code))";
const STAFF_SELECT =
  "id, employee_id, full_name, email, phone, profile_image_url, status, start_date, created_at, departments(name), job_roles(title)";
const BASE_STAFF_SELECT =
  "id, employee_id, full_name, email, phone, status, start_date, created_at, departments(name), job_roles(title)";

function isMissingExpandedProfileColumn(message: string) {
  const normalized = message.toLowerCase();

  return [
    "first_name",
    "gender",
    "address_line1",
    "profile_image_url",
    "job_title",
    "state_province",
  ].some((column) => normalized.includes(column));
}

function isMissingProfileImageColumn(message: string) {
  return message.toLowerCase().includes("profile_image_url");
}

function getRoles(row: AccountProfileRow) {
  return row.user_role_assignments
    .map((assignment) => assignment.app_roles?.code)
    .filter((role): role is string => Boolean(role));
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", middleName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", lastName: "" };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

function mapAccountProfile(row: AccountProfileRow, staffMember: StaffMemberRow | null): AccountProfile {
  const fallbackName = splitFullName(row.full_name);

  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    firstName: row.first_name ?? fallbackName.firstName,
    middleName: row.middle_name ?? fallbackName.middleName,
    lastName: row.last_name ?? fallbackName.lastName,
    gender: row.gender ?? "",
    age: row.age ? String(row.age) : "",
    phone: row.phone ?? staffMember?.phone ?? "",
    profileImageUrl: row.profile_image_url ?? staffMember?.profile_image_url ?? "",
    addressLine1: row.address_line1 ?? "",
    addressLine2: row.address_line2 ?? "",
    city: row.city ?? "",
    stateProvince: row.state_province ?? "",
    postalCode: row.postal_code ?? "",
    country: row.country ?? "",
    department: row.department ?? staffMember?.departments?.name ?? "",
    jobTitle: row.job_title ?? staffMember?.job_roles?.title ?? "",
    startDate: row.start_date ?? staffMember?.start_date ?? "",
    isActive: row.is_active,
    createdAt: row.created_at,
    roles: getRoles(row),
    staffMemberId: staffMember?.id ?? "",
    employeeId: staffMember?.employee_id ?? "",
    staffStatus: staffMember?.status ?? "",
  };
}

function mapStaffSummary(row: AccountProfileRow, staffMember: StaffMemberRow | null): StaffAccountSummary {
  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone ?? staffMember?.phone ?? "",
    profileImageUrl: row.profile_image_url ?? staffMember?.profile_image_url ?? "",
    employeeId: staffMember?.employee_id ?? "",
    department: row.department ?? staffMember?.departments?.name ?? "",
    jobTitle: row.job_title ?? staffMember?.job_roles?.title ?? "",
    status: staffMember?.status ?? (row.is_active ? "Active" : "Inactive"),
    startDate: row.start_date ?? staffMember?.start_date ?? "",
    createdAt: row.created_at,
  };
}

async function getProfileByUserId(userId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_user_profiles")
    .select(EXPANDED_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle<AccountProfileRow>();

  if (!error) {
    return data;
  }

  if (!isMissingExpandedProfileColumn(error.message)) {
    throw new Error(`Failed to fetch account profile: ${error.message}`);
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("app_user_profiles")
    .select(BASE_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle<AccountProfileRow>();

  if (fallbackError) {
    throw new Error(`Failed to fetch account profile: ${fallbackError.message}`);
  }

  return fallbackData;
}

async function getStaffMemberByEmail(email: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select(STAFF_SELECT)
    .eq("email", email)
    .maybeSingle<StaffMemberRow>();

  if (!error) {
    return data;
  }

  if (!isMissingProfileImageColumn(error.message)) {
    throw new Error(`Failed to fetch staff account: ${error.message}`);
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("staff_members")
    .select(BASE_STAFF_SELECT)
    .eq("email", email)
    .maybeSingle<StaffMemberRow>();

  if (fallbackError) {
    throw new Error(`Failed to fetch staff account: ${fallbackError.message}`);
  }

  return fallbackData;
}

export async function getCurrentAccountProfile() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await getProfileByUserId(user.id);

  if (!profile) {
    return null;
  }

  const staffMember = await getStaffMemberByEmail(profile.email);

  return mapAccountProfile(profile, staffMember);
}

async function getAllAccountProfiles() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_user_profiles")
    .select(EXPANDED_PROFILE_SELECT)
    .order("full_name", { ascending: true })
    .returns<AccountProfileRow[]>();

  if (!error) {
    return data;
  }

  if (!isMissingExpandedProfileColumn(error.message)) {
    throw new Error(`Failed to fetch account profiles: ${error.message}`);
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("app_user_profiles")
    .select(BASE_PROFILE_SELECT)
    .order("full_name", { ascending: true })
    .returns<AccountProfileRow[]>();

  if (fallbackError) {
    throw new Error(`Failed to fetch account profiles: ${fallbackError.message}`);
  }

  return fallbackData;
}

async function getAllStaffMembers() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select(STAFF_SELECT)
    .returns<StaffMemberRow[]>();

  if (!error) {
    return data;
  }

  if (!isMissingProfileImageColumn(error.message)) {
    throw new Error(`Failed to fetch staff members: ${error.message}`);
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("staff_members")
    .select(BASE_STAFF_SELECT)
    .returns<StaffMemberRow[]>();

  if (fallbackError) {
    throw new Error(`Failed to fetch staff members: ${fallbackError.message}`);
  }

  return fallbackData;
}

export async function getStaffAccountSummaries() {
  const [profiles, staffMembers] = await Promise.all([getAllAccountProfiles(), getAllStaffMembers()]);
  const staffByEmail = new Map(staffMembers.map((staff) => [staff.email.toLowerCase(), staff]));

  return profiles
    .filter((profile) => profile.is_active && getRoles(profile).includes("staff"))
    .map((profile) => mapStaffSummary(profile, staffByEmail.get(profile.email.toLowerCase()) ?? null));
}
