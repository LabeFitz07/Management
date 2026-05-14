import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "./auth-actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();

  if (cookieStore.get("staff-session")?.value === "authenticated") {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const hasError = params.error === "invalid";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(199,121,48,0.28),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(58,90,109,0.24),_transparent_26%),linear-gradient(180deg,_#f9f3ea_0%,_#efe4d2_45%,_#d9cfbf_100%)] px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.15fr_0.85fr]">
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

        <section className="rounded-[2.25rem] border border-white/70 bg-white/82 p-6 shadow-[0_24px_80px_rgba(80,57,27,0.16)] backdrop-blur sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Sign In
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
              Access the dashboard
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Use the default admin account below for this local project setup.
            </p>
          </div>

          <form action={login} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Email</span>
              <input
                type="email"
                name="email"
                required
                defaultValue="admin@staff.local"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                placeholder="admin@staff.local"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Password</span>
              <input
                type="password"
                name="password"
                required
                defaultValue="admin123"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                placeholder="Enter password"
              />
            </label>

            {hasError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Invalid login. Use `admin@staff.local` and `admin123`.
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Login
            </button>
          </form>

          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
            <p className="font-semibold">Demo credentials</p>
            <p className="mt-2">Email: `admin@staff.local`</p>
            <p>Password: `admin123`</p>
          </div>

          <p className="mt-5 text-sm text-stone-500">
            After sign in, you will be redirected to the
            {" "}
            <Link href="/dashboard" className="font-medium text-stone-900 underline">
              staff dashboard
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
