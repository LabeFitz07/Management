import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { logout } from "../auth-actions";
import {
  createStaffMember,
  deleteStaffMember,
  updateStaffMember,
} from "../staff-actions";
import { approveStaffRequest } from "../registration-actions";
import { StaffForm } from "./staff-form";
import { getStaffMembers } from "@/lib/staff-store";
import { getStaffRegistrationRequests } from "@/lib/registration-store";

type DashboardPageProps = {
  searchParams?: Promise<{
    add?: string;
    edit?: string;
    view?: string;
  }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getStatusClasses(status: string) {
  if (status === "Active") {
    return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200";
  }

  if (status === "On Leave") {
    return "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200";
  }

  return "bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-200";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/?error=unauthorized");
  }

  const canManageStaff =
    accessProfile.roles.includes("admin") || accessProfile.roles.includes("hr");

  if (!canManageStaff) {
    redirect("/?error=unauthorized");
  }

  const params = (await searchParams) ?? {};
  const staffMembers = await getStaffMembers();
  const registrationRequests = await getStaffRegistrationRequests();
  const isAddMode = params.add === "1";
  const staffToEdit = staffMembers.find((member) => member.id === params.edit) ?? null;
  const staffToView = staffMembers.find((member) => member.id === params.view) ?? null;
  const isFormOpen = isAddMode || Boolean(staffToEdit);

  const activeCount = staffMembers.filter((member) => member.status === "Active").length;
  const onLeaveCount = staffMembers.filter((member) => member.status === "On Leave").length;
  const inactiveCount = staffMembers.filter((member) => member.status === "Inactive").length;
  const departmentCount = new Set(staffMembers.map((member) => member.department)).size;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.12),_transparent_22%),linear-gradient(180deg,_#f7faf8_0%,_#eef4f1_55%,_#e7eeea_100%)] px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[1.75rem] border border-white/80 bg-white/80 shadow-[0_20px_70px_rgba(28,44,38,0.08)] backdrop-blur">
          <div className="flex flex-col gap-6 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full bg-teal-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
                  Admin Workspace
                </span>
                <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                  {accessProfile.roles.join(", ")}
                </span>
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  Staff administration
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
                  Organized employee records, profile data, and staff actions in one cleaner
                  back-office layout.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <span className="font-medium text-stone-900">{accessProfile.fullName}</span>
                {" "}
                signed in
              </div>
              <Link
                href="/dashboard?add=1"
                className="inline-flex items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Add Staff
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:border-stone-950 hover:text-stone-950 sm:w-auto"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(28,44,38,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Total Staff</p>
            <p className="mt-3 text-3xl font-semibold text-stone-950">{staffMembers.length}</p>
          </article>
          <article className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(28,44,38,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Active</p>
            <p className="mt-3 text-3xl font-semibold text-stone-950">{activeCount}</p>
          </article>
          <article className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(28,44,38,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">On Leave</p>
            <p className="mt-3 text-3xl font-semibold text-stone-950">{onLeaveCount}</p>
          </article>
          <article className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(28,44,38,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Departments</p>
            <p className="mt-3 text-3xl font-semibold text-stone-950">{departmentCount}</p>
          </article>
        </section>

        <section className="rounded-[1.75rem] border border-white/80 bg-white/88 shadow-[0_24px_70px_rgba(28,44,38,0.08)]">
          <div className="border-b border-stone-200 px-5 py-5 lg:px-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
              Staff Registration Requests
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">
              Approval queue
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Review new staff sign-up requests, approve them, and share the temporary password shown after approval.
            </p>
          </div>

          <div className="px-5 py-5 lg:px-7">
            {registrationRequests.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center text-stone-500">
                No pending or approved registration requests yet.
              </div>
            ) : (
              <div className="space-y-3">
                {registrationRequests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-[0_8px_24px_rgba(25,39,34,0.04)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-stone-950">{request.fullName}</h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              request.status === "approved"
                                ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200"
                                : "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200"
                            }`}
                          >
                            {request.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
                          <span>{request.email}</span>
                          <span>{request.phone}</span>
                          <span>{request.role}</span>
                          <span>{request.department}</span>
                        </div>
                        <p className="mt-2 text-sm text-stone-500">
                          Requested start date: {formatDate(request.startDate)}
                        </p>
                        {request.temporaryPassword ? (
                          <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                            Temporary password for admin to share:{" "}
                            <span className="font-semibold">{request.temporaryPassword}</span>
                          </p>
                        ) : null}
                      </div>

                      {request.status === "pending" ? (
                        <form action={approveStaffRequest}>
                          <input type="hidden" name="id" value={request.id} />
                          <button
                            type="submit"
                            className="rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
                          >
                            Confirm Staff
                          </button>
                        </form>
                      ) : (
                        <span className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600">
                          Approved
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <section className="rounded-[1.75rem] border border-white/80 bg-white/88 shadow-[0_24px_70px_rgba(28,44,38,0.08)]">
            <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-7">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
                  Directory
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                  Staff records
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600">
                  {activeCount} active
                </span>
                <span className="rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600">
                  {inactiveCount} inactive
                </span>
              </div>
            </div>

            <div className="px-5 py-5 lg:px-7">
              {staffMembers.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 px-6 py-14 text-center text-stone-500">
                  No staff records yet. Use the Add Staff button to create the first profile.
                </div>
              ) : (
                <div className="space-y-3">
                  {staffMembers.map((member) => (
                    <article
                      key={member.id}
                      className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-[0_8px_24px_rgba(25,39,34,0.04)]"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          {member.profileImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.profileImageUrl}
                              alt={`${member.fullName} profile`}
                              className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-stone-200"
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#134e4a,_#0f766e)] text-sm font-semibold text-white">
                              {getInitials(member.fullName)}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg font-semibold text-stone-950">
                                {member.fullName}
                              </h3>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(member.status)}`}
                              >
                                {member.status}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
                              <span>{member.role}</span>
                              <span>{member.department}</span>
                              <span>{member.employeeId}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 xl:self-start">
                          <Link
                            href={`/dashboard?view=${member.id}`}
                            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-950 hover:text-stone-950"
                          >
                            View Details
                          </Link>
                          <Link
                            href={`/dashboard?edit=${member.id}`}
                            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
                          >
                            Edit
                          </Link>
                          <form action={deleteStaffMember}>
                            <input type="hidden" name="id" value={member.id} />
                            <button
                              type="submit"
                              className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>

        {staffToView ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
            <div className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)]">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-stone-200 bg-white/95 px-5 py-5 backdrop-blur">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
                    View Details
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                    {staffToView.fullName}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Review the selected employee information here.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-950 hover:text-stone-950"
                >
                  Close
                </Link>
              </div>

              <div className="space-y-5 px-5 py-5">
                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-center gap-4">
                    {staffToView.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={staffToView.profileImageUrl}
                        alt={`${staffToView.fullName} profile`}
                        className="h-[4.5rem] w-[4.5rem] rounded-2xl object-cover ring-1 ring-stone-200"
                      />
                    ) : (
                      <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#134e4a,_#0f766e)] text-lg font-semibold text-white">
                        {getInitials(staffToView.fullName)}
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-semibold text-stone-950">{staffToView.fullName}</p>
                      <p className="mt-1 text-sm text-stone-500">
                        {staffToView.role} | {staffToView.department}
                      </p>
                      <span
                        className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(staffToView.status)}`}
                      >
                        {staffToView.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                    Contact
                  </p>
                  <div className="space-y-3 text-sm text-stone-600">
                    <p>
                      <span className="font-medium text-stone-900">Email:</span> {staffToView.email}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">Phone:</span> {staffToView.phone}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                    Employment
                  </p>
                  <div className="space-y-3 text-sm text-stone-600">
                    <p>
                      <span className="font-medium text-stone-900">Employee ID:</span>{" "}
                      {staffToView.employeeId}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">Department:</span>{" "}
                      {staffToView.department}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">Role:</span> {staffToView.role}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">Start Date:</span>{" "}
                      {formatDate(staffToView.startDate)}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">Profile Photo:</span>{" "}
                      {staffToView.profileImageUrl ? "Attached" : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`/dashboard?edit=${staffToView.id}`}
                    className="flex-1 rounded-full bg-stone-950 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-stone-800"
                  >
                    Edit Details
                  </Link>
                  <Link
                    href="/dashboard"
                    className="rounded-full border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 hover:border-stone-950 hover:text-stone-950"
                  >
                    Back
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isFormOpen ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
            <div className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)]">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-stone-200 bg-white/95 px-5 py-5 backdrop-blur">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
                    {staffToEdit ? "Edit Staff" : "Add Staff"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                    {staffToEdit ? `Edit ${staffToEdit.fullName}` : "Create a new staff profile"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {staffToEdit
                      ? "Update employee details in a focused modal."
                      : "Add a new employee without leaving the directory view."}
                  </p>
                </div>
                <Link
                  href={staffToView ? `/dashboard?view=${staffToView.id}` : "/dashboard"}
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-950 hover:text-stone-950"
                >
                  Close
                </Link>
              </div>

              <div className="px-5 py-5">
                <StaffForm
                  action={staffToEdit ? updateStaffMember : createStaffMember}
                  staffToEdit={staffToEdit}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
