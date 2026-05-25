"use client";

import { useEffect, useId, useState } from "react";
import type { JobRoleRecord } from "@/lib/job-role-store";

type SignUpAction = (formData: FormData) => void | Promise<void>;

type SignupModalProps = {
  action: SignUpAction;
  signupState?: string;
  departmentOptions: string[];
  jobRoles: JobRoleRecord[];
};

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950/60";

const signupMessages: Record<string, { tone: string; text: string }> = {
  invalid: {
    tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    text: "Complete the required fields, use a valid email, and enter a password with at least 6 characters.",
  },
  mismatch: {
    tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    text: "Password and confirmation must match.",
  },
  photo: {
    tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    text: "Upload a JPG, PNG, or WebP profile picture under 5 MB.",
  },
  "photo-upload": {
    tone: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    text: "The account was created and is waiting for approval, but the profile picture could not be uploaded. Try a smaller image or ask the admin to check storage setup.",
  },
  error: {
    tone: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    text: "Account creation failed. Please try again.",
  },
  exists: {
    tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    text: "This email already has an account. Sign in with that email instead.",
  },
  "rate-limit": {
    tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    text: "Signup is temporarily rate limited. Try again in a few minutes.",
  },
  created: {
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    text: "Account created. Sign in with the email and password you just used.",
  },
  pending: {
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    text: "Account created. Please wait for your department admin to approve it before you can log in.",
  },
  setup: {
    tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    text: "Account created, but profile setup is not ready. Ask the admin to finish the database setup.",
  },
  "check-email": {
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    text: "Check your email to confirm the account, then sign in.",
  },
};

function SignupMessage({
  className = "",
  signupState,
}: {
  className?: string;
  signupState?: string;
}) {
  if (!signupState || !signupMessages[signupState]) {
    return null;
  }

  const message = signupMessages[signupState];

  return (
    <p className={`rounded-xl border px-4 py-3 text-sm ${message.tone} ${className}`}>
      {message.text}
    </p>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

const fallbackDepartments = ["Operations", "Finance", "Human Resources"];
const fallbackDepartmentRoles: Record<string, string[]> = {
  Operations: ["Operations Supervisor"],
  Finance: ["Payroll Specialist"],
  "Human Resources": ["Talent Coordinator"],
};

function getSelectOptions(options: string[], fallbackOptions: string[]) {
  const values = [...options, ...fallbackOptions].map((value) => value.trim()).filter(Boolean);
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

export function SignupModal({
  action,
  signupState,
  departmentOptions,
  jobRoles,
}: SignupModalProps) {
  const [isOpen, setIsOpen] = useState(Boolean(signupState));
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const titleId = useId();
  const departmentSelectOptions = getSelectOptions(departmentOptions, fallbackDepartments);
  const selectedDepartmentFallbackRoles =
    fallbackDepartmentRoles[selectedDepartment] ?? [];
  const jobTitleSelectOptions = getSelectOptions(
    jobRoles
      .filter((role) => normalizeValue(role.departmentName) === normalizeValue(selectedDepartment))
      .map((role) => role.title),
    selectedDepartmentFallbackRoles,
  );
  const currentJobTitleValue = jobTitleSelectOptions.includes(selectedJobTitle)
    ? selectedJobTitle
    : "";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (profileImagePreview) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [profileImagePreview]);

  function handleProfileImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setProfileImagePreview(file ? URL.createObjectURL(file) : "");
  }

  function handleDepartmentChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextDepartment = event.target.value;
    setSelectedDepartment(nextDepartment);
    setSelectedJobTitle("");
  }

  return (
    <>
      <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Staff Access
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight dark:text-white">Need an account?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Create a staff profile, then wait for your department admin to approve the account before first login.
        </p>
        <SignupMessage className="mt-4" signupState={signupState} />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-6 min-h-12 w-full rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
        >
          Sign up
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-4 py-0 backdrop-blur-sm sm:items-start sm:px-6 sm:py-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            aria-label="Close signup form"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)] dark:border-slate-800 dark:bg-slate-950 sm:max-h-[calc(100vh-2.5rem)] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Sign up
                </p>
                <h2 id={titleId} className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  Staff account details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
              >
                Close
              </button>
            </div>

            <form action={action} className="space-y-6 px-6 py-6">
              <SignupMessage signupState={signupState} />

              <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  {profileImagePreview ? (
                    // Blob previews cannot use next/image because they are browser-created object URLs.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileImagePreview}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Photo"
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Profile Picture</span>
                  <input
                    type="file"
                    name="profileImage"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleProfileImageChange}
                    className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-slate-950 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:file:bg-cyan-300 dark:file:text-slate-950 dark:hover:file:bg-cyan-200"
                  />
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    JPG, PNG, or WebP up to 5 MB.
                  </p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <Field label="First Name">
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    required
                    className={inputClassName}
                    placeholder="First name"
                  />
                </Field>

                <Field label="Middle Name">
                  <input
                    name="middleName"
                    autoComplete="additional-name"
                    className={inputClassName}
                    placeholder="Middle name"
                  />
                </Field>

                <Field label="Last Name">
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    required
                    className={inputClassName}
                    placeholder="Last name"
                  />
                </Field>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <Field label="Gender">
                  <select
                    name="gender"
                    required
                    className={inputClassName}
                    defaultValue=""
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
                    className={inputClassName}
                    placeholder="Age"
                  />
                </Field>

                <Field label="Phone">
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    required
                    className={inputClassName}
                    placeholder="Phone number"
                  />
                </Field>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <Field label="Email">
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    className={inputClassName}
                    placeholder="you@example.com"
                  />
                </Field>

                <Field label="Department">
                  <select
                    name="department"
                    required
                    className={inputClassName}
                    value={selectedDepartment}
                    onChange={handleDepartmentChange}
                  >
                    <option value="" disabled>
                      Select department
                    </option>
                    {departmentSelectOptions.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </Field>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <Field label="Job Title">
                  <select
                    name="jobTitle"
                    required
                    className={inputClassName}
                    value={currentJobTitleValue}
                    onChange={(event) => setSelectedJobTitle(event.target.value)}
                    disabled={!selectedDepartment}
                  >
                    <option value="" disabled>
                      {selectedDepartment ? "Select job title" : "Select department first"}
                    </option>
                    {jobTitleSelectOptions.map((jobTitle) => (
                      <option key={jobTitle} value={jobTitle}>
                        {jobTitle}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Start Date">
                  <input
                    type="date"
                    name="startDate"
                    required
                    className={inputClassName}
                  />
                </Field>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <Field label="Password">
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className={inputClassName}
                    placeholder="At least 6 characters"
                  />
                </Field>

                <Field label="Confirm Password">
                  <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className={inputClassName}
                    placeholder="Re-enter password"
                  />
                </Field>
              </section>

              <section className="grid gap-4">
                <Field label="Street Address">
                  <input
                    name="addressLine1"
                    autoComplete="address-line1"
                    required
                    className={inputClassName}
                    placeholder="Street address"
                  />
                </Field>

                <Field label="Address Line 2">
                  <input
                    name="addressLine2"
                    autoComplete="address-line2"
                    className={inputClassName}
                    placeholder="Apartment, suite, unit"
                  />
                </Field>
              </section>

              <section className="grid gap-4 md:grid-cols-4">
                <Field label="City">
                  <input
                    name="city"
                    autoComplete="address-level2"
                    required
                    className={inputClassName}
                    placeholder="City"
                  />
                </Field>

                <Field label="State / Province">
                  <input
                    name="stateProvince"
                    autoComplete="address-level1"
                    required
                    className={inputClassName}
                    placeholder="State"
                  />
                </Field>

                <Field label="Postal Code">
                  <input
                    name="postalCode"
                    autoComplete="postal-code"
                    required
                    className={inputClassName}
                    placeholder="Postal code"
                  />
                </Field>

                <Field label="Country">
                  <input
                    name="country"
                    autoComplete="country-name"
                    required
                    className={inputClassName}
                    placeholder="Country"
                  />
                </Field>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="min-h-12 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:border-slate-950 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-12 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                >
                  Create account
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
