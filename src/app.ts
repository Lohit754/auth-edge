import express from 'express';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { corsMiddleware } from './middleware/cors';
import { requestLogger, errorHandler } from './middleware/error';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { createContext } from './graphql/context';
import { isDevelopment } from './config/env';

// Import routes
import authRoutes from './routes/auth';
import meRoutes from './routes/me';
import adminRoutes from './routes/admin';
import usersRoutes from './routes/users';
import rolesRoutes from './routes/roles';

export async function createApp() {
  const app = express();

  // Middleware
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestLogger);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // REST routes
  app.use('/auth', authRoutes);
  app.use('/me', meRoutes);
  app.use('/admin', adminRoutes);
  app.use('/users', usersRoutes);
  app.use('/roles', rolesRoutes);

  // Create Apollo Server
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: isDevelopment
      ? [ApolloServerPluginLandingPageLocalDefault()]
      : [],
    introspection: isDevelopment,
  });

  await apolloServer.start();

  // Apply GraphQL middleware
  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(apolloServer, {
      context: createContext,
    })
  );

  // Error handler (must be last)
  app.use(errorHandler);

  return { app, apolloServer };
}

