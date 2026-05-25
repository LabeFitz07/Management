import { getSupabaseAdminClient } from "./supabase-admin";

export type DepartmentRecord = {
  id: string;
  name: string;
  createdAt: string;
};

export type DepartmentAdminRecord = {
  userId: string;
  email: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  profileImageUrl: string;
};

type DepartmentRow = {
  id: string;
  name: string;
  created_at: string;
};

type DepartmentAdminAssignmentRow = {
  user_id: string;
  app_user_profiles: {
    email: string;
    full_name: string;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    profile_image_url?: string | null;
  } | null;
};

function mapDepartment(row: DepartmentRow): DepartmentRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
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

function mapDepartmentAdmin(row: DepartmentAdminAssignmentRow): DepartmentAdminRecord | null {
  if (!row.app_user_profiles) {
    return null;
  }

  const fallbackName = splitFullName(row.app_user_profiles.full_name);

  return {
    userId: row.user_id,
    email: row.app_user_profiles.email,
    fullName: row.app_user_profiles.full_name,
    firstName: row.app_user_profiles.first_name ?? fallbackName.firstName,
    middleName: row.app_user_profiles.middle_name ?? fallbackName.middleName,
    lastName: row.app_user_profiles.last_name ?? fallbackName.lastName,
    phone: row.app_user_profiles.phone ?? "",
    profileImageUrl: row.app_user_profiles.profile_image_url ?? "",
  };
}

export async function getDepartments(departmentIds?: string[]) {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("departments")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (departmentIds && departmentIds.length > 0) {
    query = query.in("id", departmentIds);
  }

  const { data, error } = await query.returns<DepartmentRow[]>();

  if (error) {
    throw new Error(`Failed to fetch departments: ${error.message}`);
  }

  return data.map(mapDepartment);
}

export async function getManagedDepartmentIdsForUser(userId: string) {
  if (!userId) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("department_admin_assignments")
    .select("department_id")
    .eq("user_id", userId)
    .returns<Array<{ department_id: string }>>();

  if (error) {
    throw new Error(`Failed to fetch managed departments: ${error.message}`);
  }

  return data.map((row) => row.department_id);
}

export async function getDepartmentById(departmentId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, created_at")
    .eq("id", departmentId)
    .maybeSingle<DepartmentRow>();

  if (error) {
    throw new Error(`Failed to load department: ${error.message}`);
  }

  return data ? mapDepartment(data) : null;
}

export async function getDepartmentAdminByDepartmentId(departmentId: string) {
  if (!departmentId) {
    throw new Error("Department ID is required.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("department_admin_assignments")
    .select("user_id, app_user_profiles(email, full_name, first_name, middle_name, last_name, phone, profile_image_url)")
    .eq("department_id", departmentId)
    .eq("is_primary", true)
    .maybeSingle<DepartmentAdminAssignmentRow>();

  if (error) {
    throw new Error(`Failed to load department admin: ${error.message}`);
  }

  return data ? mapDepartmentAdmin(data) : null;
}

export async function createDepartment(name: string) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Department name is required.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("departments")
    .insert({ name: normalizedName })
    .select("id, name, created_at")
    .single<DepartmentRow>();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique")) {
      throw new Error("A department with this name already exists.");
    }

    throw new Error(`Failed to create department: ${error.message}`);
  }

  return mapDepartment(data);
}

export async function updateDepartment(departmentId: string, name: string) {
  const normalizedName = name.trim();

  if (!departmentId) {
    throw new Error("Department ID is required.");
  }

  if (!normalizedName) {
    throw new Error("Department name is required.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("departments")
    .update({ name: normalizedName })
    .eq("id", departmentId)
    .select("id, name, created_at")
    .single<DepartmentRow>();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique")) {
      throw new Error("A department with this name already exists.");
    }

    throw new Error(`Failed to update department: ${error.message}`);
  }

  return mapDepartment(data);
}

export async function deleteDepartment(departmentId: string) {
  if (!departmentId) {
    throw new Error("Department ID is required.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("departments").delete().eq("id", departmentId);

  if (error) {
    throw new Error(`Failed to delete department: ${error.message}`);
  }
}
