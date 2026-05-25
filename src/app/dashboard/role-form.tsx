import React from "react";
import type { DepartmentRecord } from "@/lib/department-store";

export function RoleForm({
  action,
  departments,
  defaultDepartmentId = "",
}: {
  action: (formData: FormData) => Promise<void> | void;
  departments: DepartmentRecord[];
  defaultDepartmentId?: string;
}) {
  return (
    <form action={action} className="space-y-4" aria-label="Create role">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
        <select
          name="departmentId"
          defaultValue={defaultDepartmentId || departments[0]?.id || ""}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Department Role Name</label>
        <input
          name="roleName"
          placeholder="e.g. Network Support Specialist"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This job role will only belong to the selected department.</p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Create Department Role
        </button>
      </div>
    </form>
  );
}

export default RoleForm;
