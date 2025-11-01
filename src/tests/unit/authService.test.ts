import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../prisma/client';
import { register, login, refreshTokens } from '../../services/authService';
import { hashPassword } from '../../lib/password';

describe('AuthService', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { contains: 'test-auth-service' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-auth-service' } },
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const input = {
        email: 'test-auth-service-1@example.com',
        password: 'Password1!',
      };

      const user = await register(input);

      expect(user).toBeTruthy();
      expect(user.email).toBe(input.email);
      expect(user.role).toBe('USER');
      expect(user.id).toBeTruthy();
    });

    it('should not store plain password', async () => {
      const input = {
        email: 'test-auth-service-2@example.com',
        password: 'Password1!',
      };

      const user = await register(input);

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(dbUser?.passwordHash).not.toBe(input.password);
    });

    it('should throw error for duplicate email', async () => {
      const input = {
        email: 'test-auth-service-3@example.com',
        password: 'Password1!',
      };

      await register(input);

      await expect(register(input)).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user
      await prisma.user.create({
        data: {
          email: 'test-auth-service-login@example.com',
          passwordHash: await hashPassword('Password1!'),
          role: 'USER',
        },
      });
    });

    it('should login with valid credentials', async () => {
      const result = await login({
        email: 'test-auth-service-login@example.com',
        password: 'Password1!',
      });

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.email).toBe('test-auth-service-login@example.com');
    });

    it('should throw error for invalid email', async () => {
      await expect(
        login({
          email: 'nonexistent@example.com',
          password: 'Password1!',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      await expect(
        login({
          email: 'test-auth-service-login@example.com',
          password: 'WrongPassword1!',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should store refresh token in database', async () => {
      const result = await login({
        email: 'test-auth-service-login@example.com',
        password: 'Password1!',
      });

      const user = await prisma.user.findUnique({
        where: { email: 'test-auth-service-login@example.com' },
        include: { refreshTokens: true },
      });

      expect(user?.refreshTokens.length).toBeGreaterThan(0);
    });
  });

  describe('refreshTokens', () => {
    it('should throw error for invalid refresh token', async () => {
      await expect(refreshTokens('invalid-token')).rejects.toThrow();
    });
  });
});

