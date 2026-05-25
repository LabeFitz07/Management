import Link from "next/link";
import { approveStaffRequest } from "@/app/registration-actions";
import { createStaffMember, deleteStaffMember, updateStaffMember } from "@/app/staff-actions";
import { getStaffAccountByUserId, getStaffAccountSummaries, type StaffAccountSummary } from "@/lib/account-store";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getDepartments, getManagedDepartmentIdsForUser } from "@/lib/department-store";
import { getJobRoles } from "@/lib/job-role-store";
import { getPendingStaffRegistrationRequests, type StaffRegistrationRequest } from "@/lib/registration-store";
import { isDepartmentAdminRole } from "@/lib/roles";
import { formatTaskDate } from "@/lib/task-ui";
import { StaffForm } from "../staff-form";

type DashboardStaffPageProps = {
  searchParams?: Promise<{
    staffModal?: string;
    staffEdit?: string;
    staff?: string;
  }>;
};

const STAFF_STATUS_MESSAGES: Record<string, { className: string; text: string }> = {
  created: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    text: "Staff account created successfully.",
  },
  updated: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    text: "Staff account updated successfully.",
  },
  deleted: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    text: "Staff account removed successfully.",
  },
  approved: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    text: "Staff account approved. The user can now log in.",
  },
  invalid: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "Complete all required staff fields before saving.",
  },
  mismatch: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "Passwords must match and be at least 6 characters when provided.",
  },
  photo: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "Upload a JPG, PNG, or WebP profile image under 5 MB.",
  },
  "photo-upload": {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "Staff account saved, but the profile image could not be uploaded.",
  },
  exists: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "That email is already registered to another account.",
  },
  setup: {
    className: "border-red-200 bg-red-50 text-red-700",
    text: "Staff management is not fully configured. Check the Supabase admin setup and schema.",
  },
  error: {
    className: "border-red-200 bg-red-50 text-red-700",
    text: "The staff account could not be saved. Try again in a moment.",
  },
};

function getInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "TM";
}

function formatOptionalDate(date: string) {
  return date ? formatTaskDate(date) : "Not set";
}

function normalizeDepartmentName(department: string) {
  return department.trim() || "Unassigned";
}

function groupStaffAccountsByDepartment(staffAccounts: StaffAccountSummary[]) {
  const grouped = staffAccounts.reduce<Map<string, StaffAccountSummary[]>>((groups, staffAccount) => {
    const department = normalizeDepartmentName(staffAccount.department);
    const existingGroup = groups.get(department) ?? [];
    existingGroup.push(staffAccount);
    groups.set(department, existingGroup);
    return groups;
  }, new Map());

  return Array.from(grouped.entries())
    .map(([department, departmentStaff]) => ({
      department,
      staffAccounts: departmentStaff.sort((left, right) => left.fullName.localeCompare(right.fullName)),
    }))
    .sort((left, right) => left.department.localeCompare(right.department));
}

function StaffAccountCard({
  staffAccount,
  canAssignTasks,
}: {
  staffAccount: StaffAccountSummary;
  canAssignTasks: boolean;
}) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          {staffAccount.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={staffAccount.profileImageUrl}
              alt={`${staffAccount.fullName} profile`}
              className="h-20 w-20 rounded-[1.4rem] object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] bg-slate-950 text-lg font-semibold text-white">
              {getInitials(staffAccount.fullName)}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words text-xl font-semibold text-slate-950 dark:text-white">{staffAccount.fullName}</h3>
              {staffAccount.employeeId ? (
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                  {staffAccount.employeeId}
                </span>
              ) : null}
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                {staffAccount.status || "Active"}
              </span>
            </div>
            <p className="mt-2 text-base font-medium text-slate-700 dark:text-slate-300">
              {staffAccount.jobTitle || "Staff"} {staffAccount.department ? `| ${staffAccount.department}` : ""}
            </p>
            <div className="mt-3 grid gap-2 text-sm text-slate-500 dark:text-slate-400 sm:grid-cols-2 xl:grid-cols-3">
              <span>{staffAccount.email}</span>
              {staffAccount.phone ? <span>{staffAccount.phone}</span> : null}
              <span>Started {formatOptionalDate(staffAccount.startDate)}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[220px]">
          <Link
            href={`/dashboard/staff?staffEdit=${staffAccount.userId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
          >
            Edit
          </Link>
          <form action={deleteStaffMember}>
            <input type="hidden" name="userId" value={staffAccount.userId} />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Remove
            </button>
          </form>
          <a
            href={`mailto:${staffAccount.email}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
          >
            Email
          </a>
          {canAssignTasks ? (
            <Link
              href="/dashboard/workflow?add=1"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Assign Task
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PendingApprovalCard({ request }: { request: StaffRegistrationRequest }) {
  return (
    <article className="rounded-[1.6rem] border border-blue-200 bg-blue-50/70 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-slate-950">{request.fullName}</h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
              Pending approval
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-700">
            {request.role} {request.department ? `| ${request.department}` : ""}
          </p>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <span>{request.email}</span>
            <span>{request.phone}</span>
            <span>Requested {formatOptionalDate(request.requestedAt)}</span>
            <span>Start {formatOptionalDate(request.startDate)}</span>
          </div>
        </div>

        <form action={approveStaffRequest}>
          <input type="hidden" name="id" value={request.id} />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Approve Account
          </button>
        </form>
      </div>
    </article>
  );
}

export default async function DashboardStaffPage({ searchParams }: DashboardStaffPageProps) {
  const params = (await searchParams) ?? {};
  const staffStatus = params.staff;
  const staffStatusMessage = staffStatus ? STAFF_STATUS_MESSAGES[staffStatus] : null;
  const accessProfile = await getCurrentUserAccessProfile();
  const isDepartmentAdmin = accessProfile ? isDepartmentAdminRole(accessProfile.roles) : false;
  const managedDepartmentIds =
    isDepartmentAdmin && accessProfile ? await getManagedDepartmentIdsForUser(accessProfile.userId).catch(() => []) : [];
  const scopedDepartments = await getDepartments(isDepartmentAdmin ? managedDepartmentIds : undefined).catch(() => []);
  const visibleDepartmentNames = scopedDepartments.map((department) => department.name);
  const staffToEdit = params.staffEdit
    ? await getStaffAccountByUserId(params.staffEdit, isDepartmentAdmin ? visibleDepartmentNames : undefined).catch(() => null)
    : null;
  const isStaffModalOpen =
    params.staffModal === "1" ||
    Boolean(staffToEdit) ||
    Boolean(staffStatus && !["created", "updated", "deleted", "approved"].includes(staffStatus));

  const [staffAccounts, jobRoles, pendingRequests] = await Promise.all([
    getStaffAccountSummaries(isDepartmentAdmin ? visibleDepartmentNames : undefined).catch(() => []),
    getJobRoles(isDepartmentAdmin ? managedDepartmentIds : undefined).catch(() => []),
    getPendingStaffRegistrationRequests(isDepartmentAdmin ? visibleDepartmentNames : undefined).catch(() => []),
  ]);
  const departments = scopedDepartments;
  const departmentGroups = groupStaffAccountsByDepartment(staffAccounts);
  const assignedDepartmentCount = departmentGroups.filter((group) => group.department !== "Unassigned").length;

  return (
    <div className="flex flex-col gap-6">
      {staffStatusMessage ? (
        <section className={`rounded-2xl border p-5 text-sm leading-6 ${staffStatusMessage.className}`}>
          {staffStatusMessage.text}
        </section>
      ) : null}

      {pendingRequests.length > 0 ? (
        <section
          id="approval-queue"
          className="rounded-[2rem] border border-blue-200 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="flex flex-col gap-3 border-b border-blue-100 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Approval Queue</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">Pending Staff Signups</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Review new staff registrations before they are allowed to log in and access workspace tasks.
              </p>
            </div>
            <span className="w-fit rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              {pendingRequests.length} waiting
            </span>
          </div>

          <div className="grid gap-4 px-6 py-6">
            {pendingRequests.map((request) => (
              <PendingApprovalCard key={request.id} request={request} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Accounts</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Staff Directory</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {isDepartmentAdmin
                ? "Manage staff inside your department without exposing records from other teams."
                : "A simpler directory view with clear edit and remove actions for every staff account."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/staff?staffModal=1"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create Staff
            </Link>
            <span className="w-fit rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              {staffAccounts.length} staff
            </span>
          </div>
        </div>

        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Department View</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {isDepartmentAdmin
                  ? "Staff accounts are grouped by your managed department so you can review your own team quickly."
                  : "Staff accounts are now separated by department so superadmin can scan ownership, count headcount, and spot unassigned records faster."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {assignedDepartmentCount} departments
              </span>
              {departmentGroups.map((group) => (
                <span
                  key={group.department}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  {group.department}: {group.staffAccounts.length}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6">
          {staffAccounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/70">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">No staff accounts yet</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Staff accounts appear here after signup or admin creation.
              </p>
            </div>
          ) : (
            departmentGroups.map((group) => (
              <section
                key={group.department}
                className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70 sm:p-5"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Department</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{group.department}</h3>
                  </div>
                  <span className="w-fit rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                    {group.staffAccounts.length} member{group.staffAccounts.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-4 grid gap-4">
                  {group.staffAccounts.map((staffAccount) => (
                    <StaffAccountCard
                      key={staffAccount.userId}
                      staffAccount={staffAccount}
                      canAssignTasks
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </section>

      {isStaffModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-0 backdrop-blur-sm sm:items-start sm:px-6 sm:py-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)] dark:border-slate-800 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {staffToEdit ? "Edit Staff Account" : "New Staff Account"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {staffToEdit ? staffToEdit.fullName : "Create staff"}
                </h2>
              </div>
              <Link
                href="/dashboard/staff"
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
              >
                Close
              </Link>
            </div>

            <div className="px-6 py-6">
              {departments.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                  Create at least one department before adding staff accounts.
                </div>
              ) : jobRoles.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                  Create at least one department role before adding staff accounts.
                </div>
              ) : (
                <StaffForm
                  key={staffToEdit?.userId ?? "new-staff"}
                  action={staffToEdit ? updateStaffMember : createStaffMember}
                  departments={departments}
                  jobRoles={jobRoles}
                  staffToEdit={staffToEdit}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
