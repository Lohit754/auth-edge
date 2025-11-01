/**
 * RBAC Permissions constant
 * 
 * This is a code-only constant that defines all valid permissions in the system.
 * Role.permissions must be a subset of these values.
 * 
 * Note: Self-access (viewing/editing own profile) is implicit for all authenticated users
 * and does not require explicit permissions.
 * 
 * To add a new permission:
 * 1. Add it to this PERMISSIONS array
 * 2. Use it in your authorization logic
 * 
 * Format: ALL_CAPS_UNDERSCORE
 */

export const PERMISSIONS = [
  // User management permissions
  'VIEW_USERS',
  'CREATE_USER',
  'EDIT_USER',
  'DELETE_USER',

  // Role management permissions
  'VIEW_ROLES',
  'CREATE_ROLE',
  'EDIT_ROLE',
  'DELETE_ROLE',
  'ASSIGN_ROLE',

  // Audit and system permissions
  'VIEW_AUDIT_LOGS',
  'MANAGE_TOKENS',
  'ADMIN_PANEL_ACCESS',
] as const;

/**
 * Type-safe permission key derived from the constant
 */
export type PermissionKey = (typeof PERMISSIONS)[number];

/**
 * Validate if a permission string is a valid permission key
 */
export function isValidPermission(permission: string): permission is PermissionKey {
  return (PERMISSIONS as readonly string[]).includes(permission);
}

/**
 * Validate an array of permissions
 * @throws Error if any permission is invalid or if there are duplicates
 */
export function validatePermissions(permissions: string[]): PermissionKey[] {
  // Check for duplicates
  const unique = new Set(permissions);
  if (unique.size !== permissions.length) {
    throw new Error('Duplicate permissions are not allowed');
  }

  // Validate each permission
  const invalidPermissions = permissions.filter(p => !isValidPermission(p));
  if (invalidPermissions.length > 0) {
    throw new Error(
      `Invalid permissions: ${invalidPermissions.join(', ')}. Must be one of: ${PERMISSIONS.join(', ')}`
    );
  }

  return permissions as PermissionKey[];
}

/**
 * Compute the union of permissions from multiple roles
 * This is the effective permission set for a user with those roles
 */
export function computeEffectivePermissions(
  roles: Array<{ permissions: string[] | any }>
): Set<PermissionKey> {
  const effectivePermissions = new Set<PermissionKey>();

  for (const role of roles) {
    // Handle both JSON strings and already-parsed arrays
    const permissions = typeof role.permissions === 'string'
      ? JSON.parse(role.permissions)
      : role.permissions;

    if (Array.isArray(permissions)) {
      for (const perm of permissions) {
        if (isValidPermission(perm)) {
          effectivePermissions.add(perm);
        }
      }
    }
  }

  return effectivePermissions;
}

