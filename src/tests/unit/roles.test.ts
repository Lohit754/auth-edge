import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { requirePermissions, requireAnyPermission } from '../../middleware/roles';
import { AuthRequest } from '../../middleware/auth';

describe('Permission Middleware', () => {
  describe('requirePermissions', () => {
    it('should allow user with required permissions', () => {
      const req = {
        user: { id: '1', email: 'admin@example.com' },
        permissions: new Set(['VIEW_USERS', 'EDIT_USER']),
      } as AuthRequest;

      const res = {} as Response;
      const next = vi.fn();

      const middleware = requirePermissions('VIEW_USERS');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow user with all required permissions', () => {
    const req = {
        user: { id: '1', email: 'admin@example.com' },
        permissions: new Set(['VIEW_USERS', 'EDIT_USER', 'DELETE_USER']),
    } as AuthRequest;

    const res = {} as Response;
    const next = vi.fn();

      const middleware = requirePermissions('VIEW_USERS', 'EDIT_USER');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should deny user without authentication', () => {
    const req = {} as AuthRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

      const middleware = requirePermissions('VIEW_USERS');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

    it('should deny user with insufficient permissions', () => {
    const req = {
        user: { id: '1', email: 'user@example.com' },
        permissions: new Set(['VIEW_SELF']),
    } as AuthRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

      const middleware = requirePermissions('VIEW_USERS');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden: insufficient permissions',
        missing: ['VIEW_USERS'],
    });
    expect(next).not.toHaveBeenCalled();
  });

    it('should deny user missing one of multiple required permissions', () => {
      const req = {
        user: { id: '1', email: 'user@example.com' },
        permissions: new Set(['VIEW_USERS']),
      } as AuthRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      const middleware = requirePermissions('VIEW_USERS', 'EDIT_USER');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden: insufficient permissions',
        missing: ['EDIT_USER'],
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAnyPermission', () => {
    it('should allow user with any of the required permissions', () => {
    const req = {
        user: { id: '1', email: 'user@example.com' },
        permissions: new Set(['VIEW_SELF']),
    } as AuthRequest;

    const res = {} as Response;
    const next = vi.fn();

      const middleware = requireAnyPermission('VIEW_USERS', 'VIEW_SELF');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    });

    it('should deny user without any of the required permissions', () => {
      const req = {
        user: { id: '1', email: 'user@example.com' },
        permissions: new Set(['VIEW_SELF']),
      } as AuthRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      const middleware = requireAnyPermission('VIEW_USERS', 'EDIT_USER');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden: insufficient permissions',
        required: 'At least one of: VIEW_USERS, EDIT_USER',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

