import { z } from 'zod';
import { PERMISSIONS, validatePermissions } from './permissions';

/**
 * Regex for valid role names: ALL_CAPS_UNDERSCORE format
 * - Must start with a letter
 * - Can contain uppercase letters, numbers, and underscores
 * - Must end with a letter or number
 */
const ROLE_NAME_REGEX = /^[A-Z][A-Z0-9_]*[A-Z0-9]$|^[A-Z]$/;

/**
 * Zod schema for role name validation
 */
export const roleNameSchema = z
  .string()
  .min(1, 'Role name is required')
  .max(50, 'Role name must be at most 50 characters')
  .regex(
    ROLE_NAME_REGEX,
    'Role name must be in ALL_CAPS_UNDERSCORE format (e.g., ADMIN, SUPER_USER)'
  );

/**
 * Zod schema for permissions array validation
 */
export const permissionsSchema = z
  .array(z.string())
  .min(1, 'At least one permission is required')
  .refine(
    (permissions) => {
      try {
        validatePermissions(permissions);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: `Permissions must be valid values from: ${PERMISSIONS.join(', ')}`,
    }
  );

/**
 * Zod schema for creating a new role
 */
export const createRoleSchema = z.object({
  name: roleNameSchema,
  permissions: permissionsSchema,
});

/**
 * Zod schema for updating a role
 */
export const updateRoleSchema = z.object({
  name: roleNameSchema.optional(),
  permissions: permissionsSchema.optional(),
});

/**
 * Zod schema for role ID array (used in user role assignment)
 */
export const roleIdsSchema = z.object({
  roleIds: z.array(z.string()).min(1, 'At least one role ID is required'),
});

/**
 * Validate role name format
 * @throws Error if invalid
 */
export function validateRoleName(name: string): void {
  roleNameSchema.parse(name);
}

/**
 * Check if a role name is valid (returns boolean instead of throwing)
 */
export function isValidRoleName(name: string): boolean {
  return ROLE_NAME_REGEX.test(name);
}

