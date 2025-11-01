import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../context';
import {
  getAllRoles,
  getRoleById,
  createRole as createRoleService,
  updateRole as updateRoleService,
  deleteRole as deleteRoleService,
  getUserRole,
  setUserRole,
} from '../../services/roleService';
import { createRoleSchema, updateRoleSchema } from '../../rbac/validation';

export const roleResolvers = {
  Query: {
    /**
     * Get all roles (requires VIEW_ROLES permission)
     */
    roles: async (_parent: any, _args: any, ctx: GraphQLContext) => {
      ctx.requirePermissions('VIEW_ROLES');
        return getAllRoles();
    },

    /**
     * Get a specific role (requires VIEW_ROLES permission)
     */
    role: async (_parent: any, args: { id: string }, ctx: GraphQLContext) => {
      ctx.requirePermissions('VIEW_ROLES');
        const role = await getRoleById(args.id);
        
        if (!role) {
          throw new GraphQLError('Role not found', {
            extensions: {
              code: 'NOT_FOUND',
              http: { status: 404 },
            },
          });
        }

        return role;
    },

    /**
     * Get role for a user (requires VIEW_USERS or self-access for own role)
     */
    userRole: async (_parent: any, args: { userId: string }, ctx: GraphQLContext) => {
        if (!ctx.user) {
          throw new GraphQLError('Unauthorized', {
            extensions: {
              code: 'UNAUTHENTICATED',
              http: { status: 401 },
            },
          });
        }

        // Allow self-access (no permission check needed)
        if (ctx.user.id === args.userId) {
          return getUserRole(args.userId);
        }

        // Otherwise require VIEW_USERS permission
      ctx.requirePermissions('VIEW_USERS');
      return getUserRole(args.userId);
    },
  },

  Mutation: {
    /**
     * Create a new role (requires CREATE_ROLE permission)
     */
    createRole: async (
      _parent: any,
      args: { name: string; permissions: string[] },
      ctx: GraphQLContext
    ) => {
      try {
        ctx.requirePermissions('CREATE_ROLE');
        const input = createRoleSchema.parse(args);
        return createRoleService(input);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: error.statusCode === 409 ? 'CONFLICT' : 'BAD_REQUEST',
            http: { status: error.statusCode || 400 },
          },
        });
      }
    },

    /**
     * Update a role (requires EDIT_ROLE permission)
     */
    updateRole: async (
      _parent: any,
      args: { id: string; name?: string; permissions?: string[] },
      ctx: GraphQLContext
    ) => {
      try {
        ctx.requirePermissions('EDIT_ROLE');
        const { id, ...input } = args;
        updateRoleSchema.parse(input);
        return updateRoleService(id, input);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: error.statusCode === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
            http: { status: error.statusCode || 400 },
          },
        });
      }
    },

    /**
     * Delete a role (requires DELETE_ROLE permission)
     */
    deleteRole: async (_parent: any, args: { id: string }, ctx: GraphQLContext) => {
      try {
        ctx.requirePermissions('DELETE_ROLE');
        await deleteRoleService(args.id);
        return true;
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: error.statusCode === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
            http: { status: error.statusCode || 400 },
          },
        });
      }
    },

    /**
     * Set role for a user (replaces existing role, requires ASSIGN_ROLE permission)
     */
    setUserRole: async (
      _parent: any,
      args: { userId: string; roleId: string | null },
      ctx: GraphQLContext
    ) => {
      try {
        ctx.requirePermissions('ASSIGN_ROLE');
        return setUserRole(args.userId, args.roleId);
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: error.statusCode === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
            http: { status: error.statusCode || 400 },
          },
        });
      }
    },
  },

  User: {
    /**
     * Resolve role field for User type
     */
    role: async (parent: any, _args: any, ctx: GraphQLContext) => {
      // If this is the current user and role is already loaded in context, use it
      if (ctx.user?.id === parent.id && ctx.role !== undefined) {
        return ctx.role;
      }
      // Otherwise, fetch from database
      return getUserRole(parent.id);
    },

    /**
     * Resolve permissions field for User type
     * Returns the effective permissions from the user's role
     */
    permissions: async (parent: any, _args: any, ctx: GraphQLContext) => {
      // If this is the current user and permissions are already loaded in context, use them
      if (ctx.user?.id === parent.id && ctx.permissions) {
        return Array.from(ctx.permissions);
      }
      // Otherwise, fetch from database and compute
      const role = await getUserRole(parent.id);
      if (!role) {
        return [];
      }
      const { computeEffectivePermissions } = await import('../../rbac/permissions');
      const effectivePermissions = computeEffectivePermissions([role]);
      return Array.from(effectivePermissions);
    },
  },
};

