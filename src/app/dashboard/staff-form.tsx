"use client";

import { useMemo, useState } from "react";
import type { StaffAccountRecord } from "@/lib/account-store";
import type { DepartmentRecord } from "@/lib/department-store";
import type { JobRoleRecord } from "@/lib/job-role-store";

type StaffFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  departments: DepartmentRecord[];
  jobRoles: JobRoleRecord[];
  staffToEdit?: StaffAccountRecord | null;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function StaffForm({ action, departments, jobRoles, staffToEdit = null }: StaffFormProps) {
  const isEditMode = Boolean(staffToEdit);
  const defaultDepartmentId = staffToEdit
    ? departments.find((department) => department.name === staffToEdit.department)?.id ?? departments[0]?.id ?? ""
    : departments[0]?.id ?? "";
  const filteredJobRoles = useMemo(
    () => jobRoles.filter((role) => !role.departmentId || role.departmentId === defaultDepartmentId),
    [defaultDepartmentId, jobRoles],
  );
  const defaultJobRoleId = staffToEdit
    ? filteredJobRoles.find((role) => role.title === staffToEdit.jobTitle)?.id ?? filteredJobRoles[0]?.id ?? ""
    : filteredJobRoles[0]?.id ?? "";
  const [firstName, setFirstName] = useState(staffToEdit?.firstName ?? "");
  const [middleName, setMiddleName] = useState(staffToEdit?.middleName ?? "");
  const [lastName, setLastName] = useState(staffToEdit?.lastName ?? "");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId);
  const [selectedJobRoleId, setSelectedJobRoleId] = useState(defaultJobRoleId);

  const previewName = [firstName, middleName, lastName].filter(Boolean).join(" ") || "New team member";
  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId) ?? null;
  const departmentJobRoles = useMemo(
    () => jobRoles.filter((role) => !role.departmentId || role.departmentId === selectedDepartmentId),
    [jobRoles, selectedDepartmentId],
  );
  const selectedJobRole =
    departmentJobRoles.find((role) => role.id === selectedJobRoleId) ??
    departmentJobRoles[0] ??
    null;

  const departmentRoleOptions = departmentJobRoles;

  return (
    <form action={action} className="space-y-6">
      {staffToEdit ? <input type="hidden" name="userId" value={staffToEdit.userId} /> : null}

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Account Preview
        </p>
        <div className="mt-4 flex items-center gap-4">
          {staffToEdit?.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={staffToEdit.profileImageUrl}
              alt={`${previewName} profile`}
              className="h-[4.5rem] w-[4.5rem] rounded-2xl object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white">
              {getInitials(previewName)}
            </div>
          )}
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-950 dark:text-white">{previewName}</p>
            <p className="mt-1">
              {selectedJobRole?.title ?? "Select a department role"} {selectedDepartment ? `| ${selectedDepartment.name}` : ""}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/80">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Identity</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">First name</span>
            <input
              name="firstName"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
              placeholder="Juan"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Last name</span>
            <input
              name="lastName"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
              placeholder="Dela Cruz"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Middle name</span>
          <input
            name="middleName"
            value={middleName}
            onChange={(event) => setMiddleName(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
            placeholder="Santos"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
            <input
              type="email"
              name="email"
              required
              defaultValue={staffToEdit?.email ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
              placeholder="juan@company.com"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</span>
            <input
              name="phone"
              required
              defaultValue={staffToEdit?.phone ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
              placeholder="+63 912 345 6789"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Employee ID {isEditMode ? "" : "(optional)"}</span>
          <input
            name="employeeId"
            defaultValue={staffToEdit?.employeeId ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
            placeholder={isEditMode ? "EMP-1001" : "Auto-generated if blank"}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/80">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Access Setup</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Department</span>
            <select
              name="departmentId"
              value={selectedDepartmentId}
              onChange={(event) => {
                const nextDepartmentId = event.target.value;
                setSelectedDepartmentId(nextDepartmentId);
                const nextDepartmentRoles = jobRoles.filter(
                  (role) => !role.departmentId || role.departmentId === nextDepartmentId,
                );
                setSelectedJobRoleId(nextDepartmentRoles[0]?.id ?? "");
              }}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Department Role</span>
            <select
              name="jobRoleId"
              value={selectedJobRoleId}
              onChange={(event) => setSelectedJobRoleId(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
            >
              {departmentRoleOptions.length === 0 ? <option value="">No roles for this department yet</option> : null}
              {departmentRoleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isEditMode ? "New password (optional)" : "Password"}
            </span>
            <input
              type="password"
              name="password"
              required={!isEditMode}
              minLength={6}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
              placeholder={isEditMode ? "Leave blank to keep current password" : "Minimum 6 characters"}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isEditMode ? "Confirm new password" : "Confirm password"}
            </span>
            <input
              type="password"
              name="confirmPassword"
              required={!isEditMode}
              minLength={6}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
              placeholder={isEditMode ? "Repeat the new password" : "Re-enter password"}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/80">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Employment</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</span>
            <select
              name="status"
              defaultValue={staffToEdit?.status ?? "Active"}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
            >
              <option>Active</option>
              <option>On Leave</option>
              <option>Inactive</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Start date</span>
            <input
              type="date"
              name="startDate"
              required
              defaultValue={staffToEdit?.startDate ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Profile image</span>
          <input
            type="file"
            name="profileImage"
            accept="image/jpeg,image/png,image/webp"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          />
        </label>
      </section>

      <button
        type="submit"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {isEditMode ? "Save staff changes" : "Create staff account"}
      </button>
    </form>
  );
}
