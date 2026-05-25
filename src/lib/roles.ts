export const SUPERADMIN_ROLE_CODE = "superadmin";
export const ADMIN_ROLE_CODE = "admin";
export const HR_ROLE_CODE = "hr";
export const DEPARTMENT_ADMIN_ROLE_CODE = "department-admin";
export const STAFF_ROLE_CODE = "staff";

const MANAGER_ROLE_CODES = [SUPERADMIN_ROLE_CODE, ADMIN_ROLE_CODE, HR_ROLE_CODE] as const;

export function isManagerRole(roles: string[]) {
  return roles.some((role) => MANAGER_ROLE_CODES.includes(role as (typeof MANAGER_ROLE_CODES)[number]));
}

export function isDepartmentAdminRole(roles: string[]) {
  return roles.includes(DEPARTMENT_ADMIN_ROLE_CODE);
}

export function canAccessDashboard(roles: string[]) {
  return isManagerRole(roles) || isDepartmentAdminRole(roles);
}

export function getRoleDisplayLabel(roles: string[]) {
  if (roles.includes(SUPERADMIN_ROLE_CODE)) {
    return "Super Admin";
  }

  if (roles.includes(ADMIN_ROLE_CODE)) {
    return "Admin";
  }

  if (roles.includes(HR_ROLE_CODE)) {
    return "HR";
  }

  if (roles.includes(DEPARTMENT_ADMIN_ROLE_CODE)) {
    return "Department Admin";
  }

  if (roles.includes(STAFF_ROLE_CODE)) {
    return "Staff";
  }

  return "User";
}
