import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAccountProfile } from "@/lib/account-store";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getUnreadNotificationCount } from "@/lib/notification-store";
import { canAccessDashboard, getRoleDisplayLabel, isDepartmentAdminRole } from "@/lib/roles";
import { DashboardSettingsMenu } from "@/components/dashboard/DashboardSettingsMenu";
import { DashboardThemeProvider } from "@/components/dashboard/DashboardThemeProvider";
import { DEPARTMENT_ADMIN_SIDEBAR_ITEMS, SidebarNav } from "./sidebar-nav";

function getInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "TM";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/");
  }

  if (!canAccessDashboard(accessProfile.roles)) {
    redirect("/staff");
  }

  const [accountProfile, unreadNotifications] = await Promise.all([
    getCurrentAccountProfile().catch(() => null),
    getUnreadNotificationCount().catch(() => 0),
  ]);

  const displayName = accountProfile?.fullName || accessProfile.fullName;
  const profileImageUrl = accountProfile?.profileImageUrl || "";
  const roleLabel = getRoleDisplayLabel(accessProfile.roles);
  const sidebarItems = isDepartmentAdminRole(accessProfile.roles) ? DEPARTMENT_ADMIN_SIDEBAR_ITEMS : undefined;

  return (
    <DashboardThemeProvider>
      <main className="min-h-screen bg-[linear-gradient(140deg,_#edf6ff_0%,_#f8fafc_40%,_#eefbf5_100%)] px-4 py-6 text-slate-950 dark:bg-[linear-gradient(140deg,_#020617_0%,_#0f172a_38%,_#082f49_100%)] dark:text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 xl:flex-row">
          <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:w-[300px] xl:flex-shrink-0">
            <div className="flex h-full flex-col rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
              <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.22)] dark:bg-[linear-gradient(135deg,_#082f49_0%,_#0f172a_60%,_#111827_100%)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">
                  Admin Console
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">Management Hub</h1>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Move between teams, workflow, and access controls without losing context.
                </p>
              </div>

              <div className="mt-5">
                <SidebarNav items={sidebarItems} />
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center gap-3">
                  {profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileImageUrl}
                      alt={`${displayName} profile`}
                      className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white dark:bg-cyan-300 dark:text-slate-950">
                      {getInitials(displayName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-950 dark:text-white">{displayName}</p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{accessProfile.email}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800">
                    {roleLabel}
                  </span>
                  <Link
                    href="/notifications"
                    className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white dark:bg-slate-800"
                  >
                    {unreadNotifications} notifications
                  </Link>
                </div>
              </div>

              <div className="mt-auto pt-5">
                <Link
                  href="/account"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                >
                  My Account
                </Link>
              </div>
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-center gap-4">
                {profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImageUrl}
                    alt={`${displayName} profile`}
                    className="h-16 w-16 rounded-[1.4rem] object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-slate-950 text-base font-semibold text-white dark:bg-cyan-300 dark:text-slate-950">
                    {getInitials(displayName)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Signed In
                  </p>
                  <h2 className="truncate text-xl font-semibold text-slate-950 dark:text-white">{displayName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="truncate">{accessProfile.email}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block dark:bg-slate-600" />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              <DashboardSettingsMenu
                displayName={displayName}
                email={accessProfile.email}
                roleLabel={roleLabel}
                profileImageUrl={profileImageUrl}
              />
            </div>

            {children}
          </section>
        </div>
      </main>
    </DashboardThemeProvider>
  );
}
