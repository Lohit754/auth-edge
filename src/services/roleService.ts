import { prisma } from '../prisma/client';
import { validatePermissions, PermissionKey } from '../rbac/permissions';
import { validateRoleName } from '../rbac/validation';

export interface CreateRoleInput {
  name: string;
  permissions: string[];
}

export interface UpdateRoleInput {
  name?: string;
  permissions?: string[];
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  permissions: PermissionKey[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all roles
 */
export async function getAllRoles(): Promise<RoleWithPermissions[]> {
  const roles = await prisma.role.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return roles.map((role) => ({
    ...role,
    permissions: JSON.parse(role.permissions) as PermissionKey[],
  }));
}

/**
 * Get a role by ID
 */
export async function getRoleById(id: string): Promise<RoleWithPermissions | null> {
  const role = await prisma.role.findUnique({
    where: { id },
  });

  if (!role) {
    return null;
  }

  return {
    ...role,
    permissions: JSON.parse(role.permissions) as PermissionKey[],
  };
}

/**
 * Get a role by name
 */
export async function getRoleByName(name: string): Promise<RoleWithPermissions | null> {
  const role = await prisma.role.findUnique({
    where: { name },
  });

  if (!role) {
    return null;
  }

  return {
    ...role,
    permissions: JSON.parse(role.permissions) as PermissionKey[],
  };
}

/**
 * Create a new role
 */
export async function createRole(input: CreateRoleInput): Promise<RoleWithPermissions> {
  const { name, permissions } = input;

  // Validate role name format
  validateRoleName(name);

  // Validate permissions
  const validatedPermissions = validatePermissions(permissions);

  // Check if role with this name already exists
  const existing = await prisma.role.findUnique({
    where: { name },
  });

  if (existing) {
    const error = new Error('Role with this name already exists');
    (error as any).statusCode = 409;
    throw error;
  }

  // Create new role
  const role = await prisma.role.create({
    data: {
      name,
      permissions: JSON.stringify(validatedPermissions),
    },
  });

  return {
    ...role,
    permissions: JSON.parse(role.permissions) as PermissionKey[],
  };
}

/**
 * Update an existing role
 */
export async function updateRole(
  id: string,
  input: UpdateRoleInput
): Promise<RoleWithPermissions> {
  // Check if role exists
  const existing = await getRoleById(id);
  if (!existing) {
    const error = new Error('Role not found');
    (error as any).statusCode = 404;
    throw error;
  }

  // Prepare update data
  const updateData: any = {};

  if (input.name !== undefined) {
    validateRoleName(input.name);

    // Check if new name conflicts with another role
    if (input.name !== existing.name) {
      const nameConflict = await getRoleByName(input.name);
      if (nameConflict) {
        const error = new Error('Role with this name already exists');
        (error as any).statusCode = 409;
        throw error;
      }
    }

    updateData.name = input.name;
  }

  if (input.permissions !== undefined) {
    const validatedPermissions = validatePermissions(input.permissions);
    updateData.permissions = JSON.stringify(validatedPermissions);
  }

  // Update role
  const role = await prisma.role.update({
    where: { id },
    data: updateData,
  });

  return {
    ...role,
    permissions: JSON.parse(role.permissions) as PermissionKey[],
  };
}

/**
 * Delete a role (hard delete)
 * Will fail if role is currently assigned to any users
 */
export async function deleteRole(id: string): Promise<void> {
  // Check if role exists
  const existing = await getRoleById(id);
  if (!existing) {
    const error = new Error('Role not found');
    (error as any).statusCode = 404;
    throw error;
  }

  // Check if role is assigned to any users
  const userCount = await prisma.user.count({
    where: {
      roleId: id,
    },
  });

  if (userCount > 0) {
    const error = new Error(
      `Cannot delete role: it is currently assigned to ${userCount} user(s). Remove all assignments first.`
    );
    (error as any).statusCode = 409;
    throw error;
  }

  // Hard delete
  await prisma.role.delete({
    where: { id },
  });
}

/**
 * Get role assigned to a user
 */
export async function getUserRole(userId: string): Promise<RoleWithPermissions | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
    },
  });

  if (!user || !user.role) {
    return null;
  }

  return {
    id: user.role.id,
    name: user.role.name,
    permissions: user.role.permissions as string[] as PermissionKey[],
    createdAt: user.role.createdAt,
    updatedAt: user.role.updatedAt,
  };
}

/**
 * Set role for a user (replaces existing role)
 */
export async function setUserRole(
  userId: string,
  roleId: string | null
): Promise<RoleWithPermissions | null> {
  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }

  // If roleId is provided, verify role exists
  if (roleId) {
    const role = await getRoleById(roleId);
    if (!role) {
      const error = new Error('Role not found');
      (error as any).statusCode = 400;
      throw error;
    }
  }

  // Update user's role
  await prisma.user.update({
    where: { id: userId },
    data: {
      roleId,
    },
  });

  return getUserRole(userId);
}

