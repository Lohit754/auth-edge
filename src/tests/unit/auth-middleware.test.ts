import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import * as jwtLib from '../../lib/jwt';
import * as userService from '../../services/userService';

// Mock the jwt and userService modules
vi.mock('../../lib/jwt');
vi.mock('../../services/userService');

describe('Auth Middleware', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token and load user data', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      const mockPayload = { sub: 'user-id', email: 'test@example.com' };
      const mockUserData = {
        id: 'user-id',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: {
          id: 'role-id',
          name: 'USER',
          permissions: ['VIEW_USERS'],
        },
        effectivePermissions: new Set(['VIEW_USERS']),
      };

      vi.mocked(jwtLib.verifyAccessToken).mockReturnValue(mockPayload as any);
      vi.mocked(userService.loadUserWithRole).mockResolvedValue(mockUserData as any);

      await authenticate(req as AuthRequest, res as Response, next);

      expect(jwtLib.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(userService.loadUserWithRole).toHaveBeenCalledWith('user-id');
      expect(req.user).toEqual({ id: 'user-id', email: 'test@example.com' });
      expect(req.userRole).toEqual(mockUserData.role);
      expect(req.permissions).toBe(mockUserData.effectivePermissions);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      req.headers = {};

      await authenticate(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', async () => {
      req.headers = { authorization: 'InvalidFormat token' };

      await authenticate(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      req.headers = { authorization: 'Bearer expired-token' };

      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      vi.mocked(jwtLib.verifyAccessToken).mockImplementation(() => {
        throw error;
      });

      await authenticate(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      req.headers = { authorization: 'Bearer invalid-token' };

      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      vi.mocked(jwtLib.verifyAccessToken).mockImplementation(() => {
        throw error;
      });

      await authenticate(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      const mockPayload = { sub: 'user-id', email: 'test@example.com' };
      vi.mocked(jwtLib.verifyAccessToken).mockReturnValue(mockPayload as any);

      const error = new Error('User not found');
      (error as any).statusCode = 404;
      vi.mocked(userService.loadUserWithRole).mockRejectedValue(error);

      await authenticate(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle generic authentication errors', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      vi.mocked(jwtLib.verifyAccessToken).mockImplementation(() => {
        throw new Error('Some error');
      });

      await authenticate(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should load user with null role', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      const mockPayload = { sub: 'user-id', email: 'test@example.com' };
      const mockUserData = {
        id: 'user-id',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: null,
        effectivePermissions: new Set(),
      };

      vi.mocked(jwtLib.verifyAccessToken).mockReturnValue(mockPayload as any);
      vi.mocked(userService.loadUserWithRole).mockResolvedValue(mockUserData as any);

      await authenticate(req as AuthRequest, res as Response, next);

      expect(req.user).toEqual({ id: 'user-id', email: 'test@example.com' });
      expect(req.userRole).toBeNull();
      expect(req.permissions).toEqual(new Set());
      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate', () => {
    it('should authenticate valid token', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      const mockPayload = { sub: 'user-id', email: 'test@example.com' };
      const mockUserData = {
        id: 'user-id',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: {
          id: 'role-id',
          name: 'USER',
          permissions: ['VIEW_USERS'],
        },
        effectivePermissions: new Set(['VIEW_USERS']),
      };

      vi.mocked(jwtLib.verifyAccessToken).mockReturnValue(mockPayload as any);
      vi.mocked(userService.loadUserWithRole).mockResolvedValue(mockUserData as any);

      await optionalAuthenticate(req as AuthRequest, res as Response, next);

      expect(req.user).toEqual({ id: 'user-id', email: 'test@example.com' });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      req.headers = {};

      await optionalAuthenticate(req as AuthRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when malformed token', async () => {
      req.headers = { authorization: 'InvalidFormat token' };

      await optionalAuthenticate(req as AuthRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', async () => {
      req.headers = { authorization: 'Bearer invalid-token' };

      vi.mocked(jwtLib.verifyAccessToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuthenticate(req as AuthRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when user not found', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      const mockPayload = { sub: 'user-id', email: 'test@example.com' };
      vi.mocked(jwtLib.verifyAccessToken).mockReturnValue(mockPayload as any);

      const error = new Error('User not found');
      vi.mocked(userService.loadUserWithRole).mockRejectedValue(error);

      await optionalAuthenticate(req as AuthRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should silently fail on expired token', async () => {
      req.headers = { authorization: 'Bearer expired-token' };

      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      vi.mocked(jwtLib.verifyAccessToken).mockImplementation(() => {
        throw error;
      });

      await optionalAuthenticate(req as AuthRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

