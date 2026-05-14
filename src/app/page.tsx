import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { login } from "./auth-actions";
import { registerStaffRequest } from "./registration-actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    register?: string;
    register_error?: string;
    registered?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const accessProfile = await getCurrentUserAccessProfile();

    if (accessProfile?.roles.includes("staff")) {
      redirect("/staff");
    }

    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const hasError = params.error === "invalid";
  const isUnauthorized = params.error === "unauthorized";
  const isRegisterOpen = params.register === "1";
  const registerError = params.register_error;
  const isRegistered = params.registered === "success";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(199,121,48,0.28),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(58,90,109,0.24),_transparent_26%),linear-gradient(180deg,_#f9f3ea_0%,_#efe4d2_45%,_#d9cfbf_100%)] px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2.25rem] border border-white/60 bg-stone-950 px-7 py-10 text-stone-50 shadow-[0_24px_80px_rgba(32,23,12,0.28)] sm:px-10 lg:px-12">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-stone-200">
            Staff Management System
          </span>

          <div className="mt-8 max-w-2xl space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Secure staff operations from one focused workspace.
            </h1>
            <p className="max-w-xl text-sm leading-7 text-stone-300 sm:text-base">
              Manage employee records, departments, roles, and status updates through a
              single internal dashboard built for daily HR and admin work.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-400">Directory</p>
              <p className="mt-3 text-xl font-semibold text-white">Employee records</p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-400">Workflow</p>
              <p className="mt-3 text-xl font-semibold text-white">Fast CRUD actions</p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-400">Access</p>
              <p className="mt-3 text-xl font-semibold text-white">Login-gated dashboard</p>
            </article>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[2.25rem] border border-white/70 bg-white/82 p-6 shadow-[0_24px_80px_rgba(80,57,27,0.16)] backdrop-blur sm:p-8">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Sign In
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
                Access your account
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                Approved admins, HR users, and staff can sign in here.
              </p>
            </div>

            <form action={login} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                  placeholder="you@company.com"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Password</span>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                  placeholder="Enter password"
                />
              </label>

              {hasError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Invalid login credentials.
                </p>
              ) : null}

              {isUnauthorized ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Login succeeded, but this account is not active for this portal yet.
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                Login
              </button>
            </form>
          </div>

          <div className="rounded-[2.25rem] border border-white/70 bg-white/82 p-6 shadow-[0_24px_80px_rgba(80,57,27,0.16)] backdrop-blur sm:p-8">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Staff Registration
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
                Request a staff account
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                Submit your details first. An admin will review and approve your account, then share your temporary login credentials.
              </p>
            </div>
            {isRegistered ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Registration request submitted. Wait for admin approval and temporary credentials.
              </p>
            ) : null}

            <Link
              href="/?register=1"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Register as Staff
            </Link>

            <p className="mt-5 text-sm text-stone-500">
              Admins approve new staff accounts from the internal dashboard.
            </p>
          </div>
        </section>

        {isRegisterOpen ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
            <div className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)]">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-stone-200 bg-white/95 px-6 py-5 backdrop-blur">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                    Staff Registration
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                    Request a staff account
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Submit your details first. Admin will review and approve your account.
                  </p>
                </div>
                <Link
                  href="/"
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-950 hover:text-stone-950"
                >
                  Close
                </Link>
              </div>

              <form action={registerStaffRequest} className="space-y-4 px-6 py-6">
                {registerError === "schema" ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Registration is not ready yet. The database table for staff requests has not been created in Supabase.
                  </p>
                ) : null}

                {registerError === "submit" ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Failed to submit registration request. Try again after the admin finishes the database setup.
                  </p>
                ) : null}

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-stone-700">Full Name</span>
                  <input
                    name="fullName"
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                    placeholder="Juan Dela Cruz"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-stone-700">Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                    placeholder="juan@company.com"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-stone-700">Phone</span>
                    <input
                      name="phone"
                      required
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                      placeholder="+63 912 345 6789"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-stone-700">Start Date</span>
                    <input
                      type="date"
                      name="startDate"
                      required
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-stone-700">Department</span>
                    <input
                      name="department"
                      required
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                      placeholder="Human Resources"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-stone-700">Role</span>
                    <input
                      name="role"
                      required
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                      placeholder="Talent Coordinator"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  Submit Registration
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
