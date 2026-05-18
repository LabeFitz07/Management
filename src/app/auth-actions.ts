"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

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
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 6) {
    redirect("/?signup=invalid");
  }

  let adminSupabase: ReturnType<typeof getSupabaseAdminClient>;

  try {
    adminSupabase = getSupabaseAdminClient();
  } catch {
    redirect("/?signup=setup");
  }

  const { data: createdUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || email.split("@")[0],
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

  const { data: staffRole, error: roleError } = await adminSupabase
    .from("app_roles")
    .select("id")
    .eq("code", "staff")
    .single<{ id: string }>();

  if (roleError) {
    redirect("/?signup=setup");
  }

  const { error: profileError } = await adminSupabase.from("app_user_profiles").upsert({
    user_id: createdUser.user.id,
    email,
    full_name: fullName || email.split("@")[0],
    is_active: true,
  });

  if (profileError) {
    redirect("/?signup=setup");
  }

  const { error: assignmentError } = await adminSupabase.from("user_role_assignments").upsert({
    user_id: createdUser.user.id,
    role_id: staffRole.id,
  });

  if (assignmentError) {
    redirect("/?signup=setup");
  }

  redirect("/?signup=created");
}

export async function logout() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
