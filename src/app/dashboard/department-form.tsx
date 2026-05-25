import type { DepartmentAdminRecord, DepartmentRecord } from "@/lib/department-store";

type DepartmentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  departmentToEdit?: DepartmentRecord | null;
  departmentAdmin?: DepartmentAdminRecord | null;
};

export function DepartmentForm({ action, departmentToEdit, departmentAdmin = null }: DepartmentFormProps) {
  const isEditMode = Boolean(departmentToEdit);
  const hasAssignedAdmin = Boolean(departmentAdmin);
  const assignedAdmin = departmentAdmin;

  return (
    <form action={action} className="space-y-6">
      {departmentToEdit ? <input type="hidden" name="departmentId" value={departmentToEdit.id} /> : null}
      {departmentAdmin ? <input type="hidden" name="adminUserId" value={departmentAdmin.userId} /> : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Department name</span>
        <input
          name="departmentName"
          defaultValue={departmentToEdit?.name ?? ""}
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
          placeholder="Information Technology"
        />
      </label>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mb-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {isEditMode ? "Department admin account" : "Department admin credentials"}
          </h3>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            {isEditMode
              ? "Update the assigned department admin profile and optionally change the password."
              : "Create the admin who will manage this department. This user will be assigned the department-admin role."}
          </p>
        </div>

        {isEditMode ? (
          assignedAdmin ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              Current admin: <span className="font-semibold">{assignedAdmin.fullName}</span>
              {assignedAdmin.email ? ` (${assignedAdmin.email})` : ""}
            </div>
          ) : (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              No department admin is currently assigned to this department. Fill out the fields below to assign one now.
            </div>
          )
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">First name</span>
            <input
              name="adminFirstName"
              required
              defaultValue={departmentAdmin?.firstName ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
              placeholder={assignedAdmin?.firstName ?? "Jane"}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Last name</span>
            <input
              name="adminLastName"
              required
              defaultValue={departmentAdmin?.lastName ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
              placeholder={assignedAdmin?.lastName ?? "Doe"}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Middle name</span>
          <input
            name="adminMiddleName"
            defaultValue={departmentAdmin?.middleName ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
            placeholder={assignedAdmin?.middleName || "Marie"}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
          <input
            type="email"
            name="adminEmail"
            required
            defaultValue={departmentAdmin?.email ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
            placeholder={assignedAdmin?.email ?? "jane@example.com"}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</span>
          <input
            name="adminPhone"
            required
            defaultValue={departmentAdmin?.phone ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
            placeholder={assignedAdmin?.phone || "0917 555 1234"}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isEditMode ? "New password (optional)" : "Password"}
            </span>
            <input
              type="password"
              name="adminPassword"
              required={!isEditMode}
              minLength={6}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
              placeholder={isEditMode ? "Leave blank to keep current password" : "Create a secure password"}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isEditMode ? "Confirm new password" : "Confirm password"}
            </span>
            <input
              type="password"
              name="adminConfirmPassword"
              required={!isEditMode}
              minLength={6}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
              placeholder={isEditMode ? "Repeat the new password" : "Re-enter password"}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Profile picture</span>
          <input
            type="file"
            name="profileImage"
            accept="image/jpeg,image/png,image/webp"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:text-white file:hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {departmentToEdit ? "Save Changes" : "Create Department"}
      </button>
    </form>
  );
}
