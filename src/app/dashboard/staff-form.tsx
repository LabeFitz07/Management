"use client";

import { useState } from "react";
import type { StaffMember } from "@/lib/staff-store";

type StaffFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  staffToEdit: StaffMember | null;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read selected image."));
    reader.readAsDataURL(file);
  });
}

export function StaffForm({ action, staffToEdit }: StaffFormProps) {
  const [profileImageValue, setProfileImageValue] = useState(staffToEdit?.profileImageUrl ?? "");
  const [previewName, setPreviewName] = useState(staffToEdit?.fullName ?? "New team member");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setProfileImageValue(dataUrl);
  }

  return (
    <form action={action} className="space-y-5">
      {staffToEdit ? <input type="hidden" name="id" value={staffToEdit.id} /> : null}
      <input type="hidden" name="profileImageUrl" value={profileImageValue} readOnly />

      <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
          Profile Preview
        </p>
        <div className="mt-4 flex items-center gap-4">
          {profileImageValue ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileImageValue}
              alt={`${previewName} profile`}
              className="h-[4.5rem] w-[4.5rem] rounded-2xl object-cover ring-1 ring-stone-200"
            />
          ) : (
            <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#115e59,_#0f766e)] text-lg font-semibold text-white">
              {getInitials(previewName || "New Member")}
            </div>
          )}
          <div className="text-sm text-stone-600">
            <p className="font-medium text-stone-900">{previewName}</p>
            <p className="mt-1">
              Use camera on mobile or upload an image file from this device.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-white p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Identity
            </p>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">
              Employee ID {staffToEdit ? "" : "(optional)"}
            </span>
            <input
              name="employeeId"
              defaultValue={staffToEdit?.employeeId}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-teal-700"
              required={Boolean(staffToEdit)}
              placeholder={staffToEdit ? "EMP-1001" : "Auto-generated if blank"}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Full Name</span>
            <input
              name="fullName"
              defaultValue={staffToEdit?.fullName}
              required
              onChange={(event) => setPreviewName(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-teal-700"
              placeholder="Juan Dela Cruz"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Email</span>
              <input
                type="email"
                name="email"
                defaultValue={staffToEdit?.email}
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-teal-700"
                placeholder="juan@company.com"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Phone</span>
              <input
                name="phone"
                defaultValue={staffToEdit?.phone}
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-teal-700"
                placeholder="+63 912 345 6789"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-white p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Profile Image
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Use Camera</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="w-full rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-800"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Upload Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-stone-800"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Profile Picture URL</span>
            <input
              type="url"
              value={profileImageValue}
              onChange={(event) => setProfileImageValue(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-teal-700"
              placeholder="https://your-cdn.com/profiles/juan-dela-cruz.jpg or auto-filled from upload"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-white p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Work Details
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Department</span>
              <input
                name="department"
                defaultValue={staffToEdit?.department}
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-teal-700"
                placeholder="Human Resources"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Role</span>
              <input
                name="role"
                defaultValue={staffToEdit?.role}
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-teal-700"
                placeholder="HR Manager"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Status</span>
              <select
                name="status"
                defaultValue={staffToEdit?.status ?? "Active"}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-teal-700"
              >
                <option>Active</option>
                <option>On Leave</option>
                <option>Inactive</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Start Date</span>
              <input
                type="date"
                name="startDate"
                defaultValue={staffToEdit?.startDate}
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-teal-700"
              />
            </label>
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="flex-1 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800"
        >
          {staffToEdit ? "Save changes" : "Create staff member"}
        </button>
      </div>
    </form>
  );
}
