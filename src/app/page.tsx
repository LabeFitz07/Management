import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { login, signUp } from "./auth-actions";
import { SignupModal } from "./signup-modal";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    signup?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const hasInvalidLogin = params.error === "invalid";
  const hasSessionError = params.error === "session";
  const hasUnauthorizedError = params.error === "unauthorized";
  const signupState = params.signup;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#e0f2fe_48%,_#ecfdf5_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-7 text-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] sm:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-lg font-bold text-slate-950">
              TM
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Task Management
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                Field-ready task control.
              </h1>
            </div>
          </div>

          <div className="mt-10 grid gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/8 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-200">Admin command</p>
                <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">
                  Live
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-semibold">01</p>
                  <p className="mt-2 text-sm text-slate-300">Assign</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-semibold">02</p>
                  <p className="mt-2 text-sm text-slate-300">Track</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-semibold">03</p>
                  <p className="mt-2 text-sm text-slate-300">Close</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Staff queue
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">To Do | Active | Done</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Profiles
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">Photo | Role | Access</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)] backdrop-blur sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Login
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Access your tasks</h2>
            </div>

            <form action={login} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter password"
                />
              </label>

              {hasInvalidLogin ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Invalid email or password.
                </p>
              ) : null}

              {hasSessionError ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Please sign in again to continue.
                </p>
              ) : null}

              {hasUnauthorizedError ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Your account is not active yet. Contact an admin before continuing.
                </p>
              ) : null}

              <button
                type="submit"
                className="min-h-12 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Login
              </button>
            </form>
          </div>

          <SignupModal action={signUp} signupState={signupState} />
        </section>
      </div>
    </main>
  );
}
