import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../prisma/client';
import { loadUserWithRole } from '../services/userService';
import { PermissionKey } from '../rbac/permissions';

export interface GraphQLContext {
  prisma: PrismaClient;
  req: Request;
  res: Response;
  user?: {
    id: string;
    email: string;
  };
  role?: {
    id: string;
    name: string;
    permissions: string[];
  } | null;
  permissions?: Set<PermissionKey>;
  hasPermission: (permission: PermissionKey) => boolean;
  requirePermissions: (...permissions: PermissionKey[]) => void;
}

/**
 * Create GraphQL context from Express request/response
 */
export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<GraphQLContext> {
  const context: GraphQLContext = {
    prisma,
    req,
    res,
    hasPermission: () => false,
    requirePermissions: () => {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    },
  };

  // Extract and verify access token if present
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);

      // Load user with role and permissions
      const userData = await loadUserWithRole(payload.sub);

      context.user = {
        id: userData.id,
        email: userData.email,
      };
      context.role = userData.role;
      context.permissions = userData.effectivePermissions;

      // Helper to check if user has a permission
      context.hasPermission = (permission: PermissionKey) => {
        return context.permissions?.has(permission) || false;
      };

      // Helper to require permissions (throws if missing)
      context.requirePermissions = (...requiredPermissions: PermissionKey[]) => {
        if (!context.permissions) {
          throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED' },
          });
        }

        const missingPermissions = requiredPermissions.filter(
          perm => !context.permissions!.has(perm)
        );

        if (missingPermissions.length > 0) {
          throw new GraphQLError('Forbidden: insufficient permissions', {
            extensions: {
              code: 'FORBIDDEN',
              missing: missingPermissions,
            },
          });
      }
      };
    } catch (error) {
      // Invalid token - just don't set user
      console.error('Token verification failed:', error);
    }
  }

  return context;
}

