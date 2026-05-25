import Link from "next/link";
import { redirect } from "next/navigation";
import { updateDepartmentAction } from "@/app/department-actions";
import { DepartmentForm } from "../../../department-form";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import {
  getDepartmentAdminByDepartmentId,
  getDepartments,
  getManagedDepartmentIdsForUser,
} from "@/lib/department-store";
import { canAccessDashboard, isDepartmentAdminRole } from "@/lib/roles";

type DashboardDepartmentEditPageProps = {
  params: Promise<{
    departmentId: string;
  }>;
};

export default async function DashboardDepartmentEditPage({ params }: DashboardDepartmentEditPageProps) {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive || !canAccessDashboard(accessProfile.roles)) {
    redirect("/");
  }

  const { departmentId } = await params;
  const isDepartmentAdmin = isDepartmentAdminRole(accessProfile.roles);
  const managedDepartmentIds = isDepartmentAdmin
    ? await getManagedDepartmentIdsForUser(accessProfile.userId).catch(() => [])
    : undefined;
  const departments = await getDepartments(managedDepartmentIds).catch(() => []);
  const departmentToEdit = departments.find((department) => department.id === departmentId) ?? null;

  if (!departmentToEdit) {
    redirect("/dashboard/departments");
  }

  const departmentAdmin = await getDepartmentAdminByDepartmentId(departmentId);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#e0f2fe_48%,_#ecfdf5_100%)] px-4 py-6 text-slate-950 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#082f49_100%)] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/85">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Departments
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Edit Department</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Update the department name and assigned department admin account.
            </p>
          </div>
          <Link
            href="/dashboard/departments"
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
          >
            Back to departments
          </Link>
        </div>

        <div className="mt-6">
          <DepartmentForm
            action={updateDepartmentAction}
            departmentToEdit={departmentToEdit}
            departmentAdmin={departmentAdmin}
          />
        </div>
      </div>
    </main>
  );
}
