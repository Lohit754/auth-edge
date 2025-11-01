import { GraphQLError } from 'graphql';
import { GraphQLContext } from './context';

/**
 * Ensure user is authenticated
 */
export function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user) {
    throw new GraphQLError('You must be logged in', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
  return ctx.user;
}

/**
 * Ensure user has required role
 */
export function requireRole(ctx: GraphQLContext, ...roles: string[]) {
  const user = requireAuth(ctx);

  if (!roles.includes(user.role)) {
    throw new GraphQLError('Insufficient permissions', {
      extensions: {
        code: 'FORBIDDEN',
        http: { status: 403 },
      },
    });
  }

  return user;
}

