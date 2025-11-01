import { GraphQLContext } from '../context';
import { requireAuth } from '../permissions';
import { listUsers } from '../../services/userService';

export const userResolvers = {
  Query: {
    /**
     * Get current user with role and permissions
     */
    me: async (_parent: any, _args: any, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      
      // Return user with role and permissions from context (already loaded during auth)
      return {
        id: user.id,
        email: user.email,
        role: ctx.role,
        permissions: ctx.permissions ? Array.from(ctx.permissions) : [],
      };
    },

    /**
     * List all users (requires VIEW_USERS permission)
     */
    users: async (_parent: any, _args: any, ctx: GraphQLContext) => {
      ctx.requirePermissions('VIEW_USERS');
        return listUsers();
    },
  },

  Mutation: {},
};

