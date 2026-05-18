import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { login, signUp } from "./auth-actions";

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
  const signupState = params.signup;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_42%,_#ecfeff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-white/80 bg-slate-950 p-7 text-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] sm:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-lg font-bold text-slate-950">
              FT
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Fitz Task Manager
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                Plan work with a focused task board.
              </h1>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-2xl font-semibold">01</p>
              <p className="mt-2 text-sm text-slate-300">Create tasks</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-2xl font-semibold">02</p>
              <p className="mt-2 text-sm text-slate-300">Track progress</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-2xl font-semibold">03</p>
              <p className="mt-2 text-sm text-slate-300">Finish clearly</p>
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Login
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)] backdrop-blur sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Staff Account
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Create staff login</h2>
            </div>

            <form action={signUp} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Full Name</span>
                <input
                  name="fullName"
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  placeholder="Fitz Gerard Labe"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  placeholder="fitz@example.com"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  placeholder="At least 6 characters"
                />
              </label>

              {signupState === "invalid" ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Enter a valid email and a password with at least 6 characters.
                </p>
              ) : null}

              {signupState === "error" ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Account creation failed. Please try again.
                </p>
              ) : null}

              {signupState === "exists" ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This email already has an account. Sign in with that email instead.
                </p>
              ) : null}

              {signupState === "rate-limit" ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Signup is temporarily rate limited. Try again in a few minutes.
                </p>
              ) : null}

              {signupState === "created" ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Account created. Sign in with the email and password you just used.
                </p>
              ) : null}

              {signupState === "setup" ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Account created, but role setup is not ready. Ask the admin to finish the database setup.
                </p>
              ) : null}

              {signupState === "check-email" ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Check your email to confirm the account, then sign in.
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Create Account
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
