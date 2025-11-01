import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { PermissionKey } from '../rbac/permissions';

/**
 * Middleware to require a specific role
 * @deprecated Use requirePermissions instead for permission-based authorization
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes((req.user as any).role)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: insufficient permissions' });
    }

    next();
  };
}

/**
 * Middleware to require specific permissions (ALL required)
 * All specified permissions must be present in req.permissions
 */
export function requirePermissions(...requiredPermissions: PermissionKey[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.permissions) {
      return res.status(401).json({ error: 'Unauthorized: no permissions loaded' });
    }

    // Check if all required permissions are present
    const missingPermissions = requiredPermissions.filter(
      perm => !req.permissions!.has(perm)
    );

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        error: 'Forbidden: insufficient permissions',
        missing: missingPermissions,
      });
    }

    next();
  };
}

/**
 * Middleware to require at least one of the specified permissions (OR semantics)
 * At least one of the specified permissions must be present in req.permissions
 */
export function requireAnyPermission(...permissionsOptions: PermissionKey[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.permissions) {
      return res.status(401).json({ error: 'Unauthorized: no permissions loaded' });
    }

    // Check if at least one permission is present
    const hasAnyPermission = permissionsOptions.some(perm =>
      req.permissions!.has(perm)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        error: 'Forbidden: insufficient permissions',
        required: `At least one of: ${permissionsOptions.join(', ')}`,
      });
    }

    next();
  };
}

