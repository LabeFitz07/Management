"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const DEMO_EMAIL = "admin@staff.local";
const DEMO_PASSWORD = "admin123";
const SESSION_COOKIE = "staff-session";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    redirect("/?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}
