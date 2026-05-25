import Link from "next/link";
import { createRoleAction } from "@/app/role-actions";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getDepartments, getManagedDepartmentIdsForUser } from "@/lib/department-store";
import { getJobRoles } from "@/lib/job-role-store";
import { isDepartmentAdminRole } from "@/lib/roles";
import { formatTaskDate } from "@/lib/task-ui";
import RoleForm from "../role-form";

type DashboardRolesPageProps = {
  searchParams?: Promise<{
    roleModal?: string;
    role?: string;
  }>;
};

const ROLE_STATUS_MESSAGES: Record<string, { className: string; text: string }> = {
  created: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    text: "Department role created successfully.",
  },
  exists: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "That department already has a role with this name.",
  },
  invalid: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "Select a department and enter a role name before saving.",
  },
  error: {
    className: "border-red-200 bg-red-50 text-red-700",
    text: "The department role could not be created. Try again in a moment.",
  },
};

function formatOptionalDate(date: string) {
  return date ? formatTaskDate(date.slice(0, 10)) : "Not set";
}

function groupRolesByDepartment(
  roles: Awaited<ReturnType<typeof getJobRoles>>,
) {
  const grouped = roles.reduce<Map<string, typeof roles>>((groups, role) => {
    const departmentName = role.departmentName.trim() || "Unassigned";
    const existing = groups.get(departmentName) ?? [];
    existing.push(role);
    groups.set(departmentName, existing);
    return groups;
  }, new Map());

  return Array.from(grouped.entries())
    .map(([departmentName, departmentRoles]) => ({
      departmentName,
      roles: departmentRoles.sort((left, right) => left.title.localeCompare(right.title)),
    }))
    .sort((left, right) => left.departmentName.localeCompare(right.departmentName));
}

export default async function DashboardRolesPage({ searchParams }: DashboardRolesPageProps) {
  const params = (await searchParams) ?? {};
  const statusMessage = params.role ? ROLE_STATUS_MESSAGES[params.role] : null;
  const accessProfile = await getCurrentUserAccessProfile();
  const isDepartmentAdmin = accessProfile ? isDepartmentAdminRole(accessProfile.roles) : false;
  const managedDepartmentIds =
    isDepartmentAdmin && accessProfile ? await getManagedDepartmentIdsForUser(accessProfile.userId).catch(() => []) : [];
  const departments = await getDepartments(isDepartmentAdmin ? managedDepartmentIds : undefined).catch(() => []);
  const roles = await getJobRoles(isDepartmentAdmin ? managedDepartmentIds : undefined).catch(() => []);
  const groupedRoles = groupRolesByDepartment(roles);
  const isRoleModalOpen =
    params.roleModal === "1" || Boolean(params.role && !["created"].includes(params.role));

  return (
    <div className="flex flex-col gap-6">
      {statusMessage ? (
        <section className={`rounded-2xl border p-5 text-sm leading-6 ${statusMessage.className}`}>
          {statusMessage.text}
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Department Roles</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Job Roles By Department</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {isDepartmentAdmin
                ? "Create and manage the staff job roles that only belong to your department."
                : "Keep each department's staff job roles separate so titles stay aligned with the actual team structure."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/roles?roleModal=1"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create Role
            </Link>
            <span className="w-fit rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              {roles.length} roles
            </span>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          {groupedRoles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/70">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">No department roles yet</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Create job roles for each department so staff titles stay separated by team.
              </p>
            </div>
          ) : (
            groupedRoles.map((group) => (
              <section
                key={group.departmentName}
                className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70 sm:p-5"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Department</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{group.departmentName}</h3>
                  </div>
                  <span className="w-fit rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                    {group.roles.length} role{group.roles.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-4 grid gap-4">
                  {group.roles.map((role) => (
                    <article
                      key={role.id}
                      className="flex flex-col gap-3 rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/80 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <h4 className="text-lg font-semibold text-slate-950 dark:text-white">{role.title}</h4>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Department: {role.departmentName}</p>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Created {formatOptionalDate(role.createdAt)}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </section>

      {isRoleModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-0 backdrop-blur-sm sm:items-start sm:px-6 sm:py-6">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)] dark:border-slate-800 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">New Department Role</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Create department role</h2>
              </div>
              <Link
                href="/dashboard/roles"
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
              >
                Close
              </Link>
            </div>

            <div className="px-6 py-6">
              {departments.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                  Create or assign at least one department before adding department roles.
                </div>
              ) : (
                <RoleForm
                  action={createRoleAction}
                  departments={departments}
                  defaultDepartmentId={departments[0]?.id ?? ""}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
