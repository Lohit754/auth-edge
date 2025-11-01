import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { loadUserWithRole } from '../services/userService';
import { PermissionKey } from '../rbac/permissions';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  userRole?: {
    id: string;
    name: string;
    permissions: string[];
  } | null;
  permissions?: Set<PermissionKey>;
}

/**
 * Middleware to authenticate requests using JWT access token
 * Loads user with role and computes effective permissions
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const payload = verifyAccessToken(token);

    // Load user with role and permissions
    const userData = await loadUserWithRole(payload.sub);

    // Attach to request
    req.user = {
      id: userData.id,
      email: userData.email,
    };
    req.userRole = userData.role;
    req.permissions = userData.effectivePermissions;

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication - sets user if token is valid, but doesn't fail if missing
 */
export async function optionalAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    // Load user with role and permissions
    const userData = await loadUserWithRole(payload.sub);

    // Attach to request
    req.user = {
      id: userData.id,
      email: userData.email,
    };
    req.userRole = userData.role;
    req.permissions = userData.effectivePermissions;

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

