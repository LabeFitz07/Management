import { getSupabaseAdminClient } from "./supabase-admin";

export type RoleRecord = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
};

type RoleRow = {
  id: string;
  code: string;
  name: string;
  created_at: string;
};

function mapRole(row: RoleRow): RoleRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function getRoles() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_roles")
    .select("id, code, name, created_at")
    .order("name", { ascending: true })
    .returns<RoleRow[]>();

  if (error) {
    throw new Error(`Failed to fetch roles: ${error.message}`);
  }

  return data.map(mapRole);
}

export async function getRoleByCode(code: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_roles")
    .select("id, code, name, created_at")
    .eq("code", code)
    .maybeSingle<RoleRow>();

  if (error) {
    throw new Error(`Failed to fetch role: ${error.message}`);
  }

  return data ? mapRole(data) : null;
}
