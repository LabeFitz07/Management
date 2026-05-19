"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { AccountProfile } from "@/lib/account-store";

type AccountFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  account: AccountProfile;
};

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const panelClassName =
  "rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur";

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Panel({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className={`${panelClassName} space-y-5`}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function getInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join("");

  return initials || "AC";
}

function getRoleLabel(roles: string[]) {
  if (roles.includes("admin")) {
    return "Admin";
  }

  if (roles.includes("hr")) {
    return "HR";
  }

  return "Staff";
}

function formatDate(value: string) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function AccountForm({ action, account }: AccountFormProps) {
  const [profileImagePreview, setProfileImagePreview] = useState(account.profileImageUrl);
  const statusLabel = account.staffStatus || (account.isActive ? "Active" : "Inactive");

  useEffect(() => {
    return () => {
      if (profileImagePreview && profileImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [profileImagePreview]);

  function handleProfileImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setProfileImagePreview(file ? URL.createObjectURL(file) : account.profileImageUrl);
  }

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <section className={`${panelClassName} space-y-5`}>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-xl font-semibold text-white shadow-inner">
              {profileImagePreview ? (
                // Blob previews and public Supabase URLs are intentionally rendered as plain images here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImagePreview}
                  alt={`${account.fullName} profile`}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(account.fullName)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-slate-950">{account.fullName}</p>
              <p className="mt-1 truncate text-sm text-slate-500">{account.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                  {getRoleLabel(account.roles)}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          <Field label="Profile Picture">
            <input
              type="file"
              name="profileImage"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleProfileImageChange}
              className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-slate-950 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Employee ID
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-slate-800">
                {account.employeeId || "Not set"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Start Date
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-slate-800">
                {formatDate(account.startDate)}
              </p>
            </div>
          </div>
        </section>

        <section className={`${panelClassName} space-y-4`}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Credentials
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
              Update login access
            </h2>
          </div>
          <div className="grid gap-4">
            <Field label="New Password">
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={6}
                className={inputClassName}
                placeholder="Leave blank to keep current password"
              />
            </Field>

            <Field label="Confirm New Password">
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                minLength={6}
                className={inputClassName}
                placeholder="Confirm only if changing password"
              />
            </Field>
          </div>
        </section>
      </aside>

      <div className="space-y-6">
        <Panel eyebrow="Profile" title="Personal details">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="First Name">
              <input
                name="firstName"
                autoComplete="given-name"
                required
                defaultValue={account.firstName}
                className={inputClassName}
              />
            </Field>

            <Field label="Middle Name">
              <input
                name="middleName"
                autoComplete="additional-name"
                defaultValue={account.middleName}
                className={inputClassName}
              />
            </Field>

            <Field label="Last Name">
              <input
                name="lastName"
                autoComplete="family-name"
                required
                defaultValue={account.lastName}
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Gender">
              <select
                name="gender"
                required
                defaultValue={account.gender}
                className={inputClassName}
              >
                <option value="" disabled>
                  Select gender
                </option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </Field>

            <Field label="Age">
              <input
                type="number"
                name="age"
                min={1}
                max={130}
                inputMode="numeric"
                required
                defaultValue={account.age}
                className={inputClassName}
              />
            </Field>

            <Field label="Phone">
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                required
                defaultValue={account.phone}
                className={inputClassName}
              />
            </Field>
          </div>
        </Panel>

        <Panel eyebrow="Work" title="Staff assignment">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Email">
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                defaultValue={account.email}
                className={inputClassName}
              />
            </Field>

            <Field label="Department">
              <input
                name="department"
                autoComplete="organization"
                required
                defaultValue={account.department}
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Job Title">
              <input
                name="jobTitle"
                autoComplete="organization-title"
                required
                defaultValue={account.jobTitle}
                className={inputClassName}
              />
            </Field>

            <Field label="Start Date">
              <input
                type="date"
                name="startDate"
                required
                defaultValue={account.startDate}
                className={inputClassName}
              />
            </Field>
          </div>
        </Panel>

        <Panel eyebrow="Address" title="Contact location">
          <div className="grid gap-4">
            <Field label="Street Address">
              <input
                name="addressLine1"
                autoComplete="address-line1"
                required
                defaultValue={account.addressLine1}
                className={inputClassName}
              />
            </Field>

            <Field label="Address Line 2">
              <input
                name="addressLine2"
                autoComplete="address-line2"
                defaultValue={account.addressLine2}
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Field label="City">
              <input
                name="city"
                autoComplete="address-level2"
                required
                defaultValue={account.city}
                className={inputClassName}
              />
            </Field>

            <Field label="State / Province">
              <input
                name="stateProvince"
                autoComplete="address-level1"
                required
                defaultValue={account.stateProvince}
                className={inputClassName}
              />
            </Field>

            <Field label="Postal Code">
              <input
                name="postalCode"
                autoComplete="postal-code"
                required
                defaultValue={account.postalCode}
                className={inputClassName}
              />
            </Field>

            <Field label="Country">
              <input
                name="country"
                autoComplete="country-name"
                required
                defaultValue={account.country}
                className={inputClassName}
              />
            </Field>
          </div>
        </Panel>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(29,78,216,0.25)] transition hover:bg-blue-800 sm:w-auto"
          >
            Save account changes
          </button>
        </div>
      </div>
    </form>
  );
}
