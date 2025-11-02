import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  registerSchema,
  loginSchema,
  roleSchema,
  updateRoleSchema,
} from '../../lib/validate';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should validate correct email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should trim and lowercase email', () => {
      const result = emailSchema.parse('  TEST@EXAMPLE.COM  ');
      expect(result).toBe('test@example.com');
    });

    it('should reject invalid email format', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    it('should reject email without @', () => {
      const result = emailSchema.safeParse('testexample.com');
      expect(result.success).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = emailSchema.safeParse('test@');
      expect(result.success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong password', () => {
      const result = passwordSchema.safeParse('Password1!');
      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('password1!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('uppercase');
      }
    });

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('PASSWORD1!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('lowercase');
      }
    });

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('Password!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('number');
      }
    });

    it('should reject password without special character', () => {
      const result = passwordSchema.safeParse('Password1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('special character');
      }
    });

    it('should reject password shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Pass1!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('8 characters');
      }
    });

    it('should accept password with various special characters', () => {
      const passwords = ['Password1!', 'Password1@', 'Password1#', 'Password1$', 'Password1%'];
      passwords.forEach((pwd) => {
        const result = passwordSchema.safeParse(pwd);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('registerSchema', () => {
    it('should validate valid registration input', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password1!',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('USER'); // Default role
      }
    });

    it('should accept ADMIN role', () => {
      const result = registerSchema.safeParse({
        email: 'admin@example.com',
        password: 'Password1!',
        role: 'ADMIN',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('ADMIN');
      }
    });

    it('should default to USER role when not specified', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password1!',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('USER');
      }
    });

    it('should reject invalid email in registration', () => {
      const result = registerSchema.safeParse({
        email: 'invalid-email',
        password: 'Password1!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject weak password in registration', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'weak',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login input', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'Password1!',
      });
      expect(result.success).toBe(true);
    });

    it('should accept any password during login validation', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'any-password',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('roleSchema', () => {
    it('should accept USER role', () => {
      const result = roleSchema.safeParse('USER');
      expect(result.success).toBe(true);
    });

    it('should accept ADMIN role', () => {
      const result = roleSchema.safeParse('ADMIN');
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const result = roleSchema.safeParse('INVALID_ROLE');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = roleSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('updateRoleSchema', () => {
    it('should validate valid role update', () => {
      const result = updateRoleSchema.safeParse({
        userId: 'cuid1234567890abcdef',
        role: 'ADMIN',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid userId format', () => {
      const result = updateRoleSchema.safeParse({
        userId: 'invalid-id',
        role: 'ADMIN',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid role value', () => {
      const result = updateRoleSchema.safeParse({
        userId: 'cuid1234567890abcdef',
        role: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });
});

