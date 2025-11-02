import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  isValidPermission,
  validatePermissions,
  computeEffectivePermissions,
} from '../../rbac/permissions';

describe('RBAC Permissions', () => {
  describe('PERMISSIONS constant', () => {
    it('should contain all expected permissions', () => {
      expect(PERMISSIONS).toContain('VIEW_USERS');
      expect(PERMISSIONS).toContain('CREATE_USER');
      expect(PERMISSIONS).toContain('EDIT_USER');
      expect(PERMISSIONS).toContain('DELETE_USER');
      expect(PERMISSIONS).toContain('VIEW_ROLES');
      expect(PERMISSIONS).toContain('CREATE_ROLE');
      expect(PERMISSIONS).toContain('EDIT_ROLE');
      expect(PERMISSIONS).toContain('DELETE_ROLE');
      expect(PERMISSIONS).toContain('ASSIGN_ROLE');
      expect(PERMISSIONS).toContain('VIEW_AUDIT_LOGS');
      expect(PERMISSIONS).toContain('MANAGE_TOKENS');
      expect(PERMISSIONS).toContain('ADMIN_PANEL_ACCESS');
    });

    it('should have at least 12 permissions', () => {
      expect(PERMISSIONS.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe('isValidPermission', () => {
    it('should return true for valid permissions', () => {
      expect(isValidPermission('VIEW_USERS')).toBe(true);
      expect(isValidPermission('EDIT_USER')).toBe(true);
      expect(isValidPermission('VIEW_ROLES')).toBe(true);
    });

    it('should return false for invalid permissions', () => {
      expect(isValidPermission('INVALID_PERMISSION')).toBe(false);
      expect(isValidPermission('view_users')).toBe(false); // Case sensitive
      expect(isValidPermission('')).toBe(false);
      expect(isValidPermission('RANDOM_TEXT')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isValidPermission('VIEW_USERS')).toBe(true);
      expect(isValidPermission('view_users')).toBe(false);
      expect(isValidPermission('View_Users')).toBe(false);
    });
  });

  describe('validatePermissions', () => {
    it('should validate array of valid permissions', () => {
      const result = validatePermissions(['VIEW_USERS', 'EDIT_USER']);
      expect(result).toEqual(['VIEW_USERS', 'EDIT_USER']);
    });

    it('should throw error for invalid permissions', () => {
      expect(() => validatePermissions(['INVALID_PERMISSION'])).toThrow(
        'Invalid permissions'
      );
    });

    it('should throw error for duplicate permissions', () => {
      expect(() =>
        validatePermissions(['VIEW_USERS', 'EDIT_USER', 'VIEW_USERS'])
      ).toThrow('Duplicate permissions');
    });

    it('should throw error for empty permission string', () => {
      expect(() => validatePermissions(['VIEW_USERS', ''])).toThrow(
        'Invalid permissions'
      );
    });

    it('should throw error for mixed valid and invalid permissions', () => {
      expect(() =>
        validatePermissions(['VIEW_USERS', 'INVALID', 'EDIT_USER'])
      ).toThrow('Invalid permissions: INVALID');
    });

    it('should handle empty array', () => {
      const result = validatePermissions([]);
      expect(result).toEqual([]);
    });

    it('should handle single permission', () => {
      const result = validatePermissions(['VIEW_USERS']);
      expect(result).toEqual(['VIEW_USERS']);
    });

    it('should validate all valid permissions', () => {
      const allPerms = [...PERMISSIONS];
      const result = validatePermissions(allPerms);
      expect(result).toEqual(allPerms);
    });
  });

  describe('computeEffectivePermissions', () => {
    it('should compute permissions from single role', () => {
      const roles = [
        {
          permissions: ['VIEW_USERS', 'EDIT_USER'],
        },
      ];

      const result = computeEffectivePermissions(roles);
      expect(result.size).toBe(2);
      expect(result.has('VIEW_USERS')).toBe(true);
      expect(result.has('EDIT_USER')).toBe(true);
    });

    it('should compute union of permissions from multiple roles', () => {
      const roles = [
        { permissions: ['VIEW_USERS', 'EDIT_USER'] },
        { permissions: ['VIEW_ROLES', 'CREATE_ROLE'] },
      ];

      const result = computeEffectivePermissions(roles);
      expect(result.size).toBe(4);
      expect(result.has('VIEW_USERS')).toBe(true);
      expect(result.has('EDIT_USER')).toBe(true);
      expect(result.has('VIEW_ROLES')).toBe(true);
      expect(result.has('CREATE_ROLE')).toBe(true);
    });

    it('should handle duplicate permissions across roles', () => {
      const roles = [
        { permissions: ['VIEW_USERS', 'EDIT_USER'] },
        { permissions: ['VIEW_USERS', 'DELETE_USER'] },
      ];

      const result = computeEffectivePermissions(roles);
      expect(result.size).toBe(3);
      expect(result.has('VIEW_USERS')).toBe(true);
      expect(result.has('EDIT_USER')).toBe(true);
      expect(result.has('DELETE_USER')).toBe(true);
    });

    it('should handle empty roles array', () => {
      const result = computeEffectivePermissions([]);
      expect(result.size).toBe(0);
    });

    it('should handle roles with empty permissions', () => {
      const roles = [{ permissions: [] }];
      const result = computeEffectivePermissions(roles);
      expect(result.size).toBe(0);
    });

    it('should handle JSON string permissions', () => {
      const roles = [
        { permissions: JSON.stringify(['VIEW_USERS', 'EDIT_USER']) },
      ];

      const result = computeEffectivePermissions(roles);
      expect(result.size).toBe(2);
      expect(result.has('VIEW_USERS')).toBe(true);
      expect(result.has('EDIT_USER')).toBe(true);
    });

    it('should filter out invalid permissions', () => {
      const roles = [
        { permissions: ['VIEW_USERS', 'INVALID_PERM', 'EDIT_USER'] },
      ];

      const result = computeEffectivePermissions(roles);
      expect(result.size).toBe(2);
      expect(result.has('VIEW_USERS')).toBe(true);
      expect(result.has('EDIT_USER')).toBe(true);
      expect(result.has('INVALID_PERM')).toBe(false);
    });

    it('should handle role with all permissions', () => {
      const roles = [{ permissions: [...PERMISSIONS] }];
      const result = computeEffectivePermissions(roles);
      expect(result.size).toBe(PERMISSIONS.length);
    });
  });
});

