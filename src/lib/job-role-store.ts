import { getSupabaseAdminClient } from "./supabase-admin";

export type JobRoleRecord = {
  id: string;
  title: string;
  departmentId: string | null;
  departmentName: string;
  createdAt: string;
};

type JobRoleRow = {
  id: string;
  title: string;
  department_id: string | null;
  created_at: string;
  departments: {
    name: string;
  } | null;
};

function mapJobRole(row: JobRoleRow): JobRoleRecord {
  return {
    id: row.id,
    title: row.title,
    departmentId: row.department_id,
    departmentName: row.departments?.name ?? "Unassigned",
    createdAt: row.created_at,
  };
}

const RESTRICTED_SIGNUP_JOB_TITLE_KEYWORDS = [
  "super admin",
  "superadmin",
  "administrator",
  "admin",
  "department admin",
  "human resources",
  "hr",
] as const;

function isRestrictedSignupJobTitle(title: string) {
  const normalized = title.trim().toLowerCase();
  return RESTRICTED_SIGNUP_JOB_TITLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export async function getJobRoles(departmentIds?: string[]) {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("job_roles")
    .select("id, title, department_id, created_at, departments(name)")
    .order("title", { ascending: true });

  if (departmentIds && departmentIds.length > 0) {
    query = query.in("department_id", departmentIds);
  }

  const { data, error } = await query.returns<JobRoleRow[]>();

  if (error) {
    throw new Error(`Failed to fetch job roles: ${error.message}`);
  }

  return data.map(mapJobRole);
}

export async function getPublicSignupJobRoles(departmentNames?: string[]) {
  const roles = await getJobRoles();
  const normalizedDepartments = (departmentNames ?? []).map((name) => name.trim().toLowerCase()).filter(Boolean);

  return roles.filter((role) => {
    if (isRestrictedSignupJobTitle(role.title)) {
      return false;
    }

    if (normalizedDepartments.length === 0) {
      return true;
    }

    return normalizedDepartments.includes(role.departmentName.trim().toLowerCase());
  });
}
