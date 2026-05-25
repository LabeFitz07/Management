import Link from "next/link";
import { createDepartmentWithAdminAction, deleteDepartmentAction, updateDepartmentAction } from "@/app/department-actions";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import {
  getDepartmentAdminByDepartmentId,
  getDepartments,
  getManagedDepartmentIdsForUser,
} from "@/lib/department-store";
import { isDepartmentAdminRole } from "@/lib/roles";
import { DepartmentForm } from "../department-form";

type DashboardDepartmentsPageProps = {
  searchParams?: Promise<{
    departmentModal?: string;
    departmentEdit?: string;
  }>;
};

export default async function DashboardDepartmentsPage({
  searchParams,
}: DashboardDepartmentsPageProps) {
  const params = (await searchParams) ?? {};
  const accessProfile = await getCurrentUserAccessProfile();
  const isDepartmentAdmin = accessProfile ? isDepartmentAdminRole(accessProfile.roles) : false;
  const managedDepartmentIds =
    isDepartmentAdmin && accessProfile ? await getManagedDepartmentIdsForUser(accessProfile.userId).catch(() => []) : [];
  const departments = await getDepartments(isDepartmentAdmin ? managedDepartmentIds : undefined).catch(() => []);
  const departmentToEdit = departments.find((department) => department.id === params.departmentEdit) ?? null;
  const departmentAdmin = departmentToEdit
    ? await getDepartmentAdminByDepartmentId(departmentToEdit.id)
    : null;
  const isDepartmentFormOpen = Boolean(departmentToEdit) || (!isDepartmentAdmin && params.departmentModal === "1");

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Structure</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Department Directory</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {isDepartmentAdmin
                ? "This view is scoped to the department you manage."
                : "Review departments, update admin assignments, and manage organizational structure."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isDepartmentAdmin ? (
              <Link
                href="/dashboard/departments?departmentModal=1"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Create Department
              </Link>
            ) : null}
            <span className="w-fit rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              {departments.length} departments
            </span>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          {departments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/70">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">No departments yet</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Create a department to organize staff records and office structure.
              </p>
            </div>
          ) : (
            departments.map((department) => (
              <article
                key={department.id}
                className="flex flex-col gap-4 rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/80 sm:flex-row sm:items-center sm:justify-between"
              >
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{department.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/departments?departmentEdit=${department.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                  >
                    Edit
                  </Link>
                  {!isDepartmentAdmin ? (
                    <form action={deleteDepartmentAction}>
                      <input type="hidden" name="departmentId" value={department.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {isDepartmentFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-0 backdrop-blur-sm sm:items-start sm:px-6 sm:py-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)] dark:border-slate-800 dark:bg-slate-950 sm:max-h-[calc(100vh-3rem)] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {departmentToEdit ? "Edit Department" : "New Department"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {departmentToEdit ? departmentToEdit.name : "Create a department"}
                </h2>
              </div>
              <Link
                href="/dashboard/departments"
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
              >
                Close
              </Link>
            </div>

            <div className="px-6 py-6">
              <DepartmentForm
                action={departmentToEdit ? updateDepartmentAction : createDepartmentWithAdminAction}
                departmentToEdit={departmentToEdit}
                departmentAdmin={departmentAdmin}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
