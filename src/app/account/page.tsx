import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAccountProfile } from "@/lib/account-store";
import { logout } from "../auth-actions";
import { AccountForm } from "./account-form";
import { updateAccount } from "./actions";

type AccountPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

const STATUS_MESSAGES: Record<string, { className: string; text: string }> = {
  saved: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    text: "Account changes saved.",
  },
  invalid: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "Complete all required profile fields before saving.",
  },
  mismatch: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "New password and confirmation must match and be at least 6 characters.",
  },
  photo: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "Upload a JPG, PNG, or WebP profile picture under 5 MB.",
  },
  "photo-upload": {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "Account changes saved, but the profile picture could not be uploaded.",
  },
  exists: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "That email is already used by another account.",
  },
  credentials: {
    className: "border-red-200 bg-red-50 text-red-700",
    text: "Credentials could not be updated. Try again or use a different email.",
  },
  setup: {
    className: "border-red-200 bg-red-50 text-red-700",
    text: "Account setup is not ready. Apply the updated Supabase schema and storage setup.",
  },
};

function getReturnHref(roles: string[]) {
  return roles.includes("admin") ? "/dashboard" : "/staff";
}

function getRoleLabel(roles: string[]) {
  if (roles.includes("admin")) {
    return "Admin account";
  }

  if (roles.includes("hr")) {
    return "HR account";
  }

  return "Staff account";
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const account = await getCurrentAccountProfile();

  if (!account?.isActive) {
    redirect("/");
  }

  const params = (await searchParams) ?? {};
  const message = params.status ? STATUS_MESSAGES[params.status] : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#e0f2fe_48%,_#ecfdf5_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] lg:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Account Settings
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Edit your account
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">
                  {getRoleLabel(account.roles)}
                </span>
                {account.employeeId ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/15">
                    {account.employeeId}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={getReturnHref(account.roles)}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15"
              >
                Back
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15 sm:w-auto"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </section>

        {message ? (
          <section className={`rounded-2xl border p-5 text-sm leading-6 ${message.className}`}>
            {message.text}
          </section>
        ) : null}

        <AccountForm action={updateAccount} account={account} />
      </div>
    </main>
  );
}
