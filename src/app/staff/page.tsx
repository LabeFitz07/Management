import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { logout } from "../auth-actions";

type StaffMemberSelfRow = {
  full_name: string;
  email: string;
  phone: string;
  employee_id: string;
  status: string;
  start_date: string;
  departments: {
    name: string;
  } | null;
  job_roles: {
    title: string;
  } | null;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default async function StaffPage() {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive || !accessProfile.roles.includes("staff")) {
    redirect("/?error=unauthorized");
  }

  const supabase = await getSupabaseServerClient();
  const { data: staffProfile, error } = await supabase
    .from("staff_members")
    .select(
      "full_name, email, phone, employee_id, status, start_date, departments(name), job_roles(title)",
    )
    .eq("email", accessProfile.email)
    .maybeSingle<StaffMemberSelfRow>();

  if (error) {
    throw new Error(`Failed to load staff profile: ${error.message}`);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7faf8_0%,_#edf4f1_100%)] px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_24px_70px_rgba(28,44,38,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Staff Portal
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-stone-950">
                Welcome, {accessProfile.fullName}
              </h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Your account has been approved. Use the credentials provided by admin to sign in here.
              </p>
            </div>

            <form action={logout}>
              <button
                type="submit"
                className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:border-stone-950 hover:text-stone-950"
              >
                Logout
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(28,44,38,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Profile
            </p>
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <p><span className="font-medium text-stone-900">Name:</span> {staffProfile?.full_name ?? accessProfile.fullName}</p>
              <p><span className="font-medium text-stone-900">Email:</span> {staffProfile?.email ?? accessProfile.email}</p>
              <p><span className="font-medium text-stone-900">Phone:</span> {staffProfile?.phone ?? "-"}</p>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(28,44,38,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Employment
            </p>
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <p><span className="font-medium text-stone-900">Employee ID:</span> {staffProfile?.employee_id ?? "-"}</p>
              <p><span className="font-medium text-stone-900">Department:</span> {staffProfile?.departments?.name ?? "-"}</p>
              <p><span className="font-medium text-stone-900">Role:</span> {staffProfile?.job_roles?.title ?? "-"}</p>
              <p><span className="font-medium text-stone-900">Status:</span> {staffProfile?.status ?? "-"}</p>
              <p><span className="font-medium text-stone-900">Start Date:</span> {staffProfile?.start_date ? formatDate(staffProfile.start_date) : "-"}</p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
