import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "../auth-actions";
import {
  createStaffMember,
  deleteStaffMember,
  updateStaffMember,
} from "../staff-actions";
import { getStaffMembers } from "@/lib/staff-store";

type DashboardPageProps = {
  searchParams?: Promise<{
    edit?: string;
  }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const cookieStore = await cookies();

  if (cookieStore.get("staff-session")?.value !== "authenticated") {
    redirect("/");
  }

  const params = (await searchParams) ?? {};
  const staffMembers = await getStaffMembers();
  const staffToEdit = staffMembers.find((member) => member.id === params.edit) ?? null;

  const activeCount = staffMembers.filter((member) => member.status === "Active").length;
  const departmentCount = new Set(staffMembers.map((member) => member.department)).size;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(240,210,160,0.45),_transparent_32%),linear-gradient(180deg,_#fff8ef_0%,_#f6efe5_42%,_#ece3d4_100%)] px-4 py-8 text-stone-900 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/65 bg-white/80 shadow-[0_24px_80px_rgba(80,57,27,0.12)] backdrop-blur">
          <div className="flex flex-col gap-6 px-6 py-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div className="max-w-2xl space-y-4">
              <span className="inline-flex w-fit rounded-full border border-amber-900/10 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-950">
                Staff Management System
              </span>
              <div className="space-y-3">
                <h1 className="font-sans text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                  Manage employees, roles, and records in one place.
                </h1>
                <p className="max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
                  This dashboard keeps your staff directory organized with a clean
                  create, update, and delete workflow backed by local project storage.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:min-w-[18rem]">
              <div className="grid gap-3 sm:grid-cols-3">
                <article className="rounded-3xl border border-stone-200 bg-stone-950 px-5 py-4 text-stone-50">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-400">Total Staff</p>
                  <p className="mt-3 text-3xl font-semibold">{staffMembers.length}</p>
                </article>
                <article className="rounded-3xl border border-stone-200 bg-white px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Active</p>
                  <p className="mt-3 text-3xl font-semibold text-stone-950">{activeCount}</p>
                </article>
                <article className="rounded-3xl border border-stone-200 bg-white px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Departments</p>
                  <p className="mt-3 text-3xl font-semibold text-stone-950">{departmentCount}</p>
                </article>
              </div>

              <form action={logout} className="self-end">
                <button
                  type="submit"
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(80,57,27,0.10)] backdrop-blur">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                  {staffToEdit ? "Update Staff" : "Add Staff"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                  {staffToEdit ? staffToEdit.fullName : "New team member"}
                </h2>
              </div>
              {staffToEdit ? (
                <Link
                  href="/dashboard"
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                >
                  Cancel
                </Link>
              ) : null}
            </div>

            <form
              action={staffToEdit ? updateStaffMember : createStaffMember}
              className="space-y-4"
            >
              {staffToEdit ? <input type="hidden" name="id" value={staffToEdit.id} /> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-700">Employee ID</span>
                  <input
                    name="employeeId"
                    defaultValue={staffToEdit?.employeeId}
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                    placeholder="EMP-1001"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-700">Status</span>
                  <select
                    name="status"
                    defaultValue={staffToEdit?.status ?? "Active"}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                  >
                    <option>Active</option>
                    <option>On Leave</option>
                    <option>Inactive</option>
                  </select>
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-stone-700">Full Name</span>
                  <input
                    name="fullName"
                    defaultValue={staffToEdit?.fullName}
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                    placeholder="Juan Dela Cruz"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-700">Email</span>
                  <input
                    type="email"
                    name="email"
                    defaultValue={staffToEdit?.email}
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                    placeholder="juan@company.com"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-700">Phone</span>
                  <input
                    name="phone"
                    defaultValue={staffToEdit?.phone}
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                    placeholder="+63 912 345 6789"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-700">Department</span>
                  <input
                    name="department"
                    defaultValue={staffToEdit?.department}
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                    placeholder="Human Resources"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-700">Role</span>
                  <input
                    name="role"
                    defaultValue={staffToEdit?.role}
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                    placeholder="HR Manager"
                  />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-stone-700">Start Date</span>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={staffToEdit?.startDate}
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                {staffToEdit ? "Save changes" : "Create staff member"}
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(80,57,27,0.10)] backdrop-blur">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                  Staff Directory
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                  Current team records
                </h2>
              </div>
              <p className="text-sm text-stone-500">
                Full CRUD is available from this screen.
              </p>
            </div>

            <div className="space-y-4">
              {staffMembers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center text-stone-500">
                  No staff records yet. Add your first employee using the form.
                </div>
              ) : (
                staffMembers.map((member) => (
                  <article
                    key={member.id}
                    className="rounded-3xl border border-stone-200 bg-stone-50/80 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold text-stone-950">
                            {member.fullName}
                          </h3>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950">
                            {member.status}
                          </span>
                        </div>

                        <div className="grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
                          <p>
                            <span className="font-medium text-stone-900">Employee ID:</span>{" "}
                            {member.employeeId}
                          </p>
                          <p>
                            <span className="font-medium text-stone-900">Department:</span>{" "}
                            {member.department}
                          </p>
                          <p>
                            <span className="font-medium text-stone-900">Role:</span> {member.role}
                          </p>
                          <p>
                            <span className="font-medium text-stone-900">Start Date:</span>{" "}
                            {formatDate(member.startDate)}
                          </p>
                          <p>
                            <span className="font-medium text-stone-900">Email:</span> {member.email}
                          </p>
                          <p>
                            <span className="font-medium text-stone-900">Phone:</span> {member.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard?edit=${member.id}`}
                          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                        >
                          Edit
                        </Link>

                        <form action={deleteStaffMember}>
                          <input type="hidden" name="id" value={member.id} />
                          <button
                            type="submit"
                            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
