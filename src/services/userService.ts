import { prisma } from '../prisma/client';
import { computeEffectivePermissions, PermissionKey } from '../rbac/permissions';

export interface UserWithRole {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  role: {
    id: string;
    name: string;
    permissions: string[];
  } | null;
}

export interface UserWithRoleAndPermissions extends UserWithRole {
  effectivePermissions: Set<PermissionKey>;
}

/**
 * Load user with their role and compute effective permissions
 */
export async function loadUserWithRole(
  userId: string
): Promise<UserWithRoleAndPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: {
          id: true,
          name: true,
          permissions: true,
        },
      },
    },
  });

  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }

  // Parse role permissions if role exists
  const role = user.role ? {
    id: user.role.id,
    name: user.role.name,
    permissions: typeof user.role.permissions === 'string'
      ? JSON.parse(user.role.permissions)
      : user.role.permissions,
  } : null;

  // Compute effective permissions from the role
  const effectivePermissions = role 
    ? computeEffectivePermissions([role])
    : new Set<PermissionKey>();

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role,
    effectivePermissions,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }

  return user;
}

/**
 * List all users (admin only) with optional search
 */
export async function listUsers(options?: { search?: string }) {
  const where: any = {};

  // Add email search filter (SQLite doesn't support mode: 'insensitive')
  if (options?.search) {
    where.email = {
      contains: options.search,
    };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return users;
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string) {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }

  // Delete user (cascade will delete refresh tokens and user roles)
  await prisma.user.delete({
    where: { id: userId },
  });
}
