import type { UserAccessProfile } from "./authz";
import { getDepartments, getManagedDepartmentIdsForUser } from "./department-store";
import { getPendingStaffRegistrationRequestCount } from "./registration-store";
import { isDepartmentAdminRole } from "./roles";

export async function getPendingStaffApprovalCountForAccess(
  accessProfile: Pick<UserAccessProfile, "userId" | "roles"> | null,
) {
  if (!accessProfile) {
    return 0;
  }

  if (!isDepartmentAdminRole(accessProfile.roles)) {
    return getPendingStaffRegistrationRequestCount();
  }

  const managedDepartmentIds = await getManagedDepartmentIdsForUser(accessProfile.userId).catch(() => []);

  if (managedDepartmentIds.length === 0) {
    return 0;
  }

  const departments = await getDepartments(managedDepartmentIds).catch(() => []);
  const visibleDepartmentNames = departments.map((department) => department.name);

  if (visibleDepartmentNames.length === 0) {
    return 0;
  }

  return getPendingStaffRegistrationRequestCount(visibleDepartmentNames);
}
