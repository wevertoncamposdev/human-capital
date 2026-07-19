export const ADMIN_SETTINGS_PERMISSIONS = [
  "tenants.read",
  "users.read",
  "roles.manage",
  "audit.read",
] as const;

export function canAccessAdminSettings(permissions: string[]) {
  return permissions.some((permission) =>
    (ADMIN_SETTINGS_PERMISSIONS as readonly string[]).includes(permission),
  );
}

