import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../context';
import { register, login, refreshTokens, logout } from '../../services/authService';
import { registerSchema, loginSchema } from '../../lib/validate';
import { isDevelopment } from '../../config/env';

export const authResolvers = {
  Mutation: {
    /**
     * Register mutation
     */
    register: async (
      _parent: any,
      args: { email: string; password: string; role?: string },
      _ctx: GraphQLContext
    ) => {
      try {
        const input = registerSchema.parse(args);
        const user = await register(input);
        return user;
      } catch (error: any) {
        const code = error.statusCode === 409 
          ? 'CONFLICT' 
          : error.statusCode === 403 
          ? 'FORBIDDEN'
          : 'BAD_REQUEST';
        
        throw new GraphQLError(error.message, {
          extensions: {
            code,
            http: { status: error.statusCode || 400 },
          },
        });
      }
    },

    /**
     * Login mutation
     */
    login: async (
      _parent: any,
      args: { email: string; password: string },
      ctx: GraphQLContext
    ) => {
      try {
        const input = loginSchema.parse(args);
        const result = await login(input);

        // Set refresh token as httpOnly cookie
        ctx.res.cookie('refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: !isDevelopment,
          sameSite: 'strict',
          path: '/auth/refresh',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return {
          accessToken: result.accessToken,
          user: result.user,
        };
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: error.statusCode === 401 ? 'UNAUTHENTICATED' : 'BAD_REQUEST',
            http: { status: error.statusCode || 400 },
          },
        });
      }
    },

    /**
     * Refresh token mutation
     */
    refreshToken: async (_parent: any, _args: any, ctx: GraphQLContext) => {
      try {
        const oldRefreshToken = ctx.req.cookies.refresh_token;

        if (!oldRefreshToken) {
          throw new GraphQLError('No refresh token provided', {
            extensions: {
              code: 'UNAUTHENTICATED',
              http: { status: 401 },
            },
          });
        }

        const result = await refreshTokens(oldRefreshToken);

        // Set new refresh token as httpOnly cookie
        ctx.res.cookie('refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: !isDevelopment,
          sameSite: 'strict',
          path: '/auth/refresh',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Get user info from the new access token
        const { verifyAccessToken } = await import('../../lib/jwt');
        const payload = verifyAccessToken(result.accessToken);

        const user = await ctx.prisma.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          throw new GraphQLError('User not found', {
            extensions: {
              code: 'UNAUTHENTICATED',
              http: { status: 401 },
            },
          });
        }

        return {
          accessToken: result.accessToken,
          user,
        };
      } catch (error: any) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }
    },

    /**
     * Logout mutation
     */
    logout: async (_parent: any, _args: any, ctx: GraphQLContext) => {
      try {
        const refreshToken = ctx.req.cookies.refresh_token;

        if (refreshToken) {
          await logout(refreshToken);
        }

        // Clear refresh token cookie
        ctx.res.clearCookie('refresh_token', {
          httpOnly: true,
          secure: !isDevelopment,
          sameSite: 'strict',
          path: '/auth/refresh',
        });

        return true;
      } catch (error: any) {
        console.error('Logout error:', error);
        return false;
      }
    },
  },
};

