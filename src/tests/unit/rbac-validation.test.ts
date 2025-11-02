import { describe, it, expect } from 'vitest';
import {
  roleNameSchema,
  permissionsSchema,
  createRoleSchema,
  updateRoleSchema,
  validateRoleName,
  isValidRoleName,
} from '../../rbac/validation';

describe('RBAC Validation', () => {
  describe('roleNameSchema', () => {
    it('should validate correct role names', () => {
      const validNames = ['ADMIN', 'USER', 'SUPER_ADMIN', 'CONTENT_EDITOR', 'A'];
      validNames.forEach((name) => {
        const result = roleNameSchema.safeParse(name);
        expect(result.success).toBe(true);
      });
    });

    it('should reject lowercase role names', () => {
      const result = roleNameSchema.safeParse('admin');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('ALL_CAPS_UNDERSCORE');
      }
    });

    it('should reject mixed case role names', () => {
      const result = roleNameSchema.safeParse('Admin');
      expect(result.success).toBe(false);
    });

    it('should reject role names with spaces', () => {
      const result = roleNameSchema.safeParse('SUPER ADMIN');
      expect(result.success).toBe(false);
    });

    it('should reject role names with hyphens', () => {
      const result = roleNameSchema.safeParse('SUPER-ADMIN');
      expect(result.success).toBe(false);
    });

    it('should accept role names with underscores', () => {
      const result = roleNameSchema.safeParse('SUPER_ADMIN');
      expect(result.success).toBe(true);
    });

    it('should accept role names with numbers', () => {
      const result = roleNameSchema.safeParse('ADMIN_2');
      expect(result.success).toBe(true);
    });

    it('should reject role names starting with underscore', () => {
      const result = roleNameSchema.safeParse('_ADMIN');
      expect(result.success).toBe(false);
    });

    it('should reject role names starting with number', () => {
      const result = roleNameSchema.safeParse('2ADMIN');
      expect(result.success).toBe(false);
    });

    it('should reject role names ending with underscore', () => {
      const result = roleNameSchema.safeParse('ADMIN_');
      expect(result.success).toBe(false);
    });

    it('should reject empty role name', () => {
      const result = roleNameSchema.safeParse('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('required');
      }
    });

    it('should reject role name longer than 50 characters', () => {
      const longName = 'A'.repeat(51);
      const result = roleNameSchema.safeParse(longName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('50 characters');
      }
    });
  });

  describe('permissionsSchema', () => {
    it('should validate array with valid permissions', () => {
      const result = permissionsSchema.safeParse(['VIEW_USERS', 'EDIT_USER']);
      expect(result.success).toBe(true);
    });

    it('should reject empty array', () => {
      const result = permissionsSchema.safeParse([]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('At least one permission');
      }
    });

    it('should reject invalid permissions', () => {
      const result = permissionsSchema.safeParse(['INVALID_PERMISSION']);
      expect(result.success).toBe(false);
    });

    it('should accept all valid permissions', () => {
      const validPerms = ['VIEW_USERS', 'CREATE_USER', 'EDIT_USER', 'DELETE_USER'];
      const result = permissionsSchema.safeParse(validPerms);
      expect(result.success).toBe(true);
    });
  });

  describe('createRoleSchema', () => {
    it('should validate correct role creation input', () => {
      const result = createRoleSchema.safeParse({
        name: 'EDITOR',
        permissions: ['VIEW_USERS', 'EDIT_USER'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid role name', () => {
      const result = createRoleSchema.safeParse({
        name: 'editor',
        permissions: ['VIEW_USERS'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty permissions', () => {
      const result = createRoleSchema.safeParse({
        name: 'EDITOR',
        permissions: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = createRoleSchema.safeParse({
        permissions: ['VIEW_USERS'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing permissions', () => {
      const result = createRoleSchema.safeParse({
        name: 'EDITOR',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateRoleSchema', () => {
    it('should validate update with name only', () => {
      const result = updateRoleSchema.safeParse({
        name: 'NEW_NAME',
      });
      expect(result.success).toBe(true);
    });

    it('should validate update with permissions only', () => {
      const result = updateRoleSchema.safeParse({
        permissions: ['VIEW_USERS', 'EDIT_USER'],
      });
      expect(result.success).toBe(true);
    });

    it('should validate update with both name and permissions', () => {
      const result = updateRoleSchema.safeParse({
        name: 'NEW_NAME',
        permissions: ['VIEW_USERS'],
      });
      expect(result.success).toBe(true);
    });

    it('should validate empty update object', () => {
      const result = updateRoleSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid name format', () => {
      const result = updateRoleSchema.safeParse({
        name: 'invalid-name',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty permissions array', () => {
      const result = updateRoleSchema.safeParse({
        permissions: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateRoleName', () => {
    it('should validate correct role name without throwing', () => {
      expect(() => validateRoleName('ADMIN')).not.toThrow();
      expect(() => validateRoleName('SUPER_USER')).not.toThrow();
    });

    it('should throw for invalid role name', () => {
      expect(() => validateRoleName('admin')).toThrow();
      expect(() => validateRoleName('Admin')).toThrow();
      expect(() => validateRoleName('ADMIN-USER')).toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => validateRoleName('')).toThrow();
    });
  });

  describe('isValidRoleName', () => {
    it('should return true for valid role names', () => {
      expect(isValidRoleName('ADMIN')).toBe(true);
      expect(isValidRoleName('SUPER_USER')).toBe(true);
      expect(isValidRoleName('A')).toBe(true);
      expect(isValidRoleName('USER_123')).toBe(true);
    });

    it('should return false for invalid role names', () => {
      expect(isValidRoleName('admin')).toBe(false);
      expect(isValidRoleName('Admin')).toBe(false);
      expect(isValidRoleName('ADMIN-USER')).toBe(false);
      expect(isValidRoleName('_ADMIN')).toBe(false);
      expect(isValidRoleName('ADMIN_')).toBe(false);
      expect(isValidRoleName('')).toBe(false);
    });
  });
});

