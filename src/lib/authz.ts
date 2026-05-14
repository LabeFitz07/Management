import { getSupabaseServerClient } from "./supabase-server";

export type UserAccessProfile = {
  userId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: string[];
};

type UserProfileRow = {
  user_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  user_role_assignments: Array<{
    app_roles: {
      code: string;
    } | null;
  }>;
};

export async function getCurrentUserAccessProfile() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("app_user_profiles")
    .select(
      "user_id, email, full_name, is_active, user_role_assignments(app_roles(code))",
    )
    .eq("user_id", user.id)
    .maybeSingle<UserProfileRow>();

  if (error) {
    throw new Error(`Failed to fetch user access profile: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.user_id,
    email: data.email,
    fullName: data.full_name,
    isActive: data.is_active,
    roles: data.user_role_assignments
      .map((assignment) => assignment.app_roles?.code)
      .filter((role): role is string => Boolean(role)),
  } satisfies UserAccessProfile;
}
